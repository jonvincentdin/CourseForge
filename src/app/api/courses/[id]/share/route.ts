import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getShareSettings, updateVisibility } from "@/lib/sharing-service";

/**
 * Owner-only share settings. Ownership is re-derived from the session
 * inside every service call; a course that isn't yours gets the same
 * 404 as one that doesn't exist.
 */

const NOT_FOUND = { error: "Course not found." };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const settings = await getShareSettings(id, session.user.id);
  if (!settings) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  return NextResponse.json(settings);
}

const patchSchema = z.object({
  visibility: z.enum(["private", "link"]),
});

/** Switching to "private" keeps the token, so switching back restores the same link. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Visibility must be \"private\" or \"link\"." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const settings = await updateVisibility(id, session.user.id, parsed.data.visibility);
  if (!settings) {
    return NextResponse.json(NOT_FOUND, { status: 404 });
  }

  return NextResponse.json(settings);
}
