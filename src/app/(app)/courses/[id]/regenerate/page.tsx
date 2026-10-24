import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCourseVersions, getRegenerationSource } from "@/lib/course-service";
import { getAiConfigStatus } from "@/lib/ai-config-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { RegenerateCourseForm } from "@/components/courses/regenerate-course-form";

export const metadata: Metadata = {
  title: "Regenerate Course — CourseForge",
};

export default async function RegenerateCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const source = await getRegenerationSource(id, session!.user.id);

  if (!source) notFound();

  const { course, subject, syllabus } = source;

  const backLink = (
    <Link href={`/courses/${course.id}`} className="text-sm text-steel-soft hover:text-ink">
      ← Back to course
    </Link>
  );

  // Regeneration rebuilds from the original syllabus subject. If that
  // link is gone (imported without one, or the syllabus/subject was
  // deleted since), explain instead of showing a form that can't work.
  if (!subject || !syllabus) {
    return (
      <div className="mx-auto max-w-2xl">
        {backLink}
        <h1 className="mt-3 font-display text-2xl font-medium text-ink [overflow-wrap:anywhere]">
          Regenerate {course.title}
        </h1>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>This course can&apos;t be regenerated</CardTitle>
            <CardDescription className="leading-relaxed">
              Regenerating rebuilds a course from the syllabus subject it was created from, and
              this one has no linked subject to rebuild from — it was{" "}
              {course.source === "generated"
                ? "generated from a syllabus or subject that has since been deleted"
                : course.source === "shared_copy"
                  ? "added from a shared course"
                  : "imported from JSON without a linked syllabus, or its syllabus was deleted"}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-soft">
              The course itself is untouched — you can keep studying it. To get a fresh take,
              generate a new course from one of your syllabi.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/courses/${course.id}`}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Back to course
              </Link>
              <Link href="/generate" className={buttonVariants({ size: "sm" })}>
                Generate a new course
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [versions, aiStatus] = await Promise.all([
    getCourseVersions(course.id, session!.user.id),
    getAiConfigStatus(session!.user.id),
  ]);

  // The new version number is max-in-group + 1, not this version + 1 —
  // regenerating from an older version still lands at the top.
  const latestVersion = versions[0]?.version ?? course.version;

  return (
    <div className="mx-auto max-w-3xl">
      {backLink}
      <div className="mt-8">
        <RegenerateCourseForm
          course={{
            id: course.id,
            title: course.title,
            version: course.version,
            hasLearningObjectives: course.learningObjectives.length > 0,
          }}
          nextVersion={latestVersion + 1}
          subject={subject}
          syllabus={{ id: syllabus.id, title: syllabus.title, extractedText: syllabus.extractedText }}
          hasAiConfig={aiStatus.configured}
          aiProviderName={aiStatus.providerName}
        />
      </div>
    </div>
  );
}
