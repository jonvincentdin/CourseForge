import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import { getDecryptedConfigForUser } from "@/lib/ai-config-service";
import { getProvider } from "@/lib/ai";
import { buildCoursePrompt, type CourseDepth } from "@/lib/prompt-generator";
import { importCourseFromJson } from "@/lib/course-service";

const requestSchema = z.object({
  subjectId: z.string().uuid(),
  syllabusId: z.string().uuid(),
  depth: z.enum(["concise", "standard", "detailed"]),
  includeLearningObjectives: z.boolean(),
});

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

  const { subjectId, syllabusId, depth, includeLearningObjectives } = parsed.data;

  // Ownership, re-derived server-side — never trust the client's ids alone.
  const syllabus = await getOwnedSyllabus(syllabusId, session.user.id);
  if (!syllabus) {
    return NextResponse.json({ error: "Syllabus not found." }, { status: 404 });
  }

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.syllabusId, syllabusId)))
    .limit(1);
  if (!subject) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  const config = await getDecryptedConfigForUser(session.user.id);
  if (!config) {
    return NextResponse.json(
      { error: "No AI provider configured. Add one in Settings first." },
      { status: 400 }
    );
  }

  const provider = getProvider(config.provider);
  if (!provider) {
    return NextResponse.json({ error: "Configured provider is no longer supported." }, { status: 400 });
  }

  const prompt = buildCoursePrompt({
    subject,
    syllabus,
    depth: depth as CourseDepth,
    includeLearningObjectives,
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
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const result = await importCourseFromJson({
    ownerId: session.user.id,
    rawJson: rawCompletion,
    subjectId,
    syllabusId,
    source: "generated",
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "The AI's response didn't pass validation.",
        errors: result.errors,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ course: result.course }, { status: 201 });
}
