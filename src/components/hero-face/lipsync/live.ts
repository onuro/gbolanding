// Live lip-sync: the AI agent's voice (the AnalyserNode VoiceButton already puts on the agent's LiveKit track, handed
// over by the window 'face-voice' event) drives the mouth in real time, over the idle life (sway, blinks, idle smiles).
// Mic audio never reaches this: VoiceButton only announces the agent track's analyser.
//
// Everything comes from the sound itself, frame by frame, so the mouth cannot drift from the voice:
//   - loudness (auto-gained) = how open, syllable by syllable, over lips held softly parted through a phrase; real
//     pauses close them (never a per-syllable open / shut: that read as a fish)
//   - the vowel's formants (acoustic.ts): F1 = open (a) vs close (i / u), F2 = front (e / i: spread lips) vs back
//     (o / u: rounded lips); the shape is a blend of vowel prototypes (a e i ı o u) at that point of the vowel space
//   - hiss (s / ş / z / f): teeth nearly together, lips a little spread
// The jaw stays small and the lips do the work (plan B's open jaw reads as a dark void at this dot size).
// Speech also engages the eyes, nods the head on accents and adds a warm smile undertone.
import { createFormantTracker, formantWindow } from './acoustic';
import { EXPR } from './expression';
import { createIdlePerformer, type Performer } from './idle';

export interface LiveVoice {
  /** current agent analyser (null outside a call / between tracks) */
  analyser: AnalyserNode | null;
  /** the orb's signal (window 'orb-level', 0..1, the same wiring the orb uses) */
  level: number;
  /** a call is live (window 'orb-live') */
  live: boolean;
  /** the agent's current utterance as it is spoken (window 'face-transcript', agent only) */
  utter: { id: string; text: string; at: number } | null;
}

/** Listens for 'face-voice' (detail: AnalyserNode | null). Returns the live handle and a detach function. */
export function listenFaceVoice(): { voice: LiveVoice; detach(): void } {
  const voice: LiveVoice = { analyser: null, level: 0, live: false, utter: null };
  const tr = (e: Event) => {
    const d = (e as CustomEvent).detail as { id: string; text: string; agent: boolean } | null;
    if (d && d.agent && d.text) voice.utter = { id: d.id, text: d.text, at: performance.now() / 1000 };
  };
  window.addEventListener('face-transcript', tr);
  const on = (e: Event) => { voice.analyser = ((e as CustomEvent).detail as AnalyserNode | null) ?? null; };
  const lv = (e: Event) => { voice.live = (e as CustomEvent).detail === true; if (!voice.live) { voice.analyser = null; voice.level = 0; } };
  const lvl = (e: Event) => { const d = Number((e as CustomEvent).detail); voice.level = Number.isFinite(d) ? d : 0; };
  window.addEventListener('face-voice', on);
  window.addEventListener('orb-live', lv);
  window.addEventListener('orb-level', lvl);
  return { voice, detach() { window.removeEventListener('face-voice', on); window.removeEventListener('orb-live', lv); window.removeEventListener('orb-level', lvl); window.removeEventListener('face-transcript', tr); } };
}

type Shape = { jaw?: number; close?: number; lowerDown?: number; upperUp?: number; funnel?: number; pucker?: number; stretch?: number; smile?: number };
const KEYS = ['jaw', 'close', 'lowerDown', 'upperUp', 'funnel', 'pucker', 'stretch', 'smile'] as const;

/** Vowel prototypes at full voice, placed in the normalised vowel space (open 0..1, front 0..1).
 *  WIDTH is what separates a talking human from a fish (a fish only opens and closes at one width). Measured on plan B
 *  (per unit weight): pucker -22% mouth width, funnel -16%, stretch +11% per side, smile +13% per side, jaw -14%; so
 *  i/e must widen the mouth ~15%, o/u narrow it ~15-20%, or at ~10 dots across nothing but the jaw is seen moving. */
