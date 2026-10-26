<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const open = defineModel<boolean>("open", { default: false });

const rows: [string[], string][] = [
  [["A", "B", "C"], "Select or clear an answer"],
  [["↵"], "Check the answer, then continue"],
  [["Space"], "Continue (rated Good)"],
  [["1", "2", "3"], "After a correct answer: Hard, Good, Easy"],
  [["F"], "Flag the question"],
  [["G"], "Show the German text"],
  [["Esc"], "Exit the session"],
  [["?"], "Show this help"],
];
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>Work through a session without the mouse.</DialogDescription>
      </DialogHeader>
      <dl class="divide-y text-sm">
        <div v-for="[keys, label] in rows" :key="label" class="flex items-center justify-between gap-4 py-2.5">
          <dt class="text-muted-foreground">{{ label }}</dt>
          <dd class="flex shrink-0 gap-1">
            <Kbd v-for="k in keys" :key="k">{{ k }}</Kbd>
          </dd>
        </div>
      </dl>
    </DialogContent>
  </Dialog>
</template>
