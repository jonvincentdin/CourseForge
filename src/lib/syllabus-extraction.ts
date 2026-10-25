/**
 * Best-effort, regex-based extraction of a title, and per-subject
 * year/semester/code/name from raw syllabus text. This is intentionally
 * NOT an AI-powered extraction (that's out of scope for Milestone 2 —
 * see .context/AI_GENERATION.md, which only covers course generation).
 *
 * Two document shapes are recognised:
 *   - A curriculum / prospectus: many "CODE Name" lines grouped under
 *     "Year N" / "Nth Semester" headings.
 *   - A single-course syllabus (course outline): labelled header fields
 *     like "Course Number : CSIT121  Descriptive Title : …" followed by
 *     pages of prose (vision, outcomes, weekly plan). That becomes
 *     exactly one subject.
 *
 * A line only counts as a subject when it starts with a subject code.
 * Earlier versions accepted any line with a few letters in it, which
 * turned every sentence of a course outline into a "subject" (a real
 * one-course PDF produced 482 of them).
 *
 * Every result of this parser is provisional. The review step in the
 * UI is not optional — the brief is explicit that uncertain extraction
 * must never be silently invented as fact (product brief §20).
 */

export type Semester = "1st Semester" | "2nd Semester" | "Summer";

export interface ExtractedSubject {
  name: string;
  code: string | null;
  academicYear: number;
  semester: Semester;
  units: string | null;
  sortOrder: number;
}

export interface SyllabusExtractionResult {
  suggestedTitle: string;
  subjects: ExtractedSubject[];
  warnings: string[];
}

const YEAR_PATTERNS: RegExp[] = [
  /\b([1-4])(?:st|nd|rd|th)\s+year\b/i,
  /\byear\s*([1-4])\b/i,
];

const YEAR_WORDS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };
const YEAR_WORD_PATTERN = /\b(first|second|third|fourth)\s+year\b/i;

const SEMESTER_FIRST = /\b(?:1st|first)\s+semester\b/i;
const SEMESTER_SECOND = /\b(?:2nd|second)\s+semester\b/i;
const SEMESTER_SUMMER = /\bsummer\s*(?:term|semester)?\b/i;

const CODE = String.raw`[A-Z]{2,6}\s?-?\s?\d{2,4}[A-Z]?`;

// e.g. "CS201 Data Structures", "CS 201 - Data Structures", "IT-201A: Networks"
const SUBJECT_LINE = new RegExp(String.raw`^(${CODE})\s*[-–:.]?\s+(.+)$`);

// Labelled header fields of a single-course syllabus.
const COURSE_CODE_FIELD = new RegExp(
  String.raw`\bcourse\s*(?:number|code|no\.?)\s*[:\-–]\s*(${CODE})\b`,
  "i"
);
const COURSE_TITLE_FIELD =
  /\b(?:descriptive\s+title|course\s+title|subject\s+title)\s*[:\-–]\s*(.+?)\s*(?=\b(?:number\s+of\s+units|units|credits|pre-?requisites?|co-?requisites?|course\s+(?:number|code))\b|$)/im;
const UNITS_FIELD =
  /\b(?:number\s+of\s+)?units(?:\s*\/\s*credits)?\s*[:\-–]\s*(\d+(?:\.\d+)?)/i;

// If a document has a labelled course header and fewer than this many
// coded subject lines, it's treated as a single-course syllabus — a
// course outline still mentions the odd code (prerequisites, related
// courses), but a real curriculum lists dozens.
const CURRICULUM_MIN_SUBJECTS = 3;

const MAX_SUBJECT_NAME_LENGTH = 120;

function detectYear(line: string): number | null {
  for (const pattern of YEAR_PATTERNS) {
    const match = line.match(pattern);
    if (match) return Number(match[1]);
  }
  const word = line.match(YEAR_WORD_PATTERN);
  if (word) return YEAR_WORDS[word[1].toLowerCase()];
  return null;
}

function detectSemester(line: string): Semester | null {
  if (SEMESTER_FIRST.test(line)) return "1st Semester";
  if (SEMESTER_SECOND.test(line)) return "2nd Semester";
  if (SEMESTER_SUMMER.test(line)) return "Summer";
  return null;
}

/** Uppercase with spaces/hyphens removed, so "CS 201" and "cs-201" compare equal. */
export function normalizeSubjectCode(code: string): string {
  return code.replace(/[\s-]+/g, "").toUpperCase();
}

function parseSubjectLine(line: string): { code: string; name: string } | null {
  const match = line.match(SUBJECT_LINE);
  if (!match) return null;
  const name = match[2].trim();
  // The name must read like a title, not a sentence fragment or a number.
  if (name.length < 3 || name.length > MAX_SUBJECT_NAME_LENGTH) return null;
  if (!/[a-zA-Z]{3,}/.test(name)) return null;
  return { code: match[1].replace(/\s+/g, ""), name };
}

