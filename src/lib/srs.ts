import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from "ts-fsrs";
import { endOfDay } from "./date";

export { Rating, State };
export type { Grade };

/** FSRS card as stored in IndexedDB: dates as epoch ms. */
export interface StoredCard {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: number;
}

export interface SchedulerOptions {
  retention: number; // 0.7..0.97
}

const toStored = (c: Card): StoredCard => ({
  due: c.due.getTime(),
  stability: c.stability,
  difficulty: c.difficulty,
  elapsed_days: c.elapsed_days,
  scheduled_days: c.scheduled_days,
  learning_steps: c.learning_steps,
  reps: c.reps,
  lapses: c.lapses,
  state: c.state,
  last_review: c.last_review?.getTime(),
});

const toInput = (c: StoredCard) => ({
  ...c,
  due: new Date(c.due),
  last_review: c.last_review === undefined ? undefined : new Date(c.last_review),
});

export function newCard(now: number): StoredCard {
  return toStored(createEmptyCard(new Date(now)));
}

export class Scheduler {
  private f;
  constructor(opts: SchedulerOptions, fuzz = true) {
    this.f = fsrs({ request_retention: opts.retention, enable_fuzz: fuzz, enable_short_term: true });
  }

  grade(card: StoredCard, rating: Grade, now: number): StoredCard {
    return toStored(this.f.next(toInput(card), new Date(now), rating).card);
  }

  /** Next due time for each rating, to show on the grade buttons. */
  preview(card: StoredCard, now: number): Record<Grade, number> {
    const p = this.f.repeat(toInput(card), new Date(now));
    return {
      [Rating.Again]: p[Rating.Again].card.due.getTime(),
      [Rating.Hard]: p[Rating.Hard].card.due.getTime(),
      [Rating.Good]: p[Rating.Good].card.due.getTime(),
      [Rating.Easy]: p[Rating.Easy].card.due.getTime(),
    } as Record<Grade, number>;
  }

  /** Probability (0..1) to recall the card now. New cards return 0. */
  retrievability(card: StoredCard, now: number): number {
    if (card.state === State.New) return 0;
    return this.f.get_retrievability(toInput(card), new Date(now), false);
  }
}

/** Short-term (learning) cards are due by the minute; review cards are due for the whole day. */
export function isDue(card: StoredCard, now: number): boolean {
  if (card.state === State.New) return false;
  if (card.state === State.Review) return card.due < endOfDay(now);
  return card.due <= now;
}

/** Mature = long-term memory (interval ≥ 21 days), as in Anki. */
export function isMature(card: StoredCard): boolean {
  return card.state === State.Review && card.scheduled_days >= 21;
}
