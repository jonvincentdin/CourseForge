import type { Course, QuizQuestion } from "@/db/schema";
import type { FullCourse } from "@/lib/course-service";

/**
 * Markdown export (product brief §43) — a readable study document, not
 * a round-trippable format. JSON export stays the lossless one; this
 * is what someone prints, drops into a notes app, or reads offline.
 *
 * Pure on purpose (type-only imports, no DB): the route does the
 * ownership-checked load and this module only formats, so it can be
 * unit-tested without a database.
 */
export function courseToMarkdown(full: FullCourse): string {
  const { course, modules } = full;
  const blocks: string[] = [`# ${singleLine(course.title)}`];

  const meta = [
    course.subjectCode,
    course.academicYear !== null ? `Year ${course.academicYear}` : null,
    course.semester,
  ].filter((part): part is string => Boolean(part));
  if (meta.length > 0) blocks.push(meta.join(" · "));

  if (course.description) blocks.push(course.description.trim());

  if (course.learningObjectives.length > 0) {
    blocks.push(`## Course learning objectives\n\n${bulletList(course.learningObjectives)}`);
  }

  modules.forEach((mod, index) => {
    blocks.push(`## Module ${index + 1}: ${singleLine(mod.title)}`);
    if (mod.description) blocks.push(mod.description.trim());
    if (mod.learningObjectives.length > 0) {
      blocks.push(`**Learning objectives**\n\n${bulletList(mod.learningObjectives)}`);
    }

    const lesson = shiftHeadings(mod.contentMarkdown.trim(), 2);
    if (lesson) blocks.push(lesson);

    const questions = mod.quiz?.questions ?? [];
    if (questions.length > 0) {
      blocks.push(`### Quiz: ${singleLine(mod.quiz.title)}`);
      blocks.push(questions.map((q, i) => formatQuestion(q, i + 1)).join("\n\n"));
      blocks.push(
        `#### Answer key\n\n${questions.map((q, i) => formatAnswer(q, i + 1)).join("\n")}`
      );
    }
  });

  return `${blocks.join("\n\n")}\n`;
}

interface Fence {
  char: string;
  length: number;
}

/**
 * Lessons are written as standalone Markdown and may use `#`/`##`
 * headings, which would otherwise outrank the module heading they sit
 * under. Every ATX heading is pushed down `by` levels (capped at
 * `######`, the deepest Markdown has). Lines inside fenced code blocks
 * are left alone — a `# comment` in a Python or shell sample is code,
 * not a heading. A fence closes only on the same character with at
 * least the opening run's length (CommonMark's rule), so a ``` inside
 * a ```` block doesn't end it early.
 *
 * If the lesson ends inside an unclosed fence, a closing fence is
 * appended — otherwise it would swallow the quiz and every later
 * module of the exported document.
 *
 * Setext headings (text underlined with === / ---) are not shifted:
 * `---` is ambiguous with a thematic break, and the generation prompt
 * asks for ATX headings anyway.
 */
export function shiftHeadings(markdown: string, by: number): string {
  let open: Fence | null = null;
  const out: string[] = [];

  for (const line of markdown.split("\n")) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);

    if (open) {
      if (
        fence &&
        fence[1][0] === open.char &&
        fence[1].length >= open.length &&
        fence[2].trim() === ""
      ) {
        open = null;
      }
      out.push(line);
      continue;
    }

    // A backtick fence's info string can't itself contain backticks
    // (CommonMark) — such a line is inline code, not a fence.
    if (fence && (fence[1][0] === "~" || !fence[2].includes("`"))) {
      open = { char: fence[1][0], length: fence[1].length };
      out.push(line);
      continue;
    }

    const heading = line.match(/^( {0,3})(#{1,6})(?=[ \t]|$)(.*)$/);
    if (heading) {
      const level = Math.min(heading[2].length + by, 6);
      out.push(`${heading[1]}${"#".repeat(level)}${heading[3]}`);
    } else {
      out.push(line);
    }
  }

  if (open) out.push(open.char.repeat(open.length));
  return out.join("\n");
}

