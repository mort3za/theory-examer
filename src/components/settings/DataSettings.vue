<script setup lang="ts">
import { onMounted, ref } from "vue";
import { toast } from "vue-sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/stores/progress";
import { useSettings } from "@/stores/settings";
import SettingRow from "./SettingRow.vue";

const progress = useProgress();
const settings = useSettings();

function exportBackup() {
  const blob = new Blob([JSON.stringify(progress.exportBackup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `theory-examer-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Import: pick a file, then confirm before it replaces anything.
const fileInput = ref<HTMLInputElement | null>(null);
const pending = ref<unknown>(null);
const confirmImport = ref(false);

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    pending.value = JSON.parse(await file.text());
    confirmImport.value = true;
  } catch {
    toast.error("This file is not valid JSON.");
  }
}

async function doImport() {
  try {
    await progress.importBackup(pending.value);
    toast.success("Backup imported.");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Could not import this file.");
  } finally {
    pending.value = null;
  }
}

const confirmReset = ref(false);
async function doReset() {
  await progress.resetAll();
  toast.success("All progress was reset.");
}

function restoreSettings() {
  settings.reset();
  toast.success("Default settings restored.");
}

// Storage info
const persisted = ref<boolean | null>(null);
const usage = ref("");
const fmt = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
onMounted(async () => {
  persisted.value = (await navigator.storage?.persisted?.().catch(() => null)) ?? null;
  const est = await navigator.storage?.estimate?.().catch(() => null);
  if (est?.usage !== undefined) usage.value = fmt(est.usage);
});
</script>

<template>
  <SettingRow label="Export backup" description="Save your progress and settings to a JSON file.">
    <Button variant="outline" size="sm" @click="exportBackup">Export</Button>
  </SettingRow>
  <SettingRow label="Import backup" description="Replace your progress and settings with a backup file.">
    <Button variant="outline" size="sm" @click="fileInput?.click()">Import</Button>
    <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFile" />
  </SettingRow>
  <SettingRow label="Restore default settings" description="Your progress stays as it is.">
    <Button variant="outline" size="sm" @click="restoreSettings">Restore</Button>
  </SettingRow>
  <SettingRow label="Reset all progress" description="Delete all review history, notes, flags and exam results.">
    <Button variant="destructive" size="sm" @click="confirmReset = true">Reset</Button>
  </SettingRow>
  <div class="space-y-1 py-4 text-sm text-muted-foreground">
    <p class="text-pretty">
      Your data lives only in this browser. On iPhone, the installed app and Safari have separate storage. Export a
      backup and import it to move your data.
    </p>
    <p class="tabular-nums">
      Persistent storage:
      {{ persisted === null ? "unknown" : persisted ? "granted" : "not granted" }}<template v-if="usage">. Used: {{ usage }}</template>
    </p>
  </div>

  <AlertDialog v-model:open="confirmImport">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Import this backup?</AlertDialogTitle>
        <AlertDialogDescription>This replaces your current progress.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="pending = null">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="doImport">Replace progress</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog v-model:open="confirmReset">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
        <AlertDialogDescription>
          This deletes your review history, notes, flags, hidden questions and exam results. You cannot undo it.
          Export a backup first if you are not sure.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="doReset">Reset everything</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
