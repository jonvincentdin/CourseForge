"use client";

import { useState } from "react";
import type { Subject } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

const YEARS = [1, 2, 3, 4];
const SEMESTERS: Subject["semester"][] = [
  "1st Semester",
  "2nd Semester",
  "Summer",
];

type SaveState = "idle" | "saving" | "saved" | "error";

export function SubjectRow({
  syllabusId,
  subject,
  onDeleted,
}: {
  syllabusId: string;
  subject: Subject;
  /** Called after a successful delete with the subject's id and (current) name. */
  onDeleted: (id: string, name: string) => void;
}) {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code ?? "");
  const [units, setUnits] = useState(subject.units ?? "");
  const [academicYear, setAcademicYear] = useState(subject.academicYear);
  const [semester, setSemester] = useState(subject.semester);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const displayName = name.trim() || subject.name;

  async function save(patch: Record<string, unknown>) {
    setSaveState("saving");
    const response = await fetch(
      `/api/syllabi/${syllabusId}/subjects/${subject.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }
    );
    setSaveState(response.ok ? "saved" : "error");
  }

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    const response = await fetch(
      `/api/syllabi/${syllabusId}/subjects/${subject.id}`,
      { method: "DELETE" }
    ).catch(() => null);
    setIsDeleting(false);

    if (response && (response.ok || response.status === 404)) {
      setConfirmOpen(false);
      onDeleted(subject.id, displayName);
      return;
    }
    setDeleteError(
      response
        ? "Couldn't remove this subject. Please try again."
        : "Couldn't reach CourseForge — check your connection and try again."
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 border-b border-line py-4 last:border-0 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[100px_1fr]">
        <Input
          value={code}
          placeholder="Code"
          onChange={(e) => setCode(e.target.value)}
          onBlur={() => save({ code })}
          aria-label="Subject code"
        />
        <Input
          value={name}
          placeholder="Subject name"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => save({ name })}
          aria-label="Subject name"
        />
        <select
          value={academicYear}
          onChange={(e) => {
            const value = Number(e.target.value);
            setAcademicYear(value);
            save({ academicYear: value });
          }}
          className="h-10 rounded-md border border-line-strong bg-paper-raised px-3 text-sm text-ink"
          aria-label="Academic year"
        >
          {YEARS.map((year) => (
            <option key={year} value={year}>
              Year {year}
            </option>
          ))}
        </select>
        <select
          value={semester}
          onChange={(e) => {
            const value = e.target.value as Subject["semester"];
            setSemester(value);
            save({ semester: value });
          }}
          className="h-10 rounded-md border border-line-strong bg-paper-raised px-3 text-sm text-ink"
          aria-label="Semester"
        >
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Input
          value={units}
          placeholder="Units"
          onChange={(e) => setUnits(e.target.value)}
          onBlur={() => save({ units })}
          aria-label="Units"
        />
        <span className="self-center text-xs text-steel-soft">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved"}
          {saveState === "error" && (
            <span className="text-danger">Couldn&apos;t save</span>
          )}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="justify-self-start text-danger hover:bg-danger-soft hover:text-danger sm:justify-self-end"
        onClick={() => setConfirmOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Remove ${displayName}`}
      >
        Remove
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!next) setDeleteError(null);
          setConfirmOpen(next);
        }}
        title={`Remove “${displayName}”?`}
        description="It's taken off this syllabus. Courses already generated from it stay in My Courses, but they can't be regenerated without it."
        confirmLabel="Remove subject"
        pendingLabel="Removing…"
        confirmVariant="danger"
        pending={isDeleting}
        onConfirm={handleDelete}
        error={deleteError}
      />
    </div>
  );
}
