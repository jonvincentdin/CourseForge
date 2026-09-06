import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markLessonComplete } from "@/lib/progress-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { moduleId } = await params;
  const result = await markLessonComplete(moduleId, session.user.id);

  if (!result.ok) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
