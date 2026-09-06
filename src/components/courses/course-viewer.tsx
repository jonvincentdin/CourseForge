"use client";

import { useState } from "react";
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

export function CourseViewer({
  courseId,
  modules,
  initialProgress,
}: {
  courseId: string;
  modules: ViewerModule[];
  initialProgress: Record<string, ViewerProgress>;
}) {
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

  async function handleMarkComplete() {
    setIsMarking(true);
    const response = await fetch(
      `/api/courses/${courseId}/modules/${activeModule.id}/complete-lesson`,
      { method: "POST" }
    );
    setIsMarking(false);

    if (response.ok) {
      setProgress((prev) => ({
        ...prev,
        [activeModule.id]: {
          lessonCompleted: true,
          quizScore: prev[activeModule.id]?.quizScore ?? null,
          quizTotal: prev[activeModule.id]?.quizTotal ?? null,
        },
      }));
      router.refresh();
    }
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
                courseId={courseId}
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
