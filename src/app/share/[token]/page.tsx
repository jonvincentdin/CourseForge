import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import type { Session } from "next-auth";
import type { ModuleProgress } from "@/db/schema";
import { auth } from "@/lib/auth";
import { findExistingCopy, getSharedCourse } from "@/lib/sharing-service";
import { getProgressForCourse } from "@/lib/progress-service";
import { logShareError } from "@/lib/sharing-utils";
import { sanitizeQuestionForClient } from "@/lib/quiz-client-types";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/app/sign-out-button";
import {
  CourseViewer,
  type ViewerModule,
  type ViewerProgress,
} from "@/components/courses/course-viewer";
import { AddToMyCourses } from "@/components/share/add-to-my-courses";
import { StartLearningButton } from "@/components/share/start-learning-button";

const VIEWER_SECTION_ID = "learn";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

type SharedCourseResult = Awaited<ReturnType<typeof getSharedCourse>>;

/**
 * What the page renders from. `status: "error"` is an unexpected
 * failure (database down, a bug) — never an access decision; those are
 * all inside `access`. It deliberately carries nothing: the error was
 * already logged without the token, and the UI must stay generic.
 */
type SharedPageData =
  | { status: "error" }
  | ({
      status: "ok";
      session: Session | null;
      /** This viewer's own progress; null when anonymous or not allowed. */
      progressRows: Record<string, ModuleProgress> | null;
      /** The viewer's existing Course Copy of this course, if any. */
      existingCopyId: string | null;
    } & SharedCourseResult);

/**
 * Every DB read for this page, once per request: generateMetadata and
 * the page share it (React cache dedupes within a render). Never cached
 * across requests — unsharing or removing someone must apply on the
 * next load.
 *
 * Wrapped in try/catch because an uncaught error here would be logged
 * by Next with its message, and Drizzle's query errors embed bound
 * parameters — the share token. logShareError records only the error
 * class and Postgres code. unstable_rethrow lets Next's own control
 * flow (dynamic-rendering bailouts etc.) pass through untouched.
 */
