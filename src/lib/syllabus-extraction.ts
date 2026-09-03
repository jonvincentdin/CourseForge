/**
 * Best-effort, regex-based extraction of a title, and per-subject
 * year/semester/code/name from raw syllabus text. This is intentionally
 * NOT an AI-powered extraction (that's out of scope for Milestone 2 —
 * see .context/AI_GENERATION.md, which only covers course generation).
 *
 * Every result of this parser is provisional. The review step in the
 * UI is not optional — the brief is explicit that uncertain extraction
 * must never be silently invented as fact (product brief §20).
 */

export interface ExtractedSubject {
  name: string;
  code: string | null;
  academicYear: number;
  semester: "1st Semester" | "2nd Semester" | "Summer";
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

const SEMESTER_FIRST = /\b(?:1st|first)\s+semester\b/i;
const SEMESTER_SECOND = /\b(?:2nd|second)\s+semester\b/i;
const SEMESTER_SUMMER = /\bsummer\s*(?:term|semester)?\b/i;

// e.g. "CS201", "CS 201", "CS-201", "IT201A"
const SUBJECT_CODE = /^([A-Z]{2,6}\s?-?\s?\d{2,4}[A-Z]?)\s*[-–:]?\s+(.+)$/;

const NOISE_LINE =
  /^(page\s+\d+|table of contents|curriculum|prospectus|syllabus)\.?$/i;

function detectYear(line: string): number | null {
  for (const pattern of YEAR_PATTERNS) {
    const match = line.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

function detectSemester(
  line: string
): "1st Semester" | "2nd Semester" | "Summer" | null {
  if (SEMESTER_FIRST.test(line)) return "1st Semester";
  if (SEMESTER_SECOND.test(line)) return "2nd Semester";
  if (SEMESTER_SUMMER.test(line)) return "Summer";
  return null;
}

function looksLikeSubjectLine(line: string): boolean {
  if (line.length < 3 || line.length > 140) return false;
  if (NOISE_LINE.test(line)) return false;
  if (/^\d+$/.test(line)) return false;
  // A line that's ALL digits/punctuation isn't a subject name.
  if (!/[a-zA-Z]{3,}/.test(line)) return false;
  return true;
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

  let currentYear = 1;
  let currentSemester: "1st Semester" | "2nd Semester" | "Summer" =
    "1st Semester";
  let sawYearHeading = false;
  let sawSemesterHeading = false;

  const subjects: ExtractedSubject[] = [];

  lines.forEach((line, index) => {
    if (index === titleLineIndex) return;

    const detectedYear = detectYear(line);
    if (detectedYear !== null) {
      currentYear = detectedYear;
      sawYearHeading = true;
      return;
    }

    const detectedSemester = detectSemester(line);
    if (detectedSemester !== null) {
      currentSemester = detectedSemester;
      sawSemesterHeading = true;
      return;
    }

    if (!looksLikeSubjectLine(line)) return;

    const codeMatch = line.match(SUBJECT_CODE);
    const name = codeMatch ? codeMatch[2].trim() : line;
    const code = codeMatch ? codeMatch[1].replace(/\s+/g, "") : null;

    subjects.push({
      name,
      code,
      academicYear: currentYear,
      semester: currentSemester,
      sortOrder: subjects.length,
    });
  });

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
  if (subjects.length === 0) {
    warnings.push(
      "No subjects could be detected automatically. Add them manually below."
    );
  }

  return { suggestedTitle, subjects, warnings };
}
