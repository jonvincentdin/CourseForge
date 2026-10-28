"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Rendered under the title and wired up as the dialog's aria-describedby. */
  description?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * While true, every way of dismissing (Escape, backdrop, the × button)
   * is ignored, so an in-flight request can't be orphaned by a stray click.
   */
  busy?: boolean;
  /** Element to focus when the dialog opens. Defaults to the browser's choice (first focusable). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Shows a × close button in the header. */
  showCloseButton?: boolean;
  /** Width/extra classes for the <dialog> element — defaults to max-w-md. */
  className?: string;
}

/**
 * Modal dialog built on the native <dialog> element. showModal() gives
 * us the focus trap, inert background, Escape handling, and focus
 * restoration to the opener for free — no portal or focus-trap library.
 *
 * The parent owns `open`; every way of dismissing goes through
 * `onOpenChange(false)`.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  busy = false,
  initialFocusRef,
  showCloseButton = false,
  className,
}: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  function requestClose() {
    if (!busy) onOpenChange(false);
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
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy || undefined}
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
        "m-auto w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-line bg-paper-raised p-0 text-ink shadow-lg",
        "backdrop:bg-ink/40",
        className
      )}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <h2
            id={titleId}
            className="min-w-0 flex-1 font-display text-lg font-medium leading-snug text-ink [overflow-wrap:anywhere]"
          >
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              disabled={busy}
              className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-steel transition-colors hover:bg-paper hover:text-ink disabled:opacity-60 sm:h-9 sm:w-9"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-4 w-4"
              >
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        {description && (
          <div id={descriptionId} className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">
            {description}
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}

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
 * Confirmation dialog on top of Dialog. Dismissal is ignored while
 * `pending`, and it opens with focus on Cancel — destructive
 * confirmations start on the safe choice.
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
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  function requestClose() {
    if (!pending) onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      busy={pending}
      initialFocusRef={cancelRef}
    >
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
    </Dialog>
  );
}
