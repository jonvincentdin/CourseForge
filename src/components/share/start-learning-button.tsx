"use client";

import { Button } from "@/components/ui/button";

/**
 * Scrolls to the course viewer and moves focus there, so keyboard and
 * screen-reader users start at the lessons too — a bare #fragment link
 * scrolls but doesn't reliably move focus.
 */
export function StartLearningButton({ targetId }: { targetId: string }) {
  function start() {
    const target = document.getElementById(targetId);
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  }

  return (
    <Button type="button" onClick={start} className="w-full min-[420px]:w-auto">
      Start learning
      <span aria-hidden="true">→</span>
    </Button>
  );
}
