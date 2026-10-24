"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type AddState =
  | { kind: "idle" }
  | { kind: "adding" }
  | { kind: "added"; courseId: string }
  | { kind: "exists"; courseId: string; message?: string }
  | { kind: "error"; message: string };

/** Where the anonymous sign-in prompt sends people — back here, with the add queued. */
export function addAfterAuthPath(token: string): string {
  return `/share/${token}?add=1`;
}

/**
 * "Add to My Courses" on the shared course page (brief §53–§56, §61, §70).
 *
 * - Signed out: opens a dialog offering Sign in / Create account, both
 *   carrying callbackUrl=/share/{token}?add=1 so the student comes
 *   straight back and the add completes on its own.
 * - `autoAdd` (that ?add=1 landing, signed in): runs the add once, then
 *   drops the param with router.replace so a reload doesn't repeat it.
 * - Already has a Course Copy (server-side check, or a 409 race):
 *   "✓ In My Courses" + Open course instead of creating a duplicate.
 */
export function AddToMyCourses({
  token,
  signedIn,
  existingCopyId,
  autoAdd = false,
}: {
  token: string;
  signedIn: boolean;
  existingCopyId: string | null;
  autoAdd?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<AddState>(() =>
    existingCopyId ? { kind: "exists", courseId: existingCopyId } : { kind: "idle" }
  );
  const [signInOpen, setSignInOpen] = useState(false);
  const autoAddStarted = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const signInRef = useRef<HTMLAnchorElement>(null);

  const callback = encodeURIComponent(addAfterAuthPath(token));
  const loginHref = `/login?callbackUrl=${callback}`;
  const signupHref = `/signup?callbackUrl=${callback}`;

  // A server refresh can reveal a copy made in another tab.
  useEffect(() => {
    if (existingCopyId) {
      setState((prev) =>
        prev.kind === "idle" || prev.kind === "error"
          ? { kind: "exists", courseId: existingCopyId }
          : prev
      );
    }
  }, [existingCopyId]);

  async function add() {
    if (!signedIn) {
      setSignInOpen(true);
      return;
    }

    setState({ kind: "adding" });
    const response = await fetch(`/api/share/${token}/copy`, { method: "POST" }).catch(
      () => null
    );
    const body = await response?.json().catch(() => null);

    if (response?.ok && body?.course?.id) {
      setState({ kind: "added", courseId: body.course.id });
    } else if (response?.status === 409 && body?.existingCourseId) {
      setState({
        kind: "exists",
        courseId: body.existingCourseId,
        message: body.error ?? "This course is already in My Courses.",
      });
    } else if (response?.status === 401) {
      // Session ended since the page loaded — same path as a signed-out click.
      setState({ kind: "idle" });
      setSignInOpen(true);
      return;
    } else {
      setState({
        kind: "error",
        message:
          body?.error ??
          (response
            ? "Couldn't add this course. Please try again."
            : "Couldn't reach CourseForge — check your connection and try again."),
      });
      return;
    }

    // The button that had focus is gone; move focus to the outcome so
    // keyboard and screen-reader users land on the next actions.
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  useEffect(() => {
    if (!autoAdd || autoAddStarted.current) return;
    autoAddStarted.current = true;

    const finish = () => router.replace(`/share/${token}`, { scroll: false });
    if (!signedIn || existingCopyId) {
      finish();
      return;
    }
    add().finally(finish);
    // Runs once per landing; `add` closes over the initial props by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdd]);

  return (
    <div>
      {/* Polite live region: announces Adding… / Added / already-added outcomes. */}
      <div role="status" aria-live="polite" className="sr-only">
        {state.kind === "adding" && "Adding this course to My Courses…"}
        {state.kind === "added" && "Added to My Courses."}
        {state.kind === "exists" && state.message}
      </div>

      {state.kind === "added" ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="rounded-lg border border-forge-green/30 bg-forge-green-soft/60 p-4 focus:outline-none"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-forge-green">
            <CheckIcon />
            Added to My Courses
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            This course is now available in your CourseForge library.
          </p>
          <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
            <Link href="/courses" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Go to My Courses
            </Link>
            <Link
              href={`/courses/${state.courseId}`}
              className={buttonVariants({ size: "sm" })}
            >
              Continue learning
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      ) : state.kind === "exists" ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          className="flex flex-col gap-2 focus:outline-none min-[420px]:flex-row min-[420px]:items-center"
        >
          <span className="inline-flex h-10 items-center gap-2 rounded-md bg-forge-green-soft px-3.5 text-sm font-medium text-forge-green">
            <CheckIcon />
            In My Courses
          </span>
          <Link
            href={`/courses/${state.courseId}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Open course
          </Link>
          {state.message && (
            <span className="text-sm text-ink-soft min-[420px]:ml-1">{state.message}</span>
          )}
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={add}
            disabled={state.kind === "adding"}
            aria-haspopup={signedIn ? undefined : "dialog"}
            className="w-full min-[420px]:w-auto"
          >
            {state.kind === "adding" ? (
              "Adding…"
            ) : (
              <>
                <PlusIcon />
                Add to My Courses
              </>
            )}
          </Button>
          {state.kind === "error" && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {state.message}
            </p>
          )}
        </>
      )}

      <Dialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        title="Sign in to save this course"
        description="Create an account or sign in to add this course to your CourseForge library. You'll come right back here, and we'll add it for you."
        initialFocusRef={signInRef}
        showCloseButton
      >
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href={signupHref}
            className={buttonVariants({ variant: "secondary", className: "w-full sm:w-auto" })}
          >
            Create account
          </Link>
          <Link
            ref={signInRef}
            href={loginHref}
            className={buttonVariants({ className: "w-full sm:w-auto" })}
          >
            Sign in
          </Link>
        </div>
      </Dialog>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
    >
      <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
    </svg>
  );
}
