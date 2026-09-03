import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { importCourseFromJson } from "@/lib/course-service";

const requestSchema = z.object({
  json: z.string().min(1, "Paste the course JSON first."),
  subjectId: z.string().uuid().optional(),
  syllabusId: z.string().uuid().optional(),
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

  const result = await importCourseFromJson({
    ownerId: session.user.id,
    rawJson: parsed.data.json,
    subjectId: parsed.data.subjectId,
    syllabusId: parsed.data.syllabusId,
  });

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 422 });
  }

  return NextResponse.json({ course: result.course }, { status: 201 });
}