function extractCurriculum(lines: string[]) {
  let currentYear = 1;
  let currentSemester: Semester = "1st Semester";
  let sawYearHeading = false;
  let sawSemesterHeading = false;
  const seenCodes = new Set<string>();
  const subjects: ExtractedSubject[] = [];

  for (const line of lines) {
    const detectedYear = detectYear(line);
    if (detectedYear !== null) {
      currentYear = detectedYear;
      sawYearHeading = true;
      continue;
    }

    const detectedSemester = detectSemester(line);
    if (detectedSemester !== null) {
      currentSemester = detectedSemester;
      sawSemesterHeading = true;
      continue;
    }

    const parsed = parseSubjectLine(line);
    // A code seen twice is the same subject mentioned again (e.g. as a
    // prerequisite) — keep the first, where it's actually listed.
    if (!parsed || seenCodes.has(normalizeSubjectCode(parsed.code))) continue;
    seenCodes.add(normalizeSubjectCode(parsed.code));

    subjects.push({
      name: parsed.name,
      code: parsed.code,
      academicYear: currentYear,
      semester: currentSemester,
      units: null,
      sortOrder: subjects.length,
    });
  }

  return { subjects, sawYearHeading, sawSemesterHeading };
}

function extractSingleCourse(lines: string[], text: string) {
  const codeMatch = text.match(COURSE_CODE_FIELD);
  if (!codeMatch) return null;
  const code = codeMatch[1].replace(/\s+/g, "");

  const titleMatch = text.match(COURSE_TITLE_FIELD);
  const name = titleMatch?.[1].trim().replace(/[\s:;,-]+$/, "") || code;

  const units = text.match(UNITS_FIELD)?.[1] ?? null;

  // Course outlines rarely state the year level; when they do, it's
  // usually in the header block, so take the first explicit mention.
  let academicYear: number | null = null;
  let semester: Semester | null = null;
  for (const line of lines) {
    academicYear ??= detectYear(line);
    semester ??= detectSemester(line);
    if (academicYear !== null && semester !== null) break;
  }

  return { code, name, units, academicYear, semester };
}

export function extractSyllabusStructure(
  rawText: string
): SyllabusExtractionResult {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const warnings: string[] = [];

  let suggestedTitle = "Uploaded Syllabus";
  let titleLineIndex = -1;
  if (lines.length > 0) {
    const first = lines[0];
    if (
      first.length >= 4 &&
      first.length <= 100 &&
      detectYear(first) === null &&
      detectSemester(first) === null
    ) {
      suggestedTitle = first;
      titleLineIndex = 0;
    }
  }

  const bodyLines = lines.filter((_, index) => index !== titleLineIndex);
  const curriculum = extractCurriculum(bodyLines);
  const singleCourse =
    curriculum.subjects.length < CURRICULUM_MIN_SUBJECTS
      ? extractSingleCourse(bodyLines, rawText)
      : null;

  if (singleCourse) {
    const label = `${singleCourse.code} — ${singleCourse.name}`;
    const missing = [
      singleCourse.academicYear === null ? "year level" : null,
      singleCourse.semester === null ? "semester" : null,
    ].filter(Boolean);

    warnings.push(
      `This looks like the syllabus for a single course (${label}), not a full curriculum, so CourseForge added just that one subject.` +
        (missing.length > 0
          ? ` The document doesn't state its ${missing.join(" or ")} — set ${missing.length > 1 ? "them" : "it"} below.`
          : "")
    );

    return {
      suggestedTitle: label,
      subjects: [
        {
          name: singleCourse.name,
          code: singleCourse.code,
          academicYear: singleCourse.academicYear ?? 1,
          semester: singleCourse.semester ?? "1st Semester",
          units: singleCourse.units,
          sortOrder: 0,
        },
      ],
      warnings,
    };
  }

  const { subjects, sawYearHeading, sawSemesterHeading } = curriculum;

  if (subjects.length === 0) {
    warnings.push(
      "No subjects could be detected automatically. CourseForge looks for lines that start with a subject code (like \"CS201 Data Structures\") — add your subjects manually below."
    );
    return { suggestedTitle, subjects, warnings };
  }

  if (!sawYearHeading) {
    warnings.push(
      "No academic year headings were detected — every subject was defaulted to Year 1. Please review."
    );
  }
  if (!sawSemesterHeading) {
    warnings.push(
      "No semester headings were detected — every subject was defaulted to 1st Semester. Please review."
    );
  }

  return { suggestedTitle, subjects, warnings };
}
