import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markSharedLessonComplete } from "@/lib/progress-service";
import { logShareError } from "@/lib/sharing-utils";

/** Signed-in viewers only — anonymous lesson completion is local UI state, never persisted. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string; moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to save your progress." }, { status: 401 });
  }

  const { token, moduleId } = await params;

  try {
    const result = await markSharedLessonComplete(token, moduleId, session.user.id);
    if (!result.ok) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logShareError("complete-lesson", err);
    return NextResponse.json({ error: "Couldn't save your progress right now." }, { status: 500 });
  }
}
