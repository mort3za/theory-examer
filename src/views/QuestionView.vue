<script setup lang="ts">
import { ArrowLeft, ChevronLeft, ChevronRight, CircleHelp, Play } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import QuestionCard from "@/components/QuestionCard.vue";
import QuestionNotes from "@/components/QuestionNotes.vue";
import QuestionToolbar from "@/components/QuestionToolbar.vue";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { isAnswered, isCorrect } from "@/lib/answer";
import { formatInterval } from "@/lib/date";
import { State } from "@/lib/srs";
import type { Answer } from "@/lib/types";
import { useGerman } from "@/composables/useGerman";
import { useKeys } from "@/composables/useKeys";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";

const catalog = useCatalog();
const progress = useProgress();
const settings = useSettings();
const route = useRoute();
const router = useRouter();
const german = useGerman();

const question = computed(() => catalog.get(String(route.params.id)));
const theme = computed(() => (question.value ? catalog.themeById.get(question.value.theme) : undefined));
const chapter = computed(() => (question.value ? catalog.chapterById.get(question.value.chapter) : undefined));

// Self-test: local only, nothing is recorded.
const answer = ref<Answer>([]);
const revealed = ref(false);
watch(
  () => question.value?.id,
  reset,
);

const answered = computed(() => !!question.value && isAnswered(question.value, answer.value));
const right = computed(() => !!question.value && isCorrect(question.value, answer.value));

function reset() {
  answer.value = [];
  revealed.value = false;
}

function showAnswer() {
  if (!question.value) return;
  answer.value = [...question.value.correct];
  revealed.value = true;
}

// Neighbours in the same chapter, in catalog order.
const siblings = computed(() =>
  question.value ? catalog.questions.filter((q) => q.chapter === question.value!.chapter) : [],
);
const position = computed(() => siblings.value.findIndex((q) => q.id === question.value?.id));
const prev = computed(() => siblings.value[position.value - 1]);
const next = computed(() => siblings.value[position.value + 1]);

const go = (id: string) => router.push(`/q/${id}`);
const practice = () => router.push({ path: "/practice/run", query: { mode: "ids", ids: question.value!.id } });
const back = () => (window.history.state?.back ? router.back() : router.push("/catalog"));

useKeys((key) => {
  if (key === "arrowleft" && prev.value) go(prev.value.id);
  else if (key === "arrowright" && next.value) go(next.value.id);
  else return;
  return true;
});

const notice = computed(() => {
  if (!question.value) return "";
  const parts: string[] = [];
  if (settings.disabled.has(question.value.chapter)) parts.push("Its chapter is turned off in Settings.");
  if (progress.data.hidden[question.value.id]) parts.push("You hid this question.");
  return parts.length ? `${parts.join(" ")} It does not appear in review or practice sets.` : "";
});

// Stats
const STATE_LABELS: Record<State, string> = {
  [State.New]: "New",
  [State.Learning]: "Learning",
  [State.Review]: "Review",
  [State.Relearning]: "Relearning",
};
const stats = computed(() => {
  const id = question.value?.id;
  if (!id) return [];
  const now = Date.now();
  const card = progress.data.cards[id];
  const st = progress.data.stats[id];
  const started = !!card && card.state !== State.New;
  const recall = progress.recall(id, now);
  const dash = "–";
  return [
    ["Attempts", st?.seen ? String(st.seen) : "0"],
    ["Correct", st?.seen ? `${Math.round((st.ok / st.seen) * 100)}%` : dash],
    [
      "Last result",
      st?.lastAt ? `${st.last ? "Correct" : "Wrong"}, ${formatInterval(now - st.lastAt)} ago` : dash,
    ],
    ["FSRS state", STATE_LABELS[card?.state ?? State.New]],
    [
      "Next review",
      started && card ? (card.due <= now ? "Due now" : `in ${formatInterval(card.due - now)}`) : dash,
    ],
    ["Stability", started && card ? `${card.stability.toFixed(1)} days` : dash],
    ["Difficulty", started && card ? card.difficulty.toFixed(1) : dash],
    ["Recall now", recall === undefined ? dash : `${Math.round(recall * 100)}%`],
  ] as [string, string][];
});
</script>

<template>
  <Empty v-if="!question" class="border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><CircleHelp /></EmptyMedia>
      <EmptyTitle>Question not found</EmptyTitle>
      <EmptyDescription>There is no question with the id {{ route.params.id }}.</EmptyDescription>
    </EmptyHeader>
    <Button variant="outline" size="sm" @click="router.push('/catalog')">Browse questions</Button>
  </Empty>

  <div v-else class="space-y-6">
    <div class="space-y-2">
      <Button variant="ghost" size="sm" class="-ml-2.5 text-muted-foreground" @click="back">
        <ArrowLeft /> Back
      </Button>
      <p class="text-xs text-muted-foreground">
        {{ theme?.id }} {{ theme?.name }} <span aria-hidden="true">›</span> {{ chapter?.id }} {{ chapter?.name }}
      </p>
    </div>

    <p v-if="notice" class="text-sm text-muted-foreground">{{ notice }}</p>

    <section class="space-y-5">
      <QuestionToolbar :question="question" />
      <QuestionCard v-model="answer" :question="question" :revealed="revealed" :german="german.on.value" />

      <div class="flex flex-wrap items-center gap-2">
        <Button :disabled="revealed || !answered" @click="revealed = true">Check</Button>
        <Button variant="outline" :disabled="revealed" @click="showAnswer">Show answer</Button>
        <Button variant="ghost" :disabled="!revealed && !answer.length" @click="reset">
          Reset
        </Button>
        <p v-if="revealed && answered" class="text-sm font-medium" :class="right ? 'text-success' : 'text-destructive'">
          {{ right ? "Correct" : "Wrong" }}
        </p>
      </div>
      <p class="text-xs text-muted-foreground">Self-test only. Nothing here is saved to your progress.</p>

      <QuestionNotes :question="question" :german="german.on.value" :explanation="revealed" />
    </section>

    <Separator />

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Stats</h2>
      <dl class="divide-y rounded-lg border text-sm">
        <div v-for="[label, value] in stats" :key="label" class="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt class="text-muted-foreground">{{ label }}</dt>
          <dd class="font-medium tabular-nums">{{ value }}</dd>
        </div>
      </dl>
    </section>

    <div class="flex flex-wrap items-center gap-2">
      <Button variant="outline" @click="practice"><Play /> Practice this</Button>
      <div class="ml-auto flex items-center gap-2">
        <span class="text-xs text-muted-foreground tabular-nums">{{ position + 1 }} / {{ siblings.length }}</span>
        <Button variant="outline" size="icon" :disabled="!prev" aria-label="Previous question (Left arrow)" @click="prev && go(prev.id)">
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" :disabled="!next" aria-label="Next question (Right arrow)" @click="next && go(next.id)">
          <ChevronRight />
        </Button>
      </div>
    </div>
  </div>
</template>
