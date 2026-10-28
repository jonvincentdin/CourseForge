import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listSharedWithMe, type SharedWithMeCourse } from "@/lib/sharing-service";
import {
  progressLabel,
  progressPercent,
  progressStatus,
} from "@/lib/course-library-filter";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LocalDate } from "@/components/courses/local-date";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shared with me — CourseForge",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Private courses other students have shared with this account's email.
 * Each card opens the course through its share link, so every visit goes
 * back through the share-access check — removal applies immediately.
 */
export default async function SharedWithMePage() {
  const session = await auth();
  const courses = await listSharedWithMe(session!.user.id);
  const email = session!.user.email;

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">Shared with me</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Private courses other students have shared with you. Your progress in them is your own.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
          <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper-raised text-steel">
            <PeopleIcon />
          </span>
          <p className="mt-4 font-display text-lg font-medium text-ink">
            Nothing shared with you yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-soft">
            When someone shares a private course with{" "}
            {email ? (
              <span className="font-medium text-ink [overflow-wrap:anywhere]">{email}</span>
            ) : (
              "your email"
            )}
            , it shows up here. Courses shared with &ldquo;Anyone with the link&rdquo; open straight
            from the link instead.
          </p>
          <Link
            href="/courses"
            className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-5" })}
          >
            Go to My Courses
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">{plural(courses.length, "course")}</p>
          <ul role="list" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <li key={course.shareToken}>
                <SharedCourseCard course={course} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SharedCourseCard({ course }: { course: SharedWithMeCourse }) {
  const titleId = `shared-${course.shareToken}`;
  const href = `/share/${course.shareToken}`;
  const status = progressStatus(course);
  const percent = progressPercent(course);

  const meta = [
    course.academicYear ? `Year ${course.academicYear}` : null,
    course.semester,
    plural(course.totalModules, "Module"),
  ].filter(Boolean);

  return (
    <article
      aria-labelledby={titleId}
      className="flex h-full flex-col rounded-lg border border-line bg-paper-raised p-5 transition-colors hover:border-line-strong"
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {course.subjectCode && <Badge tone="neutral">{course.subjectCode}</Badge>}
        <Badge tone="ember">Shared course</Badge>
      </div>
      <h2
        id={titleId}
        className="font-display text-lg font-medium leading-snug text-ink [overflow-wrap:anywhere]"
      >
        <Link href={href} className="rounded-sm hover:text-ember-ink">
          {course.title}
        </Link>
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Shared by <span className="font-medium text-ink">{course.ownerDisplayName}</span>
      </p>
      <p className="mt-0.5 text-xs text-steel-soft">
        {meta.join(" · ")} · Shared <LocalDate iso={course.sharedAt} />
      </p>

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
          aria-label={`Your progress in ${course.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper"
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
          Open
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function PeopleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <circle cx="8" cy="7" r="2.75" />
      <path
        d="M3 16a5 5 0 0 1 10 0M13.5 4.5a2.75 2.75 0 0 1 0 5M15 12.2A5 5 0 0 1 17.5 16"
        strokeLinecap="round"
      />
    </svg>
  );
}
