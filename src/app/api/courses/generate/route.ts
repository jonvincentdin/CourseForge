import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { courseFocusSchema } from "@/lib/prompt-generator";
import { generateCourseWithAI } from "@/lib/course-generation-service";

const requestSchema = z.object({
  subjectId: z.string().uuid(),
  syllabusId: z.string().uuid(),
  depth: z.enum(["concise", "standard", "detailed"]),
  includeLearningObjectives: z.boolean(),
  // Optional so existing clients that never send it keep working.
  focus: courseFocusSchema.optional(),
});

/**
 * Thin HTTP wrapper — the pipeline itself (ownership → AI config →
 * provider → validate/persist) lives in course-generation-service.ts
 * so regeneration (POST /api/courses/[id]/regenerate) shares it.
 * Request and response shapes are unchanged from Milestone 6.
 */
export async function POST(request: Request) {
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

  const result = await generateCourseWithAI({ userId: session.user.id, ...parsed.data });

  if (!result.ok) {
    return NextResponse.json(
      result.errors ? { error: result.error, errors: result.errors } : { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ course: result.course }, { status: 201 });
}
