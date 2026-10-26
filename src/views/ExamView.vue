<script setup lang="ts">
import { ChevronRight } from "@lucide/vue";
import { computed, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isAnswered } from "@/lib/answer";
import { formatClock } from "@/lib/date";
import { buildExam, EXAM_RULES } from "@/lib/exam";
import { newestFirst, timeLeft } from "@/lib/examRun";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";

const progress = useProgress();
const catalog = useCatalog();
const settings = useSettings();
const router = useRouter();

const current = computed(() => progress.data.currentExam);
const now = ref(Date.now());
const timer = setInterval(() => (now.value = Date.now()), 1000);
onBeforeUnmount(() => clearInterval(timer));

const left = computed(() => (current.value ? timeLeft(current.value, now.value) : 0));
const answered = computed(() => {
  const c = current.value;
  return c
    ? c.questions.filter((id) => {
        const q = catalog.get(id);
        return !!q && isAnswered(q, c.answers[id] ?? []);
      }).length
    : 0;
});

const rules = computed(() => [
  `${EXAM_RULES.basic + EXAM_RULES.additional} questions: ${EXAM_RULES.basic} basic and ${EXAM_RULES.additional} class`,
  `${settings.s.examMinutes} minutes`,
  `Pass with at most ${EXAM_RULES.maxErrorPoints} error points`,
  "Two wrong 5-point questions fail the exam",
  `Each video can be played ${EXAM_RULES.videoPlays} times`,
  "An answer counts only when you select exactly the correct options",
]);

const discardOpen = ref(false);
const replaceOpen = ref(false);

function discard() {
  progress.discardExam();
  discardOpen.value = false;
}

function begin() {
  const ids = buildExam(progress.pool);
  if (ids.length < EXAM_RULES.basic + EXAM_RULES.additional) {
    toast.error("Not enough questions enabled. Turn on more chapters in Settings.");
    return;
  }
  progress.startExam(ids);
  router.push("/exam/run");
}

function start() {
  if (current.value) replaceOpen.value = true;
  else begin();
}

const history = computed(() =>
  newestFirst(progress.data.exams.filter((e) => e.score && e.finishedAt)),
);
const recent = computed(() => history.value.slice(0, 10));
const summary = computed(() => {
  const passed = recent.value.filter((e) => e.score!.passed).length;
  return `Passed ${passed} of last ${recent.value.length}`;
});

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const duration = (e: { startedAt: number; finishedAt?: number }) => formatClock((e.finishedAt ?? e.startedAt) - e.startedAt);
</script>

<template>
  <div class="space-y-8">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Exam</h1>
      <p class="text-sm text-muted-foreground">A full simulation under real exam rules.</p>
    </header>

    <section v-if="current" class="space-y-3 rounded-lg border p-4">
      <div class="space-y-0.5">
        <h2 class="font-medium">Exam in progress</h2>
        <p class="text-sm text-muted-foreground tabular-nums">
          <span :class="left < 5 * 60_000 && 'text-warning'">{{ formatClock(left) }} left</span>
          · {{ answered }} of {{ current.questions.length }} answered
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button @click="router.push('/exam/run')">Resume exam</Button>
        <Button variant="outline" @click="discardOpen = true">Discard</Button>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Rules</h2>
      <ul class="space-y-1.5 text-sm">
        <li v-for="r in rules" :key="r" class="flex gap-2">
          <span class="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
          <span>{{ r }}</span>
        </li>
      </ul>
      <Button :variant="current ? 'outline' : 'default'" size="lg" class="mt-2 h-11 w-full sm:w-auto" @click="start">
        Start exam
      </Button>
    </section>

    <section class="space-y-3">
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-sm font-medium text-muted-foreground">History</h2>
        <p v-if="recent.length" class="text-sm text-muted-foreground tabular-nums">{{ summary }}</p>
      </div>
      <p v-if="!history.length" class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No finished exams yet.
      </p>
      <ul v-else class="divide-y rounded-lg border">
        <li v-for="e in history" :key="e.id">
          <RouterLink
            :to="`/exam/${e.id}`"
            class="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 sm:px-4"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium tabular-nums">{{ dateFmt.format(e.startedAt) }}</p>
              <p class="text-xs text-muted-foreground tabular-nums">
                {{ e.score!.errorPoints }} error points · {{ duration(e) }}
              </p>
            </div>
            <Badge :variant="e.score!.passed ? 'secondary' : 'destructive'" :class="e.score!.passed && 'bg-success/10 text-success'">
              {{ e.score!.passed ? "Passed" : "Failed" }}
            </Badge>
            <ChevronRight class="size-4 text-muted-foreground" />
          </RouterLink>
        </li>
      </ul>
    </section>

    <AlertDialog v-model:open="discardOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard this exam?</AlertDialogTitle>
          <AlertDialogDescription>Your answers are lost. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep exam</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="discard">Discard</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="replaceOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard the running exam?</AlertDialogTitle>
          <AlertDialogDescription>
            A new exam replaces the one in progress. Its answers are lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="begin">Discard and start</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
