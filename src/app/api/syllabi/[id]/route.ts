import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { syllabi } from "@/db/schema";
import { deleteSyllabus, getOwnedSyllabus } from "@/lib/syllabus-service";

const renameSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteSyllabus(id, session.user.id);

  if (!deleted) {
    return NextResponse.json({ error: "Syllabus not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
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

  const parsed = renameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(syllabi)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(eq(syllabi.id, id))
    .returning();

  return NextResponse.json({ syllabus: updated });
}
