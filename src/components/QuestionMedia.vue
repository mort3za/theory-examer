<script setup lang="ts">
import { Play } from "@lucide/vue";
import { computed, ref } from "vue";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Media } from "@/lib/types";

const props = defineProps<{
  images: Media[];
  videos: Media[];
  /** Max video plays (exam). Undefined = native controls, no limit. */
  playLimit?: number;
  plays?: number;
}>();
const emit = defineEmits<{ play: [] }>();

// Video questions come with one still image (the first frame): use it as the poster, not as a second picture.
const stills = computed(() => (props.videos.length ? [] : props.images));
const poster = computed(() => (props.videos.length && props.images[0] ? src(props.images[0]) : undefined));

const failed = ref<Record<string, boolean>>({});
const zoom = ref<string | null>(null);
const video = ref<HTMLVideoElement[]>([]);
const playing = ref(false);

const src = (m: Media) => (failed.value[m.src] ? m.alt : m.src);
function onError(m: Media) {
  // Try the GitHub copy once when the primary host fails.
  if (!failed.value[m.src]) failed.value[m.src] = true;
}

function playLimited() {
  const v = video.value[0];
  if (!v || playing.value || (props.plays ?? 0) >= (props.playLimit ?? 0)) return;
  v.currentTime = 0;
  v.play();
  playing.value = true;
  emit("play");
}
</script>

<template>
  <div v-if="images.length || videos.length" class="space-y-3">
    <button
      v-for="m in stills"
      :key="m.src"
      type="button"
      class="block w-full overflow-hidden rounded-lg border bg-muted/40"
      aria-label="Enlarge image"
      @click="zoom = src(m)"
    >
      <img
        :src="src(m)"
        alt=""
        class="mx-auto max-h-[42vh] w-auto object-contain"
        loading="lazy"
        decoding="async"
        @error="onError(m)"
      />
    </button>

    <div v-for="m in videos" :key="m.src" class="relative overflow-hidden rounded-lg border bg-black">
      <video
        ref="video"
        :src="src(m)"
        :poster="poster"
        :controls="playLimit === undefined"
        playsinline
        preload="metadata"
        class="mx-auto max-h-[46vh] w-full"
        @error="onError(m)"
        @ended="playing = false"
      />
      <div
        v-if="playLimit !== undefined && !playing"
        class="absolute inset-0 flex items-center justify-center bg-black/40"
      >
        <button
          type="button"
          class="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow disabled:opacity-60"
          :disabled="(plays ?? 0) >= playLimit"
          @click="playLimited"
        >
          <Play class="size-4 fill-current" />
          <span v-if="(plays ?? 0) < playLimit">Play video · {{ playLimit - (plays ?? 0) }} left</span>
          <span v-else>No plays left</span>
        </button>
      </div>
    </div>

    <Dialog :open="!!zoom" @update:open="(o) => !o && (zoom = null)">
      <DialogContent class="max-w-[min(96vw,1100px)] p-2 sm:max-w-[min(96vw,1100px)]">
        <DialogTitle class="sr-only">Image</DialogTitle>
        <img v-if="zoom" :src="zoom" alt="" class="max-h-[85vh] w-full rounded-md object-contain" />
      </DialogContent>
    </Dialog>
  </div>
</template>
