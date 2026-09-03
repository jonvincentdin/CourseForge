import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "My Courses — CourseForge",
};

export default async function CoursesPage() {
  const session = await auth();

  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.ownerId, session!.user.id))
    .orderBy(desc(courses.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between">
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

      {rows.length === 0 ? (
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {rows.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{course.title}</CardTitle>
                  {course.subjectCode && (
                    <Badge tone="neutral">{course.subjectCode}</Badge>
                  )}
                </div>
                <CardDescription>
                  {course.academicYear && `Year ${course.academicYear}`}
                  {course.academicYear && course.semester && " · "}
                  {course.semester}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/courses/${course.id}`}
                  className={buttonVariants({ variant: "secondary", size: "sm" })}
                >
                  Open
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
