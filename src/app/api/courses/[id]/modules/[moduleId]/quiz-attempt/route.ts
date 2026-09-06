import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { submitQuizAttempt } from "@/lib/progress-service";

const requestSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
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

  const { moduleId } = await params;
  const result = await submitQuizAttempt(moduleId, session.user.id, parsed.data.answers);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    results: result.results,
    score: result.score,
    total: result.total,
  });
}
