import { eq, and, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { syllabi, subjects, courses, type Syllabus } from "@/db/schema";
import { validateSyllabusFile, type FileValidationError } from "@/lib/file-validation";
import { extractTextFromPdf, PdfExtractionError } from "@/lib/pdf";
import {
  extractSyllabusStructure,
  normalizeSubjectCode,
  type ExtractedSubject,
} from "@/lib/syllabus-extraction";
import { saveFile, readStoredFile, deleteStoredFile, syllabusStorageKey } from "@/lib/storage";

export type ProcessUploadResult =
  | { ok: true; syllabus: Syllabus; warnings: string[] }
  | { ok: false; error: FileValidationError | { code: "extraction_failed"; message: string } };

export async function processSyllabusUpload(
  userId: string,
  file: File
): Promise<ProcessUploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const validationError = validateSyllabusFile(
    { type: file.type, size: file.size, name: file.name },
    buffer
  );
  if (validationError) {
    return { ok: false, error: validationError };
  }

  // Insert a placeholder row first so we have an id to key the stored
  // file on, and so a crash mid-processing leaves a visible "failed"
  // row rather than nothing at all.
  const [created] = await db
    .insert(syllabi)
    .values({
      userId,
      title: file.name.replace(/\.pdf$/i, ""),
      originalFilename: file.name,
      storageKey: "",
      fileSizeBytes: file.size,
      status: "processing",
    })
    .returning();

  const storageKey = syllabusStorageKey(userId, created.id);

  try {
    await saveFile(storageKey, buffer);
    const text = await extractTextFromPdf(buffer);
    const extraction = extractSyllabusStructure(text);

    const [updated] = await db
      .update(syllabi)
      .set({
        storageKey,
        title: extraction.suggestedTitle,
        extractedText: text,
        extractionWarnings: extraction.warnings,
        status: "needs_review",
        updatedAt: new Date(),
      })
      .where(eq(syllabi.id, created.id))
      .returning();

    if (extraction.subjects.length > 0) {
      await db.insert(subjects).values(toSubjectRows(created.id, extraction.subjects));
    }

    return { ok: true, syllabus: updated, warnings: extraction.warnings };
  } catch (err) {
    const message =
      err instanceof PdfExtractionError
        ? err.message
        : "Something went wrong while processing this file.";

    await db
      .update(syllabi)
      .set({ status: "failed", processingError: message, storageKey, updatedAt: new Date() })
      .where(eq(syllabi.id, created.id));

    return { ok: false, error: { code: "extraction_failed", message } };
  }
}

export async function reprocessSyllabus(
  syllabusId: string,
  userId: string
): Promise<ProcessUploadResult> {
  const owned = await getOwnedSyllabus(syllabusId, userId);
  if (!owned) {
    return {
      ok: false,
      error: { code: "extraction_failed", message: "Syllabus not found." },
    };
  }

  try {
    const buffer = await readStoredFile(owned.storageKey);
    const text = await extractTextFromPdf(buffer);
    const extraction = extractSyllabusStructure(text);

    const updated = await db.transaction(async (tx) => {
      // Remember which subject code each course of this syllabus was
      // generated from *before* the subjects are replaced — deleting
      // them sets course.subject_id to null (FK "set null"). Falls back
      // to the course's own denormalized subject_code, which also
      // repairs courses unlinked by a reprocess before this existed.
      const linkedCourses = await tx
        .select({
          id: courses.id,
          subjectCode: sql<string | null>`coalesce(${subjects.code}, ${courses.subjectCode})`,
        })
        .from(courses)
        .leftJoin(subjects, eq(courses.subjectId, subjects.id))
        .where(and(eq(courses.syllabusId, syllabusId), eq(courses.ownerId, userId)));

      // Reprocessing replaces auto-detected structure. Manual edits are
      // lost — the UI must warn about this before calling reprocess.
      await tx.delete(subjects).where(eq(subjects.syllabusId, syllabusId));

      const inserted =
        extraction.subjects.length > 0
          ? await tx
              .insert(subjects)
              .values(toSubjectRows(syllabusId, extraction.subjects))
              .returning({ id: subjects.id, code: subjects.code })
          : [];

      await relinkCoursesByCode(tx, linkedCourses, inserted);

      const [row] = await tx
        .update(syllabi)
        .set({
          extractedText: text,
          extractionWarnings: extraction.warnings,
          status: "needs_review",
          processingError: null,
          updatedAt: new Date(),
        })
        .where(eq(syllabi.id, syllabusId))
        .returning();
      return row;
    });

    return { ok: true, syllabus: updated, warnings: extraction.warnings };
  } catch (err) {
    const message =
      err instanceof PdfExtractionError
        ? err.message
        : "Something went wrong while reprocessing this file.";

    await db
      .update(syllabi)
      .set({ status: "failed", processingError: message, updatedAt: new Date() })
      .where(eq(syllabi.id, syllabusId));

    return { ok: false, error: { code: "extraction_failed", message } };
  }
}

function toSubjectRows(syllabusId: string, extracted: ExtractedSubject[]) {
  return extracted.map((s) => ({
    syllabusId,
    name: s.name,
    code: s.code,
    academicYear: s.academicYear,
    semester: s.semester,
    units: s.units,
    sortOrder: s.sortOrder,
    autoDetected: true,
  }));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Points each course back at the re-detected subject with the same
 * code (compared via normalizeSubjectCode, so "CS 201" matches
 * "CS-201"). A code that now matches zero or several subjects is left
 * unlinked rather than guessed — the course stays usable, it just
 * can't be regenerated until the subject exists again.
 */
async function relinkCoursesByCode(
  tx: Tx,
  linkedCourses: { id: string; subjectCode: string | null }[],
  newSubjects: { id: string; code: string | null }[]
) {
  const subjectsByCode = new Map<string, string[]>();
  for (const subject of newSubjects) {
    if (!subject.code) continue;
    const key = normalizeSubjectCode(subject.code);
    subjectsByCode.set(key, [...(subjectsByCode.get(key) ?? []), subject.id]);
  }

  const relinks: { courseId: string; subjectId: string }[] = [];
  for (const course of linkedCourses) {
    if (!course.subjectCode) continue;
    const matches = subjectsByCode.get(normalizeSubjectCode(course.subjectCode));
    if (matches?.length !== 1) continue;
    relinks.push({ courseId: course.id, subjectId: matches[0] });
  }
  if (relinks.length === 0) return;

  // One UPDATE for every relinked course (Milestone 10; previously one
  // per course): subject_id = CASE id WHEN … THEN … END, restricted to
  // exactly the relinked ids so no other row is touched.
  const subjectIdCase = sql.join(
    [
      sql`case ${courses.id}`,
      ...relinks.map((r) => sql`when ${r.courseId}::uuid then ${r.subjectId}::uuid`),
      sql`end`,
    ],
    sql` `
  );
  await tx
    .update(courses)
    .set({ subjectId: subjectIdCase })
    .where(
      inArray(
        courses.id,
        relinks.map((r) => r.courseId)
      )
    );
}

/** Ownership-checked lookup. Never trust a client-supplied syllabus id without this. */
export async function getOwnedSyllabus(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(syllabi)
    .where(and(eq(syllabi.id, id), eq(syllabi.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function deleteSyllabus(id: string, userId: string): Promise<boolean> {
  const owned = await getOwnedSyllabus(id, userId);
  if (!owned) return false;

  await db.delete(syllabi).where(eq(syllabi.id, id)); // subjects cascade
  await deleteStoredFile(owned.storageKey);
  return true;
}
