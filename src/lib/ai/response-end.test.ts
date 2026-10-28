import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTENT_FILTER_ERROR,
  GENERATION_MAX_OUTPUT_TOKENS,
  REFUSAL_ERROR,
  TRUNCATED_OUTPUT_ERROR,
  classifyAnthropicStop,
  classifyOpenAIFinish,
  describeFetchFailure,
} from "@/lib/ai/response-end";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { openaiProvider } from "@/lib/ai/providers/openai";

describe("classifyAnthropicStop", () => {
  it("flags output cut off by the token cap", () => {
    expect(classifyAnthropicStop("max_tokens")).toEqual({ ok: false, error: TRUNCATED_OUTPUT_ERROR });
    expect(classifyAnthropicStop("model_context_window_exceeded")).toEqual({
      ok: false,
      error: TRUNCATED_OUTPUT_ERROR,
    });
  });

  it("flags refusals", () => {
    expect(classifyAnthropicStop("refusal")).toEqual({ ok: false, error: REFUSAL_ERROR });
  });

  it("passes normal, unknown and missing stop reasons through", () => {
    for (const reason of ["end_turn", "stop_sequence", "pause_turn", "something_new", undefined, null, 3]) {
      expect(classifyAnthropicStop(reason)).toEqual({ ok: true });
    }
  });
});

describe("classifyOpenAIFinish", () => {
  it("flags output cut off by the token cap", () => {
    expect(classifyOpenAIFinish("length")).toEqual({ ok: false, error: TRUNCATED_OUTPUT_ERROR });
  });

  it("flags the content filter", () => {
    expect(classifyOpenAIFinish("content_filter")).toEqual({ ok: false, error: CONTENT_FILTER_ERROR });
  });

  it("flags a refusal message, whatever the finish reason", () => {
    expect(classifyOpenAIFinish("stop", "I can't help with that.")).toEqual({
      ok: false,
      error: REFUSAL_ERROR,
    });
  });

  it("ignores empty or absent refusal fields", () => {
    expect(classifyOpenAIFinish("stop", null)).toEqual({ ok: true });
    expect(classifyOpenAIFinish("stop", "   ")).toEqual({ ok: true });
    expect(classifyOpenAIFinish("stop")).toEqual({ ok: true });
  });

  it("passes normal, unknown and missing finish reasons through", () => {
    for (const reason of ["stop", "tool_calls", "something_new", undefined, null]) {
      expect(classifyOpenAIFinish(reason)).toEqual({ ok: true });
    }
  });
});

describe("describeFetchFailure", () => {
  it("keeps the original network message for ordinary failures", () => {
    expect(describeFetchFailure("Anthropic", new TypeError("fetch failed"))).toBe(
      "Couldn't reach Anthropic's API. Check your network connection."
    );
    expect(describeFetchFailure("OpenAI", "weird")).toBe(
      "Couldn't reach OpenAI's API. Check your network connection."
    );
  });

  it("explains a response-header timeout", () => {
    const err = new TypeError("fetch failed", { cause: { code: "UND_ERR_HEADERS_TIMEOUT" } });
    expect(describeFetchFailure("OpenAI", err)).toMatch(/took too long/);
  });
});

// ---------------------------------------------------------------------------
// Provider wiring (fetch stubbed — no network)
// ---------------------------------------------------------------------------

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sentBody(fetchMock: ReturnType<typeof stubFetch>) {
  const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(init[1].body as string);
}

const params = { apiKey: "sk-test", model: "m", prompt: "p" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("anthropicProvider", () => {
  it("returns the text of a complete response and sends the raised cap", async () => {
    const fetchMock = stubFetch({ stop_reason: "end_turn", content: [{ type: "text", text: "{}" }] });
    await expect(anthropicProvider.generateCompletion(params)).resolves.toBe("{}");
    expect(sentBody(fetchMock).max_tokens).toBe(GENERATION_MAX_OUTPUT_TOKENS);
    expect(GENERATION_MAX_OUTPUT_TOKENS).toBe(16000);
  });

  it("throws the truncation error instead of returning cut-off JSON", async () => {
    stubFetch({ stop_reason: "max_tokens", content: [{ type: "text", text: '{"course": {' }] });
    await expect(anthropicProvider.generateCompletion(params)).rejects.toThrow(TRUNCATED_OUTPUT_ERROR);
  });

  it("throws the refusal error even with no text block", async () => {
    stubFetch({ stop_reason: "refusal", content: [] });
    await expect(anthropicProvider.generateCompletion(params)).rejects.toThrow(REFUSAL_ERROR);
  });

  it("doesn't apply the check to testConnection's tiny budget", async () => {
    stubFetch({ stop_reason: "max_tokens", content: [{ type: "text", text: "O" }] });
    await expect(anthropicProvider.testConnection("sk-test", "m")).resolves.toEqual({ ok: true });
  });
});

describe("openaiProvider", () => {
  it("returns the text of a complete response and sends the raised cap", async () => {
    const fetchMock = stubFetch({
      choices: [{ finish_reason: "stop", message: { content: "{}", refusal: null } }],
    });
    await expect(openaiProvider.generateCompletion(params)).resolves.toBe("{}");
    expect(sentBody(fetchMock).max_completion_tokens).toBe(GENERATION_MAX_OUTPUT_TOKENS);
  });

  it("throws the truncation error on finish_reason length", async () => {
    stubFetch({ choices: [{ finish_reason: "length", message: { content: '{"course": {' } }] });
    await expect(openaiProvider.generateCompletion(params)).rejects.toThrow(TRUNCATED_OUTPUT_ERROR);
  });

  it("throws the refusal error on a refusal message", async () => {
    stubFetch({ choices: [{ finish_reason: "stop", message: { content: null, refusal: "No." } }] });
    await expect(openaiProvider.generateCompletion(params)).rejects.toThrow(REFUSAL_ERROR);
  });

  it("doesn't apply the check to testConnection's tiny budget", async () => {
    stubFetch({ choices: [{ finish_reason: "length", message: { content: "" } }] });
    await expect(openaiProvider.testConnection("sk-test", "m")).resolves.toEqual({ ok: true });
  });
});
