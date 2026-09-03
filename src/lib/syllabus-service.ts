import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { syllabi, subjects, type Syllabus } from "@/db/schema";
import { validateSyllabusFile, type FileValidationError } from "@/lib/file-validation";
import { extractTextFromPdf, PdfExtractionError } from "@/lib/pdf";
import { extractSyllabusStructure } from "@/lib/syllabus-extraction";
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
      await db.insert(subjects).values(
        extraction.subjects.map((s) => ({
          syllabusId: created.id,
          name: s.name,
          code: s.code,
          academicYear: s.academicYear,
          semester: s.semester,
          sortOrder: s.sortOrder,
          autoDetected: true,
        }))
      );
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

    // Reprocessing replaces auto-detected structure. Manual edits are
    // lost — the UI must warn about this before calling reprocess.
    await db.delete(subjects).where(eq(subjects.syllabusId, syllabusId));

    if (extraction.subjects.length > 0) {
      await db.insert(subjects).values(
        extraction.subjects.map((s) => ({
          syllabusId,
          name: s.name,
          code: s.code,
          academicYear: s.academicYear,
          semester: s.semester,
          sortOrder: s.sortOrder,
          autoDetected: true,
        }))
      );
    }

    const [updated] = await db
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
