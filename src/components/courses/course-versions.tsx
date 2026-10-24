import Link from "next/link";
import type { CourseVersionSummary } from "@/lib/course-service";
import { courseSourceLabel } from "@/lib/course-library-filter";
import { LocalDate } from "@/components/courses/local-date";

/**
 * "N versions" disclosure on the course page. Native <details> gives
 * keyboard + screen-reader disclosure semantics without any client JS.
 * Versions arrive highest-first from getCourseVersions.
 */
export function CourseVersions({
  versions,
  currentId,
}: {
  versions: CourseVersionSummary[];
  currentId: string;
}) {
  if (versions.length <= 1) return null;

  return (
    <details className="group mt-4 rounded-lg border border-line bg-paper-raised">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-ink">
          {versions.length} versions of this course
        </span>
        <span className="flex items-center gap-1 text-xs text-steel-soft">
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="h-4 w-4 transition-transform group-open:rotate-180"
          >
            <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <ol className="divide-y divide-line overflow-hidden rounded-b-lg border-t border-line">
        {versions.map((v) => {
          const isCurrent = v.id === currentId;
          const body = (
            <>
              <span
                className={`w-9 shrink-0 font-mono text-xs ${isCurrent ? "text-ember" : "text-steel"}`}
              >
                v{v.version}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate ${isCurrent ? "font-medium text-ink" : "text-ink"}`}>
                  {v.title}
                </span>
                <span className="block text-xs text-steel-soft">
                  {courseSourceLabel(v.source, null)} · <LocalDate iso={v.createdAt} />
                </span>
              </span>
            </>
          );

          return (
            <li key={v.id}>
              {isCurrent ? (
                <div aria-current="page" className="flex items-center gap-3 bg-paper px-4 py-2.5 text-sm">
                  {body}
                  <span className="shrink-0 text-xs font-medium text-ember">Viewing</span>
                </div>
              ) : (
                <Link
                  href={`/courses/${v.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-paper focus-visible:-outline-offset-2"
                >
                  {body}
                  <span aria-hidden="true" className="shrink-0 text-steel-soft">
                    →
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
