"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "@/lib/course-library-filter";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/menu";
import { DeleteCourseDialog } from "@/components/courses/delete-course-dialog";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS: { value: LibraryFilters["source"]; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "generated", label: "Generated" },
  { value: "imported", label: "Imported" },
  { value: "shared_copy", label: "Added from shared" },
];

const STATUS_OPTIONS: { value: LibraryFilters["status"]; label: string }[] = [
  { value: "all", label: "Any progress" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const SORT_OPTIONS: { value: LibraryFilters["sort"]; label: string }[] = [
  { value: "recent", label: "Most recent" },
  { value: "title", label: "Title A–Z" },
  { value: "progress", label: "Progress" },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * The searchable, filterable course library. The full list arrives from
 * the server once; search/filter/sort run in the browser (see
 * course-library-filter.ts), and deletes go to the API followed by a
 * router.refresh() so the server stays the source of truth.
 */
export function CourseLibrary({ courses }: { courses: LibraryCourse[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<LibraryCourse | null>(null);
  // Hidden immediately on delete so the card doesn't linger while the refresh is in flight.
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const focusResultsAfterRefresh = useRef(false);
  const ids = { search: useId(), source: useId(), status: useId(), sort: useId(), versions: useId() };

  const available = useMemo(
    () => courses.filter((c) => !removedIds.has(c.id)),
    [courses, removedIds]
  );
  const visible = useMemo(() => filterCourses(available, filters), [available, filters]);
  const totalInScope = useMemo(
    () => available.filter((c) => filters.showAllVersions || c.isLatestVersion).length,
    [available, filters.showAllVersions]
  );
  const olderVersionCount = available.filter((c) => !c.isLatestVersion).length;
  const narrowed = hasActiveFilters(filters);

  // After a delete, the deleted card's menu trigger is gone — park focus
  // on the results summary once the refreshed list arrives instead of
  // dropping it on <body>.
  useEffect(() => {
    if (focusResultsAfterRefresh.current) {
      focusResultsAfterRefresh.current = false;
      resultsRef.current?.focus();
    }
  }, [courses]);

  function update<K extends keyof LibraryFilters>(key: K, value: LibraryFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setAnnouncement(null);
  }

  function clearFilters() {
    setFilters((prev) => ({ ...prev, query: "", source: "all", status: "all" }));
    setAnnouncement(null);
  }

  function handleDeleted(course: LibraryCourse) {
    setRemovedIds((prev) => new Set(prev).add(course.id));
    setAnnouncement(
      course.versionCount > 1
        ? `Deleted version ${course.version} of “${course.title}”.`
        : `Deleted “${course.title}”.`
    );
    focusResultsAfterRefresh.current = true;
    router.refresh();
  }

  const summary = narrowed
    ? `Showing ${visible.length} of ${plural(totalInScope, "course")}`
    : plural(visible.length, "course");

  return (
    <div className="mt-8">
      <form
        role="search"
        aria-label="Filter your courses"
        onSubmit={(e) => e.preventDefault()}
        className="rounded-lg border border-line bg-paper-raised p-4 sm:p-5"
      >
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,11rem)] lg:items-end">
          <div className="min-[420px]:col-span-2 lg:col-span-1">
            <Label htmlFor={ids.search} className="text-xs">
              Search
            </Label>
            <div className="relative mt-1">
              <SearchIcon />
              <Input
                id={ids.search}
                type="search"
                value={filters.query}
                onChange={(e) => update("query", e.target.value)}
                placeholder="Title, subject code, or syllabus"
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={ids.source} className="text-xs">
              Source
            </Label>
            <Select
              id={ids.source}
              wrapperClassName="mt-1"
              value={filters.source}
              onChange={(e) => update("source", e.target.value as LibraryFilters["source"])}
            >
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor={ids.status} className="text-xs">
              Progress
            </Label>
            <Select
              id={ids.status}
              wrapperClassName="mt-1"
              value={filters.status}
              onChange={(e) => update("status", e.target.value as LibraryFilters["status"])}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-[420px]:col-span-2 lg:col-span-1">
            <Label htmlFor={ids.sort} className="text-xs">
              Sort by
            </Label>
            <Select
              id={ids.sort}
              wrapperClassName="mt-1"
              value={filters.sort}
              onChange={(e) => update("sort", e.target.value as LibraryFilters["sort"])}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {olderVersionCount > 0 && (
          <label
            htmlFor={ids.versions}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft"
          >
            <input
              id={ids.versions}
              type="checkbox"
              checked={filters.showAllVersions}
              onChange={(e) => update("showAllVersions", e.target.checked)}
              className="h-4 w-4 accent-ember"
            />
            Show older versions
            <span className="text-xs text-steel-soft">({olderVersionCount})</span>
          </label>
        )}
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p
          ref={resultsRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="text-sm text-ink-soft focus:outline-none"
        >
          {announcement && <span className="text-forge-green">{announcement} </span>}
          {summary}
        </p>
        {narrowed && visible.length > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
          <p className="font-display text-lg font-medium text-ink">
            {filters.query.trim()
              ? `No courses match “${filters.query.trim()}”`
              : "No courses match these filters"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            Try a different search, or clear your filters to see all{" "}
            {plural(totalInScope, "course")} again.
          </p>
          <Button variant="secondary" size="sm" className="mt-5" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <ul role="list" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} onDelete={() => setDeleteTarget(course)} />
            </li>
          ))}
        </ul>
      )}

      {deleteTarget && (
        <DeleteCourseDialog
          course={deleteTarget}
          open
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onDeleted={() => handleDeleted(deleteTarget)}
        />
      )}
    </div>
  );
}

