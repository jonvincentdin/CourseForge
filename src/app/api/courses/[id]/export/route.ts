import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOwnedCourse, courseToExportJson } from "@/lib/course-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const full = await getOwnedCourse(id, session.user.id);
  if (!full) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const json = courseToExportJson(full);
  const filename = `${full.course.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;

  return new NextResponse(JSON.stringify(json, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
