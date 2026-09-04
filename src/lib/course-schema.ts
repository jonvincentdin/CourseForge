import { z } from "zod";

/**
 * The versioned course JSON schema (product brief §31). This is the
 * single source of truth for what a valid course import looks like —
 * both the external-AI-prompt path (Milestone 5) and the direct-AI
 * path (Milestone 6) must produce JSON that satisfies this validator;
 * this module doesn't know or care which path produced it.
 */
export const CURRENT_SCHEMA_VERSION = "1.0";
const SUPPORTED_SCHEMA_VERSIONS = new Set([CURRENT_SCHEMA_VERSION]);

const optionSchema = z.object({
  id: z.string().trim().min(1).max(10),
  text: z.string().trim().min(1).max(500),
});

const baseQuestionSchema = z.object({
  prompt: z.string().trim().min(1, "Every question needs prompt text."),
  explanation: z.string().trim().max(2000).optional(),
});

const multipleChoiceQuestion = baseQuestionSchema.extend({
  type: z.literal("multiple_choice"),
  options: z.array(optionSchema).min(2, "Multiple choice needs at least 2 options."),
  correctAnswer: z.string(),
});

const multipleSelectQuestion = baseQuestionSchema.extend({
  type: z.literal("multiple_select"),
  options: z.array(optionSchema).min(2, "Multiple select needs at least 2 options."),
  correctAnswer: z.array(z.string()).min(1, "Multiple select needs at least 1 correct answer."),
});

const trueFalseQuestion = baseQuestionSchema.extend({
  type: z.literal("true_false"),
  correctAnswer: z.boolean(),
});

const identificationQuestion = baseQuestionSchema.extend({
  type: z.literal("identification"),
  correctAnswer: z
    .array(z.string().trim().min(1))
    .min(1, "Identification needs at least 1 accepted answer."),
});

const questionSchema = z
  .discriminatedUnion("type", [
    multipleChoiceQuestion,
    multipleSelectQuestion,
    trueFalseQuestion,
    identificationQuestion,
  ])
  .superRefine((question, ctx) => {
    if (question.type === "multiple_choice") {
      const validIds = new Set(question.options.map((o) => o.id));
      if (!validIds.has(question.correctAnswer)) {
        ctx.addIssue({
          code: "custom",
          message: `correctAnswer "${question.correctAnswer}" must match one of the option ids.`,
          path: ["correctAnswer"],
        });
      }
    }
    if (question.type === "multiple_select") {
      const validIds = new Set(question.options.map((o) => o.id));
      const invalid = question.correctAnswer.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        ctx.addIssue({
          code: "custom",
          message: `correctAnswer contains ids that don't match any option: ${invalid.join(", ")}.`,
          path: ["correctAnswer"],
        });
      }
    }
  });

const quizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  // The brief is explicit that every module needs a quiz — enforced
  // here as "at least one question," not left optional.
  questions: z.array(questionSchema).min(1, "Every module's quiz needs at least 1 question."),
});

const moduleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "Every module needs a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  learning_objectives: z.array(z.string().trim().min(1)).optional().default([]),
  content_markdown: z
    .string()
    .trim()
    .min(1, "Every module needs Markdown lesson content."),
  quiz: quizSchema,
});

const courseSchema = z.object({
  title: z.string().trim().min(1, "The course needs a title.").max(200),
  subject_code: z.string().trim().max(20).optional(),
  year: z.number().int().min(1).max(4).optional(),
  semester: z.enum(["1st Semester", "2nd Semester", "Summer"]).optional(),
  description: z.string().trim().max(2000).optional(),
  learning_objectives: z.array(z.string().trim().min(1)).optional().default([]),
  modules: z.array(moduleSchema).min(1, "A course needs at least 1 module."),
});

export const courseImportSchema = z.object({
  schema_version: z.string(),
  course: courseSchema,
});

export type CourseImport = z.infer<typeof courseImportSchema>;
export type QuestionImport = z.infer<typeof questionSchema>;

/**
 * Real JSON Schema (draft 2020-12), generated directly from the same
 * zod schema that validates imports — so the downloadable schema and
 * the actual validation logic can never drift apart. Used by
 * Milestone 5's "Download JSON Schema" button.
 */
export function getCourseJsonSchema() {
  const schema = z.toJSONSchema(courseImportSchema);
  return {
    ...schema,
    title: "CourseForge Course Import",
    description:
      "Schema for course JSON that CourseForge can import. schema_version must be \"" +
      CURRENT_SCHEMA_VERSION +
      "\".",
  };
}

export interface ImportValidationResult {
  ok: boolean;
  data?: CourseImport;
  errors: string[];
}

/**
 * Validates raw (already-JSON.parsed) input against the schema and
 * returns specific, field-level messages — the brief is explicit that
 * "malformed or incomplete JSON must result in useful validation
 * errors," not a generic "invalid JSON."
 */
export function validateCourseImport(input: unknown): ImportValidationResult {
  if (
    typeof input === "object" &&
    input !== null &&
    "schema_version" in input &&
    typeof (input as { schema_version: unknown }).schema_version === "string" &&
    !SUPPORTED_SCHEMA_VERSIONS.has((input as { schema_version: string }).schema_version)
  ) {
    return {
      ok: false,
      errors: [
        `Unsupported schema_version "${(input as { schema_version: string }).schema_version}". CourseForge currently supports: ${[...SUPPORTED_SCHEMA_VERSIONS].join(", ")}.`,
      ],
    };
  }

  const result = courseImportSchema.safeParse(input);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    });
    return { ok: false, errors };
  }

  return { ok: true, data: result.data, errors: [] };
}

/** A minimal, valid example — used to seed the import UI and (later) Milestone 5's schema download. */
export const EXAMPLE_COURSE_IMPORT: CourseImport = {
  schema_version: CURRENT_SCHEMA_VERSION,
  course: {
    title: "Introduction to Data Structures",
    subject_code: "CS201",
    year: 2,
    semester: "1st Semester",
    description: "A first pass at core data structures and when to use each one.",
    learning_objectives: [
      "Explain how arrays and linked lists store data differently",
      "Choose an appropriate data structure for a given problem",
    ],
    modules: [
      {
        id: "module-1",
        title: "Arrays",
        description: "Fixed-size, index-based storage.",
        learning_objectives: ["Explain how array indexing works"],
        content_markdown:
          "# Arrays\n\nAn array stores elements in contiguous memory, accessed by index.\n\n## Example\n\n`[10, 20, 30, 40]` — `arr[0]` is `10`.\n\n## Summary\n\nArrays are fast to index but expensive to resize.",
        quiz: {
          title: "Arrays Quiz",
          questions: [
            {
              type: "multiple_choice",
              prompt: "What is arr[0] in [10, 20, 30, 40]?",
              options: [
                { id: "a", text: "10" },
                { id: "b", text: "20" },
                { id: "c", text: "40" },
              ],
              correctAnswer: "a",
              explanation: "Array indexing starts at 0, so arr[0] is the first element, 10.",
            },
          ],
        },
      },
    ],
  },
};
