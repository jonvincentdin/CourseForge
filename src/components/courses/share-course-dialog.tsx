"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { ShareSettings, ShareVisibility } from "@/lib/sharing-service";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const VISIBILITY_OPTIONS: { value: ShareVisibility; label: string; description: string }[] = [
  {
    value: "link",
    label: "Anyone with the link",
    description: "Anyone with the link can view it.",
  },
  {
    value: "private",
    label: "Private",
    description: "Only people you add can view it.",
  },
];

type Result = { ok: true; settings: ShareSettings } | { ok: false; error: string };

const NETWORK_ERROR = "Couldn't reach CourseForge — check your connection and try again.";

async function shareRequest(url: string, init?: RequestInit): Promise<Result> {
  const response = await fetch(url, init).catch(() => null);
  if (!response) return { ok: false, error: NETWORK_ERROR };
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    return {
      ok: false,
      error:
        body?.error ??
        (response.status === 404
          ? "This course couldn't be found. It may have been deleted."
          : "Something went wrong. Please try again."),
    };
  }
  return { ok: true, settings: body as ShareSettings };
}

/**
 * The owner's share dialog. Every control saves immediately through the
 * owner-only /api/courses/[id]/share endpoints (there's no separate Save
 * step), and every outcome is announced through one polite live region.
 * `onChanged` fires on close if anything was saved, so the caller can
 * refresh server-rendered share indicators.
 */
