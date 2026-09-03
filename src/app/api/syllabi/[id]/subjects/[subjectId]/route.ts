import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getOwnedSyllabus } from "@/lib/syllabus-service";

const updateSubjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  code: z.string().trim().max(20).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  academicYear: z.number().int().min(1).max(4).optional(),
  semester: z.enum(["1st Semester", "2nd Semester", "Summer"]).optional(),
  units: z.string().trim().max(20).nullable().optional(),
});

async function assertOwnedSubject(
  syllabusId: string,
  subjectId: string,
  userId: string
) {
  const owned = await getOwnedSyllabus(syllabusId, userId);
  if (!owned) return null;

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.syllabusId, syllabusId)))
    .limit(1);

  return subject ?? null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id, subjectId } = await params;
  const existing = await assertOwnedSubject(id, subjectId, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  const parsed = updateSubjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(subjects)
    .set({
      ...parsed.data,
      code: parsed.data.code === undefined ? undefined : parsed.data.code || null,
      units: parsed.data.units === undefined ? undefined : parsed.data.units || null,
      // Once a human edits a detected row, it's no longer purely "auto".
      autoDetected: false,
      updatedAt: new Date(),
    })
    .where(eq(subjects.id, subjectId))
    .returning();

  return NextResponse.json({ subject: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; subjectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id, subjectId } = await params;
  const existing = await assertOwnedSubject(id, subjectId, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  await db.delete(subjects).where(eq(subjects.id, subjectId));
  return NextResponse.json({ ok: true });
}
