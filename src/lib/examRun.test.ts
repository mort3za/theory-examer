import { describe, expect, test } from "bun:test";
import { MINUTE } from "./date";
import { deadline, newestFirst, splitErrorPoints, timeLeft } from "./examRun";
import type { Question } from "./types";

const q = (id: string, theme: string, points: number) => ({ id, theme, points }) as Question;

describe("examRun", () => {
  const exam = { startedAt: 1000, minutes: 45 };

  test("deadline and time left", () => {
    expect(deadline(exam)).toBe(1000 + 45 * MINUTE);
    expect(timeLeft(exam, 1000 + 5 * MINUTE)).toBe(40 * MINUTE);
    expect(timeLeft(exam, 1000 + 50 * MINUTE)).toBe(0);
  });

  test("splits error points by basic and class material", () => {
    const qs = [q("a", "1.2", 3), q("b", "2.1", 5), q("c", "1.1", 2), q("d", "2.3", 4)];
    expect(splitErrorPoints(qs, ["a", "b", "d"])).toEqual({ basic: 3, additional: 9 });
    expect(splitErrorPoints(qs, [])).toEqual({ basic: 0, additional: 0 });
  });

  test("sorts newest first without changing the input", () => {
    const list = [{ startedAt: 1 }, { startedAt: 3 }, { startedAt: 2 }];
    expect(newestFirst(list).map((e) => e.startedAt)).toEqual([3, 2, 1]);
    expect(list[0]!.startedAt).toBe(1);
  });
});
