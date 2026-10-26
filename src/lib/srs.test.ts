import { describe, expect, test } from "bun:test";
import { DAY, MINUTE } from "./date";
import { isDue, isMature, newCard, Rating, Scheduler, State } from "./srs";

const t0 = new Date(2026, 0, 10, 12, 0).getTime();
const s = new Scheduler({ retention: 0.9 }, false);

describe("Scheduler", () => {
  test("a new card answered Again comes back within minutes", () => {
    const c = s.grade(newCard(t0), Rating.Again, t0);
    expect(c.state).toBe(State.Learning);
    expect(c.due - t0).toBeLessThanOrEqual(10 * MINUTE);
  });

  test("intervals grow: Again < Hard < Good < Easy", () => {
    const p = s.preview(newCard(t0), t0);
    expect(p[Rating.Again]).toBeLessThan(p[Rating.Hard]);
    expect(p[Rating.Hard]).toBeLessThanOrEqual(p[Rating.Good]);
    expect(p[Rating.Good]).toBeLessThan(p[Rating.Easy]);
  });

  test("repeated Good answers reach multi-day intervals", () => {
    let c = newCard(t0);
    let now = t0;
    for (let i = 0; i < 4; i++) {
      c = s.grade(c, Rating.Good, now);
      now = c.due;
    }
    expect(c.state).toBe(State.Review);
    expect(c.scheduled_days).toBeGreaterThan(3);
  });

  test("a lapse moves a review card to relearning", () => {
    let c = s.grade(newCard(t0), Rating.Easy, t0);
    expect(c.state).toBe(State.Review);
    c = s.grade(c, Rating.Again, c.due);
    expect(c.state).toBe(State.Relearning);
    expect(c.lapses).toBe(1);
  });

  test("stored card survives a JSON round trip", () => {
    const c = s.grade(newCard(t0), Rating.Good, t0);
    const back = JSON.parse(JSON.stringify(c));
    expect(s.grade(back, Rating.Good, c.due)).toEqual(s.grade(c, Rating.Good, c.due));
  });

  test("retrievability is 0 for new cards and high right after review", () => {
    expect(s.retrievability(newCard(t0), t0)).toBe(0);
    const c = s.grade(newCard(t0), Rating.Easy, t0);
    expect(s.retrievability(c, t0 + 1000)).toBeGreaterThan(0.95);
  });
});

describe("isDue", () => {
  test("new cards are never due (they come from the new-card limit)", () => {
    expect(isDue(newCard(t0), t0 + 10 * DAY)).toBe(false);
  });
  test("review cards are due for the whole study day", () => {
    const c = { ...s.grade(newCard(t0), Rating.Easy, t0), due: t0 + 6 * 60 * MINUTE }; // 18:00
    expect(isDue(c, t0)).toBe(true);
  });
  test("learning cards are due by the minute", () => {
    const c = s.grade(newCard(t0), Rating.Again, t0);
    expect(isDue(c, t0)).toBe(false);
    expect(isDue(c, c.due)).toBe(true);
  });
});

test("isMature needs a 21+ day interval", () => {
  const c = s.grade(newCard(t0), Rating.Easy, t0);
  expect(isMature({ ...c, scheduled_days: 20 })).toBe(false);
  expect(isMature({ ...c, scheduled_days: 21 })).toBe(true);
});
