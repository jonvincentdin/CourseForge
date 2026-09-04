import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { encryptSecret, decryptSecret } from "@/lib/encryption";
import { getProvider } from "@/lib/ai";

export interface AiConfigStatus {
  configured: boolean;
  provider?: string;
  providerName?: string;
  model?: string;
}

/**
 * Safe to return to the client: provider id/name and model, never the
 * key itself, not even masked-with-partial-reveal. Matches product
 * brief §38's frontend display requirement exactly.
 */
export async function getAiConfigStatus(userId: string): Promise<AiConfigStatus> {
  const [row] = await db
    .select({ provider: aiProviderConfigs.provider, model: aiProviderConfigs.model })
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.userId, userId))
    .limit(1);

  if (!row) return { configured: false };

  return {
    configured: true,
    provider: row.provider,
    providerName: getProvider(row.provider)?.displayName ?? row.provider,
    model: row.model,
  };
}

export async function saveAiConfig(
  userId: string,
  provider: string,
  apiKey: string,
  model: string
): Promise<void> {
  const encryptedApiKey = encryptSecret(apiKey);

  await db
    .insert(aiProviderConfigs)
    .values({ userId, provider, encryptedApiKey, model })
    .onConflictDoUpdate({
      target: aiProviderConfigs.userId,
      set: { provider, encryptedApiKey, model, updatedAt: new Date() },
    });
}

export async function deleteAiConfig(userId: string): Promise<void> {
  await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId));
}

/**
 * INTERNAL ONLY — returns a decrypted key. Never call this from
 * anything that could send the result back to the client; it exists
 * solely for the generation route to hand the key to the provider's
 * own outbound API call.
 */
export async function getDecryptedConfigForUser(
  userId: string
): Promise<{ provider: string; apiKey: string; model: string } | null> {
  const [row] = await db
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.userId, userId))
    .limit(1);

  if (!row) return null;

  return {
    provider: row.provider,
    apiKey: decryptSecret(row.encryptedApiKey),
    model: row.model,
  };
}
