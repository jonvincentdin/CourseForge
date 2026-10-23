import { describe, expect, it } from "vitest";
import type { LibraryCourse } from "@/lib/course-service";
import {
  DEFAULT_LIBRARY_FILTERS,
  courseSourceLabel,
  filterCourses,
  hasActiveFilters,
  progressLabel,
  progressPercent,
  progressStatus,
  type LibraryFilters,
} from "./course-library-filter";

function course(overrides: Partial<LibraryCourse> & { id: string }): LibraryCourse {
  return {
    title: "Untitled",
    subjectCode: null,
    academicYear: 1,
    semester: "1st Semester",
    description: null,
    source: "generated",
    version: 1,
    versionGroupId: overrides.id,
    versionCount: 1,
    isLatestVersion: true,
    syllabusId: null,
    syllabusTitle: null,
    canRegenerate: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    totalModules: 4,
    completedModules: 0,
    ...overrides,
  };
}

const filters = (overrides: Partial<LibraryFilters> = {}): LibraryFilters => ({
  ...DEFAULT_LIBRARY_FILTERS,
  ...overrides,
});

const ids = (list: LibraryCourse[]) => list.map((c) => c.id);

describe("progressStatus / progressPercent / progressLabel", () => {
  it("treats zero completed modules as not started", () => {
    expect(progressStatus({ totalModules: 5, completedModules: 0 })).toBe("not_started");
    expect(progressLabel({ totalModules: 5, completedModules: 0 })).toBe("Not started");
  });

  it("treats a course with no modules as not started rather than complete", () => {
    expect(progressStatus({ totalModules: 0, completedModules: 0 })).toBe("not_started");
    expect(progressPercent({ totalModules: 0, completedModules: 0 })).toBe(0);
  });

  it("reports partial progress as in progress with a rounded percent", () => {
    expect(progressStatus({ totalModules: 3, completedModules: 1 })).toBe("in_progress");
    expect(progressPercent({ totalModules: 3, completedModules: 1 })).toBe(33);
    expect(progressLabel({ totalModules: 3, completedModules: 2 })).toBe("67% Complete");
  });

  it("reports all modules done as completed", () => {
    expect(progressStatus({ totalModules: 4, completedModules: 4 })).toBe("completed");
    expect(progressLabel({ totalModules: 4, completedModules: 4 })).toBe("Completed");
  });
});

describe("courseSourceLabel", () => {
  it("names the syllabus for generated courses when it's still linked", () => {
    expect(courseSourceLabel("generated", "BSCS 2024")).toBe("Generated from BSCS 2024");
    expect(courseSourceLabel("generated", null)).toBe("Generated");
  });

  it("uses fixed wording for imported and shared copies", () => {
    expect(courseSourceLabel("imported", "BSCS 2024")).toBe("Imported from JSON");
    expect(courseSourceLabel("shared_copy", null)).toBe("Added from a shared course");
  });
});

describe("filterCourses", () => {
  const library: LibraryCourse[] = [
    course({
      id: "a",
      title: "Data Structures",
      subjectCode: "CS201",
      description: "Arrays, linked lists, and trees.",
      syllabusTitle: "BS Computer Science 2024",
      createdAt: "2026-03-01T00:00:00.000Z",
      completedModules: 2,
    }),
    course({
      id: "b",
      title: "calculus I",
      subjectCode: "MATH101",
      source: "imported",
      createdAt: "2026-02-01T00:00:00.000Z",
      completedModules: 4,
    }),
    course({
      id: "c",
      title: "Philippine History",
      source: "shared_copy",
      createdAt: "2026-04-01T00:00:00.000Z",
    }),
    // Two versions of the same course; only v2 is the latest.
    course({
      id: "d1",
      title: "Algorithms",
      versionGroupId: "d1",
      version: 1,
      versionCount: 2,
      isLatestVersion: false,
      createdAt: "2026-01-10T00:00:00.000Z",
      completedModules: 4,
    }),
    course({
      id: "d2",
      title: "Algorithms",
      versionGroupId: "d1",
      version: 2,
      versionCount: 2,
      isLatestVersion: true,
      createdAt: "2026-05-01T00:00:00.000Z",
    }),
  ];

  it("hides older versions by default and sorts newest first", () => {
    expect(ids(filterCourses(library, filters()))).toEqual(["d2", "c", "a", "b"]);
  });

  it("includes older versions when showAllVersions is on", () => {
    expect(ids(filterCourses(library, filters({ showAllVersions: true })))).toEqual([
      "d2",
      "c",
      "a",
      "b",
      "d1",
    ]);
  });

  it("searches title, code, description, and syllabus title case-insensitively", () => {
    expect(ids(filterCourses(library, filters({ query: "data" })))).toEqual(["a"]);
    expect(ids(filterCourses(library, filters({ query: "math101" })))).toEqual(["b"]);
    expect(ids(filterCourses(library, filters({ query: "LINKED LISTS" })))).toEqual(["a"]);
    expect(ids(filterCourses(library, filters({ query: "computer science" })))).toEqual(["a"]);
  });

  it("requires every search term to match somewhere", () => {
    expect(ids(filterCourses(library, filters({ query: "cs201 trees" })))).toEqual(["a"]);
    expect(filterCourses(library, filters({ query: "cs201 calculus" }))).toEqual([]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(ids(filterCourses(library, filters({ query: "   " })))).toHaveLength(4);
  });

  it("filters by source", () => {
    expect(ids(filterCourses(library, filters({ source: "imported" })))).toEqual(["b"]);
    expect(ids(filterCourses(library, filters({ source: "shared_copy" })))).toEqual(["c"]);
  });

  it("filters by progress status", () => {
    expect(ids(filterCourses(library, filters({ status: "completed" })))).toEqual(["b"]);
    expect(ids(filterCourses(library, filters({ status: "in_progress" })))).toEqual(["a"]);
    expect(ids(filterCourses(library, filters({ status: "not_started" })))).toEqual(["d2", "c"]);
  });

  it("combines filters with the version toggle", () => {
    expect(
      ids(filterCourses(library, filters({ status: "completed", showAllVersions: true })))
    ).toEqual(["b", "d1"]);
  });

  it("sorts by title A–Z ignoring case", () => {
    expect(ids(filterCourses(library, filters({ sort: "title" })))).toEqual(["d2", "b", "a", "c"]);
  });

  it("sorts by progress, furthest along first, newest breaking ties", () => {
    expect(ids(filterCourses(library, filters({ sort: "progress" })))).toEqual([
      "b",
      "a",
      "d2",
      "c",
    ]);
  });

  it("does not mutate the input array", () => {
    const copy = [...library];
    filterCourses(library, filters({ sort: "title" }));
    expect(library).toEqual(copy);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the defaults and for sort-only changes", () => {
    expect(hasActiveFilters(filters())).toBe(false);
    expect(hasActiveFilters(filters({ sort: "title" }))).toBe(false);
  });

  it("is true when a search, source, or status filter narrows results", () => {
    expect(hasActiveFilters(filters({ query: "x" }))).toBe(true);
    expect(hasActiveFilters(filters({ source: "generated" }))).toBe(true);
    expect(hasActiveFilters(filters({ status: "completed" }))).toBe(true);
  });
});
