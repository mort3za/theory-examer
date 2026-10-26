import { describe, expect, test } from "bun:test";
import { DAY, MINUTE } from "./date";
import { seeded } from "./random";
import { forecast, planReview } from "./review";
import { newCard, Rating, Scheduler, type StoredCard } from "./srs";
import type { Question } from "./types";

const now = new Date(2026, 4, 10, 12, 0).getTime();
const s = new Scheduler({ retention: 0.9 }, false);
const q = (id: string, points = 3): Question => ({
  id,
  theme: "1.1",
  chapter: "1.1.01",
  points,
  text: "?",
  options: [{ key: "A", text: "a" }],
  correct: ["A"],
  comment: "",
  images: [],
  videos: [],
  url: "",
});
const review = (due: number): StoredCard => ({ ...s.grade(newCard(now - 10 * DAY), Rating.Easy, now - 10 * DAY), due });
const learning = (due: number): StoredCard => ({ ...s.grade(newCard(now), Rating.Again, now), due });

describe("planReview", () => {
  const pool = [q("n1", 2), q("n2", 5), q("n3", 4), q("r-late"), q("r-old"), q("r-future"), q("l-soon")];
  const cards = {
    "r-late": review(now - DAY),
    "r-old": review(now - 5 * DAY),
    "r-future": review(now + 3 * DAY),
    "l-soon": learning(now + 10 * MINUTE),
  };

  test("most overdue reviews first, then new cards up to the limit", () => {
    const p = planReview({ pool, cards, now, newLimit: 2, newOrder: "catalog" });
    expect(p.main.map((i) => i.id)).toEqual(["r-old", "r-late", "n1", "n2"]);
    expect(p.main.map((i) => i.kind)).toEqual(["review", "review", "new", "new"]);
  });

  test("learning cards later today wait; future reviews are left out", () => {
    const p = planReview({ pool, cards, now, newLimit: 0, newOrder: "catalog" });
    expect(p.waiting.map((w) => w.id)).toEqual(["l-soon"]);
    expect(p.main.some((i) => i.id === "r-future")).toBe(false);
  });

  test("points order puts 5-point questions first", () => {
    const p = planReview({ pool, cards, now, newLimit: 3, newOrder: "points" });
    expect(p.main.filter((i) => i.kind === "new").map((i) => i.id)).toEqual(["n2", "n3", "n1"]);
  });

  test("random order is a shuffle of the new cards", () => {
    const p = planReview({ pool, cards, now, newLimit: 3, newOrder: "random", rng: seeded(7) });
    expect(p.main.filter((i) => i.kind === "new").map((i) => i.id).sort()).toEqual(["n1", "n2", "n3"]);
  });

  test("a negative limit means no new cards", () => {
    const p = planReview({ pool, cards, now, newLimit: -3, newOrder: "catalog" });
    expect(p.main.every((i) => i.kind === "review")).toBe(true);
  });
});

test("forecast buckets due cards by day; overdue counts for today", () => {
  const cards = { a: review(now - DAY), b: review(now + 1 * DAY), c: review(now + 2 * DAY), d: newCard(now) };
  const f = forecast(cards, ["a", "b", "c", "d"], now, 7);
  expect(f[0]).toBe(1);
  expect(f.reduce((x, y) => x + y, 0)).toBe(3);
  expect(f).toHaveLength(7);
});
