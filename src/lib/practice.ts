import { shuffle, type Rng } from "./random";
import type { Question } from "./types";

export type PracticeMode = "chapters" | "mistakes" | "flagged" | "points" | "weak" | "random" | "ids";

export interface PracticeInput {
  pool: readonly Question[];
  mode: PracticeMode;
  /** For "chapters": chapter or theme ids ("1.1" matches all of 1.1.xx). For "ids": question ids. */
  ids?: readonly string[];
  /** Last result per question: 1 = correct, 0 = wrong. */
  last: (id: string) => 0 | 1 | undefined;
  flagged: (id: string) => boolean;
  /** Chance to answer correctly now, undefined when never answered. */
  recall: (id: string) => number | undefined;
  limit?: number;
  random?: boolean;
  rng?: Rng;
}

/** Questions for one practice session. */
export function selectPractice(input: PracticeInput): string[] {
  const { pool, mode, ids = [], last, flagged, recall, limit, random = false, rng = Math.random } = input;
  let list: Question[];
  switch (mode) {
    case "chapters":
      list = pool.filter((q) => ids.some((p) => q.chapter === p || q.theme === p));
      break;
    case "ids": {
      const byId = new Map(pool.map((q) => [q.id, q]));
      list = ids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
      break;
    }
    case "mistakes":
      list = pool.filter((q) => last(q.id) === 0);
      break;
    case "flagged":
      list = pool.filter((q) => flagged(q.id));
      break;
    case "points":
      // 4 and 5 point questions you do not know well yet, highest points first.
      list = pool
        .filter((q) => q.points >= 4 && (recall(q.id) ?? 0) < 0.9)
        .sort((a, b) => b.points - a.points);
      break;
    case "weak":
      list = pool
        .filter((q) => {
          const r = recall(q.id);
          return r !== undefined && r < 0.8;
        })
        .sort((a, b) => recall(a.id)! - recall(b.id)!);
      break;
    case "random":
      list = shuffle(pool, rng);
      break;
  }
  if (random && mode !== "random") list = shuffle(list, rng);
  const out = list.map((q) => q.id);
  return limit && limit > 0 ? out.slice(0, limit) : out;
}
