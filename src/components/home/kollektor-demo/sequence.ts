// Scripted Kollektor call for the product stage under the hero.
//
// The markup ships the finished call (every caption, every tool result, the
// receipt, the phone's "call ended" screen), so reduced-motion visitors and a
// failed script both see a complete picture. With motion allowed, an inline
// boot script in KollektorDemo.astro flips the root to its opening state
// (phone locked, Kollektor dialling) before paint; this module then takes
// over, plays one anime.js timeline when the stage is on screen, holds the end
// for a few seconds, resets and plays again. Timings live in data attributes
// written by the component, so copy and choreography stay in one place.
//
// Timeline: dial -> ring (the debtor's phone rings) -> call (answered; the
// timer starts) -> ended. The root carries the state as attributes and CSS
// does the rest: data-phase, data-speaker (who is talking), data-debtor and
// data-agent (each channel's status word).

import { createTimeline, stagger, utils } from "animejs";

type Who = "agent" | "debtor";
type Phase = "dial" | "ring" | "call" | "ended";
type Targets = HTMLElement[];

const HOLD_MS = 3000;
const BAR_FLOOR = 0.1;
const RAY_FLOOR = 0.16;
// Start once this share of the stage is on screen, or half the viewport is
// filled by it (the stage is taller than the viewport on phones, where the
// handset stacks above the window). Stop only once it has almost left.
const SHOW_RATIO = 0.35;
const SHOW_VIEWPORT = 0.5;
const HIDE_RATIO = 0.05;
// A speaker stays "on" this long after their last word, so lanes, rays and
// the connector don't flicker at the end of a line.
const TALK_TAIL = 200;
// The agent is "thinking" from this long after the debtor stops until it speaks.
const THINK_AFTER = 100;
// Agent captions grow word by word: the first word waits WORD_LEAD, each word
// fades over WORD_FADE, and the words spread over the line minus WORD_TRIM so
// the last one lands just as the line ends.
const WORD_LEAD = 80;
const WORD_FADE = 260;
const WORD_TRIM = 320;

const ms = (el: HTMLElement | undefined | null, key: string) => {
  const value = Number(el?.dataset[key]);
  return Number.isFinite(value) ? value : 0;
};

// Keep in step with clock() in KollektorDemo.astro.
const clock = (time: number) => {
  const seconds = Math.max(0, Math.floor(time / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const all = (root: ParentNode, selector: string) =>
  [...root.querySelectorAll<HTMLElement>(selector)];

const setIf = (targets: Targets, props: Record<string, number>) => {
  if (targets.length) utils.set(targets, props);
};

// Each bar gets its own gain, speed and phase so a lane breathes unevenly,
// like a voice, instead of pulsing as one block.
const barProfile = (count: number, seed: number) =>
  Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5;
    const envelope = 0.3 + 0.7 * Math.sin(Math.PI * t);
    const weight =
      0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + seed) * Math.cos(i * 0.85 + seed));
    return { gain: envelope * weight, speed: 6 + (i % 7) * 1.15, phase: i * 0.83 + seed };
  });

const syllable = (sec: number, offset: number) =>
  0.55 +
  0.45 *
    (0.5 + 0.5 * Math.sin(sec * 10.5 + offset)) *
    (0.5 + 0.5 * Math.sin(sec * 3.1 + 1.3 + offset));

