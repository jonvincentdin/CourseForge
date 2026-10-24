import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "@/lib/safe-redirect";

describe("safeCallbackUrl", () => {
  it("accepts same-origin relative paths, keeping query and hash", () => {
    expect(safeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(safeCallbackUrl("/share/abc?add=1")).toBe("/share/abc?add=1");
    expect(safeCallbackUrl("/share/AbC-_9xYz012345678901234567890123?add=1")).toBe(
      "/share/AbC-_9xYz012345678901234567890123?add=1"
    );
    expect(safeCallbackUrl("/courses/1#module-2")).toBe("/courses/1#module-2");
  });

  it("round-trips the encoded callbackUrl the share page builds", () => {
    const raw = decodeURIComponent(encodeURIComponent("/share/abc?add=1"));
    expect(safeCallbackUrl(raw)).toBe("/share/abc?add=1");
  });

  it("normalises dot segments without leaving the origin", () => {
    expect(safeCallbackUrl("/a/../courses")).toBe("/courses");
    expect(safeCallbackUrl("/../../etc")).toBe("/etc");
  });

  it.each([
    ["protocol-relative", "//evil.com"],
    ["protocol-relative with path", "//evil.com/share/abc"],
    ["slash-backslash", "/\\evil.com"],
    ["backslash-slash", "\\/evil.com"],
    ["backslash anywhere", "/share\\..\\..\\evil"],
    ["absolute https", "https://evil.com"],
    ["absolute http", "http://evil.com/dashboard"],
    ["javascript scheme", "javascript:alert(1)"],
    ["javascript scheme, mixed case", "JaVaScRiPt:alert(1)"],
    ["data scheme", "data:text/html,<script>alert(1)</script>"],
    ["bare host", "evil.com"],
    ["relative without slash", "dashboard"],
    ["tab-smuggled double slash", "/\t/evil.com"],
    ["newline-smuggled double slash", "/\n/evil.com"],
    ["null byte", "/dashboard\u0000"],
    ["DEL char", "/dash\u007Fboard"],
    ["percent-encoded double slash", "/%2F%2Fevil.com"],
    ["percent-encoded second slash", "/%2Fevil.com"],
    ["percent-encoded backslash", "/%5Cevil.com"],
    ["percent-encoded tab", "/%09/evil.com"],
    ["double-encoded is still a plain path, but malformed % is rejected", "/%E0%A4%A"],
    ["empty", ""],
  ])("rejects %s", (_label, input) => {
    expect(safeCallbackUrl(input)).toBe("/dashboard");
  });

  it("rejects non-strings", () => {
    expect(safeCallbackUrl(null)).toBe("/dashboard");
    expect(safeCallbackUrl(undefined)).toBe("/dashboard");
    expect(safeCallbackUrl(["/dashboard"])).toBe("/dashboard");
    expect(safeCallbackUrl(42)).toBe("/dashboard");
  });

  it("rejects absurdly long values", () => {
    expect(safeCallbackUrl("/" + "a".repeat(5000))).toBe("/dashboard");
  });

  it("uses the supplied fallback", () => {
    expect(safeCallbackUrl("//evil.com", "/courses")).toBe("/courses");
    expect(safeCallbackUrl(null, "/share/abc")).toBe("/share/abc");
  });
});
