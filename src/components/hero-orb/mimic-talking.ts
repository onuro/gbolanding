/**
 * Temporary DEV speech driver. Pumps a TTS-like envelope into `orb-level` /
 * `orb-live` — the same events a real LiveKit call emits — so the talking
 * motion can be tuned without dialling the agent.
 *
 * The envelope is synthesised from a real Kollektor call script: syllables are
 * counted per word, punctuation becomes breath, and the two speakers trade
 * turns, so the rhythm matches a conversation rather than random noise.
 *
 * Off by default. Opt in with `?talk=1` on a dev server. It is pulled in by a
 * dev-only dynamic import, so no part of this file reaches a production
 * bundle. It steps aside on its own when a real call takes over, which is why
 * nothing else in the app has to import it.
 */

type Turn = { speaker: "agent" | "debtor"; text: string };

// Built lazily rather than at module scope: that keeps the literals reachable
// only from dead code, so a production build drops the script entirely.
let cachedScript: Turn[] | null = null;
function script(): Turn[] {
  cachedScript ??= [
    {
      speaker: "agent",
      text: "Good afternoon, this is Kollektor calling on behalf of your creditor.",
    },
    { speaker: "debtor", text: "Yes, I was expecting this call." },
    {
      speaker: "agent",
      text: "Your payment of twelve thousand five hundred is overdue. Will you be able to settle it today?",
    },
    { speaker: "debtor", text: "I can pay it by six this evening." },
    {
      speaker: "agent",
      text: "Thank you. I have recorded a payment promise for today at eighteen hundred.",
    },
  ];
  return cachedScript;
}

// The agent is on the line; the caller is further from their microphone.
const GAIN = { agent: 1, debtor: 0.72 } as const;

type Key = { t: number; v: number };

let raf = 0;
let running = false;
let origin = 0;
let cursor = 0;
let turn = 0;
let generatedUntil = 0;
let keys: Key[] = [];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function push(t: number, v: number) {
  keys.push({ t, v: Math.min(1, Math.max(0, v)) });
}

/** Vowel groups are a good enough syllable count for both English and Turkish. */
function syllables(word: string) {
  const groups = word.toLowerCase().match(/[aeıioöuüàâäéèêëîïôùûy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

function writeTurn(start: number, { speaker, text }: Turn) {
  const gain = GAIN[speaker];
  const words = text.split(/\s+/).filter(Boolean);
  const total = words.length;
  let t = start;

  words.forEach((word, index) => {
    const count = syllables(word);
    // Energy tails off across a sentence the way a spoken line does.
    const declination = 1 - (index / Math.max(1, total - 1)) * 0.3;

    for (let i = 0; i < count; i += 1) {
      // The first syllable of a word carries the stress.
      const stress = i === 0 ? 1 : 0.82;
      const peak = rand(0.72, 1.0) * gain * declination * stress;
      const attack = rand(0.05, 0.09);
      const hold = rand(0.07, 0.14);
      const decay = rand(0.08, 0.15);

      push(t, rand(0.05, 0.14) * gain);
      t += attack;
      push(t, peak);
      t += hold;
      push(t, peak * rand(0.8, 0.95));
      t += decay;
      push(t, rand(0.03, 0.1) * gain);
      t += rand(0.015, 0.045);
    }

    if (/[,;:]$/.test(word)) {
      push(t, 0.02);
      t += rand(0.2, 0.32);
    } else if (/[.!?]$/.test(word) && index < total - 1) {
      push(t, 0);
      t += rand(0.42, 0.62);
    } else {
      t += rand(0.03, 0.07);
    }
  });

  push(t, 0);
  return t;
}

function ensure(until: number) {
  if (keys.length === 0) {
    push(0, 0);
    generatedUntil = 0;
  }

  while (generatedUntil < until) {
    const lines = script();
    const current = lines[turn % lines.length]!;
    const next = lines[(turn + 1) % lines.length]!;
    let t = writeTurn(generatedUntil, current);

    // Answering is quick; composing a reply takes a beat longer.
    t += next.speaker === "agent" ? rand(0.7, 1.1) : rand(0.35, 0.6);
    // A pause before the script starts over, so loops do not run together.
    if ((turn + 1) % lines.length === 0) t += rand(1.2, 1.8);

    push(t, 0);
    generatedUntil = t;
    turn += 1;
  }

  const keepFrom = until - 1.2;
  if (keys[0] && keys[0].t < keepFrom) {
    const firstKept = keys.findIndex((key) => key.t >= keepFrom);
    if (firstKept > 0) {
      keys = keys.slice(firstKept - 1);
      cursor = Math.max(0, cursor - (firstKept - 1));
    }
  }
}

function sample(t: number) {
  ensure(t + 0.9);
  while (cursor + 1 < keys.length && keys[cursor + 1]!.t < t) cursor += 1;
  const a = keys[cursor] ?? { t, v: 0 };
  const b = keys[cursor + 1] ?? a;
  if (b.t === a.t) return a.v;
  const u = (t - a.t) / (b.t - a.t);
  return a.v + (b.v - a.v) * Math.min(1, Math.max(0, u));
}

function allowed() {
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(window.location.search).get("talk") === "1";
}

function tick(now: number) {
  if (!running) return;
  if (!origin) origin = now;
  const level = sample((now - origin) * 0.001);
  window.dispatchEvent(new CustomEvent("orb-level", { detail: level }));
  raf = requestAnimationFrame(tick);
}

let announcing = false;
function announceLive(live: boolean) {
  announcing = true;
  window.dispatchEvent(new CustomEvent("orb-live", { detail: live }));
  announcing = false;
}

function play() {
  if (running) return;
  running = true;
  origin = 0;
  cursor = 0;
  turn = 0;
  generatedUntil = 0;
  keys = [];
  announceLive(true);
  raf = requestAnimationFrame(tick);
}

function pause() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(raf);
  raf = 0;
  window.dispatchEvent(new CustomEvent("orb-level", { detail: 0 }));
}

/** A real call owns the orb while it lasts; the script resumes afterwards. */
function onLive(event: Event) {
  if (announcing) return;
  if ((event as CustomEvent<boolean>).detail === true) pause();
  else play();
}

export function startMimicTalking() {
  if (!allowed()) return;
  window.addEventListener("orb-live", onLive);
  play();
}

export function stopMimicTalking() {
  window.removeEventListener("orb-live", onLive);
  pause();
}
