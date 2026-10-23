import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCourseLibrary } from "@/lib/course-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CourseLibrary } from "@/components/courses/course-library";

export const metadata: Metadata = {
  title: "My Courses — CourseForge",
};

export default async function CoursesPage() {
  const session = await auth();
  const library = await listCourseLibrary(session!.user.id);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Courses you&apos;ve imported or generated from your syllabi.
          </p>
        </div>
        <Link href="/generate" className={buttonVariants({ size: "md" })}>
          Generate a course
        </Link>
      </div>

      {library.length === 0 ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
            <CardDescription>
              Choose a subject and generate your first learning course.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/generate"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Generate a course
            </Link>
          </CardContent>
        </Card>
      ) : (
        <CourseLibrary courses={library} />
      )}
    </div>
  );
}
