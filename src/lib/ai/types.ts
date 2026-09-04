export interface TestConnectionResult {
  ok: boolean;
  error?: string;
}

export interface GenerateCompletionParams {
  apiKey: string;
  model: string;
  prompt: string;
}

/**
 * The provider-agnostic contract (product brief §37: "Additional AI
 * providers should be addable later without rewriting the
 * application"). Every provider implements exactly these two
 * operations against its own API; nothing else in the app — the
 * generation route, the config UI, the encryption layer — needs to
 * know which provider is in use.
 */
export interface AIProvider {
  id: string;
  displayName: string;
  apiKeyPlaceholder: string;
  modelPlaceholder: string;
  /** A cheap, fast call that proves the key/model actually work, without generating a full course. */
  testConnection(apiKey: string, model: string): Promise<TestConnectionResult>;
  /** Returns the raw text response — the caller is responsible for extracting/validating JSON from it. */
  generateCompletion(params: GenerateCompletionParams): Promise<string>;
}
