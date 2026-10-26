import { describe, expect, test } from "bun:test";
import { buildExam, expectedErrorPoints, scoreExam } from "./exam";
import { seeded } from "./random";
import type { Question } from "./types";

let n = 0;
const q = (points: number, theme = "1.1"): Question => ({
  id: `q${n++}`,
  theme,
  chapter: `${theme}.01`,
  points,
  text: "?",
  options: [
    { key: "A", text: "a" },
    { key: "B", text: "b" },
  ],
  correct: ["A"],
  comment: "",
  images: [],
  videos: [],
  url: "",
});

const right = ["A"];
const wrong = ["B"];

describe("scoreExam", () => {
  test("all correct passes with 0 error points", () => {
    const qs = [q(5), q(3), q(2)];
    const s = scoreExam(qs, Object.fromEntries(qs.map((x) => [x.id, right])));
    expect(s).toMatchObject({ errorPoints: 0, maxPoints: 10, passed: true, wrong: [] });
  });

  test("10 error points still passes", () => {
    const qs = [q(5), q(3), q(2), q(4)];
    const s = scoreExam(qs, { [qs[0]!.id]: wrong, [qs[1]!.id]: wrong, [qs[2]!.id]: wrong, [qs[3]!.id]: right });
    expect(s.errorPoints).toBe(10);
    expect(s.passed).toBe(true);
  });

  test("11 error points fails", () => {
    const qs = [q(5), q(4), q(2)];
    const s = scoreExam(qs, Object.fromEntries(qs.map((x) => [x.id, wrong])));
    expect(s.errorPoints).toBe(11);
    expect(s.passed).toBe(false);
  });

  test("two wrong 5-point questions fail, even at 10 points", () => {
    const qs = [q(5), q(5), q(3)];
    const s = scoreExam(qs, { [qs[0]!.id]: wrong, [qs[1]!.id]: wrong, [qs[2]!.id]: right });
    expect(s.errorPoints).toBe(10);
    expect(s.fivePointWrong).toBe(2);
    expect(s.passed).toBe(false);
  });

  test("unanswered counts as wrong", () => {
    const qs = [q(4)];
    expect(scoreExam(qs, {}).errorPoints).toBe(4);
  });
});

describe("buildExam", () => {
  const pool = [
    ...Array.from({ length: 40 }, () => q(3, "1.2")),
    ...Array.from({ length: 30 }, () => q(3, "2.7")),
  ];
  const byId = new Map(pool.map((x) => [x.id, x]));

  test("20 basic questions first, then 10 class questions, no repeats", () => {
    const ids = buildExam(pool, seeded(1));
    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(ids.slice(0, 20).every((id) => byId.get(id)!.theme.startsWith("1."))).toBe(true);
    expect(ids.slice(20).every((id) => byId.get(id)!.theme.startsWith("2."))).toBe(true);
  });

  test("small pool gives a shorter exam", () => {
    expect(buildExam(pool.slice(0, 5), seeded(1))).toHaveLength(5);
  });
});

describe("expectedErrorPoints", () => {
  test("perfect recall gives 0", () => {
    expect(expectedErrorPoints([{ points: 5, p: 1 }], [{ points: 3, p: 1 }])).toBe(0);
  });
  test("scales each group to its exam share", () => {
    // basic: avg loss 2 × 20 = 40; class: avg loss 1 × 10 = 10
    expect(expectedErrorPoints([{ points: 4, p: 0.5 }], [{ points: 2, p: 0.5 }])).toBe(50);
  });
});
