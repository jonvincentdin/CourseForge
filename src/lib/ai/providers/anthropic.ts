import type { AIProvider, GenerateCompletionParams, TestConnectionResult } from "@/lib/ai/types";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

async function callAnthropic(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return { ok: false, error: "Couldn't reach Anthropic's API. Check your network connection." };
  }

  if (response.status === 401) {
    return { ok: false, error: "Anthropic rejected the API key — it looks invalid or revoked." };
  }
  if (response.status === 404) {
    return { ok: false, error: `Model "${model}" wasn't found. Check the model id.` };
  }
  if (response.status === 429) {
    return { ok: false, error: "Anthropic rate-limited this request. Try again in a moment." };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? `Anthropic returned an error (${response.status}).`;
    return { ok: false, error: message };
  }

  const text = body?.content?.find((block: { type: string }) => block.type === "text")?.text;
  if (typeof text !== "string") {
    return { ok: false, error: "Anthropic's response didn't contain any text content." };
  }

  return { ok: true, text };
}

export const anthropicProvider: AIProvider = {
  id: "anthropic",
  displayName: "Anthropic (Claude)",
  apiKeyPlaceholder: "sk-ant-api03-…",
  modelPlaceholder: "e.g. claude-sonnet-4-5",

  async testConnection(apiKey, model): Promise<TestConnectionResult> {
    const result = await callAnthropic(apiKey, model, "Reply with only the word OK.", 8);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },

  async generateCompletion({ apiKey, model, prompt }: GenerateCompletionParams): Promise<string> {
    const result = await callAnthropic(apiKey, model, prompt, 8000);
    if (!result.ok) throw new Error(result.error);
    return result.text;
  },
};