/** A, B, C … Z, then numbers — quizzes never realistically need more than a handful. */
export function optionLabel(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

type Options = { id: string; text: string }[];

/** Continuation indent for a numbered list item: wide enough for "10. " as well as "1. ". */
function itemIndent(n: number): string {
  return " ".repeat(String(n).length + 2);
}

function formatQuestion(q: QuizQuestion, n: number): string {
  const pad = itemIndent(n);
  const lines = [`${n}. ${indentContinuation(q.prompt.trim(), pad)}`];

  switch (q.type) {
    case "multiple_choice":
      lines.push(`${pad}*Choose one.*`);
      break;
    case "multiple_select":
      lines.push(`${pad}*Choose all that apply.*`);
      break;
    case "true_false":
      lines.push(`${pad}*True or false?*`);
      break;
    case "identification":
      lines.push(`${pad}*Write your answer.*`);
      break;
  }

  if (q.type === "multiple_choice" || q.type === "multiple_select") {
    const options = (q.options ?? []) as Options;
    options.forEach((option, i) => {
      lines.push(`${pad}- **${optionLabel(i)}.** ${singleLine(option.text)}`);
    });
  }

  return lines.join("\n");
}

function formatAnswer(q: QuizQuestion, n: number): string {
  const options = (q.options ?? []) as Options;
  const indexOf = (id: string) => options.findIndex((o) => o.id === id);
  const describe = (id: string) => {
    const index = indexOf(id);
    // Validation guarantees the id exists; fall back to the raw id
    // rather than dropping the answer if a legacy row ever disagrees.
    return index === -1
      ? `**${id}**`
      : `**${optionLabel(index)}.** ${singleLine(options[index].text)}`;
  };
  const asList = (value: QuizQuestion["correctAnswer"]) =>
    Array.isArray(value) ? value : [String(value)];

  let answer: string;
  switch (q.type) {
    case "multiple_choice":
      answer = describe(String(q.correctAnswer));
      break;
    case "multiple_select": {
      // Listed in option order, not in whatever order the JSON stored them.
      const rank = (id: string) => (indexOf(id) === -1 ? Number.MAX_SAFE_INTEGER : indexOf(id));
      answer = [...asList(q.correctAnswer)]
        .sort((a, b) => rank(a) - rank(b))
        .map(describe)
        .join("; ");
      break;
    }
    case "true_false":
      answer = q.correctAnswer === true ? "**True**" : "**False**";
      break;
    case "identification":
      answer = asList(q.correctAnswer)
        .map((accepted) => `**${singleLine(accepted)}**`)
        .join(" or ");
      break;
  }

  const explanation = q.explanation?.trim();
  return explanation
    ? `${n}. ${answer} — ${indentContinuation(explanation, itemIndent(n))}`
    : `${n}. ${answer}`;
}

function bulletList(items: string[]): string {
  return items.map((item) => `- ${singleLine(item)}`).join("\n");
}

/** Titles, options, and list items must stay on one line or they break the surrounding Markdown structure. */
function singleLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

/** Keeps multi-line prompts/explanations inside their numbered list item. */
function indentContinuation(text: string, pad: string): string {
  return text.replace(/\n/g, `\n${pad}`);
}

/**
 * Download filename for either export format. Falls back to "course"
 * when the title has no ASCII letters/digits at all (e.g. a title
 * written entirely in a non-Latin script), and appends `-v{n}` for
 * later versions so exporting v1 and v2 doesn't produce two files with
 * the same name.
 */
export function courseExportFilename(
  course: Pick<Course, "title" | "version">,
  extension: "json" | "md"
): string {
  const slug =
    course.title
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "course";
  const versionSuffix = course.version > 1 ? `-v${course.version}` : "";
  return `${slug}${versionSuffix}.${extension}`;
}
