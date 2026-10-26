<script setup lang="ts">
import { onMounted, ref } from "vue";
import "vue-sonner/style.css";
import AppShell from "@/components/AppShell.vue";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";

const catalog = useCatalog();
const progress = useProgress();
const state = ref<"loading" | "ready" | "error">("loading");
const error = ref("");

async function boot() {
  state.value = "loading";
  try {
    await Promise.all([catalog.load(), progress.load()]);
    progress.finishExpiredExam();
    state.value = "ready";
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    state.value = "error";
  }
}
onMounted(boot);
</script>

<template>
  <TooltipProvider :delay-duration="400">
    <AppShell v-if="state === 'ready'" />
    <div v-else class="flex min-h-dvh items-center justify-center p-6">
      <div v-if="state === 'loading'" class="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground" aria-label="Loading" />
      <div v-else class="max-w-sm space-y-4 text-center">
        <p class="font-medium">Could not start the app</p>
        <p class="text-sm text-muted-foreground">{{ error }}</p>
        <Button @click="boot">Try again</Button>
      </div>
    </div>
    <Toaster position="top-center" />
  </TooltipProvider>
</template>
