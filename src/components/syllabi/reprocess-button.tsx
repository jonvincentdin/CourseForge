"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

export function ReprocessButton({
  syllabusId,
  syllabusTitle,
}: {
  syllabusId: string;
  syllabusTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next && error) {
      // A failed reprocess marks the syllabus "failed" server-side —
      // refresh once the student has read why, so the page shows it.
      setError(null);
      router.refresh();
    }
  }

  async function handleConfirm() {
    setPending(true);
    setError(null);

    const response = await fetch(`/api/syllabi/${syllabusId}/reprocess`, {
      method: "POST",
    }).catch(() => null);
    setPending(false);

    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(
        body?.error ??
          (response
            ? "Couldn't reprocess this syllabus. Please try again."
            : "Couldn't reach CourseForge — check your connection and try again.")
      );
      return;
    }

    setOpen(false);
    router.push(`/syllabi/${syllabusId}/review`);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        Reprocess
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={`Reprocess “${syllabusTitle}”?`}
        description={
          <>
            <p>
              CourseForge re-reads the original PDF and replaces every subject on this syllabus
              with what it detects now. <strong className="font-medium text-ink">Any manual
              edits — renamed, added, or removed subjects — are discarded.</strong>
            </p>
            <p>
              Your courses aren&apos;t deleted. Each one is re-linked to the new subject with the
              same subject code; a course whose code isn&apos;t found again keeps working but
              can&apos;t be regenerated until that subject exists.
            </p>
          </>
        }
        confirmLabel="Reprocess syllabus"
        pendingLabel="Reprocessing…"
        confirmVariant="danger"
        pending={pending}
        onConfirm={handleConfirm}
        error={error}
      />
    </>
  );
}
