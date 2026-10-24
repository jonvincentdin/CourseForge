import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  courseModules,
  courses,
  moduleProgress,
  quizQuestions,
  quizzes,
  type ModuleProgress,
} from "@/db/schema";
import { getOwnedCourse } from "@/lib/course-service";
import { gradeQuiz, type GradedQuestion } from "@/lib/quiz-grading";
import { resolveSharedCourseAccess } from "@/lib/sharing-service";

export async function getProgressForCourse(
  courseId: string,
  userId: string
): Promise<Record<string, ModuleProgress>> {
  const modules = await db
    .select({ id: courseModules.id })
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId));

  if (modules.length === 0) return {};

  const rows = await db
    .select()
    .from(moduleProgress)
    .where(
      and(
        inArray(
          moduleProgress.moduleId,
          modules.map((m) => m.id)
        ),
        eq(moduleProgress.userId, userId)
      )
    );

  return Object.fromEntries(rows.map((row) => [row.moduleId, row]));
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
  const modules = await db
    .select({ id: courseModules.id, courseId: courseModules.courseId })
    .from(courseModules)
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(eq(courses.ownerId, userId));

  const progressRows = await db
    .select({
      moduleId: moduleProgress.moduleId,
      lessonCompleted: moduleProgress.lessonCompleted,
      quizScore: moduleProgress.quizScore,
    })
    .from(moduleProgress)
    .where(eq(moduleProgress.userId, userId));

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

/** Verifies the module belongs to a course this user owns before touching progress. */
async function assertOwnedModule(moduleId: string, userId: string) {
  const [mod] = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.id, moduleId))
    .limit(1);
  if (!mod) return null;

  const full = await getOwnedCourse(mod.courseId, userId);
  if (!full) return null;

  return mod;
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

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.moduleId, moduleId))
    .limit(1);
  if (!quiz) return { ok: false, error: "This module has no quiz." };

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id));

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(eq(quizzes.moduleId, target.moduleId))
    .limit(1);
  if (!quiz) return { ok: false, error: "Module not found." };

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.sortOrder));

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
