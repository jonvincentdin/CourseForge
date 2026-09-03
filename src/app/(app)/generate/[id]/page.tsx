import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { subjects, type Subject } from "@/db/schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import { SubjectSelector } from "@/components/generate/subject-selector";

export const metadata: Metadata = {
  title: "Generate a Course — CourseForge",
};

const VALID_SEMESTERS: Subject["semester"][] = [
  "1st Semester",
  "2nd Semester",
  "Summer",
];

export default async function GenerateFromSyllabusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; semester?: string; subject?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  const syllabus = await getOwnedSyllabus(id, session!.user.id);

  if (!syllabus) notFound();
  if (syllabus.status !== "ready") notFound();

  const rows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.syllabusId, id))
    .orderBy(asc(subjects.academicYear), asc(subjects.semester), asc(subjects.sortOrder));

  const parsedYear = query.year ? Number(query.year) : undefined;
  const parsedSemester = VALID_SEMESTERS.includes(
    query.semester as Subject["semester"]
  )
    ? (query.semester as Subject["semester"])
    : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/generate" className="text-sm text-steel-soft hover:text-ink">
        ← Choose a different syllabus
      </Link>
      <h1 className="mt-3 font-display text-2xl font-medium text-ink">
        Generate a course
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        From {syllabus.title}. Pick a year, a semester, and one or more
        subjects.
      </p>

      <div className="mt-8">
        <SubjectSelector
          subjects={rows}
          initialYear={parsedYear}
          initialSemester={parsedSemester}
          initialSubjectId={query.subject}
        />
      </div>
    </div>
  );
}
