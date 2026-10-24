/**
 * Sanitises a post-login/signup `callbackUrl` to a same-origin relative
 * path. Pushing an unchecked callbackUrl is an open redirect
 * (`/login?callbackUrl=https://evil.example` → phishing page that looks
 * like it came from CourseForge), so anything that isn't unambiguously
 * "a path on this site" falls back.
 *
 * Accepts only strings that:
 * - start with exactly one "/" (rejects "//host" and "/\host", which
 *   browsers treat as protocol-relative URLs),
 * - contain no backslash or control character anywhere (browsers
 *   normalise "\" to "/" and strip tabs/newlines, which turns innocent-
 *   looking input into "//host"),
 * - still look like that after percent-decoding (defence in depth for
 *   callers that decode before navigating),
 * - resolve against a dummy origin to that same origin.
 *
 * Pure and edge-safe: used by the auth forms and by middleware's
 * authorized() callback.
 */
const DUMMY_ORIGIN = "http://n";
const MAX_LENGTH = 2048;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

function isPlainRelativePath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("\\")) return false;
  if (CONTROL_CHARS.test(value)) return false;
  return true;
}

export function safeCallbackUrl(raw: unknown, fallback = "/dashboard"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_LENGTH) return fallback;
  if (!isPlainRelativePath(raw)) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding — not something this app ever generates.
    return fallback;
  }
  if (!isPlainRelativePath(decoded)) return fallback;

  let url: URL;
  try {
    url = new URL(raw, DUMMY_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== DUMMY_ORIGIN) return fallback;

  // Return the normalised form (resolves "/a/../b", keeps query + hash).
  return `${url.pathname}${url.search}${url.hash}`;
}
