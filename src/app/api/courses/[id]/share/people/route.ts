import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { addPerson, removePerson } from "@/lib/sharing-service";

/**
 * Private-share people list (owner only). Responses never say whether
 * an email belongs to an existing account.
 */

const postSchema = z.object({
  email: z.string().max(320),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { id } = await params;
  // addPerson does the real validation (normalise + email check + own-
  // email + people cap) so the rules live in one place.
  const result = await addPerson(id, session.user.id, parsed.data.email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.settings);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const email = new URL(request.url).searchParams.get("email");
  if (!email || email.length > 320) {
    return NextResponse.json({ error: "Specify the email to remove." }, { status: 400 });
  }

  const { id } = await params;
  const settings = await removePerson(id, session.user.id, email);
  if (!settings) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json(settings);
}
