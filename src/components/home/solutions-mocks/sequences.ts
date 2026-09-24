// Short scripted beats for the product cards floating in the solutions media
// wells. Contract:
// - The markup is always the finished state. No script, reduced motion, or a
//   card already on screen at load all simply show it.
// - A card below the fold is primed (parts hidden) and plays once when it
//   scrolls into view.
// - Loops (the Kollektor waveform, the call timer) pause while off screen.
// Parts are found by [data-sm-part="name"] inside each [data-mock-seq] root.
import { createTimeline, stagger, utils } from "animejs";

type Parts = Record<string, HTMLElement[]>;

interface Sequence {
  /** Every part the sequence touches; missing any means it never runs. */
  needs: string[];
  prime(parts: Parts): void;
  play(parts: Parts): void;
  settle(parts: Parts): void;
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function collect(root: HTMLElement): Parts {
  const parts: Parts = {};
  root.querySelectorAll<HTMLElement>("[data-sm-part]").forEach((element) => {
    const name = element.dataset.smPart!;
    (parts[name] ??= []).push(element);
  });
  return parts;
}

// Hands every animated property back to the stylesheet.
function release(elements: HTMLElement[]) {
  elements.forEach((element) => {
    element.style.removeProperty("opacity");
    element.style.removeProperty("transform");
  });
}

function formatFigure(figure: HTMLElement, value: number) {
  return new Intl.NumberFormat(figure.dataset.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const kollektor: Sequence = {
  needs: ["line", "plan"],
  prime({ line, plan }) {
    utils.set(line, { opacity: 0, translateY: 8 });
    utils.set(plan, { opacity: 0, translateX: -6 });
  },
  play({ line, plan }) {
    // The agent asks, then the agreed plan lands in the footer.
    createTimeline({ defaults: { ease: "outQuint", duration: 600 } })
      .add(line, { opacity: 1, translateY: 0 }, 300)
      .add(plan, { opacity: 1, translateX: 0 }, 1250);
  },
  settle({ line, plan }) {
    release([...line, ...plan]);
  },
};

const intelval: Sequence = {
  needs: ["figure", "marker", "row", "status"],
  prime({ figure: [figure], marker: [marker], row, status }) {
    utils.set(row, { opacity: 0, translateY: 6 });
    utils.set(status, { opacity: 0 });
    marker.style.left = "0%";
    figure.textContent = formatFigure(figure, Number(figure.dataset.from));
  },
  play({ figure: [figure], marker: [marker], row, status }) {
    // Methods come in, then the concluded value settles between them.
    const target = Number(figure.dataset.to);
    const count = { value: Number(figure.dataset.from) };
    createTimeline({ defaults: { ease: "outQuint", duration: 520 } })
      .add(row, { opacity: 1, translateY: 0, delay: stagger(90) }, 150)
      .add(
        marker,
        { left: `${marker.dataset.at}%`, duration: 1300, ease: "outExpo" },
        380,
      )
      .add(
        count,
        {
          value: target,
          duration: 1300,
          ease: "outExpo",
          onUpdate: () => {
            figure.textContent = formatFigure(figure, count.value);
          },
          onComplete: () => {
            figure.textContent = formatFigure(figure, target);
          },
        },
        380,
      )
      .add(status, { opacity: 1, duration: 480 }, 1500);
  },
  settle({ figure: [figure], marker: [marker], row, status }) {
    release([...row, ...status]);
    marker.style.left = `${marker.dataset.at}%`;
    figure.textContent = formatFigure(figure, Number(figure.dataset.to));
  },
};

const hastam: Sequence = {
  needs: ["bubble", "dot", "shell", "slot", "status"],
  prime({ bubble, shell, slot, status }) {
    utils.set(bubble, { opacity: 0, translateY: 10 });
    utils.set(shell, { opacity: 0, translateY: 14 });
    utils.set(slot, { opacity: 0, translateY: 6 });
    utils.set(status, { opacity: 0 });
    slot.forEach((element) => {
      if (!element.hasAttribute("data-selected")) return;
      element.dataset.chosen = "";
      element.removeAttribute("data-selected");
    });
  },
  play({ bubble, dot, shell, slot, status }) {
    // Patient asks, Hastam thinks, offers times, the patient's pick lights up,
    // and the request goes to the clinic.
    const chosen = slot.filter((element) => "chosen" in element.dataset);
    createTimeline({ defaults: { ease: "outQuint", duration: 560 } })
      .add(bubble, { opacity: 1, translateY: 0 }, 0)
      .add(dot, { opacity: [0, 1], duration: 220, delay: stagger(110) }, 480)
      .add(dot, { opacity: 0, duration: 200 }, 1080)
      .add(shell, { opacity: 1, translateY: 0, duration: 640 }, 1150)
      .add(slot, { opacity: 1, translateY: 0, duration: 420, delay: stagger(80) }, 1380)
      .call(() => {
        chosen.forEach((element) => element.setAttribute("data-selected", ""));
      }, 1950)
      .add(status, { opacity: 1, duration: 480 }, 2150);
  },
  settle({ bubble, dot, shell, slot, status }) {
    release([...bubble, ...dot, ...shell, ...slot, ...status]);
    slot.forEach((element) => {
      if ("chosen" in element.dataset) element.setAttribute("data-selected", "");
    });
  },
};

const sequences: Record<string, Sequence> = { kollektor, intelval, hastam };

function toSeconds(text: string | null) {
  const match = /^(\d+):(\d{2})$/.exec(text?.trim() ?? "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function toClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// Every [data-call-timer] shows the same live call, so they share one clock
// that only runs while at least one of them is on screen.
function startCallClock() {
  const timers = [...document.querySelectorAll<HTMLElement>("[data-call-timer]")];
  const start = toSeconds(timers[0]?.textContent ?? null);
  if (start === null) return;

  let seconds = start;
  const visible = new Set<Element>();
  let interval: number | undefined;

  const tick = () => {
    seconds += 1;
    const text = toClock(seconds);
    timers.forEach((timer) => {
      timer.textContent = text;
    });
  };

  const sync = () => {
    const run = visible.size > 0 && !document.hidden && !reducedMotion.matches;
    if (run && interval === undefined) {
      interval = window.setInterval(tick, 1000);
    } else if (!run && interval !== undefined) {
      window.clearInterval(interval);
      interval = undefined;
    }
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    sync();
  });
  timers.forEach((timer) => observer.observe(timer));
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", sync);
}

function init() {
  const roots = [...document.querySelectorAll<HTMLElement>("[data-mock-seq]")];
  if (!roots.length || !("IntersectionObserver" in window)) return;

  const loops = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
    }
  });
  roots.forEach((root) => loops.observe(root));

  startCallClock();

  if (reducedMotion.matches) return;

  const pending = new Map<Element, { sequence: Sequence; parts: Parts }>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const item = pending.get(entry.target);
        if (!item) continue;
        pending.delete(entry.target);
        observer.unobserve(entry.target);
        item.sequence.play(item.parts);
      }
    },
    { threshold: 0.35 },
  );

  for (const root of roots) {
    const sequence = sequences[root.dataset.mockSeq ?? ""];
    if (!sequence) continue;
    // Anything already on screen at load stays exactly as rendered.
    const rect = root.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) continue;
    const parts = collect(root);
    if (!sequence.needs.every((name) => parts[name]?.length)) continue;
    sequence.prime(parts);
    pending.set(root, { sequence, parts });
    observer.observe(root);
  }

  // Switching reduced motion on mid-scroll finishes whatever has not played.
  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    pending.forEach(({ sequence, parts }, root) => {
      observer.unobserve(root);
      sequence.settle(parts);
    });
    pending.clear();
  });
}

init();
