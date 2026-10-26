import { addDays } from "./date";
import { expectedErrorPoints, isBasic } from "./exam";
import { isMature, State, type StoredCard } from "./srs";
import type { Question } from "./types";

export interface DayCount {
  n: number;
  ok: number;
}

/** Answers per study day ("YYYY-MM-DD"), one pass over the log. */
export function dayCounts(log: readonly { t: number; ok: 0 | 1 }[], keyOf: (t: number) => string): Map<string, DayCount> {
  const out = new Map<string, DayCount>();
  for (const e of log) {
    const k = keyOf(e.t);
    const c = out.get(k);
    if (c) {
      c.n++;
      c.ok += e.ok;
    } else out.set(k, { n: 1, ok: e.ok });
  }
  return out;
}

/** Sum of the last `days` study days, ending at `today` (inclusive). */
export function windowTotals(counts: ReadonlyMap<string, DayCount>, today: string, days: number): DayCount {
  const sum = { n: 0, ok: 0 };
  for (let i = 0; i < days; i++) {
    const c = counts.get(addDays(today, -i));
    if (c) {
      sum.n += c.n;
      sum.ok += c.ok;
    }
  }
  return sum;
}

/** Whole percent correct, or null when nothing was answered. */
export function percent(c: DayCount): number | null {
  return c.n ? Math.round((c.ok / c.n) * 100) : null;
}

export interface HeatCell {
  key: string;
  n: number;
  /** 0 = no answers, 1..4 = intensity */
  level: 0 | 1 | 2 | 3 | 4;
}

/** Day of week of a "YYYY-MM-DD" key, Monday = 0. */
export function weekdayIndex(key: string): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/**
 * Heatmap columns (weeks, Monday first), the last column holds `today`.
 * Days after today are null.
 */
export function heatmap(counts: ReadonlyMap<string, DayCount>, today: string, weeks: number): (HeatCell | null)[][] {
  const start = addDays(today, -weekdayIndex(today) - (weeks - 1) * 7);
  const cols: { key: string; n: number }[][] = [];
  let max = 0;
  for (let w = 0; w < weeks; w++) {
    const col: { key: string; n: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(start, w * 7 + d);
      const n = counts.get(key)?.n ?? 0;
      if (key <= today && n > max) max = n;
      col.push({ key, n });
    }
    cols.push(col);
  }
  return cols.map((col) =>
    col.map((c) =>
      c.key > today ? null : { ...c, level: (c.n === 0 ? 0 : Math.min(4, Math.ceil((c.n / max) * 4))) as HeatCell["level"] },
    ),
  );
}

export interface ThemeCounts {
  total: number;
  /** No card yet */
  fresh: number;
  /** Card exists, not mature */
  learning: number;
  mature: number;
}

/** Card state counts per theme id, one pass over the pool. */
export function themeProgress(
  pool: readonly Pick<Question, "id" | "theme">[],
  cards: Readonly<Record<string, StoredCard>>,
): Map<string, ThemeCounts> {
  const out = new Map<string, ThemeCounts>();
  for (const q of pool) {
    let t = out.get(q.theme);
    if (!t) out.set(q.theme, (t = { total: 0, fresh: 0, learning: 0, mature: 0 }));
    t.total++;
    const c = cards[q.id];
    if (!c || c.state === State.New) t.fresh++;
    else if (isMature(c)) t.mature++;
    else t.learning++;
  }
  return out;
}

/** Chance to answer a never-answered question correctly (rough guess). */
export const UNSEEN_RECALL = 0.15;

/** Expected error points of one exam drawn from `pool`. */
export function examEstimate(pool: readonly Question[], recall: (id: string) => number | undefined): number {
  const basic: { points: number; p: number }[] = [];
  const extra: { points: number; p: number }[] = [];
  for (const q of pool) (isBasic(q) ? basic : extra).push({ points: q.points, p: recall(q.id) ?? UNSEEN_RECALL });
  return expectedErrorPoints(basic, extra);
}

export type ReadinessLabel = "Ready" | "Almost" | "Not yet";

export function readinessLabel(errorPoints: number): ReadinessLabel {
  return errorPoints <= 6 ? "Ready" : errorPoints <= 10 ? "Almost" : "Not yet";
}

/** Whole percent of `ids` that pass `answered`. */
export function coverage(ids: readonly { id: string }[], answered: (id: string) => boolean): number {
  if (!ids.length) return 0;
  let n = 0;
  for (const q of ids) if (answered(q.id)) n++;
  return Math.round((n / ids.length) * 100);
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Forecast bar labels: "Today", then short weekday names. */
export function forecastLabels(today: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => (i === 0 ? "Today" : WEEKDAYS[weekdayIndex(addDays(today, i))]!));
}

/**
 * When the next reviews come. `fc` is the forecast (index 0 = today), `dueNow`
 * the cards already due. Cards due later today (learning steps) come first.
 */
export function nextReviews(fc: readonly number[], dueNow: number): { offset: number; count: number } | null {
  const later = (fc[0] ?? 0) - dueNow;
  if (later > 0) return { offset: 0, count: later };
  for (let i = 1; i < fc.length; i++) if (fc[i]) return { offset: i, count: fc[i]! };
  return null;
}

export function describeOffset(offset: number): string {
  return offset === 0 ? "later today" : offset === 1 ? "tomorrow" : `in ${offset} days`;
}