export const VOWELS: { at: [number, number]; shape: Shape }[] = [
  { at: [1, 0.45], shape: { jaw: 0.2, lowerDown: 0.3, upperUp: 0.15, stretch: 0.12 } }, // a
  { at: [0.55, 0.95], shape: { jaw: 0.1, lowerDown: 0.22, upperUp: 0.12, stretch: 0.38, smile: 0.12 } }, // e
  { at: [0.05, 1], shape: { jaw: 0.05, lowerDown: 0.14, upperUp: 0.1, stretch: 0.5, smile: 0.18 } }, // i
  { at: [0.1, 0.5], shape: { jaw: 0.07, lowerDown: 0.14, upperUp: 0.06, stretch: 0.18 } }, // ı (neutral)
  { at: [0.5, 0.02], shape: { jaw: 0.12, lowerDown: 0.08, funnel: 0.5, pucker: 0.4 } }, // o
  { at: [0.05, 0.05], shape: { jaw: 0.05, funnel: 0.3, pucker: 0.8 } }, // u
];
/** s / ş / z / f: teeth nearly together, the upper lip lifted a little, lips spread */
export const HISS: Shape = { jaw: 0.03, lowerDown: 0.1, upperUp: 0.12, stretch: 0.32, smile: 0.08 };

export const LIVE = {
  gate: 0.1, // share of the running speech peak below which it is silence (auto-gain: any input level works)
  full: 0.7, // share of the running peak at which the mouth is fully open for its vowel
  floorRms: 0.002, // absolute RMS below which it is always silence (line noise)
  f1: [330, 830] as [number, number], // F1 range mapped to open 0..1 (female voice; a ~850, i / u ~350)
  f2: [1050, 2450] as [number, number], // F2 range mapped to front 0..1 (o / u ~1000, i ~2600)
  sigma: 0.28, // vowel-space blend width
  base: 0.2, // share of the opening held through a phrase (lips never slap shut on every syllable)
  shapeHold: 0.55, // share of the width / rounding held through the syllable (the lips keep their shape into the consonants)
  closeAt: 0.35, // a dip below this share of the recent syllable peak brings the lips together (m / b / p, stops, gaps)
  flow: [0.04, 0.1] as [number, number], // syllable envelope attack / release, s
  attack: 0.035, // s
  release: 0.07, // s
  squint: [0.2, 0.34] as [number, number], // eye engagement while speaking (base, + accents)
  brow: 0.05, // inner-brow lift on accents
  nod: 0.012, // rad, on accents
  warm: 0.1, // smile undertone while speaking
};

export interface MouthFrame {
  morphs: Record<string, number>;
  speaking: boolean;
  /** 0..1 accent pulse (syllable onsets) */
  accent: number;
  /** 0..1 speaking engagement (slow) */
  speak: number;
  /** the analysis behind this frame (dev inspection) */
  dbg: { rms: number; loud: number; f1: number; f2: number; fric: number; F1: number; F2: number };
}

/** The acoustic mouth: time-domain buffers of the voice in, mouth morphs out. Pure (no Web Audio), so the lab and
 *  offline tests can drive it from a decoded clip. */
