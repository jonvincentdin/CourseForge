import { describe, expect, it } from "vitest";
import type { Course, QuizQuestion } from "@/db/schema";
import type { FullCourse } from "@/lib/course-service";
import {
  courseExportFilename,
  courseToMarkdown,
  optionLabel,
  shiftHeadings,
} from "./course-markdown-export";

const EPOCH = new Date(0);

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "c1",
    ownerId: "u1",
    subjectId: null,
    syllabusId: null,
    title: "Data Structures",
    subjectCode: "CS201",
    academicYear: 2,
    semester: "1st Semester",
    description: "Core data structures.",
    learningObjectives: ["Choose a structure"],
    schemaVersion: "1.0",
    source: "generated",
    versionGroupId: "c1",
    version: 1,
    visibility: "private",
    shareToken: null,
    sourceCourseId: null,
    originalCreatorName: null,
    copiedAt: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    ...overrides,
  };
}

function question(overrides: Partial<QuizQuestion> & Pick<QuizQuestion, "type">): QuizQuestion {
  return {
    id: `q-${Math.random()}`,
    quizId: "quiz1",
    prompt: "Prompt?",
    options: null,
    correctAnswer: "a",
    explanation: null,
    sortOrder: 0,
    ...overrides,
  };
}

function makeFull(
  contentMarkdown: string,
  questions: QuizQuestion[],
  courseOverrides: Partial<Course> = {}
): FullCourse {
  return {
    course: makeCourse(courseOverrides),
    modules: [
      {
        id: "m1",
        courseId: "c1",
        title: "Arrays",
        description: "Index-based storage.",
        learningObjectives: ["Explain indexing"],
        contentMarkdown,
        sortOrder: 0,
        createdAt: EPOCH,
        updatedAt: EPOCH,
        quiz: { id: "quiz1", moduleId: "m1", title: "Arrays Quiz", createdAt: EPOCH, questions },
      },
    ],
  };
}

describe("shiftHeadings", () => {
  it("pushes ATX headings down by the given levels, capped at ######", () => {
    const input = "# One\n## Two\n### Three\n#### Four\n##### Five\n###### Six";
    expect(shiftHeadings(input, 2)).toBe(
      "### One\n#### Two\n##### Three\n###### Four\n###### Five\n###### Six"
    );
  });

  it("leaves non-headings alone (#hashtag, 7+ hashes, inline #)", () => {
    const input = "#hashtag\n####### seven\nC# is a language\n    # indented code";
    expect(shiftHeadings(input, 2)).toBe(input);
  });

  it("does not touch # lines inside fenced code blocks", () => {
    const input = [
      "# Heading",
      "```python",
      "# a comment",
      "## also code",
      "```",
      "~~~",
      "# tilde fenced",
      "~~~",
      "## After",
    ].join("\n");
    expect(shiftHeadings(input, 2)).toBe(
      [
        "### Heading",
        "```python",
        "# a comment",
        "## also code",
        "```",
        "~~~",
        "# tilde fenced",
        "~~~",
        "#### After",
      ].join("\n")
    );
  });

  it("only closes a fence with a run at least as long as the opener", () => {
    const input = ["````md", "```", "# still code", "```", "````", "# heading"].join("\n");
    expect(shiftHeadings(input, 2).split("\n")).toEqual([
      "````md",
      "```",
      "# still code",
      "```",
      "````",
      "### heading",
    ]);
  });

  it("closes a fence left open at the end of the lesson", () => {
    expect(shiftHeadings("```js\nconst a = 1;", 2)).toBe("```js\nconst a = 1;\n```");
  });
});

