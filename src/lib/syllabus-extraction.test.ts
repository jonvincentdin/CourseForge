import { describe, expect, it } from "vitest";
import { extractSyllabusStructure, normalizeSubjectCode } from "./syllabus-extraction";

const CURRICULUM = `BS Computer Science Curriculum
First Year
1st Semester
CS101 Introduction to Computing
MATH 101 - College Algebra
2nd Semester
CS-102: Computer Programming 1
Second Year
First Semester
CS201 Data Structures
Prerequisite: CS101 Introduction to Computing
Summer
CS299 Practicum`;

// Shape of a real single-course outline (CIT-U CSIT121): labelled header
// fields, then pages of prose that must never become subjects.
const COURSE_OUTLINE = `CEBU INSTITUTE OF TECHNOLOGY – UNIVERSITY
COLLEGE OF COMPUTER STUDIES
Course Number : CSIT121 Descriptive Title : Fundamentals of Programming
Number of Units/ Credits: 3.0 Number of Hours : 36 hours lecture and 54 hours laboratory
Pre-requisite : None Co-requisite : None
Course Description:
This is an introductory course that provides comprehensive introduction to the C language.
write flexible and user-friendly programs.
VISION STATEMENT
Guide learners to become industry-preferred and life ready professionals
Ethical and values-driven IO1 Act in accordance with moral and ethical principles personally
ILO10. Compare the different ways to output
ILO11. Construct sequential programs using printf()`;

describe("extractSyllabusStructure — curriculum", () => {
  const result = extractSyllabusStructure(CURRICULUM);

  it("only takes lines that start with a subject code", () => {
    expect(result.subjects.map((s) => s.code)).toEqual([
      "CS101",
      "MATH101",
      "CS-102",
      "CS201",
      "CS299",
    ]);
  });

  it("assigns year and semester from the headings", () => {
    const byCode = Object.fromEntries(result.subjects.map((s) => [s.code, s]));
    expect(byCode["CS101"]).toMatchObject({ academicYear: 1, semester: "1st Semester" });
    expect(byCode["CS-102"]).toMatchObject({ academicYear: 1, semester: "2nd Semester", name: "Computer Programming 1" });
    expect(byCode["CS201"]).toMatchObject({ academicYear: 2, semester: "1st Semester" });
    expect(byCode["CS299"]).toMatchObject({ academicYear: 2, semester: "Summer" });
  });

  it("doesn't add a subject twice when its code is mentioned again", () => {
    expect(result.subjects.filter((s) => s.code === "CS101")).toHaveLength(1);
  });

  it("uses the first line as the title and has no warnings", () => {
    expect(result.suggestedTitle).toBe("BS Computer Science Curriculum");
    expect(result.warnings).toEqual([]);
  });
});

describe("extractSyllabusStructure — single-course syllabus", () => {
  const result = extractSyllabusStructure(COURSE_OUTLINE);

  it("produces exactly one subject from the labelled header", () => {
    expect(result.subjects).toEqual([
      {
        name: "Fundamentals of Programming",
        code: "CSIT121",
        academicYear: 1,
        semester: "1st Semester",
        units: "3.0",
        sortOrder: 0,
      },
    ]);
  });

  it("titles the syllabus after the course, not the university", () => {
    expect(result.suggestedTitle).toBe("CSIT121 — Fundamentals of Programming");
  });

  it("explains that year and semester weren't stated", () => {
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/single course/);
    expect(result.warnings[0]).toMatch(/year level or semester/);
  });

  it("picks up a stated year level and semester", () => {
    const stated = extractSyllabusStructure(
      `Course Code: IT 211\nCourse Title: Web Development\n2nd Year — Second Semester\nUnits: 3`
    );
    expect(stated.subjects[0]).toMatchObject({
      code: "IT211",
      name: "Web Development",
      academicYear: 2,
      semester: "2nd Semester",
      units: "3",
    });
    expect(stated.warnings[0]).not.toMatch(/doesn't state/);
  });
});

describe("extractSyllabusStructure — nothing recognisable", () => {
  it("returns no subjects and says what it looks for", () => {
    const result = extractSyllabusStructure(
      "Some Document\nThis is just a paragraph of prose.\nAnother sentence about learning."
    );
    expect(result.subjects).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/subject code/);
  });
});

describe("normalizeSubjectCode", () => {
  it("ignores case, spaces and hyphens", () => {
    expect(normalizeSubjectCode("cs 201")).toBe("CS201");
    expect(normalizeSubjectCode("CS-201")).toBe("CS201");
    expect(normalizeSubjectCode("IT - 201A")).toBe("IT201A");
  });
});
