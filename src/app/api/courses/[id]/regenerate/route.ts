import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getRegenerationSource } from "@/lib/course-service";
import { courseFocusSchema } from "@/lib/prompt-generator";
import {
  generateCourseWithAI,
  UNLINKED_REGENERATION_ERROR,
} from "@/lib/course-generation-service";

// No subjectId/syllabusId in the body on purpose: the source is always
// derived from the owned course in the URL, never from the client.
const requestSchema = z.object({
  depth: z.enum(["concise", "standard", "detailed"]),
  includeLearningObjectives: z.boolean(),
  focus: courseFocusSchema.optional(),
});

/**
 * Creates the next version of an owned course via direct AI
 * generation. The existing course is never modified — the new one is
 * inserted into the same version group with version = max + 1.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { id } = await params;

  // Resolved here (as well as inside generateCourseWithAI, which
  // re-derives it independently) so the 404/409 answers come back
  // before any AI config lookup or provider call.
  const source = await getRegenerationSource(id, session.user.id);
  if (!source) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }
  if (!source.subject || !source.syllabus) {
    return NextResponse.json({ error: UNLINKED_REGENERATION_ERROR }, { status: 409 });
  }

  const result = await generateCourseWithAI({
    userId: session.user.id,
    subjectId: source.subject.id,
    syllabusId: source.syllabus.id,
    depth: parsed.data.depth,
    includeLearningObjectives: parsed.data.includeLearningObjectives,
    focus: parsed.data.focus,
    regenerateFromCourseId: source.course.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      result.errors ? { error: result.error, errors: result.errors } : { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ course: result.course }, { status: 201 });
}
