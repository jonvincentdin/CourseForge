import type { AIProvider } from "@/lib/ai/types";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { openaiProvider } from "@/lib/ai/providers/openai";

export const AI_PROVIDERS: Record<string, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
};

export const AI_PROVIDER_LIST = Object.values(AI_PROVIDERS);

export function getProvider(id: string): AIProvider | null {
  return AI_PROVIDERS[id] ?? null;
}