function CourseCard({ course, onDelete }: { course: LibraryCourse; onDelete: () => void }) {
  const titleId = useId();
  const status = progressStatus(course);
  const percent = progressPercent(course);
  const href = `/courses/${course.id}`;

  const meta = [
    course.academicYear ? `Year ${course.academicYear}` : null,
    course.semester,
    plural(course.totalModules, "Module"),
  ].filter(Boolean);

  const actionLabel =
    status === "not_started" ? "Start" : status === "completed" ? "Review" : "Continue";

  const menuItems: ActionMenuItem[] = [
    course.canRegenerate
      ? { label: "Regenerate", href: `${href}/regenerate` }
      : {
          label: "Regenerate",
          disabled: true,
          description: "No linked syllabus subject to rebuild from",
          onSelect: () => {},
        },
    { label: "Export JSON", href: `/api/courses/${course.id}/export`, download: true },
    {
      label: "Export Markdown",
      href: `/api/courses/${course.id}/export?format=markdown`,
      download: true,
    },
    { label: "Delete…", tone: "danger", separatorBefore: true, onSelect: onDelete },
  ];

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "flex h-full flex-col rounded-lg border p-5 transition-colors",
        course.isLatestVersion
          ? "border-line bg-paper-raised hover:border-line-strong"
          : "border-dashed border-line-strong bg-paper"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {(course.subjectCode || course.versionCount > 1) && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {course.subjectCode && <Badge tone="neutral">{course.subjectCode}</Badge>}
              {course.versionCount > 1 && (
                <Badge tone={course.isLatestVersion ? "ember" : "neutral"}>
                  v{course.version} of {course.versionCount}
                </Badge>
              )}
              {!course.isLatestVersion && (
                <span className="text-xs font-medium text-steel">Older version</span>
              )}
            </div>
          )}
          <h2
            id={titleId}
            className="font-display text-lg font-medium leading-snug text-ink [overflow-wrap:anywhere]"
          >
            <Link href={href} className="rounded-sm hover:text-ember">
              {course.title}
            </Link>
          </h2>
        </div>
        <div className="-mr-2 -mt-1 shrink-0">
          <ActionMenu
            label={`Actions for ${course.title}`}
            triggerLabel={`More actions for ${course.title}`}
            items={menuItems}
          />
        </div>
      </div>

      <p className="mt-1.5 text-sm text-ink-soft">
        {courseSourceLabel(course.source, course.syllabusTitle)}
      </p>
      <p className="mt-0.5 text-xs text-steel-soft">{meta.join(" · ")}</p>

      {course.description && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
          {course.description}
        </p>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span
            className={cn(
              "font-medium",
              status === "completed"
                ? "text-forge-green"
                : status === "in_progress"
                  ? "text-ink"
                  : "text-steel-soft"
            )}
          >
            {progressLabel(course)}
          </span>
          {course.totalModules > 0 && (
            <span className="text-steel-soft">
              {course.completedModules} of {course.totalModules} done
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={`Progress in ${course.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className={cn(
            "mt-1.5 h-1.5 overflow-hidden rounded-full",
            course.isLatestVersion ? "bg-paper" : "bg-line"
          )}
        >
          <div className="h-full rounded-full bg-forge-green" style={{ width: `${percent}%` }} />
        </div>

        <Link
          href={href}
          aria-describedby={titleId}
          className={buttonVariants({
            variant: status === "in_progress" ? "primary" : "secondary",
            size: "sm",
            className: "mt-4",
          })}
        >
          {actionLabel}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel-soft"
    >
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.5 13.5L17 17" strokeLinecap="round" />
    </svg>
  );
}
