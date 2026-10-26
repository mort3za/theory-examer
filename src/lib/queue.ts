import { MINUTE } from "./date";

export type ItemKind = "new" | "review" | "learn";

export interface QueueItem {
  id: string;
  kind: ItemKind;
}

interface Waiting {
  id: string;
  due: number;
}

/** Show waiting learning cards up to 20 min early when nothing else is left (like Anki). */
export const LEARN_AHEAD = 20 * MINUTE;

/**
 * Study session queue. The main list holds due reviews and new cards; cards in
 * short-term learning come back when their step (1m, 10m…) is over.
 */
export class StudyQueue {
  private main: QueueItem[];
  private waiting: Waiting[];

  constructor(main: QueueItem[], waiting: Waiting[] = []) {
    this.main = main.slice();
    this.waiting = waiting.slice().sort((a, b) => a.due - b.due);
  }

  /** Takes the next card out of the queue, or null when the session is over. */
  next(now: number, learnAhead = LEARN_AHEAD): QueueItem | null {
    const first = this.waiting[0];
    if (first && first.due <= now) return this.takeWaiting();
    const item = this.main.shift();
    if (item) return item;
    if (first && first.due <= now + learnAhead) return this.takeWaiting();
    return null;
  }

  /** Puts a card back for a later short-term step. */
  wait(id: string, due: number): void {
    this.waiting.push({ id, due });
    this.waiting.sort((a, b) => a.due - b.due);
  }

  /** Due time of the first waiting card (shown when the queue is empty). */
  nextWaitingDue(): number | undefined {
    return this.waiting[0]?.due;
  }

  counts(): Record<ItemKind, number> {
    const c = { new: 0, review: 0, learn: this.waiting.length };
    for (const i of this.main) c[i.kind]++;
    return c;
  }

  get size(): number {
    return this.main.length + this.waiting.length;
  }

  private takeWaiting(): QueueItem {
    const w = this.waiting.shift()!;
    return { id: w.id, kind: "learn" };
  }
}
