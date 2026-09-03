import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processSyllabusUpload } from "@/lib/syllabus-service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file was uploaded." },
      { status: 400 }
    );
  }

  const result = await processSyllabusUpload(session.user.id, file);

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 422 });
  }

  return NextResponse.json(
    { syllabus: result.syllabus, warnings: result.warnings },
    { status: 201 }
  );
}
