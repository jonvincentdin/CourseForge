import { randomBytes } from "crypto";

/** 24 random bytes → exactly 32 base64url characters (192 bits). */
const SHARE_TOKEN_BYTES = 24;
const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/**
 * A share token is a bearer capability, like the URL it lives in:
 * whoever holds it can reach the share page. CSPRNG bytes only — never
 * derived from ids, timestamps, or Math.random().
 */
export function generateShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

/**
 * Shape check before any database lookup. Anything that couldn't have
 * come from generateShareToken is rejected up front — it can't match a
 * row anyway, and it keeps arbitrary path input out of queries.
 */
export function isShareTokenFormat(value: unknown): value is string {
  return typeof value === "string" && SHARE_TOKEN_PATTERN.test(value);
}
