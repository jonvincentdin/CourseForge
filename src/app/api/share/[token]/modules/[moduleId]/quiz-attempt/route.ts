import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { submitSharedQuizAttempt } from "@/lib/progress-service";
import { logShareError } from "@/lib/sharing-utils";

const requestSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

/**
 * Quiz attempt on a shared course. Session optional: anonymous viewers
 * of a link-shared course get graded results with `saved: false`;
 * signed-in viewers' results are stored against their own user id.
 * Any access failure (bad/rotated token, revoked access, module not in
 * this course) is the same 404.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string; moduleId: string }> }
) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const session = await auth();
  const { token, moduleId } = await params;

  try {
    const result = await submitSharedQuizAttempt(
      token,
      moduleId,
      session?.user?.id ?? null,
      parsed.data.answers
    );
    if (!result.ok) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    return NextResponse.json({
      results: result.results,
      score: result.score,
      total: result.total,
      saved: result.saved,
    });
  } catch (err) {
    logShareError("quiz-attempt", err);
    return NextResponse.json({ error: "Couldn't grade this quiz right now." }, { status: 500 });
  }
}
