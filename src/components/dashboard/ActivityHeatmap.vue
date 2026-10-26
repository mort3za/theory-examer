<script setup lang="ts">
import type { HeatCell } from "@/lib/stats";

defineProps<{ columns: (HeatCell | null)[][] }>();

const shade = ["bg-muted", "bg-foreground/20", "bg-foreground/40", "bg-foreground/65", "bg-foreground"] as const;
const rows = ["Mon", "", "Wed", "", "Fri", "", ""];

const title = (c: HeatCell) =>
  `${new Date(`${c.key}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}: ${c.n} ${c.n === 1 ? "answer" : "answers"}`;
</script>

<template>
  <div class="flex gap-2 rounded-lg border p-4">
    <div class="grid shrink-0 grid-rows-7 gap-1 text-[10px] text-muted-foreground" aria-hidden="true">
      <span v-for="(r, i) in rows" :key="i" class="flex items-center">{{ r }}</span>
    </div>
    <div
      class="grid flex-1 grid-flow-col grid-rows-7 gap-1"
      :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1.25rem))` }"
    >
      <template v-for="(col, ci) in columns" :key="ci">
        <template v-for="(c, ri) in col" :key="ri">
          <div v-if="c" :title="title(c)" :class="['aspect-square rounded-[3px]', shade[c.level]]" />
          <div v-else class="aspect-square" />
        </template>
      </template>
    </div>
  </div>
</template>
