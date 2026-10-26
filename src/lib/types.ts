/** Catalogue data, as written by scripts/fetch-data.ts */

export interface Option {
  key: string; // "A" | "B" | "C"
  text: string;
}

export interface Media {
  src: string; // primary URL
  alt: string; // fallback URL (GitHub copy)
}

export interface Question {
  id: string; // "1.1.01-001"
  theme: string; // "1.1"
  chapter: string; // "1.1.01"
  points: number; // error points, 2..5
  text: string;
  /** Empty for number-input questions. */
  options: Option[];
  /** Option keys, or a single number as text for number-input questions. */
  correct: string[];
  comment: string;
  images: Media[];
  videos: Media[];
  url: string;
}

export interface Theme {
  id: string;
  name: string;
}

export interface Chapter {
  id: string;
  theme: string;
  name: string;
  count: number;
}

export interface Catalog {
  generatedAt: string;
  themes: Theme[];
  chapters: Chapter[];
  questions: Question[];
}

export interface GermanText {
  text: string;
  /** Same order as Question.options */
  options: string[];
  comment: string;
}

/** A user's answer: selected option keys, or the typed number. */
export type Answer = string[];
