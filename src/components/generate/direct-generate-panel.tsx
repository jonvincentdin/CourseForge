"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Subject } from "@/db/schema";
import type { CourseDepth } from "@/lib/prompt-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = [
  "Reading syllabus",
  "Understanding subject",
  "Designing modules",
  "Writing lessons",
  "Creating quizzes",
  "Validating course",
];

// This is a client-side simulated progression, not per-stage signals
// from the server — a single AI call happens in one request/response,
// so there's no real mid-flight progress to report. See
// .context/AI_GENERATION.md for why this tradeoff was made instead of
// building a streaming/SSE pipeline for a once-per-course action.
const STAGE_INTERVAL_MS = 1600;

type GenerationState = "idle" | "generating" | "done" | "error";

export function DirectGeneratePanel({
  subject,
  syllabusId,
  depth,
  includeLearningObjectives,
}: {
  subject: Subject;
  syllabusId: string;
  depth: CourseDepth;
  includeLearningObjectives: boolean;
}) {
  const [state, setState] = useState<GenerationState>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleGenerate() {
    setState("generating");
    setStageIndex(0);
    setError(null);
    setValidationErrors([]);

    timerRef.current = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 2));
    }, STAGE_INTERVAL_MS);

    const response = await fetch("/api/courses/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: subject.id,
        syllabusId,
        depth,
        includeLearningObjectives,
      }),
    });

    if (timerRef.current) clearInterval(timerRef.current);
    setStageIndex(STAGES.length - 1);

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setState("error");
      setError(body?.error ?? "Generation failed.");
      setValidationErrors(body?.errors ?? []);
      return;
    }

    setState("done");
    setCourseId(body.course.id);
  }

  const label = subject.code ? `${subject.code} — ${subject.name}` : subject.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {state === "idle" && (
          <Button onClick={handleGenerate}>Generate course</Button>
        )}

        {state === "generating" && (
          <ul className="space-y-1.5">
            {STAGES.map((stage, index) => (
              <li key={stage} className="flex items-center gap-2 text-sm">
                <span className="w-4 shrink-0 text-center">
                  {index < stageIndex ? "✓" : index === stageIndex ? "→" : "○"}
                </span>
                <span className={index <= stageIndex ? "text-ink" : "text-steel-soft"}>
                  {stage}
                </span>
              </li>
            ))}
          </ul>
        )}

        {state === "done" && courseId && (
          <div>
            <p className="text-sm font-medium text-forge-green">Course ready.</p>
            <Link
              href={`/courses/${courseId}`}
              className="mt-1 inline-block text-sm font-medium text-ink hover:text-ember"
            >
              Start learning →
            </Link>
          </div>
        )}

        {state === "error" && (
          <div>
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
            <Button className="mt-3" size="sm" variant="secondary" onClick={handleGenerate}>
              Try again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
