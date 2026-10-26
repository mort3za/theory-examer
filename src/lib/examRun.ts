import { isBasic } from "./exam";
import { MINUTE } from "./date";
import type { Question } from "./types";

interface Timed {
  startedAt: number;
  minutes: number;
}

/** Wall-clock end of an exam. */
export const deadline = (exam: Timed) => exam.startedAt + exam.minutes * MINUTE;

/** Milliseconds left (never below 0). */
export const timeLeft = (exam: Timed, now: number) => Math.max(0, deadline(exam) - now);

/** Error points of the wrong questions, split into basic and class material. */
export function splitErrorPoints(questions: readonly Question[], wrong: readonly string[]) {
  const bad = new Set(wrong);
  let basic = 0;
  let additional = 0;
  for (const q of questions) {
    if (!bad.has(q.id)) continue;
    if (isBasic(q)) basic += q.points;
    else additional += q.points;
  }
  return { basic, additional };
}

/** Finished exams, newest first. */
export const newestFirst = <T extends { startedAt: number }>(exams: readonly T[]) =>
  exams.slice().sort((a, b) => b.startedAt - a.startedAt);