export function createAcousticMouth(sampleRate: number) {
  const analyse = createFormantTracker(sampleRate);
  let peak = 0.02, syl = 0, sylPeak = 0, prevLoud = 0, speak = 0, accent = 0, gate = 0;
  let F1 = 600, F2 = 1600, fricS = 0;
  const cur: Record<(typeof KEYS)[number], number> = { jaw: 0, close: 0, lowerDown: 0, upperUp: 0, funnel: 0, pucker: 0, stretch: 0, smile: 0 };
  const k = (dt: number, tau: number) => (dt > 0 ? 1 - Math.exp(-dt / tau) : 1);
  return function step(buf: Float32Array | null, dt: number, fallbackLevel = 0): MouthFrame {
    let loud = 0, rms = 0;
    let f1 = NaN, f2 = NaN, fric = 0;
    if (buf) {
      const f = analyse(buf);
      rms = f.rms;
      // auto-gain: track the speech peak (fast up, slow down over ~4 s), open relative to it
      peak = f.rms > peak ? f.rms : Math.max(0.004, peak * Math.exp(-dt / 4));
      const rel = f.rms / peak;
      loud = f.rms < LIVE.floorRms ? 0 : Math.min(1, Math.max(0, (rel - LIVE.gate) / (LIVE.full - LIVE.gate)));
      f1 = f.f1; f2 = f.f2; fric = loud > 0 ? f.fric : 0;
    } else loud = Math.min(1, Math.max(0, (fallbackLevel - 0.04) / 0.35));
    // vowel quality: only voiced, clearly vowel-like frames move it; it holds through consonants and gaps
    if (loud > 0.15 && fric < 0.3 && Number.isFinite(f1) && Number.isFinite(f2)) {
      F1 += (f1 - F1) * k(dt, 0.06);
      F2 += (f2 - F2) * k(dt, 0.06);
    }
    fricS += (fric - fricS) * k(dt, fric > fricS ? 0.02 : 0.05);
    // syllable envelope, at the pace of real articulators
    syl += (loud - syl) * k(dt, loud > syl ? LIVE.flow[0] : LIVE.flow[1]);
    sylPeak = Math.max(syl, sylPeak * Math.exp(-dt / 0.3));
    const talking = loud > 0.04 || speak > 0.5;
    gate += ((talking ? 1 : 0) - gate) * k(dt, talking ? 0.04 : 0.15);
    speak += ((loud > 0.04 ? 1 : 0) - speak) * k(dt, 0.35);
    const onset = loud - prevLoud > 0.25 ? 1 : 0;
    prevLoud = loud;
    accent = Math.max(accent * Math.exp(-dt / 0.35), onset);
    // blend the vowel prototypes at the current point of the vowel space
    const open = Math.min(1, Math.max(0, (F1 - LIVE.f1[0]) / (LIVE.f1[1] - LIVE.f1[0])));
    const front = Math.min(1, Math.max(0, (F2 - LIVE.f2[0]) / (LIVE.f2[1] - LIVE.f2[0])));
    const tgt: Record<string, number> = {};
    let wsum = 0;
    for (const v of VOWELS) {
      const d0 = (open - v.at[0]) / LIVE.sigma, d1 = (front - v.at[1]) / LIVE.sigma;
      const w = Math.exp(-0.5 * (d0 * d0 + d1 * d1));
      wsum += w;
      for (const c of KEYS) tgt[c] = (tgt[c] ?? 0) + w * (v.shape[c] ?? 0);
    }
    // opening rides the syllables and the lips meet in the dips; width / rounding holds through the syllable
    const closeW = Math.min(1, syl / Math.max(0.05, LIVE.closeAt * sylPeak));
    const amtOpen = gate * (LIVE.base + (1 - LIVE.base) * Math.min(1, syl)) * closeW;
    const amtShape = gate * (LIVE.shapeHold + (1 - LIVE.shapeHold) * Math.min(1, syl));
    const hiss = fricS * gate;
    for (const c of KEYS) {
      const vw = (tgt[c] ?? 0) / Math.max(wsum, 1e-6);
      const shapeCh = c === 'funnel' || c === 'pucker' || c === 'stretch' || c === 'smile';
      const a = shapeCh ? amtShape : amtOpen;
      const v = vw * a * (1 - hiss) + (HISS[c] ?? 0) * hiss * a;
      cur[c] += (v - cur[c]) * k(dt, v > cur[c] ? LIVE.attack : LIVE.release);
    }
    const m: Record<string, number> = {};
    m.jawOpen = cur.jaw;
    m.mouthLowerDownLeft = m.mouthLowerDownRight = cur.lowerDown;
    m.mouthUpperUpLeft = m.mouthUpperUpRight = cur.upperUp;
    m.mouthFunnel = cur.funnel;
    m.mouthPucker = cur.pucker;
    m.mouthStretchLeft = cur.stretch * 1.03; m.mouthStretchRight = cur.stretch * 0.97;
    m.mouthSmileLeft = cur.smile + LIVE.warm * speak; m.mouthSmileRight = cur.smile * 0.96 + LIVE.warm * speak * 0.94;
    m.mouthClose = 0;
    return { morphs: m, speaking: talking && gate > 0.5, accent, speak, dbg: { rms, loud, f1, f2, fric, F1, F2 } };
  };
}

