/** A study day starts at 04:00 local time (like Anki), so late-night study counts for the same day. */
export const DAY_START_HOUR = 4;

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Start of the study day that contains `t`. */
export function startOfDay(t: number): number {
  const d = new Date(t);
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  return d.getTime();
}

/** End of the study day that contains `t` (exclusive). */
export function endOfDay(t: number): number {
  const d = new Date(startOfDay(t));
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** "YYYY-MM-DD" key of the study day that contains `t`. */
export function dayKey(t: number): string {
  const d = new Date(startOfDay(t));
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Shift a "YYYY-MM-DD" key by `n` days. */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d + n, 12);
  return dayKey(date.getTime() + DAY_START_HOUR * HOUR);
}

/**
 * Number of consecutive study days that end today (or yesterday, when today has no study yet).
 */
export function streak(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

/** Short human interval: "<1m", "10m", "3h", "4d", "2mo", "1.5y". */
export function formatInterval(ms: number): string {
  if (ms < MINUTE) return "<1m";
  if (ms < HOUR) return `${Math.round(ms / MINUTE)}m`;
  if (ms < DAY) return `${Math.round(ms / HOUR)}h`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1).replace(/\.0$/, "")}y`;
}

/** "12:05" style countdown. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
