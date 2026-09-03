import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  uuid,
  integer,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

/**
 * Milestone 1 scope: authentication + user foundation.
 * Milestone 2 scope: syllabus + subject storage (added below).
 * Course, Module, Quiz, Progress, and Sharing tables are introduced in
 * their respective milestones (see .context/DATABASE.md and
 * .context/MILESTONES.md) — they are intentionally NOT stubbed here
 * so the schema never implies functionality that doesn't exist yet.
 */

export const users = pgTable("user", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auth.js (NextAuth v5) DrizzleAdapter tables — required schema shape.
export const accounts = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Milestone 2 — Syllabus Management
// ---------------------------------------------------------------------------

export const syllabusStatus = pgEnum("syllabus_status", [
  "processing",
  "needs_review",
  "ready",
  "failed",
]);

export const semesterEnum = pgEnum("semester", [
  "1st Semester",
  "2nd Semester",
  "Summer",
]);

/**
 * Versioning approach: each upload is its own independent, self-contained
 * record (the brief explicitly allows "versions OR separate syllabus
 * records" — see .context/DECISIONS.md). There is no parent/lineage link
 * between re-uploads; the syllabus library simply lists every record a
 * user has, newest first. This keeps the model simple and still satisfies
 * "never destroy older syllabus data."
 */
export const syllabi = pgTable("syllabus", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  storageKey: text("storage_key").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  status: syllabusStatus("status").notNull().default("processing"),
  extractedText: text("extracted_text"),
  extractionWarnings: text("extraction_warnings").array(),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subjects = pgTable("subject", {
  id: uuid("id").primaryKey().defaultRandom(),
  syllabusId: uuid("syllabus_id")
    .notNull()
    .references(() => syllabi.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  academicYear: integer("academic_year").notNull(),
  semester: semesterEnum("semester").notNull(),
  units: text("units"),
  sortOrder: integer("sort_order").notNull().default(0),
  // Detected automatically vs. added/edited by hand — surfaced in the
  // review UI so a user can see what CourseForge is less sure about.
  autoDetected: boolean("auto_detected").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Syllabus = typeof syllabi.$inferSelect;
export type NewSyllabus = typeof syllabi.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
