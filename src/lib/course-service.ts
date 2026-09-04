import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  courses,
  courseModules,
  quizzes,
  quizQuestions,
  type Course,
  type CourseModule,
  type Quiz,
  type QuizQuestion,
} from "@/db/schema";
import {
  validateCourseImport,
  CURRENT_SCHEMA_VERSION,
  type CourseImport,
  type QuestionImport,
} from "@/lib/course-schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";

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

  // Ownership check: if a subject/syllabus id was supplied, it must
  // actually belong to this user. Never trust a client-supplied id on
  // its own — same pattern as Milestone 2/3.
  if (input.syllabusId) {
    const owned = await getOwnedSyllabus(input.syllabusId, input.ownerId);
    if (!owned) {
      return { ok: false, errors: ["That syllabus doesn't belong to you."] };
    }
  }

  const course = await persistImportedCourse(input.ownerId, validation.data, {
    subjectId: input.subjectId,
    syllabusId: input.syllabusId,
    source: input.source ?? "imported",
  });

  return { ok: true, course };
}

async function persistImportedCourse(
  ownerId: string,
  data: CourseImport,
  provenance: { subjectId?: string; syllabusId?: string; source: "imported" | "generated" }
): Promise<Course> {
  return db.transaction(async (tx) => {
    const [course] = await tx
      .insert(courses)
      .values({
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

    for (const [index, mod] of data.course.modules.entries()) {
      const [insertedModule] = await tx
        .insert(courseModules)
        .values({
          courseId: course.id,
          title: mod.title,
          description: mod.description ?? null,
          learningObjectives: mod.learning_objectives ?? [],
          contentMarkdown: mod.content_markdown,
          sortOrder: index,
        })
        .returning();

      const [insertedQuiz] = await tx
        .insert(quizzes)
        .values({ moduleId: insertedModule.id, title: mod.quiz.title })
        .returning();

      await tx.insert(quizQuestions).values(
        mod.quiz.questions.map((q: QuestionImport, qIndex: number) => ({
          quizId: insertedQuiz.id,
          type: q.type,
          prompt: q.prompt,
          options: "options" in q ? q.options : null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation ?? null,
          sortOrder: qIndex,
        }))
      );
    }

    return course;
  });
}

export interface FullCourse {
  course: Course;
  modules: (CourseModule & { quiz: Quiz & { questions: QuizQuestion[] } })[];
}

export async function getOwnedCourse(
  id: string,
  userId: string
): Promise<FullCourse | null> {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), eq(courses.ownerId, userId)))
    .limit(1);

  if (!course) return null;

  const modules = await db
    .select()
    .from(courseModules)
    .where(eq(courseModules.courseId, id))
    .orderBy(asc(courseModules.sortOrder));

  const fullModules: FullCourse["modules"] = [];
  for (const mod of modules) {
    const [quiz] = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.moduleId, mod.id))
      .limit(1);

    const questions = quiz
      ? await db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.quizId, quiz.id))
          .orderBy(asc(quizQuestions.sortOrder))
      : [];

    fullModules.push({ ...mod, quiz: { ...quiz, questions } });
  }

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
