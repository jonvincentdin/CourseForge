"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Subject } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SEMESTER_ORDER: Subject["semester"][] = [
  "1st Semester",
  "2nd Semester",
  "Summer",
];

export function SubjectSelector({
  syllabusId,
  subjects,
  initialYear,
  initialSemester,
  initialSubjectId,
}: {
  syllabusId: string;
  subjects: Subject[];
  initialYear?: number;
  initialSemester?: Subject["semester"];
  initialSubjectId?: string;
}) {
  const router = useRouter();
  const availableYears = useMemo(
    () => [...new Set(subjects.map((s) => s.academicYear))].sort((a, b) => a - b),
    [subjects]
  );

  const [year, setYear] = useState<number>(
    initialYear && availableYears.includes(initialYear)
      ? initialYear
      : availableYears[0]
  );

  const availableSemesters = useMemo(
    () =>
      SEMESTER_ORDER.filter((semester) =>
        subjects.some((s) => s.academicYear === year && s.semester === semester)
      ),
    [subjects, year]
  );

  const [semester, setSemester] = useState<Subject["semester"]>(
    initialSemester && availableSemesters.includes(initialSemester)
      ? initialSemester
      : availableSemesters[0]
  );

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSubjectId ? [initialSubjectId] : [])
  );

  const subjectsInGroup = useMemo(
    () => subjects.filter((s) => s.academicYear === year && s.semester === semester),
    [subjects, year, semester]
  );

  const visibleSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subjectsInGroup;
    return subjectsInGroup.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code?.toLowerCase().includes(query)
    );
  }, [subjectsInGroup, search]);

  function changeYear(newYear: number) {
    setYear(newYear);
    const semestersForYear = SEMESTER_ORDER.filter((sem) =>
      subjects.some((s) => s.academicYear === newYear && s.semester === sem)
    );
    setSemester(semestersForYear[0]);
    setSelected(new Set());
    setSearch("");
  }

  function changeSemester(newSemester: Subject["semester"]) {
    setSemester(newSemester);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedSubjects = subjects.filter((s) => selected.has(s.id));

  if (availableYears.length === 0) {
    return (
      <p className="text-sm text-steel-soft">
        This syllabus doesn&apos;t have any subjects yet.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {availableYears.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => changeYear(y)}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
              y === year
                ? "border-ink bg-ink text-paper-raised"
                : "border-line-strong text-ink-soft hover:border-ink"
            }`}
          >
            Year {y}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {availableSemesters.map((sem) => (
          <button
            key={sem}
            type="button"
            onClick={() => changeSemester(sem)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              sem === semester
                ? "border-ember bg-ember-soft text-ember"
                : "border-line-strong text-ink-soft hover:border-ink"
            }`}
          >
            {sem}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Search subjects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search subjects"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            className="text-ink-soft hover:text-ink"
            onClick={() =>
              setSelected(
                (prev) => new Set([...prev, ...visibleSubjects.map((s) => s.id)])
              )
            }
          >
            Select all
          </button>
          <span className="text-line-strong">·</span>
          <button
            type="button"
            className="text-ink-soft hover:text-ink"
            onClick={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                visibleSubjects.forEach((s) => next.delete(s.id));
                return next;
              })
            }
          >
            Deselect all
          </button>
          <span className="text-line-strong">·</span>
          <button
            type="button"
            className="text-ink-soft hover:text-ink"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </button>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-paper-raised">
        {visibleSubjects.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-steel-soft">
            No subjects match {search ? "your search" : "this year and semester"}.
          </li>
        ) : (
          visibleSubjects.map((subject) => (
            <li key={subject.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-paper">
                <input
                  type="checkbox"
                  checked={selected.has(subject.id)}
                  onChange={() => toggle(subject.id)}
                  className="h-4 w-4 rounded border-line-strong text-ember focus-visible:ring-2 focus-visible:ring-ember"
                />
                <span className="text-sm text-ink">
                  {subject.code && (
                    <span className="mr-2 text-steel-soft">{subject.code}</span>
                  )}
                  {subject.name}
                </span>
              </label>
            </li>
          ))
        )}
      </ul>

      <div className="mt-6 rounded-lg border border-line bg-paper p-4">
        <p className="text-sm font-medium text-ink">
          {selectedSubjects.length} Subject{selectedSubjects.length === 1 ? "" : "s"}{" "}
          Selected
        </p>
        {selectedSubjects.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedSubjects.map((s) => (
              <Badge key={s.id} tone="neutral">
                {s.code ?? s.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button
          disabled={selectedSubjects.length === 0}
          onClick={() => {
            const ids = selectedSubjects.map((s) => s.id).join(",");
            router.push(`/generate/${syllabusId}/import?subjects=${ids}`);
          }}
        >
          Continue
        </Button>
        <p className="text-sm text-steel-soft">
          {selectedSubjects.length === 0
            ? "Select at least one subject to continue."
            : "AI generation isn't built yet — you'll paste in ready-made course JSON next."}
        </p>
      </div>
    </div>
  );
}
