<script setup lang="ts">
import { ChevronLeft, ChevronRight, Flag, Grid3x3, Languages, X } from "@lucide/vue";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import QuestionCard from "@/components/QuestionCard.vue";
import QuestionToolbar from "@/components/QuestionToolbar.vue";
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
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { isAnswered } from "@/lib/answer";
import { formatClock } from "@/lib/date";
import { EXAM_RULES } from "@/lib/exam";
import { timeLeft } from "@/lib/examRun";
import { hash } from "@/lib/random";
import type { Answer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useGerman } from "@/composables/useGerman";
import { useKeys } from "@/composables/useKeys";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";

const catalog = useCatalog();
const progress = useProgress();
const settings = useSettings();
const german = useGerman();
const router = useRouter();

const exam = computed(() => progress.data.currentExam);
const questions = computed(() => (exam.value?.questions ?? []).flatMap((id) => catalog.get(id) ?? []));
const total = computed(() => questions.value.length);

const answerOf = (id: string): Answer => exam.value?.answers[id] ?? [];
const answered = (id: string) => {
  const q = catalog.get(id);
  return !!q && isAnswered(q, answerOf(id));
};
const isMarked = (id: string) => !!exam.value?.marked.includes(id);

// Start at the first open question (after a resume).
const index = ref(Math.max(0, questions.value.findIndex((q) => !answered(q.id))));
const question = computed(() => questions.value[index.value]);

const answer = computed<Answer>({
  get: () => (question.value ? answerOf(question.value.id) : []),
  set: (v) => {
    if (exam.value && question.value) exam.value.answers[question.value.id] = v;
  },
});
const plays = computed(() => (question.value ? (exam.value?.plays[question.value.id] ?? 0) : 0));
function onPlay() {
  if (exam.value && question.value) exam.value.plays[question.value.id] = plays.value + 1;
}

const marked = computed(() => !!question.value && isMarked(question.value.id));
function toggleMark() {
  const e = exam.value;
  const q = question.value;
  if (!e || !q) return;
  const i = e.marked.indexOf(q.id);
  if (i >= 0) e.marked.splice(i, 1);
  else e.marked.push(q.id);
}

const unanswered = computed(() => questions.value.filter((q) => !answered(q.id)).length);
const markedCount = computed(() => questions.value.filter((q) => isMarked(q.id)).length);

function go(i: number) {
  if (i < 0 || i >= total.value) return;
  index.value = i;
  window.scrollTo({ top: 0 });
}
const prev = () => go(index.value - 1);
const next = () => (index.value >= total.value - 1 ? (navOpen.value = true) : go(index.value + 1));
function jump(i: number) {
  navOpen.value = false;
  go(i);
}

// Wall-clock countdown. It survives reloads because it only uses `startedAt`.
const now = ref(Date.now());
const left = computed(() => (exam.value ? timeLeft(exam.value, now.value) : 0));
const low = computed(() => left.value < 5 * 60_000);
const timer = setInterval(() => {
  now.value = Date.now();
  if (left.value <= 0) submit();
}, 1000);
onBeforeUnmount(() => clearInterval(timer));

const exitOpen = ref(false);
const submitOpen = ref(false);
const navOpen = ref(false);
let finishing = false;

function submit() {
  if (finishing) return;
  finishing = true;
  clearInterval(timer);
  exitOpen.value = submitOpen.value = navOpen.value = false;
  const id = progress.finishExam();
  router.replace(id ? `/exam/${id}` : "/exam");
}

onMounted(() => {
  if (!exam.value) router.replace("/exam");
  else if (left.value <= 0) submit();
});

useKeys((key) => {
  if (!question.value) return;
  if (key === "arrowleft") return void prev(), true;
  if (key === "arrowright" || key === "enter") return void next(), true;
  if (key === "m") return void toggleMark(), true;
  if (key === "g") return void german.toggle(), true;
});

function cellClass(id: string, i: number) {
  return cn(
    "relative flex aspect-square items-center justify-center rounded-md border text-sm tabular-nums transition-colors hover:bg-muted",
    answered(id) ? "border-foreground/20 bg-foreground/10 font-medium text-foreground" : "text-muted-foreground",
    i === index.value && "border-foreground ring-1 ring-foreground",
  );
}
</script>

