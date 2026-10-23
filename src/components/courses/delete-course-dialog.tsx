"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/dialog";

/**
 * Delete confirmation for one course version. Shared by the library
 * cards and the course page header; the caller decides what happens
 * after a successful delete (refresh the list vs. navigate away).
 */
export function DeleteCourseDialog({
  course,
  open,
  onOpenChange,
  onDeleted,
}: {
  course: { id: string; title: string; version: number; versionCount: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otherVersions = course.versionCount - 1;

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const response = await fetch(`/api/courses/${course.id}`, { method: "DELETE" }).catch(
      () => null
    );
    setPending(false);

    // 404 means it's already gone (e.g. deleted in another tab) — the
    // outcome the student asked for, so treat it as success.
    if (response && (response.ok || response.status === 404)) {
      onOpenChange(false);
      onDeleted();
      return;
    }

    const body = await response?.json().catch(() => null);
    setError(
      body?.error ??
        (response
          ? "Couldn't delete this course. Please try again."
          : "Couldn't reach CourseForge — check your connection and try again.")
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        course.versionCount > 1
          ? `Delete version ${course.version} of “${course.title}”?`
          : `Delete “${course.title}”?`
      }
      description={
        <>
          <p>
            This permanently removes{" "}
            {course.versionCount > 1 ? `version ${course.version}` : "this course"} — its
            lessons, quizzes, and your progress in it. This can&apos;t be undone.
          </p>
          <p>
            {otherVersions > 0
              ? `Only this version is removed. Your ${otherVersions} other ${
                  otherVersions === 1 ? "version stays" : "versions stay"
                } in your library.`
              : "Only this course is removed — your syllabi and other courses aren't affected."}
          </p>
        </>
      }
      confirmLabel={course.versionCount > 1 ? "Delete this version" : "Delete course"}
      pendingLabel="Deleting…"
      confirmVariant="danger"
      pending={pending}
      onConfirm={handleConfirm}
      error={error}
    />
  );
}
