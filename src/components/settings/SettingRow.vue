<script setup lang="ts">
import { Label } from "@/components/ui/label";

defineProps<{ label: string; description?: string; for?: string }>();
</script>

<template>
  <div class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
    <div class="min-w-0 space-y-0.5">
      <Label :for="$props.for" class="text-sm font-medium">{{ label }}</Label>
      <p v-if="description" class="text-sm text-pretty text-muted-foreground">{{ description }}</p>
    </div>
    <div class="shrink-0"><slot /></div>
  </div>
</template>
