/**
 * Temporary DEV speech driver. Pumps a TTS-like envelope into `orb-level` /
 * `orb-live` — the same events a real LiveKit call emits — so the talking
 * motion can be tuned without dialling the agent.
 *
 * Off by default. Opt in with `?talk=1` on a dev server; never runs in a
 * production build. Safe to delete along with its three call sites.
 */

type Key = { t: number; v: number };

let raf = 0;
let running = false;
let origin = 0;
let cursor = 0;
let generatedUntil = 0;
let keys: Key[] = [];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function push(t: number, v: number) {
  keys.push({ t, v: Math.min(1, Math.max(0, v)) });
}

function writePhrase(start: number) {
  let t = start;
  const bursts = 1 + Math.floor(Math.random() * 2);

  for (let burst = 0; burst < bursts; burst += 1) {
    const syllables = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < syllables; i += 1) {
      const peak = rand(0.42, 0.88);
      const attack = rand(0.07, 0.12);
      const hold = rand(0.16, 0.28);
      const decay = rand(0.18, 0.32);
      push(t, rand(0.04, 0.1));
      t += attack;
      push(t, peak);
      t += hold;
      push(t, peak * rand(0.72, 0.9));
      t += decay;
      push(t, rand(0.03, 0.08));
    }
    if (burst < bursts - 1) {
      t += rand(0.28, 0.5);
      push(t, 0);
    }
  }

  t += rand(1.1, 1.8);
  push(t, 0);
  generatedUntil = t;
}

function ensure(until: number) {
  if (keys.length === 0) {
    push(0, 0);
    generatedUntil = 0;
  }
  while (generatedUntil < until) writePhrase(generatedUntil);
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

export function startMimicTalking() {
  if (!allowed()) return;
  window.dispatchEvent(new CustomEvent("orb-live", { detail: true }));
  if (running) return;
  running = true;
  origin = 0;
  cursor = 0;
  generatedUntil = 0;
  keys = [];
  raf = requestAnimationFrame(tick);
}

export function stopMimicTalking() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(raf);
  raf = 0;
  window.dispatchEvent(new CustomEvent("orb-level", { detail: 0 }));
}

export function isMimickingTalk() {
  return running;
}
