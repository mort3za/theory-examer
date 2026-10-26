import { describe, expect, test } from "bun:test";
import { newCard, State } from "./srs";
import {
  buildIndex,
  isStatusFilter,
  learnState,
  matchesStatus,
  matchesWords,
  normalize,
  parseQuery,
  type QuestionFacts,
} from "./search";
import type { Question } from "./types";

const q = (id: string, text: string, options: string[] = []): Question => ({
  id,
  theme: id.slice(0, 3),
  chapter: id.slice(0, 6),
  points: 2,
  text,
  options: options.map((t, i) => ({ key: "ABC"[i]!, text: t })),
  correct: ["A"],
  comment: "",
  images: [],
  videos: [],
  url: "",
});

const questions = [
  q("1.2.05-001", "What must you do at a Zebra crossing?", ["Stop", "Drive on"]),
  q("1.2.05-002", "Overtaking is allowed here?", ["Yes", "No"]),
  q("1.3.01-010", "Who has priority?", ["The tram", "The car"]),
];

const hits = (query: string, german?: Parameters<typeof buildIndex>[1]) => {
  const words = parseQuery(query);
  return buildIndex(questions, german)
    .filter((e) => matchesWords(e, words))
    .map((e) => e.question.id);
};

describe("normalize", () => {
  test("lower-cases and strips diacritics", () => {
    expect(normalize("Vorfahrt Überholen Straße Café")).toBe("vorfahrt uberholen strasse cafe");
  });
});

describe("parseQuery", () => {
  test("splits words and ignores extra spaces", () => {
    expect(parseQuery("  Zebra   CROSSING ")).toEqual(["zebra", "crossing"]);
    expect(parseQuery("   ")).toEqual([]);
  });
});

describe("matchesWords", () => {
  test("empty query matches all", () => {
    expect(hits("")).toHaveLength(3);
  });
  test("matches id prefix", () => {
    expect(hits("1.2.05")).toEqual(["1.2.05-001", "1.2.05-002"]);
    expect(hits("1.3")).toEqual(["1.3.01-010"]);
  });
  test("id match is a prefix, not a substring", () => {
    expect(hits("05-001")).toEqual([]);
  });
  test("matches question text, case-insensitive", () => {
    expect(hits("ZEBRA")).toEqual(["1.2.05-001"]);
  });
  test("matches option text", () => {
    expect(hits("tram")).toEqual(["1.3.01-010"]);
  });
  test("all words must match", () => {
    expect(hits("zebra stop")).toEqual(["1.2.05-001"]);
    expect(hits("zebra tram")).toEqual([]);
    expect(hits("1.2 overtaking")).toEqual(["1.2.05-002"]);
  });
  test("matches German text without diacritics", () => {
    const german = { "1.3.01-010": { text: "Wer hat Vorfahrt? Überholen", options: ["Die Straßenbahn", "Das Auto"], comment: "" } };
    expect(hits("strassenbahn")).toEqual([]);
    expect(hits("strassenbahn", german)).toEqual(["1.3.01-010"]);
    expect(hits("uberholen vorfahrt", german)).toEqual(["1.3.01-010"]);
  });
});

describe("status", () => {
  const base: QuestionFacts = { flagged: false, hasNote: false, hidden: false };
  const card = (patch: Partial<ReturnType<typeof newCard>>) => ({ ...newCard(0), ...patch });

  test("learnState", () => {
    expect(learnState(undefined)).toBe("new");
    expect(learnState(newCard(0))).toBe("new");
    expect(learnState(card({ state: State.Learning }))).toBe("learning");
    expect(learnState(card({ state: State.Review, scheduled_days: 5 }))).toBe("learning");
    expect(learnState(card({ state: State.Relearning, scheduled_days: 30 }))).toBe("learning");
    expect(learnState(card({ state: State.Review, scheduled_days: 21 }))).toBe("mastered");
  });

  test("filters", () => {
    expect(matchesStatus("all", base)).toBe(true);
    expect(matchesStatus("new", base)).toBe(true);
    expect(matchesStatus("learning", base)).toBe(false);
    expect(matchesStatus("mastered", { ...base, card: card({ state: State.Review, scheduled_days: 40 }) })).toBe(true);
    expect(matchesStatus("mistakes", { ...base, last: 0 })).toBe(true);
    expect(matchesStatus("mistakes", { ...base, last: 1 })).toBe(false);
    expect(matchesStatus("mistakes", base)).toBe(false);
    expect(matchesStatus("flagged", { ...base, flagged: true })).toBe(true);
    expect(matchesStatus("note", { ...base, hasNote: true })).toBe(true);
    expect(matchesStatus("hidden", { ...base, hidden: true })).toBe(true);
    expect(matchesStatus("hidden", base)).toBe(false);
  });

  test("isStatusFilter", () => {
    expect(isStatusFilter("mistakes")).toBe(true);
    expect(isStatusFilter("nope")).toBe(false);
    expect(isStatusFilter(undefined)).toBe(false);
  });
});
