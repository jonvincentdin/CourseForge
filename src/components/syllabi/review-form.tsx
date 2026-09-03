"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Subject } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { SubjectRow } from "@/components/syllabi/subject-row";
import { AddSubjectForm } from "@/components/syllabi/add-subject-form";

export function ReviewForm({
  syllabusId,
  syllabusTitle,
  warnings,
  initialSubjects,
  alreadyReady,
}: {
  syllabusId: string;
  syllabusTitle: string;
  warnings: string[];
  initialSubjects: Subject[];
  alreadyReady: boolean;
}) {
  const router = useRouter();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  async function handleFinalize() {
    setFinalizeError(null);
    setIsFinalizing(true);

    const response = await fetch(`/api/syllabi/${syllabusId}/finalize`, {
      method: "POST",
    });

    if (!response.ok) {
      setIsFinalizing(false);
      setFinalizeError("Couldn't save this syllabus. Please try again.");
      return;
    }

    router.push(`/syllabi/${syllabusId}`);
    router.refresh();
  }

  return (
    <div>
      <Link href="/syllabi" className="text-sm text-steel-soft hover:text-ink">
        ← My Syllabi
      </Link>
      <h1 className="mt-3 font-display text-2xl font-medium text-ink">
        Review {syllabusTitle}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        CourseForge did its best to detect your subjects. Check the code,
        name, year, and semester on each — correct anything that&apos;s wrong
        before saving.
      </p>

      {alreadyReady && (
        <p className="mt-4 rounded-md border border-line bg-paper-raised px-3 py-2 text-sm text-steel-soft">
          This syllabus was already marked ready. You can keep editing —
          changes save as you go.
        </p>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 space-y-1 rounded-md border border-ember-soft bg-ember-soft/40 px-4 py-3">
          {warnings.map((warning) => (
            <p key={warning} className="text-sm text-ink">
              {warning}
            </p>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-line bg-paper-raised p-4">
        {subjects.length === 0 ? (
          <p className="py-6 text-center text-sm text-steel-soft">
            No subjects yet. Add them below.
          </p>
        ) : (
          subjects
            .slice()
            .sort(
              (a, b) =>
                a.academicYear - b.academicYear ||
                a.semester.localeCompare(b.semester) ||
                a.sortOrder - b.sortOrder
            )
            .map((subject) => (
              <SubjectRow
                key={subject.id}
                syllabusId={syllabusId}
                subject={subject}
                onDeleted={(id) =>
                  setSubjects((prev) => prev.filter((s) => s.id !== id))
                }
              />
            ))
        )}
      </div>

      <div className="mt-4">
        <AddSubjectForm
          syllabusId={syllabusId}
          onAdded={(subject) => setSubjects((prev) => [...prev, subject])}
        />
      </div>

      <div className="mt-8 flex items-center gap-3 border-t border-line pt-6">
        <Button onClick={handleFinalize} disabled={isFinalizing}>
          {isFinalizing ? "Saving…" : "Save and finish"}
        </Button>
        {finalizeError && (
          <p role="alert" className="text-sm text-danger">
            {finalizeError}
          </p>
        )}
      </div>
    </div>
  );
}
