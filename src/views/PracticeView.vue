<script setup lang="ts">
import { AlertCircle, Bookmark, ChevronRight, Flame, Shuffle, TrendingDown } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { selectPractice, type PracticeMode } from "@/lib/practice";
import { isMature } from "@/lib/srs";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";

const catalog = useCatalog();
const progress = useProgress();
const router = useRouter();

const count = (mode: PracticeMode) =>
  selectPractice({
    pool: progress.pool,
    mode,
    last: (id) => progress.data.stats[id]?.last,
    flagged: (id) => !!progress.data.flags[id],
    recall: (id) => progress.recall(id),
  }).length;

const quick = computed(() => [
  { mode: "mistakes", icon: AlertCircle, title: "My mistakes", desc: "Last answer was wrong", n: count("mistakes") },
  { mode: "weak", icon: TrendingDown, title: "Weak questions", desc: "Low chance to remember now", n: count("weak") },
  { mode: "points", icon: Flame, title: "High points", desc: "4 and 5 point questions not yet solid", n: count("points") },
  { mode: "flagged", icon: Bookmark, title: "Flagged", desc: "Questions you bookmarked", n: count("flagged") },
  { mode: "random", icon: Shuffle, title: "Random 20", desc: "A quick mixed set", n: Math.min(20, progress.pool.length) },
]);

function start(mode: string, extra: Record<string, string> = {}) {
  router.push({ path: "/practice/run", query: { mode, ...(mode === "random" ? { n: "20" } : {}), ...extra } });
}

// Topic picker
const poolByChapter = computed(() => {
  const m = new Map<string, string[]>();
  for (const q of progress.pool) {
    const l = m.get(q.chapter) ?? [];
    l.push(q.id);
    m.set(q.chapter, l);
  }
  return m;
});
const themes = computed(() =>
  catalog.themes
    .map((t) => ({
      ...t,
      chapters: catalog.chapters.filter((c) => c.theme === t.id && poolByChapter.value.has(c.id)),
    }))
    .filter((t) => t.chapters.length),
);
const mastered = (chapter: string) => {
  const ids = poolByChapter.value.get(chapter) ?? [];
  const n = ids.filter((id) => {
    const c = progress.data.cards[id];
    return c && isMature(c);
  }).length;
  return { n, total: ids.length };
};

const selected = ref<Set<string>>(new Set());
const size = ref("20");
const random = ref(true);

const selectedCount = computed(() =>
  [...selected.value].reduce((s, ch) => s + (poolByChapter.value.get(ch)?.length ?? 0), 0),
);
function toggleChapter(id: string, on: boolean) {
  const s = new Set(selected.value);
  if (on) s.add(id);
  else s.delete(id);
  selected.value = s;
}
function themeState(t: { chapters: { id: string }[] }): boolean | "indeterminate" {
  const n = t.chapters.filter((c) => selected.value.has(c.id)).length;
  return n === 0 ? false : n === t.chapters.length ? true : "indeterminate";
}
function toggleTheme(t: { chapters: { id: string }[] }) {
  const on = themeState(t) !== true;
  const s = new Set(selected.value);
  for (const c of t.chapters) on ? s.add(c.id) : s.delete(c.id);
  selected.value = s;
}
function startTopics() {
  start("chapters", {
    ids: [...selected.value].join(","),
    ...(size.value !== "all" ? { n: size.value } : {}),
    ...(random.value ? { random: "1" } : {}),
  });
}
</script>

<template>
  <div class="space-y-10">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Practice</h1>
      <p class="text-sm text-muted-foreground">
        Focused sets. New and due questions you answer here also count for your review schedule.
      </p>
    </header>

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Quick sets</h2>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="m in quick"
          :key="m.mode"
          type="button"
          :disabled="!m.n"
          class="group flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
          @click="start(m.mode)"
        >
          <component :is="m.icon" class="size-5 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ m.title }}</span>
            <span class="block truncate text-xs text-muted-foreground">{{ m.desc }}</span>
          </span>
          <span class="text-sm text-muted-foreground tabular-nums">{{ m.n }}</span>
          <ChevronRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <div class="flex items-end justify-between gap-4">
        <h2 class="text-sm font-medium text-muted-foreground">By topic</h2>
        <button
          v-if="selected.size"
          type="button"
          class="text-xs text-muted-foreground hover:text-foreground"
          @click="selected = new Set()"
        >
          Clear selection
        </button>
      </div>

      <div class="divide-y rounded-lg border">
        <Collapsible v-for="t in themes" :key="t.id" v-slot="{ open }">
          <div class="flex items-center gap-3 px-4 py-3">
            <Checkbox
              :model-value="themeState(t)"
              :aria-label="`Select all of ${t.name}`"
              @update:model-value="toggleTheme(t)"
            />
            <CollapsibleTrigger class="flex flex-1 items-center gap-3 text-left">
              <span class="w-8 font-mono text-xs text-muted-foreground">{{ t.id }}</span>
              <span class="flex-1 text-sm font-medium">{{ t.name }}</span>
              <span class="text-xs text-muted-foreground tabular-nums">
                {{ t.chapters.reduce((s, c) => s + (poolByChapter.get(c.id)?.length ?? 0), 0) }}
              </span>
              <ChevronRight :class="['size-4 text-muted-foreground transition-transform', open && 'rotate-90']" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ul class="pb-2">
              <li v-for="c in t.chapters" :key="c.id">
                <label class="flex cursor-pointer items-center gap-3 py-2 pr-4 pl-11 hover:bg-muted/40">
                  <Checkbox
                    :model-value="selected.has(c.id)"
                    @update:model-value="(v) => toggleChapter(c.id, v === true)"
                  />
                  <span class="w-14 font-mono text-xs text-muted-foreground">{{ c.id }}</span>
                  <span class="flex-1 text-sm">{{ c.name }}</span>
                  <span class="text-xs text-muted-foreground tabular-nums">
                    {{ mastered(c.id).n }}/{{ mastered(c.id).total }}
                  </span>
                </label>
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <p class="text-xs text-muted-foreground">Numbers on chapters: mastered / total questions.</p>
    </section>

    <!-- Start bar for topic practice -->
    <div
      v-if="selected.size"
      class="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4"
    >
      <span class="text-sm tabular-nums">
        <span class="font-medium">{{ selectedCount }}</span>
        <span class="text-muted-foreground"> questions</span>
      </span>
      <ToggleGroup v-model="size" type="single" variant="outline" size="sm" aria-label="Session size">
        <ToggleGroupItem value="10">10</ToggleGroupItem>
        <ToggleGroupItem value="20">20</ToggleGroupItem>
        <ToggleGroupItem value="50">50</ToggleGroupItem>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
      </ToggleGroup>
      <div class="flex items-center gap-2">
        <Switch id="random" v-model="random" />
        <Label for="random" class="text-sm font-normal">Shuffle</Label>
      </div>
      <Button class="ml-auto" @click="startTopics">Start</Button>
    </div>
  </div>
</template>
