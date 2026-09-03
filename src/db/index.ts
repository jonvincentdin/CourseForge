import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __coursefogeQueryClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and configure your Postgres connection string."
  );
}

// Reuse the connection across hot reloads in development so we don't
// exhaust the Postgres connection pool.
const queryClient =
  global.__coursefogeQueryClient ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  global.__coursefogeQueryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });
