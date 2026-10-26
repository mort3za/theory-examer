import { describe, expect, test } from "bun:test";
import { selectPractice, type PracticeInput } from "./practice";
import { seeded } from "./random";
import type { Question } from "./types";

const q = (id: string, chapter: string, points = 3): Question => ({
  id,
  theme: chapter.slice(0, 3),
  chapter,
  points,
  text: "?",
  options: [{ key: "A", text: "a" }],
  correct: ["A"],
  comment: "",
  images: [],
  videos: [],
  url: "",
});

const pool = [q("a", "1.1.01", 5), q("b", "1.1.02", 2), q("c", "1.2.01", 4), q("d", "2.7.01", 3)];
const base: PracticeInput = {
  pool,
  mode: "random",
  last: (id) => ({ a: 0, b: 1, c: 0 } as Record<string, 0 | 1>)[id],
  flagged: (id) => id === "d",
  recall: (id) => ({ a: 0.5, b: 0.95, c: 0.7 } as Record<string, number>)[id],
  rng: seeded(3),
};

describe("selectPractice", () => {
  test("chapters match chapter ids and theme ids", () => {
    expect(selectPractice({ ...base, mode: "chapters", ids: ["1.1.02"] })).toEqual(["b"]);
    expect(selectPractice({ ...base, mode: "chapters", ids: ["1.1"] })).toEqual(["a", "b"]);
  });

  test("mistakes = last attempt wrong", () => {
    expect(selectPractice({ ...base, mode: "mistakes" })).toEqual(["a", "c"]);
  });

  test("flagged", () => {
    expect(selectPractice({ ...base, mode: "flagged" })).toEqual(["d"]);
  });

  test("points: 4+ point questions not yet known, highest first", () => {
    expect(selectPractice({ ...base, mode: "points" })).toEqual(["a", "c"]);
  });

  test("weak: answered questions with low recall, weakest first", () => {
    expect(selectPractice({ ...base, mode: "weak" })).toEqual(["a", "c"]);
  });

  test("ids keep the given order and skip unknown ids", () => {
    expect(selectPractice({ ...base, mode: "ids", ids: ["d", "x", "a"] })).toEqual(["d", "a"]);
  });

  test("limit and random", () => {
    const out = selectPractice({ ...base, mode: "random", limit: 2 });
    expect(out).toHaveLength(2);
    const all = selectPractice({ ...base, mode: "chapters", ids: ["1.1", "1.2", "2.7"], random: true });
    expect(all.sort()).toEqual(["a", "b", "c", "d"]);
  });
});
