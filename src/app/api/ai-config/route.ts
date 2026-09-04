import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAiConfigStatus, saveAiConfig, deleteAiConfig } from "@/lib/ai-config-service";
import { getProvider } from "@/lib/ai";

const saveSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().trim().min(1, "Enter an API key."),
  model: z.string().trim().min(1, "Enter a model id."),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const status = await getAiConfigStatus(session.user.id);
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  if (!getProvider(parsed.data.provider)) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  await saveAiConfig(
    session.user.id,
    parsed.data.provider,
    parsed.data.apiKey,
    parsed.data.model
  );

  // Deliberately do not echo the key back, not even the just-saved
  // one — the frontend never needs it again (product brief §38).
  const status = await getAiConfigStatus(session.user.id);
  return NextResponse.json(status, { status: 201 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await deleteAiConfig(session.user.id);
  return NextResponse.json({ ok: true });
}
