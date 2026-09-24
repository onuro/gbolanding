// Shared motion helpers for the Kollektor chapter mocks. Every scripted mock
// renders its final state in HTML; scripts only replay it while it is on
// screen, and never run for reduced-motion visitors.

export const reducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Calls `onChange(true)` when `el` is on screen in a visible tab and
 * `onChange(false)` when either stops being true. Returns a disconnect
 * function, or null when IntersectionObserver is missing (callers then keep
 * the static final state).
 */
export function watchVisibility(
  el: Element,
  onChange: (active: boolean) => void,
  threshold = 0.3,
): (() => void) | null {
  if (!("IntersectionObserver" in window)) return null;

  let inView = false;
  let active = false;

  const update = () => {
    const next = inView && document.visibilityState === "visible";
    if (next === active) return;
    active = next;
    onChange(next);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) inView = entry.isIntersecting;
      update();
    },
    { threshold },
  );

  observer.observe(el);
  document.addEventListener("visibilitychange", update);

  return () => {
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
  };
}
