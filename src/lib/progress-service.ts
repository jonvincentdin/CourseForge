import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courseModules,
  courses,
  moduleProgress,
  quizQuestions,
  quizzes,
  type ModuleProgress,
  type QuizQuestion,
} from "@/db/schema";
import { gradeQuiz, type GradedQuestion } from "@/lib/quiz-grading";
import { resolveSharedCourseAccess } from "@/lib/sharing-service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * This user's progress rows for every module of a course, keyed by
 * module id. One join (Milestone 10; previously "list module ids, then
 * look up progress"). Rows are scoped to `userId` only — callers
 * resolve access to the course themselves. A malformed id is "no
 * progress" rather than a Postgres error, because the course page now
 * runs this in parallel with (not after) its uuid-checked ownership
 * lookup.
 */
export async function getProgressForCourse(
  courseId: string,
  userId: string
): Promise<Record<string, ModuleProgress>> {
  if (!UUID_PATTERN.test(courseId)) return {};

  const rows = await db
    .select({ progress: moduleProgress })
    .from(moduleProgress)
    .innerJoin(courseModules, eq(courseModules.id, moduleProgress.moduleId))
    .where(and(eq(courseModules.courseId, courseId), eq(moduleProgress.userId, userId)));

  return Object.fromEntries(rows.map(({ progress }) => [progress.moduleId, progress]));
}

export interface CourseProgressSummary {
  totalModules: number;
  completedModules: number;
}

/**
 * Batched version for list pages — one pass over this user's modules
 * and progress rows rather than N queries per course. Aggregated in
 * application code rather than SQL for simplicity at the current
 * scale (see .context/DECISIONS.md's "simplest architecture that can
 * scale reasonably" precedent).
 */
export async function getCourseProgressSummaries(
  userId: string
): Promise<Record<string, CourseProgressSummary>> {
  // Independent of each other — run in parallel (Milestone 10).
  const [modules, progressRows] = await Promise.all([
    db
      .select({ id: courseModules.id, courseId: courseModules.courseId })
      .from(courseModules)
      .innerJoin(courses, eq(courseModules.courseId, courses.id))
      .where(eq(courses.ownerId, userId)),
    db
      .select({
        moduleId: moduleProgress.moduleId,
        lessonCompleted: moduleProgress.lessonCompleted,
        quizScore: moduleProgress.quizScore,
      })
      .from(moduleProgress)
      .where(eq(moduleProgress.userId, userId)),
  ]);

  const doneModuleIds = new Set(
    progressRows
      .filter((row) => row.lessonCompleted && row.quizScore !== null)
      .map((row) => row.moduleId)
  );

  const summaries: Record<string, CourseProgressSummary> = {};
  for (const mod of modules) {
    if (!summaries[mod.courseId]) {
      summaries[mod.courseId] = { totalModules: 0, completedModules: 0 };
    }
    summaries[mod.courseId].totalModules += 1;
    if (doneModuleIds.has(mod.id)) {
      summaries[mod.courseId].completedModules += 1;
    }
  }

  return summaries;
}

/**
 * Verifies the module belongs to a course this user owns before
 * touching progress. One join (Milestone 10) — this used to load the
 * entire course through getOwnedCourse just to test ownership.
 */
async function assertOwnedModule(moduleId: string, userId: string) {
  const [row] = await db
    .select({ module: courseModules })
    .from(courseModules)
    .innerJoin(courses, eq(courses.id, courseModules.courseId))
    .where(and(eq(courseModules.id, moduleId), eq(courses.ownerId, userId)))
    .limit(1);
  return row?.module ?? null;
}

/**
 * A module's quiz and its questions (sortOrder) in one query; null if
 * the module has no quiz. The left join keeps a quiz with zero
 * questions (→ `questions: []`) distinct from no quiz at all.
 */
async function loadModuleQuiz(
  moduleId: string
): Promise<{ quizId: string; questions: QuizQuestion[] } | null> {
  const rows = await db
    .select({ quizId: quizzes.id, question: quizQuestions })
    .from(quizzes)
    .leftJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
    .where(eq(quizzes.moduleId, moduleId))
    .orderBy(asc(quizQuestions.sortOrder));
  if (rows.length === 0) return null;

  return {
    quizId: rows[0].quizId,
    questions: rows.flatMap((row) => (row.question ? [row.question] : [])),
  };
}

export async function markLessonComplete(
  moduleId: string,
  userId: string
): Promise<{ ok: boolean }> {
  const mod = await assertOwnedModule(moduleId, userId);
  if (!mod) return { ok: false };

  await db
    .insert(moduleProgress)
    .values({ moduleId, userId, lessonCompleted: true })
    .onConflictDoUpdate({
      target: [moduleProgress.moduleId, moduleProgress.userId],
      set: { lessonCompleted: true, updatedAt: new Date() },
    });

  return { ok: true };
}

export type SubmitQuizResult =
  | { ok: true; results: GradedQuestion[]; score: number; total: number }
  | { ok: false; error: string };

export async function submitQuizAttempt(
  moduleId: string,
  userId: string,
  answers: Record<string, unknown>
): Promise<SubmitQuizResult> {
  const mod = await assertOwnedModule(moduleId, userId);
  if (!mod) return { ok: false, error: "Module not found." };

  const quiz = await loadModuleQuiz(moduleId);
  if (!quiz) return { ok: false, error: "This module has no quiz." };
  const { questions } = quiz;

  const { results, score, total } = gradeQuiz(questions, answers);

  await db
    .insert(moduleProgress)
    .values({
      moduleId,
      userId,
      quizScore: score,
      quizTotal: total,
      quizAnswers: answers,
      quizCompletedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [moduleProgress.moduleId, moduleProgress.userId],
      set: {
        quizScore: score,
        quizTotal: total,
        quizAnswers: answers,
        quizCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  return { ok: true, results, score, total };
}

// ---------------------------------------------------------------------------
// Milestone 9 — progress for shared-course viewers
// ---------------------------------------------------------------------------

/**
 * Re-runs the share gate on every call, then confirms the module
 * belongs to the course that gate resolved. Anything short of
 * "allowed + module in this course" (bad token, revoked access,
 * someone else's module id, a non-uuid id) is the same "not found".
 * The viewer id returned is the gate's DB-verified one, never the
 * caller's raw value.
 */
async function resolveSharedModule(
  token: string,
  moduleId: string,
  viewerUserId: string | null
): Promise<{ moduleId: string; viewerUserId: string | null } | null> {
  if (!UUID_PATTERN.test(moduleId)) return null;

  const access = await resolveSharedCourseAccess(token, viewerUserId);
  if (access.status !== "allowed") return null;

  const [mod] = await db
    .select({ id: courseModules.id })
    .from(courseModules)
    .where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, access.course.id)))
    .limit(1);
  if (!mod) return null;

  return { moduleId: mod.id, viewerUserId: access.viewerUserId };
}

export type SubmitSharedQuizResult =
  | { ok: true; results: GradedQuestion[]; score: number; total: number; saved: boolean }
  | { ok: false; error: string };

/**
 * Grades server-side exactly like submitQuizAttempt. Persists only for
 * a signed-in viewer, keyed by *their* user id — so it lands in their
 * own progress row and never touches the owner's. Anonymous viewers
 * get their results back with `saved: false`.
 */
export async function submitSharedQuizAttempt(
  token: string,
  moduleId: string,
  viewerUserId: string | null,
  answers: Record<string, unknown>
): Promise<SubmitSharedQuizResult> {
  const target = await resolveSharedModule(token, moduleId, viewerUserId);
  if (!target) return { ok: false, error: "Module not found." };

  const quiz = await loadModuleQuiz(target.moduleId);
  if (!quiz) return { ok: false, error: "Module not found." };
  const { questions } = quiz;

  const { results, score, total } = gradeQuiz(questions, answers);

  if (!target.viewerUserId) {
    return { ok: true, results, score, total, saved: false };
  }

  // Shared viewers are other people writing into this database, so
  // only the answers to this quiz's actual questions are stored —
  // arbitrary extra keys in the request body are dropped.
  const storedAnswers: Record<string, unknown> = {};
  for (const question of questions) {
    if (Object.hasOwn(answers, question.id)) storedAnswers[question.id] = answers[question.id];
  }

  await db
    .insert(moduleProgress)
    .values({
      moduleId: target.moduleId,
      userId: target.viewerUserId,
      quizScore: score,
      quizTotal: total,
      quizAnswers: storedAnswers,
      quizCompletedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [moduleProgress.moduleId, moduleProgress.userId],
      set: {
        quizScore: score,
        quizTotal: total,
        quizAnswers: storedAnswers,
        quizCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  return { ok: true, results, score, total, saved: true };
}

/** Signed-in viewers only (the route answers 401 for anonymous before calling this). */
export async function markSharedLessonComplete(
  token: string,
  moduleId: string,
  viewerUserId: string
): Promise<{ ok: boolean }> {
  const target = await resolveSharedModule(token, moduleId, viewerUserId);
  if (!target?.viewerUserId) return { ok: false };

  await db
    .insert(moduleProgress)
    .values({ moduleId: target.moduleId, userId: target.viewerUserId, lessonCompleted: true })
    .onConflictDoUpdate({
      target: [moduleProgress.moduleId, moduleProgress.userId],
      set: { lessonCompleted: true, updatedAt: new Date() },
    });

  return { ok: true };
}
