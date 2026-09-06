import type { QuizQuestion } from "@/db/schema";

/**
 * What the client is allowed to see BEFORE a quiz is submitted:
 * everything except `correctAnswer` and `explanation`. Shipping those
 * in the initial page load would let anyone read the answers straight
 * out of the page source / React props before ever taking the quiz —
 * a real integrity problem, not a hypothetical one. The real values
 * are only ever sent back per-question inside a grading response,
 * after the user has already submitted their own answer for that
 * question.
 */
export type ClientQuizQuestion = Pick<
  QuizQuestion,
  "id" | "type" | "prompt" | "options" | "sortOrder"
>;

export function sanitizeQuestionForClient(question: QuizQuestion): ClientQuizQuestion {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    sortOrder: question.sortOrder,
  };
}
