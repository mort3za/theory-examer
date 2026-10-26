<script setup lang="ts">
import { CircleCheck, CircleX, Inbox, PartyPopper, X } from "@lucide/vue";
import { computed, ref, shallowRef } from "vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { isAnswered, isCorrect } from "@/lib/answer";
import { endOfDay, formatInterval } from "@/lib/date";
import type { QueueItem, StudyQueue } from "@/lib/queue";
import { newCard, Rating, State, type Grade } from "@/lib/srs";
import type { Answer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useGerman } from "@/composables/useGerman";
import { useKeys } from "@/composables/useKeys";
import { useCatalog } from "@/stores/catalog";
import { useProgress, type Mode } from "@/stores/progress";
import { useSettings } from "@/stores/settings";
import QuestionCard from "./QuestionCard.vue";
import QuestionNotes from "./QuestionNotes.vue";
import QuestionToolbar from "./QuestionToolbar.vue";
import ShortcutsHelp from "./ShortcutsHelp.vue";

const props = defineProps<{
  mode: Exclude<Mode, "exam">;
  queue: StudyQueue;
  /** Practice: total number of questions, for the progress bar. */
  total?: number;
  /** Where "Exit" and "Done" go. */
  exitTo?: string;
}>();
const emit = defineEmits<{ more: [] }>();

const catalog = useCatalog();
const progress = useProgress();
const settings = useSettings();
const german = useGerman();
const router = useRouter();

const item = shallowRef<QueueItem | null>(props.queue.next(Date.now()));
const question = computed(() => (item.value ? catalog.get(item.value.id) : undefined));
const answer = ref<Answer>([]);
const phase = ref<"answer" | "result">("answer");
const ok = ref(false);
/** This answer changes the review schedule (new or due card). */
const scheduling = ref(false);
const graded = ref(false);
const preview = ref<Record<Grade, number> | null>(null);
const counts = ref(props.queue.counts());
const done = ref({ answered: 0, correct: 0, startedAt: Date.now() });
const helpOpen = ref(false);

const finished = computed(() => !item.value);
/** Cards left, including the one on screen (like Anki). */
const shown = computed(() => {
  const c = { ...counts.value };
  if (item.value) c[item.value.kind]++;
  return c;
});
const practiceProgress = computed(() => (props.total ? Math.min(100, (done.value.answered / props.total) * 100) : 0));

function check() {
  const q = question.value;
  if (!q || phase.value !== "answer") return;
  if (!isAnswered(q, answer.value)) {
    toast(q.options.length ? "Select at least one answer." : "Type a number first.");
    return;
  }
  const now = Date.now();
  ok.value = isCorrect(q, answer.value);
  scheduling.value = progress.isScheduling(q.id, now);
  graded.value = false;
  done.value.answered++;
  if (ok.value) done.value.correct++;
  progress.record(q.id, ok.value, props.mode, now, scheduling.value && !ok.value ? Rating.Again : undefined);
  if (scheduling.value && !ok.value) applyGrade(Rating.Again, now);
  else if (scheduling.value) {
    const c = progress.data.cards[q.id];
    preview.value = progress.scheduler.preview(c ?? newCard(now), now);
  }
  phase.value = "result";
}

function applyGrade(r: Grade, now = Date.now()) {
  const id = item.value!.id;
  const card = progress.grade(id, r, now);
  graded.value = true;
  // Short-term steps (1m, 10m…) come back in this session.
  if (card.state !== State.Review && card.due < endOfDay(now)) props.queue.wait(id, card.due);
  if (ok.value) {
    const last = progress.data.log.at(-1);
    if (last && last.id === id) last.r = r;
  }
}

function advance(r: Grade = Rating.Good) {
  if (phase.value !== "result") return;
  if (scheduling.value && ok.value && !graded.value) applyGrade(r);
  item.value = props.queue.next(Date.now());
  counts.value = props.queue.counts();
  answer.value = [];
  phase.value = "answer";
  preview.value = null;
  window.scrollTo({ top: 0 });
}

const canRate = computed(() => phase.value === "result" && scheduling.value && ok.value);
const grades = computed(() => {
  const now = Date.now();
  const p = preview.value;
  return [
    { r: Rating.Hard, label: "Hard", key: "1", hint: p ? formatInterval(p[Rating.Hard] - now) : "" },
    { r: Rating.Good, label: "Good", key: "2", hint: p ? formatInterval(p[Rating.Good] - now) : "" },
    { r: Rating.Easy, label: "Easy", key: "3", hint: p ? formatInterval(p[Rating.Easy] - now) : "" },
  ] as const;
});

const nextWaiting = computed(() => {
  counts.value; // refresh with the queue
  const due = props.queue.nextWaitingDue();
  return due ? formatInterval(due - Date.now()) : null;
});

/** "Not for my class": hide the question for good and move on. */
function hideCurrent() {
  const id = item.value?.id;
  if (!id || progress.data.hidden[id]) return;
  progress.toggleHidden(id);
  toast("Question hidden. It will not come up again.", {
    action: { label: "Undo", onClick: () => progress.toggleHidden(id) },
  });
  skip();
}

/** Next card without grading this one. */
function skip() {
  graded.value = true;
  phase.value = "result";
  advance();
}

function exit() {
  router.push(props.exitTo ?? "/");
}

