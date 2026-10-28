/**
 * Milestone 10 — why did the AI stop? Pure helpers (no network, no
 * database) so they're unit-testable.
 *
 * A response that ended because it hit the output-token cap is cut off
 * mid-JSON. Before this existed, that truncated text went straight to
 * the course validator and surfaced as a baffling "That's not valid
 * JSON" — classifying the end reason first lets the user see what
 * actually happened and what to do about it.
 *
 * Only course generation checks this. testConnection deliberately
 * doesn't: its tiny 8-token budget can legitimately run out (reasoning
 * models spend tokens before answering) on a perfectly working key.
 */

/** Output-token cap for course generation (was 8000 before Milestone 10). */
export const GENERATION_MAX_OUTPUT_TOKENS = 16000;

export const TRUNCATED_OUTPUT_ERROR =
  "The AI ran out of room before finishing the course — try Concise or Standard depth.";

export const REFUSAL_ERROR =
  "The AI declined to generate this course. Try again, or adjust the focus or subject details first.";

export const CONTENT_FILTER_ERROR =
  "The AI provider's content filter stopped this response before the course was finished. Try again, or adjust the focus or subject details first.";

export type ResponseEnd = { ok: true } | { ok: false; error: string };

/**
 * Anthropic Messages API `stop_reason`. `model_context_window_exceeded`
 * is the same failure as `max_tokens` from the user's point of view
 * (the output was cut off). Anything else — `end_turn`,
 * `stop_sequence`, an unknown future value, or a missing field — is
 * passed through so the validator remains the judge, exactly as before.
 */
export function classifyAnthropicStop(stopReason: unknown): ResponseEnd {
  switch (stopReason) {
    case "max_tokens":
    case "model_context_window_exceeded":
      return { ok: false, error: TRUNCATED_OUTPUT_ERROR };
    case "refusal":
      return { ok: false, error: REFUSAL_ERROR };
    default:
      return { ok: true };
  }
}

/**
 * OpenAI Chat Completions `choices[0].finish_reason`, plus the
 * `message.refusal` string some models return instead of content.
 */
export function classifyOpenAIFinish(finishReason: unknown, refusal?: unknown): ResponseEnd {
  if (typeof refusal === "string" && refusal.trim() !== "") {
    return { ok: false, error: REFUSAL_ERROR };
  }
  switch (finishReason) {
    case "length":
      return { ok: false, error: TRUNCATED_OUTPUT_ERROR };
    case "content_filter":
      return { ok: false, error: CONTENT_FILTER_ERROR };
    default:
      return { ok: true };
  }
}

/**
 * The message for a fetch() that threw (no HTTP response at all).
 * Node's fetch gives up waiting for response headers after 5 minutes
 * (undici's headersTimeout); a non-streamed generation sends no headers
 * until the whole course is written, so a very long course can hit it.
 * That deserves a different hint than "check your network".
 */
export function describeFetchFailure(providerName: string, err: unknown): string {
  const cause = err instanceof Error ? (err.cause as { code?: unknown } | undefined) : undefined;
  const code = typeof cause?.code === "string" ? cause.code : undefined;
  if (code === "UND_ERR_HEADERS_TIMEOUT" || code === "UND_ERR_BODY_TIMEOUT") {
    return `${providerName} took too long to respond. Try Concise or Standard depth, which produce shorter courses.`;
  }
  return `Couldn't reach ${providerName}'s API. Check your network connection.`;
}
