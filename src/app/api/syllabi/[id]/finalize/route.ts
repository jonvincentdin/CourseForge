import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { syllabi } from "@/db/schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";

export async function POST(
  _request: Request,
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

  const [updated] = await db
    .update(syllabi)
    .set({ status: "ready", updatedAt: new Date() })
    .where(eq(syllabi.id, id))
    .returning();

  return NextResponse.json({ syllabus: updated });
}
