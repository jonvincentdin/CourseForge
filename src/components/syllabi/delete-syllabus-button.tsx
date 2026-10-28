"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function DeleteSyllabusButton({
  syllabusId,
  syllabusTitle,
  redirectTo,
}: {
  syllabusId: string;
  syllabusTitle: string;
  /**
   * Where to go after deleting. The detail page passes "/syllabi" — its
   * own URL no longer exists. Omitted on the list, which just refreshes.
   */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) setError(null);
    setOpen(next);
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const response = await fetch(`/api/syllabi/${syllabusId}`, { method: "DELETE" }).catch(
      () => null
    );
    setPending(false);

    // 404: already gone (another tab) — what the student asked for.
    if (response && (response.ok || response.status === 404)) {
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
      return;
    }

    setError(
      response
        ? "Couldn't delete this syllabus. Please try again."
        : "Couldn't reach CourseForge — check your connection and try again."
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-danger hover:bg-danger-soft hover:text-danger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Delete ${syllabusTitle}`}
      >
        Delete
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={`Delete “${syllabusTitle}”?`}
        description={
          <>
            <p>
              Its subjects and the original PDF are permanently removed. This can&apos;t be
              undone.
            </p>
            <p>
              Courses you generated from it stay in My Courses, but they can&apos;t be regenerated
              once their syllabus is gone.
            </p>
          </>
        }
        confirmLabel="Delete syllabus"
        pendingLabel="Deleting…"
        confirmVariant="danger"
        pending={pending}
        onConfirm={handleConfirm}
        error={error}
      />
    </>
  );
}
