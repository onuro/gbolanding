// The rest of the face while she talks (a moving mouth on a still face reads as a robot). From the research spec of
// 2026-09-25 (section 5): the head moves on ~90 % of speaking frames and follows the voice's pitch (head motion
// explains > 60 % of the pitch variance), with small nods on strong accents (1-3 deg, 150-300 ms, down first) and
// stillness at phrase breaks; about 1 in 7 accents gets a brow raise (onset ~60 ms before, 300-600 ms); blinks come
// 23-26 / min while speaking, at phrase ends and pauses (close ~90 ms, open ~240 ms); a reply often starts with a
// short glance away, and long turns glance aside for ~2 s every ~4-5 s (mostly the eyes, 5-10 deg).
// Sizes are kept on the calm side for the hero (the brows especially: stronger brow morphs bend the forehead).
import type { AlignSeg } from './align-stream';

const DEG = Math.PI / 180;
const quintic = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * t * (t * (6 * t - 15) + 10); };

export interface FaceIn {
  /** display time, ms (audio clock) */
  t: number;
  dt: number;
  /** 0..1 speaking engagement (slow) */
  speak: number;
  loud: number;
  /** voice pitch at t, Hz (NaN unvoiced) */
  f0: number;
  segs: readonly AlignSeg[];
}

export interface FaceOut {
  /** additive head pose, rad (+ pitch nods down) */
  pitch: number;
  yaw: number;
  roll: number;
  /** additive inner-brow raise */
  brow: number;
  /** blink 0..1 while speaking (null: leave the idle blinks) */
  blink: number | null;
  /** eye-in-head offset, rad */
  gazeYaw: number;
  gazePitch: number;
}