export function initKollektorDemo(root: HTMLElement) {
  if (root.dataset.kdInit !== undefined) return;
  root.dataset.kdInit = "";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = root.querySelector<HTMLButtonElement>("[data-kd-toggle]");
  const stage = root.querySelector<HTMLElement>("[data-kd-stage]") ?? root;

  const ringAt = ms(root, "kdRing");
  const connect = ms(root, "kdConnect");
  const callEnd = ms(root, "kdEnd");
  const total = ms(root, "kdTotal");

  const lines = all(root, "[data-kd-line]").map((el, index) => {
    const words = all(el, "[data-kd-word]");
    const text = all(el, "[data-kd-text]");
    const start = ms(el, "kdStart");
    const end = ms(el, "kdEnd");
    const span = Math.max(end - start - WORD_TRIM, 0);
    return {
      el,
      index,
      who: (el.dataset.kdWho === "debtor" ? "debtor" : "agent") as Who,
      start,
      end,
      words,
      gap: words.length > 1 ? span / (words.length - 1) : 0,
      text,
      partial: all(el, "[data-kd-partial]"),
      said: words.length
        ? words.map((word) => word.textContent?.trim() ?? "")
        : text.map((node) => node.textContent?.trim() ?? ""),
    };
  });
  type Line = (typeof lines)[number];

  const closers = all(root, "[data-kd-closed]");
  const receipts = all(root, "[data-kd-receipt]");
  const receiptAt = receipts.length ? ms(receipts[0], "kdAt") : callEnd;
  const steps = all(root, "[data-kd-step]").map((el) => ({
    el,
    at: ms(el, "kdAt"),
    done: ms(el, "kdDone"),
    spin: all(el, "[data-kd-spin]"),
    tick: all(el, "[data-kd-tick]"),
    pending: all(el, "[data-kd-pending]"),
    final: all(el, "[data-kd-final]"),
  }));
  const identity = root.querySelector<HTMLElement>("[data-kd-identity]");
  const identityAt = ms(identity, "kdAt");
  const unverified = identity ? all(identity, "[data-kd-unverified]") : [];
  const verified = identity ? all(identity, "[data-kd-verified]") : [];
  const accept = all(root, "[data-kd-accept]");
  const timers = all(root, "[data-kd-time]");
  const counters = all(root, "[data-kd-count]");
  const lanes: Record<Who, Targets> = {
    debtor: all(root, '[data-kd-lane="debtor"] [data-kd-bar]'),
    agent: all(root, '[data-kd-lane="agent"] [data-kd-bar]'),
  };
  const rays = all(root, "[data-kd-ray]");

  const cap = root.querySelector<HTMLElement>("[data-kd-cap]");
  const capWho = cap?.querySelector<HTMLElement>("[data-kd-cap-who]") ?? null;
  const capText = cap?.querySelector<HTMLElement>("[data-kd-cap-text]") ?? null;
  const capWindow = cap?.querySelector<HTMLElement>("[data-kd-cap-window]") ?? null;

  // ── Transcript window ────────────────────────────────────────────────────
  //
  // Every row is in the layout from the start (only opacity and transform
  // change), so row offsets are stable. The list is bottom-anchored in CSS;
  // here it is shifted so the newest row sits at the bottom edge once the
  // rows no longer fit, and at the top until then.
  const scrollBox = root.querySelector<HTMLElement>("[data-kd-scroll]");
  const list = root.querySelector<HTMLElement>("[data-kd-list]");
  const rows = [
    ...lines.map((line) => ({ el: line.el, at: line.start })),
    ...closers.map((el) => ({ el, at: callEnd })),
  ];
  type Metrics = { box: number; height: number; bottoms: number[] };
  let metrics: Metrics | null = null;
  let rowShown = -2;

  const measure = (): Metrics | null => {
    if (!scrollBox || !list) return null;
    const pad = Number.parseFloat(getComputedStyle(list).paddingBottom) || 0;
    return {
      box: scrollBox.clientHeight,
      height: list.offsetHeight,
      bottoms: rows.map((row) => row.el.offsetTop + row.el.offsetHeight + pad),
    };
  };

  const scrollTo = (index: number, force = false) => {
    if (!list || (index === rowShown && !force)) return;
    rowShown = index;
    metrics ??= measure();
    if (!metrics) return;
    const { box, height, bottoms } = metrics;
    const bottom = index < 0 ? 0 : (bottoms[Math.min(index, bottoms.length - 1)] ?? height);
    const offset = Math.min(0, box - bottom) - (box - height);
    list.style.transform = Math.abs(offset) < 0.5 ? "" : `translate3d(0, ${offset.toFixed(1)}px, 0)`;
  };

  if (scrollBox && list && "ResizeObserver" in window) {
    const resize = new ResizeObserver(() => {
      metrics = null;
      if (rowShown > -2) scrollTo(rowShown, true);
    });
    resize.observe(scrollBox);
    resize.observe(list);
  }

  let tipEl: HTMLElement | null = null;
  let nowEl: HTMLElement | null = null;

  const showFinal = () => {
    root.removeAttribute("data-kd-boot");
    root.removeAttribute("data-kd-paused");
    root.dataset.phase = "ended";
    root.dataset.speaker = "ended";
    root.dataset.debtor = "rec";
    root.dataset.agent = "rec";
    tipEl?.removeAttribute("data-kd-tip");
    tipEl = null;
    nowEl?.removeAttribute("data-kd-now");
    nowEl = null;
    scrollTo(rows.length - 1, true);
    if (toggle) toggle.hidden = true;
  };

  if (reduce.matches) {
    showFinal();
    return;
  }

  // ── Per-frame state ──────────────────────────────────────────────────────

  const laneProfile: Record<Who, ReturnType<typeof barProfile>> = {
    debtor: barProfile(lanes.debtor.length, 0.4),
    agent: barProfile(lanes.agent.length, 2.3),
  };
  const rayProfile = rays.map((_, i) => ({
    gain: 0.55 + 0.45 * Math.abs(Math.sin(i * 1.9)),
    speed: 5 + (i % 5) * 1.3,
    phase: i * 1.21,
  }));
  // Each party's loudness, 0..1, tweened by the timeline.
  const voice: Record<Who, number> = { debtor: 0, agent: 0 };
  const flat = { debtor: false, agent: false, rays: false };
  let barsLive = false;

  const paintLane = (who: Who, sec: number) => {
    const bars = lanes[who];
    const amp = voice[who];
    if (amp < 0.001) {
      if (flat[who]) return;
      for (const bar of bars) bar.style.transform = `scaleY(${BAR_FLOOR})`;
      flat[who] = true;
      return;
    }
    flat[who] = false;
    const profile = laneProfile[who];
    const syl = syllable(sec, who === "agent" ? 0 : 2.1);
    for (let i = 0; i < bars.length; i++) {
      const p = profile[i];
      const wobble = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(sec * p.speed + p.phase));
      const scale = BAR_FLOOR + amp * p.gain * wobble * syl * (1 - BAR_FLOOR);
      bars[i].style.transform = `scaleY(${scale.toFixed(3)})`;
    }
  };

  const paintRays = (sec: number) => {
    const amp = Math.max(voice.debtor, voice.agent);
    if (amp < 0.001) {
      if (flat.rays) return;
      for (const ray of rays) ray.style.transform = `scaleY(${RAY_FLOOR})`;
      flat.rays = true;
      return;
    }
    flat.rays = false;
    const syl = syllable(sec, 0.7);
    for (let i = 0; i < rays.length; i++) {
      const p = rayProfile[i];
      const wobble = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(sec * p.speed + p.phase));
      const scale = RAY_FLOOR + amp * p.gain * wobble * syl * (1 - RAY_FLOOR);
      rays[i].style.transform = `scaleY(${scale.toFixed(3)})`;
    }
  };

  const releaseBars = () => {
    // Hand the bars back to CSS, which eases them into the recorded shape.
    for (const bar of lanes.debtor) bar.style.removeProperty("transform");
    for (const bar of lanes.agent) bar.style.removeProperty("transform");
    for (const ray of rays) ray.style.removeProperty("transform");
    flat.debtor = false;
    flat.agent = false;
    flat.rays = false;
  };

  const wordsShown = (line: Line, time: number) => {
    const count = line.words.length;
    if (!count || time < line.start + WORD_LEAD) return 0;
    if (line.gap <= 0) return count;
    return Math.min(count, Math.floor((time - line.start - WORD_LEAD) / line.gap) + 1);
  };

  const phaseAt = (time: number): Phase =>
    time >= callEnd ? "ended" : time >= connect ? "call" : time >= ringAt ? "ring" : "dial";

  const thinkingAt = (time: number) =>
    lines.some(
      (line, i) =>
        line.who === "agent" &&
        i > 0 &&
        time >= lines[i - 1].end + THINK_AFTER &&
        time < line.start,
    );

  let capKey = "";
  const paintCaption = (current: Line | null, time: number) => {
    if (!cap) return;
    let who = "none";
    let label = "";
    let text = "";
    let key = "none";
    if (current) {
      who = current.who;
      label =
        (current.who === "agent" ? cap.dataset.labelAgent : cap.dataset.labelDebtor) ?? "";
      if (current.who === "agent") {
        const shown = wordsShown(current, time);
        text = current.said.slice(0, shown).join(" ");
        key = `${current.index}:${shown}`;
      } else {
        // Human captions land whole once the utterance is final.
        const heard = time >= current.end;
        text = heard ? current.said.join(" ") : "…";
        key = `${current.index}:${heard ? 1 : 0}`;
      }
    }
    if (key === capKey) return;
    capKey = key;
    cap.dataset.who = who;
    if (capWho) capWho.textContent = label;
    if (capText) capText.textContent = text;
    // Top-aligned while it fits, the tail once it wraps past two lines.
    if (capWindow) capWindow.scrollTop = capWindow.scrollHeight;
  };

  const last = { phase: "", speaker: "", debtor: "", agent: "", second: -1, count: -1 };

  const paint = (time: number) => {
    const phase = phaseAt(time);
    const live = phase === "call";

    let talking: Line | null = null;
    let current: Line | null = null;
    if (live) {
      for (const line of lines) {
        if (time < line.start) break;
        current = line;
        if (time < line.end + TALK_TAIL) talking = line;
      }
    }

    const speaker = phase === "ended" ? "ended" : (talking?.who ?? "idle");
    const debtor =
      phase === "ended" ? "rec" : live ? (talking?.who === "debtor" ? "talk" : "quiet") : "off";
    const agent =
      phase === "ended"
        ? "rec"
        : live
          ? talking?.who === "agent"
            ? "talk"
            : thinkingAt(time)
              ? "think"
              : "listen"
          : "off";

    if (phase !== last.phase) {
      root.dataset.phase = phase;
      last.phase = phase;
    }
    if (speaker !== last.speaker) {
      root.dataset.speaker = speaker;
      last.speaker = speaker;
    }
    if (debtor !== last.debtor) {
      root.dataset.debtor = debtor;
      last.debtor = debtor;
    }
    if (agent !== last.agent) {
      root.dataset.agent = agent;
      last.agent = agent;
    }

    // The row being spoken gets a brighter rule.
    const now = talking?.el ?? null;
    if (now !== nowEl) {
      nowEl?.removeAttribute("data-kd-now");
      now?.setAttribute("data-kd-now", "");
      nowEl = now;
    }

    // Caret on the agent's newest word while its caption is still growing.
    let tip: HTMLElement | null = null;
    if (talking?.who === "agent") {
      const shown = wordsShown(talking, time);
      if (shown > 0) tip = talking.words[shown - 1] ?? null;
    }
    if (tip !== tipEl) {
      tipEl?.removeAttribute("data-kd-tip");
      tip?.setAttribute("data-kd-tip", "");
      tipEl = tip;
    }

    paintCaption(current, time);

    // The call timer counts talk time only: it holds at 00:00 while the phone
    // rings and stops when the line closes.
    const talked = Math.min(Math.max(time - connect, 0), callEnd - connect);
    const second = Math.floor(talked / 1000);
    if (second !== last.second) {
      const label = clock(second * 1000);
      for (const el of timers) el.textContent = label;
      last.second = second;
    }

    const doneCount = steps.filter((step) => time >= step.done).length;
    if (doneCount !== last.count) {
      for (const el of counters) el.textContent = `${doneCount} / ${steps.length}`;
      last.count = doneCount;
    }

    let row = -1;
    for (let i = 0; i < rows.length; i++) if (time >= rows[i].at) row = i;
    scrollTo(row);

    if (phase === "ended") {
      if (barsLive) {
        releaseBars();
        barsLive = false;
      }
      return;
    }

    barsLive = true;
    const sec = time / 1000;
    paintLane("debtor", sec);
    paintLane("agent", sec);
    paintRays(sec);
  };

  // Opening state. The timeline tweens below use the same from-values, so a
  // reset lands on exactly this picture.
  setIf(lines.map((line) => line.el), { opacity: 0, translateY: 6 });
  setIf(lines.flatMap((line) => line.words), { opacity: 0 });
  setIf(lines.flatMap((line) => line.text), { opacity: 0 });
  setIf(lines.flatMap((line) => line.partial), { opacity: 0 });
  setIf(steps.map((step) => step.el), { opacity: 0, translateY: 6 });
  setIf(steps.flatMap((step) => step.spin), { opacity: 1 });
  setIf(steps.flatMap((step) => step.tick), { opacity: 0, scale: 0.5 });
  setIf(steps.flatMap((step) => step.pending), { opacity: 1 });
  setIf(steps.flatMap((step) => step.final), { opacity: 0 });
  setIf(unverified, { opacity: 1 });
  setIf(verified, { opacity: 0, translateY: 3 });
  setIf(accept, { scale: 1 });
  setIf(receipts, { opacity: 0, translateY: 12, scale: 0.97 });
  setIf(closers, { opacity: 0 });

  let holdTimer = 0;
  let holding = false;
  let started = false;
  let visible = false;
  let userPaused = false;

  const clearHold = () => {
    if (holdTimer) window.clearTimeout(holdTimer);
    holdTimer = 0;
    holding = false;
  };

  const tl = createTimeline({
    autoplay: false,
    defaults: { ease: "outQuint", duration: 420 },
    onUpdate: (self) => paint(self.currentTime),
    onComplete: () => {
      paint(total);
      holding = true;
      holdTimer = window.setTimeout(() => {
        holdTimer = 0;
        holding = false;
        sync();
      }, HOLD_MS);
    },
  });

  // The debtor presses "accept" just before the call connects.
  if (accept.length) {
    tl.add(accept, { scale: [1, 0.88], duration: 200, ease: "outQuad" }, Math.max(connect - 240, 0));
  }

  for (const line of lines) {
    tl.add(line.el, { opacity: [0, 1], translateY: [6, 0], duration: 380 }, line.start);
    if (line.words.length) {
      tl.add(
        line.words,
        { opacity: [0, 1], duration: WORD_FADE, ease: "outQuad", delay: stagger(line.gap) },
        line.start + WORD_LEAD,
      );
    }
    if (line.partial.length) {
      tl.add(line.partial, { opacity: [0, 1], duration: 200, ease: "outQuad" }, line.start);
      tl.add(line.partial, { opacity: [1, 0], duration: 160, ease: "linear" }, line.end);
    }
    if (line.text.length) {
      tl.add(line.text, { opacity: [0, 1], duration: 300, ease: "outQuad" }, line.end);
    }
    // Separate lanes, so one party's fade-out never fights the other's rise.
    tl.add(voice, { [line.who]: [0, 1], duration: 220, ease: "outQuad" }, line.start);
    tl.add(voice, { [line.who]: [1, 0], duration: 320, ease: "inOutQuad" }, line.end);
  }

  for (const step of steps) {
    tl.add(step.el, { opacity: [0, 1], translateY: [6, 0], duration: 380 }, step.at);
    if (step.spin.length) {
      tl.add(step.spin, { opacity: [1, 0], duration: 160, ease: "linear" }, step.done);
    }
    if (step.tick.length) {
      tl.add(
        step.tick,
        { opacity: [0, 1], scale: [0.5, 1], duration: 420, ease: "outBack(1.6)" },
        step.done,
      );
    }
    if (step.pending.length) {
      tl.add(step.pending, { opacity: [1, 0], duration: 160, ease: "linear" }, step.done);
    }
    if (step.final.length) {
      tl.add(step.final, { opacity: [0, 1], duration: 320, ease: "outQuad" }, step.done + 60);
    }
  }

  // KVKK gate: the identity card flips once verify_identity passes.
  if (unverified.length) {
    tl.add(unverified, { opacity: [1, 0], duration: 180, ease: "linear" }, identityAt);
  }
  if (verified.length) {
    tl.add(verified, { opacity: [0, 1], translateY: [3, 0], duration: 360 }, identityAt + 60);
  }

  if (receipts.length) {
    tl.add(
      receipts,
      { opacity: [0, 1], translateY: [12, 0], scale: [0.97, 1], duration: 700 },
      receiptAt,
    );
  }
  if (closers.length) {
    tl.add(closers, { opacity: [0, 1], duration: 400, ease: "outQuad" }, callEnd);
  }
  // Pads the timeline so the end card sits for a beat before the hold.
  tl.add({ duration: 1 }, Math.max(total - 1, callEnd + 1));

  const replay = () => {
    tl.restart();
    paint(0);
  };

  function sync() {
    const run = visible && !userPaused && !document.hidden;
    root.toggleAttribute("data-kd-paused", !run);
    if (!run) {
      tl.pause();
      clearHold();
      return;
    }
    if (holding) return;
    if (!started) {
      started = true;
      tl.play();
      return;
    }
    if (tl.completed) {
      replay();
      return;
    }
    tl.play();
  }

  const renderToggle = () => {
    if (!toggle) return;
    toggle.setAttribute(
      "aria-label",
      (userPaused ? toggle.dataset.labelPlay : toggle.dataset.labelPause) ?? "",
    );
    toggle.dataset.state = userPaused ? "paused" : "playing";
  };

  if (toggle) {
    toggle.hidden = false;
    renderToggle();
    toggle.addEventListener("click", () => {
      userPaused = !userPaused;
      renderToggle();
      sync();
    });
  }

  root.toggleAttribute("data-kd-paused", true);
  paint(0);
  root.removeAttribute("data-kd-boot");

  if (!("IntersectionObserver" in window)) {
    visible = true;
    sync();
  } else {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // A display:none stage (the inactive ProductDemos tab) reports zero
        // height and a zero root; treat it as out of view, not as fully seen.
        if (!entry.isIntersecting || entry.boundingClientRect.height === 0) {
          visible = false;
          sync();
          return;
        }
        const height = entry.boundingClientRect.height;
        const seen = entry.intersectionRect.height;
        const view = entry.rootBounds?.height || window.innerHeight;
        visible = visible
          ? seen / height > HIDE_RATIO
          : seen >= Math.min(height * SHOW_RATIO, view * SHOW_VIEWPORT);
        sync();
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(stage);
  }

  document.addEventListener("visibilitychange", sync);

  reduce.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    userPaused = true;
    clearHold();
    tl.pause();
    tl.seek(total, true);
    paint(total);
    showFinal();
  });
}
