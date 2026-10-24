import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resetShareLink } from "@/lib/sharing-service";

/** Rotates the share token. The old link stops working on the next request. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const settings = await resetShareLink(id, session.user.id);
  if (!settings) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json(settings);
}
