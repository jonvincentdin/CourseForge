import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { syllabi, courses } from "@/db/schema";
import { getCourseProgressSummaries } from "@/lib/progress-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SyllabusStatusBadge } from "@/components/syllabi/syllabus-status-badge";

export const metadata: Metadata = {
  title: "Dashboard — CourseForge",
};

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  const recentSyllabi = await db
    .select({
      id: syllabi.id,
      title: syllabi.title,
      status: syllabi.status,
    })
    .from(syllabi)
    .where(eq(syllabi.userId, session!.user.id))
    .orderBy(desc(syllabi.createdAt))
    .limit(3);

  const recentCourses = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.ownerId, session!.user.id))
    .orderBy(desc(courses.createdAt))
    .limit(3);

  const progress = await getCourseProgressSummaries(session!.user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">
          {firstName ? `Good to see you, ${firstName}.` : "Welcome to CourseForge."}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Upload a syllabus to start organizing your subjects and generating courses.
        </p>
      </div>

      {recentSyllabi.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No syllabus yet</CardTitle>
            <CardDescription>
              Upload your university syllabus to automatically organize your
              subjects by year and semester.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/syllabi/upload"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Upload syllabus
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Your syllabi</CardTitle>
              <Link href="/syllabi" className="text-sm text-ink-soft hover:text-ink">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {recentSyllabi.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <Link
                    href={s.status === "needs_review" ? `/syllabi/${s.id}/review` : `/syllabi/${s.id}`}
                    className="text-sm font-medium text-ink hover:text-ember"
                  >
                    {s.title}
                  </Link>
                  <SyllabusStatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recentCourses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No courses yet</CardTitle>
            <CardDescription>
              Once you have a syllabus, choose a subject and generate your
              first learning course.
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recently generated</CardTitle>
              <Link href="/courses" className="text-sm text-ink-soft hover:text-ink">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentCourses.map((c) => {
                const summary = progress[c.id];
                const percent =
                  summary && summary.totalModules > 0
                    ? Math.round((summary.completedModules / summary.totalModules) * 100)
                    : 0;
                return (
                  <li key={c.id}>
                    <div className="flex items-center justify-between text-sm">
                      <Link
                        href={`/courses/${c.id}`}
                        className="font-medium text-ink hover:text-ember"
                      >
                        {c.title}
                      </Link>
                      <span className="text-steel-soft">{percent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
                      <div
                        className="h-full rounded-full bg-forge-green"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
