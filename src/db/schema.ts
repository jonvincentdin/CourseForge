import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  uuid,
  integer,
  pgEnum,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

/**
 * Milestone 1 scope: authentication + user foundation.
 * Milestone 2 scope: syllabus + subject storage.
 * Milestone 4 scope: course/module/quiz storage (added below).
 * Progress and Sharing tables are introduced in their respective
 * milestones (see .context/DATABASE.md and .context/MILESTONES.md) —
 * they are intentionally NOT stubbed here so the schema never implies
 * functionality that doesn't exist yet.
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

// ---------------------------------------------------------------------------
// Milestone 4 — Course Data Model
// ---------------------------------------------------------------------------

export const courseSourceEnum = pgEnum("course_source", [
  "imported",
  "generated",
  "shared_copy",
]);

export const quizQuestionType = pgEnum("quiz_question_type", [
  "multiple_choice",
  "multiple_select",
  "true_false",
  "identification",
]);

/**
 * A course is a self-contained snapshot once created — its Markdown
 * content does not live-update if the source subject/syllabus later
 * changes. subjectId/syllabusId are kept for provenance/display only
 * and are nullable with onDelete "set null": deleting the syllabus a
 * course was generated from must never delete or orphan the course
 * itself (see .context/DECISIONS.md).
 */
export const courses = pgTable("course", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  syllabusId: uuid("syllabus_id").references(() => syllabi.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  subjectCode: text("subject_code"),
  academicYear: integer("academic_year"),
  semester: semesterEnum("semester"),
  description: text("description"),
  learningObjectives: jsonb("learning_objectives").$type<string[]>().notNull().default([]),
  schemaVersion: text("schema_version").notNull().default("1.0"),
  source: courseSourceEnum("source").notNull().default("imported"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const courseModules = pgTable("course_module", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  learningObjectives: jsonb("learning_objectives").$type<string[]>().notNull().default([]),
  contentMarkdown: text("content_markdown").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Every module has exactly one quiz — enforced by the unique constraint on module_id. */
export const quizzes = pgTable("quiz", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .unique()
    .references(() => courseModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * `options` is null for identification questions. For multiple_choice /
 * multiple_select it's an array of {id, text}. `correctAnswer` shape
 * depends on `type`:
 *   multiple_choice  -> string (the correct option id)
 *   multiple_select  -> string[] (the correct option ids)
 *   true_false       -> boolean
 *   identification   -> string[] (any accepted answer, matched case-insensitively)
 * Enforced by src/lib/course-schema.ts at write time, not by the DB.
 */
export const quizQuestions = pgTable("quiz_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  type: quizQuestionType("type").notNull(),
  prompt: text("prompt").notNull(),
  options: jsonb("options").$type<{ id: string; text: string }[] | null>(),
  correctAnswer: jsonb("correct_answer").$type<string | string[] | boolean>().notNull(),
  explanation: text("explanation"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseModule = typeof courseModules.$inferSelect;
export type NewCourseModule = typeof courseModules.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;
