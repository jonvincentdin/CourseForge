import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A placeholder block for content that's still loading. Always
 * aria-hidden — pair a skeleton layout with one <LoadingStatus> so screen
 * readers hear a single "Loading …" instead of a pile of empty boxes.
 * The pulse is Tailwind's animate-pulse; the global reduced-motion rule
 * in globals.css stops it.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-line/70", className)}
      {...props}
    />
  );
}

/** Visually hidden polite status line for a loading region, e.g. "Loading your courses…". */
export function LoadingStatus({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
