import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "crypto";

/**
 * Encrypts/decrypts AI provider API keys before they ever touch the
 * database. This module is imported ONLY by server-side code
 * (route handlers, src/lib/ai-config-service.ts) — never by anything
 * that could end up in a client bundle. See .context/SECURITY.md for
 * the full list of non-negotiable rules this exists to satisfy.
 *
 * ENCRYPTION_KEY must be a real secret set via environment variable,
 * never committed, never the same value as AUTH_SECRET. It is
 * stretched with scrypt into a proper 32-byte AES-256 key so the raw
 * env var doesn't need to be exactly 32 bytes itself.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended for GCM
const SALT = "courseforge-api-key-encryption"; // fixed salt: the secret is the ENCRYPTION_KEY, not the salt

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Copy .env.example to .env.local and set a real secret before storing AI API keys."
    );
  }
  return scryptSync(secret, SALT, 32);
}

/** Returns a single opaque base64 string safe to store in a text column. */
export function encryptSecret(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // iv | authTag | ciphertext, all concatenated then base64-encoded.
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/** For display only — never send the real key to the client. */
export function maskApiKey(): string {
  return "•".repeat(20);
}
