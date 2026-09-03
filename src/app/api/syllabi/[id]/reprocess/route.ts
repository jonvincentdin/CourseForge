import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reprocessSyllabus } from "@/lib/syllabus-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const result = await reprocessSyllabus(id, session.user.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 422 });
  }

  return NextResponse.json({ syllabus: result.syllabus, warnings: result.warnings });
}
