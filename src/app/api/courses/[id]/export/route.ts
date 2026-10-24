import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOwnedCourse, courseToExportJson } from "@/lib/course-service";
import { courseToMarkdown, courseExportFilename } from "@/lib/course-markdown-export";

/**
 * ?format=json (default — unchanged, lossless, re-importable) or
 * ?format=markdown (a readable study document; not re-importable).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "markdown") {
    return NextResponse.json(
      { error: "Unsupported format. Use json or markdown." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const full = await getOwnedCourse(id, session.user.id);
  if (!full) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  if (format === "markdown") {
    return new NextResponse(courseToMarkdown(full), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${courseExportFilename(full.course, "md")}"`,
      },
    });
  }

  const json = courseToExportJson(full);

  return new NextResponse(JSON.stringify(json, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${courseExportFilename(full.course, "json")}"`,
    },
  });
}
