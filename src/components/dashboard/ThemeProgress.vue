<script setup lang="ts">
import { computed } from "vue";
import type { ThemeCounts } from "@/lib/stats";

const props = defineProps<{ rows: { id: string; name: string; counts: ThemeCounts }[] }>();

const pct = (n: number, total: number) => `${total ? (n / total) * 100 : 0}%`;

// Same theme names exist in basic (1.x) and class material (2.x): show them as two groups.
const groups = computed(() =>
  [
    { label: "Basic material", rows: props.rows.filter((r) => r.id.startsWith("1.")) },
    { label: "Class material", rows: props.rows.filter((r) => !r.id.startsWith("1.")) },
  ].filter((g) => g.rows.length),
);
</script>

<template>
  <div class="grid gap-3 lg:grid-cols-2">
    <div v-for="g in groups" :key="g.label" class="min-w-0 rounded-lg border">
      <p class="border-b px-4 py-2 text-xs font-medium text-muted-foreground">{{ g.label }}</p>
      <ul class="py-1">
        <li
          v-for="r in g.rows"
          :key="r.id"
          class="flex items-center gap-3 px-4 py-2"
          :title="`${r.counts.mature} mature · ${r.counts.learning} learning · ${r.counts.fresh} new`"
        >
          <span class="w-7 shrink-0 font-mono text-xs text-muted-foreground">{{ r.id }}</span>
          <span class="min-w-0 flex-1 truncate text-sm">{{ r.name }}</span>
          <div
            class="flex h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-muted sm:w-28"
            role="img"
            :aria-label="`${r.counts.mature} mature, ${r.counts.learning} learning, ${r.counts.fresh} new`"
          >
            <div class="bg-foreground" :style="{ width: pct(r.counts.mature, r.counts.total) }" />
            <div class="bg-foreground/35" :style="{ width: pct(r.counts.learning, r.counts.total) }" />
          </div>
          <span class="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
            {{ r.counts.mature }}/{{ r.counts.total }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>
