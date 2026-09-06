"use client";

import { useState } from "react";
import type { ClientQuizQuestion } from "@/lib/quiz-client-types";
import { Button } from "@/components/ui/button";

interface GradedQuestion {
  questionId: string;
  correct: boolean;
  correctAnswer: string | string[] | boolean;
  explanation: string | null;
}

type QuizState = "summary" | "taking" | "graded";

export function ModuleQuiz({
  courseId,
  moduleId,
  quizTitle,
  questions,
  initialScore,
}: {
  courseId: string;
  moduleId: string;
  quizTitle: string;
  questions: ClientQuizQuestion[];
  initialScore: { score: number; total: number } | null;
}) {
  const [state, setState] = useState<QuizState>(initialScore ? "summary" : "taking");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [results, setResults] = useState<GradedQuestion[]>([]);
  const [score, setScore] = useState(initialScore?.score ?? 0);
  const [total, setTotal] = useState(initialScore?.total ?? questions.length);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);
  const resultsByQuestion = Object.fromEntries(results.map((r) => [r.questionId, r]));

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function toggleMultiSelect(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[] | undefined) ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    const response = await fetch(
      `/api/courses/${courseId}/modules/${moduleId}/quiz-attempt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      }
    );

    const body = await response.json().catch(() => null);
    setIsSubmitting(false);

    if (!response.ok) {
      setError(body?.error ?? "Couldn't submit the quiz. Please try again.");
      return;
    }

    setResults(body.results);
    setScore(body.score);
    setTotal(body.total);
    setState("graded");
  }

  function handleRetake() {
    setAnswers({});
    setResults([]);
    setState("taking");
  }

  if (state === "summary") {
    return (
      <div className="rounded-lg border border-line bg-paper-raised p-5">
        <p className="text-sm font-medium text-ink">{quizTitle}</p>
        <p className="mt-1 text-sm text-forge-green">
          You scored {score}/{total} last time.
        </p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={handleRetake}>
          Retake Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-paper-raised p-5">
      <p className="text-sm font-medium text-ink">{quizTitle}</p>

      {state === "graded" && (
        <p className="mt-1 text-sm font-medium text-ink">
          Score: {score}/{total}
        </p>
      )}

      <div className="mt-4 space-y-6">
        {sorted.map((question, index) => {
          const result = resultsByQuestion[question.id];
          return (
            <div key={question.id}>
              <p className="text-sm font-medium text-ink">
                {index + 1}. {question.prompt}
              </p>

              {question.type === "multiple_choice" && (
                <div className="mt-2 space-y-1.5">
                  {question.options?.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 text-sm text-ink"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        disabled={state === "graded"}
                        checked={answers[question.id] === option.id}
                        onChange={() => setAnswer(question.id, option.id)}
                        className="h-4 w-4 accent-ember"
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              )}

              {question.type === "multiple_select" && (
                <div className="mt-2 space-y-1.5">
                  {question.options?.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 text-sm text-ink"
                    >
                      <input
                        type="checkbox"
                        disabled={state === "graded"}
                        checked={((answers[question.id] as string[]) ?? []).includes(
                          option.id
                        )}
                        onChange={() => toggleMultiSelect(question.id, option.id)}
                        className="h-4 w-4 accent-ember"
                      />
                      {option.text}
                    </label>
                  ))}
                </div>
              )}

              {question.type === "true_false" && (
                <div className="mt-2 space-y-1.5">
                  {[
                    { value: true, label: "True" },
                    { value: false, label: "False" },
                  ].map((opt) => (
                    <label
                      key={String(opt.value)}
                      className="flex items-center gap-2 text-sm text-ink"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        disabled={state === "graded"}
                        checked={answers[question.id] === opt.value}
                        onChange={() => setAnswer(question.id, opt.value)}
                        className="h-4 w-4 accent-ember"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}

              {question.type === "identification" && (
                <input
                  type="text"
                  disabled={state === "graded"}
                  value={(answers[question.id] as string) ?? ""}
                  onChange={(e) => setAnswer(question.id, e.target.value)}
                  className="mt-2 h-10 w-full max-w-sm rounded-md border border-line-strong bg-paper px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                />
              )}

              {result && (
                <div
                  className={`mt-2 rounded-md border px-3 py-2 text-sm ${
                    result.correct
                      ? "border-forge-green/30 bg-forge-green-soft text-forge-green"
                      : "border-danger-soft bg-danger-soft/40 text-danger"
                  }`}
                >
                  <p className="font-medium">
                    {result.correct ? "Correct" : "Incorrect"}
                    {!result.correct &&
                      question.type !== "identification" &&
                      question.options && (
                        <>
                          {" — correct answer: "}
                          {Array.isArray(result.correctAnswer)
                            ? result.correctAnswer
                                .map(
                                  (id) =>
                                    question.options?.find((o) => o.id === id)?.text ?? id
                                )
                                .join(", ")
                            : question.options.find((o) => o.id === result.correctAnswer)
                                ?.text ?? String(result.correctAnswer)}
                        </>
                      )}
                    {!result.correct && question.type === "true_false" && (
                      <> — correct answer: {String(result.correctAnswer)}</>
                    )}
                    {!result.correct && question.type === "identification" && (
                      <>
                        {" — accepted: "}
                        {Array.isArray(result.correctAnswer)
                          ? result.correctAnswer.join(", ")
                          : String(result.correctAnswer)}
                      </>
                    )}
                  </p>
                  {result.explanation && <p className="mt-1">{result.explanation}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5">
        {state === "taking" ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit Quiz"}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleRetake}>
            Retake Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
