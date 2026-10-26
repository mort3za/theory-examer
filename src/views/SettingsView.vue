<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import { computed } from "vue";
import DataSettings from "@/components/settings/DataSettings.vue";
import SettingRow from "@/components/settings/SettingRow.vue";
import TopicSettings from "@/components/settings/TopicSettings.vue";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { NewOrder } from "@/lib/review";
import { useGerman } from "@/composables/useGerman";
import { useCatalog } from "@/stores/catalog";
import { useSettings } from "@/stores/settings";

const settings = useSettings();
const catalog = useCatalog();
const german = useGerman();

// The store replaces the whole object on reset and import, so always read through it.
const s = computed(() => settings.s);

/** Write a whole number inside [min, max]; ignore empty input. */
function setNumber(key: "newPerDay" | "examMinutes", min: number, max: number, e: Event) {
  const el = e.target as HTMLInputElement;
  const n = Number(el.value);
  if (el.value.trim() !== "" && Number.isFinite(n)) s.value[key] = Math.min(max, Math.max(min, Math.round(n)));
  el.value = String(s.value[key]);
}

const NEW_ORDERS: { value: NewOrder; label: string }[] = [
  { value: "catalog", label: "Catalogue order" },
  { value: "random", label: "Random" },
  { value: "points", label: "High points first" },
];

const retention = computed({
  get: () => [s.value.retention],
  set: (v) => {
    if (v[0] !== undefined) s.value.retention = Math.round(v[0] * 100) / 100;
  },
});

// Same storage key as the inline script in index.html.
const mode = useColorMode({ storageKey: "vueuse-color-scheme", emitAuto: true });
const setMode = (v: unknown) => {
  if (v === "auto" || v === "light" || v === "dark") mode.value = v;
};

const generated = computed(() =>
  catalog.generatedAt ? new Date(catalog.generatedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : "",
);
</script>

<template>
  <div class="space-y-10">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
      <p class="text-sm text-muted-foreground">Changes save at once.</p>
    </header>

    <section class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">Study</h2>
      <div class="divide-y rounded-lg border px-4">
        <SettingRow label="New questions per day" description="How many new questions a review session adds." for="new-per-day">
          <Input
            id="new-per-day"
            type="number"
            inputmode="numeric"
            min="0"
            max="200"
            class="w-24 tabular-nums"
            :model-value="s.newPerDay"
            @change="setNumber('newPerDay', 0, 200, $event)"
          />
        </SettingRow>
        <SettingRow label="New question order" description="Which new questions come first.">
          <Select v-model="s.newOrder">
            <SelectTrigger class="w-full sm:w-48" aria-label="New question order"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in NEW_ORDERS" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Desired retention" description="Higher means more reviews." for="retention">
          <div class="flex items-center gap-4 sm:w-64">
            <Slider id="retention" v-model="retention" :min="0.8" :max="0.97" :step="0.01" aria-label="Desired retention" />
            <span class="w-10 text-right text-sm font-medium tabular-nums">{{ Math.round(s.retention * 100) }}%</span>
          </div>
        </SettingRow>
        <SettingRow label="Shuffle answer order" description="Mix the order of the answers in each question." for="shuffle">
          <Switch id="shuffle" v-model="s.shuffleOptions" />
        </SettingRow>
      </div>
    </section>

    <section class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">Exam</h2>
      <div class="divide-y rounded-lg border px-4">
        <SettingRow label="Time limit" description="Minutes for a mock exam (10 to 90)." for="exam-minutes">
          <Input
            id="exam-minutes"
            type="number"
            inputmode="numeric"
            min="10"
            max="90"
            class="w-24 tabular-nums"
            :model-value="s.examMinutes"
            @change="setNumber('examMinutes', 10, 90, $event)"
          />
        </SettingRow>
      </div>
    </section>

    <section class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">Topics</h2>
      <div class="divide-y rounded-lg border px-4">
        <TopicSettings />
      </div>
    </section>

    <section class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">Appearance</h2>
      <div class="divide-y rounded-lg border px-4">
        <SettingRow label="Theme">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            aria-label="Theme"
            :model-value="mode"
            @update:model-value="setMode"
          >
            <ToggleGroupItem value="auto">System</ToggleGroupItem>
            <ToggleGroupItem value="light">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          </ToggleGroup>
        </SettingRow>
        <SettingRow label="German text by default" description="Show the German question and answers first." for="german">
          <Switch id="german" v-model="german.on.value" />
        </SettingRow>
      </div>
    </section>

    <section class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">Data</h2>
      <div class="divide-y rounded-lg border px-4">
        <DataSettings />
      </div>
    </section>

    <section class="space-y-2">
      <h2 class="text-sm font-medium text-muted-foreground">About</h2>
      <div class="divide-y rounded-lg border px-4 text-sm">
        <SettingRow label="Source data" description="Questions from clickclickdrive.de.">
          <a
            href="https://github.com/yowmamasita/driving-theory"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-4"
          >
            yowmamasita/driving-theory
          </a>
        </SettingRow>
        <SettingRow label="Catalogue date" description="When the question data was fetched.">
          <span class="tabular-nums">{{ generated || "–" }}</span>
        </SettingRow>
        <SettingRow label="Keyboard shortcuts" description="Press ? in a session to see all shortcuts.">
          <Kbd>?</Kbd>
        </SettingRow>
      </div>
    </section>
  </div>
</template>
