import { computed, watch } from "vue";
import { toast } from "vue-sonner";
import { useCatalog } from "@/stores/catalog";
import { useSettings } from "@/stores/settings";

/** The "show German text" switch, shared by all question views. */
export function useGerman() {
  const settings = useSettings();
  const catalog = useCatalog();

  const on = computed({
    get: () => settings.s.german,
    set: (v: boolean) => {
      settings.s.german = v;
    },
  });

  watch(
    on,
    (v) => {
      if (v && !catalog.german) {
        catalog.loadGerman().catch(() => {
          toast.error("Could not load the German texts.");
          settings.s.german = false;
        });
      }
    },
    { immediate: true },
  );

  const ready = computed(() => on.value && !!catalog.german);
  const toggle = () => (on.value = !on.value);

  return { on, ready, toggle };
}
