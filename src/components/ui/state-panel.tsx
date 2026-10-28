import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The centred "something is in the way" card — not found, an error, a
 * share link that can't be opened. Same shape as the shared page's
 * access states: an icon in a circle, a display heading, a short
 * explanation, and actions that stack full-width on phones.
 */
export function StatePanel({
  icon,
  title,
  children,
  actions,
  headingLevel = "h1",
  className,
}: {
  icon: React.ReactNode;
  title: string;
  /** The explanation — one or two short paragraphs. */
  children: React.ReactNode;
  actions?: React.ReactNode;
  /** h1 when the panel is the page; h2 when it sits under a page heading. */
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div className={cn("mx-auto w-full max-w-md py-6 sm:py-12", className)}>
      <div className="rounded-lg border border-line bg-paper-raised p-6 sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-paper text-steel">
          {icon}
        </span>
        <Heading className="mt-4 font-display text-xl font-medium leading-snug text-ink">
          {title}
        </Heading>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
        {actions && (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  className: "h-5 w-5",
} as const;

/** A compass — "we couldn't find that". */
export function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="7" />
      <path d="M12.8 7.2l-1.6 4-4 1.6 1.6-4 4-1.6z" strokeLinejoin="round" />
    </svg>
  );
}

/** A warning triangle — "something went wrong". */
export function WarningIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10 3.5l7 12.5H3L10 3.5z" strokeLinejoin="round" />
      <path d="M10 8.5v3.2M10 14v.01" strokeLinecap="round" />
    </svg>
  );
}
