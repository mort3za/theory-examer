<script setup lang="ts">
import { Bookmark, EllipsisVertical, EyeOff, ExternalLink, Eye, FileText, Languages } from "@lucide/vue";
import { computed } from "vue";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useGerman } from "@/composables/useGerman";
import { useCatalog } from "@/stores/catalog";
import { useProgress } from "@/stores/progress";

const props = withDefaults(defineProps<{ question: Question; actions?: boolean }>(), { actions: true });

const catalog = useCatalog();
const progress = useProgress();
const german = useGerman();

const chapter = computed(() => catalog.chapterById.get(props.question.chapter));
const flagged = computed(() => !!progress.data.flags[props.question.id]);
const hidden = computed(() => !!progress.data.hidden[props.question.id]);

function toggleHidden() {
  progress.toggleHidden(props.question.id);
  toast(hidden.value ? "Question hidden. It will not come up again." : "Question shown again.", {
    action: { label: "Undo", onClick: () => progress.toggleHidden(props.question.id) },
  });
}
</script>

<template>
  <div class="flex items-center gap-2">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span class="font-mono tabular-nums">{{ question.id }}</span>
      <span aria-hidden="true">·</span>
      <span class="font-medium text-foreground tabular-nums">{{ question.points }} pts</span>
      <span aria-hidden="true" class="hidden sm:inline">·</span>
      <span class="hidden truncate sm:inline">{{ chapter?.name }}</span>
    </div>

    <template v-if="actions">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon-sm"
            :aria-pressed="german.on.value"
            :class="cn(german.on.value && 'bg-muted text-foreground')"
            aria-label="Show German text (G)"
            @click="german.toggle()"
          >
            <Languages />
          </Button>
        </TooltipTrigger>
        <TooltipContent>German text <kbd class="ml-1 opacity-60">G</kbd></TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            variant="ghost"
            size="icon-sm"
            :aria-pressed="flagged"
            aria-label="Flag question (F)"
            @click="progress.toggleFlag(question.id)"
          >
            <Bookmark :class="cn(flagged && 'fill-current text-warning')" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ flagged ? "Remove flag" : "Flag" }} <kbd class="ml-1 opacity-60">F</kbd></TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon-sm" aria-label="More actions"><EllipsisVertical /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuItem as-child>
            <RouterLink :to="`/q/${question.id}`"><FileText /> Details and note</RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <a :href="question.url" target="_blank" rel="noopener noreferrer"><ExternalLink /> Open source page</a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="toggleHidden">
            <template v-if="hidden"><Eye /> Show this question again</template>
            <template v-else><EyeOff /> Hide (not for my class)</template>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>
  </div>
</template>
