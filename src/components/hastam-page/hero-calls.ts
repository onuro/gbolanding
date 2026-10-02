// Plays the sample calls on the hero picture of /hastam.
//
// The markup ships the finished state: the first call, every line and its
// result on the clinic's screen. This script only replays what is there. It
// marks the root data-hc-playing, hides the parts of the picked call, and
// gives them data-shown one at a time: each line of the conversation, then
// the result. After a hold it moves to the next call.
//
// Rules it keeps:
//   - The first call is never blanked at load. A visitor glancing at the hero
//     must not meet an empty conversation, so the page opens on the finished
//     first call and the motion starts with the second.
//   - A tab the visitor picks shows that call complete and stops the loop; the
//     play button starts it again from there.
//   - Pausing never leaves a half-drawn call: it settles to the finished one.
//   - Off screen, in a hidden tab or with reduced motion, nothing runs.

/** How long a finished call stays before the next one starts. */
const HOLD_MS = 4200;
/** The beat between picking a call and its first line. */
const LEAD_MS = 700;
/** Reading time for one line: a base plus a little per character, capped. */
const lineMs = (chars: number) => Math.min(3200, 900 + chars * 26);
/** Start once this much of the stage is on screen; stop once it has almost left. */
const SHOW_RATIO = 0.35;
const HIDE_RATIO = 0.05;

export function initHeroCalls(root: HTMLElement) {
  if (root.dataset.hcInit !== undefined) return;
  root.dataset.hcInit = "";

  const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-hc-tab]")];
  const scenes = [...root.querySelectorAll<HTMLElement>("[data-hc-scene]")];
  const toggle = root.querySelector<HTMLButtonElement>("[data-hc-toggle]");
  if (!scenes.length) return;

  const partsOf = (scene: HTMLElement) => [
    ...scene.querySelectorAll<HTMLElement>("[data-hc-part]"),
  ];

  let active = 0;
  /** Index of the next part to show in the active call. */
  let step = 0;
  /** False once the visitor picked a tab or pressed pause. */
  let looping = false;
  let visible = false;
  let timer = 0;

  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  };

  const select = (index: number) => {
    active = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", i === index ? "true" : "false");
      tab.tabIndex = i === index ? 0 : -1;
    });
    scenes.forEach((scene, i) => {
      scene.toggleAttribute("data-active", i === index);
      scene.inert = i !== index;
    });
  };

  /** The finished picture of the active call. */
  const settle = () => {
    clear();
    root.removeAttribute("data-hc-playing");
    root.dataset.hcSpeaker = "none";
  };

  const renderToggle = () => {
    if (!toggle) return;
    toggle.dataset.state = looping ? "playing" : "paused";
    toggle.setAttribute(
      "aria-label",
      (looping ? toggle.dataset.labelPause : toggle.dataset.labelPlay) ?? "",
    );
  };

  const running = () => looping && visible && !document.hidden;

  const schedule = (ms: number) => {
    clear();
    if (running()) timer = window.setTimeout(tick, ms);
  };

  const begin = (index: number) => {
    select(index);
    step = 0;
    for (const part of partsOf(scenes[index])) part.removeAttribute("data-shown");
    root.dataset.hcSpeaker = "none";
    root.setAttribute("data-hc-playing", "");
    schedule(LEAD_MS);
  };

  function tick() {
    timer = 0;
    const parts = partsOf(scenes[active]);
    if (step >= parts.length) {
      begin((active + 1) % scenes.length);
      return;
    }
    const part = parts[step];
    step += 1;
    part.setAttribute("data-shown", "");
    root.dataset.hcSpeaker = part.dataset.who ?? "none";
    schedule(step === parts.length ? HOLD_MS : lineMs(part.textContent?.trim().length ?? 0));
  }

  /** Re-arm after the stage came back on screen or the loop was switched on. */
  const resume = () => {
    if (!running() || timer) return;
    if (root.hasAttribute("data-hc-playing")) schedule(LEAD_MS);
    // Nothing is mid-play: hold the finished call, then start the next one.
    else timer = window.setTimeout(() => begin((active + 1) % scenes.length), HOLD_MS);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      looping = false;
      settle();
      select(index);
      renderToggle();
    });
    tab.addEventListener("keydown", (event) => {
      const last = tabs.length - 1;
      const next =
        event.key === "ArrowRight"
          ? index === last
            ? 0
            : index + 1
          : event.key === "ArrowLeft"
            ? index === 0
              ? last
              : index - 1
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? last
                : -1;
      if (next < 0) return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Reduced motion: the tabs still switch calls, each one complete. No loop
  // and no play button.
  if (reduce.matches) return;

  looping = true;

  if (toggle) {
    toggle.hidden = false;
    renderToggle();
    toggle.addEventListener("click", () => {
      looping = !looping;
      renderToggle();
      if (looping) begin(active);
      else settle();
    });
  }

  if (!("IntersectionObserver" in window)) {
    visible = true;
    resume();
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        const height = entry.boundingClientRect.height || 1;
        const seen = entry.isIntersecting ? entry.intersectionRect.height : 0;
        const next = visible ? seen / height > HIDE_RATIO : seen / height >= SHOW_RATIO;
        if (next === visible) return;
        visible = next;
        if (visible) resume();
        else clear();
      },
      { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
    );
    observer.observe(root);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
    else resume();
  });

  reduce.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    looping = false;
    settle();
    if (toggle) toggle.hidden = true;
  });
}
