<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import StudySession from "@/components/StudySession.vue";
import { selectPractice, type PracticeMode } from "@/lib/practice";
import { StudyQueue } from "@/lib/queue";
import { State } from "@/lib/srs";
import { useProgress } from "@/stores/progress";

/**
 * Practice session from the URL, e.g.
 *   #/practice/run?mode=chapters&ids=1.1.01,1.2&n=20&random=1
 *   #/practice/run?mode=mistakes
 */
const route = useRoute();
const progress = useProgress();

const MODES: PracticeMode[] = ["chapters", "mistakes", "flagged", "points", "weak", "random", "ids"];
const str = (v: unknown) => (typeof v === "string" ? v : "");

const ids = (() => {
  const q = route.query;
  const mode = (MODES as string[]).includes(str(q.mode)) ? (str(q.mode) as PracticeMode) : "random";
  const selected = selectPractice({
    pool: progress.pool,
    mode,
    ids: str(q.ids).split(",").filter(Boolean),
    last: (id) => progress.data.stats[id]?.last,
    flagged: (id) => !!progress.data.flags[id],
    recall: (id) => progress.recall(id),
    limit: Number(q.n) || undefined,
    random: q.random === "1",
  });
  return selected;
})();

const queue = new StudyQueue(
  ids.map((id) => {
    const c = progress.data.cards[id];
    return { id, kind: !c || c.state === State.New ? ("new" as const) : ("review" as const) };
  }),
);
const exitTo = computed(() => (route.query.from === "exam" ? `/exam/${str(route.query.exam)}` : "/practice"));
</script>

<template>
  <StudySession mode="practice" :queue="queue" :total="ids.length" :exit-to="exitTo" />
</template>