export function ShareCourseDialog({
  course,
  open,
  onOpenChange,
  onChanged,
}: {
  course: { id: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  const base = `/api/courses/${course.id}/share`;

  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [pendingVisibility, setPendingVisibility] = useState<ShareVisibility | null>(null);
  const [linkPending, setLinkPending] = useState<"create" | "reset" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{
    section: "visibility" | "link" | "people";
    message: string;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [status, setStatus] = useState<{ text: string; key: number } | null>(null);
  const [origin, setOrigin] = useState("");

  const changed = useRef(false);
  // Bumped on every open: a response that lands after the dialog was
  // reopened (possibly for another course) is dropped, not applied.
  const openSeq = useRef(0);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const resetCancelRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ids = {
    visibility: useId(),
    link: useId(),
    linkHint: useId(),
    people: useId(),
    email: useId(),
    emailError: useId(),
    reset: useId(),
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  // (Re)load the current settings each time the dialog opens, so it
  // never shows a stale list from an earlier open or another tab.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    openSeq.current += 1;

    // Start from a clean slate: the library reuses one dialog for every
    // card, and acting on another course's settings must be impossible.
    setSettings(null);
    setLoading(true);
    setLoadError(null);
    setActionError(null);
    setAddError(null);
    setConfirmReset(false);
    setCopied(false);
    setCopyFallback(false);
    setStatus(null);

    shareRequest(base, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      if (result.ok) setSettings(result.settings);
      else setLoadError(result.error);
    });

    return () => controller.abort();
  }, [open, base, loadAttempt]);

  // The reset confirmation takes focus so keyboard users land on the safe choice.
  useEffect(() => {
    if (confirmReset) resetCancelRef.current?.focus();
  }, [confirmReset]);

  async function send(url: string, init?: RequestInit): Promise<Result | null> {
    const seq = openSeq.current;
    const result = await shareRequest(url, init);
    return seq === openSeq.current ? result : null;
  }

  function announce(text: string) {
    setStatus({ text, key: Date.now() });
  }

  function applySettings(next: ShareSettings, message: string) {
    setSettings(next);
    changed.current = true;
    announce(message);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next && changed.current) {
      changed.current = false;
      onChanged?.();
    }
  }

  async function changeVisibility(visibility: ShareVisibility) {
    if (!settings || visibility === settings.visibility || pendingVisibility) return;
    setPendingVisibility(visibility);
    setActionError(null);

    const result = await send(base, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    setPendingVisibility(null);
    if (!result) return;

    if (result.ok) {
      applySettings(
        result.settings,
        visibility === "link"
          ? "Saved. Anyone with the link can now view this course."
          : "Saved. Only people you add can view this course."
      );
    } else {
      setActionError({ section: "visibility", message: result.error });
    }
  }

  // Tokens are created lazily — saving the current visibility mints one.
  async function createLink() {
    if (!settings) return;
    setLinkPending("create");
    setActionError(null);
    const result = await send(base, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: settings.visibility }),
    });
    setLinkPending(null);
    if (!result) return;
    if (result.ok) {
      applySettings(result.settings, "Link created.");
      requestAnimationFrame(() => copyButtonRef.current?.focus());
    } else {
      setActionError({ section: "link", message: result.error });
    }
  }

  async function resetLink() {
    setLinkPending("reset");
    setActionError(null);
    const result = await send(`${base}/reset-link`, { method: "POST" });
    setLinkPending(null);
    if (!result) return;
    if (result.ok) {
      setConfirmReset(false);
      setCopied(false);
      setCopyFallback(false);
      applySettings(result.settings, "Link reset. The old link no longer works.");
      requestAnimationFrame(() => copyButtonRef.current?.focus());
    } else {
      setActionError({ section: "link", message: result.error });
    }
  }

  function cancelReset() {
    setConfirmReset(false);
    requestAnimationFrame(() => resetButtonRef.current?.focus());
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFallback(false);
      setCopied(true);
      announce("Link copied.");
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable (insecure context, permissions) —
      // select the text so a single keyboard shortcut finishes the job.
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
      setCopyFallback(true);
      announce("Link selected. Press Ctrl+C, or ⌘C on a Mac, to copy it.");
    }
  }

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value || !emailInputRef.current?.checkValidity()) {
      setAddError("Enter a valid email address, like name@example.com.");
      emailInputRef.current?.focus();
      return;
    }

    setAddPending(true);
    setAddError(null);
    const result = await send(`${base}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
    });
    setAddPending(false);
    if (!result) return;

    if (result.ok) {
      setEmail("");
      applySettings(result.settings, `Added ${value.toLowerCase()} as a viewer.`);
      emailInputRef.current?.focus();
    } else {
      setAddError(result.error);
      emailInputRef.current?.focus();
    }
  }

  async function removePerson(personEmail: string) {
    setRemoving(personEmail);
    setActionError(null);
    const result = await send(
      `${base}/people?email=${encodeURIComponent(personEmail)}`,
      { method: "DELETE" }
    );
    setRemoving(null);
    if (!result) return;

    if (result.ok) {
      applySettings(result.settings, `Removed ${personEmail}. They no longer have access.`);
      // The row (and its button) is gone — keep focus inside the dialog.
      emailInputRef.current?.focus();
    } else {
      setActionError({ section: "people", message: result.error });
    }
  }

  const visibility = pendingVisibility ?? settings?.visibility ?? "private";
  const shareUrl = settings?.shareToken
    ? `${origin}/share/${settings.shareToken}`
    : null;
  const busyLink = linkPending !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Share “${course.title}”`}
      description="Choose who can open this course. Changes save as you make them."
      showCloseButton
      className="max-w-lg"
    >
      {loading && !settings ? (
        <div className="mt-6 space-y-3" aria-hidden="true">
          <div className="h-16 animate-pulse rounded-md bg-paper" />
          <div className="h-16 animate-pulse rounded-md bg-paper" />
          <div className="h-10 animate-pulse rounded-md bg-paper" />
        </div>
      ) : loadError && !settings ? (
        <div className="mt-6">
          <p
            role="alert"
            className="rounded-md border border-danger-soft bg-danger-soft/40 px-3 py-2 text-sm text-danger"
          >
            {loadError}
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setLoadAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : settings ? (
        <>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-ink">Who can view</legend>
            <div className="mt-2 grid gap-2">
              {VISIBILITY_OPTIONS.map((option) => {
                const checked = visibility === option.value;
                const isPending = pendingVisibility === option.value;
                const optionId = `${ids.visibility}-${option.value}`;
                return (
                  <label
                    key={option.value}
                    htmlFor={optionId}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-3 transition-colors",
                      "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember",
                      checked
                        ? "border-ink bg-paper"
                        : "border-line-strong hover:border-steel",
                      pendingVisibility && "cursor-progress"
                    )}
                  >
                    <input
                      id={optionId}
                      type="radio"
                      name={ids.visibility}
                      value={option.value}
                      checked={checked}
                      // Not `disabled` while saving: disabling the focused radio
                      // would drop keyboard focus. changeVisibility ignores repeats.
                      aria-disabled={pendingVisibility !== null || undefined}
                      onChange={() => changeVisibility(option.value)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-ember focus-visible:outline-none"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        {option.value === "link" ? <LinkIcon /> : <LockIcon />}
                        {option.label}
                        {isPending && (
                          <span className="text-xs font-normal text-steel-soft">Saving…</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-soft">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {actionError?.section === "visibility" && <InlineError message={actionError.message} />}

          <section aria-labelledby={ids.link} className="mt-6 border-t border-line pt-5">
            <h3 id={ids.link} className="text-sm font-medium text-ink">
              Course link
            </h3>

            {shareUrl ? (
              <>
                <div className="mt-2 flex flex-col gap-2 min-[420px]:flex-row">
                  <Input
                    ref={linkInputRef}
                    readOnly
                    value={shareUrl}
                    aria-label="Share link"
                    aria-describedby={ids.linkHint}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 font-mono text-xs text-ink-soft"
                  />
                  <Button
                    ref={copyButtonRef}
                    type="button"
                    variant={copied ? "secondary" : "primary"}
                    onClick={() => copyLink(shareUrl)}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckIcon />
                        Copied
                      </>
                    ) : (
                      "Copy link"
                    )}
                  </Button>
                </div>
                <p id={ids.linkHint} className="mt-2 text-xs leading-relaxed text-steel-soft">
                  {copyFallback
                    ? "The link is selected — press Ctrl+C (⌘C on a Mac) to copy it."
                    : visibility === "link"
                      ? "Anyone with this link can read the lessons and take the quizzes — no account needed."
                      : "Only the people below can open this link, after signing in with their email."}
                </p>

                {confirmReset ? (
                  <div
                    role="group"
                    aria-labelledby={ids.reset}
                    className="mt-3 rounded-md border border-danger-soft bg-danger-soft/30 p-3.5"
                  >
                    <p id={ids.reset} className="text-sm font-medium text-ink">
                      Reset this link?
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      The current link will stop working. You&apos;ll need to send the new link
                      to anyone who should still have it.
                    </p>
                    <div className="mt-3 flex flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end">
                      <Button
                        ref={resetCancelRef}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={cancelReset}
                        disabled={busyLink}
                      >
                        Keep current link
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={resetLink}
                        disabled={busyLink}
                      >
                        {linkPending === "reset" ? "Resetting…" : "Reset link"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    ref={resetButtonRef}
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="mt-2 rounded-sm text-sm font-medium text-ink-soft underline-offset-2 hover:text-danger hover:underline"
                  >
                    Reset link
                  </button>
                )}
              </>
            ) : (
              <div className="mt-2 rounded-md border border-dashed border-line-strong px-4 py-3.5">
                <p className="text-sm text-ink-soft">
                  This course doesn&apos;t have a link yet. Create one to share it.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={createLink}
                  disabled={busyLink}
                >
                  {linkPending === "create" ? "Creating…" : "Create link"}
                </Button>
              </div>
            )}
            {actionError?.section === "link" && <InlineError message={actionError.message} />}
          </section>

          <section aria-labelledby={ids.people} className="mt-6 border-t border-line pt-5">
            <h3 id={ids.people} className="text-sm font-medium text-ink">
              People with access
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-steel-soft">
              {visibility === "link"
                ? "The link is open to anyone right now, so this list doesn't limit access. Switch to Private to allow only these people."
                : "Each person signs in with the email you add here."}{" "}
              CourseForge doesn&apos;t send emails — copy the link and share it with them yourself.
            </p>

            {settings.people.length > 0 ? (
              <ul role="list" className="mt-3 divide-y divide-line rounded-md border border-line">
                {settings.people.map((person) => (
                  <li key={person.email} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink [overflow-wrap:anywhere]">
                        {person.email}
                      </span>
                      <span className="block text-xs text-steel-soft">Viewer</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${person.email}`}
                      onClick={() => removePerson(person.email)}
                      disabled={removing !== null}
                      className="shrink-0 text-danger hover:bg-danger-soft/50 hover:text-danger"
                    >
                      {removing === person.email ? "Removing…" : "Remove"}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-md bg-paper px-3.5 py-3 text-sm text-ink-soft">
                No one has been added yet.
              </p>
            )}
            {actionError?.section === "people" && <InlineError message={actionError.message} />}

            <form onSubmit={addPerson} noValidate className="mt-4">
              <Label htmlFor={ids.email}>Add a person by email</Label>
              <div className="mt-1.5 flex flex-col gap-2 min-[420px]:flex-row">
                <Input
                  ref={emailInputRef}
                  id={ids.email}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="classmate@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  aria-invalid={addError ? true : undefined}
                  aria-describedby={addError ? ids.emailError : undefined}
                  className="min-w-0"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={addPending}
                  className="shrink-0"
                >
                  {addPending ? "Adding…" : "Add"}
                </Button>
              </div>
              {addError && (
                <p id={ids.emailError} role="alert" className="mt-1.5 text-sm text-danger">
                  {addError}
                </p>
              )}
            </form>
          </section>

          <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            {/* One polite live region for every async outcome in the dialog. */}
            <p
              role="status"
              aria-live="polite"
              className="min-h-5 text-sm text-forge-green sm:min-w-0 sm:flex-1"
            >
              {status && <span key={status.key}>{status.text}</span>}
            </p>
            <Button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Done
            </Button>
          </div>
        </>
      ) : null}
    </Dialog>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-3 rounded-md border border-danger-soft bg-danger-soft/40 px-3 py-2 text-sm text-danger"
    >
      {message}
    </p>
  );
}

function LinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4 text-steel"
    >
      <path
        d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4 text-steel"
    >
      <rect x="4.5" y="9" width="11" height="8" rx="1.5" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" strokeLinecap="round" />
    </svg>
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
