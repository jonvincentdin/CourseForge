import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { getOwnedSyllabus } from "@/lib/syllabus-service";
import { getAiConfigStatus } from "@/lib/ai-config-service";
import { CoursePromptGenerator } from "@/components/generate/course-prompt-generator";

export const metadata: Metadata = {
  title: "Generate a Course — CourseForge",
};

export default async function GeneratePromptPage({
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

  const aiStatus = await getAiConfigStatus(session!.user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/generate/${id}`}
        className="text-sm text-steel-soft hover:text-ink"
      >
        ← Back to subject selection
      </Link>
      <h1 className="mt-3 font-display text-2xl font-medium text-ink">
        Generate a course
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {validSubjects.length === 1
          ? "Copy the prompt into any AI, then paste back what it gives you."
          : `Each of your ${validSubjects.length} selected subjects becomes its own independent course, with its own prompt below.`}
      </p>

      <div className="mt-8">
        <CoursePromptGenerator
          syllabusId={id}
          syllabus={{ title: syllabus.title, extractedText: syllabus.extractedText }}
          subjects={validSubjects}
          hasAiConfig={aiStatus.configured}
        />
      </div>
    </div>
  );
}
