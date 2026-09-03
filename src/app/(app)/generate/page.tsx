import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { syllabi } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Generate a Course — CourseForge",
};

export default async function GeneratePage() {
  const session = await auth();

  const readySyllabi = await db
    .select({ id: syllabi.id, title: syllabi.title, createdAt: syllabi.createdAt })
    .from(syllabi)
    .where(and(eq(syllabi.userId, session!.user.id), eq(syllabi.status, "ready")))
    .orderBy(desc(syllabi.createdAt));

  if (readySyllabi.length === 1) {
    redirect(`/generate/${readySyllabi[0].id}`);
  }

  if (readySyllabi.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-medium text-ink">
          Generate a course
        </h1>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>You&apos;ll need a syllabus first</CardTitle>
            <CardDescription>
              Upload a syllabus and finish reviewing it — then you can pick a
              year, semester, and subjects to generate a course from.
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
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink">
        Generate a course
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Which syllabus do you want to generate from?
      </p>
      <div className="mt-6 space-y-3">
        {readySyllabi.map((s) => (
          <Link
            key={s.id}
            href={`/generate/${s.id}`}
            className="block rounded-lg border border-line bg-paper-raised px-4 py-3 hover:border-ink"
          >
            <p className="text-sm font-medium text-ink">{s.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
