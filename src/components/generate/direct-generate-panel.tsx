"use client";

import { useState } from "react";
import Link from "next/link";
import type { Subject } from "@/db/schema";
import type { CourseDepth } from "@/lib/prompt-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GenerationProgress,
  useGenerationStages,
} from "@/components/generate/generation-progress";

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
  const { stageIndex, start, finish } = useGenerationStages();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  async function handleGenerate() {
    setState("generating");
    setError(null);
    setValidationErrors([]);
    start();

    const response = await fetch("/api/courses/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId: subject.id,
        syllabusId,
        depth,
        includeLearningObjectives,
      }),
    }).catch(() => null);

    finish();

    const body = await response?.json().catch(() => null);

    if (!response?.ok) {
      setState("error");
      setError(
        body?.error ??
          (response ? "Generation failed." : "Couldn't reach CourseForge — check your connection.")
      );
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

        {state === "generating" && <GenerationProgress stageIndex={stageIndex} />}

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
