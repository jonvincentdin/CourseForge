import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for pure logic only (formatters, prompt building,
 * filtering) — nothing here touches the database, so there's no test
 * DB to provision. `@` mirrors tsconfig's `@/*` → `./src/*` path.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
