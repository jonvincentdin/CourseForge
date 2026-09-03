import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard — CourseForge",
};

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

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
            href="/syllabi"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Upload syllabus
          </Link>
        </CardContent>
      </Card>

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
    </div>
  );
}
