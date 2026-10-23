"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  /** Shown on the confirm button while `pending` — defaults to "Working…". */
  pendingLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
  /** Inline failure message, announced via role="alert". */
  error?: string | null;
}

/**
 * Confirmation dialog built on the native <dialog> element. showModal()
 * gives us the focus trap, inert background, Escape handling, and focus
 * restoration to the opener for free — no portal or focus-trap library.
 *
 * The parent owns `open`; every way of dismissing (Escape, backdrop,
 * Cancel) goes through `onOpenChange(false)` and is ignored while
 * `pending`, so an in-flight request can't be orphaned by a stray click.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working…",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  pending = false,
  onConfirm,
  error,
}: ConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Destructive confirmations start on the safe choice.
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function requestClose() {
    if (!pending) onOpenChange(false);
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDialogElement>) {
    // Clicks on the ::backdrop are dispatched to the <dialog> itself;
    // the rect check rules out clicks on the dialog's own padding/border.
    const dialog = dialogRef.current;
    if (!dialog || event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) requestClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={pending || undefined}
      onCancel={(event) => {
        // Escape: keep the element in sync with React state instead of
        // letting the browser close it behind our back.
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      onClick={handleBackdropClick}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-paper-raised p-0 text-ink shadow-lg",
        "backdrop:bg-ink/40"
      )}
    >
      <div className="p-6">
        <h2 id={titleId} className="font-display text-lg font-medium leading-snug text-ink">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">
          {description}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-danger-soft bg-danger-soft/40 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            ref={cancelRef}
            type="button"
            variant="secondary"
            onClick={requestClose}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
