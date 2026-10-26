import { describe, expect, test } from "bun:test";
import { isAnswered, isCorrect, parseNumber } from "./answer";
import type { Question } from "./types";

const mc = (correct: string[]): Question => ({
  id: "x",
  theme: "1.1",
  chapter: "1.1.01",
  points: 3,
  text: "?",
  options: [
    { key: "A", text: "a" },
    { key: "B", text: "b" },
    { key: "C", text: "c" },
  ],
  correct,
  comment: "",
  images: [],
  videos: [],
  url: "",
});
const num = (value: string): Question => ({ ...mc([value]), options: [] });

describe("isCorrect — multiple choice", () => {
  test("exact set is correct, in any order", () => {
    expect(isCorrect(mc(["A", "B"]), ["B", "A"])).toBe(true);
  });
  test("a missing option is wrong", () => {
    expect(isCorrect(mc(["A", "B"]), ["A"])).toBe(false);
  });
  test("an extra option is wrong", () => {
    expect(isCorrect(mc(["A"]), ["A", "C"])).toBe(false);
  });
  test("no selection is wrong", () => {
    expect(isCorrect(mc(["C"]), [])).toBe(false);
  });
});

describe("isCorrect — number input", () => {
  test("same value is correct", () => {
    expect(isCorrect(num("60"), ["60"])).toBe(true);
    expect(isCorrect(num("60"), [" 60 "])).toBe(true);
  });
  test("comma decimal is accepted", () => {
    expect(isCorrect(num("0.5"), ["0,5"])).toBe(true);
  });
  test("other value or text is wrong", () => {
    expect(isCorrect(num("60"), ["61"])).toBe(false);
    expect(isCorrect(num("60"), ["sixty"])).toBe(false);
    expect(isCorrect(num("60"), [])).toBe(false);
  });
});

describe("isAnswered", () => {
  test("multiple choice needs one selection", () => {
    expect(isAnswered(mc(["A"]), [])).toBe(false);
    expect(isAnswered(mc(["A"]), ["B"])).toBe(true);
  });
  test("number input needs a valid number", () => {
    expect(isAnswered(num("4"), [""])).toBe(false);
    expect(isAnswered(num("4"), ["4x"])).toBe(false);
    expect(isAnswered(num("4"), ["4"])).toBe(true);
  });
});

test("parseNumber", () => {
  expect(parseNumber("12")).toBe(12);
  expect(parseNumber("1,25")).toBe(1.25);
  expect(parseNumber("")).toBeNaN();
  expect(parseNumber("1.2.3")).toBeNaN();
});
