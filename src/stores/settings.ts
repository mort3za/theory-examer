import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";
import { EXAM_RULES } from "@/lib/exam";
import type { NewOrder } from "@/lib/review";

/**
 * Chapters that are (mostly) for trucks, buses or trailers, hidden by default
 * for class B. The source data has no class field, so this is a best guess —
 * change it in Settings.
 */
export const NOT_CLASS_B_CHAPTERS = [
  "2.2.30", // Sunday driving ban
  "2.6.03", // Trailer operation
  "2.6.04", // Driving and rest periods
  "2.6.05", // EC monitoring device (tachograph)
  "2.6.06", // Dimensions, weights, speed limiters
  "2.6.07", // Reading a road map and route planning
  "2.7.07", // Trailer coupling systems
  "2.7.09", // Receipt, transport and delivery of goods
  "2.7.10", // Equipment of vehicles (buses)
  "2.8.01", // Qualification of truck drivers
];

export interface Settings {
  newPerDay: number;
  retention: number;
  newOrder: NewOrder;
  shuffleOptions: boolean;
  disabledChapters: string[];
  examMinutes: number;
  german: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 20,
  retention: 0.9,
  newOrder: "catalog",
  shuffleOptions: false,
  disabledChapters: NOT_CLASS_B_CHAPTERS,
  examMinutes: EXAM_RULES.minutes,
  german: false,
};

export const useSettings = defineStore("settings", () => {
  const s = useLocalStorage<Settings>("settings-v1", { ...DEFAULT_SETTINGS }, { mergeDefaults: true });
  const disabled = computed(() => new Set(s.value.disabledChapters));

  function setChapter(id: string, enabled: boolean) {
    const set = new Set(s.value.disabledChapters);
    if (enabled) set.delete(id);
    else set.add(id);
    s.value.disabledChapters = [...set].sort();
  }

  function reset() {
    s.value = { ...DEFAULT_SETTINGS };
  }

  return { s, disabled, setChapter, reset };
});
