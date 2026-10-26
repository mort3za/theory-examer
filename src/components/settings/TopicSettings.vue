<script setup lang="ts">
import { ChevronRight } from "@lucide/vue";
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCatalog } from "@/stores/catalog";
import { NOT_CLASS_B_CHAPTERS, useSettings } from "@/stores/settings";
import { useProgress } from "@/stores/progress";

const catalog = useCatalog();
const settings = useSettings();
const progress = useProgress();

const themes = computed(() =>
  catalog.themes.map((t) => {
    const chapters = catalog.chapters.filter((c) => c.theme === t.id);
    const on = chapters.filter((c) => !settings.disabled.has(c.id));
    return {
      ...t,
      chapters,
      enabled: on.length,
      questions: on.reduce((n, c) => n + c.count, 0),
      state: (on.length === 0 ? false : on.length === chapters.length ? true : "indeterminate") as boolean | "indeterminate",
    };
  }),
);
const hiddenCount = computed(() => Object.keys(progress.data.hidden).length);

function toggleTheme(chapters: { id: string }[], on: boolean) {
  for (const c of chapters) settings.setChapter(c.id, on);
}
const classB = () => (settings.s.disabledChapters = [...NOT_CLASS_B_CHAPTERS]);
const enableAll = () => (settings.s.disabledChapters = []);
</script>

<template>
  <div class="space-y-3 py-4">
    <div class="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" @click="classB">Class B preset</Button>
      <Button variant="outline" size="sm" @click="enableAll">Enable all</Button>
    </div>
    <p class="text-sm text-pretty text-muted-foreground">
      Turned-off chapters never appear in review, practice or exams. The source data has no license class, so the
      class B preset is a best guess. Review it before you rely on it.
    </p>
    <p class="text-sm text-muted-foreground tabular-nums">
      <template v-if="hiddenCount">
        {{ hiddenCount }} hidden {{ hiddenCount === 1 ? "question" : "questions" }}.
        <RouterLink
          to="/catalog?status=hidden&all=1"
          class="text-foreground underline underline-offset-4"
        >
          Show them
        </RouterLink>
      </template>
      <template v-else>No hidden questions.</template>
    </p>
  </div>

  <Collapsible v-for="t in themes" :key="t.id" v-slot="{ open }">
    <div class="flex items-center gap-3 py-3">
      <Checkbox
        :model-value="t.state"
        :aria-label="`Turn all chapters of ${t.name} on or off`"
        @update:model-value="toggleTheme(t.chapters, t.state !== true)"
      />
      <CollapsibleTrigger class="flex flex-1 items-center gap-3 text-left">
        <span class="w-8 font-mono text-xs text-muted-foreground">{{ t.id }}</span>
        <span class="flex-1 text-sm font-medium">{{ t.name }}</span>
        <span class="text-xs text-muted-foreground tabular-nums">
          {{ t.enabled }}/{{ t.chapters.length }} chapters, {{ t.questions }} questions
        </span>
        <ChevronRight :class="['size-4 text-muted-foreground transition-transform', open && 'rotate-90']" />
      </CollapsibleTrigger>
    </div>
    <CollapsibleContent>
      <ul class="pb-2">
        <li v-for="c in t.chapters" :key="c.id">
          <label class="flex cursor-pointer items-center gap-3 rounded py-2 pl-8 hover:bg-muted/40">
            <Checkbox
              :model-value="!settings.disabled.has(c.id)"
              @update:model-value="(v) => settings.setChapter(c.id, v === true)"
            />
            <span class="w-14 font-mono text-xs text-muted-foreground">{{ c.id }}</span>
            <span class="flex-1 text-sm">{{ c.name }}</span>
            <span class="text-xs text-muted-foreground tabular-nums">{{ c.count }}</span>
          </label>
        </li>
      </ul>
    </CollapsibleContent>
  </Collapsible>
</template>
