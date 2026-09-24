// Scripted Hastam call for the product stage under the hero.
//
// Ported from kollektor-demo/sequence.ts and re-prefixed (data-hd-*, hd-*) so
// both demos can live on one page; fixes made there do not carry over.
//
// The markup ships the finished call (every caption, every call step, the
// appointment request, the phone's "call ended" status), so reduced-motion
// visitors and a failed script both see a complete picture. With motion
// allowed, an inline boot script in HastamDemo.astro flips the root to its
// opening state (the patient's phone dialling the clinic) before paint; this
// module then takes over, plays one anime.js timeline while the stage is on
// screen, holds the end for a few seconds, resets and plays again. Timings live
// in data attributes written by the component, so copy and choreography stay
// in one place.
//
// Timeline: dial (the patient calls the clinic) -> ring (the clinic's line
// rings) -> call (Hastam answers; the timer starts) -> ended. The root carries
// the state as attributes and CSS does the rest: data-hd-phase,
// data-hd-speaker (who is talking), data-hd-patient and data-hd-agent (each
// channel's status word).
//
// The demo may sit in a tab panel that is display:none while another tab is
// open. It pauses whenever its stage collapses or leaves the viewport and, if
// it was collapsed, starts again from the top when it is shown again.

import { createTimeline, stagger, utils } from "animejs";

type Who = "agent" | "patient";
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
// The agent is "thinking" from this long after the patient stops until it speaks.
const THINK_AFTER = 100;
// Agent captions grow word by word: the first word waits WORD_LEAD, each word
// fades over WORD_FADE, and the words spread over the line minus WORD_TRIM so
// the last one lands just as the line ends.
const WORD_LEAD = 80;
const WORD_FADE = 260;
const WORD_TRIM = 320;
// Open times come back from the slot lookup one after another.
const SLOT_STAGGER = 70;

const ms = (el: HTMLElement | undefined | null, key: string) => {
  const value = Number(el?.dataset[key]);
  return Number.isFinite(value) ? value : 0;
};

// Keep in step with clock() in HastamDemo.astro.
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

