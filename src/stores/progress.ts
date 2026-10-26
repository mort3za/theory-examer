import { watchDebounced } from "@vueuse/core";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { defineStore } from "pinia";
import { toast } from "vue-sonner";
import { computed, ref, toRaw } from "vue";
import { isAnswered } from "@/lib/answer";
import { dayKey } from "@/lib/date";
import { scoreExam, type ExamScore } from "@/lib/exam";
import { deadline } from "@/lib/examRun";
import { isDue, newCard, Rating, Scheduler, State, type Grade, type StoredCard } from "@/lib/srs";
import type { Answer } from "@/lib/types";
import { useCatalog } from "./catalog";
import { useSettings, type Settings } from "./settings";

export type Mode = "review" | "practice" | "exam";

export interface QStat {
  seen: number;
  ok: number;
  /** Result of the last attempt: 1 = correct. */
  last?: 0 | 1;
  lastAt?: number;
}

export interface LogEntry {
  id: string;
  t: number;
  ok: 0 | 1;
  m: Mode;
  r?: Grade;
}

export interface ExamAttempt {
  id: string;
  startedAt: number;
  finishedAt?: number;
  minutes: number;
  questions: string[];
  answers: Record<string, Answer>;
  /** Questions the user marked to check again before submitting. */
  marked: string[];
  /** Video plays used per question. */
  plays: Record<string, number>;
  score?: ExamScore;
}

export interface ProgressData {
  version: 1;
  cards: Record<string, StoredCard>;
  stats: Record<string, QStat>;
  flags: Record<string, true>;
  notes: Record<string, string>;
  hidden: Record<string, true>;
  log: LogEntry[];
  exams: ExamAttempt[];
  currentExam: ExamAttempt | null;
  newToday: { day: string; count: number };
}

export interface Backup {
  app: "theory-examer";
  version: 1;
  exportedAt: string;
  settings: Settings;
  progress: ProgressData;
}

const KEY = "progress-v1";

const empty = (): ProgressData => ({
  version: 1,
  cards: {},
  stats: {},
  flags: {},
  notes: {},
  hidden: {},
  log: [],
  exams: [],
  currentExam: null,
  newToday: { day: "", count: 0 },
});

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(toRaw(v)));

