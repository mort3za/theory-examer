import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import type { Catalog, Chapter, GermanText, Question, Theme } from "@/lib/types";

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

export const useCatalog = defineStore("catalog", () => {
  const questions = shallowRef<Question[]>([]);
  const themes = shallowRef<Theme[]>([]);
  const chapters = shallowRef<Chapter[]>([]);
  const german = shallowRef<Record<string, GermanText> | null>(null);
  let germanLoading: Promise<void> | null = null;

  const byId = computed(() => new Map(questions.value.map((q) => [q.id, q])));
  const themeById = computed(() => new Map(themes.value.map((t) => [t.id, t])));
  const chapterById = computed(() => new Map(chapters.value.map((c) => [c.id, c])));

  async function load() {
    const res = await fetch(dataUrl("questions.json"));
    if (!res.ok) throw new Error(`Could not load questions (HTTP ${res.status})`);
    const data = (await res.json()) as Catalog;
    questions.value = data.questions;
    themes.value = data.themes;
    chapters.value = data.chapters;
  }

  /** German texts are loaded only when first needed (~1.2 MB). */
  function loadGerman(): Promise<void> {
    germanLoading ??= fetch(dataUrl("questions.de.json"))
      .then((r) => r.json())
      .then((d) => {
        german.value = d;
      })
      .catch((e) => {
        germanLoading = null;
        throw e;
      });
    return germanLoading;
  }

  const get = (id: string) => byId.value.get(id);

  return { questions, themes, chapters, german, byId, themeById, chapterById, load, loadGerman, get };
});
