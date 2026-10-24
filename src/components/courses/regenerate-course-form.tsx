"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Subject, Syllabus } from "@/db/schema";
import {
  buildCoursePrompt,
  courseFocusSchema,
  type CourseDepth,
  type CourseFocus,
} from "@/lib/prompt-generator";
import { EXAMPLE_COURSE_IMPORT } from "@/lib/course-schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportCourseForm } from "@/components/generate/import-course-form";
import {
  GenerationProgress,
  useGenerationStages,
} from "@/components/generate/generation-progress";
import { cn } from "@/lib/utils";

const DEPTH_OPTIONS: { value: CourseDepth; label: string }[] = [
  { value: "concise", label: "Concise" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
];

const FOCUS_OPTIONS: { value: CourseFocus["kind"]; label: string; hint: string }[] = [
  {
    value: "full",
    label: "Full syllabus",
    hint: "Cover the whole subject, like the original course.",
  },
  {
    value: "topics",
    label: "Specific topics",
    hint: "Concentrate the course on the topics you name.",
  },
  {
    value: "exam",
    label: "Exam preparation",
    hint: "Concise review lessons, key definitions, common pitfalls, and more practice questions.",
  },
];

// Mirrors the server's courseFocusSchema limit; the schema is still the
// source of truth for validity (see `focusIsValid` below).
const MAX_TOPICS_CHARS = 500;

type GenerationState = "idle" | "generating" | "done" | "error";

/**
 * Regeneration settings (brief §42) plus both ways of producing the new
 * version: Direct AI (POST /api/courses/[id]/regenerate) or the external
 * prompt + JSON paste, which goes through ImportCourseForm with
 * `regenerateFromCourseId`. Either way the old version is never touched —
 * the server inserts a new course row in the same version group.
 */
export function RegenerateCourseForm({
  course,
  nextVersion,
  subject,
  syllabus,
  hasAiConfig,
  aiProviderName,
}: {
  course: { id: string; title: string; version: number; hasLearningObjectives: boolean };
  nextVersion: number;
  subject: Subject;
  syllabus: Pick<Syllabus, "id" | "title" | "extractedText">;
  hasAiConfig: boolean;
  aiProviderName?: string;
}) {
  const [depth, setDepth] = useState<CourseDepth>("standard");
  const [focusKind, setFocusKind] = useState<CourseFocus["kind"]>("full");
  const [topics, setTopics] = useState("");
  const [includeLearningObjectives, setIncludeLearningObjectives] = useState(
    course.hasLearningObjectives
  );
  const [method, setMethod] = useState<"direct" | "external">(
    hasAiConfig ? "direct" : "external"
  );

  const [state, setState] = useState<GenerationState>("idle");
  const { stageIndex, start, finish } = useGenerationStages();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [created, setCreated] = useState<{ id: string; version: number } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const resultRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const ids = {
    topics: useId(),
    topicsCount: useId(),
    objectives: useId(),
    prompt: useId(),
  };

  const focus: CourseFocus = useMemo(
    () =>
      focusKind === "topics"
        ? { kind: "topics", topics: topics.trim() }
        : { kind: focusKind },
    [focusKind, topics]
  );
  const focusIsValid = courseFocusSchema.safeParse(focus).success;

  const prompt = useMemo(
    () =>
      focusIsValid
        ? buildCoursePrompt({
            subject,
            syllabus: syllabus as Syllabus,
            depth,
            includeLearningObjectives,
            focus,
          })
        : null,
    [focusIsValid, subject, syllabus, depth, includeLearningObjectives, focus]
  );

  // Settings changed after a copy → the copied text is stale; drop the "Copied!" tick.
  useEffect(() => setCopyState("idle"), [prompt]);

  useEffect(() => {
    if (state === "done") resultRef.current?.focus();
  }, [state]);

  const isGenerating = state === "generating";
  const isLocked = isGenerating || state === "done";
  const subjectLabel = subject.code ? `${subject.code} — ${subject.name}` : subject.name;
  const fromOlderVersion = course.version !== nextVersion - 1;

  async function handleGenerate() {
    if (!focusIsValid) return;
    setState("generating");
    setError(null);
    setValidationErrors([]);
    start();

    const response = await fetch(`/api/courses/${course.id}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depth, includeLearningObjectives, focus }),
    }).catch(() => null);

    finish();
    const body = await response?.json().catch(() => null);

    if (!response?.ok) {
      setState("error");
      setError(
        body?.error ??
          (response
            ? "Generation failed."
            : "Couldn't reach CourseForge — check your connection and try again.")
      );
      setValidationErrors(body?.errors ?? []);
      return;
    }

    setCreated({ id: body.course.id, version: body.course.version ?? nextVersion });
    setState("done");
  }

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
      setTimeout(() => setCopyState((s) => (s === "copied" ? "idle" : s)), 2000);
    } catch {
      // No alert(): select the text so a manual Ctrl/Cmd+C just works.
      setCopyState("failed");
      promptRef.current?.focus();
      promptRef.current?.select();
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-medium text-ink [overflow-wrap:anywhere]">
        Regenerate {course.title}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Rebuild this course from its syllabus with different settings.
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-md border border-forge-green/30 bg-forge-green-soft/50 px-4 py-3 text-sm text-ink">
        <ShieldIcon />
        <p>
          {fromOlderVersion ? (
            <>
              Version {course.version} stays in your library — this creates{" "}
              <strong className="font-medium">v{nextVersion}</strong>, which becomes the newest
              version.
            </>
          ) : (
            <>
              Your current version (v{course.version}) stays in your library — this creates{" "}
              <strong className="font-medium">v{nextVersion}</strong>.
            </>
          )}
        </p>
      </div>

      <fieldset disabled={isLocked} className="mt-8 min-w-0">
        <legend className="sr-only">Regeneration settings</legend>
        <div className="divide-y divide-line rounded-lg border border-line bg-paper-raised">
          <dl className="px-5 py-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-steel-soft">Source</dt>
            <dd className="mt-1 text-sm text-ink [overflow-wrap:anywhere]">
              {syllabus.title} <span className="text-steel-soft">·</span> {subjectLabel}
            </dd>
          </dl>

          <fieldset className="px-5 py-4">
            <legend className="float-left w-full text-sm font-medium text-ink">Course depth</legend>
            <div className="clear-left flex flex-wrap gap-2 pt-2">
              {DEPTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={depth === option.value}
                  onClick={() => setDepth(option.value)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    depth === option.value
                      ? "border-ink bg-ink text-paper-raised"
                      : "border-line-strong text-ink-soft hover:border-ink"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="px-5 py-4">
            <legend className="float-left w-full text-sm font-medium text-ink">Focus</legend>
            <div className="clear-left space-y-3 pt-2">
              {FOCUS_OPTIONS.map((option) => (
                <div key={option.value}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="regenerate-focus"
                      value={option.value}
                      checked={focusKind === option.value}
                      onChange={() => setFocusKind(option.value)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-ember"
                    />
                    <span>
                      <span className="block text-sm text-ink">{option.label}</span>
                      <span className="block text-xs text-steel-soft">{option.hint}</span>
                    </span>
                  </label>

                  {option.value === "topics" && focusKind === "topics" && (
                    <div className="mt-3 pl-7">
                      <label htmlFor={ids.topics} className="text-sm font-medium text-ink-soft">
                        Topics to focus on
                      </label>
                      <textarea
                        id={ids.topics}
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        maxLength={MAX_TOPICS_CHARS}
                        rows={3}
                        aria-describedby={ids.topicsCount}
                        aria-invalid={topics.length > 0 && !focusIsValid ? true : undefined}
                        placeholder="e.g. recursion, binary search trees, and Big-O analysis"
                        className="mt-1 w-full rounded-md border border-line-strong bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-steel-soft focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:opacity-60"
                      />
                      <p
                        id={ids.topicsCount}
                        className="mt-1 flex justify-between gap-3 text-xs text-steel-soft"
                      >
                        <span>
                          {topics.trim().length === 0
                            ? "Required — list the topics you want this version to cover."
                            : "Separate topics with commas or new lines."}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {topics.length}/{MAX_TOPICS_CHARS}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </fieldset>

          <div className="px-5 py-4">
            <p className="text-sm font-medium text-ink">Include</p>
            <label htmlFor={ids.objectives} className="mt-2 flex cursor-pointer items-start gap-3">
              <input
                id={ids.objectives}
                type="checkbox"
                checked={includeLearningObjectives}
                onChange={(e) => setIncludeLearningObjectives(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-ember"
              />
              <span>
                <span className="block text-sm text-ink">Learning objectives</span>
                <span className="block text-xs text-steel-soft">
                  Modules, Markdown lessons, and quizzes are always included.
                </span>
              </span>
            </label>
          </div>

          <fieldset className="px-5 py-4">
            <legend className="float-left w-full text-sm font-medium text-ink">
              Generation method
            </legend>
            <div className="clear-left space-y-3 pt-2">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <label
                  className={cn(
                    "flex items-start gap-3",
                    hasAiConfig ? "cursor-pointer" : "cursor-not-allowed"
                  )}
                >
                  <input
                    type="radio"
                    name="regenerate-method"
                    value="direct"
                    checked={method === "direct"}
                    onChange={() => setMethod("direct")}
                    disabled={!hasAiConfig}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-ember"
                  />
                  <span>
                    <span
                      className={cn(
                        "block text-sm",
                        hasAiConfig ? "text-ink" : "text-steel-soft"
                      )}
                    >
                      Direct AI generation
                    </span>
                    <span className="block text-xs text-steel-soft">
                      {hasAiConfig
                        ? `CourseForge asks ${aiProviderName ?? "your connected provider"} and saves the result for you.`
                        : "Needs an AI provider connected in Settings."}
                    </span>
                  </span>
                </label>
                {hasAiConfig ? (
                  <span className="rounded-full border border-forge-green/40 bg-forge-green-soft px-2 py-0.5 text-xs text-forge-green">
                    Ready
                  </span>
                ) : (
                  <Link
                    href="/settings"
                    className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
                  >
                    Connect a provider in Settings
                  </Link>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="regenerate-method"
                  value="external"
                  checked={method === "external"}
                  onChange={() => setMethod("external")}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ember"
                />
                <span>
                  <span className="block text-sm text-ink">External AI prompt + JSON</span>
                  <span className="block text-xs text-steel-soft">
                    Copy a prompt into any AI, then paste back the JSON it returns.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>
      </fieldset>

      <div className="mt-8">
        {method === "direct" ? (
          <Card>
            <CardHeader>
              <CardTitle>Generate version {nextVersion}</CardTitle>
              {state === "idle" && (
                <CardDescription>
                  Usually takes under a minute. Your current version stays exactly as it is.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {state === "idle" && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleGenerate} disabled={!focusIsValid}>
                    Generate new version
                  </Button>
                  {!focusIsValid && (
                    <p className="text-sm text-steel-soft">
                      Add at least one topic to focus on first.
                    </p>
                  )}
                </div>
              )}

              {isGenerating && (
                <GenerationProgress
                  stageIndex={stageIndex}
                  note="This usually takes under a minute — keep this tab open. Your current version isn't affected."
                />
              )}

              {state === "done" && created && (
                <div ref={resultRef} tabIndex={-1} role="status" className="focus:outline-none">
                  <p className="text-sm font-medium text-forge-green">
                    Version {created.version} ready.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link href={`/courses/${created.id}`} className={buttonVariants({ size: "sm" })}>
                      Start learning →
                    </Link>
                    <Link
                      href="/courses"
                      className="text-sm font-medium text-ink-soft hover:text-ink"
                    >
                      Back to My Courses
                    </Link>
                  </div>
                </div>
              )}

              {state === "error" && (
                <div role="alert">
                  <p className="text-sm text-danger">{error}</p>
                  {validationErrors.length > 0 && (
                    <ul className="mt-2 space-y-1 rounded-md border border-danger-soft bg-danger-soft/40 px-4 py-3">
                      {validationErrors.map((e) => (
                        <li key={e} className="text-sm text-danger">
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    onClick={handleGenerate}
                    disabled={!focusIsValid}
                  >
                    Try again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create version {nextVersion} with any AI</CardTitle>
            </CardHeader>
            <CardContent>
              {prompt ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={ids.prompt} className="text-sm font-medium text-ink-soft">
                      1. Copy this prompt into any AI
                    </label>
                    <Button size="sm" variant="secondary" onClick={handleCopy}>
                      {copyState === "copied" ? "Copied!" : "Copy prompt"}
                    </Button>
                  </div>
                  <textarea
                    ref={promptRef}
                    id={ids.prompt}
                    readOnly
                    value={prompt}
                    rows={10}
                    className="mt-2 w-full resize-y rounded-md border border-line bg-paper p-3 font-mono text-xs text-ink-soft focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                  />
                  <p aria-live="polite" className="mt-1 min-h-4 text-xs text-steel-soft">
                    {copyState === "failed"
                      ? "Couldn't copy automatically — the prompt is selected, so press Ctrl+C (⌘C on Mac) to copy it."
                      : copyState === "copied"
                        ? "Prompt copied to your clipboard."
                        : ""}
                  </p>

                  <p className="mt-5 text-sm font-medium text-ink-soft">
                    2. Paste the JSON it returns back here
                  </p>
                  <div className="mt-2">
                    <ImportCourseForm
                      subjectId={subject.id}
                      syllabusId={syllabus.id}
                      subjectLabel=""
                      exampleJson={JSON.stringify(EXAMPLE_COURSE_IMPORT, null, 2)}
                      regenerateFromCourseId={course.id}
                      hideHeader
                    />
                  </div>
                </>
              ) : (
                <p className="text-sm text-steel-soft">
                  Add at least one topic to focus on, and the prompt will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="mt-0.5 h-4 w-4 shrink-0 text-forge-green"
    >
      <path d="M10 2.5l6 2.5v4.5c0 3.8-2.6 6.6-6 8-3.4-1.4-6-4.2-6-8V5l6-2.5z" strokeLinejoin="round" />
      <path d="M7.5 10l1.8 1.8L12.8 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