const loadSharedPage = cache(async (token: string): Promise<SharedPageData> => {
  try {
    const session = await auth();
    const result = await getSharedCourse(token, session?.user?.id ?? null);

    let progressRows: Record<string, ModuleProgress> | null = null;
    let existingCopyId: string | null = null;
    if (result.access.status === "allowed" && result.full) {
      const { course, isOwner, viewerUserId } = result.access;
      [progressRows, existingCopyId] = await Promise.all([
        // A signed-in viewer's progress is keyed by their own user id — never the owner's.
        viewerUserId ? getProgressForCourse(course.id, viewerUserId) : Promise.resolve(null),
        viewerUserId && !isOwner ? findExistingCopy(course.id, viewerUserId) : Promise.resolve(null),
      ]);
    }

    return { status: "ok", session, ...result, progressRows, existingCopyId };
  } catch (err) {
    unstable_rethrow(err);
    logShareError("load shared course", err);
    return { status: "error" };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await loadSharedPage(token);
  return {
    // Only an authorised viewer's tab shows the title; noindex keeps it out of search either way.
    title:
      data.status === "ok" && data.access.status === "allowed"
        ? `${data.access.course.title} — Shared course — CourseForge`
        : "Shared course — CourseForge",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function SharedCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ add?: string | string[] }>;
}) {
  const { token } = await params;
  const { add } = await searchParams;
  const data = await loadSharedPage(token);
  const sharePath = `/share/${token}`;
  const callback = `?callbackUrl=${encodeURIComponent(sharePath)}`;

  if (data.status === "error") {
    // Generic on purpose: no error detail, and nothing that hints at
    // whether the link is valid. Retrying is a plain reload of this URL.
    return (
      <AccessState
        icon={<BrokenLinkIcon />}
        title="We couldn’t load this course"
        body={<p>Something went wrong on our end. Please try again in a moment.</p>}
        actions={
          <>
            <Link href={sharePath} className={buttonVariants()}>
              Try again
            </Link>
            <Link href="/" className={buttonVariants({ variant: "secondary" })}>
              Go to CourseForge
            </Link>
          </>
        }
      />
    );
  }

  const { session, access, full, progressRows, existingCopyId } = data;

  if (access.status === "invalid" || (access.status === "allowed" && !full)) {
    return (
      <AccessState
        icon={<BrokenLinkIcon />}
        title="This link isn’t valid"
        body={
          <>
            <p>
              The course owner may have reset or turned off this link, or the course may have
              been deleted.
            </p>
            <p>Ask the person who shared it with you for a new link.</p>
          </>
        }
        actions={
          <Link href={session?.user ? "/dashboard" : "/"} className={buttonVariants()}>
            Go to CourseForge
          </Link>
        }
      />
    );
  }

  if (access.status === "sign_in_required") {
    return (
      <AccessState
        icon={<LockIcon />}
        title="This course is private"
        body={<p>Sign in with an authorized account to continue.</p>}
        actions={
          <>
            <Link href={`/login${callback}`} className={buttonVariants({ className: "w-full sm:w-auto" })}>
              Sign in
            </Link>
            <Link
              href={`/signup${callback}`}
              className={buttonVariants({ variant: "secondary", className: "w-full sm:w-auto" })}
            >
              Create account
            </Link>
          </>
        }
      />
    );
  }

  if (access.status === "forbidden") {
    const email = session?.user?.email;
    return (
      <AccessState
        icon={<LockIcon />}
        title="Access restricted"
        body={
          <>
            <p>You don&apos;t have permission to view this course.</p>
            <p>Ask the course owner to invite you.</p>
            {email && (
              <p className="rounded-md bg-paper px-3 py-2 text-xs text-steel">
                You&apos;re signed in as{" "}
                <span className="font-medium text-ink [overflow-wrap:anywhere]">{email}</span>. If
                they invited a different email, sign out and sign in with that one.
              </p>
            )}
          </>
        }
        actions={
          <>
            <SignOutButton callbackUrl={sharePath} variant="secondary" />
            <Link href="/courses" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Go to My Courses
            </Link>
          </>
        }
      />
    );
  }

  // access.status === "allowed" with a loaded course from here on.
  const { course, isOwner, viewerUserId, ownerDisplayName } = access;
  const modules = full!.modules;
  const quizCount = modules.filter((mod) => mod.quiz.questions.length > 0).length;

  // Only what the viewer renders crosses to the client — and never
  // correctAnswer/explanation, which arrive per question after grading.
  const viewerModules: ViewerModule[] = modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    description: mod.description,
    contentMarkdown: mod.contentMarkdown,
    quizTitle: mod.quiz.title,
    questions: mod.quiz.questions.map(sanitizeQuestionForClient),
  }));

  const initialProgress: Record<string, ViewerProgress> = Object.fromEntries(
    modules.map((mod) => {
      const row = progressRows?.[mod.id];
      return [
        mod.id,
        {
          lessonCompleted: row?.lessonCompleted ?? false,
          quizScore: row?.quizScore ?? null,
          quizTotal: row?.quizTotal ?? null,
        },
      ];
    })
  );

  const meta = [
    course.academicYear ? `Year ${course.academicYear}` : null,
    course.semester,
    plural(modules.length, "Module"),
    `${quizCount} ${quizCount === 1 ? "Quiz" : "Quizzes"}`,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl">
      {isOwner && (
        <div
          role="note"
          className="mb-6 flex flex-col gap-3 rounded-lg border border-ember-soft bg-ember-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-medium text-ink">This is how others see your course</p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {course.visibility === "link"
                ? "Anyone with this link can view it."
                : "Only people you’ve added can view it, after signing in."}{" "}
              Your progress here is your own, as always.
            </p>
          </div>
          <Link
            href={`/courses/${course.id}?share=1`}
            className={buttonVariants({ variant: "secondary", size: "sm", className: "shrink-0 self-start sm:self-auto" })}
          >
            Manage sharing
          </Link>
        </div>
      )}

      <header>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="ember">Shared course</Badge>
          {course.subjectCode && <Badge tone="neutral">{course.subjectCode}</Badge>}
        </div>
        <h1 className="mt-3 font-display text-2xl font-medium leading-tight text-ink [overflow-wrap:anywhere] sm:text-3xl">
          {course.title}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Shared by <span className="font-medium text-ink">{ownerDisplayName}</span>
        </p>
        <p className="mt-1 text-sm text-steel-soft">{meta.join(" · ")}</p>

        {course.description && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {course.description}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-start">
          {modules.length > 0 && <StartLearningButton targetId={VIEWER_SECTION_ID} />}
          {!isOwner && (
            <AddToMyCourses
              token={token}
              signedIn={viewerUserId !== null}
              existingCopyId={existingCopyId}
              autoAdd={add === "1"}
            />
          )}
        </div>
      </header>

      {course.learningObjectives.length > 0 && (
        <div className="mt-6 rounded-lg border border-line bg-paper-raised p-4">
          <p className="text-sm font-medium text-ink">Learning objectives</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {course.learningObjectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
      )}

      <section
        id={VIEWER_SECTION_ID}
        tabIndex={-1}
        aria-label="Course lessons and quizzes"
        className="mt-8 scroll-mt-6 rounded-lg focus:outline-none"
      >
        <CourseViewer
          apiBase={`/api/share/${token}`}
          persistence={viewerUserId ? "saved" : "anonymous"}
          signInHref={`/login${callback}`}
          modules={viewerModules}
          initialProgress={initialProgress}
        />
      </section>
    </div>
  );
}

function AccessState({
  icon,
  title,
  body,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-6 sm:py-12">
      <div className="rounded-lg border border-line bg-paper-raised p-6 sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper text-steel">
          {icon}
        </span>
        <h1 className="mt-4 font-display text-xl font-medium leading-snug text-ink">{title}</h1>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">{body}</div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" strokeLinecap="round" />
    </svg>
  );
}

function BrokenLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <path
        d="M11.3 4.7l.9-.9a3 3 0 0 1 4.2 4.2l-1.8 1.8M8.7 15.3l-.9.9a3 3 0 0 1-4.2-4.2l1.8-1.8M3 3l14 14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
