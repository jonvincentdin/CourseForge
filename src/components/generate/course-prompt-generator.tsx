"use client";

import { useState } from "react";
import type { Subject, Syllabus } from "@/db/schema";
import type { CourseDepth } from "@/lib/prompt-generator";
import { SubjectPromptPanel } from "@/components/generate/subject-prompt-panel";
import { DirectGeneratePanel } from "@/components/generate/direct-generate-panel";

const DEPTH_OPTIONS: { value: CourseDepth; label: string }[] = [
  { value: "concise", label: "Concise" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
];

export function CoursePromptGenerator({
  syllabusId,
  syllabus,
  subjects,
  hasAiConfig,
}: {
  syllabusId: string;
  syllabus: Pick<Syllabus, "title" | "extractedText">;
  subjects: Subject[];
  hasAiConfig: boolean;
}) {
  const [depth, setDepth] = useState<CourseDepth>("standard");
  const [includeLearningObjectives, setIncludeLearningObjectives] = useState(true);
  const [method, setMethod] = useState<"external" | "direct">("external");

  return (
    <div>
      <div className="rounded-lg border border-line bg-paper-raised p-5">
        <p className="text-sm font-medium text-ink">Generation method</p>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              checked={method === "external"}
              onChange={() => setMethod("external")}
              className="h-4 w-4 accent-ember"
            />
            External AI Prompt + JSON
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${
              hasAiConfig ? "text-ink" : "text-steel-soft"
            }`}
          >
            <input
              type="radio"
              checked={method === "direct"}
              onChange={() => setMethod("direct")}
              disabled={!hasAiConfig}
              className="h-4 w-4 accent-ember"
            />
            Direct AI Generation
            {hasAiConfig ? (
              <span className="rounded-full border border-forge-green/40 bg-forge-green-soft px-2 py-0.5 text-xs text-forge-green">
                Ready
              </span>
            ) : (
              <a
                href="/settings"
                className="text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
              >
                Connect a provider in Settings
              </a>
            )}
          </label>
        </div>

        <p className="mt-5 text-sm font-medium text-ink">Course depth</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEPTH_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDepth(option.value)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                depth === option.value
                  ? "border-ink bg-ink text-paper-raised"
                  : "border-line-strong text-ink-soft hover:border-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm font-medium text-ink">Include</p>
        <div className="mt-2 space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-steel-soft">
            <input type="checkbox" checked disabled className="h-4 w-4" />
            Modules
            <span className="text-xs">(required)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-steel-soft">
            <input type="checkbox" checked disabled className="h-4 w-4" />
            Markdown lessons
            <span className="text-xs">(required)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includeLearningObjectives}
              onChange={(e) => setIncludeLearningObjectives(e.target.checked)}
              className="h-4 w-4 accent-ember"
            />
            Learning objectives
          </label>
          <label className="flex items-center gap-2 text-sm text-steel-soft">
            <input type="checkbox" checked disabled className="h-4 w-4" />
            Module quizzes
            <span className="text-xs">(required)</span>
          </label>
        </div>

        <a
          href="/api/courses/schema"
          className="mt-5 inline-block text-sm font-medium text-ink-soft hover:text-ink"
        >
          Download JSON Schema
        </a>
      </div>

      <div className="mt-8 space-y-6">
        {subjects.map((subject) =>
          method === "direct" ? (
            <DirectGeneratePanel
              key={subject.id}
              subject={subject}
              syllabusId={syllabusId}
              depth={depth}
              includeLearningObjectives={includeLearningObjectives}
            />
          ) : (
            <SubjectPromptPanel
              key={subject.id}
              subject={subject}
              syllabus={syllabus}
              syllabusId={syllabusId}
              depth={depth}
              includeLearningObjectives={includeLearningObjectives}
            />
          )
        )}
      </div>
    </div>
  );
}
