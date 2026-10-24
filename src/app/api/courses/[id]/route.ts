import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteOwnedCourse } from "@/lib/course-service";

/**
 * Deletes exactly one course version. Other versions in the same
 * group are untouched (versionGroupId is not an FK). Not-owned and
 * nonexistent ids both get the same 404 so the response never reveals
 * whether someone else's course exists.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteOwnedCourse(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
