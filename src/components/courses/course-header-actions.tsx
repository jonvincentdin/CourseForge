"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { ActionMenu } from "@/components/ui/menu";
import { DeleteCourseDialog } from "@/components/courses/delete-course-dialog";
import { ShareCourseDialog } from "@/components/courses/share-course-dialog";

/** Share / Regenerate / Export / Delete for the course page header. */
export function CourseHeaderActions({
  course,
  canRegenerate,
  openShareOnLoad = false,
}: {
  course: { id: string; title: string; version: number; versionCount: number };
  canRegenerate: boolean;
  /** Opens the share dialog on mount — the shared view's "Manage sharing" link lands here with ?share=1. */
  openShareOnLoad?: boolean;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const noteId = useId();

  useEffect(() => {
    if (!openShareOnLoad) return;
    setShareOpen(true);
    // Drop ?share=1 so a reload or Back doesn't pop the dialog again.
    router.replace(`/courses/${course.id}`, { scroll: false });
  }, [openShareOnLoad, course.id, router]);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShareOpen(true)}
          aria-haspopup="dialog"
        >
          <ShareIcon />
          Share
        </Button>

        {canRegenerate ? (
          <Link
            href={`/courses/${course.id}/regenerate`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <RefreshIcon />
            Regenerate
          </Link>
        ) : (
          // aria-disabled rather than disabled: it stays focusable, so
          // keyboard and screen-reader users still reach the reason.
          <button
            type="button"
            aria-disabled="true"
            aria-describedby={noteId}
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "cursor-not-allowed opacity-60 hover:border-line-strong hover:bg-transparent",
            })}
          >
            <RefreshIcon />
            Regenerate
          </button>
        )}

        <ActionMenu
          label="Export formats"
          items={[
            {
              label: "JSON",
              description: "Re-importable into CourseForge",
              href: `/api/courses/${course.id}/export`,
              download: true,
            },
            {
              label: "Markdown",
              description: "A readable study document",
              href: `/api/courses/${course.id}/export?format=markdown`,
              download: true,
            },
          ]}
          trigger={
            <>
              Export
              <ChevronIcon />
            </>
          }
          triggerClassName={buttonVariants({ variant: "secondary", size: "sm" })}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="text-danger hover:bg-danger-soft/50 hover:text-danger"
        >
          Delete
        </Button>
      </div>

      {!canRegenerate && (
        <p id={noteId} className="max-w-xs text-xs text-steel-soft sm:text-right">
          Can&apos;t regenerate — this course isn&apos;t linked to a syllabus subject it could be rebuilt from.
        </p>
      )}

      <ShareCourseDialog
        course={course}
        open={shareOpen}
        onOpenChange={setShareOpen}
        onChanged={() => router.refresh()}
      />

      <DeleteCourseDialog
        course={course}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          router.push("/courses");
          router.refresh();
        }}
      />
    </div>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
    >
      <path
        d="M15.5 8A6 6 0 0 0 4.7 6.2M4.5 12a6 6 0 0 0 10.8 1.8M4.5 3.5v3h3M15.5 16.5v-3h-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
    >
      <path
        d="M10 12.5V3.5M6.5 7L10 3.5 13.5 7M5 10.5v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
    >
      <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
