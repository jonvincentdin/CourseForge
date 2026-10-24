import type { LibraryCourse } from "@/lib/course-service";

/*
  Pure, client-safe helpers for the /courses library: progress status,
  display labels, and the search/filter/sort pipeline. No DB imports —
  the library is fetched once on the server and filtered in the browser,
  which is instant at a student's course count and keeps this unit-testable.
*/

export type ProgressStatus = "not_started" | "in_progress" | "completed";

type ProgressFields = Pick<LibraryCourse, "totalModules" | "completedModules">;

export function progressStatus(c: ProgressFields): ProgressStatus {
  if (c.totalModules <= 0 || c.completedModules <= 0) return "not_started";
  if (c.completedModules >= c.totalModules) return "completed";
  return "in_progress";
}

export function progressPercent(c: ProgressFields): number {
  if (c.totalModules <= 0) return 0;
  return Math.min(100, Math.round((c.completedModules / c.totalModules) * 100));
}

/** "Not started" / "N% Complete" / "Completed" — the same wording everywhere a course's progress shows. */
export function progressLabel(c: ProgressFields): string {
  const status = progressStatus(c);
  if (status === "not_started") return "Not started";
  if (status === "completed") return "Completed";
  return `${progressPercent(c)}% Complete`;
}

/**
 * Provenance line shared by the library cards and the course page header.
 * `originalCreatorName` is the display-name snapshot taken when a shared
 * course was added (never an email).
 */
export function courseSourceLabel(
  source: LibraryCourse["source"],
  syllabusTitle: string | null,
  originalCreatorName?: string | null
): string {
  switch (source) {
    case "generated":
      return syllabusTitle ? `Generated from ${syllabusTitle}` : "Generated";
    case "imported":
      return "Imported from JSON";
    case "shared_copy":
      return originalCreatorName?.trim()
        ? `Added from a shared course · by ${originalCreatorName.trim()}`
        : "Added from a shared course";
  }
}

export interface LibraryFilters {
  /** Matches title, subjectCode, description, syllabusTitle, originalCreatorName (case-insensitive). */
  query: string;
  source: "all" | LibraryCourse["source"];
  status: "all" | ProgressStatus;
  sort: "recent" | "title" | "progress";
  /** false → only the latest version in each version group. */
  showAllVersions: boolean;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  query: "",
  source: "all",
  status: "all",
  sort: "recent",
  showAllVersions: false,
};

/** True when anything that narrows the result set differs from the defaults (sort doesn't narrow). */
export function hasActiveFilters(f: LibraryFilters): boolean {
  return f.query.trim() !== "" || f.source !== "all" || f.status !== "all";
}

function byRecent(a: LibraryCourse, b: LibraryCourse): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

const titleCollator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

const SORTERS: Record<LibraryFilters["sort"], (a: LibraryCourse, b: LibraryCourse) => number> = {
  recent: byRecent,
  title: (a, b) => titleCollator.compare(a.title, b.title) || b.version - a.version,
  // Furthest along first; ties (e.g. all the not-started ones) fall back to newest.
  progress: (a, b) => progressPercent(b) - progressPercent(a) || byRecent(a, b),
};

/**
 * Applies the library toolbar to a course list. The query is split on
 * whitespace and every term must appear somewhere in the searchable
 * fields, so "cs101 arrays" narrows instead of matching nothing.
 * Returns a new array; the input is never mutated.
 */
export function filterCourses(courses: LibraryCourse[], f: LibraryFilters): LibraryCourse[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const result = courses.filter((course) => {
    if (!f.showAllVersions && !course.isLatestVersion) return false;
    if (f.source !== "all" && course.source !== f.source) return false;
    if (f.status !== "all" && progressStatus(course) !== f.status) return false;

    if (terms.length > 0) {
      const haystack = [
        course.title,
        course.subjectCode,
        course.description,
        course.syllabusTitle,
        course.originalCreatorName,
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return false;
    }

    return true;
  });

  return result.sort(SORTERS[f.sort]);
}
