import { randomUUID } from "crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseModules,
  coursePermissions,
  moduleProgress,
  quizzes,
  quizQuestions,
  subjects,
  syllabi,
  type Course,
  type CourseModule,
  type Quiz,
  type QuizQuestion,
  type Subject,
  type Syllabus,
} from "@/db/schema";
import {
  validateCourseImport,
  CURRENT_SCHEMA_VERSION,
  type CourseImport,
  type QuestionImport,
} from "@/lib/course-schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import type { ShareVisibility } from "@/lib/sharing-service";

// Re-exported so server components can build the copy-provenance line
// from course-service alone; client components should import it from
// @/lib/sharing-utils directly (this module pulls in the database).
export { copySourceLabel } from "@/lib/sharing-utils";

export type ImportCourseResult =
  | { ok: true; course: Course }
  | { ok: false; errors: string[] };

export interface ImportCourseInput {
  ownerId: string;
  /** Raw, not-yet-parsed JSON text — from a user's paste box (Milestone 4/5) or a raw AI completion (Milestone 6). */
  rawJson: string;
  /** Provenance only — never trust these for authorization beyond the ownership check below. */
  subjectId?: string;
  syllabusId?: string;
  /** "imported" for anything a human pasted in; "generated" for Milestone 6's direct AI path. Defaults to "imported". */
  source?: "imported" | "generated";
  /**
   * When set, the new course becomes the next version of this (owned)
   * course. subjectId/syllabusId are then re-derived from that course
   * server-side and any client-supplied ones are ignored.
   */
  regenerateFromCourseId?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Course ids arrive from URL segments. Postgres rejects a malformed
 * uuid with a hard error (→ a 500), so lookups short-circuit to "not
 * found" instead — a garbage id is indistinguishable from someone
 * else's id, which is exactly what the caller should see.
 */
function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Some AIs wrap JSON in a Markdown code fence despite being told not
 * to. Stripping a single leading/trailing fence (with or without a
 * `json` language tag) before parsing costs nothing for input that
 * doesn't have one, and saves a real, common failure mode for input
 * that does.
 */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Parses, validates, and persists a course from raw JSON text. This is
 * the shared entry point for every import path (Milestone 4's bare
 * paste-JSON UI, Milestone 5's external-AI-prompt flow, and Milestone
 * 6's direct-AI flow all funnel through this same validator, so the
 * acceptance bar never depends on where the JSON came from).
 */
export async function importCourseFromJson(
  input: ImportCourseInput
): Promise<ImportCourseResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(input.rawJson));
  } catch (err) {
    return {
      ok: false,
      errors: [
        `That's not valid JSON: ${err instanceof Error ? err.message : "parse error"}.`,
      ],
    };
  }

  const validation = validateCourseImport(parsed);
  if (!validation.ok || !validation.data) {
    return { ok: false, errors: validation.errors };
  }

  let provenance: Provenance;

  if (input.regenerateFromCourseId) {
    // New version of an existing course: everything about where it
    // came from is re-derived from the *owned* source course. Any
    // subjectId/syllabusId the client also sent is ignored outright,
    // so a forged pair can't graft another user's syllabus (or an
    // unrelated one of your own) onto this version group.
    const source = await getRegenerationSource(input.regenerateFromCourseId, input.ownerId);
    if (!source) {
      return { ok: false, errors: ["Course not found."] };
    }
    provenance = {
      subjectId: source.subject?.id,
      syllabusId: source.syllabus?.id,
      versionGroupId: source.course.versionGroupId,
      source: input.source ?? "imported",
    };
  } else {
    // Ownership check: if a subject/syllabus id was supplied, it must
    // actually belong to this user. Never trust a client-supplied id on
    // its own — same pattern as Milestone 2/3.
    //
    // The subject must belong to that (verified) syllabus — a subject
    // id is only meaningful relative to its syllabus, and checking the
    // syllabus alone would let any subject id through. Both lookups
    // run in parallel (Milestone 10); the syllabus result is still
    // checked first, so the error a caller sees is unchanged.
    const [ownedSyllabus, subjectInSyllabus] = await Promise.all([
      input.syllabusId ? getOwnedSyllabus(input.syllabusId, input.ownerId) : null,
      input.subjectId && input.syllabusId
        ? getSubjectInSyllabus(input.subjectId, input.syllabusId)
        : null,
    ]);

    if (input.syllabusId && !ownedSyllabus) {
      return { ok: false, errors: ["That syllabus doesn't belong to you."] };
    }

    if (input.subjectId) {
      if (!subjectInSyllabus) {
        return { ok: false, errors: ["That subject doesn't belong to that syllabus."] };
      }
    }

    provenance = {
      subjectId: input.subjectId,
      syllabusId: input.syllabusId,
      source: input.source ?? "imported",
    };
  }

  const course = await persistImportedCourse(input.ownerId, validation.data, provenance);

  return { ok: true, course };
}

