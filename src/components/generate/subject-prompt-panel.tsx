"use client";

import { useMemo, useState } from "react";
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
  const [copied, setCopied] = useState(false);

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Couldn't copy automatically — select the text and copy it manually.");
    }
  }

  const label = subject.code ? `${subject.code} — ${subject.name}` : subject.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink-soft">
            1. Copy this prompt into any AI
          </p>
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy prompt"}
          </Button>
        </div>
        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-paper p-3 font-mono text-xs text-ink-soft">
          {prompt}
        </pre>

        <p className="mt-6 text-sm font-medium text-ink-soft">
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
