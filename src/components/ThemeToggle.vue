<script setup lang="ts">
import { Monitor, Moon, Sun } from "@lucide/vue";
import { useColorMode } from "@vueuse/core";
import { computed } from "vue";
import { Button } from "@/components/ui/button";

// Same storage key as the inline script in index.html.
const mode = useColorMode({ storageKey: "vueuse-color-scheme", emitAuto: true });
const order = ["auto", "light", "dark"] as const;
const next = () => (mode.value = order[(order.indexOf(mode.value as (typeof order)[number]) + 1) % order.length]!);
const label = computed(() => ({ auto: "System theme", light: "Light theme", dark: "Dark theme" })[mode.value as string]);
</script>

<template>
  <Button variant="ghost" size="icon-sm" :aria-label="`${label}. Click to change.`" :title="label" @click="next">
    <Monitor v-if="mode === 'auto'" />
    <Sun v-else-if="mode === 'light'" />
    <Moon v-else />
  </Button>
</template>