export function createLivePerformer(voice: LiveVoice): Performer {
  const idle = createIdlePerformer({ firstSmileAt: 3 });
  let last = 0, nod = 0;
  // our own analyser, tapped off the agent's (a longer window for the formants; the orb's analyser stays untouched)
  let src: AnalyserNode | null = null, tap: AnalyserNode | null = null, buf: Float32Array<ArrayBuffer> | null = null;
  let mouth: ReturnType<typeof createAcousticMouth> | null = null;
  const retap = (a: AnalyserNode | null) => {
    if (src && tap) { try { src.disconnect(tap); } catch { /* already gone */ } }
    src = a; tap = null; buf = null;
    if (!a) return;
    try {
      tap = a.context.createAnalyser();
      let n = 256;
      while (n < formantWindow(a.context.sampleRate)) n *= 2;
      tap.fftSize = Math.min(32768, n);
      tap.smoothingTimeConstant = 0;
      a.connect(tap);
      buf = new Float32Array(new ArrayBuffer(tap.fftSize * 4));
      mouth = createAcousticMouth(a.context.sampleRate);
    } catch { tap = null; }
  };

  return {
    sample(t) {
      const out = idle.sample(t);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (voice.analyser !== src) retap(voice.analyser);
      if (!voice.live && !src) return out;
      if (!mouth) mouth = createAcousticMouth(48000);
      if (tap && buf) tap.getFloatTimeDomainData(buf);
      const f = mouth(tap && buf ? buf : null, dt, voice.level);
      if (import.meta.env?.DEV) (globalThis as { __faceLive?: unknown }).__faceLive = { tap: !!tap, src: !!src, rate: src?.context.sampleRate, fft: tap?.fftSize, level: voice.level, ...f.dbg };
      const m = out.morphs;
      // the idle performer's smiles (peaks ~0.4 + Duchenne squint) are for listening pauses: while she talks they fade
      // out, or she grins through her words (the live call had smile p50 0.33 vs 0.12 in the approved mimic)
      const quiet = 1 - 0.9 * f.speak;
      for (const key of ['mouthSmileLeft', 'mouthSmileRight', 'eyeSquintLeft', 'eyeSquintRight']) m[key] = (m[key] ?? 0) * quiet;
      for (const [key, v] of Object.entries(f.morphs)) m[key] = key.startsWith('mouthSmile') ? Math.max(m[key] ?? 0, v) : v;
      // eyes + brows: engaged while speaking, a little more on accents; the lids hand over to the blinks
      const blink = Math.max(m.eyeBlinkLeft ?? 0, m.eyeBlinkRight ?? 0);
      const sq = (LIVE.squint[0] * f.speak + (LIVE.squint[1] - LIVE.squint[0]) * f.accent) * (1 - blink);
      m.eyeSquintLeft = Math.min(EXPR.maxSquint, Math.max(m.eyeSquintLeft ?? 0, sq));
      m.eyeSquintRight = Math.min(EXPR.maxSquint, Math.max(m.eyeSquintRight ?? 0, sq * 0.96));
      const up = LIVE.brow * f.accent * f.speak;
      m.browInnerUpLeft = Math.min(EXPR.maxBrowUp, (m.browInnerUpLeft ?? 0) + up);
      m.browInnerUpRight = Math.min(EXPR.maxBrowUp, (m.browInnerUpRight ?? 0) + up * 0.9);
      nod += (f.accent * LIVE.nod * f.speak - nod) * (1 - Math.exp(-dt / 0.12));
      out.pose.pitch += nod;
      out.speaking = f.speaking;
      return out;
    },
  };
}