export const useProgress = defineStore("progress", () => {
  const data = ref<ProgressData>(empty());
  const loaded = ref(false);
  const settings = useSettings();
  const catalog = useCatalog();

  const scheduler = computed(() => new Scheduler({ retention: settings.s.retention }));

  /** Questions in enabled chapters that the user did not hide. */
  const pool = computed(() =>
    catalog.questions.filter((q) => !settings.disabled.has(q.chapter) && !data.value.hidden[q.id]),
  );

  async function load() {
    const saved = await idbGet<ProgressData>(KEY);
    data.value = { ...empty(), ...saved };
    loaded.value = true;
    // Ask the browser not to evict our data (best effort).
    navigator.storage?.persist?.().catch(() => {});
  }

  let warned = false;
  async function save() {
    if (!loaded.value) return;
    const snapshot = clone(data.value);
    try {
      await idbSet(KEY, snapshot);
    } catch {
      // Storage full: cached question images share the quota. Drop them and try once more.
      try {
        await globalThis.caches?.delete("question-images");
        await idbSet(KEY, snapshot);
      } catch {
        if (!warned) toast.error("Could not save your progress. Export a backup in Settings → Data.");
        warned = true;
      }
    }
  }

  watchDebounced(data, save, { deep: true, debounce: 400, maxWait: 3000 });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
    });
  }

  /** New cards started today (lower than the real number after "learn more"). */
  const newDoneToday = computed(() =>
    data.value.newToday.day === dayKey(Date.now()) ? data.value.newToday.count : 0,
  );
  const newLeftToday = computed(() => Math.max(0, settings.s.newPerDay - newDoneToday.value));

  // Ticks every minute so due counts stay fresh while the app is open.
  const clock = ref(Date.now());
  setInterval(() => (clock.value = Date.now()), 60_000);

  /** What today's review session holds right now. */
  const today = computed(() => {
    const now = clock.value;
    let due = 0;
    let fresh = 0;
    for (const q of pool.value) {
      const c = data.value.cards[q.id];
      if (!c || c.state === State.New) fresh++;
      else if (isDue(c, now)) due++;
    }
    const newCount = Math.min(fresh, newLeftToday.value);
    return { due, new: newCount, fresh, total: due + newCount };
  });

  /** "Learn more": raise today's new-card limit by `n`. */
  function extendNewToday(n: number, now = Date.now()) {
    const today = dayKey(now);
    const c = data.value.newToday;
    data.value.newToday = { day: today, count: (c.day === today ? c.count : 0) - n };
  }

  /** New or due cards: an answer here changes the review schedule. */
  function isScheduling(id: string, now = Date.now()): boolean {
    const c = data.value.cards[id];
    return !c || c.state === State.New || isDue(c, now);
  }

  /** Record one attempt (stats + log). */
  function record(id: string, ok: boolean, mode: Mode, now = Date.now(), r?: Grade) {
    const st = (data.value.stats[id] ??= { seen: 0, ok: 0 });
    st.seen++;
    if (ok) st.ok++;
    st.last = ok ? 1 : 0;
    st.lastAt = now;
    data.value.log.push({ id, t: now, ok: ok ? 1 : 0, m: mode, ...(r ? { r } : {}) });
  }

  /** Grade a card with FSRS. Returns the new card. */
  function grade(id: string, rating: Grade, now = Date.now()): StoredCard {
    const prev = data.value.cards[id];
    if (!prev || prev.state === State.New) {
      const today = dayKey(now);
      const n = data.value.newToday;
      data.value.newToday = { day: today, count: (n.day === today ? n.count : 0) + 1 };
    }
    const next = scheduler.value.grade(prev ?? newCard(now), rating, now);
    data.value.cards[id] = next;
    return next;
  }

  /** Probability to answer correctly now (FSRS recall, or past accuracy for exam-only answers). */
  function recall(id: string, now = Date.now()): number | undefined {
    const c = data.value.cards[id];
    if (c && c.state !== State.New) {
      const r = scheduler.value.retrievability(c, now);
      // Still in short-term (re)learning: right after a step FSRS says ~100%, but the card is not known yet.
      return c.state === State.Review ? r : Math.min(r, 0.5);
    }
    const st = data.value.stats[id];
    return st?.seen ? st.ok / st.seen : undefined;
  }

  function toggleFlag(id: string) {
    if (data.value.flags[id]) delete data.value.flags[id];
    else data.value.flags[id] = true;
  }

  function toggleHidden(id: string) {
    if (data.value.hidden[id]) delete data.value.hidden[id];
    else data.value.hidden[id] = true;
  }

  function setNote(id: string, text: string) {
    const t = text.trim();
    if (t) data.value.notes[id] = text;
    else delete data.value.notes[id];
  }

  /** Start a new exam attempt. It stays in `currentExam` until finished or discarded. */
  function startExam(questions: string[], now = Date.now()): ExamAttempt {
    const exam: ExamAttempt = {
      id: crypto.randomUUID(),
      startedAt: now,
      minutes: settings.s.examMinutes,
      questions,
      answers: {},
      marked: [],
      plays: {},
    };
    data.value.currentExam = exam;
    return exam;
  }

  function discardExam() {
    data.value.currentExam = null;
  }

  /** Score the running exam, update stats (no FSRS) and move it to the history. Returns its id. */
  function finishExam(now = Date.now()): string | undefined {
    const exam = data.value.currentExam;
    if (!exam) return;
    const questions = exam.questions.flatMap((id) => catalog.get(id) ?? []);
    const score = scoreExam(questions, exam.answers);
    const wrong = new Set(score.wrong);
    // Unanswered questions count as wrong in the score, but they are not real attempts.
    for (const q of questions) if (isAnswered(q, exam.answers[q.id] ?? [])) record(q.id, !wrong.has(q.id), "exam", now);
    data.value.exams.push({ ...clone(exam), finishedAt: Math.min(now, deadline(exam)), score });
    data.value.currentExam = null;
    return exam.id;
  }

  /** Score a running exam whose time ran out while the app was closed. Needs the catalogue. */
  function finishExpiredExam(now = Date.now()) {
    const exam = data.value.currentExam;
    if (exam && now >= deadline(exam)) finishExam(deadline(exam));
  }

  function exportBackup(): Backup {
    return {
      app: "theory-examer",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: clone(settings.s),
      progress: clone(data.value),
    };
  }

  async function importBackup(b: unknown) {
    const backup = b as Partial<Backup>;
    if (backup?.app !== "theory-examer" || backup.version !== 1 || !backup.progress) {
      throw new Error("This file is not a Theory Examer backup.");
    }
    data.value = { ...empty(), ...backup.progress };
    if (backup.settings) settings.s = { ...settings.s, ...backup.settings };
    await save();
  }

  async function resetAll() {
    data.value = empty();
    await save();
  }

  return {
    data,
    loaded,
    pool,
    scheduler,
    newDoneToday,
    newLeftToday,
    today,
    load,
    save,
    isScheduling,
    extendNewToday,
    record,
    grade,
    recall,
    toggleFlag,
    toggleHidden,
    setNote,
    startExam,
    discardExam,
    finishExam,
    finishExpiredExam,
    exportBackup,
    importBackup,
    resetAll,
  };
});

export { Rating, State };
