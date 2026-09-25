// Coarticulation + smoothing + sampler. Timed segments (from timing.ts, or later from the voice pipeline's
// phoneme / viseme timings) -> per-channel curves sampled every 5 ms:
//   1. Cohen-Massaro dominance blend: each segment pulls every channel toward its target with a dominance that
//      is flat over the middle of the segment and decays outside it, wider before the segment (anticipation,
//      e.g. lip rounding starts during the consonants before an O / U) than after it (carry-over).
//   2. zero-phase Gaussian smoothing per channel group (~60-120 ms 10-90 % rise), so nothing snaps.
//   3. style gains, a jaw ceiling, tiny slow L/R asymmetry, mouthClose <= jawOpen (ICT: mouthClose alone pushes
//      the lower lip through the upper lip).
import type { Viseme } from './phonemes';
import type { Segment } from './timing';
import { CHANNELS, DOMINANCE, GROUP, STYLES, TARGETS, styleGain, type Channel, type Group, type LipStyle, type StyleName } from './visemes';

export type MorphWeights = Record<string, number>;

export const MOUTH_MORPHS = [
  'jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft',
  'mouthStretchRight', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
] as const;

export interface Track {
  durationMs: number;
  /** mouth morph weights at t (ms from the utterance start); rest outside [0, durationMs] */
  weightsAt(tMs: number): MorphWeights;
  /** symmetric channel values at t (debug / plots) */
  channelsAt(tMs: number): Record<Channel, number>;
  /** head-nod pitch offset (radians) at t */
  nodAt(tMs: number): number;
}

const STEP = 5; // ms
const GROUP_INDEX: Record<Group, 0 | 1 | 2> = { open: 0, round: 1, spread: 2 };
// dominance tail widths (ms) before (anticipation) and after (carry-over) a segment, per group
const W_ANT: Record<Group, number> = { open: 42, round: 110, spread: 70 };
const W_CAR: Record<Group, number> = { open: 36, round: 70, spread: 55 };
// Gaussian smoothing sigma (ms) per group, x style.smooth
const SIGMA: Record<Group, number> = { open: 20, round: 30, spread: 28 };

function gaussianSmooth(a: Float32Array, sigmaSamples: number): Float32Array {
  if (sigmaSamples < 0.5) return a;
  const r = Math.ceil(sigmaSamples * 3);
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigmaSamples * sigmaSamples));
  for (let i = 0; i < k.length; i++) k[i]! /= sum;
  const out = new Float32Array(a.length);
  for (let n = 0; n < a.length; n++) {
    let v = 0;
    for (let i = -r; i <= r; i++) v += k[i + r]! * a[Math.min(a.length - 1, Math.max(0, n + i))]!;
    out[n] = v;
  }
  return out;
}

export interface TrackOptions {
  style?: StyleName | Partial<LipStyle>;
  seed?: number;
  accents?: { t: number; k: number }[];
}

export function resolveStyle(style: TrackOptions['style']): LipStyle {
  if (!style) return STYLES.minimal;
  if (typeof style === 'string') return STYLES[style] ?? STYLES.minimal;
  return { ...STYLES.minimal, ...style };
}

