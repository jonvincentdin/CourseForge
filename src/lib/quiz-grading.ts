import type { QuizQuestion } from "@/db/schema";

export interface GradedQuestion {
  questionId: string;
  correct: boolean;
  correctAnswer: string | string[] | boolean;
  explanation: string | null;
}

function normalizeIdentification(value: string): string {
  return value.trim().toLowerCase();
}

/** Grades a single answer against its question's stored correctAnswer. Never trusts a client-supplied "correct" flag. */
export function gradeAnswer(question: QuizQuestion, userAnswer: unknown): boolean {
  switch (question.type) {
    case "multiple_choice":
      return typeof userAnswer === "string" && userAnswer === question.correctAnswer;

    case "multiple_select": {
      if (!Array.isArray(userAnswer)) return false;
      const correct = question.correctAnswer as string[];
      const submitted = userAnswer as string[];
      if (submitted.length !== correct.length) return false;
      const correctSet = new Set(correct);
      return submitted.every((id) => correctSet.has(id));
    }

    case "true_false":
      return typeof userAnswer === "boolean" && userAnswer === question.correctAnswer;

    case "identification": {
      if (typeof userAnswer !== "string") return false;
      const accepted = (question.correctAnswer as string[]).map(normalizeIdentification);
      return accepted.includes(normalizeIdentification(userAnswer));
    }

    default:
      return false;
  }
}

export function gradeQuiz(
  questions: QuizQuestion[],
  answers: Record<string, unknown>
): { results: GradedQuestion[]; score: number; total: number } {
  const results: GradedQuestion[] = questions.map((question) => ({
    questionId: question.id,
    correct: gradeAnswer(question, answers[question.id]),
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
  }));

  const score = results.filter((r) => r.correct).length;
  return { results, score, total: questions.length };
}
