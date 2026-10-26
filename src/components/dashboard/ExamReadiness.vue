<script setup lang="ts">
import { ChevronRight } from "@lucide/vue";
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAM_RULES } from "@/lib/exam";
import { readinessLabel } from "@/lib/stats";

export interface RecentExam {
  id: string;
  passed: boolean;
  errorPoints: number;
  at: number;
}

const props = defineProps<{ errorPoints: number | null; coverage: number; exams: RecentExam[] }>();

const SCALE = 30;
const label = computed(() => (props.errorPoints === null ? null : readinessLabel(props.errorPoints)));
const tone = computed(() =>
  label.value === "Ready" ? "text-success" : label.value === "Almost" ? "text-warning" : "text-destructive",
);
const fill = computed(() =>
  label.value === "Ready" ? "bg-success" : label.value === "Almost" ? "bg-warning" : "bg-destructive",
);
const pos = (n: number) => `${(Math.min(n, SCALE) / SCALE) * 100}%`;
const date = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
</script>

<template>
  <div class="space-y-5 rounded-lg border p-4">
    <p v-if="errorPoints === null" class="text-sm text-muted-foreground">
      Not enough questions are turned on to build an exam. Turn on more chapters in
      <RouterLink to="/settings" class="underline underline-offset-4">Settings</RouterLink>.
    </p>
    <div v-else class="space-y-3">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p class="tabular-nums">
          <span class="text-2xl font-semibold tracking-tight">≈ {{ errorPoints.toFixed(1) }}</span>
          <span class="ml-1.5 text-sm text-muted-foreground">error points</span>
        </p>
        <p class="text-sm font-medium" :class="tone">{{ label }}</p>
      </div>
      <div class="relative pb-5">
        <div class="h-2 overflow-hidden rounded-full bg-muted">
          <div class="h-full rounded-full" :class="fill" :style="{ width: pos(errorPoints) }" />
        </div>
        <div
          class="absolute top-[-3px] h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
          :style="{ left: pos(EXAM_RULES.maxErrorPoints) }"
          title="Pass limit: 10 error points"
        />
        <div class="absolute inset-x-0 bottom-0 h-4 text-xs leading-4 text-muted-foreground tabular-nums">
          <span class="absolute left-0">0</span>
          <span class="absolute -translate-x-1/2" :style="{ left: pos(EXAM_RULES.maxErrorPoints) }">
            {{ EXAM_RULES.maxErrorPoints }} limit
          </span>
          <span class="absolute right-0">{{ SCALE }}</span>
        </div>
      </div>
      <p class="text-xs text-muted-foreground tabular-nums">
        Estimate for one exam. You answered {{ coverage }}% of your questions at least once.
      </p>
    </div>

    <div v-if="exams.length" class="divide-y rounded-md border">
      <RouterLink
        v-for="e in exams"
        :key="e.id"
        :to="`/exam/${e.id}`"
        class="group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
      >
        <Badge v-if="e.passed" variant="outline" class="border-success/40 text-success">Passed</Badge>
        <Badge v-else variant="destructive">Failed</Badge>
        <span class="flex-1 text-muted-foreground tabular-nums">{{ e.errorPoints }} error points</span>
        <span class="text-xs text-muted-foreground tabular-nums">{{ date(e.at) }}</span>
        <ChevronRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </RouterLink>
    </div>

    <Button variant="outline" as-child>
      <RouterLink to="/exam">Practice exam</RouterLink>
    </Button>
  </div>
</template>
