import { onBeforeUnmount, onMounted } from "vue";

/**
 * Global keyboard shortcuts. The handler gets the lower-case key; return true
 * to mark the key as handled. Keys typed into inputs are ignored, except
 * Enter and Escape.
 */
export function useKeys(handler: (key: string, e: KeyboardEvent) => boolean | void) {
  const onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const el = e.target as HTMLElement | null;
    const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    if (typing && e.key !== "Enter" && e.key !== "Escape") return;
    if (typing && el?.tagName === "TEXTAREA") return;
    // A dialog is open: let it handle keys.
    if (document.querySelector("[role=dialog][data-state=open], [role=alertdialog][data-state=open]")) return;
    const key = e.key === " " ? "space" : e.key.toLowerCase();
    if (handler(key, e) === true) e.preventDefault();
  };
  onMounted(() => window.addEventListener("keydown", onKey));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
}
