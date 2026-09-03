import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import { ImportCourseForm } from "@/components/generate/import-course-form";
import { EXAMPLE_COURSE_IMPORT } from "@/lib/course-schema";

export const metadata: Metadata = {
  title: "Import Course JSON — CourseForge",
};

export default async function ImportCoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subjects?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  const syllabus = await getOwnedSyllabus(id, session!.user.id);

  if (!syllabus) notFound();

  const subjectIds = (query.subjects ?? "").split(",").filter(Boolean);
  if (subjectIds.length === 0) notFound();

  const rows = await db
    .select()
    .from(subjects)
    .where(inArray(subjects.id, subjectIds));

  // Defense in depth: only subjects that actually belong to this
  // (already ownership-checked) syllabus are used — a tampered query
  // string can't pull in another syllabus's subject id.
  const validSubjects = rows.filter((s) => s.syllabusId === id);
  if (validSubjects.length === 0) notFound();

  const exampleJson = JSON.stringify(EXAMPLE_COURSE_IMPORT, null, 2);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/generate/${id}`}
        className="text-sm text-steel-soft hover:text-ink"
      >
        ← Back to subject selection
      </Link>
      <h1 className="mt-3 font-display text-2xl font-medium text-ink">
        Import course JSON
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {validSubjects.length === 1
          ? "Paste ready-made course JSON for this subject."
          : `Each of your ${validSubjects.length} selected subjects becomes its own independent course — paste JSON for each below.`}
      </p>
      <p className="mt-1 text-xs text-steel-soft">
        No AI provider connected yet — generate JSON with any AI using
        CourseForge&apos;s schema, or use the example to try the flow.
      </p>

      <div className="mt-8 space-y-6">
        {validSubjects.map((subject) => (
          <ImportCourseForm
            key={subject.id}
            subjectId={subject.id}
            syllabusId={id}
            subjectLabel={subject.code ? `${subject.code} — ${subject.name}` : subject.name}
            exampleJson={exampleJson}
          />
        ))}
      </div>
    </div>
  );
}
