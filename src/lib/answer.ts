import type { Answer, Question } from "./types";

export const isNumeric = (q: Question) => q.options.length === 0;

/** "0,5" → 0.5; returns NaN for empty or invalid input. */
export function parseNumber(input: string): number {
  const s = input.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return Number(s);
}

/** True when the answer is complete enough to check. */
export function isAnswered(q: Question, answer: Answer): boolean {
  if (isNumeric(q)) return !Number.isNaN(parseNumber(answer[0] ?? ""));
  return answer.length > 0;
}

/**
 * Exam rule: a question counts as correct only when the exact set of correct
 * options is selected (no missing, no extra). Number questions compare values.
 */
export function isCorrect(q: Question, answer: Answer): boolean {
  if (isNumeric(q)) return parseNumber(answer[0] ?? "") === parseNumber(q.correct[0] ?? "");
  if (answer.length !== q.correct.length) return false;
  const picked = new Set(answer);
  return q.correct.every((k) => picked.has(k));
}
