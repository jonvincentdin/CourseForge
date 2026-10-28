"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatePanel, WarningIcon } from "@/components/ui/state-panel";

// Never shows error.message — in production it's hidden anyway, and in dev it can carry server internals.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <StatePanel
      icon={<WarningIcon />}
      title="Something went wrong"
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            Go to Dashboard
          </Link>
        </>
      }
    >
      <p>CourseForge couldn&apos;t load this page. Your syllabi and courses are safe — try again in a moment.</p>
      {error.digest && (
        <p className="text-xs text-steel-soft">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </StatePanel>
  );
}
