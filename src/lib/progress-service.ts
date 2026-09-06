import { and, eq, inArray } from "drizzle-orm";
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
