import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getProvider } from "@/lib/ai";
import { getDecryptedConfigForUser } from "@/lib/ai-config-service";

const testSchema = z.object({
  provider: z.string().min(1),
  model: z.string().trim().min(1),
  // Optional: if omitted, test the already-saved key for this provider.
  apiKey: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = testSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const provider = getProvider(parsed.data.provider);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  let apiKey = parsed.data.apiKey;
  if (!apiKey) {
    const saved = await getDecryptedConfigForUser(session.user.id);
    if (!saved || saved.provider !== parsed.data.provider) {
      return NextResponse.json(
        { error: "No saved key for this provider to test. Enter one first." },
        { status: 400 }
      );
    }
    apiKey = saved.apiKey;
  }

  const result = await provider.testConnection(apiKey, parsed.data.model);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
