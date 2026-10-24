import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addSharedCourseToMyCourses } from "@/lib/sharing-service";
import { logShareError } from "@/lib/sharing-utils";

/**
 * Add to My Courses. The request body is ignored entirely: the only
 * inputs are the token in the path and the session user. Which course
 * gets copied, who owns it, and whether this user may copy it are all
 * re-derived server-side by the share gate.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to add this course to My Courses." },
      { status: 401 }
    );
  }

  const { token } = await params;

  try {
    const result = await addSharedCourseToMyCourses(token, session.user.id);
    if (!result.ok) {
      return NextResponse.json(
        result.existingCourseId
          ? { error: result.error, existingCourseId: result.existingCourseId }
          : { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { course: { id: result.course.id, title: result.course.title } },
      { status: 201 }
    );
  } catch (err) {
    logShareError("copy", err);
    return NextResponse.json(
      { error: "Couldn't add this course right now. Try again." },
      { status: 500 }
    );
  }
}