describe("courseToMarkdown", () => {
  it("renders the course header, metadata, objectives, and module structure", () => {
    const md = courseToMarkdown(
      makeFull("# Arrays\n\nAn array.", [
        question({
          type: "true_false",
          prompt: "Arrays are zero-indexed.",
          correctAnswer: true,
        }),
      ])
    );

    expect(md.startsWith("# Data Structures\n\nCS201 · Year 2 · 1st Semester\n\nCore data structures.")).toBe(true);
    expect(md).toContain("## Course learning objectives\n\n- Choose a structure");
    expect(md).toContain("## Module 1: Arrays\n\nIndex-based storage.");
    expect(md).toContain("**Learning objectives**\n\n- Explain indexing");
    // Lesson's own "# Arrays" is demoted below the module heading.
    expect(md).toContain("\n### Arrays\n");
    expect(md).not.toMatch(/^# Arrays$/m);
    expect(md).toContain("### Quiz: Arrays Quiz");
    expect(md).toContain("#### Answer key");
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });

  it("omits the metadata line and optional sections when absent", () => {
    const md = courseToMarkdown(
      makeFull("Body", [question({ type: "true_false", correctAnswer: false })], {
        subjectCode: null,
        academicYear: null,
        semester: null,
        description: null,
        learningObjectives: [],
      })
    );
    expect(md.startsWith("# Data Structures\n\n## Module 1: Arrays")).toBe(true);
    expect(md).not.toContain("Course learning objectives");
  });

  it("labels options A/B/C and writes an answer key for all four question types", () => {
    const md = courseToMarkdown(
      makeFull("Body", [
        question({
          type: "multiple_choice",
          prompt: "What is arr[0]?",
          options: [
            { id: "x", text: "10" },
            { id: "y", text: "20" },
            { id: "z", text: "30" },
          ],
          correctAnswer: "y",
          explanation: "Second option.",
        }),
        question({
          type: "multiple_select",
          prompt: "Which are linear?",
          options: [
            { id: "a", text: "Array" },
            { id: "b", text: "Tree" },
            { id: "c", text: "Linked list" },
          ],
          // Stored out of option order on purpose.
          correctAnswer: ["c", "a"],
          explanation: "Both are linear.",
        }),
        question({
          type: "true_false",
          prompt: "Trees are linear.",
          correctAnswer: false,
        }),
        question({
          type: "identification",
          prompt: "Name the LIFO structure.",
          correctAnswer: ["Stack", "stack ADT"],
          explanation: "Last in, first out.",
        }),
      ])
    );

    // Questions
    expect(md).toContain(
      "1. What is arr[0]?\n   *Choose one.*\n   - **A.** 10\n   - **B.** 20\n   - **C.** 30"
    );
    expect(md).toContain("2. Which are linear?\n   *Choose all that apply.*\n   - **A.** Array");
    expect(md).toContain("3. Trees are linear.\n   *True or false?*");
    expect(md).toContain("4. Name the LIFO structure.\n   *Write your answer.*");

    // Answer key
    const key = md.slice(md.indexOf("#### Answer key"));
    expect(key).toContain("1. **B.** 20 — Second option.");
    expect(key).toContain("2. **A.** Array; **C.** Linked list — Both are linear.");
    expect(key).toContain("3. **False**");
    expect(key).toContain("4. **Stack** or **stack ADT** — Last in, first out.");
    // The answer key must not leak into the question list above it.
    expect(md.indexOf("**B.** 20 — ")).toBeGreaterThan(md.indexOf("#### Answer key"));
  });

  it("keeps multi-line prompts inside their list item", () => {
    const md = courseToMarkdown(
      makeFull("Body", [
        question({ type: "true_false", prompt: "Line one\nLine two", correctAnswer: true }),
      ])
    );
    expect(md).toContain("1. Line one\n   Line two\n   *True or false?*");
  });
});

describe("optionLabel", () => {
  it("uses letters then falls back to numbers", () => {
    expect(optionLabel(0)).toBe("A");
    expect(optionLabel(25)).toBe("Z");
    expect(optionLabel(26)).toBe("27");
  });
});

describe("courseExportFilename", () => {
  it("slugifies the title and trims stray hyphens", () => {
    expect(courseExportFilename({ title: "  Intro to C++!  ", version: 1 }, "md")).toBe(
      "intro-to-c.md"
    );
  });

  it("falls back to 'course' when the title slugifies to nothing", () => {
    expect(courseExportFilename({ title: "数据结构", version: 1 }, "json")).toBe("course.json");
  });

  it("adds -v{n} only for versions after the first", () => {
    expect(courseExportFilename({ title: "Arrays", version: 1 }, "json")).toBe("arrays.json");
    expect(courseExportFilename({ title: "Arrays", version: 3 }, "md")).toBe("arrays-v3.md");
  });
});
