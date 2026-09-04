import type { Subject, Syllabus } from "@/db/schema";
import { CURRENT_SCHEMA_VERSION, EXAMPLE_COURSE_IMPORT } from "@/lib/course-schema";

export type CourseDepth = "concise" | "standard" | "detailed";

const DEPTH_GUIDANCE: Record<CourseDepth, string> = {
  concise:
    "Keep it concise: 3-5 modules, each with a short lesson (roughly 150-300 words) covering only the essentials.",
  standard:
    "Standard depth: 5-8 modules, each with a solid lesson (roughly 300-600 words) including at least one worked example.",
  detailed:
    "Go in-depth: 8-12 modules, each with a thorough lesson (600+ words), multiple examples, and practical applications.",
};

// Keep the embedded syllabus context bounded — this is for grounding,
// not a full reproduction of the source document in every prompt.
const MAX_SYLLABUS_CONTEXT_CHARS = 4000;

export interface PromptOptions {
  subject: Subject;
  syllabus: Syllabus;
  depth: CourseDepth;
  includeLearningObjectives: boolean;
}

export function buildCoursePrompt({
  subject,
  syllabus,
  depth,
  includeLearningObjectives,
}: PromptOptions): string {
  const syllabusContext = (syllabus.extractedText ?? "").slice(
    0,
    MAX_SYLLABUS_CONTEXT_CHARS
  );

  const sections = [
    `You are creating a structured learning course for CourseForge, a platform that turns university syllabi into courses students actually study from.`,

    `## Subject\n- Title: ${subject.name}\n- Code: ${subject.code ?? "(none given)"}\n- Academic year: Year ${subject.academicYear}\n- Semester: ${subject.semester}\n- Source curriculum: ${syllabus.title}`,

    syllabusContext
      ? `## Syllabus context (for grounding — draw on this where relevant, don't just restate it)\n\`\`\`\n${syllabusContext}\n\`\`\``
      : null,

    `## Course requirements\n${DEPTH_GUIDANCE[depth]}\n- Base the course specifically on "${subject.name}"${subject.code ? ` (${subject.code})` : ""} — do not write a generic overview of the general field.\n- Give the course a clear, specific title (not just the subject name verbatim if you can do better) and a 1-3 sentence description.${
      includeLearningObjectives
        ? "\n- Include 2-5 course-level learning_objectives, and 1-3 per module."
        : "\n- You can omit learning_objectives (leave the arrays empty) — they're not needed this time."
    }`,

    `## Module requirements\n- Give modules a logical progression (foundational concepts before advanced ones).\n- Avoid excessive splitting — group related sub-topics into one module rather than many tiny ones.\n- Each module needs a short, specific title (not "Module 1", "Introduction", etc. unless that's genuinely the best name).`,

    `## Markdown requirements\n- Write each module's lesson as Markdown in content_markdown: headings, short paragraphs, lists, and a fenced code block or worked example where the topic calls for it (especially for technical/programming subjects).\n- Do not include raw HTML or JavaScript — Markdown syntax only.\n- Do not include a top-level "# Module Title" heading inside content_markdown — the title field already carries that.`,

    `## Quiz requirements\n- Every module needs a quiz with at least 1 question (more is better — aim for 3-5 for standard/detailed depth).\n- Use a mix of question types where it makes sense: multiple_choice, multiple_select, true_false, identification.\n- Every question needs a clear explanation of the correct answer.\n- For multiple_choice/multiple_select, correctAnswer must reference the id(s) of the correct option(s) exactly as given in options.`,

    `## Output format — CRITICAL\nRespond with ONLY a single JSON object matching the schema below. No prose before or after it, no markdown code fences around it — just the raw JSON object, starting with { and ending with }.\n\n\`\`\`json\n${JSON.stringify(EXAMPLE_COURSE_IMPORT, null, 2)}\n\`\`\`\n\nThe JSON must include "schema_version": "${CURRENT_SCHEMA_VERSION}" exactly as shown above. The example above is illustrative of the *shape* only — write real content about "${subject.name}", not this example's Arrays content.`,
  ];

  return sections.filter(Boolean).join("\n\n");
}
