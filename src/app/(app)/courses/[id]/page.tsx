import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCourseVersions,
  getOwnedCourse,
  getRegenerationSource,
} from "@/lib/course-service";
import { getProgressForCourse } from "@/lib/progress-service";
import { auth } from "@/lib/auth";
import { sanitizeQuestionForClient } from "@/lib/quiz-client-types";
import { courseSourceLabel } from "@/lib/course-library-filter";
import { CourseViewer, type ViewerModule, type ViewerProgress } from "@/components/courses/course-viewer";
import { CourseHeaderActions } from "@/components/courses/course-header-actions";
import { CourseVersions } from "@/components/courses/course-versions";
import { LocalDate } from "@/components/courses/local-date";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Course — CourseForge",
};

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** ?share=1 — arriving from "Manage sharing" on the shared view opens the share dialog. */
  searchParams: Promise<{ share?: string | string[] }>;
}) {
  const { id } = await params;
  const { share } = await searchParams;
  const session = await auth();
  const full = await getOwnedCourse(id, session!.user.id);

  if (!full) notFound();

  const { course, modules } = full;
  const [progressRows, versions, regenerationSource] = await Promise.all([
    getProgressForCourse(id, session!.user.id),
    getCourseVersions(id, session!.user.id),
    getRegenerationSource(id, session!.user.id),
  ]);

  // Regeneration needs the original subject + syllabus to still exist
  // (and still be this user's) — the same rule the regenerate route enforces.
  const canRegenerate = Boolean(
    regenerationSource?.subject && regenerationSource?.syllabus
  );
  const syllabusTitle = regenerationSource?.syllabus?.title ?? null;

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

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-medium text-ink [overflow-wrap:anywhere]">
            {course.title}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {course.academicYear && `Year ${course.academicYear}`}
            {course.academicYear && course.semester && " · "}
            {course.semester}
            {course.subjectCode && ` · ${course.subjectCode}`}
          </p>
          {course.source === "shared_copy" ? (
            <p className="mt-1 text-xs text-steel-soft">
              Added from a shared course — Original creator:{" "}
              <span className="font-medium text-ink-soft">
                {course.originalCreatorName?.trim() || "A CourseForge student"}
              </span>
              {course.copiedAt && (
                <>
                  {" "}
                  · Added <LocalDate iso={course.copiedAt.toISOString()} />
                </>
              )}
              {" "}· Version {course.version}
            </p>
          ) : (
            <p className="mt-1 text-xs text-steel-soft">
              {courseSourceLabel(course.source, syllabusTitle)} · Version {course.version} ·
              Created <LocalDate iso={course.createdAt.toISOString()} />
            </p>
          )}
          {course.visibility === "link" && (
            <Badge tone="neutral" className="mt-2">
              Anyone with the link can view
            </Badge>
          )}
        </div>
        <div className="shrink-0">
          <CourseHeaderActions
            course={{
              id: course.id,
              title: course.title,
              version: course.version,
              versionCount: Math.max(versions.length, 1),
            }}
            canRegenerate={canRegenerate}
            openShareOnLoad={share === "1"}
          />
        </div>
      </div>

      <CourseVersions versions={versions} currentId={course.id} />

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
