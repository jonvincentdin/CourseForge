import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOwnedCourse } from "@/lib/course-service";
import { getProgressForCourse } from "@/lib/progress-service";
import { auth } from "@/lib/auth";
import { sanitizeQuestionForClient } from "@/lib/quiz-client-types";
import { CourseViewer, type ViewerModule, type ViewerProgress } from "@/components/courses/course-viewer";

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
  const progressRows = await getProgressForCourse(id, session!.user.id);

  const viewerModules: ViewerModule[] = modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    description: mod.description,
    contentMarkdown: mod.contentMarkdown,
    quizTitle: mod.quiz.title,
    // Never send correctAnswer/explanation to the client before a quiz is submitted.
    questions: mod.quiz.questions.map(sanitizeQuestionForClient),
  }));

  const initialProgress: Record<string, ViewerProgress> = Object.fromEntries(
    modules.map((mod) => {
      const row = progressRows[mod.id];
      return [
        mod.id,
        {
          lessonCompleted: row?.lessonCompleted ?? false,
          quizScore: row?.quizScore ?? null,
          quizTotal: row?.quizTotal ?? null,
        },
      ];
    })
  );

  return (
    <div className="mx-auto max-w-4xl">
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

      <div className="mt-8">
        <CourseViewer
          courseId={course.id}
          modules={viewerModules}
          initialProgress={initialProgress}
        />
      </div>
    </div>
  );
}
