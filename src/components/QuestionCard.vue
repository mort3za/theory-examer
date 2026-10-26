<script setup lang="ts">
import { Check, Minus, X } from "@lucide/vue";
import { computed, nextTick, ref, watch } from "vue";
import { Input } from "@/components/ui/input";
import { isCorrect, isNumeric } from "@/lib/answer";
import { hash, seeded, shuffle } from "@/lib/random";
import type { Answer, Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useKeys } from "@/composables/useKeys";
import { useCatalog } from "@/stores/catalog";
import QuestionMedia from "./QuestionMedia.vue";

const props = withDefaults(
  defineProps<{
    question: Question;
    revealed?: boolean;
    shuffle?: boolean;
    german?: boolean;
    /** Listen to A/B/C keys. */
    keyboard?: boolean;
    playLimit?: number;
    plays?: number;
    /** Shuffle seed; keep it stable to show the same order again (exam). New random order per question by default. */
    seed?: number;
  }>(),
  { revealed: false, shuffle: false, german: false, keyboard: true },
);
const emit = defineEmits<{ submit: []; play: [] }>();
const answer = defineModel<Answer>({ required: true });

const catalog = useCatalog();
const LETTERS = ["A", "B", "C", "D"];

const localSeed = ref(0);
watch(
  () => props.question.id,
  () => (localSeed.value = Math.floor(Math.random() * 2 ** 31)),
  { immediate: true },
);

const de = computed(() => (props.german ? catalog.german?.[props.question.id] : undefined));
const text = computed(() => de.value?.text ?? props.question.text);

/** Options in display order, with their text in the current language. */
const options = computed(() => {
  const list = props.question.options.map((o, i) => ({ ...o, text: de.value?.options[i] ?? o.text }));
  return props.shuffle ? shuffle(list, seeded(hash(props.question.id) ^ (props.seed ?? localSeed.value))) : list;
});

const numeric = computed(() => isNumeric(props.question));
const correctSet = computed(() => new Set(props.question.correct));
const right = computed(() => isCorrect(props.question, answer.value));

function toggle(key: string) {
  if (props.revealed) return;
  const set = new Set(answer.value);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  answer.value = props.question.options.map((o) => o.key).filter((k) => set.has(k));
}

type OptionState = "idle" | "selected" | "correct" | "wrong" | "missed" | "neutral";
function stateOf(key: string): OptionState {
  const picked = answer.value.includes(key);
  if (!props.revealed) return picked ? "selected" : "idle";
  if (correctSet.value.has(key)) return picked ? "correct" : "missed";
  return picked ? "wrong" : "neutral";
}

const rowClass: Record<OptionState, string> = {
  idle: "border-border hover:border-foreground/30 hover:bg-muted/50",
  selected: "border-foreground bg-muted/60 ring-1 ring-foreground",
  correct: "border-success bg-success/10 ring-1 ring-success",
  missed: "border-success border-dashed bg-success/5",
  wrong: "border-destructive bg-destructive/10 ring-1 ring-destructive",
  neutral: "border-border opacity-60",
};

const numInput = ref<InstanceType<typeof Input> | null>(null);
const numValue = computed({
  get: () => answer.value[0] ?? "",
  set: (v: string | number) => (answer.value = [String(v)]),
});

watch(
  () => props.question.id,
  async () => {
    if (!numeric.value || props.revealed) return;
    await nextTick();
    (numInput.value?.$el as HTMLInputElement | undefined)?.focus?.();
  },
  { immediate: true },
);

useKeys((key) => {
  if (!props.keyboard || props.revealed || numeric.value) return;
  const i = LETTERS.indexOf(key.toUpperCase());
  const opt = options.value[i];
  if (opt) {
    toggle(opt.key);
    return true;
  }
});
</script>

<template>
  <div class="space-y-5">
    <h2 class="text-lg leading-snug font-medium text-pretty sm:text-xl" :lang="de ? 'de' : 'en'">{{ text }}</h2>

    <QuestionMedia
      :images="question.images"
      :videos="question.videos"
      :play-limit="playLimit"
      :plays="plays"
      @play="emit('play')"
    />

    <!-- Number input -->
    <div v-if="numeric" class="space-y-2">
      <label :for="`num-${question.id}`" class="text-sm text-muted-foreground">Type the number</label>
      <div class="flex items-center gap-3">
        <Input
          :id="`num-${question.id}`"
          ref="numInput"
          v-model="numValue"
          inputmode="decimal"
          autocomplete="off"
          :disabled="revealed"
          :class="
            cn(
              'h-12 max-w-40 text-lg tabular-nums',
              revealed && (right ? 'border-success ring-1 ring-success' : 'border-destructive ring-1 ring-destructive'),
            )
          "
          @keydown.enter.prevent="emit('submit')"
        />
        <p v-if="revealed && !right" class="text-sm">
          Correct: <span class="font-semibold tabular-nums">{{ question.correct[0] }}</span>
        </p>
      </div>
    </div>

    <!-- Multiple choice -->
    <div v-else class="space-y-2" role="group" aria-label="Answers">
      <p class="text-xs text-muted-foreground">One or more answers are correct.</p>
      <button
        v-for="(o, i) in options"
        :key="o.key"
        type="button"
        role="checkbox"
        :aria-checked="answer.includes(o.key)"
        :disabled="revealed"
        :class="
          cn(
            'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors sm:p-3.5 disabled:cursor-default',
            rowClass[stateOf(o.key)],
          )
        "
        @click="toggle(o.key)"
      >
        <span
          :class="
            cn(
              'mt-px flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium tabular-nums transition-colors',
              stateOf(o.key) === 'selected' && 'border-foreground bg-foreground text-background',
              stateOf(o.key) === 'correct' && 'border-success bg-success text-success-foreground',
              stateOf(o.key) === 'wrong' && 'border-destructive bg-destructive text-white',
              stateOf(o.key) === 'missed' && 'border-success text-success',
            )
          "
        >
          <Check v-if="stateOf(o.key) === 'correct'" class="size-3.5" :stroke-width="3" />
          <X v-else-if="stateOf(o.key) === 'wrong'" class="size-3.5" :stroke-width="3" />
          <Minus v-else-if="stateOf(o.key) === 'missed'" class="size-3.5" :stroke-width="3" />
          <template v-else>{{ LETTERS[i] }}</template>
        </span>
        <span class="flex-1 leading-snug" :lang="de ? 'de' : 'en'">{{ o.text }}</span>
        <span v-if="stateOf(o.key) === 'missed'" class="shrink-0 text-xs font-medium text-success">Missed</span>
      </button>
    </div>
  </div>
</template>
