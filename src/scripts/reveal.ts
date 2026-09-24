// Scroll reveal contract: a section carries data-reveal-root, its children carry
// data-reveal and fade up in DOM order when the root enters the viewport. A lone
// data-reveal outside any root is its own root. See the matching CSS in
// src/styles/global.css.

const STAGGER_MS = 90;
const MAX_STAGGER_STEPS = 8;

function itemsOf(root: Element): HTMLElement[] {
  const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  if (root instanceof HTMLElement && root.hasAttribute("data-reveal")) {
    items.unshift(root);
  }
  return items;
}

function reveal(root: Element, animate: boolean) {
  itemsOf(root).forEach((item, index) => {
    const delay = animate ? Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS : 0;
    item.style.setProperty("--reveal-delay", `${delay}ms`);
    item.setAttribute("data-revealed", "");
  });
}

function init() {
  const roots: Element[] = [
    ...document.querySelectorAll("[data-reveal-root]"),
    ...[...document.querySelectorAll("[data-reveal]")].filter(
      (el) => !el.closest("[data-reveal-root]"),
    ),
  ];
  if (!roots.length) return;

  const pending: Element[] = [];
  for (const root of roots) {
    // Anything on or above the fold at load is shown as-is, never hidden.
    if (root.getBoundingClientRect().top < window.innerHeight) {
      reveal(root, false);
    } else {
      pending.push(root);
    }
  }

  document.documentElement.classList.add("reveal-ready");
  if (!pending.length || !("IntersectionObserver" in window)) {
    pending.forEach((root) => reveal(root, false));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target, true);
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
  );
  pending.forEach((root) => observer.observe(root));
}

init();