export function initHastamDemo(root: HTMLElement) {
  if (root.dataset.hdInit !== undefined) return;
  root.dataset.hdInit = "";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = root.querySelector<HTMLButtonElement>("[data-hd-toggle]");
  const stage = root.querySelector<HTMLElement>("[data-hd-stage]") ?? root;

  const ringAt = ms(root, "hdRing");
  const connect = ms(root, "hdConnect");
  const callEnd = ms(root, "hdEnd");
  const total = ms(root, "hdTotal");

  const lines = all(root, "[data-hd-line]").map((el, index) => {
    const words = all(el, "[data-hd-word]");
    const text = all(el, "[data-hd-text]");
    const start = ms(el, "hdStart");
    const end = ms(el, "hdEnd");
    const span = Math.max(end - start - WORD_TRIM, 0);
    return {
      el,
      index,
      who: (el.dataset.hdWho === "patient" ? "patient" : "agent") as Who,
      start,
      end,
      words,
      gap: words.length > 1 ? span / (words.length - 1) : 0,
      text,
      partial: all(el, "[data-hd-partial]"),
      said: words.length
        ? words.map((word) => word.textContent?.trim() ?? "")
        : text.map((node) => node.textContent?.trim() ?? ""),
    };
  });
  type Line = (typeof lines)[number];

  const closers = all(root, "[data-hd-closed]");
  const receipts = all(root, "[data-hd-receipt]");
  const receiptAt = receipts.length ? ms(receipts[0], "hdAt") : callEnd;
  const steps = all(root, "[data-hd-step]").map((el) => ({
    el,
    at: ms(el, "hdAt"),
    done: ms(el, "hdDone"),
    spin: all(el, "[data-hd-spin]"),
    tick: all(el, "[data-hd-tick]"),
    pending: all(el, "[data-hd-pending]"),
    final: all(el, "[data-hd-final]"),
    slots: all(el, "[data-hd-slot]"),
  }));
  // Triage gate: "listening" until the complaint has been screened for red
  // flags, then "no red flags".
  const triage = root.querySelector<HTMLElement>("[data-hd-triage]");
  const triageAt = ms(triage, "hdAt");
  const screening = triage ? all(triage, "[data-hd-screening]") : [];
  const clear = triage ? all(triage, "[data-hd-clear]") : [];
  // The time the patient picked, highlighted once their answer lands.
  const picks = all(root, "[data-hd-pick]");
  const pickAt = picks.length ? ms(picks[0], "hdAt") : callEnd;
  const timers = all(root, "[data-hd-time]");
  const counters = all(root, "[data-hd-count]");
  const lanes: Record<Who, Targets> = {
    patient: all(root, '[data-hd-lane="patient"] [data-hd-bar]'),
    agent: all(root, '[data-hd-lane="agent"] [data-hd-bar]'),
  };
  const rays = all(root, "[data-hd-ray]");

  const cap = root.querySelector<HTMLElement>("[data-hd-cap]");
  const capWho = cap?.querySelector<HTMLElement>("[data-hd-cap-who]") ?? null;
  const capText = cap?.querySelector<HTMLElement>("[data-hd-cap-text]") ?? null;
  const capWindow = cap?.querySelector<HTMLElement>("[data-hd-cap-window]") ?? null;

  // ── Transcript window ────────────────────────────────────────────────────
  //
  // Every row is in the layout from the start (only opacity and transform
  // change), so row offsets are stable. The list is bottom-anchored in CSS;
  // here it is shifted so the newest row sits at the bottom edge once the
  // rows no longer fit, and at the top until then.
  const scrollBox = root.querySelector<HTMLElement>("[data-hd-scroll]");
  const list = root.querySelector<HTMLElement>("[data-hd-list]");
  const rows = [
    ...lines.map((line) => ({ el: line.el, at: line.start })),
    ...closers.map((el) => ({ el, at: callEnd })),
  ];
  type Metrics = { box: number; height: number; bottoms: number[] };
  let metrics: Metrics | null = null;
  let rowShown = -2;

  const measure = (): Metrics | null => {
    if (!scrollBox || !list) return null;
    // A collapsed tab panel measures 0; measure again once it is shown.
    if (!scrollBox.clientHeight) return null;
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
    root.removeAttribute("data-hd-boot");
    root.removeAttribute("data-hd-paused");
    root.dataset.hdPhase = "ended";
    root.dataset.hdSpeaker = "ended";
    root.dataset.hdPatient = "rec";
    root.dataset.hdAgent = "rec";
    tipEl?.removeAttribute("data-hd-tip");
    tipEl = null;
    nowEl?.removeAttribute("data-hd-now");
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
    patient: barProfile(lanes.patient.length, 0.4),
    agent: barProfile(lanes.agent.length, 2.3),
  };
  const rayProfile = rays.map((_, i) => ({
    gain: 0.55 + 0.45 * Math.abs(Math.sin(i * 1.9)),
    speed: 5 + (i % 5) * 1.3,
    phase: i * 1.21,
  }));
  // Each party's loudness, 0..1, tweened by the timeline.
  const voice: Record<Who, number> = { patient: 0, agent: 0 };
  const flat = { patient: false, agent: false, rays: false };
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
    const amp = Math.max(voice.patient, voice.agent);
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
    for (const bar of lanes.patient) bar.style.removeProperty("transform");
    for (const bar of lanes.agent) bar.style.removeProperty("transform");
    for (const ray of rays) ray.style.removeProperty("transform");
    flat.patient = false;
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
        (current.who === "agent" ? cap.dataset.labelAgent : cap.dataset.labelPatient) ?? "";
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

  const last = { phase: "", speaker: "", patient: "", agent: "", second: -1, count: -1 };

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
    const patient =
      phase === "ended" ? "rec" : live ? (talking?.who === "patient" ? "talk" : "quiet") : "off";
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
      root.dataset.hdPhase = phase;
      last.phase = phase;
    }
    if (speaker !== last.speaker) {
      root.dataset.hdSpeaker = speaker;
      last.speaker = speaker;
    }
    if (patient !== last.patient) {
      root.dataset.hdPatient = patient;
      last.patient = patient;
    }
    if (agent !== last.agent) {
      root.dataset.hdAgent = agent;
      last.agent = agent;
    }

    // The row being spoken gets a brighter rule.
    const now = talking?.el ?? null;
    if (now !== nowEl) {
      nowEl?.removeAttribute("data-hd-now");
      now?.setAttribute("data-hd-now", "");
      nowEl = now;
    }

    // Caret on the agent's newest word while its caption is still growing.
    let tip: HTMLElement | null = null;
    if (talking?.who === "agent") {
      const shown = wordsShown(talking, time);
      if (shown > 0) tip = talking.words[shown - 1] ?? null;
    }
    if (tip !== tipEl) {
      tipEl?.removeAttribute("data-hd-tip");
      tip?.setAttribute("data-hd-tip", "");
      tipEl = tip;
    }

    paintCaption(current, time);

    // The call timer counts talk time only: it holds at 00:00 while the line
    // rings and stops when the call closes.
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
    paintLane("patient", sec);
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
  setIf(steps.flatMap((step) => step.slots), { opacity: 0 });
  setIf(screening, { opacity: 1 });
  setIf(clear, { opacity: 0, translateY: 3 });
  setIf(picks, { opacity: 0, scale: 0.92 });
  setIf(receipts, { opacity: 0, translateY: 12, scale: 0.97 });
  setIf(closers, { opacity: 0 });

  let holdTimer = 0;
  let holding = false;
  let started = false;
  let visible = false;
  let userPaused = false;
  // Set when the stage collapsed (its tab panel was hidden): the next run
  // starts from the top instead of resuming mid-call.
  let rewind = false;

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
    if (step.slots.length) {
      tl.add(
        step.slots,
        { opacity: [0, 1], duration: 260, ease: "outQuad", delay: stagger(SLOT_STAGGER) },
        step.done + 60,
      );
    }
  }

  // Triage gate: flips once the complaint has been screened.
  if (screening.length) {
    tl.add(screening, { opacity: [1, 0], duration: 180, ease: "linear" }, triageAt);
  }
  if (clear.length) {
    tl.add(clear, { opacity: [0, 1], translateY: [3, 0], duration: 360 }, triageAt + 60);
  }

  if (picks.length) {
    tl.add(picks, { opacity: [0, 1], scale: [0.92, 1], duration: 320, ease: "outQuad" }, pickAt);
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
    root.toggleAttribute("data-hd-paused", !run);
    if (!run) {
      tl.pause();
      clearHold();
      return;
    }
    if (holding) return;
    if (!started) {
      started = true;
      rewind = false;
      tl.play();
      return;
    }
    if (rewind || tl.completed) {
      rewind = false;
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

  root.toggleAttribute("data-hd-paused", true);
  paint(0);
  root.removeAttribute("data-hd-boot");

  const setVisible = (next: boolean) => {
    if (next && !visible) {
      // Anything measured while the panel was collapsed read 0, and the
      // caption's scroll position is lost while it is display:none.
      metrics = null;
      capKey = "";
      paint(tl.currentTime);
      if (rowShown > -2) scrollTo(rowShown, true);
    }
    visible = next;
    sync();
  };

  if (!("IntersectionObserver" in window)) {
    setVisible(true);
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        // Quick tab switches can queue several entries; the newest wins.
        const entry = entries[entries.length - 1];
        if (!entry) return;
        const collapsed = entry.boundingClientRect.height === 0;
        if (collapsed && started && !userPaused) rewind = true;
        const height = entry.boundingClientRect.height || 1;
        const seen = entry.isIntersecting ? entry.intersectionRect.height : 0;
        // A target inside a display:none panel reports rootBounds of height 0,
        // which would make the "half the viewport" test pass with nothing seen.
        const view = entry.rootBounds?.height || window.innerHeight;
        setVisible(
          collapsed
            ? false
            : visible
              ? seen / height > HIDE_RATIO
              : seen > 0 && seen >= Math.min(height * SHOW_RATIO, view * SHOW_VIEWPORT),
        );
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