export function createSpeechFace(seed = 1) {
  let r = seed * 9301 + 49297;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  // pitch statistics (log F0), running
  let lm = Math.log(240), lv = 0.04, f0z = 0;
  // head
  let tHead = 0, nodT = -1e9, nodK = 0, nodLen = 400, pitchS = 0, pitchV = 0, lastAccent = -1e9, accents = 0, nextBrowIn = 3 + Math.floor(rnd() * 5);
  let browT = -1e9, browA = 1;
  // blinks
  let blinkT = -1e9, lastPauseSeen = -1e9, nextRandomBlink = 2600, quietMs = 0;
  // gaze
  let silentSince = 0, wasSpeaking = false, gazeTarget = [0, 0], gazeUntil = -1e9, nextGlance = 4500, gy = 0, gp = 0;
  let speechRun = 0;

  return {
    step(inp: FaceIn): FaceOut {
      const { t, dt, speak } = inp;
      const h = Math.max(0, Math.min(0.1, dt));
      quietMs = inp.loud < 0.05 ? quietMs + h * 1000 : 0;
      // ---- pitch-driven head: z-scored log F0, smoothed (~120 ms), heads up a little on high pitch
      if (Number.isFinite(inp.f0) && inp.f0 > 70 && inp.f0 < 500) {
        const l = Math.log(inp.f0);
        lm += (l - lm) * Math.min(1, h / 4);
        lv += ((l - lm) ** 2 - lv) * Math.min(1, h / 4);
        const z = Math.max(-2.5, Math.min(2.5, (l - lm) / Math.sqrt(Math.max(1e-4, lv))));
        f0z += (z - f0z) * (1 - Math.exp(-h / 0.12));
      } else f0z *= Math.exp(-h / 0.4);
      tHead += h * (0.6 + 0.8 * speak);
      // ---- accents: a stressed / loud vowel starting near t (the timeline runs ahead of t by the look-ahead)
      const acc = inp.segs.find((s) => s.kind === 'V' && s.start > t - 5 && s.start <= t + 70);
      if (acc && acc.start - lastAccent > 380 && inp.loud > 0.45) {
        lastAccent = acc.start;
        accents++;
        // strong accents nod (about 1 in 2, some skipped), with varied size and length; the rest pass
        if ((inp.loud > 0.62 || acc.stress) && rnd() < 0.7 && acc.start - nodT > 900) { nodT = acc.start - 60; nodK = 0.3 + 0.8 * rnd(); nodLen = 320 + 200 * rnd(); }
        // a brow raise on ~1 in 4-5 accents (and the first strong one of a reply; 1 in 7 left 8 s of English with one)
        if (--nextBrowIn <= 0 || accents === 1) { browT = acc.start - 60; browA = 0.8 + 0.25 * rnd(); nextBrowIn = 2 + Math.floor(rnd() * 3); }
      }
      // a nod: down with a slow ease in, back a little slower (quintic on both sides, no single-frame start)
      const nodU = (t - nodT) / nodLen;
      // (sizes kept small: the cheek highlights follow the head's pitch, and bigger nods made them pulse)
      const nod = nodU > 0 && nodU < 1 ? (nodU < 0.4 ? quintic(nodU / 0.4) : 1 - quintic((nodU - 0.4) / 0.6)) * nodK * 1.15 * DEG : 0;
      const pitchT = speak * (-0.95 * DEG * f0z) + nod;
      // pitch through a critically damped spring (~150 ms): no single-frame steps and no sharp reversals (a slew limit
      // alone made triangular nods)
      { const w = 13, d = pitchS - pitchT, e = Math.exp(-w * h), kk = pitchV + w * d; pitchS = pitchT + (d + kk * h) * e; pitchV = (pitchV - w * kk * h) * e; }
      const pitch = pitchS;
      // (small: the cheek highlight sits near the terminator and flares with ~1 deg of yaw)
      const yaw = speak * DEG * (0.4 * Math.sin(tHead * 1.45 + 0.4) + 0.22 * Math.sin(tHead * 2.9 + 1.7) + 0.08 * Math.sin(tHead * 5.3 + 3.1));
      const roll = speak * DEG * (0.35 * Math.sin(tHead * 1.1 + 2.2) + 0.2 * Math.sin(tHead * 3.7 + 0.9));
      // ---- brow: 120 ms up, 100 ms hold, 260 ms down
      const bu = t - browT;
      const brow = bu < 0 ? 0 : bu < 120 ? quintic(bu / 120) : bu < 220 ? 1 : bu < 480 ? 1 - quintic((bu - 220) / 260) : 0;
      // ---- blinks while speaking: at a pause (phrase end), else ~every 2.6 s
      let blink: number | null = null;
      if (speak > 0.3) {
        const pause = inp.segs.find((s) => s.kind === 'P' && s.end - s.start >= 150 && s.start > lastPauseSeen && s.start <= t && s.start > t - 300);
        // at least ~1.8 s between blinks (closer ones read as fluttery / nervous)
        if (pause) { lastPauseSeen = pause.start; if (t - blinkT > 1800 && rnd() < 0.75) { blinkT = pause.start + 40 + 80 * rnd(); nextRandomBlink = 2200 + rnd() * 3200; } }
        // a timed blink waits for a word / phrase boundary (a pause in the timeline or a real dip in the voice), up to ~1.5 s,
        // and is skipped rather than placed mid-word
        if (t - blinkT > nextRandomBlink) {
          // (a real pause: a timeline pause here, or >= 120 ms of quiet; a stop closure's 60 ms silence is mid-word)
          const inPause = inp.segs.some((q) => q.kind === 'P' && q.end - q.start >= 150 && q.start <= t && q.end > t + 60) || quietMs >= 120;
          // after ~1.2 s of waiting a word boundary will do (a short pause or ~50 ms of quiet): long fluent English
          // stretches have few real pauses and 8 s with one blink read as staring (people blink ~15-25 / min talking)
          const waited = t - blinkT - nextRandomBlink;
          const atBoundary = waited > 500 && (quietMs >= 50 || inp.segs.some((q) => q.kind === 'P' && q.start <= t && q.end > t + 30));
          // (and at the latest ~1.2 s late, mid-word: 4.5 s without a blink in fluent English read as staring; ~3-4.5 s
          // apart while talking)
          if (inPause || atBoundary || waited > 1200) { blinkT = t; nextRandomBlink = 1900 + rnd() * 1500; }
        }
        const bt = t - blinkT;
        blink = bt < 0 ? 0 : bt < 90 ? quintic(bt / 90) : bt < 330 ? 1 - quintic((bt - 90) / 240) : 0;
      }
      // ---- gaze: a glance away as a reply starts (~70 %), and aside every ~4-5 s in a long turn
      const speakingNow = speak > 0.5;
      if (!speakingNow) { silentSince += h * 1000; speechRun = 0; }
      else {
        if (!wasSpeaking && silentSince > 800 && rnd() < 0.7) {
          const side = rnd() < 0.5 ? -1 : 1;
          gazeTarget = [side * (5 + 3 * rnd()) * DEG, -(2 + 2 * rnd()) * DEG]; gazeUntil = t + 700 + 300 * rnd();
        }
        silentSince = 0; speechRun += h * 1000;
        if (speechRun > nextGlance && t > gazeUntil + 500) {
          const side = rnd() < 0.5 ? -1 : 1;
          gazeTarget = [side * (4 + 2 * rnd()) * DEG, (rnd() - 0.6) * 2 * DEG]; gazeUntil = t + 1100 + 800 * rnd();
          speechRun = 0; nextGlance = 3500 + 2500 * rnd();
        }
      }
      wasSpeaking = speakingNow;
      const [tyaw, tpitch] = t < gazeUntil ? gazeTarget : [0, 0];
      const k = 1 - Math.exp(-h / 0.07); // saccade-like: most of the move in ~150 ms
      gy += (tyaw! - gy) * k; gp += (tpitch! - gp) * k;
      // (raises vary 0.11-0.14 under the expression cap: all at 0.13 read as one repeated gesture, below ~0.1 they do not
      // read at dot resolution; kept low: stronger brow morphs bend the forehead)
      return { pitch, yaw, roll, brow: brow * 0.135 * browA, blink, gazeYaw: gy, gazePitch: gp };
    },
  };
}
