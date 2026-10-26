import { describe, expect, test } from "bun:test";
import { dayKey } from "./date";
import { newCard, Rating, Scheduler, type StoredCard } from "./srs";
import {
  coverage,
  dayCounts,
  describeOffset,
  examEstimate,
  forecastLabels,
  heatmap,
  nextReviews,
  percent,
  readinessLabel,
  themeProgress,
  UNSEEN_RECALL,
  weekdayIndex,
  windowTotals,
} from "./stats";
import type { Question } from "./types";

// Sunday 2026-05-10, midday
const now = new Date(2026, 4, 10, 12, 0).getTime();
const today = dayKey(now);
const at = (daysAgo: number, hour = 12) => new Date(2026, 4, 10 - daysAgo, hour).getTime();

const q = (id: string, theme: string, points = 3): Question => ({
  id,
  theme,
  chapter: `${theme}.01`,
  points,
  text: "?",
  options: [{ key: "A", text: "a" }],
  correct: ["A"],
  comment: "",
  images: [],
  videos: [],
  url: "",
});

describe("dayCounts / windowTotals / percent", () => {
  const log = [
    { t: at(0), ok: 1 as const },
    { t: at(0), ok: 0 as const },
    { t: at(0, 2), ok: 1 as const }, // 02:00 still belongs to the day before
    { t: at(3), ok: 1 as const },
    { t: at(9), ok: 0 as const },
  ];
  const counts = dayCounts(log, dayKey);

  test("groups by study day (day starts 04:00)", () => {
    expect(counts.get(today)).toEqual({ n: 2, ok: 1 });
    expect(counts.get(dayKey(at(1)))).toEqual({ n: 1, ok: 1 });
    expect(counts.size).toBe(4);
  });

  test("window covers the last N days inclusive", () => {
    expect(windowTotals(counts, today, 1)).toEqual({ n: 2, ok: 1 });
    expect(windowTotals(counts, today, 7)).toEqual({ n: 4, ok: 3 });
    expect(windowTotals(counts, today, 30)).toEqual({ n: 5, ok: 3 });
  });

  test("percent", () => {
    expect(percent({ n: 3, ok: 2 })).toBe(67);
    expect(percent({ n: 0, ok: 0 })).toBeNull();
  });
});

describe("heatmap", () => {
  test("weekdayIndex starts on Monday", () => {
    expect(weekdayIndex("2026-05-10")).toBe(6); // Sunday
    expect(weekdayIndex("2026-05-11")).toBe(0); // Monday
  });

  test("12 columns of 7 rows, last column ends at today", () => {
    const counts = dayCounts([{ t: at(0), ok: 1 }], dayKey);
    const g = heatmap(counts, today, 12);
    expect(g.length).toBe(12);
    expect(g.every((c) => c.length === 7)).toBe(true);
    expect(g[11]![6]).toEqual({ key: today, n: 1, level: 4 });
  });

  test("days after today are null and levels scale with the max", () => {
    // Wednesday 2026-05-06 as "today"
    const wed = "2026-05-06";
    const counts = new Map([
      ["2026-05-04", { n: 10, ok: 10 }],
      ["2026-05-05", { n: 1, ok: 1 }],
      ["2026-05-06", { n: 5, ok: 5 }],
    ]);
    const last = heatmap(counts, wed, 2)[1]!;
    expect(last.map((c) => c?.level)).toEqual([4, 1, 2, undefined, undefined, undefined, undefined]);
    expect(last[3]).toBeNull();
  });

  test("empty log gives all level 0", () => {
    const g = heatmap(new Map(), today, 3);
    expect(g.flat().every((c) => c === null || c.level === 0)).toBe(true);
  });
});

describe("themeProgress", () => {
  const s = new Scheduler({ retention: 0.9 }, false);
  const learning = s.grade(newCard(now), Rating.Good, now);
  const mature: StoredCard = { ...s.grade(newCard(now), Rating.Easy, now), state: 2, scheduled_days: 40 };
  test("splits fresh / learning / mature per theme", () => {
    const pool = [q("a", "1.1"), q("b", "1.1"), q("c", "1.1"), q("d", "2.1"), q("e", "2.1")];
    const cards = { b: learning, c: mature, e: newCard(now) };
    const t = themeProgress(pool, cards);
    expect(t.get("1.1")).toEqual({ total: 3, fresh: 1, learning: 1, mature: 1 });
    expect(t.get("2.1")).toEqual({ total: 2, fresh: 2, learning: 0, mature: 0 });
  });
});

describe("examEstimate", () => {
  test("never answered questions use the default recall", () => {
    const pool = [q("a", "1.1", 4), q("b", "2.1", 2)];
    const e = examEstimate(pool, () => undefined);
    expect(e).toBeCloseTo(4 * (1 - UNSEEN_RECALL) * 20 + 2 * (1 - UNSEEN_RECALL) * 10, 6);
  });

  test("perfect recall gives 0", () => {
    expect(examEstimate([q("a", "1.1"), q("b", "2.1")], () => 1)).toBe(0);
  });

  test("uses the recall of each question", () => {
    const pool = [q("a", "1.1", 5), q("b", "1.1", 5)];
    expect(examEstimate(pool, (id) => (id === "a" ? 1 : 0))).toBeCloseTo(2.5 * 20, 6);
  });

  test("labels", () => {
    expect(readinessLabel(0)).toBe("Ready");
    expect(readinessLabel(6)).toBe("Ready");
    expect(readinessLabel(6.1)).toBe("Almost");
    expect(readinessLabel(10)).toBe("Almost");
    expect(readinessLabel(10.1)).toBe("Not yet");
  });
});

describe("coverage", () => {
  test("percent of answered questions", () => {
    const ids = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    expect(coverage(ids, (id) => id === "a")).toBe(25);
    expect(coverage([], () => true)).toBe(0);
  });
});

describe("forecast helpers", () => {
  test("labels start with Today then weekday names", () => {
    expect(forecastLabels(today, 7)).toEqual(["Today", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  test("nextReviews prefers cards later today, then the first busy day", () => {
    expect(nextReviews([3, 0, 5], 1)).toEqual({ offset: 0, count: 2 });
    expect(nextReviews([0, 0, 5, 2], 0)).toEqual({ offset: 2, count: 5 });
    expect(nextReviews([0, 0, 0], 0)).toBeNull();
  });

  test("describeOffset", () => {
    expect(describeOffset(0)).toBe("later today");
    expect(describeOffset(1)).toBe("tomorrow");
    expect(describeOffset(4)).toBe("in 4 days");
  });
});
