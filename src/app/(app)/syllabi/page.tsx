import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { syllabi, subjects } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SyllabusStatusBadge } from "@/components/syllabi/syllabus-status-badge";
import { DeleteSyllabusButton } from "@/components/syllabi/delete-syllabus-button";

export const metadata: Metadata = {
  title: "My Syllabi — CourseForge",
};

export default async function SyllabiPage() {
  const session = await auth();
  const userId = session!.user.id;

  const rows = await db
    .select({
      id: syllabi.id,
      title: syllabi.title,
      status: syllabi.status,
      createdAt: syllabi.createdAt,
      processingError: syllabi.processingError,
    })
    .from(syllabi)
    .where(eq(syllabi.userId, userId))
    .orderBy(desc(syllabi.createdAt));

  const subjectCounts = await db
    .select({ syllabusId: subjects.syllabusId })
    .from(subjects)
    .innerJoin(syllabi, eq(subjects.syllabusId, syllabi.id))
    .where(eq(syllabi.userId, userId));

  const countBySyllabus = subjectCounts.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.syllabusId] = (acc[row.syllabusId] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">
            My Syllabi
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Upload once, generate courses from any subject whenever you need to.
          </p>
        </div>
        <Link href="/syllabi/upload" className={buttonVariants({ size: "md" })}>
          Upload syllabus
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-8">
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
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{row.title}</CardTitle>
                  <SyllabusStatusBadge status={row.status} />
                </div>
                <CardDescription>
                  {countBySyllabus[row.id]
                    ? `${countBySyllabus[row.id]} subject${
                        countBySyllabus[row.id] === 1 ? "" : "s"
                      }`
                    : "No subjects yet"}
                  {" · "}
                  Uploaded{" "}
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                  }).format(row.createdAt)}
                </CardDescription>
                {row.status === "failed" && row.processingError && (
                  <p className="mt-2 text-sm text-danger">{row.processingError}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                {row.status === "needs_review" ? (
                  <Link
                    href={`/syllabi/${row.id}/review`}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Review
                  </Link>
                ) : (
                  <Link
                    href={`/syllabi/${row.id}`}
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    View
                  </Link>
                )}
                <DeleteSyllabusButton syllabusId={row.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
