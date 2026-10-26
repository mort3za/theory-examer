<script setup lang="ts">
import { BookOpenCheck, ClipboardCheck, Dumbbell, LayoutGrid, Library, Settings } from "@lucide/vue";
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/stores/progress";
import { cn } from "@/lib/utils";
import Logo from "./Logo.vue";
import ThemeToggle from "./ThemeToggle.vue";

const route = useRoute();
const progress = useProgress();
const focus = computed(() => !!route.meta.focus);

const nav = [
  { to: "/", label: "Today", icon: LayoutGrid },
  { to: "/review", label: "Review", icon: BookOpenCheck },
  { to: "/practice", label: "Practice", icon: Dumbbell },
  { to: "/exam", label: "Exam", icon: ClipboardCheck },
  { to: "/catalog", label: "Questions", icon: Library },
];

const isActive = (to: string) => (to === "/" ? route.path === "/" : route.path.startsWith(to));
</script>

<template>
  <!-- Keyed by URL: a new session URL must start a new session. -->
  <RouterView v-if="focus" :key="route.fullPath" />
  <div v-else class="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
    <header class="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <RouterLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
          <Logo class="size-6" />
          <span>Theory Examer</span>
        </RouterLink>
        <nav class="hidden items-center gap-1 md:flex" aria-label="Main">
          <RouterLink
            v-for="n in nav"
            :key="n.to"
            :to="n.to"
            :class="
              cn(
                'relative rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                isActive(n.to) && 'bg-muted font-medium text-foreground',
              )
            "
          >
            {{ n.label }}
            <span
              v-if="n.to === '/review' && progress.today.total"
              class="ml-1 rounded-full bg-foreground px-1.5 py-px text-[10px] font-semibold text-background tabular-nums"
            >
              {{ progress.today.total }}
            </span>
          </RouterLink>
        </nav>
        <div class="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon-sm" as-child aria-label="Settings">
            <RouterLink to="/settings"><Settings /></RouterLink>
          </Button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl px-4 py-6 md:py-10">
      <RouterView />
    </main>

    <!-- Mobile tab bar -->
    <nav
      class="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Main"
    >
      <div class="grid h-16 grid-cols-5">
        <RouterLink
          v-for="n in nav"
          :key="n.to"
          :to="n.to"
          :class="
            cn(
              'relative flex flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground',
              isActive(n.to) && 'font-medium text-foreground',
            )
          "
        >
          <component :is="n.icon" class="size-5" :stroke-width="isActive(n.to) ? 2.25 : 1.75" />
          {{ n.label }}
          <span
            v-if="n.to === '/review' && progress.today.total"
            class="absolute top-2 left-[calc(50%+6px)] rounded-full bg-foreground px-1.5 text-[10px] leading-4 font-semibold text-background tabular-nums"
          >
            {{ progress.today.total }}
          </span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>
