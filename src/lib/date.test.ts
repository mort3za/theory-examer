import { describe, expect, test } from "bun:test";
import { addDays, dayKey, DAY, endOfDay, formatClock, formatInterval, HOUR, MINUTE, startOfDay, streak } from "./date";

describe("study day (starts 04:00)", () => {
  test("02:00 belongs to the previous day", () => {
    expect(dayKey(new Date(2026, 2, 5, 2, 0).getTime())).toBe("2026-03-04");
    expect(dayKey(new Date(2026, 2, 5, 4, 0).getTime())).toBe("2026-03-05");
  });
  test("start and end", () => {
    const t = new Date(2026, 2, 5, 15, 0).getTime();
    expect(startOfDay(t)).toBe(new Date(2026, 2, 5, 4, 0).getTime());
    expect(endOfDay(t)).toBe(new Date(2026, 2, 6, 4, 0).getTime());
  });
  test("addDays crosses months", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("streak", () => {
  test("counts back from today", () => {
    expect(streak(new Set(["2026-03-03", "2026-03-04", "2026-03-05"]), "2026-03-05")).toBe(3);
  });
  test("today not studied yet keeps yesterday's streak", () => {
    expect(streak(new Set(["2026-03-03", "2026-03-04"]), "2026-03-05")).toBe(2);
  });
  test("a gap breaks it", () => {
    expect(streak(new Set(["2026-03-01", "2026-03-05"]), "2026-03-05")).toBe(1);
    expect(streak(new Set(), "2026-03-05")).toBe(0);
  });
});

test("formatInterval", () => {
  expect(formatInterval(30_000)).toBe("<1m");
  expect(formatInterval(10 * MINUTE)).toBe("10m");
  expect(formatInterval(5 * HOUR)).toBe("5h");
  expect(formatInterval(3 * DAY)).toBe("3d");
  expect(formatInterval(90 * DAY)).toBe("3mo");
  expect(formatInterval(365 * DAY)).toBe("1y");
});

test("formatClock", () => {
  expect(formatClock(45 * MINUTE)).toBe("45:00");
  expect(formatClock(61_500)).toBe("1:02");
  expect(formatClock(-5)).toBe("0:00");
});
