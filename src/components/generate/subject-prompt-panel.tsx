"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Subject, Syllabus } from "@/db/schema";
import { buildCoursePrompt, type CourseDepth } from "@/lib/prompt-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportCourseForm } from "@/components/generate/import-course-form";
import { EXAMPLE_COURSE_IMPORT } from "@/lib/course-schema";

export function SubjectPromptPanel({
  subject,
  syllabus,
  syllabusId,
  depth,
  includeLearningObjectives,
}: {
  subject: Subject;
  syllabus: Pick<Syllabus, "title" | "extractedText">;
  syllabusId: string;
  depth: CourseDepth;
  includeLearningObjectives: boolean;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const promptId = useId();
  const hintId = useId();

  const prompt = useMemo(
    () =>
      buildCoursePrompt({
        subject,
        syllabus: syllabus as Syllabus,
        depth,
        includeLearningObjectives,
      }),
    [subject, syllabus, depth, includeLearningObjectives]
  );

  // Settings changed after a copy → the copied text is stale; drop the tick.
  useEffect(() => setCopyState("idle"), [prompt]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
      setTimeout(() => setCopyState((s) => (s === "copied" ? "idle" : s)), 2000);
    } catch {
      // Same fallback as the regenerate form: select the text so a manual Ctrl/Cmd+C just works.
      setCopyState("failed");
      promptRef.current?.focus();
      promptRef.current?.select();
    }
  }

  const label = subject.code ? `${subject.code} — ${subject.name}` : subject.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="[overflow-wrap:anywhere]">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label htmlFor={promptId} className="text-sm font-medium text-ink-soft">
            1. Copy this prompt into any AI
          </label>
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copyState === "copied" ? "Copied!" : "Copy prompt"}
          </Button>
        </div>
        <textarea
          ref={promptRef}
          id={promptId}
          readOnly
          value={prompt}
          rows={10}
          aria-describedby={hintId}
          className="mt-2 w-full resize-y rounded-md border border-line bg-paper p-3 font-mono text-xs text-ink-soft focus-visible:border-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
        />
        <p id={hintId} aria-live="polite" className="mt-1 min-h-4 text-xs text-steel-soft">
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
            syllabusId={syllabusId}
            subjectLabel=""
            exampleJson={JSON.stringify(EXAMPLE_COURSE_IMPORT, null, 2)}
            hideHeader
          />
        </div>
      </CardContent>
    </Card>
  );
}
