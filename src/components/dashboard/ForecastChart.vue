<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ counts: number[]; labels: string[] }>();
const max = computed(() => Math.max(1, ...props.counts));
</script>

<template>
  <div class="flex h-full min-h-40 items-end gap-2 rounded-lg border p-4 pb-3">
    <div v-for="(n, i) in counts" :key="i" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
      <span class="text-xs text-muted-foreground tabular-nums">{{ n }}</span>
      <div class="flex w-full flex-1 items-end">
        <div
          class="w-full rounded-sm bg-foreground/70"
          :class="n === 0 && 'bg-muted'"
          :style="{ height: n ? `${Math.max(4, (n / max) * 100)}%` : '2px' }"
        />
      </div>
      <span class="text-xs text-muted-foreground">{{ labels[i] }}</span>
    </div>
  </div>
</template>
