import { describe, expect, it } from "vitest";
import { generateShareToken, isShareTokenFormat } from "@/lib/share-token";
import {
  ANONYMOUS_CREATOR_NAME,
  copySourceLabel,
  normalizeEmail,
  ownerDisplayName,
  parseShareEmail,
} from "@/lib/sharing-utils";

describe("share tokens", () => {
  it("are 32 base64url characters (24 random bytes)", () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(24);
    expect(isShareTokenFormat(token)).toBe(true);
  });

  it("don't repeat", () => {
    const tokens = new Set(Array.from({ length: 2000 }, generateShareToken));
    expect(tokens.size).toBe(2000);
  });

  it.each([
    ["empty", ""],
    ["too short", "abc"],
    ["too long", "a".repeat(33)],
    ["standard base64 chars", "a".repeat(31) + "+"],
    ["padding", "a".repeat(31) + "="],
    ["path traversal", "../../../../etc/passwd/aaaaaaaaa"],
    ["uuid", "123e4567-e89b-12d3-a456-426614174000"],
    ["sql-ish", "' or 1=1 --aaaaaaaaaaaaaaaaaaaaa"],
    ["whitespace", " " + "a".repeat(31)],
  ])("rejects malformed token: %s", (_label, value) => {
    expect(isShareTokenFormat(value)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isShareTokenFormat(undefined)).toBe(false);
    expect(isShareTokenFormat(null)).toBe(false);
    expect(isShareTokenFormat(123)).toBe(false);
  });
});

describe("email normalisation", () => {
  it("trims and lowercases like signup does", () => {
    expect(normalizeEmail("  Juan.Dela.Cruz@Example.COM ")).toBe("juan.dela.cruz@example.com");
  });

  it("parses valid emails to their normalised form", () => {
    expect(parseShareEmail(" Student@School.edu.ph")).toBe("student@school.edu.ph");
  });

  it.each([["not-an-email"], ["@example.com"], ["a@"], [""], ["   "], ["a b@example.com"]])(
    "rejects %j",
    (value) => {
      expect(parseShareEmail(value)).toBeNull();
    }
  );

  it("rejects non-strings and overlong addresses", () => {
    expect(parseShareEmail(undefined)).toBeNull();
    expect(parseShareEmail({ email: "a@b.co" })).toBeNull();
    expect(parseShareEmail("a".repeat(250) + "@b.co")).toBeNull();
  });
});

describe("display names", () => {
  it("never falls back to anything but the generic label", () => {
    expect(ownerDisplayName("Maria")).toBe("Maria");
    expect(ownerDisplayName("  Maria  ")).toBe("Maria");
    expect(ownerDisplayName(null)).toBe(ANONYMOUS_CREATOR_NAME);
    expect(ownerDisplayName("   ")).toBe(ANONYMOUS_CREATOR_NAME);
  });

  it("builds the copy-provenance line only for Course Copies", () => {
    expect(copySourceLabel({ source: "shared_copy", originalCreatorName: "Maria" })).toBe(
      "Added from a shared course · by Maria"
    );
    expect(copySourceLabel({ source: "shared_copy", originalCreatorName: null })).toBe(
      `Added from a shared course · by ${ANONYMOUS_CREATOR_NAME}`
    );
    expect(copySourceLabel({ source: "generated", originalCreatorName: null })).toBeNull();
    expect(copySourceLabel({ source: "imported", originalCreatorName: "x" })).toBeNull();
  });
});
