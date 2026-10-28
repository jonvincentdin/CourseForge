"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Subject } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddSubjectForm({
  syllabusId,
  onAdded,
}: {
  syllabusId: string;
  onAdded: (subject: Subject) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [academicYear, setAcademicYear] = useState(1);
  const [semester, setSemester] = useState<Subject["semester"]>("1st Semester");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  // Set when the form closes, so focus goes back to "Add a subject" rather than <body>.
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (isOpen) {
      firstFieldRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      openButtonRef.current?.focus();
    }
  }, [isOpen]);

  function close() {
    restoreFocus.current = true;
    setError(null);
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <Button ref={openButtonRef} variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        Add a subject
      </Button>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(`/api/syllabi/${syllabusId}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code: code || null, academicYear, semester }),
    }).catch(() => null);

    const body = await response?.json().catch(() => null);

    if (!response?.ok) {
      setError(
        body?.error ??
          (response
            ? "Couldn't add this subject."
            : "Couldn't reach CourseForge — check your connection and try again.")
      );
      setIsSubmitting(false);
      return;
    }

    onAdded(body.subject);
    setName("");
    setCode("");
    setIsSubmitting(false);
    close();
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Add a subject"
      className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-paper p-3"
    >
      <div className="min-w-[140px] flex-1">
        <Input
          ref={firstFieldRef}
          placeholder="Code (optional)"
          aria-label="Subject code (optional)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="min-w-0 flex-[2] basis-48">
        <Input
          placeholder="Subject name"
          aria-label="Subject name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      <select
        aria-label="Academic year"
        value={academicYear}
        onChange={(e) => setAcademicYear(Number(e.target.value))}
        className="h-10 rounded-md border border-line-strong bg-paper-raised px-3 text-sm text-ink"
      >
        {[1, 2, 3, 4].map((year) => (
          <option key={year} value={year}>
            Year {year}
          </option>
        ))}
      </select>
      <select
        aria-label="Semester"
        value={semester}
        onChange={(e) => setSemester(e.target.value as Subject["semester"])}
        className="h-10 rounded-md border border-line-strong bg-paper-raised px-3 text-sm text-ink"
      >
        <option value="1st Semester">1st Semester</option>
        <option value="2nd Semester">2nd Semester</option>
        <option value="Summer">Summer</option>
      </select>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        {isSubmitting ? "Adding…" : "Add"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={close}
      >
        Cancel
      </Button>
      {error && (
        <p id={errorId} role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
