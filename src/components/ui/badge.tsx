import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "ember" | "green" | "danger";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-paper text-steel border-line-strong",
  ember: "bg-ember-soft text-ember border-transparent",
  green: "bg-forge-green-soft text-forge-green border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
