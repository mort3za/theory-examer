<script setup lang="ts">
import { NotebookPen } from "@lucide/vue";
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/lib/types";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";

const props = withDefaults(defineProps<{ question: Question; german?: boolean; explanation?: boolean }>(), {
  german: false,
  explanation: true,
});

const catalog = useCatalog();
const progress = useProgress();

const comment = computed(
  () => (props.german ? catalog.german?.[props.question.id]?.comment : undefined) || props.question.comment,
);
const note = computed(() => progress.data.notes[props.question.id] ?? "");
const editing = ref(false);
const draft = ref("");

function edit() {
  draft.value = note.value;
  editing.value = true;
}
function saveNote() {
  progress.setNote(props.question.id, draft.value);
  editing.value = false;
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="explanation && comment" class="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed">
      <p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Explanation</p>
      <p class="text-pretty" :lang="german ? 'de' : 'en'">{{ comment }}</p>
    </div>

    <div v-if="editing" class="space-y-2">
      <Textarea
        v-model="draft"
        rows="3"
        placeholder="Your own words, a mnemonic, a link…"
        aria-label="Note"
        autofocus
        @keydown.meta.enter="saveNote"
        @keydown.ctrl.enter="saveNote"
        @keydown.esc.stop="editing = false"
      />
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="editing = false">Cancel</Button>
        <Button size="sm" @click="saveNote">Save note</Button>
      </div>
    </div>
    <button
      v-else-if="note"
      type="button"
      class="block w-full rounded-lg border border-dashed p-3 text-left text-sm whitespace-pre-wrap hover:bg-muted/40"
      @click="edit"
    >
      <span class="mb-1 block text-xs font-medium tracking-wide text-muted-foreground uppercase">Your note</span>
      {{ note }}
    </button>
    <Button v-else variant="ghost" size="sm" class="-ml-2 text-muted-foreground" @click="edit">
      <NotebookPen /> Add note
    </Button>
  </div>
</template>
