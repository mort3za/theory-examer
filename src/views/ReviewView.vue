<script setup lang="ts">
import { ref, shallowRef } from "vue";
import StudySession from "@/components/StudySession.vue";
import { StudyQueue } from "@/lib/queue";
import { planReview } from "@/lib/review";
import { useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";

const progress = useProgress();
const settings = useSettings();

function build() {
  const plan = planReview({
    pool: progress.pool,
    cards: progress.data.cards,
    now: Date.now(),
    newLimit: progress.newLeftToday,
    newOrder: settings.s.newOrder,
  });
  return new StudyQueue(plan.main, plan.waiting);
}

const queue = shallowRef(build());
const run = ref(0);

function learnMore() {
  progress.extendNewToday(10);
  queue.value = build();
  run.value++;
}
</script>

<template>
  <StudySession :key="run" mode="review" :queue="queue" @more="learnMore" />
</template>
