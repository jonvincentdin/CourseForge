import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOwnedCourse } from "@/lib/course-service";
import { auth } from "@/lib/auth";
import { MarkdownContent } from "@/components/courses/markdown-content";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Course — CourseForge",
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const full = await getOwnedCourse(id, session!.user.id);

  if (!full) notFound();

  const { course, modules } = full;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/courses" className="text-sm text-steel-soft hover:text-ink">
        ← My Courses
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">
            {course.title}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {course.academicYear && `Year ${course.academicYear}`}
            {course.academicYear && course.semester && " · "}
            {course.semester}
            {course.subjectCode && ` · ${course.subjectCode}`}
          </p>
        </div>
        <a
          href={`/api/courses/${course.id}/export`}
          className="text-sm font-medium text-ink-soft hover:text-ink"
        >
          Export JSON
        </a>
      </div>

      {course.description && (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          {course.description}
        </p>
      )}

      {course.learningObjectives.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-paper-raised p-4">
          <p className="text-sm font-medium text-ink">Learning objectives</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {course.learningObjectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {modules.map((mod, index) => (
          <details
            key={mod.id}
            open={index === 0}
            className="group rounded-lg border border-line bg-paper-raised"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-medium text-ink">
                {index + 1}. {mod.title}
              </span>
              <Badge tone="neutral">
                {mod.quiz.questions.length} quiz question
                {mod.quiz.questions.length === 1 ? "" : "s"}
              </Badge>
            </summary>
            <div className="border-t border-line px-4 py-4">
              {mod.description && (
                <p className="text-sm text-ink-soft">{mod.description}</p>
              )}
              <MarkdownContent content={mod.contentMarkdown} />
            </div>
          </details>
        ))}
      </div>

      <p className="mt-8 border-t border-line pt-4 text-xs text-steel-soft">
        This is a structural preview — module navigation, progress
        tracking, and interactive quizzes are Milestone 7.
      </p>
    </div>
  );
}
