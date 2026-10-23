import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, type Course, type Subject, type Syllabus } from "@/db/schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import { getDecryptedConfigForUser } from "@/lib/ai-config-service";
import { getProvider } from "@/lib/ai";
import { buildCoursePrompt, type CourseDepth, type CourseFocus } from "@/lib/prompt-generator";
import { getRegenerationSource, importCourseFromJson } from "@/lib/course-service";

export type GenerateCourseResult =
  | { ok: true; course: Course }
  | { ok: false; status: 400 | 404 | 409 | 422 | 502; error: string; errors?: string[] };

export const UNLINKED_REGENERATION_ERROR =
  "This course is no longer linked to a syllabus subject, so it can't be regenerated from the syllabus.";

/**
 * The direct-AI generation pipeline (Milestone 6), extracted from
 * POST /api/courses/generate so first-time generation and Milestone
 * 8's regeneration share one code path: resolve an owned
 * subject/syllabus → build the prompt → call the provider → validate
 * and persist through importCourseFromJson.
 *
 * Ordering matters and is unchanged from the original route:
 * ownership is resolved first, so a request for someone else's
 * syllabus gets a 404 before the user's AI config is even looked at —
 * the response can't reveal whether a given id exists, and no provider
 * call is ever made on behalf of an unauthorised request.
 *
 * When `regenerateFromCourseId` is set, `subjectId`/`syllabusId` are
 * ignored and re-derived from the owned source course — the caller
 * (the regenerate route) passes the ids it loaded itself, but this
 * function doesn't rely on that.
 */
export async function generateCourseWithAI(input: {
  userId: string;
  subjectId: string;
  syllabusId: string;
  depth: CourseDepth;
  includeLearningObjectives: boolean;
  focus?: CourseFocus;
  regenerateFromCourseId?: string;
}): Promise<GenerateCourseResult> {
  const resolved = input.regenerateFromCourseId
    ? await resolveFromCourse(input.regenerateFromCourseId, input.userId)
    : await resolveFromIds(input.subjectId, input.syllabusId, input.userId);
  if (!resolved.ok) return resolved;

  const { subject, syllabus } = resolved;

  const config = await getDecryptedConfigForUser(input.userId);
  if (!config) {
    return {
      ok: false,
      status: 400,
      error: "No AI provider configured. Add one in Settings first.",
    };
  }

  const provider = getProvider(config.provider);
  if (!provider) {
    return { ok: false, status: 400, error: "Configured provider is no longer supported." };
  }

  const prompt = buildCoursePrompt({
    subject,
    syllabus,
    depth: input.depth,
    includeLearningObjectives: input.includeLearningObjectives,
    focus: input.focus,
  });

  let rawCompletion: string;
  try {
    rawCompletion = await provider.generateCompletion({
      apiKey: config.apiKey,
      model: config.model,
      prompt,
    });
  } catch (err) {
    // Provider implementations never put the API key in their error
    // messages — safe to forward directly.
    const message = err instanceof Error ? err.message : "The AI provider returned an error.";
    return { ok: false, status: 502, error: message };
  }

  const result = await importCourseFromJson({
    ownerId: input.userId,
    rawJson: rawCompletion,
    subjectId: subject.id,
    syllabusId: syllabus.id,
    source: "generated",
    regenerateFromCourseId: input.regenerateFromCourseId,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: 422,
      error: "The AI's response didn't pass validation.",
      errors: result.errors,
    };
  }

  return { ok: true, course: result.course };
}

type Resolved =
  | { ok: true; subject: Subject; syllabus: Syllabus }
  | { ok: false; status: 404 | 409; error: string };

async function resolveFromIds(
  subjectId: string,
  syllabusId: string,
  userId: string
): Promise<Resolved> {
  // Ownership, re-derived server-side — never trust the client's ids alone.
  const syllabus = await getOwnedSyllabus(syllabusId, userId);
  if (!syllabus) return { ok: false, status: 404, error: "Syllabus not found." };

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.syllabusId, syllabusId)))
    .limit(1);
  if (!subject) return { ok: false, status: 404, error: "Subject not found." };

  return { ok: true, subject, syllabus };
}

async function resolveFromCourse(courseId: string, userId: string): Promise<Resolved> {
  const source = await getRegenerationSource(courseId, userId);
  if (!source) return { ok: false, status: 404, error: "Course not found." };
  if (!source.subject || !source.syllabus) {
    return { ok: false, status: 409, error: UNLINKED_REGENERATION_ERROR };
  }
  return { ok: true, subject: source.subject, syllabus: source.syllabus };
}
