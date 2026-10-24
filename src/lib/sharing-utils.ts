import { z } from "zod";

/**
 * Pure helpers for Milestone 9 sharing — no database or node-only
 * imports, so they're unit-testable and safe to import from client
 * components. Token generation lives in share-token.ts (server-only).
 */

/** Cap on people per private course — keeps the dialog and the permission table bounded. */
export const MAX_SHARE_PEOPLE = 100;

/** Shown wherever an owner's name is missing. Never fall back to the email. */
export const ANONYMOUS_CREATOR_NAME = "A CourseForge student";

/** Same normalisation signup applies to user.email (trim + lowercase), so the two compare by equality. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const emailSchema = z.string().email().max(254);

/** Normalised email, or null if it isn't a plausible address. */
export function parseShareEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = normalizeEmail(raw);
  return emailSchema.safeParse(normalized).success ? normalized : null;
}

export function ownerDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : ANONYMOUS_CREATOR_NAME;
}

/**
 * The library-card provenance line for a Course Copy, or null for any
 * other course. `originalCreatorName` is a snapshot taken at copy time.
 */
export function copySourceLabel(course: {
  source: "imported" | "generated" | "shared_copy";
  originalCreatorName: string | null;
}): string | null {
  if (course.source !== "shared_copy") return null;
  return `Added from a shared course · by ${ownerDisplayName(course.originalCreatorName)}`;
}

/**
 * Error logging for share routes. Drizzle's query errors embed the
 * bound parameters in their message — which, on these routes, would
 * include the share token (a bearer credential) — so only the error's
 * class name and Postgres error code are ever logged.
 */
export function logShareError(context: string, err: unknown): void {
  const name = err instanceof Error ? err.name : "UnknownError";
  const cause = err instanceof Error ? (err.cause as { code?: unknown } | undefined) : undefined;
  const code = typeof cause?.code === "string" ? cause.code : undefined;
  console.error(`[share] ${context} failed: ${name}${code ? ` (${code})` : ""}`);
}