export function buildTrack(segments: Segment[], opts: TrackOptions = {}): Track {
  const st = resolveStyle(opts.style);
  const dur = segments.length ? segments[segments.length - 1]!.end : 0;
  // pad with rest so the curves settle at both ends
  const pad = 300;
  const n = Math.ceil((dur + 2 * pad) / STEP) + 1;
  const segs: Segment[] = [
    { ph: '', viseme: 'rest', start: -pad * 2, end: 0, vowel: false, stress: 0 },
    ...segments,
    { ph: '', viseme: 'rest', start: dur, end: dur + pad * 2, vowel: false, stress: 0 },
  ];
  const raw: Record<Channel, Float32Array> = Object.fromEntries(CHANNELS.map((c) => [c, new Float32Array(n)])) as Record<Channel, Float32Array>;
  const groups: Group[] = ['open', 'round', 'spread'];
  for (let i = 0; i < n; i++) {
    const t = i * STEP - pad;
    for (const g of groups) {
      let num: Partial<Record<Channel, number>> = {};
      let den = 0;
      for (const s of segs) {
        if (s.end < t - 450 || s.start > t + 450) continue;
        const c = (s.start + s.end) / 2, half = (s.end - s.start) / 2;
        const plateau = 0.5 * half;
        const d = Math.max(0, Math.abs(t - c) - plateau);
        const w = t < c ? W_ANT[g] : W_CAR[g];
        const D = DOMINANCE[s.viseme][GROUP_INDEX[g]] * Math.exp(-Math.pow(d / w, 1.3));
        if (D < 1e-5) continue;
        den += D;
        const tg = TARGETS[s.viseme];
        for (const ch of CHANNELS) if (GROUP[ch] === g) num[ch] = (num[ch] ?? 0) + D * (tg[ch] ?? 0);
      }
      for (const ch of CHANNELS) if (GROUP[ch] === g) raw[ch][i] = den > 0 ? (num[ch] ?? 0) / den : 0;
      num = {};
    }
  }
  const curves = {} as Record<Channel, Float32Array>;
  for (const ch of CHANNELS) {
    const sm = gaussianSmooth(raw[ch], (SIGMA[GROUP[ch]] * st.smooth) / STEP);
    const gain = styleGain(st, ch);
    for (let i = 0; i < n; i++) sm[i] = sm[i]! * gain;
    curves[ch] = sm;
  }
  // warm undertone: a whisper of smile while speaking (eases in / out with the speech envelope)
  const speaking = new Float32Array(n);
  for (const s of segments) {
    if (s.viseme === 'rest') continue;
    const a = Math.max(0, Math.floor((s.start + pad) / STEP)), b = Math.min(n - 1, Math.ceil((s.end + pad) / STEP));
    for (let i = a; i <= b; i++) speaking[i] = 1;
  }
  const env = gaussianSmooth(speaking, 120 / STEP);

  const seed = opts.seed ?? 3;
  const ph1 = seed * 1.7, ph2 = seed * 2.3;
  const asymAt = (t: number) => st.asym * (0.6 * Math.sin(t * 0.0021 + ph1) + 0.4 * Math.sin(t * 0.0047 + ph2));

  const sampleCh = (tMs: number): Record<Channel, number> => {
    const x = (tMs + pad) / STEP;
    const i = Math.max(0, Math.min(n - 2, Math.floor(x)));
    const f = Math.max(0, Math.min(1, x - i));
    const out = {} as Record<Channel, number>;
    for (const ch of CHANNELS) out[ch] = curves[ch][i]! * (1 - f) + curves[ch][i + 1]! * f;
    const e = env[i]! * (1 - f) + env[i + 1]! * f;
    out.smile += st.warm * e;
    out.jaw = Math.min(out.jaw, st.jawMax);
    out.close = Math.min(out.close, out.jaw);
    return out;
  };

  const accents = opts.accents ?? [];
  const nodAt = (tMs: number) => {
    let p = 0;
    for (const a of accents) {
      const u = (tMs - a.t + 60) / 420; // starts slightly before the accented vowel
      if (u <= 0 || u >= 1) continue;
      p += a.k * Math.sin(Math.PI * u) ** 2 * Math.sin(Math.PI * Math.min(1, u * 1.6));
    }
    return st.nod * p;
  };

  return {
    durationMs: dur,
    channelsAt: sampleCh,
    nodAt,
    weightsAt(tMs: number) {
      return toMorphs(sampleCh(tMs), asymAt(tMs));
    },
  };
}

/** Sustained weights of one viseme in a style (sheets, and a viseme-timed voice path). */
export function visemeWeights(viseme: Viseme, style: TrackOptions['style'] = 'minimal'): MorphWeights {
  const st = resolveStyle(style);
  const tg = TARGETS[viseme];
  const c = {} as Record<Channel, number>;
  for (const ch of CHANNELS) c[ch] = (tg[ch] ?? 0) * styleGain(st, ch);
  c.smile += st.warm * (viseme === 'rest' ? 0 : 1);
  c.jaw = Math.min(c.jaw, st.jawMax);
  c.close = Math.min(c.close, c.jaw);
  return toMorphs(c, 0);
}

function toMorphs(c: Record<Channel, number>, a: number): MorphWeights {
  const L = 1 + a, R = 1 - a;
  const cl = (v: number) => Math.max(0, Math.min(1, v));
  return {
    jawOpen: cl(c.jaw),
    mouthClose: cl(c.close),
    mouthFunnel: cl(c.funnel),
    mouthPucker: cl(c.pucker),
    mouthSmileLeft: cl(c.smile * L),
    mouthSmileRight: cl(c.smile * R),
    mouthStretchLeft: cl(c.stretch * L),
    mouthStretchRight: cl(c.stretch * R),
    mouthLowerDownLeft: cl(c.lowerDown * L),
    mouthLowerDownRight: cl(c.lowerDown * R),
    mouthUpperUpLeft: cl(c.upperUp * (1 + 0.5 * a)),
    mouthUpperUpRight: cl(c.upperUp * (1 - 0.5 * a)),
  };
}