useKeys((key) => {
  if (key === "?") return void (helpOpen.value = true), true;
  if (finished.value) return;
  const id = item.value!.id;
  if (key === "f") return void progress.toggleFlag(id), true;
  if (key === "g") return void german.toggle(), true;
  if (key === "h") return void hideCurrent(), true;
  if (key === "escape") return void exit(), true;
  if (phase.value === "answer") {
    if (key === "enter") return void check(), true;
    return;
  }
  if (key === "enter" || key === "space") return void advance(), true;
  if (canRate.value && (key === "1" || key === "2" || key === "3")) {
    return void advance(grades.value[Number(key) - 1]!.r), true;
  }
});
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4">
    <!-- Top bar -->
    <header class="sticky top-0 z-10 -mx-4 flex h-14 items-center gap-3 bg-background/90 px-4 backdrop-blur">
      <Button variant="ghost" size="icon-sm" aria-label="Exit session (Esc)" @click="exit"><X /></Button>
      <div class="flex-1">
        <Progress v-if="mode === 'practice' && total" :model-value="practiceProgress" class="h-1.5" />
      </div>
      <div v-if="mode === 'review'" class="flex items-center gap-3 text-xs font-medium tabular-nums" aria-label="Cards left">
        <span :class="cn('text-info', item?.kind === 'new' && 'underline underline-offset-4')" title="New">{{ shown.new }}</span>
        <span :class="cn('text-warning', item?.kind === 'learn' && 'underline underline-offset-4')" title="Learning">{{ shown.learn }}</span>
        <span :class="cn('text-success', item?.kind === 'review' && 'underline underline-offset-4')" title="Due">{{ shown.review }}</span>
      </div>
      <span v-else-if="total" class="text-xs text-muted-foreground tabular-nums">{{ Math.min(done.answered, total) }} / {{ total }}</span>
      <Button variant="ghost" size="sm" class="hidden text-muted-foreground sm:inline-flex" @click="helpOpen = true">
        <Kbd>?</Kbd>
      </Button>
    </header>

    <!-- Finished -->
    <section v-if="finished" class="flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
      <div class="flex size-14 items-center justify-center rounded-full bg-muted">
        <PartyPopper v-if="done.answered" class="size-6" />
        <Inbox v-else class="size-6 text-muted-foreground" />
      </div>
      <div class="space-y-1.5">
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ done.answered ? "Session complete" : mode === "review" ? "Nothing due right now" : "No questions here" }}
        </h1>
        <p v-if="done.answered" class="text-muted-foreground tabular-nums">
          {{ done.answered }} answered · {{ Math.round((done.correct / done.answered) * 100) }}% correct ·
          {{ Math.max(1, Math.round((Date.now() - done.startedAt) / 60000)) }} min
        </p>
        <p v-if="nextWaiting" class="text-sm text-muted-foreground">
          {{ queue.size }} learning {{ queue.size === 1 ? "card comes" : "cards come" }} back in {{ nextWaiting }}.
        </p>
        <p v-else-if="mode === 'review' && progress.newLeftToday === 0" class="text-sm text-muted-foreground">
          You reached today's limit of {{ settings.s.newPerDay }} new questions.
        </p>
      </div>
      <div class="flex flex-wrap justify-center gap-2">
        <Button variant="outline" @click="exit">Back</Button>
        <Button v-if="mode === 'review'" @click="emit('more')">Learn 10 more new</Button>
      </div>
    </section>

    <!-- Question -->
    <template v-else-if="question">
      <main class="flex-1 space-y-6 pt-2 pb-40">
        <QuestionToolbar :question="question" @hidden="skip" />
        <QuestionCard
          :key="question.id + ':' + done.answered"
          v-model="answer"
          :question="question"
          :revealed="phase === 'result'"
          :shuffle="settings.s.shuffleOptions"
          :german="german.ready.value"
          @submit="phase === 'answer' ? check() : advance()"
        />

        <section v-if="phase === 'result'" class="space-y-4" aria-live="polite">
          <div
            :class="
              cn(
                'flex items-center gap-2 text-sm font-medium',
                ok ? 'text-success' : 'text-destructive',
              )
            "
          >
            <CircleCheck v-if="ok" class="size-5" />
            <CircleX v-else class="size-5" />
            <span v-if="ok">Correct</span>
            <span v-else>Not quite — {{ question.points }} error points in the exam</span>
            <span v-if="!scheduling" class="ml-auto text-xs font-normal text-muted-foreground">
              Practice only · schedule unchanged
            </span>
          </div>
          <QuestionNotes :question="question" :german="german.ready.value" />
        </section>
      </main>

      <!-- Action bar -->
      <footer
        class="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur"
      >
        <div class="mx-auto flex max-w-2xl gap-2 px-4 pt-3">
          <Button v-if="phase === 'answer'" size="lg" class="h-12 flex-1 text-base" @click="check">
            Check <Kbd class="ml-1 hidden bg-primary-foreground/15 text-primary-foreground sm:inline-flex">↵</Kbd>
          </Button>
          <template v-else-if="canRate">
            <Button
              v-for="g in grades"
              :key="g.r"
              :variant="g.r === Rating.Good ? 'default' : 'outline'"
              size="lg"
              class="h-12 flex-1 flex-col gap-0 text-sm leading-tight"
              @click="advance(g.r)"
            >
              <span>{{ g.label }}</span>
              <span class="text-[11px] font-normal opacity-70 tabular-nums">
                {{ g.hint }}<span class="hidden sm:inline"> · {{ g.key }}</span>
              </span>
            </Button>
          </template>
          <Button v-else size="lg" class="h-12 flex-1 text-base" @click="advance()">
            Continue <Kbd class="ml-1 hidden bg-primary-foreground/15 text-primary-foreground sm:inline-flex">↵</Kbd>
          </Button>
        </div>
      </footer>
    </template>

    <ShortcutsHelp v-model:open="helpOpen" />
  </div>
</template>
