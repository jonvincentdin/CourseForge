import type { AIProvider, GenerateCompletionParams, TestConnectionResult } from "@/lib/ai/types";

const API_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(
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
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return { ok: false, error: "Couldn't reach OpenAI's API. Check your network connection." };
  }

  if (response.status === 401) {
    return { ok: false, error: "OpenAI rejected the API key — it looks invalid or revoked." };
  }
  if (response.status === 404) {
    return { ok: false, error: `Model "${model}" wasn't found. Check the model id.` };
  }
  if (response.status === 429) {
    return { ok: false, error: "OpenAI rate-limited this request. Try again in a moment." };
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error?.message ?? `OpenAI returned an error (${response.status}).`;
    return { ok: false, error: message };
  }

  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    return { ok: false, error: "OpenAI's response didn't contain any text content." };
  }

  return { ok: true, text };
}

export const openaiProvider: AIProvider = {
  id: "openai",
  displayName: "OpenAI (GPT)",
  apiKeyPlaceholder: "sk-…",
  modelPlaceholder: "e.g. gpt-4o",

  async testConnection(apiKey, model): Promise<TestConnectionResult> {
    const result = await callOpenAI(apiKey, model, "Reply with only the word OK.", 8);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  },

  async generateCompletion({ apiKey, model, prompt }: GenerateCompletionParams): Promise<string> {
    const result = await callOpenAI(apiKey, model, prompt, 8000);
    if (!result.ok) throw new Error(result.error);
    return result.text;
  },
};