interface Provenance {
  subjectId?: string;
  syllabusId?: string;
  source: "imported" | "generated";
  /** Set when this insert is a new version of an existing group; omitted for a brand-new course. */
  versionGroupId?: string;
}

async function getSubjectInSyllabus(
  subjectId: string,
  syllabusId: string
): Promise<Subject | null> {
  if (!isUuid(subjectId) || !isUuid(syllabusId)) return null;
  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.syllabusId, syllabusId)))
    .limit(1);
  return subject ?? null;
}

/**
 * Postgres caps a statement at 65,535 bind parameters. The importer
 * has no upper bound on modules/questions, so multi-row inserts are
 * split into batches comfortably under that (≤ 8 columns × 1,000 rows).
 */
const INSERT_BATCH_ROWS = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

async function persistImportedCourse(
  ownerId: string,
  data: CourseImport,
  provenance: Provenance
): Promise<Course> {
  return db.transaction(async (tx) => {
    // A brand-new course roots its own group: group id == its own id.
    // The id is generated here rather than by the DB default so both
    // columns can be written in the same insert.
    const id: string = randomUUID();
    let versionGroupId = id;
    let version = 1;

    if (provenance.versionGroupId) {
      // Two regenerations of the same course finishing at the same
      // moment would otherwise both read the same max(version) and one
      // would fail the (version_group_id, version) unique constraint —
      // after an expensive AI call. A transaction-scoped advisory lock
      // keyed on the group serialises just those inserts; it's released
      // automatically at commit/rollback. Under READ COMMITTED the
      // max() below runs after the lock is held, so it sees the other
      // transaction's committed row.
      versionGroupId = provenance.versionGroupId;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${versionGroupId}))`);
      const [{ maxVersion }] = await tx
        .select({
          maxVersion: sql<number>`coalesce(max(${courses.version}), 0)`.mapWith(Number),
        })
        .from(courses)
        .where(eq(courses.versionGroupId, versionGroupId));
      // coalesce → 0 covers every earlier version having been deleted:
      // the group id lives on and the new row simply becomes v1 again.
      version = maxVersion + 1;
    }

    const [course] = await tx
      .insert(courses)
      .values({
        id,
        versionGroupId,
        version,
        ownerId,
        subjectId: provenance.subjectId ?? null,
        syllabusId: provenance.syllabusId ?? null,
        title: data.course.title,
        subjectCode: data.course.subject_code ?? null,
        academicYear: data.course.year ?? null,
        semester: data.course.semester ?? null,
        description: data.course.description ?? null,
        learningObjectives: data.course.learning_objectives ?? [],
        schemaVersion: data.schema_version,
        source: provenance.source,
      })
      .returning();

    // Milestone 10: one multi-row insert per table instead of three
    // inserts per module. Ids are generated here (same approach as
    // addSharedCourseToMyCourses) so quizzes and questions can point at
    // their parents without relying on RETURNING order.
    const moduleRows = data.course.modules.map((mod, index) => ({
      mod,
      moduleId: randomUUID(),
      quizId: randomUUID(),
      index,
    }));

    for (const batch of chunk(moduleRows, INSERT_BATCH_ROWS)) {
      await tx.insert(courseModules).values(
        batch.map(({ mod, moduleId, index }) => ({
          id: moduleId,
          courseId: course.id,
          title: mod.title,
          description: mod.description ?? null,
          learningObjectives: mod.learning_objectives ?? [],
          contentMarkdown: mod.content_markdown,
          sortOrder: index,
        }))
      );
    }

    for (const batch of chunk(moduleRows, INSERT_BATCH_ROWS)) {
      await tx.insert(quizzes).values(
        batch.map(({ mod, moduleId, quizId }) => ({ id: quizId, moduleId, title: mod.quiz.title }))
      );
    }

    const questionRows = moduleRows.flatMap(({ mod, quizId }) =>
      mod.quiz.questions.map((q: QuestionImport, qIndex: number) => ({
        quizId,
        type: q.type,
        prompt: q.prompt,
        options: "options" in q ? q.options : null,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? null,
        sortOrder: qIndex,
      }))
    );
    for (const batch of chunk(questionRows, INSERT_BATCH_ROWS)) {
      await tx.insert(quizQuestions).values(batch);
    }

    return course;
  });
}

export interface FullCourse {
  course: Course;
  modules: (CourseModule & { quiz: Quiz & { questions: QuizQuestion[] } })[];
}

/**
 * Three queries regardless of module count, run in parallel (one
 * round trip of latency): the course, its modules, and every quiz with
 * its questions. Milestone 10 replaced a per-module loop (2 queries per
 * module) with this.
 *
 * The ownership condition is part of every one of the three
 * statements (the module and quiz queries join back to `course`), so
 * running them concurrently never reads another user's modules even
 * transiently — a non-owner simply gets three empty results.
 *
 * Ordering is unchanged: modules by sortOrder, each quiz's questions by
 * sortOrder (rows arrive question-sorted and are grouped in arrival
 * order, so the sort survives grouping).
 */
export async function getOwnedCourse(
  id: string,
  userId: string
): Promise<FullCourse | null> {
  if (!isUuid(id)) return null;

  const owned = () => and(eq(courses.id, id), eq(courses.ownerId, userId));

  const [courseRows, moduleRows, quizRows] = await Promise.all([
    db.select().from(courses).where(owned()).limit(1),
    db
      .select({ module: courseModules })
      .from(courseModules)
      .innerJoin(courses, eq(courses.id, courseModules.courseId))
      .where(owned())
      .orderBy(asc(courseModules.sortOrder)),
    db
      .select({ quiz: quizzes, question: quizQuestions })
      .from(quizzes)
      .innerJoin(courseModules, eq(courseModules.id, quizzes.moduleId))
      .innerJoin(courses, eq(courses.id, courseModules.courseId))
      // Left join: a quiz with zero questions still comes back (with a
      // null question) rather than disappearing.
      .leftJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
      .where(owned())
      .orderBy(asc(quizQuestions.sortOrder)),
  ]);

  const [course] = courseRows;
  if (!course) return null;

  const quizByModule = new Map<string, Quiz>();
  const questionsByQuiz = new Map<string, QuizQuestion[]>();
  for (const { quiz, question } of quizRows) {
    if (!quizByModule.has(quiz.moduleId)) {
      quizByModule.set(quiz.moduleId, quiz);
      questionsByQuiz.set(quiz.id, []);
    }
    if (question) questionsByQuiz.get(quiz.id)!.push(question);
  }

  const fullModules: FullCourse["modules"] = moduleRows.map(({ module: mod }) => {
    const quiz = quizByModule.get(mod.id);
    // Every module has a quiz in practice (import requires one). The
    // spread of a missing quiz mirrors the pre-Milestone-10 loader,
    // which produced `{ questions: [] }` in that case.
    return {
      ...mod,
      quiz: { ...(quiz as Quiz), questions: quiz ? questionsByQuiz.get(quiz.id)! : [] },
    };
  });

  return { course, modules: fullModules };
}

/** Reconstructs the versioned JSON shape from DB rows — the export side of the round-trip. */
export function courseToExportJson(full: FullCourse): CourseImport {
  return {
    schema_version: full.course.schemaVersion || CURRENT_SCHEMA_VERSION,
    course: {
      title: full.course.title,
      subject_code: full.course.subjectCode ?? undefined,
      year: full.course.academicYear ?? undefined,
      semester: full.course.semester ?? undefined,
      description: full.course.description ?? undefined,
      learning_objectives: full.course.learningObjectives ?? [],
      modules: full.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        description: mod.description ?? undefined,
        learning_objectives: mod.learningObjectives ?? [],
        content_markdown: mod.contentMarkdown,
        quiz: {
          title: mod.quiz.title,
          questions: mod.quiz.questions.map((q) => ({
            type: q.type,
            prompt: q.prompt,
            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? undefined,
          })) as CourseImport["course"]["modules"][number]["quiz"]["questions"],
        },
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Milestone 8 — Course Management (library, versions, delete, regeneration)
// ---------------------------------------------------------------------------

export interface LibraryCourse {
  id: string;
  title: string;
  subjectCode: string | null;
  academicYear: number | null;
  semester: "1st Semester" | "2nd Semester" | "Summer" | null;
  description: string | null;
  source: "imported" | "generated" | "shared_copy";
  version: number;
  versionGroupId: string;
  /** How many versions exist in this group (for this owner). */
  versionCount: number;
  /** Highest version in its group. */
  isLatestVersion: boolean;
  syllabusId: string | null;
  /** null if the source syllabus was deleted or never linked. */
  syllabusTitle: string | null;
  /** Subject + syllabus still linked, so regeneration from the syllabus is possible. */
  canRegenerate: boolean;
  /** ISO string — must be serializable to client components. */
  createdAt: string;
  totalModules: number;
  /** Same definition as progress-service: lesson done AND quiz attempted. */
  completedModules: number;
  /** Milestone 9: snapshot of the original creator's display name; non-null only for shared_copy courses. */
  originalCreatorName: string | null;
  /** Milestone 9: "link" = anyone with the link can view. */
  visibility: ShareVisibility;
  /** Milestone 9: how many emails this course is privately shared with (owner-only data). */
  sharedPeopleCount: number;
}

/**
 * Everything the /courses library needs, in exactly three queries
 * regardless of library size (run in parallel):
 *
 * 1. Courses with their provenance and version-group stats. The
 *    syllabus/subject joins carry the same ownership conditions as
 *    getRegenerationSource (syllabus owned by this user, subject inside
 *    that syllabus), so `canRegenerate` here and the regenerate page
 *    can never disagree. Version count/latest come from window
 *    functions over the owner-filtered rows, so they count only this
 *    user's rows.
 * 2. Module + progress counts per course, aggregated in SQL. This is
 *    the same "done" definition as progress-service's
 *    getCourseProgressSummaries (lesson completed AND quiz attempted,
 *    see .context/DECISIONS.md) — reimplemented as one GROUP BY rather
 *    than imported, because progress-service already imports this
 *    module and an import cycle isn't worth it for one query.
 * 3. (Milestone 9) Per-course count of people it's privately shared
 *    with, for the library's "Shared" indicator.
 */
export async function listCourseLibrary(userId: string): Promise<LibraryCourse[]> {
  const [rows, progressRows, peopleRows] = await Promise.all([
    db
      .select({
        id: courses.id,
        title: courses.title,
        subjectCode: courses.subjectCode,
        academicYear: courses.academicYear,
        semester: courses.semester,
        description: courses.description,
        source: courses.source,
        version: courses.version,
        versionGroupId: courses.versionGroupId,
        createdAt: courses.createdAt,
        originalCreatorName: courses.originalCreatorName,
        visibility: courses.visibility,
        syllabusId: syllabi.id,
        syllabusTitle: syllabi.title,
        subjectId: subjects.id,
        versionCount: sql<number>`count(*) over (partition by ${courses.versionGroupId})`.mapWith(
          Number
        ),
        maxVersion: sql<number>`max(${courses.version}) over (partition by ${courses.versionGroupId})`.mapWith(
          Number
        ),
      })
      .from(courses)
      .leftJoin(syllabi, and(eq(syllabi.id, courses.syllabusId), eq(syllabi.userId, userId)))
      .leftJoin(
        subjects,
        and(eq(subjects.id, courses.subjectId), eq(subjects.syllabusId, syllabi.id))
      )
      .where(eq(courses.ownerId, userId))
      .orderBy(desc(courses.createdAt), desc(courses.version)),
    db
      .select({
        courseId: courseModules.courseId,
        totalModules: sql<number>`count(*)`.mapWith(Number),
        completedModules: sql<number>`count(*) filter (where ${moduleProgress.lessonCompleted} and ${moduleProgress.quizScore} is not null)`.mapWith(
          Number
        ),
      })
      .from(courseModules)
      .innerJoin(courses, eq(courseModules.courseId, courses.id))
      // At most one progress row per (module, user) — unique constraint —
      // so the left join never multiplies the module count.
      .leftJoin(
        moduleProgress,
        and(eq(moduleProgress.moduleId, courseModules.id), eq(moduleProgress.userId, userId))
      )
      .where(eq(courses.ownerId, userId))
      .groupBy(courseModules.courseId),
    db
      .select({
        courseId: coursePermissions.courseId,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(coursePermissions)
      .innerJoin(courses, eq(coursePermissions.courseId, courses.id))
      .where(eq(courses.ownerId, userId))
      .groupBy(coursePermissions.courseId),
  ]);

  const progressByCourse = new Map(progressRows.map((row) => [row.courseId, row]));
  const peopleByCourse = new Map(peopleRows.map((row) => [row.courseId, row.count]));

  return rows.map((row) => {
    const progress = progressByCourse.get(row.id);
    return {
      id: row.id,
      title: row.title,
      subjectCode: row.subjectCode,
      academicYear: row.academicYear,
      semester: row.semester,
      description: row.description,
      source: row.source,
      version: row.version,
      versionGroupId: row.versionGroupId,
      versionCount: row.versionCount,
      isLatestVersion: row.version === row.maxVersion,
      syllabusId: row.syllabusId,
      syllabusTitle: row.syllabusTitle,
      canRegenerate: row.syllabusId !== null && row.subjectId !== null,
      createdAt: row.createdAt.toISOString(),
      totalModules: progress?.totalModules ?? 0,
      completedModules: progress?.completedModules ?? 0,
      originalCreatorName: row.originalCreatorName,
      visibility: row.visibility,
      sharedPeopleCount: peopleByCourse.get(row.id) ?? 0,
    };
  });
}

export interface CourseVersionSummary {
  id: string;
  version: number;
  title: string;
  source: "imported" | "generated" | "shared_copy";
  /** ISO string. */
  createdAt: string;
}

/**
 * All versions in the group of an owned course, highest version first.
 * [] if the course isn't owned. One statement (Milestone 10): the
 * owned course's group id is resolved in a subquery rather than a
 * separate round trip, so a non-owner's subquery is empty and so is
 * the result.
 */
export async function getCourseVersions(
  courseId: string,
  userId: string
): Promise<CourseVersionSummary[]> {
  if (!isUuid(courseId)) return [];

  const ownedGroup = db
    .select({ versionGroupId: courses.versionGroupId })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.ownerId, userId)));

  // Still filtered by owner: a group id is not a capability, and
  // Milestone 9's shared copies must never surface someone else's
  // versions even if a group id were ever reused across owners.
  const rows = await db
    .select({
      id: courses.id,
      version: courses.version,
      title: courses.title,
      source: courses.source,
      createdAt: courses.createdAt,
    })
    .from(courses)
    .where(and(inArray(courses.versionGroupId, ownedGroup), eq(courses.ownerId, userId)))
    .orderBy(desc(courses.version));

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

/**
 * true if deleted, false if not found / not owned. Ownership is part
 * of the DELETE's own WHERE clause (not a separate check-then-delete),
 * so there's no window between the check and the write. Cascades
 * handle modules → quizzes → questions and module progress. Other
 * versions in the same group are untouched — versionGroupId isn't an
 * FK, so nothing points at the deleted row.
 */
export async function deleteOwnedCourse(courseId: string, userId: string): Promise<boolean> {
  if (!isUuid(courseId)) return false;

  const deleted = await db
    .delete(courses)
    .where(and(eq(courses.id, courseId), eq(courses.ownerId, userId)))
    .returning({ id: courses.id });

  return deleted.length > 0;
}

export interface RegenerationSource {
  course: Course;
  subject: Subject | null;
  syllabus: Syllabus | null;
}

/**
 * null if the course isn't owned. subject/syllabus are null if
 * unlinked (source deleted — the FKs are `set null`). The syllabus
 * must belong to the user and the subject to that syllabus, else
 * they're treated as null: a course row's stored ids are provenance,
 * not authorization, so they're re-verified every time rather than
 * trusted because they were checked once at import.
 *
 * Note: reprocessing a syllabus deletes and re-creates its subjects
 * (see syllabus-service.ts), which nulls course.subject_id — such a
 * course reports subject: null here even though its syllabus survives.
 */
export async function getRegenerationSource(
  courseId: string,
  userId: string
): Promise<RegenerationSource | null> {
  if (!isUuid(courseId)) return null;

  // One statement (Milestone 10; previously three sequential lookups).
  // The join conditions are exactly getOwnedSyllabus (syllabus owned
  // by this user) and getSubjectInSyllabus (subject inside that
  // syllabus) — the same conditions listCourseLibrary uses for
  // canRegenerate. A left-joined row that doesn't match comes back as
  // null, i.e. "unlinked".
  const [row] = await db
    .select({ course: courses, syllabus: syllabi, subject: subjects })
    .from(courses)
    .leftJoin(syllabi, and(eq(syllabi.id, courses.syllabusId), eq(syllabi.userId, userId)))
    .leftJoin(
      subjects,
      and(eq(subjects.id, courses.subjectId), eq(subjects.syllabusId, syllabi.id))
    )
    .where(and(eq(courses.id, courseId), eq(courses.ownerId, userId)))
    .limit(1);
  if (!row) return null;

  return { course: row.course, subject: row.subject, syllabus: row.syllabus };
}
