import { isCorrect } from "./answer";
import { sample, type Rng } from "./random";
import type { Answer, Question } from "./types";

/** Class B theory exam (TÜV/DEKRA): 20 basic + 10 class questions, 45 min, max 10 error points. */
export const EXAM_RULES = {
  basic: 20,
  additional: 10,
  maxErrorPoints: 10,
  minutes: 45,
  videoPlays: 5,
} as const;

export const isBasic = (q: Question) => q.theme.startsWith("1.");

/** Picks exam questions from the pool: basic material first, then class material. */
export function buildExam(pool: readonly Question[], rng: Rng = Math.random): string[] {
  const basic = sample(pool.filter(isBasic), EXAM_RULES.basic, rng);
  const extra = sample(pool.filter((q) => !isBasic(q)), EXAM_RULES.additional, rng);
  return [...basic, ...extra].map((q) => q.id);
}

export interface ExamScore {
  errorPoints: number;
  maxPoints: number;
  wrong: string[];
  fivePointWrong: number;
  passed: boolean;
}

/**
 * Pass rule: at most 10 error points, and not two wrong 5-point questions
 * (2 × 5 = 10 points is a fail).
 */
export function scoreExam(questions: readonly Question[], answers: Record<string, Answer>): ExamScore {
  let errorPoints = 0;
  let maxPoints = 0;
  let fivePointWrong = 0;
  const wrong: string[] = [];
  for (const q of questions) {
    maxPoints += q.points;
    if (isCorrect(q, answers[q.id] ?? [])) continue;
    errorPoints += q.points;
    wrong.push(q.id);
    if (q.points === 5) fivePointWrong++;
  }
  const passed = errorPoints <= EXAM_RULES.maxErrorPoints && fivePointWrong < 2;
  return { errorPoints, maxPoints, wrong, fivePointWrong, passed };
}

/**
 * Expected error points in one exam, from the chance to answer each question
 * correctly. Each group's average loss is scaled to its exam share.
 */
export function expectedErrorPoints(
  basic: readonly { points: number; p: number }[],
  additional: readonly { points: number; p: number }[],
): number {
  const avgLoss = (xs: readonly { points: number; p: number }[]) =>
    xs.length ? xs.reduce((s, x) => s + x.points * (1 - x.p), 0) / xs.length : 0;
  return avgLoss(basic) * EXAM_RULES.basic + avgLoss(additional) * EXAM_RULES.additional;
}
