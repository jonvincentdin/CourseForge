"use client";

import { useState, type FormEvent } from "react";
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

  if (!isOpen) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
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
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setError(body?.error ?? "Couldn't add this subject.");
      setIsSubmitting(false);
      return;
    }

    onAdded(body.subject);
    setName("");
    setCode("");
    setIsSubmitting(false);
    setIsOpen(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-paper p-3"
    >
      <div className="flex-1 min-w-[140px]">
        <Input
          placeholder="Code (optional)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      <div className="flex-[2] min-w-[200px]">
        <Input
          placeholder="Subject name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <select
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
        onClick={() => setIsOpen(false)}
      >
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </form>
  );
}
