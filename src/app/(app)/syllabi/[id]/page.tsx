import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, type Subject } from "@/db/schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import { buttonVariants } from "@/components/ui/button";
import { SyllabusStatusBadge } from "@/components/syllabi/syllabus-status-badge";
import { DeleteSyllabusButton } from "@/components/syllabi/delete-syllabus-button";
import { ReprocessButton } from "@/components/syllabi/reprocess-button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Syllabus — CourseForge",
};

function groupSubjects(rows: Subject[]) {
  const byYear = new Map<number, Map<string, Subject[]>>();
  for (const subject of rows) {
    if (!byYear.has(subject.academicYear)) byYear.set(subject.academicYear, new Map());
    const bySemester = byYear.get(subject.academicYear)!;
    if (!bySemester.has(subject.semester)) bySemester.set(subject.semester, []);
    bySemester.get(subject.semester)!.push(subject);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, semesters]) => ({
      year,
      semesters: [...semesters.entries()].sort(([a], [b]) => a.localeCompare(b)),
    }));
}

export default async function SyllabusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const syllabus = await getOwnedSyllabus(id, session!.user.id);

  if (!syllabus) notFound();
  if (syllabus.status === "needs_review") redirect(`/syllabi/${id}/review`);

  if (syllabus.status === "processing") {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-xl font-medium text-ink">
          Processing {syllabus.title}…
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          This can take a moment for longer PDFs. Refresh in a few seconds.
        </p>
      </div>
    );
  }

  if (syllabus.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/syllabi" className="text-sm text-steel-soft hover:text-ink">
          ← My Syllabi
        </Link>
        <h1 className="mt-3 font-display text-xl font-medium text-ink">
          {syllabus.title}
        </h1>
        <p className="mt-2 text-sm text-danger">
          {syllabus.processingError ?? "Processing failed."}
        </p>
        <div className="mt-4 flex gap-2">
          <ReprocessButton syllabusId={syllabus.id} />
          <DeleteSyllabusButton syllabusId={syllabus.id} />
        </div>
      </div>
    );
  }

  const rows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.syllabusId, id))
    .orderBy(asc(subjects.academicYear), asc(subjects.semester), asc(subjects.sortOrder));

  const grouped = groupSubjects(rows);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/syllabi" className="text-sm text-steel-soft hover:text-ink">
        ← My Syllabi
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">
            {syllabus.title}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {rows.length} subject{rows.length === 1 ? "" : "s"} · Uploaded{" "}
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              syllabus.createdAt
            )}
          </p>
        </div>
        <SyllabusStatusBadge status={syllabus.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/syllabi/${syllabus.id}/review`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Edit subjects
        </Link>
        <ReprocessButton syllabusId={syllabus.id} />
        <DeleteSyllabusButton syllabusId={syllabus.id} />
      </div>

      <div className="mt-8 space-y-8">
        {grouped.length === 0 ? (
          <p className="text-sm text-steel-soft">
            No subjects yet.{" "}
            <Link href={`/syllabi/${syllabus.id}/review`} className="text-ink hover:text-ember">
              Add some
            </Link>
            .
          </p>
        ) : (
          grouped.map(({ year, semesters }) => (
            <div key={year}>
              <h2 className="font-display text-lg font-medium text-ink">
                Year {year}
              </h2>
              <div className="mt-3 space-y-5">
                {semesters.map(([semester, semesterSubjects]) => (
                  <div key={semester}>
                    <p className="text-xs font-medium uppercase tracking-wide text-steel-soft">
                      {semester}
                    </p>
                    <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-paper-raised">
                      {semesterSubjects.map((subject) => (
                        <li
                          key={subject.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-ink">
                              {subject.code && (
                                <span className="mr-2 text-steel-soft">
                                  {subject.code}
                                </span>
                              )}
                              {subject.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {subject.units && (
                              <Badge tone="neutral">{subject.units} units</Badge>
                            )}
                            <span
                              className={buttonVariants({
                                variant: "ghost",
                                size: "sm",
                                className: "cursor-not-allowed opacity-60",
                              })}
                              title="Course generation isn't built yet — see Milestone 5/6"
                            >
                              Generate course
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
