import { endOfDay } from "./date";
import type { QueueItem } from "./queue";
import { shuffle, type Rng } from "./random";
import { isDue, State, type StoredCard } from "./srs";
import type { Question } from "./types";

export type NewOrder = "catalog" | "random" | "points";

export interface ReviewPlan {
  main: QueueItem[];
  waiting: { id: string; due: number }[];
}

/**
 * Today's review session: due reviews first (most overdue first), then new
 * questions up to the daily limit. Learning cards due later today wait.
 */
export function planReview(opts: {
  pool: readonly Question[];
  cards: Readonly<Record<string, StoredCard>>;
  now: number;
  newLimit: number;
  newOrder: NewOrder;
  rng?: Rng;
}): ReviewPlan {
  const { pool, cards, now, newLimit, newOrder, rng = Math.random } = opts;
  const due: { id: string; due: number }[] = [];
  const waiting: { id: string; due: number }[] = [];
  const fresh: Question[] = [];
  const dayEnd = endOfDay(now);

  for (const q of pool) {
    const c = cards[q.id];
    if (!c || c.state === State.New) fresh.push(q);
    else if (isDue(c, now)) due.push({ id: q.id, due: c.due });
    else if (c.state !== State.Review && c.due < dayEnd) waiting.push({ id: q.id, due: c.due });
  }

  due.sort((a, b) => a.due - b.due);
  const ordered =
    newOrder === "random"
      ? shuffle(fresh, rng)
      : newOrder === "points"
        ? fresh.slice().sort((a, b) => b.points - a.points)
        : fresh;

  return {
    main: [
      ...due.map((d) => ({ id: d.id, kind: "review" as const })),
      ...ordered.slice(0, Math.max(0, newLimit)).map((q) => ({ id: q.id, kind: "new" as const })),
    ],
    waiting,
  };
}

/** Number of cards due on each of the next `days` study days (index 0 = today, incl. overdue). */
export function forecast(cards: Readonly<Record<string, StoredCard>>, ids: Iterable<string>, now: number, days: number): number[] {
  const out = new Array<number>(days).fill(0);
  const today = endOfDay(now);
  for (const id of ids) {
    const c = cards[id];
    if (!c || c.state === State.New) continue;
    const i = c.due < today ? 0 : Math.floor((c.due - today) / 86_400_000) + 1;
    if (i < days) out[i]!++;
  }
  return out;
}
