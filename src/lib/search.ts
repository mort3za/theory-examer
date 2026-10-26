import { isMature, State, type StoredCard } from "./srs";
import type { GermanText, Question } from "./types";

/** Lower-case, no diacritics: "Vorfahrt" matches "vorfahrt", "Straße" matches "strasse". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

export interface SearchEntry {
  question: Question;
  /** Normalized question id. */
  id: string;
  /** Normalized question and option text (English, plus German when given). */
  text: string;
}

/** Precompute the normalized search strings once. */
export function buildIndex(questions: readonly Question[], german?: Record<string, GermanText> | null): SearchEntry[] {
  return questions.map((question) => {
    const parts = [question.text, ...question.options.map((o) => o.text)];
    const de = german?.[question.id];
    if (de) parts.push(de.text, ...de.options);
    return { question, id: normalize(question.id), text: normalize(parts.join("\n")) };
  });
}

/** Split a query into normalized words. */
export function parseQuery(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** Every word must match the start of the id or occur in the text. */
export function matchesWords(entry: SearchEntry, words: readonly string[]): boolean {
  return words.every((w) => entry.id.startsWith(w) || entry.text.includes(w));
}

export type StatusFilter = "all" | "new" | "learning" | "mastered" | "mistakes" | "flagged" | "note" | "hidden";

export const STATUS_FILTERS: readonly StatusFilter[] = [
  "all",
  "new",
  "learning",
  "mastered",
  "mistakes",
  "flagged",
  "note",
  "hidden",
];

export const isStatusFilter = (v: unknown): v is StatusFilter => STATUS_FILTERS.includes(v as StatusFilter);

export type LearnState = "new" | "learning" | "mastered";

export function learnState(card: StoredCard | undefined): LearnState {
  if (!card || card.state === State.New) return "new";
  return isMature(card) ? "mastered" : "learning";
}

export interface QuestionFacts {
  card?: StoredCard;
  /** Result of the last attempt: 1 = correct. */
  last?: 0 | 1;
  flagged: boolean;
  hasNote: boolean;
  hidden: boolean;
}

export function matchesStatus(filter: StatusFilter, f: QuestionFacts): boolean {
  switch (filter) {
    case "all":
      return true;
    case "new":
    case "learning":
    case "mastered":
      return learnState(f.card) === filter;
    case "mistakes":
      return f.last === 0;
    case "flagged":
      return f.flagged;
    case "note":
      return f.hasNote;
    case "hidden":
      return f.hidden;
  }
}
