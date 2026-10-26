<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";
import { computed, ref, toRaw } from "vue";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap.vue";
import ExamReadiness, { type RecentExam } from "@/components/dashboard/ExamReadiness.vue";
import ForecastChart from "@/components/dashboard/ForecastChart.vue";
import ThemeProgress from "@/components/dashboard/ThemeProgress.vue";
import { Button } from "@/components/ui/button";
import { dayKey, startOfDay, streak } from "@/lib/date";
import { forecast } from "@/lib/review";
import { State } from "@/lib/srs";
import {
  coverage,
  dayCounts,
  describeOffset,
  examEstimate,
  forecastLabels,
  heatmap,
  nextReviews,
  percent,
  themeProgress,
  windowTotals,
} from "@/lib/stats";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";

const FORECAST_DAYS = 7;
const NEXT_LOOKAHEAD = 60;
const HEATMAP_WEEKS = 12;

const catalog = useCatalog();
const progress = useProgress();
const nowMs = ref(Date.now());
useIntervalFn(() => (nowMs.value = Date.now()), 60_000);
const todayKey = computed(() => dayKey(nowMs.value));

const subtitle = computed(() =>
  new Date(startOfDay(nowMs.value)).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
);

const firstRun = computed(() => progress.data.log.length === 0);

// Log: one pass, reused by streak, accuracy and heatmap.
const counts = computed(() => {
  void progress.data.log.length;
  return dayCounts(toRaw(progress.data.log), dayKey);
});
const streakDays = computed(() => streak(new Set(counts.value.keys()), todayKey.value));
const answeredToday = computed(() => counts.value.get(todayKey.value) ?? { n: 0, ok: 0 });
const week = computed(() => windowTotals(counts.value, todayKey.value, 7));
const heat = computed(() => heatmap(counts.value, todayKey.value, HEATMAP_WEEKS));

// Pool
const themeCounts = computed(() => themeProgress(progress.pool, progress.data.cards));
const mastered = computed(() => {
  let n = 0;
  for (const t of themeCounts.value.values()) n += t.mature;
  return n;
});
const themeRows = computed(() =>
  catalog.themes
    .filter((t) => themeCounts.value.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, counts: themeCounts.value.get(t.id)! })),
);

// Forecast
const fc = computed(() =>
  forecast(
    progress.data.cards,
    progress.pool.map((q) => q.id),
    nowMs.value,
    NEXT_LOOKAHEAD,
  ),
);
const chart = computed(() => fc.value.slice(0, FORECAST_DAYS));
const labels = computed(() => forecastLabels(todayKey.value, FORECAST_DAYS));
const next = computed(() => nextReviews(fc.value, progress.today.due));

// Exam readiness
const errorPoints = computed(() => examEstimate(progress.pool, (id) => progress.recall(id)));
const answeredCoverage = computed(() =>
  coverage(progress.pool, (id) => {
    if ((progress.data.stats[id]?.seen ?? 0) > 0) return true;
    const c = progress.data.cards[id];
    return !!c && c.state !== State.New;
  }),
);
const recentExams = computed<RecentExam[]>(() =>
  progress.data.exams
    .filter((e) => e.finishedAt !== undefined && e.score)
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
    .slice(0, 3)
    .map((e) => ({ id: e.id, passed: e.score!.passed, errorPoints: e.score!.errorPoints, at: e.finishedAt! })),
);

const tiles = computed(() => {
  const todayPct = percent(answeredToday.value);
  const weekPct = percent(week.value);
  return [
    {
      label: "Streak",
      value: String(streakDays.value),
      note: streakDays.value === 1 ? "day" : "days",
    },
    {
      label: "Answered today",
      value: String(answeredToday.value.n),
      note: todayPct === null ? "No answers yet" : `${todayPct}% correct`,
    },
    {
      label: "Last 7 days",
      value: weekPct === null ? "–" : `${weekPct}%`,
      note: `${week.value.n} ${week.value.n === 1 ? "answer" : "answers"}`,
    },
    {
      label: "Mastered",
      value: String(mastered.value),
      note: `of ${progress.pool.length} questions`,
    },
  ];
});

const welcome = [
  "Review every day. You get 20 new questions a day, plus the ones that are due.",
  "Wrong answers come back soon. Right answers come back later and later.",
  "Take practice exams to see how ready you are.",
];
</script>

<template>
  <div class="space-y-10">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Today</h1>
      <p class="text-sm text-muted-foreground">{{ subtitle }}</p>
    </header>

    <!-- First run -->
    <section v-if="firstRun" class="space-y-5 rounded-lg border p-5">
      <h2 class="text-base font-semibold">How it works</h2>
      <ol class="space-y-3 text-sm">
        <li v-for="(w, i) in welcome" :key="i" class="flex gap-3">
          <span class="mt-px text-muted-foreground tabular-nums">{{ i + 1 }}.</span>
          <span>{{ w }}</span>
        </li>
      </ol>
      <Button as-child>
        <RouterLink to="/review">Start learning</RouterLink>
      </Button>
    </section>

    <template v-else>
      <!-- Primary panel -->
      <section v-if="progress.today.total > 0" class="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border p-5">
        <div class="flex gap-8">
          <div>
            <p class="text-3xl font-semibold tracking-tight tabular-nums">{{ progress.today.due }}</p>
            <p class="text-sm text-muted-foreground">Due reviews</p>
          </div>
          <div>
            <p class="text-3xl font-semibold tracking-tight tabular-nums">{{ progress.today.new }}</p>
            <p class="text-sm text-muted-foreground">New questions</p>
          </div>
        </div>
        <Button size="lg" class="w-full sm:ml-auto sm:w-auto" as-child>
          <RouterLink to="/review">Start review</RouterLink>
        </Button>
      </section>
      <section v-else class="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border p-5">
        <div class="space-y-1">
          <p class="text-lg font-semibold tracking-tight">All done for today</p>
          <p class="text-sm text-muted-foreground tabular-nums">
            <template v-if="next">
              Next: {{ next.count }} {{ next.count === 1 ? "review" : "reviews" }} {{ describeOffset(next.offset) }}.
            </template>
            <template v-else>No reviews are scheduled.</template>
          </p>
        </div>
        <Button variant="outline" class="w-full sm:ml-auto sm:w-auto" as-child>
          <RouterLink to="/practice">Practice</RouterLink>
        </Button>
      </section>

      <!-- Stat tiles -->
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Statistics">
        <div v-for="t in tiles" :key="t.label" class="rounded-lg border p-4">
          <p class="text-sm text-muted-foreground">{{ t.label }}</p>
          <p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{{ t.value }}</p>
          <p class="text-xs text-muted-foreground tabular-nums">{{ t.note }}</p>
        </div>
      </section>
    </template>

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Exam readiness</h2>
      <ExamReadiness :error-points="errorPoints" :coverage="answeredCoverage" :exams="recentExams" />
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-muted-foreground">Progress by theme</h2>
      <ThemeProgress :rows="themeRows" />
      <p class="text-xs text-muted-foreground">Bar: mature (dark), learning (light), new (empty). Mature = review interval of 21 days or more.</p>
    </section>

    <div class="grid gap-10 md:grid-cols-2 md:gap-6">
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium text-muted-foreground">Forecast</h2>
        <ForecastChart class="flex-1" :counts="chart" :labels="labels" />
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-muted-foreground">Activity</h2>
        <ActivityHeatmap :columns="heat" />
      </section>
    </div>
  </div>
</template>