<template>
  <div v-if="exam && question" class="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4">
    <!-- Top bar -->
    <header class="sticky top-0 z-10 -mx-4 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
      <Button variant="ghost" size="icon-sm" aria-label="Leave exam" @click="exitOpen = true"><X /></Button>
      <p class="flex-1 text-sm font-medium tabular-nums">Question {{ index + 1 }} / {{ total }}</p>
      <p
        :class="cn('text-sm font-medium tabular-nums', low && 'text-warning')"
        role="timer"
        aria-label="Time left"
      >
        {{ formatClock(left) }}
      </p>
      <Button size="sm" @click="submitOpen = true">Submit</Button>
    </header>

    <main class="flex-1 space-y-6 pt-4 pb-36">
      <div class="flex items-center gap-1">
        <QuestionToolbar :question="question" :actions="false" class="min-w-0 flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          :aria-pressed="german.on.value"
          :class="cn(german.on.value && 'bg-muted text-foreground')"
          aria-label="Show German text (G)"
          @click="german.toggle()"
        >
          <Languages />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :aria-pressed="marked"
          :class="cn(marked ? 'text-warning' : 'text-muted-foreground')"
          @click="toggleMark"
        >
          <Flag :class="cn(marked && 'fill-current')" /> {{ marked ? "Marked" : "Mark for review" }}
        </Button>
      </div>

      <QuestionCard
        :key="question.id"
        v-model="answer"
        :question="question"
        :shuffle="settings.s.shuffleOptions"
        :seed="hash(exam.id)"
        :german="german.ready.value"
        :play-limit="EXAM_RULES.videoPlays"
        :plays="plays"
        @play="onPlay"
        @submit="next"
      />
    </main>

    <!-- Bottom bar -->
    <footer class="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
      <div class="mx-auto flex max-w-2xl gap-2 px-4 pt-3">
        <Button variant="outline" size="lg" class="h-12 flex-1" :disabled="index === 0" @click="prev">
          <ChevronLeft /> Prev
        </Button>
        <Button variant="outline" size="lg" class="h-12 flex-1" @click="navOpen = true">
          <Grid3x3 /> Overview
        </Button>
        <Button size="lg" class="h-12 flex-1" @click="next">
          {{ index === total - 1 ? "Finish" : "Next" }} <ChevronRight />
        </Button>
      </div>
    </footer>

    <!-- Navigator -->
    <Sheet v-model:open="navOpen">
      <SheetContent side="bottom" class="mx-auto max-w-2xl rounded-t-xl pb-[max(env(safe-area-inset-bottom),1rem)]">
        <SheetHeader>
          <SheetTitle>Questions</SheetTitle>
          <SheetDescription class="tabular-nums">
            {{ total - unanswered }} answered · {{ unanswered }} open · {{ markedCount }} marked
          </SheetDescription>
        </SheetHeader>
        <div class="grid grid-cols-6 gap-2 px-4 sm:grid-cols-10">
          <button
            v-for="(q, i) in questions"
            :key="q.id"
            type="button"
            :class="cellClass(q.id, i)"
            :aria-label="`Question ${i + 1}, ${answered(q.id) ? 'answered' : 'open'}${isMarked(q.id) ? ', marked' : ''}`"
            :aria-current="i === index"
            @click="jump(i)"
          >
            {{ i + 1 }}
            <span v-if="isMarked(q.id)" class="absolute top-1 right-1 size-1.5 rounded-full bg-warning" aria-hidden="true" />
          </button>
        </div>
        <p class="px-4 text-xs text-muted-foreground">
          Filled cell: answered. Dot: marked for review. Outlined cell: current.
        </p>
        <div class="px-4">
          <Button class="h-11 w-full" @click="((navOpen = false), (submitOpen = true))">Submit exam</Button>
        </div>
      </SheetContent>
    </Sheet>

    <AlertDialog v-model:open="exitOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the exam?</AlertDialogTitle>
          <AlertDialogDescription>The exam keeps running. You can resume it later.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction @click="router.push('/exam')">Leave</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog v-model:open="submitOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit the exam?</AlertDialogTitle>
          <AlertDialogDescription class="tabular-nums">
            <template v-if="unanswered || markedCount">
              <span v-if="unanswered" :class="'text-warning'">{{ unanswered }} unanswered.</span>
              <span v-if="markedCount"> {{ markedCount }} marked for review.</span>
            </template>
            <template v-else>All questions are answered.</template>
            Unanswered questions count as wrong. You cannot change answers after you submit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep working</AlertDialogCancel>
          <AlertDialogAction @click="submit">Submit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
