<script setup lang="ts">
import { Bookmark, NotebookPen, Search, SearchX, X } from "@lucide/vue";
import { refDebounced } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  buildIndex,
  isStatusFilter,
  learnState,
  matchesStatus,
  matchesWords,
  parseQuery,
  type LearnState,
  type StatusFilter,
} from "@/lib/search";
import { cn } from "@/lib/utils";
import { useGerman } from "@/composables/useGerman";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";

const PAGE = 50;

const catalog = useCatalog();
const progress = useProgress();
const route = useRoute();
const router = useRouter();
const german = useGerman();

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All statuses",
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
  mistakes: "Mistakes",
  flagged: "Flagged",
  note: "Has note",
  hidden: "Hidden",
};
const STATE_LABELS: Record<LearnState, string> = { new: "New", learning: "Learning", mastered: "Mastered" };
const DOT: Record<LearnState, string> = {
  new: "bg-muted-foreground/40",
  learning: "bg-warning",
  mastered: "bg-success",
};

// Filter state lives in the route query, so Back restores it.
const first = (v: unknown): string => (Array.isArray(v) ? first(v[0]) : typeof v === "string" ? v : "");
const statusFrom = (v: unknown): StatusFilter => (isStatusFilter(first(v)) ? (first(v) as StatusFilter) : "all");

const input = ref(first(route.query.q));
const query = refDebounced(input, 150);
const theme = ref(first(route.query.theme) || "all");
const status = ref<StatusFilter>(statusFrom(route.query.status));
const all = ref(first(route.query.all) === "1");
const limit = ref(PAGE);

watch([query, theme, status, all], () => {
  limit.value = PAGE;
  const q: Record<string, string> = {};
  if (query.value.trim()) q.q = query.value;
  if (theme.value !== "all") q.theme = theme.value;
  if (status.value !== "all") q.status = status.value;
  if (all.value) q.all = "1";
  router.replace({ query: q });
});

// A link to this page with new filters while it is open.
watch(
  () => route.query,
  (rq) => {
    if (route.path !== "/catalog") return;
    if (first(rq.q) !== query.value) input.value = first(rq.q);
    theme.value = first(rq.theme) || "all";
    status.value = statusFrom(rq.status);
    all.value = first(rq.all) === "1";
  },
);

const index = computed(() => buildIndex(catalog.questions, catalog.german));
const words = computed(() => parseQuery(query.value));
const poolIds = computed(() => new Set(progress.pool.map((q) => q.id)));

const results = computed(() => {
  const d = progress.data;
  // Hidden questions are never in the pool, so this filter looks at all questions.
  const everything = all.value || status.value === "hidden";
  return index.value
    .filter(
      (e) =>
        (everything || poolIds.value.has(e.question.id)) &&
        (theme.value === "all" || e.question.theme === theme.value) &&
        matchesWords(e, words.value) &&
        matchesStatus(status.value, {
          card: d.cards[e.question.id],
          last: d.stats[e.question.id]?.last,
          flagged: !!d.flags[e.question.id],
          hasNote: !!d.notes[e.question.id],
          hidden: !!d.hidden[e.question.id],
        }),
    )
    .map((e) => e.question);
});
const shown = computed(() => results.value.slice(0, limit.value));
const filtered = computed(() => !!words.value.length || theme.value !== "all" || status.value !== "all");

function clear() {
  input.value = "";
  theme.value = "all";
  status.value = "all";
}

const textOf = (id: string, fallback: string) => (german.ready.value ? catalog.german?.[id]?.text : undefined) ?? fallback;
</script>

<template>
  <div class="space-y-6">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Questions</h1>
      <p class="text-sm text-muted-foreground tabular-nums">
        {{ catalog.questions.length.toLocaleString() }} questions in the catalogue,
        {{ progress.pool.length.toLocaleString() }} in your study pool.
      </p>
    </header>

    <div class="space-y-3">
      <div class="relative">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="input"
          type="search"
          inputmode="search"
          autocomplete="off"
          placeholder="Search id, question or answer text"
          aria-label="Search questions"
          class="h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          v-if="input"
          type="button"
          class="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
          @click="input = ''"
        >
          <X class="size-4" />
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Select v-model="theme">
          <SelectTrigger class="w-full sm:w-56" aria-label="Theme"><SelectValue placeholder="All themes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All themes</SelectItem>
            <SelectItem v-for="t in catalog.themes" :key="t.id" :value="t.id">{{ t.id }} {{ t.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Select :model-value="status" @update:model-value="(v) => (status = statusFrom(v))">
          <SelectTrigger class="w-full sm:w-40" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="(label, key) in STATUS_LABELS" :key="key" :value="key">{{ label }}</SelectItem>
          </SelectContent>
        </Select>
        <div class="flex items-center gap-2">
          <Switch id="all" v-model="all" />
          <Label for="all" class="text-sm font-normal">Include hidden and disabled</Label>
        </div>
      </div>
    </div>

    <p class="text-sm text-muted-foreground tabular-nums" aria-live="polite">
      {{ results.length.toLocaleString() }} {{ results.length === 1 ? "question" : "questions" }}
    </p>

    <Empty v-if="!results.length" class="border">
      <EmptyHeader>
        <EmptyMedia variant="icon"><SearchX /></EmptyMedia>
        <EmptyTitle>No questions match</EmptyTitle>
        <EmptyDescription>
          {{ filtered ? "Try other words or remove a filter." : "Your study pool is empty. Check the topics in Settings." }}
        </EmptyDescription>
      </EmptyHeader>
      <Button v-if="filtered" variant="outline" size="sm" @click="clear">Clear filters</Button>
    </Empty>

    <template v-else>
      <ul class="divide-y rounded-lg border">
        <li v-for="q in shown" :key="q.id">
          <RouterLink :to="`/q/${q.id}`" class="block space-y-1 px-4 py-3 transition-colors hover:bg-muted/50">
            <div class="flex items-center gap-x-3 text-xs text-muted-foreground tabular-nums">
              <span class="font-mono">{{ q.id }}</span>
              <span>{{ q.points }} pts</span>
              <span class="flex items-center gap-1.5">
                <span :class="cn('size-1.5 rounded-full', DOT[learnState(progress.data.cards[q.id])])" />
                {{ STATE_LABELS[learnState(progress.data.cards[q.id])] }}
              </span>
              <span v-if="progress.data.stats[q.id]?.last === 0" class="text-destructive">Last wrong</span>
              <span v-if="progress.data.hidden[q.id]">Hidden</span>
              <span class="ml-auto flex items-center gap-2">
                <NotebookPen v-if="progress.data.notes[q.id]" class="size-3.5" aria-label="Has note" />
                <Bookmark v-if="progress.data.flags[q.id]" class="size-3.5 fill-current text-warning" aria-label="Flagged" />
              </span>
            </div>
            <p class="line-clamp-2 text-sm leading-snug" :lang="german.ready.value ? 'de' : 'en'">
              {{ textOf(q.id, q.text) }}
            </p>
          </RouterLink>
        </li>
      </ul>

      <div v-if="results.length > shown.length" class="flex justify-center">
        <Button variant="outline" @click="limit += PAGE">
          Show more
          <span class="text-muted-foreground tabular-nums">({{ results.length - shown.length }} left)</span>
        </Button>
      </div>
    </template>
  </div>
</template>
