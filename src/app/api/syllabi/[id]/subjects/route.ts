import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getOwnedSyllabus } from "@/lib/syllabus-service";

const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  code: z.string().trim().max(20).optional().nullable(),
  academicYear: z.number().int().min(1).max(4),
  semester: z.enum(["1st Semester", "2nd Semester", "Summer"]),
  units: z.string().trim().max(20).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const owned = await getOwnedSyllabus(id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Syllabus not found." }, { status: 404 });
  }

  const parsed = createSubjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(subjects)
    .values({
      syllabusId: id,
      name: parsed.data.name,
      code: parsed.data.code || null,
      academicYear: parsed.data.academicYear,
      semester: parsed.data.semester,
      units: parsed.data.units || null,
      autoDetected: false,
      sortOrder: 9999,
    })
    .returning();

  return NextResponse.json({ subject: created }, { status: 201 });
}
