<script setup lang="ts">
import { ChevronDown, FileQuestion } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import QuestionCard from "@/components/QuestionCard.vue";
import QuestionNotes from "@/components/QuestionNotes.vue";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { formatClock } from "@/lib/date";
import { EXAM_RULES } from "@/lib/exam";
import { splitErrorPoints } from "@/lib/examRun";
import type { Answer } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useGerman } from "@/composables/useGerman";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";

const route = useRoute();
const catalog = useCatalog();
const progress = useProgress();
const german = useGerman();

const exam = computed(() => progress.data.exams.find((e) => e.id === route.params.id && e.score));
const score = computed(() => exam.value?.score);
const questions = computed(() => (exam.value?.questions ?? []).flatMap((id) => catalog.get(id) ?? []));
const wrong = computed(() => new Set(score.value?.wrong ?? []));

const split = computed(() => splitErrorPoints(questions.value, score.value?.wrong ?? []));
const used = computed(() => {
  const e = exam.value;
  return e?.finishedAt ? formatClock(e.finishedAt - e.startedAt) : "-";
});

const showAll = ref(false);
const list = computed(() => (showAll.value ? questions.value : questions.value.filter((q) => wrong.value.has(q.id))));
const open = ref<Set<string>>(new Set());
function toggle(id: string) {
  const next = new Set(open.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  open.value = next;
}

const answerOf = (id: string): Answer => exam.value?.answers[id] ?? [];
const practiceLink = computed(
  () => `/practice/run?mode=ids&ids=${(score.value?.wrong ?? []).join(",")}&from=exam&exam=${exam.value?.id}`,
);
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const stats = computed(() => [
  { label: "Error points", value: `${score.value!.errorPoints} of ${EXAM_RULES.maxErrorPoints} allowed` },
  { label: "Total points", value: String(score.value!.maxPoints) },
  { label: "Wrong 5-point questions", value: String(score.value!.fivePointWrong) },
  { label: "Time used", value: `${used.value} of ${exam.value!.minutes}:00` },
  { label: "Basic errors", value: `${split.value.basic} points` },
  { label: "Class errors", value: `${split.value.additional} points` },
]);
</script>

<template>
  <Empty v-if="!exam || !score" class="border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><FileQuestion /></EmptyMedia>
      <EmptyTitle>Exam not found</EmptyTitle>
      <EmptyDescription>This result does not exist on this device.</EmptyDescription>
    </EmptyHeader>
    <Button as-child variant="outline"><RouterLink to="/exam">Back to exam</RouterLink></Button>
  </Empty>

  <div v-else class="space-y-8">
    <header class="space-y-1">
      <h1 :class="cn('text-2xl font-semibold tracking-tight', score.passed ? 'text-success' : 'text-destructive')">
        {{ score.passed ? "Passed" : "Failed" }}
      </h1>
      <p class="text-sm text-muted-foreground tabular-nums">{{ dateFmt.format(exam.startedAt) }}</p>
      <p v-if="!score.passed && score.fivePointWrong >= 2 && score.errorPoints <= EXAM_RULES.maxErrorPoints" class="text-sm text-muted-foreground">
        Two wrong 5-point questions fail the exam.
      </p>
    </header>

    <dl class="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
      <div v-for="s in stats" :key="s.label" class="bg-background p-3 sm:p-4">
        <dt class="text-xs text-muted-foreground">{{ s.label }}</dt>
        <dd class="mt-1 text-sm font-medium tabular-nums">{{ s.value }}</dd>
      </div>
    </dl>

    <div class="flex flex-wrap gap-2">
      <Button v-if="score.wrong.length" as-child size="lg" class="h-11">
        <RouterLink :to="practiceLink">
          Practice these {{ score.wrong.length }} {{ score.wrong.length === 1 ? "mistake" : "mistakes" }}
        </RouterLink>
      </Button>
      <Button as-child variant="outline" size="lg" class="h-11"><RouterLink to="/exam">New exam</RouterLink></Button>
    </div>

    <section class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-medium text-muted-foreground tabular-nums">
          {{ showAll ? `All ${questions.length} questions` : `Wrong questions (${score.wrong.length})` }}
        </h2>
        <label class="flex items-center gap-2 text-sm text-muted-foreground">
          Show all {{ questions.length }}
          <Switch v-model="showAll" />
        </label>
      </div>

      <p v-if="!list.length" class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No mistakes. Every answer was correct.
      </p>
      <ul v-else class="divide-y rounded-lg border">
        <li v-for="q in list" :key="q.id">
          <button
            type="button"
            class="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 sm:px-4"
            :aria-expanded="open.has(q.id)"
            @click="toggle(q.id)"
          >
            <div class="min-w-0 flex-1 space-y-1">
              <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular-nums">
                <span class="font-mono">{{ q.id }}</span>
                <span aria-hidden="true">·</span>
                <span class="font-medium text-foreground">{{ q.points }} pts</span>
                <template v-if="showAll">
                  <span aria-hidden="true">·</span>
                  <span :class="wrong.has(q.id) ? 'text-destructive' : 'text-success'">
                    {{ wrong.has(q.id) ? "Wrong" : "Correct" }}
                  </span>
                </template>
              </p>
              <p class="text-sm leading-snug text-pretty">{{ q.text }}</p>
            </div>
            <ChevronDown :class="cn('mt-1 size-4 shrink-0 text-muted-foreground transition-transform', open.has(q.id) && 'rotate-180')" />
          </button>
          <div v-if="open.has(q.id)" class="space-y-5 border-t bg-muted/20 p-4">
            <QuestionCard
              :model-value="answerOf(q.id)"
              :question="q"
              :revealed="true"
              :keyboard="false"
              :german="german.ready.value"
            />
            <QuestionNotes :question="q" :german="german.ready.value" />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
