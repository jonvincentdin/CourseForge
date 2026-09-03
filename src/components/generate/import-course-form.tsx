"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ImportCourseForm({
  subjectId,
  syllabusId,
  subjectLabel,
  exampleJson,
}: {
  subjectId: string;
  syllabusId: string;
  subjectLabel: string;
  exampleJson: string;
}) {
  const [json, setJson] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);

  async function handleSubmit() {
    setErrors([]);
    setIsSubmitting(true);

    const response = await fetch("/api/courses/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json, subjectId, syllabusId }),
    });

    const body = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setErrors(body?.errors ?? [body?.error ?? "Something went wrong."]);
      return;
    }

    setCreatedCourseId(body.course.id);
  }

  if (createdCourseId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{subjectLabel}</CardTitle>
          <CardDescription>Course created.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/courses/${createdCourseId}`}
            className="text-sm font-medium text-ink hover:text-ember"
          >
            Open the course →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{subjectLabel}</CardTitle>
        <CardDescription>
          Paste course JSON that matches CourseForge&apos;s schema (
          <code className="font-mono text-xs">schema_version: &quot;1.0&quot;</code>
          ).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={10}
          placeholder="Paste course JSON here…"
          className="w-full rounded-md border border-line-strong bg-paper-raised px-3 py-2 font-mono text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
        />

        {errors.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-md border border-danger-soft bg-danger-soft/40 px-4 py-3">
            {errors.map((error) => (
              <li key={error} className="text-sm text-danger">
                {error}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={handleSubmit} disabled={isSubmitting || json.trim().length === 0}>
            {isSubmitting ? "Importing…" : "Import course"}
          </Button>
          <button
            type="button"
            className="text-sm text-ink-soft hover:text-ink"
            onClick={() => setJson(exampleJson)}
          >
            Use example JSON
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
