import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import { ReviewForm } from "@/components/syllabi/review-form";

export const metadata: Metadata = {
  title: "Review Syllabus — CourseForge",
};

export default async function ReviewSyllabusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const syllabus = await getOwnedSyllabus(id, session!.user.id);

  if (!syllabus) notFound();

  const rows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.syllabusId, id))
    .orderBy(asc(subjects.academicYear), asc(subjects.semester), asc(subjects.sortOrder));

  return (
    <div className="mx-auto max-w-3xl">
      <ReviewForm
        syllabusId={syllabus.id}
        syllabusTitle={syllabus.title}
        warnings={syllabus.extractionWarnings ?? []}
        initialSubjects={rows}
        alreadyReady={syllabus.status === "ready"}
      />
    </div>
  );
}
