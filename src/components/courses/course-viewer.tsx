"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarkdownContent } from "@/components/courses/markdown-content";
import { ModuleQuiz } from "@/components/courses/module-quiz";
import { Button } from "@/components/ui/button";
import type { ClientQuizQuestion } from "@/lib/quiz-client-types";

export interface ViewerModule {
  id: string;
  title: string;
  description: string | null;
  contentMarkdown: string;
  quizTitle: string;
  questions: ClientQuizQuestion[];
}

export interface ViewerProgress {
  lessonCompleted: boolean;
  quizScore: number | null;
  quizTotal: number | null;
}

function moduleStatus(progress: ViewerProgress | undefined): "done" | "current" | "todo" {
  if (progress?.lessonCompleted && progress.quizScore !== null) return "done";
  return "todo";
}

/**
 * Where lesson/quiz requests go. Owners use their course's own endpoints;
 * the shared viewer passes `/api/share/{token}` instead, which runs the
 * same calls through the share-access gate.
 */
type ViewerEndpoint = { courseId: string; apiBase?: never } | { apiBase: string; courseId?: never };

export type CourseViewerProps = ViewerEndpoint & {
  modules: ViewerModule[];
  initialProgress: Record<string, ViewerProgress>;
  /**
   * "saved" (default): progress is written through the API.
   * "anonymous": a signed-out visitor — "Mark lesson complete" only
   * updates local state, and quiz results are graded but not stored.
   */
  persistence?: "saved" | "anonymous";
  /** Where "Sign in to save your progress" points in anonymous mode. */
  signInHref?: string;
};

export function CourseViewer({
  modules,
  initialProgress,
  persistence = "saved",
  signInHref,
  ...endpoint
}: CourseViewerProps) {
  const apiBase = endpoint.apiBase ?? `/api/courses/${endpoint.courseId}`;
  const isAnonymous = persistence === "anonymous";
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [activeModuleId, setActiveModuleId] = useState<string>(() => {
    const firstIncomplete = modules.find(
      (m) => moduleStatus(initialProgress[m.id]) !== "done"
    );
    return (firstIncomplete ?? modules[0])?.id;
  });
  const [isMarking, setIsMarking] = useState(false);

  const completedCount = modules.filter(
    (m) => moduleStatus(progress[m.id]) === "done"
  ).length;
  const percent = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? modules[0];
  const activeProgress = progress[activeModule?.id ?? ""];

  function markLocallyComplete(moduleId: string) {
    setProgress((prev) => ({
      ...prev,
      [moduleId]: {
        lessonCompleted: true,
        quizScore: prev[moduleId]?.quizScore ?? null,
        quizTotal: prev[moduleId]?.quizTotal ?? null,
      },
    }));
  }

  async function handleMarkComplete() {
    if (isAnonymous) {
      // Nothing to persist for a signed-out visitor; keep it for this visit only.
      markLocallyComplete(activeModule.id);
      return;
    }

    setIsMarking(true);
    const response = await fetch(
      `${apiBase}/modules/${activeModule.id}/complete-lesson`,
      { method: "POST" }
    ).catch(() => null);
    setIsMarking(false);

    if (response?.ok) {
      markLocallyComplete(activeModule.id);
      router.refresh();
    }
  }

  // Anonymous quiz results still count toward this visit's progress bar.
  function handleQuizGraded(moduleId: string, score: number, total: number) {
    if (!isAnonymous) return;
    setProgress((prev) => ({
      ...prev,
      [moduleId]: {
        lessonCompleted: prev[moduleId]?.lessonCompleted ?? false,
        quizScore: score,
        quizTotal: total,
      },
    }));
  }

  if (!activeModule) {
    return <p className="text-sm text-steel-soft">This course has no modules yet.</p>;
  }

  return (
    <div>
      <div className="rounded-lg border border-line bg-paper-raised p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Course Progress</span>
          <span className="text-steel-soft">{percent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-forge-green transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        {isAnonymous && (
          <p className="mt-2 text-xs text-steel-soft">
            Progress isn&apos;t saved while you&apos;re signed out.{" "}
            {signInHref ? (
              <Link href={signInHref} className="font-medium text-ink underline-offset-2 hover:text-ember hover:underline">
                Sign in to save your progress
              </Link>
            ) : (
              "Sign in to save your progress."
            )}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1">
          {modules.map((mod, index) => {
            const status = moduleStatus(progress[mod.id]);
            const isActive = mod.id === activeModuleId;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setActiveModuleId(mod.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-ink text-paper-raised"
                    : "text-ink-soft hover:bg-paper"
                }`}
              >
                <span className="w-4 shrink-0 text-center">
                  {status === "done" ? "✓" : isActive ? "→" : "○"}
                </span>
                <span className="truncate">
                  {index + 1}. {mod.title}
                </span>
              </button>
            );
          })}
        </nav>

        <div>
          <h2 className="font-display text-xl font-medium text-ink">
            {modules.findIndex((m) => m.id === activeModule.id) + 1}. {activeModule.title}
          </h2>
          {activeModule.description && (
            <p className="mt-1 text-sm text-ink-soft">{activeModule.description}</p>
          )}

          <div className="mt-4 rounded-lg border border-line bg-paper-raised p-5">
            <MarkdownContent content={activeModule.contentMarkdown} />
          </div>

          <div className="mt-3 flex items-center gap-3">
            {activeProgress?.lessonCompleted ? (
              <span className="text-sm text-forge-green">✓ Lesson complete</span>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleMarkComplete} disabled={isMarking}>
                {isMarking ? "Marking…" : "Mark lesson complete"}
              </Button>
            )}
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <h3 className="text-base font-medium text-ink">Module Quiz</h3>
            <div className="mt-3">
              <ModuleQuiz
                key={activeModule.id}
                apiBase={apiBase}
                persistence={persistence}
                onGraded={(score, total) => handleQuizGraded(activeModule.id, score, total)}
                moduleId={activeModule.id}
                quizTitle={activeModule.quizTitle}
                questions={activeModule.questions}
                initialScore={
                  activeProgress?.quizScore !== null && activeProgress?.quizScore !== undefined
                    ? { score: activeProgress.quizScore, total: activeProgress.quizTotal ?? 0 }
                    : null
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
