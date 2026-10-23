"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const GENERATION_STAGES = [
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

/**
 * Drives the simulated stage index: `start()` begins ticking through
 * the stages but parks on the second-to-last one (the request decides
 * when we're really done), `finish()` jumps to the last stage. The
 * interval is cleared on finish and on unmount.
 */
export function useGenerationStages() {
  const [stageIndex, setStageIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStageIndex(0);
    timerRef.current = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, GENERATION_STAGES.length - 2));
    }, STAGE_INTERVAL_MS);
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setStageIndex(GENERATION_STAGES.length - 1);
  }, []);

  return { stageIndex, start, finish };
}

/** The staged "✓ → ○" checklist shown while a course is being generated. */
export function GenerationProgress({
  stageIndex,
  note,
}: {
  stageIndex: number;
  /** Optional line under the checklist, e.g. how long this usually takes. */
  note?: string;
}) {
  const current = GENERATION_STAGES[Math.min(stageIndex, GENERATION_STAGES.length - 1)];

  return (
    <div>
      <p role="status" className="sr-only">
        Generating course: {current}…
      </p>
      <ul className="space-y-1.5">
        {GENERATION_STAGES.map((stage, index) => (
          <li key={stage} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="w-4 shrink-0 text-center">
              {index < stageIndex ? "✓" : index === stageIndex ? "→" : "○"}
            </span>
            <span className={index <= stageIndex ? "text-ink" : "text-steel-soft"}>
              {stage}
              <span className="sr-only">
                {index < stageIndex ? " (done)" : index === stageIndex ? " (in progress)" : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-3 text-xs text-steel-soft">{note}</p>}
    </div>
  );
}
