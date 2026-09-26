// Live mouth animation from the aligned speech (align-stream.ts), built on how real speakers move. The numbers are
// from the research spec of 2026-09-25 (scratchpad research-spec.md: JALI, EMA / Optotrak / X-ray kinematics, ARKit
// semantics, Turkish articulation), calibrated to plan B's rig by renders:
//   - jaw and lips are separate controls: vertical opening is ~45 % jaw, ~45 % lower lip, ~14 % upper lip in adults
//     (a jaw-only mouth reads as a puppet / fish); plan B's lower-lip morph needs ~3x the ARKit value for that share
//   - per sound targets (jaw a .23 > e .20 > o .18 > i .13 > u .11; width for i / e; funnel-led o, pucker-led u;
//     ü / ö rounded with more opening than u / o); t d n l k have no lip shape (they inherit the vowels')
//   - every segment's weight: a quintic ease that peaks at the sound's onset (attack 120 ms jaw, 105 ms lower lip,
//     125 ms width, 150 ms rounding, scaled to the local syllable rate), held to 75 % of stressed sounds, then released
//     as long; Cohen-Massaro dominance average per channel group
//   - hard constraints after the blend: m / b / p seal (mouthClose = jawOpen, reached ~30 ms before the closure,
//     released at the sound), f / v lower lip to the teeth, the jaw nearly shut on sibilants, mouthClose <= jawOpen
//   - amplitude: stress (TR 0.8-1.2, EN 0.6-1.4) and loudness (+25 % per 10 dB), jaw ceiling .40; a speaking smile
//     layer <= .15 (x0.3 on rounded vowels); slow +-0.02 left / right asymmetry
import type { AlignSeg } from './align-stream';
import { PHONEMES, type Viseme } from './phonemes';
import type { Lang } from './timing';

export type Shape = { jaw?: number; lowerDown?: number; upperUp?: number; stretch?: number; smile?: number; funnel?: number; pucker?: number };
const CH = ['jaw', 'lowerDown', 'upperUp', 'stretch', 'smile', 'funnel', 'pucker'] as const;
type Ch = (typeof CH)[number];
// channel groups: 0 jaw, 1 vertical lips, 2 width, 3 rounding
const GROUP: Record<Ch, 0 | 1 | 2 | 3> = { jaw: 0, lowerDown: 1, upperUp: 1, stretch: 2, smile: 2, funnel: 3, pucker: 3 };

// Targets are in plan B rig weights, calibrated by renders against the research ordering (opening a > e > o > ə >
// ı / i > ü > u; o / u / ö / ü narrow the mouth 20-25 % and keep a round hole; i / e widen it ~12 %) and the visual
// reviews (a jaw-only or equally-open mouth for every vowel reads as a clamshell). The lower-lip morph carries about
// half the opening (adults: ~45 % jaw, ~45 % lower lip).
type Spec = { J: number; LD?: number; UU?: number; St?: number; Sm?: number; F?: number; P?: number; a: [number, number, number, number]; inherit?: number; inheritV?: number };
const V1: [number, number, number, number] = [1, 1, 1, 1];
const SPREAD: [number, number, number, number] = [1, 1, 1.3, 1.8]; // spread vowels resist the neighbours' rounding
// Round 4 (2026-09-25, render-calibrated: lab gap px ~ 26 sealed, ~50 lips together, +~2.2 px per 0.01 jaw, +~0.2 px per
// 0.01 lower lip, +~0.35 px per 0.01 upper lip, funnel opens a tall round hole): the opening rides the jaw with the
// upper lip lifted a little (a lens, not a 'D' with a curled lower lip); a ~90 px (0.45 x width), e ~72, o ~75 round,
// i / ı ~58, u / ü a small round hole; the lower-lip morph stays <= .3 (more curls it into a U and dims it)
const SPEC: Record<string, Spec> = {
  a: { J: 0.22, LD: 0.3, UU: 0.38, F: 0.06, a: V1 },
  e: { J: 0.165, LD: 0.27, UU: 0.24, St: 0.24, Sm: 0.05, a: SPREAD },
  i: { J: 0.115, LD: 0.18, UU: 0.15, St: 0.65, Sm: 0.08, a: SPREAD }, // (stretch .6: ~15 % wider than e in the render; 1.0 presses the lips shut)
  'ɯ': { J: 0.115, LD: 0.19, UU: 0.1, St: 0.14, Sm: 0.03, a: V1 },
  o: { J: 0.13, LD: 0.15, F: 0.32, P: 0.55, a: V1 }, // a taller oval, ~25 % narrower than rest (at .55 speech reached ~.45: 5 % narrower, 'a small a')
  'ø': { J: 0.09, LD: 0.12, UU: 0.06, F: 0.26, P: 0.85, a: V1 },
  u: { J: 0.055, LD: 0.04, F: 0.05, P: 1.8, a: V1 },
  y: { J: 0.06, LD: 0.05, F: 0.06, P: 1.7, a: V1 },
  // English classes
  'ɑ': { J: 0.22, LD: 0.3, UU: 0.38, F: 0.06, a: V1 },
  'æ': { J: 0.19, LD: 0.28, UU: 0.3, St: 0.2, Sm: 0.04, a: V1 },
  'ɛ': { J: 0.17, LD: 0.27, UU: 0.24, St: 0.12, Sm: 0.04, a: SPREAD },
  'ʌ': { J: 0.15, LD: 0.25, UU: 0.17, St: 0.08, a: V1 },
  'ɪ': { J: 0.11, LD: 0.18, UU: 0.13, St: 0.52, Sm: 0.06, a: SPREAD },
  'ʊ': { J: 0.055, LD: 0.08, F: 0.1, P: 1.3, a: V1 },
  'ɔ': { J: 0.13, LD: 0.2, F: 0.3, P: 0.62, a: V1 },
  'ə': { J: 0.11, LD: 0.18, UU: 0.08, a: [0.9, 0.9, 0.5, 0.5] },
  'ɝ': { J: 0.08, LD: 0.1, F: 0.12, P: 0.4, a: V1 }, // English r-colouring: mild rounding only
  // consonants: own jaw (the spec's heights), lips inherited from the neighbouring vowels (inherit = share kept for width /
  // rounding, inheritV for the vertical lips); sibilants keep the teeth together with the lips just apart
  PP: { J: 0.04, a: [0.6, 1, 0.3, 0.3], inherit: 0.5, inheritV: 0 },
  FF: { J: 0.04, UU: 0.2, P: 0.1, a: [0.6, 1, 0.3, 0.3], inheritV: 0 },
  SS: { J: 0.025, LD: 0.1, UU: 0.12, St: 0.1, a: [0.9, 0.8, 0.5, 0.5], inherit: 0.6, inheritV: 0.15 },
  SH: { J: 0.02, LD: 0.06, UU: 0.14, F: 0.16, P: 0.45, a: [1.2, 1, 0.6, 0.8], inherit: 0.8, inheritV: 0 }, // a light flared protrusion (full pucker read as 'oo' mid-word)
  DD: { J: 0.02, a: [0.9, 0.8, 0.6, 0.6], inherit: 0.7, inheritV: 0.25 },
  LL: { J: 0.03, a: [0.7, 0.8, 0.6, 0.6], inherit: 0.8, inheritV: 0.3 },
  KK: { J: 0.03, a: [0.7, 0.8, 0.6, 0.6], inherit: 0.8, inheritV: 0.35 },
  TH: { J: 0.05, LD: 0.2, UU: 0.2, a: [0.6, 0.6, 0.5, 0.5], inherit: 0.5 },
  RR: { J: 0.05, F: 0.1, P: 0.35, a: [0.5, 0.5, 0.5, 0.8], inherit: 0.5 }, // English ɹ: mild rounding (Turkish r is lingual: DD)
  JJ: { J: 0.04, LD: 0.12, UU: 0.12, St: 0.2, Sm: 0.04, a: [0.5, 0.5, 0.6, 0.4], inherit: 0.8 },
  WW: { J: 0.04, F: 0.1, P: 1.6, a: [0.6, 0.5, 0.6, 1] },
  HH: { J: 0.1, a: [0, 0, 0, 0] }, // transparent: takes the next vowel's shape
  rest: { J: 0.01, a: [1, 1, 0.6, 0.6] },
  pause: { J: 0.02, a: [1, 1, 0.6, 0.6] },
};
const LIQ = new Set(['j', 'ɾ', 'r', 'ɹ', 'l', 'ɫ', 'w']);
const VIS_SPEC: Partial<Record<Viseme, string>> = { PP: 'PP', FF: 'FF', SS: 'SS', SH: 'SH', DD: 'DD', LL: 'LL', KK: 'KK', TH: 'TH', RR: 'RR', JJ: 'JJ', WW: 'WW', HH: 'HH' };

function specOf(ph: string, lang: Lang): Spec {
  if (SPEC[ph] && PHONEMES[ph]?.cls === 'vowel') return SPEC[ph]!;
  const vis = PHONEMES[ph]?.viseme;
  if (ph === 'ɾ' || (lang === 'tr' && ph === 'ɹ')) return SPEC.DD!; // Turkish r is a tap: tongue only
  if (vis && VIS_SPEC[vis]) return SPEC[VIS_SPEC[vis]!]!;
  if (vis && PHONEMES[ph]?.cls === 'vowel') {
    // any other vowel: by viseme
    const m: Partial<Record<Viseme, string>> = { AA: 'a', EE: 'e', IH: 'i', YI: 'ɯ', OO: 'o', UU: 'u', AX: 'ə', ER: 'ɝ' };
    return SPEC[m[vis] ?? 'ə']!;
  }
  return SPEC.DD!;
}

/** Rig weights of a spec. */
export function specShape(s: Spec): Shape {
  return { jaw: s.J, lowerDown: s.LD ?? 0, upperUp: s.UU ?? 0, stretch: s.St ?? 0, smile: s.Sm ?? 0, funnel: s.F ?? 0, pucker: s.P ?? 0 };
}

// attack / release windows (ms) per group at a 200 ms syllable period; rate-scaled per item. Rounding anticipates
// further than it releases (measured onset ~97 ms before the vowel, 40-150; Turkish carry-over is covered by the
// following consonants' low lip dominance)
const WIN_ATT: [number, number, number, number] = [120, 110, 125, 95];
const WIN_REL: [number, number, number, number] = [120, 110, 125, 90];

export interface AcousticFrame {
  /** 0..1 syllable loudness (auto-gained) */
  loud: number;
  /** speaker-normalised F1 / F2 (NaN when unvoiced) */
  f1n: number;
  f2n: number;
  voiced: boolean;
  /** vowel-band level, dB (for loudness vs the running mean) */
  db?: number;
  /** voice pitch, Hz (NaN unvoiced) */
  f0?: number;
  /** the viseme classifier's probability that a consonant is sounding (undefined without a model / posterior yet) */
  pc?: number;
  /** ... that m / b / p is sounding */
  pp?: number;
  /** ... that f / v is sounding */
  pf?: number;
  /** ... that it is silence */
  ps?: number;
}

/** The vowel the voice itself says: prototypes blended by distance in (F1, F2). */
export function acousticVowel(a: AcousticFrame, targets: Record<string, [number, number]>, lang: Lang, sigma = 0.22): { shape: Shape; conf: number } {
  if (!a.voiced || !Number.isFinite(a.f1n) || !Number.isFinite(a.f2n)) return { shape: specShape(SPEC['ə']!), conf: 0 };
  const out: Record<string, number> = {};
  let ws = 0, wmax = 0;
  for (const [v, t] of Object.entries(targets)) {
    if (PHONEMES[v]?.cls !== 'vowel') continue;
    const w = Math.exp(-0.5 * (((a.f1n - t[0]) ** 2 + (a.f2n - t[1]) ** 2) / (sigma * sigma)));
    ws += w; wmax = Math.max(wmax, w);
    const sh = specShape(specOf(v, lang));
    for (const c of CH) out[c] = (out[c] ?? 0) + w * (sh[c] ?? 0);
  }
  if (ws < 1e-6) return { shape: specShape(SPEC['ə']!), conf: 0 };
  for (const c of CH) out[c]! /= ws;
  return { shape: out as Shape, conf: wmax };
}

/** One timed gesture of the blend. */
interface Core { w: number; round: boolean; p: number; f: number; jaw: number; ld: number; st: number; tw: number; ts: number; pr: number; unr: number }
interface Item { shape: Shape; a: [number, number, number, number]; on: number; hold: number; end: number; rate: number; kind: 'V' | 'C' | 'P'; ph: string; amp: number; rel?: number; pr?: number; rg?: boolean }

const BASE = [0.06, 0.04, 0.2, 0.2];
let VOWEL_JAW = 1;
let KEEP: [number, number, number] = [0.4, 0.28, 0.2];
export function setKeep(k: [number, number, number]) { KEEP = k; }
export function setVowelJaw(v: number) { VOWEL_JAW = v; }
const quintic = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * t * (t * (6 * t - 15) + 10); };

/** lab: per-vowel loudness gains (set to [] to record) */
export let LOUD_DBG: { v?: string; start: number; pkDb: number; meanDb: number; loudK: number; stressed: boolean }[] | null = null;
export function setLoudDbg(on: boolean) { LOUD_DBG = on ? [] : null; return () => LOUD_DBG; }
export const TUNE = { jawWin: 0.4, sealLead: 35, sealClose: 42, sealAhead: 45, mHold: 16, minSeal: 30, dipJ: 0.085, dipHalf: 34, pcK: 0.4, pcDip: 0.45, acLabio: 0.3, acLean: 0, jawUp: 0.85, sealPart: 55, keepV: 0.45, urgW: 20, sealLate: 10, openStep: 0.042, closeStep: 0.04, pUp: 0.11, sealX: 0.006, lead: 10, stStep: 0.06, stInh: 0.45, stBreath: 0.3, uJaw: 0.08, jawCc: 95, loudWin: 3000, loudA: 1.1, loudS: 0.05, loudHi: 0.25, stressDb: 3, prDb: 4, prFloor: 0.1, prVel: 0.1, sealP: 0.09, ccCore: 0.25, ccTop: 3, rFun: 0.6, heldMs: 120, heldPc: 0.25, pCc: 75, stBreath2: 0.25, sealCap: 0.09, planK: 1.7, planD: 10, planMid: 25, labHold: 30, planPre: 8, planShort: 80, outW: 90, outLead: 20 };
let ACOUSTIC_SEAL = 0.6;
export function setAcousticSeal(v: number) { ACOUSTIC_SEAL = v; }
let ENV_K = 0;
export function setEnvK(k: number) { ENV_K = k; } // the jaw windows at the syllable rate (longer ones overlap and hold the jaw between syllables)
function weight(it: Item, g: number, t: number): number {
  const k = g === 0 ? TUNE.jawWin : 1;
  if (t < it.on) return quintic(1 - (it.on - t) / (WIN_ATT[g]! * it.rate * k));
  if (t <= (g === 3 && it.kind === 'V' ? Math.max(it.hold, it.on + 0.85 * (it.end - it.on)) : it.hold)) return 1;
  return quintic(1 - (t - it.hold) / (WIN_REL[g]! * it.rate * k));
}

export interface AnimOptions {
  lang: Lang;
  /** speaking smile layer (<= .15) */
  warm: number;
  /** jaw ceiling */
  jawMax: number;
}

export const ANIM_DEFAULTS: AnimOptions = { lang: 'tr', warm: 0.06, jawMax: 0.29 };

// vowel amplitude (jaw + vertical lips) unstressed / stressed; conversational range (bigger swings read as singing)
// (a little more contrast: every a hit the same height, one open-close pattern through 'yapay zekâ ajansıdır')
const OPENV = new Set(['a', 'ɑ', 'æ', 'ʌ', 'e', 'ɛ', 'aɪ', 'aʊ', 'eɪ']);
const OPENA = new Set(['a', 'ɑ', 'æ', 'aɪ', 'aʊ']);
const STRESS: Record<Lang, [number, number]> = { tr: [0.98, 1.12], en: [0.9, 1.14] };

/** Builds the gesture list from the aligned timeline (once per frame; cheap). */
function itemsOf(segs: readonly AlignSeg[], acousticAt: (ms: number) => AcousticFrame, vowelTargets: Record<string, [number, number]>, lang: Lang, t: number): Item[] {
  // local syllable period from the vowels around t (rate scaling of the windows)
  const vs = segs.filter((s) => s.kind === 'V' && s.end > t - 1500 && s.start < t + 600);
  let period = lang === 'tr' ? 150 : 200;
  if (vs.length >= 3) period = Math.max(90, Math.min(320, (vs[vs.length - 1]!.start - vs[0]!.start) / (vs.length - 1)));
  const rate = Math.min(1.2, Math.max(0.55, period / 200));
  // running mean vowel level (loudness factor: +2.5 % per dB over the mean, clamped 0.75-1.25)
  // (per openness class: open vowels are louder than close ones by nature, so against the mean of all vowels every a
  // got the top gain and hit the jaw ceiling: one template again)
  const lvO: number[] = [], lvC: number[] = [];
  for (const s of vs) { let pk = -120; for (let x = s.start + 10; x < s.end; x += 20) { const q = acousticAt(x).db; if (q !== undefined && q > pk) pk = q; } if (pk > -100) (OPENV.has(s.v ?? '') ? lvO : lvC).push(pk); }
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
  const meanO = lvO.length >= 2 ? mean(lvO) : mean([...lvO, ...lvC]), meanC = lvC.length >= 2 ? mean(lvC) : mean([...lvO, ...lvC]);
  // a Turkish a against the median a of the ~3 s before it (a window sliding with t let a quiet phrase pull its own
  // mean down, and the e's in the open class pulled it lower still: the quiet zekâ / ajansıdır a's got the loud ones'
  // gain, a height ran against loudness, corr -0.02)
  const aPk: [number, number][] = [];
  for (const s of segs) {
    if (s.kind !== 'V' || !OPENA.has(s.v ?? '') || s.end < t - 700 - TUNE.loudWin || s.start > t + 700) continue;
    let pk = -120; for (let x = s.start + 10; x < s.end; x += 20) { const q = acousticAt(x).db; if (q !== undefined && q > pk) pk = q; }
    if (pk > -100) aPk.push([s.start, pk]);
  }
  const aRef = (s: AlignSeg) => {
    const a = aPk.filter(([st]) => st >= s.start - TUNE.loudWin && st <= s.start).map(([, pk]) => pk).sort((x, y) => x - y);
    return a.length >= 3 ? a[a.length >> 1]! : meanO;
  };
  const out: Item[] = [];
  for (const s of segs) {
    if (s.end < t - 700 || s.start > t + 700) continue;
    if (s.kind === 'P') {
      const d = s.end - s.start;
      if (d < 120) continue; // short pause: hold the previous shape
      const sp = d > 350 ? SPEC.rest! : SPEC.pause!;
      out.push({ shape: specShape(sp), a: sp.a, on: s.start, hold: s.end, end: s.end, rate, kind: 'P', ph: d > 350 ? 'rest' : 'pause', amp: 1 });
      continue;
    }
    if (s.kind === 'C') {
      const cons = s.cons ?? [];
      if (!cons.length) continue;
      const w = cons.map((c) => PHONEMES[c]?.dur ?? 60), tot = w.reduce((a, b) => a + b, 0);
      let a0 = s.start;
      cons.forEach((c, i) => {
        const b = a0 + ((s.end - s.start) * w[i]!) / tot;
        const sp = specOf(c, lang);
        const it: Item = { shape: specShape(sp), a: sp.a, on: a0, hold: a0 + 0.75 * (b - a0), end: b, rate, kind: 'C', ph: c, amp: 1 };
        if (PHONEMES[c]?.viseme === 'PP' || PHONEMES[c]?.viseme === 'FF') it.rel = releaseOf(a0, b, acousticAt);
        out.push(it);
        a0 = b;
      });
      continue;
    }
    // vowel (or speech the text has not reached: the voice's own vowel)
    let shape: Shape;
    const mid = acousticAt((s.start + s.end) / 2);
    const ac = acousticVowel(mid, vowelTargets, lang);
    if (s.kind === 'X' || !s.v) {
      // no text yet: the voice's own vowel, with half its rounding (formants alone confuse back unrounded / rounded)
      shape = { ...ac.shape, funnel: 0.5 * (ac.shape.funnel ?? 0), pucker: 0.5 * (ac.shape.pucker ?? 0) };
    } else {
      shape = specShape(specOf(s.v, lang));
      const tv = vowelTargets[s.v];
      if (tv && mid.voiced && Number.isFinite(mid.f1n)) {
        // where the text vowel does not fit the voice (alignment unsure), lean toward what the voice says (off since the
        // classifier aligner: its vowels are ~95 % right and the narrowband formants are not; the lean held i at e's
        // width and a's under-open, checks2 on unseen calls)
        const fit = Math.exp(-0.5 * (((mid.f1n - tv[0]) ** 2 + (mid.f2n - tv[1]) ** 2) / (0.22 * 0.22)));
        const m = Math.max(0, Math.min(0.6, (1 - fit) * ac.conf * 1.3)) * TUNE.acLean;
        const mixed: Shape = {};
        // rounding stays the text's (a pout on an unrounded vowel reads as a random pucker)
        for (const c of CH) mixed[c] = GROUP[c] === 3 ? shape[c] ?? 0 : (1 - m) * (shape[c] ?? 0) + m * (ac.shape[c] ?? 0);
        shape = mixed;
      }
    }
    const stressed = s.stress === 1;
    const [sLo, sHi] = STRESS[lang];
    // (louder syllables open more, ±15 %: every a hit the same height)
    // (the segment's peak, not its middle: the aligned middle can sit on a vowel edge; TR a height ran against loudness)
    let pkDb = mid.db ?? -120; for (let x = s.start + 10; x < s.end; x += 20) { const q = acousticAt(x).db; if (q !== undefined && q > pkDb) pkDb = q; }
    // (English keeps the class mean: its accents ride the stress contrast, and the a gain there cost syllable beats)
    const isA = lang === 'tr' && OPENA.has(s.v ?? ''), meanDb = isA ? aRef(s) : OPENV.has(s.v ?? '') ? meanO : meanC;
    const rel = Number.isFinite(meanDb) && pkDb > -100 ? pkDb - meanDb : 0;
    // (an a's gain is anchored above 1 and steeper, ~+5 % per dB: against its own class the median a lost ~6 px (a / e
    // contrast 17 -> 12 px) and the loud ones did not grow)
    const loudK = isA ? Math.min(TUNE.loudA + TUNE.loudHi, Math.max(0.85, TUNE.loudA + TUNE.loudS * rel)) : Math.min(1.18, Math.max(0.85, 1 + 0.025 * rel));
    // (a lexical stress the voice does not make is no accent: the quiet stressed zekâ a, -20 dB, was the biggest a)
    const stressK = stressed ? 1 + (sHi - 1) * (isA ? Math.min(1, Math.max(0, 1 + rel / TUNE.stressDb)) : 1) : sLo;
    if (LOUD_DBG) LOUD_DBG.push({ v: s.v, start: s.start, pkDb, meanDb, loudK, stressed: s.stress === 1 });
    // (a louder a reaches more of its target and opens faster (mouthAt): floored at 85 % of it, the loudest Karmaşık a
    // peaked at jaw .23, no bigger than the quiet ones)
    const pr = isA ? Math.min(1, Math.max(0, rel / TUNE.prDb)) : 0;
    const dur = s.end - s.start;
    const alpha = stressed || lang === 'tr' ? 1 : 0.6;
    const amp = stressK * loudK * VOWEL_JAW;
    if (s.v2 && s.kind === 'V') {
      // a diphthong is a trajectory: the first target for ~55 %, then the glide (aɪ opens then spreads, oʊ rounds more)
      // (the glide is the last ~40 %: growth's oʊ read as a tight u pout from its start)
      const m = s.start + 0.6 * dur;
      const g = specShape(specOf(s.v2, lang));
      // (rg: the glide is rounded, so its first half is no unrounded vowel for the pout gate in mouthAt)
      out.push({ shape, a: [alpha, alpha, alpha, alpha], on: s.start, hold: s.start + 0.4 * dur, end: m, rate, kind: 'V', ph: s.v ?? '', amp, rg: (g.pucker ?? 0) + (g.funnel ?? 0) >= 0.6 });
      if (s.v2 === 'ʊ' || s.v2 === 'u') { g.pucker = 0.65 * (g.pucker ?? 0); g.jaw = Math.max(g.jaw ?? 0, 0.07); }
      out.push({ shape: g, a: [alpha, alpha, alpha, alpha], on: m, hold: m + 0.25 * dur, end: s.end, rate, kind: 'V', ph: s.v2, amp: 0.95 * amp });
    } else {
      // an open vowel takes part of its width from its neighbours and lifts the upper lip with its loudness (every a
      // was one template: the same U under the same lip, only the height varied)
      const openV = (shape.jaw ?? 0) >= 0.17;
      if (openV) shape = { ...shape, upperUp: (shape.upperUp ?? 0) * Math.min(1.3, Math.max(0.7, 1 + 2 * (loudK - 1))) };
      // (a vowel out of an m / b / p holds its target ~TUNE.labHold ms longer: its lips spend the first 2-3 frames
      // parting, and the jaw had already let go when they were open, so the loud manuel a peaked at 46 px and the u's
      // pout came in over it)
      const pl = out[out.length - 1], postLab = !!pl && pl.kind === 'C' && PHONEMES[pl.ph]?.viseme === 'PP' && s.start - pl.end < 20;
      const hold = s.start + (stressed ? 0.75 : 0.45) * dur;
      out.push({ shape, a: [alpha, alpha, openV ? 0.55 * alpha : alpha, alpha], on: s.start, hold: postLab ? Math.max(hold, Math.min(s.start + 0.75 * dur, hold + TUNE.labHold)) : hold, end: s.end, rate, kind: 'V', ph: s.v ?? '', amp, pr });
    }
  }
  // consonants made with the tongue keep the lips of the vowels around them (a speaker only closes on m / b / p):
  // their lip target is the mean of the neighbouring vowels' (x inherit), their jaw a share of the vowels' opening
  for (let i = 0; i < out.length; i++) {
    const it = out[i]!;
    if (it.kind !== 'C') continue;
    const sp = specOf(it.ph, lang);
    if (!sp.inherit) continue;
    let pv: Item | undefined, nv: Item | undefined;
    for (let j = i - 1; j >= 0; j--) { if (out[j]!.kind === 'V') { pv = out[j]; break; } if (out[j]!.kind === 'P') break; }
    for (let j = i + 1; j < out.length; j++) { if (out[j]!.kind === 'V') { nv = out[j]; break; } if (out[j]!.kind === 'P') break; }
    const vs2 = [pv, nv].filter(Boolean) as Item[];
    if (!vs2.length) continue;
    const mix: Shape = { ...it.shape };
    for (const c of CH) {
      if (c === 'jaw') continue;
      const m = vs2.reduce((a, v) => a + (v.shape[c] ?? 0), 0) / vs2.length;
      // (a tongue consonant inside an i-run keeps only about half of the spread: the width held frozen at full i for 300 ms)
      mix[c] = Math.max(it.shape[c] ?? 0, m * (GROUP[c] === 1 ? sp.inheritV ?? sp.inherit : GROUP[c] === 2 ? sp.inherit * TUNE.stInh : sp.inherit));
    }
    const vp = Math.min(...vs2.map((v) => v.shape.pucker ?? 0)), vf = Math.min(...vs2.map((v) => v.shape.funnel ?? 0));
    if (vs2.length === 2) { mix.pucker = Math.min(mix.pucker ?? 0, Math.max(it.shape.pucker ?? 0, vp)); mix.funnel = Math.min(mix.funnel ?? 0, Math.max(it.shape.funnel ?? 0, vf)); }
    if ((mix.pucker ?? 0) + (mix.funnel ?? 0) > 0.3) { mix.stretch = 0.3 * (mix.stretch ?? 0); mix.smile = 0; }
    const vj = vs2.reduce((a, v) => a + (v.shape.jaw ?? 0) * v.amp, 0) / vs2.length;
    // the jaw cycles with the syllables (2-7 Hz): n l k r keep ~KEEP_NLKR of the vowels' opening, t d less, s z /
    // m b p rise toward their own height
    const keep = sp === SPEC.LL || sp === SPEC.KK ? KEEP[0] : sp === SPEC.DD ? KEEP[1] : KEEP[2];
    mix.jaw = Math.max(it.shape.jaw ?? 0, keep * vj);
    it.shape = mix;
  }
  return out;
}

/** A lip closure opens at the voice's release (the burst / vowel onset: the loudness rising out of the closure's dip),
 *  not at the aligned segment's end (which can be ~50-100 ms off); searched within [end - 50, end + 50]. */
function releaseOf(on: number, end: number, acousticAt: (ms: number) => AcousticFrame): number {
  let tMin = on, lMin = Infinity;
  for (let x = on; x <= end + 30; x += 10) { const l = acousticAt(x).loud; if (l < lMin) { lMin = l; tMin = x; } }
  let pk = lMin;
  for (let x = tMin; x <= end + 90; x += 10) pk = Math.max(pk, acousticAt(x).loud);
  if (pk - lMin < 0.15) return end;
  const half = lMin + 0.5 * (pk - lMin);
  for (let x = tMin; x <= end + 90; x += 5) if (acousticAt(x).loud >= half) return Math.max(end - 50, Math.min(end + 50, x));
  return end;
}

export interface MouthState {
  jaw: number;
  t: number;
  /** spring state per output morph (the smoothing stage) */
  x?: Record<string, number>;
  v?: Record<string, number>;
  /** tongue consonants the live timeline showed near t lately (withHeld) */
  held?: { seg: AlignSeg; seen: number }[];
  /** the last shape returned (shown again while the clock stands still) */
  last?: Record<string, number>;
}

/** The live decode can merge a consonant it already placed back into the vowel beside it for a few frames and split it
 *  out again (kurum's u-ɾ-u shown as one 200 ms u, dağınık's ı-n-ı as one ı, just before they were displayed), so its
 *  trough never fired. A tongue consonant seen in the last ~120 ms keeps its place in a vowel that swallowed it (never
 *  over a pause or another consonant; m / b / p / f / v keep their own seal paths, ş / ç / c their protrusion). */
function withHeld(segs: readonly AlignSeg[], t: number, st: MouthState, acousticAt: (ms: number) => AcousticFrame): readonly AlignSeg[] {
  const tongue = (q: AlignSeg) => q.kind === 'C' && !!q.cons?.length && q.cons.every((c) => { const vis = PHONEMES[c]?.viseme; return vis !== 'PP' && vis !== 'FF' && vis !== 'WW' && vis !== 'HH' && vis !== 'SH'; });
  const held = (st.held ??= []);
  for (const q of segs) {
    if (q.kind !== 'C' || q.end < t - 40 || q.start > t + 250) continue;
    // (a consonant the decode moved is the same one, not a second: the s of 'and scattered' shown 50 ms later)
    for (let i = held.length - 1; i >= 0; i--) { const h = held[i]!.seg; if ((h.end > q.start && h.start < q.end) || (h.end > q.start - 60 && h.start < q.end + 60 && h.cons!.some((c) => q.cons?.includes(c)))) held.splice(i, 1); }
    if (tongue(q)) held.push({ seg: q, seen: t });
  }
  for (let i = held.length - 1; i >= 0; i--) if (t - held[i]!.seen > TUNE.heldMs || t < held[i]!.seen || held[i]!.seg.end < t - 60) held.splice(i, 1);
  let out: AlignSeg[] | null = null;
  for (const h of held) {
    if (h.seen === t) continue;
    const c = h.seg, cm = (c.start + c.end) / 2, cur: readonly AlignSeg[] = out ?? segs;
    if (cur.some((q) => q.kind !== 'V' && q.end > c.start - 5 && q.start < c.end + 5)) continue;
    // (and only where the voice has some consonant there: a ɾ left inside the ü of müşteri, where the classifier heard
    // none, took its pout .94 -> .68; the swallowed ones sit mid-vowel too, u-ɾ-u read as one u, so not by place)
    let pc = -1; for (let x = c.start - 10; x <= c.end + 10; x += 10) { const q = acousticAt(x).pc; if (q !== undefined) pc = Math.max(pc, q); }
    if (pc >= 0 && pc < TUNE.heldPc) continue;
    const vi = cur.findIndex((q) => q.kind === 'V' && !q.v2 && q.start <= cm && q.end >= cm);
    if (vi < 0) continue;
    const V = cur[vi]!, parts: AlignSeg[] = [];
    if (c.start - V.start >= 15) parts.push({ ...V, end: c.start });
    parts.push({ ...c, start: Math.max(c.start, V.start), end: Math.min(c.end, V.end) });
    if (V.end - c.end >= 15) parts.push({ ...V, start: c.end });
    out = [...cur.slice(0, vi), ...parts, ...cur.slice(vi + 1)];
  }
  return out ?? segs;
}

// smoothing: critically damped springs read ahead by their lag (2 / omega) so they add none. Fast enough for the
// syllable rate (Turkish ~6.5 / s: the jaw / lips keep ~75 % of it) while removing single-frame pops; the lip seal is
// applied after the springs, with its own fast timing, so m / b / p close fully and release on the sound
// (jaw / lower lip fast enough for 30-40 ms consonant dips between close vowels: at 70 / 75 half the syllables made no
// visible beat; the per-frame step cap below still prevents pops)
let OMEGA: Record<string, number> = { jawOpen: 95, mouthLowerDownLeft: 100, mouthLowerDownRight: 100, mouthUpperUpLeft: 60, mouthUpperUpRight: 60, mouthPucker: 75, mouthFunnel: 75, mouthStretchLeft: 80, mouthStretchRight: 80 }; // (rounding at 55 let go ~35 ms before its vowel ended)
export function setJawOmega(j: number, l: number) { OMEGA = { ...OMEGA, jawOpen: j, mouthLowerDownLeft: l, mouthLowerDownRight: l }; }
const OMEGA_DEF = 55;
const SEAL_OMEGA: [number, number] = [42, 62]; // closing (~70 ms, 2 frames at 30 fps; the seal's own: TUNE.sealClose), parting
const OUT_FILTERED = ['jawOpen', 'mouthClose', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'mouthFunnel', 'mouthPucker', 'mouthStretchLeft', 'mouthStretchRight'] as const;
const MAX_STEP: Record<string, number> = { jawOpen: 0.07 }; // per 16.7 ms frame; others 0.15

/** Morph weights for the mouth at display time t (ms, audio clock). The timeline must extend ~150 ms past t (the
 *  look-ahead) for the anticipation to be right. `prev` (optional) applies the jaw speed limit between frames. */
export function mouthAt(
  t: number,
  segs: readonly AlignSeg[],
  acousticAt: (ms: number) => AcousticFrame,
  vowelTargets: Record<string, [number, number]>,
  opt: AnimOptions = ANIM_DEFAULTS,
  speaking = 1,
  prev?: MouthState,
): Record<string, number> {
  if (!prev) { const r = rawMouthAt(t, segs, acousticAt, vowelTargets, opt, speaking), o = applySeal(r.w, r.seal, r.labio); o.mouthClose = (o.mouthClose ?? 0) + poutPress(o, r.seal, [acousticAt(t - 15), acousticAt(t), acousticAt(t + 25)]); return o; }
  const dt = prev.t > 0 ? Math.min(0.1, Math.max(0, (t - prev.t) / 1000)) : 0;
  // the page's audio clock moves in audio-callback blocks (~10-20 ms, more over Bluetooth) and stands still between
  // them: a frame that sees no time pass shows the last shape (it snapped every spring to its target and skipped every
  // limiter and the lip inertia, the live-only 'chirping' at 120 Hz). A clock that went back (a new call) starts over
  if (prev.t > 0 && t === prev.t && prev.last) return { ...prev.last };
  prev.t = t;
  const x = (prev.x ??= {}), v = (prev.v ??= {});
  segs = withHeld(segs, t, prev, acousticAt);
  const out: Record<string, number> = {};
  // each channel's target is read 2 / omega ahead (its spring's lag); channels sharing an omega share one read
  const reads = new Map<number, ReturnType<typeof rawMouthAt>>();
  // (every read ~TUNE.lead ms early: the speed limits below trail the targets by ~15 ms)
  const at = (lead: number) => { const k = Math.round(lead + TUNE.lead); let r = reads.get(k); if (!r) { r = rawMouthAt(t + k, segs, acousticAt, vowelTargets, opt, speaking); reads.set(k, r); } return r; };
  // (between two close vowels the jaw / lower lip follow faster: their beats are ~1 dot, and at 95 the springs rounded
  // most 30-40 ms dips of 'ri-ni-zi' away between two 30 fps frames; the step caps below still prevent pops)
  // (at 150 the dip still only showed between two 30 fps frames, sıdır's d one frame at 27 px then 39)
  // (and the pout between two u / ü, away from a seal: at 75 it reached its dip only between frames, the ɾ of ku-ru and
  // the j of bü-yü showed .75-.81 on the 30 fps frames, .67 / .71 now)
  // (TUNE.jawCc / pCc are now the springs' own 95 / 75: the faster 220 / 150 made the dips land on the 30 fps judged
  // frames but read as a vibrating 'cat chatter' at the page's 60 fps; the owner, 2026-09-26. Judge motion at 60 fps)
  const fastJ = at(0).cc, fastP = at(0).rr && at(0).seal < 0.05 && at(40).seal < 0.05;
  for (const k of MOUTH_OUT) {
    const w = fastJ && (k === 'jawOpen' || k.startsWith('mouthLowerDown')) ? TUNE.jawCc : fastP && k === 'mouthPucker' ? TUNE.pCc : OMEGA[k] ?? OMEGA_DEF;
    // (read ahead by the output inertia's lag too, TUNE.outLead: the seal keeps its own timing)
    const tg = at(2000 / w + TUNE.outLead).w[k] ?? 0;
    if (dt <= 0 || x[k] === undefined) { x[k] = tg; v[k] = 0; out[k] = tg; continue; }
    // exact critically damped step toward the target
    const d = x[k]! - tg, e = Math.exp(-w * dt), kk = v[k]! + w * d;
    let nx = tg + (d + kk * dt) * e;
    v[k] = (v[k]! - w * kk * dt) * e;
    // (the jaw closes a little slower than it opens: a closure in one frame reads as a clamshell snap)
    // (and opens a little slower than the spring would: a release into an a in one frame read as a clack; ~2 frames)
    const cap = (MAX_STEP[k] ?? 0.15) * (dt / (1 / 60)) * (k === 'jawOpen' ? (tg < x[k]! ? 0.7 : TUNE.jawUp) : 1);
    nx = Math.max(x[k]! - cap, Math.min(x[k]! + cap, nx));
    x[k] = nx; out[k] = Math.max(0, nx);
  }
  // the lip seal / labiodental contact have their own springs (a closure takes ~65 ms, parting ~55 ms: real lips; a
  // one-frame seal reads as a slam / mouth blink), read ahead by their lag so they land on the sound
  const cs: Record<'seal' | 'labio', number> = { seal: 0, labio: 0 };
  // a closure out of a loud open vowel starts once what is left of the time before the voice's fall is what closing
  // the visible gap takes at the lips' speed (~TUNE.planK ms per px), and keeps closing to it (latched): the spring's
  // own start left the loud a's open 20-40 ms into their m (Hastam, müşteri, Karmaşık)
  { const r0 = at(0), due = r0.sealDue; if (dt > 0 && due < Infinity && t >= r0.sealFrom && t + TUNE.planK * (x._fG ?? 0) >= due) { x._plan = due + 20; x._planF = r0.sealShort ? due - TUNE.planD : -Infinity; } }
  if (x._plan !== undefined && (t >= x._plan || x._plan - t > 300)) { delete x._plan; delete x._planF; } // (stale: passed, or the clock restarted)
  const plan = x._plan !== undefined;
  const spring = (key: string, up: number, down: number, wc: number, wp: number) => {
    const cur = x[key];
    const rising = cur === undefined || up > cur;
    const w = rising ? wc : wp, tg = rising ? up : down;
    if (dt <= 0 || cur === undefined) { x[key] = tg; v[key] = 0; return tg; }
    const d = cur - tg, e = Math.exp(-w * dt), kk = v[key]! + w * d;
    x[key] = tg + (d + kk * dt) * e;
    v[key] = (v[key]! - w * kk * dt) * e;
    return Math.min(1, Math.max(0, x[key]!));
  };
  let sealN = 0;
  for (const k of ['seal', 'labio'] as const) {
    // (a closure squeezed after a short vowel closes faster: ~45 ms instead of ~70)
    const wc = k === 'seal' ? TUNE.sealClose + TUNE.urgW * at(1000 / TUNE.sealClose).sealUrg : SEAL_OMEGA[0];
    const wp = k === 'seal' ? TUNE.sealPart : SEAL_OMEGA[1];
    // (a nasal m keeps its contact to its release: read ahead by the parting's lag, the voice's gate on the vowel after
    // it parted Karmaşık's m ~25 ms before its a, sealed on one 30 fps frame)
    const up = at(1000 / wc)[k], down = at(2000 / wp)[k];
    cs[k] = spring('_' + k, k === 'seal' && plan ? 1 : up, down, wc, wp);
    // (and the seal's own spring without the plan, for the planned closure's limit before the voice falls)
    if (k === 'seal') sealN = spring('_sN', up, down, wc, wp);
  }
  // the core constraints again on the smoothed curves (the springs smeared them: rounding peaked on the j / r between
  // rounded vowels and leaked into the next e; close vowels peaked below their floor). Blended by the core weight, so
  // nothing snaps: a rounded vowel's core holds its rounding, an unrounded vowel's core stays unrounded, every vowel
  // core reaches its opening floor
  {
    const c = at(0).core;
    const k = Math.min(1, Math.max(0, (c.w - 0.5) / 0.3));
    // wanted corrections on top of the springs, each rate-limited like the springs' own steps (no pops)
    let dJ = 0, dL = 0, dP = 0, dF = 0, dS = 0;
    if (k > 0) {
      // a spread vowel's core reaches its width (i was no wider than e: the dominance average and springs kept i's
      // stretch at ~.25 of .42)
      dS = Math.max(0, 0.85 * c.st * k - (out.mouthStretchLeft ?? 0));
      // (a rounded core's pout gives way inside a syllable trough: it held the j of büyü at a flat .80)
      const kt = k * (1 - c.tw);
      dJ = Math.max(0, c.jaw * k - (out.jawOpen ?? 0));
      dL = Math.max(0, c.ld * k - (out.mouthLowerDownLeft ?? 0));
      if (c.round) { dP = Math.max(0, 0.8 * Math.min(c.p, 1.0) * kt - (out.mouthPucker ?? 0)); dF = Math.max(0, 0.8 * c.f * kt - (out.mouthFunnel ?? 0)); }
      else { const cap = 0.15 + (1 - k) * 1.5; dP = Math.min(0, cap - (out.mouthPucker ?? 0)); dF = Math.min(0, cap - (out.mouthFunnel ?? 0)); }
    }
    const lim = (key: string, want: number, step: number) => {
      const cur = x[key] ?? 0, cap = step * (dt / (1 / 60));
      const nv = dt > 0 ? cur + Math.max(-cap, Math.min(cap, want - cur)) : want;
      x[key] = nv; return nv;
    };
    // (the floors rise at ~0.7 / 1.5 per second: at 0.03 / 0.06 a vowel core that came and went bumped the jaw up and
    // back within 3-4 frames, part of the 60 fps chatter)
    const bJ = lim('_bJ', dJ, 0.012), bL = lim('_bL', dL, 0.025), bP = lim('_bP', dP, 0.12), bF = lim('_bF', dF, 0.12), bS = lim('_bS', dS, 0.1);
    out.mouthStretchLeft = (out.mouthStretchLeft ?? 0) + bS; out.mouthStretchRight = (out.mouthStretchRight ?? 0) + bS;
    // (the ceiling holds after the springs too: spring + the floor correction took a loud tr1 a to .298)
    out.jawOpen = Math.min(opt.jawMax, (out.jawOpen ?? 0) + bJ);
    // the combined jaw keeps the per-frame step cap (spring + correction could stack)
    if (dt > 0 && x._oJ !== undefined) { const cap = 0.07 * (dt / (1 / 60)); out.jawOpen = Math.max(x._oJ - cap, Math.min(x._oJ + cap * TUNE.jawUp, out.jawOpen)); }
    x._oJ = out.jawOpen;
    // rounding changes at most ~0.25 per 30 fps frame (a pout switching off in one frame read as a twitch)
    for (const [key, sk] of [['mouthPucker', '_oP'], ['mouthFunnel', '_oF']] as const) {
      if (dt > 0 && x[sk] !== undefined) { const cap = 0.13 * (dt / (1 / 60)); out[key] = Math.max(x[sk]! - cap, Math.min(x[sk]! + cap, out[key] ?? 0)); }
      x[sk] = out[key] ?? 0;
    }
    out.mouthLowerDownLeft = (out.mouthLowerDownLeft ?? 0) + bL; out.mouthLowerDownRight = (out.mouthLowerDownRight ?? 0) + bL;
    out.mouthPucker = Math.max(0, (out.mouthPucker ?? 0) + bP); out.mouthFunnel = Math.max(0, (out.mouthFunnel ?? 0) + bF);
  }
  prev.jaw = out.jawOpen ?? 0;
  // (the wide-jaw press only once the closure's own ramp has started: pressing from the spring's first rise shut the
  // complex ɑ on its loudest frame)
  const pressK = Math.min(1, at(0).seal);
  // (out of a short vowel, the voice falling within ~TUNE.planShort ms of its onset, the planned closure takes at most
  // ~TUNE.planPre px off the gap the seal's own spring leaves until that fall: started from its middle it shrank the vowel
  // itself under base, 'kısa bir' a 40 -> 29 px, 'demo' ɛ 39 -> 27; a long one has shown its opening, Hastam / müşteri)
  if (plan && x._planF !== undefined && t < x._planF && cs.seal > sealN) {
    const gOf = (s: number) => { const r = applySeal(out, s, cs.labio, pressK), j = r.jawOpen ?? 0, c = r.mouthClose ?? 0; return 220 * Math.max(0, j - c) + 25 * (r.mouthLowerDownLeft ?? 0) * (1 - (j > 0.005 ? Math.min(1, c / j) : 0)); };
    const g0 = gOf(sealN) - TUNE.planPre;
    if (gOf(cs.seal) < g0) { let lo = sealN, hi = cs.seal; for (let i = 0; i < 8; i++) { const m = 0.5 * (lo + hi); if (gOf(m) < g0) hi = m; else lo = m; } cs.seal = lo; }
  }
  const res = applySeal(out, cs.seal, cs.labio, pressK), j1 = res.jawOpen ?? 0;
  // the final shape changes at most ~2 dots of lip gap and ~0.25 of pout per 30 fps frame, in any combination of
  // jaw, seal and rounding (a full closure or un-pout takes 2-3 frames: a one-frame snap reads as a puppet)
  if (dt > 0) {
    // (a seal builds its forced contact at ~1.5 dots per 30 fps frame, not ~1.6: at 60 fps the faster closings went past
    // 2 dots per frame. It was slowed only for the closures the late bound held back, as the others had no time to spare;
    // with the closure out of a loud open vowel started early enough (plan above), all of them take it; slower still left
    // the complex ɑ open 41 px a frame before its m)
    const f = dt / (1 / 60), grow = 0.025;
    // the visible gap (jaw past the lips + the lower lip's own drop ~0.11 of it + the upper lip's lift ~0.16) moves at
    // most ~real lip speed (~150 mm/s: ~1.5 dots per 30 fps frame, a little more into a bilabial seal): closings into
    // consonants snapped 2-3 dots in one frame. A too-fast closing is slowed on the jaw itself (the lower lip follows
    // it: holding the gap with the lower lip left it hanging under a closing jaw); a too-fast opening by the lips' contact
    const visOf = (r: Record<string, number>) => (r.jawOpen ?? 0) - (r.mouthClose ?? 0) + 0.114 * (r.mouthLowerDownLeft ?? 0) + 0.16 * (r.mouthUpperUpLeft ?? 0) + 0.15 * (r.mouthFunnel ?? 0);
    // (the funnel opens its own round hole: at most ~0.12 per 30 fps frame; ɔ -> ɹ shut 2+ dots in one frame)
    // (against the last shown funnel, the pout press's give-way below included: kept apart it flickered .17 -> 0 -> .12)
    if (x._fF2 !== undefined) res.mouthFunnel = Math.max(x._fF2 - 0.06 * f, Math.min(x._fF2 + 0.06 * f, res.mouthFunnel ?? 0));
    // (the upper lip lifts at most ~0.08 per 30 fps frame: its jump added ~7 px to every release)
    if (x._fU !== undefined) { const u = res.mouthUpperUpLeft ?? 0, lu = Math.min(u, x._fU + 0.04 * f), d = lu - u; res.mouthUpperUpLeft = lu; res.mouthUpperUpRight = Math.max(0, (res.mouthUpperUpRight ?? 0) + d); }
    x._fU = res.mouthUpperUpLeft ?? 0;
    if (x._fVis !== undefined) {
      const v0 = visOf(res), down = (TUNE.closeStep + TUNE.sealX * cs.seal) * f;
      if (v0 < x._fVis - down && x._fJ !== undefined) {
        const need = x._fVis - down - v0;
        // (a seal's share at most all of it: a pouted seal's contact past a small jaw, scaled up with the jaw held open,
        // pressed müşteri's m 0.08 past a .19 jaw; f / v keep theirs, the lower lip pressed to the teeth by the jaw)
        const j = res.jawOpen ?? 0, c = res.mouthClose ?? 0, k = j > 1e-4 ? (cs.labio >= 0.5 ? c / j : Math.min(1, c / j)) : 0;
        // more jaw (the lips' contact keeps its share of it), then less contact
        const addJ = Math.min(Math.max(0, x._fJ - j), need / Math.max(0.15, 1 - k));
        res.jawOpen = j + addJ; res.mouthClose = c + k * addJ;
        const rest = need - addJ * (1 - k);
        // (a bilabial seal is only slowed, never held open: its contact still grows ~2 dots per frame; the lip contact
        // is the sync cue, and the GBO b never sealed when the limiter could take it back)
        if (rest > 0) {
          const sk0 = Math.min(1, cs.seal / 0.85), floorC = cs.seal >= 0.5 && x._fC !== undefined ? x._fC + (0.02 + grow * sk0) * f : 0;
          res.mouthClose = Math.max(Math.min(floorC, res.mouthClose ?? 0), (res.mouthClose ?? 0) - rest);
        }
      }
      // (a bigger movement is a faster one, peak velocity ~ displacement: a loud a opens up to ~10 % faster; at one speed
      // for all, the loud short a's (odaklı, yapay) ran out of vowel before they were open)
      const v1 = visOf(res), up = TUNE.openStep * f * (1 + TUNE.prVel * at(20).core.pr);
      if (v1 > x._fVis + up) res.mouthClose = Math.min(res.jawOpen ?? 0, (res.mouthClose ?? 0) + (v1 - (x._fVis + up)));
    }
    // (and the jaw itself never jumps: the compensation above lets go at the jaw's own speed)
    // (the contact follows it by its share, but a seal's contact past the jaw keeps only its own excess)
    if (x._fJ !== undefined) { const j = res.jawOpen ?? 0, cap = (cs.seal > 0.5 ? 0.08 : 0.06) * f, lj = Math.max(x._fJ - cap, Math.min(x._fJ + cap, j)); if (lj !== j) { const c = res.mouthClose ?? 0, k = j > 1e-4 ? (cs.labio >= 0.5 ? c / j : Math.min(1, c / j)) : 0; res.jawOpen = lj; res.mouthClose = Math.max(0, Math.min(2 * lj, c + k * (lj - j))); } }
    // m / b / p seal whatever the limited jaw does (contact from the seal spring; a rounded m keeps a pout this rig can
    // still close, <= .45)
    if (cs.seal >= 0.5) {
      const sk = Math.min(1, cs.seal / 0.85);
      // (the contact builds at ~2 dots per frame at most, then holds: forced in one step it snapped 2.5 dots)
      // (never more than ~0.09 past the jaw, as in applySeal; the wide-jaw press only on a jaw that is really open, not
      // on one the limiters above still hold up while the lips close; and the pout's share no more than it takes to
      // close the pout, as at a small jaw: scaled with a .19 jaw both pressed müşteri's m to 11 px and Karmaşık's to 17,
      // under rest. The press is for a jaw opening behind closed lips, manuel's m)
      const J = res.jawOpen ?? 0, P = Math.min(1, res.mouthPucker ?? 0), held = Math.min(1, Math.max(0, (J - j1) / 0.03));
      const want = Math.min(J + TUNE.sealCap, sk * (J + Math.min(0.8 * P * J, TUNE.sealP * P) + 0.6 * pressK * (1 - held) * Math.max(0, J - 0.1))), allowed = x._fC !== undefined ? x._fC + (0.02 + grow * sk) * f : want;
      res.mouthClose = Math.max(res.mouthClose ?? 0, Math.min(want, allowed));
    }
    // (no path past the jaw + TUNE.sealCap: the jaw's step cap above rescaled a contact computed at the spring's lower jaw,
    // C .31 at J .20)
    res.mouthClose = Math.min(res.mouthClose ?? 0, (res.jawOpen ?? 0) + TUNE.sealCap);
    x._fVis = visOf(res); x._fJ = res.jawOpen ?? 0; x._fC = res.mouthClose ?? 0;
    { const j = res.jawOpen ?? 0, c = res.mouthClose ?? 0; x._fG = 220 * Math.max(0, j - c) + 25 * (res.mouthLowerDownLeft ?? 0) * (1 - (j > 0.005 ? Math.min(1, c / j) : 0)); }
    // (a pout gives way faster while the lips seal: this rig's pucker parts them, and kurum-s-al sealed only on the s;
    // and never comes back while the seal is closing: the pout fluttered 1 -> .68 -> .79 -> .38 into the m)
    if (x._fP !== undefined) {
      const sealing = x._pS !== undefined && cs.seal > x._pS + 0.01;
      // (<= ~0.2 per 30 fps frame down: the pout collapsed 0.44 in one frame into kurumsal's m / büyüme's m)
      // (and anticipates a coming unrounding by ~50 ms: the pout carried into the e of süreç / büyüme)
      { const c0 = at(0).core, Pa = at(50).w.mouthPucker ?? 0, cur = res.mouthPucker ?? 0; if (!(c0.round && c0.w > 0.5) && Pa < cur - 0.3) res.mouthPucker = cur - 0.5 * (cur - Pa); }
      // (and no anticipatory pout while an unrounded vowel still sounds: it starts at the consonant before the rounded
      // vowel; the springs' read-ahead rounded manuel's a to .37 before its n)
      { const u = at(0).core.unr; if (u > 0) res.mouthPucker = Math.min(res.mouthPucker ?? 0, Math.max(x._fP, 0.15) + (1 - u) * 1.5); }
      res.mouthPucker = Math.max(x._fP - 0.1 * f, Math.min(x._fP + (sealing ? 0.6 : 1) * TUNE.pUp * f, res.mouthPucker ?? 0));
    }
    x._fP = res.mouthPucker ?? 0; x._pS = cs.seal;
    // the spread changes at most ~0.12 per 30 fps frame (the wide i switched on and off in one frame: corner twitches)
    // (a tongue consonant between spread vowels lets go of some width past the core push, which put it back: the n's of
    // ri-ni-zi / -ni-zi held .48-.49 against the i's .55; the vowels' own cores keep it, 'i wider than e')
    { const ts = at(0).core.ts; if (ts > 0) { const k0 = 1 - TUNE.stBreath2 * ts; res.mouthStretchLeft = (res.mouthStretchLeft ?? 0) * k0; res.mouthStretchRight = (res.mouthStretchRight ?? 0) * k0; } }
    if (x._fS !== undefined) {
      // (a spread starts quickly and relaxes slowly, except into a pout: the corners came in late on 'We', oʊ, ş)
      const pouting = (res.mouthPucker ?? 0) > (x._fP0 ?? 0) + 0.005 && (res.mouthPucker ?? 0) > 0.2;
      // (and starts relaxing ~60 ms ahead of a lower target: the spread trailed 2-3 frames into ʃ / oʊ / the n's of i-runs)
      { const A = at(60), ahead = A.w.mouthStretchLeft ?? 0, cur = res.mouthStretchLeft ?? 0; if (((A.w.mouthPucker ?? 0) > 0.25 || A.seal > 0.3) && ahead < cur - 0.08) { const nv = cur - 0.5 * (cur - ahead), d = nv - cur; res.mouthStretchLeft = nv; res.mouthStretchRight = Math.max(0, (res.mouthStretchRight ?? 0) + d); } }
      const st = res.mouthStretchLeft ?? 0, lim = Math.max(x._fS - (pouting ? 0.12 : TUNE.stStep) * f, Math.min(x._fS + 0.1 * f, st)), d = lim - st;
      res.mouthStretchLeft = lim; res.mouthStretchRight = Math.max(0, (res.mouthStretchRight ?? 0) + d);
    }
    x._fS = res.mouthStretchLeft ?? 0; x._fP0 = res.mouthPucker ?? 0;
  }
  // a pouted seal presses its pout shut (poutPress), past the contact the limiters above shaped (they never counted the
  // pout's own parting either); it builds in a display frame or two and lets go at ~0.09 per 30 fps frame
  {
    const want = poutPress(res, cs.seal, [acousticAt(t - 15), acousticAt(t), acousticAt(t + 25)]), cur = x._fPr, f = dt / (1 / 60), c = res.mouthClose ?? 0;
    const pr = cur === undefined || dt <= 0 ? want : Math.max(cur - 0.045 * f, Math.min(cur + 0.06 * f, want));
    const tgt = TUNE.sealP * Math.min(1, Math.max(0, res.mouthPucker ?? 0));
    x._fPr = pr; res.mouthClose = Math.max(c, Math.min(c + pr, (res.jawOpen ?? 0) + tgt));
    // (and its funnel gives way as under a full seal: the funnel's own round hole kept kurumsal's pressed m at 24 px)
    // (at the funnel's own speed: a one-step press on a k heard as m switched a .17 funnel off and on again)
    if (pr > 0 && tgt > 1e-4) res.mouthFunnel = Math.max(dt > 0 && x._fF2 !== undefined ? x._fF2 - 0.06 * f : 0, (res.mouthFunnel ?? 0) * (1 - Math.min(1, pr / tgt)));
    if (dt > 0) x._fF2 = res.mouthFunnel ?? 0;
  }
  // the final shape goes through lip inertia (a critically damped follow, ~2 / TUNE.outW behind): whatever the
  // stages above do in 1-3 frames (consonant dips, floors, limiters trading off) no longer reads as a vibrating,
  // chattering mouth at 60 fps; a closing lip gap (seal / labiodental contact) is never held back by it
  if (TUNE.outW > 0 && dt > 0) {
    const w = TUNE.outW, e = Math.exp(-w * dt);
    const g0 = (res.jawOpen ?? 0) - (res.mouthClose ?? 0);
    for (const k of OUT_FILTERED) {
      const tg = res[k] ?? 0, pk = '_o' + k;
      if (x[pk] === undefined) { x[pk] = tg; v[pk] = 0; continue; }
      const d = x[pk]! - tg, kk = v[pk]! + w * d;
      x[pk] = tg + (d + kk * dt) * e; v[pk] = (v[pk]! - w * kk * dt) * e;
      res[k] = Math.max(0, x[pk]!);
    }
    if (cs.seal > 0.3 || cs.labio > 0.3) {
      const g = (res.jawOpen ?? 0) - (res.mouthClose ?? 0);
      if (g0 < g) { res.mouthClose = (res.jawOpen ?? 0) - g0; x._omouthClose = res.mouthClose; }
    }
  } else if (TUNE.outW > 0) for (const k of OUT_FILTERED) { x['_o' + k] = res[k] ?? 0; v['_o' + k] = 0; }
  prev.last = { ...res };
  return res;
}

/** The contact a pouted seal is short of pressing its pout shut. This rig's pucker parts the lips by itself (~19 px per
 *  unit at a small jaw) and each 0.01 of contact past the jaw takes ~1.75 px back, so a seal at contact = jaw left
 *  kurumsal's m and büyüme's b a parted kiss. A top-up toward jaw + sealP x pout (an increment on a seal already pressed
 *  went under rest, 14 px), once the lips have met (contact within ~5 % of the jaw) and the seal spring is past ~.5 (not
 *  its plateau: the live decode kept kurumsal's heard m at .5-.8), and only while the voice is shut too: quiet, or the
 *  classifier hearing m / b / p, from ~15 ms before t to ~25 ms after it (a late-aligned m held the ü / u after it shut
 *  over its sounding vowel, üzümü, uygun; and a seal pressed to its last frame sprang open 2.5 dots into its vowel). */
function poutPress(w: Record<string, number>, seal: number, voice: AcousticFrame[]): number {
  const j = w.jawOpen ?? 0, c = w.mouthClose ?? 0;
  if (j <= 0.005) return 0;
  const meet = Math.min(1, Math.max(0, (c / j - 0.89) / 0.07)), on = Math.min(1, Math.max(0, (seal - 0.3) / 0.2));
  let shut = 1;
  for (const a of voice) shut = Math.min(shut, Math.max(1 - Math.min(1, Math.max(0, (a.loud - 0.2) / 0.15)), Math.min(1, Math.max(0, ((a.pp ?? 0) - 0.4) / 0.3))));
  return Math.max(0, j + TUNE.sealP * Math.min(1, Math.max(0, w.mouthPucker ?? 0)) - c) * on * meet * shut;
}

const MOUTH_OUT = ['jawOpen', 'mouthFunnel', 'mouthPucker', 'mouthStretchLeft', 'mouthStretchRight', 'mouthSmileLeft', 'mouthSmileRight', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'mouthClose'] as const;

/** m / b / p: the lips seal over the (partly open) jaw; f / v: the lower lip up to the upper teeth. */
function applySeal(w: Record<string, number>, seal0: number, labio0: number, press = 1): Record<string, number> {
  // the springs approach 1 asymptotically: contact is complete from 0.85
  const seal = Math.min(1, seal0 / 0.85), labio = Math.min(1, labio0 / 0.85);
  const jaw = w.jawOpen ?? 0;
  const open = 1 - Math.max(seal, labio);
  const o: Record<string, number> = { ...w };
  o.jawOpen = jaw * (1 - 0.35 * seal);
  // (a pouted m presses shut: in this rig contact = jaw leaves a pucker .8 parted, 1.5-2x closes it; f / v press the
  // lower lip up to the teeth: the old contact left them a parted m, gap 44 vs 34 for m, calibration render wcal3)
  const pk = Math.min(1, w.mouthPucker ?? 0);
  // (and never more than TUNE.sealCap past the jaw, the pout's share no more than closing the pout takes, sealP x pout:
  // the pout and wide-jaw terms added up while a late closure's jaw was still wide, J .20 C .32, pressed under rest)
  o.mouthClose = Math.min(o.jawOpen * 2, o.jawOpen + TUNE.sealCap, Math.max(Math.min(0.75 * o.jawOpen, o.mouthClose ?? 0), seal * (o.jawOpen + Math.min(0.8 * pk * o.jawOpen, TUNE.sealP * pk) + 0.6 * press * Math.max(0, o.jawOpen - 0.1)), labio * o.jawOpen * (0.8 + 0.35 * labio)));
  for (const k of ['mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight']) o[k] = (o[k] ?? 0) * open;
  // f / v: the lower lip rises flat and the upper lip lifts clear of it, so the upper teeth row shows between (an m has
  // both lips even); no rounding through it (the f of 'transform' read as the open rounded vowel after it)
  const fv = Math.max(0, labio - seal);
  o.mouthUpperUpLeft = Math.max(o.mouthUpperUpLeft ?? 0, 0.18 * fv); o.mouthUpperUpRight = Math.max(o.mouthUpperUpRight ?? 0, 0.18 * fv);
  o.mouthStretchLeft = (o.mouthStretchLeft ?? 0) * (1 - 0.6 * fv); o.mouthStretchRight = (o.mouthStretchRight ?? 0) * (1 - 0.6 * fv);
  o.mouthPucker = (o.mouthPucker ?? 0) * (1 - 0.7 * fv); o.mouthFunnel = (o.mouthFunnel ?? 0) * (1 - fv);
  // closed lips can be rounded, but pucker / funnel part them in this rig: they give way while the lips are shut
  o.mouthPucker = (o.mouthPucker ?? 0) * (1 - 0.25 * seal);
  o.mouthFunnel = (o.mouthFunnel ?? 0) * (1 - seal);
  return o;
}

/** The voice's syllable beat at t (the viseme classifier's vowel evidence, 1 - consonant - silence, smoothed): `pk`
 *  0..1 how clearly t is a nucleus, `near` 0..1 the deepest consonant dip within +-60 ms (the evidence >= 0.2 below its
 *  peaks on both sides within 80 ms). Both 0 without a classifier. */
function voiceBeat(t: number, acousticAt: (ms: number) => AcousticFrame): { pk: number; near: number } {
  const N = 15, raw: number[] = [];
  for (let k = -N; k <= N; k++) { const a = acousticAt(t + 10 * k); if (a.pc === undefined) return { pk: 0, near: 0 }; raw.push(Math.max(0, 1 - a.pc - (a.ps ?? 0))); }
  const sm = (k: number) => { const i = Math.max(-N, Math.min(N, k)) + N; return 0.25 * raw[Math.max(0, i - 1)]! + 0.5 * raw[i]! + 0.25 * raw[Math.min(2 * N, i + 1)]!; };
  const depth = (j: number) => { let l = 0, r = 0; for (let k = j - 8; k <= j; k++) l = Math.max(l, sm(k)); for (let k = j; k <= j + 8; k++) r = Math.max(r, sm(k)); return Math.min(l, r) - sm(j); };
  let near = 0;
  for (let j = -6; j <= 6; j++) near = Math.max(near, Math.min(1, Math.max(0, (depth(j) - 0.2) / 0.3)));
  const pk = Math.min(1, Math.max(0, (sm(0) - 0.6) / 0.3)) * (1 - Math.min(1, Math.max(0, depth(0) / 0.25)));
  return { pk, near };
}

function rawMouthAt(
  t: number,
  segs: readonly AlignSeg[],
  acousticAt: (ms: number) => AcousticFrame,
  vowelTargets: Record<string, [number, number]>,
  opt: AnimOptions,
  speaking: number,
): { w: Record<string, number>; seal: number; labio: number; core: Core; sealUrg: number; sealDue: number; sealFrom: number; sealShort: boolean; sealHold: number; cc: boolean; rr: boolean } {
  const items = itemsOf(segs, acousticAt, vowelTargets, opt.lang, t);
  // dominance-weighted average per channel group (silence fills with rest so the sum never drops to zero)
  const num: Record<Ch, number> = { jaw: 0, lowerDown: 0, upperUp: 0, stretch: 0, smile: 0, funnel: 0, pucker: 0 };
  // a neutral (rest) competitor in every group: a weak, far gesture only pulls in proportion to its envelope
  // (without it, consonants with lip dominance .06 let the next vowel's rounding win ~160 ms early)
  const den = [...BASE];
  let seal = 0, labioDental = 0, sibilant = 0, rounded = 0, rw = 0, vowelW = 0, sealUrg = 0, sealDue = Infinity, sealFrom = 0, sealShort = false, sealHold = 0;
  let nuc: Item | null = null, nucW = 0, cons: Item | null = null, consW = 0, unrV = false;
  for (let ii = 0; ii < items.length; ii++) {
    const it = items[ii]!;
    if (it.kind === 'V') { const w0 = weight(it, 0, t); vowelW = Math.max(vowelW, w0); if (w0 > nucW) { nucW = w0; nuc = it; } }
    else if (it.kind === 'C') { const w0 = weight(it, 0, t); if (w0 > consW) { consW = w0; cons = it; } }
    for (let g = 0; g < 4; g++) {
      const D = it.a[g]! * weight(it, g, t);
      if (D < 1e-4) continue;
      den[g]! += D;
      for (const c of CH) if (GROUP[c] === g) num[c] += D * (it.shape[c] ?? 0) * (g === 0 || g === 1 ? it.amp : 1);
    }
    // constraint windows: m / b / p sealed from ~30 ms before the closure to the release; f / v; sibilants
    if (it.kind === 'C') {
      const vis = PHONEMES[it.ph]?.viseme;
      // closed from `lead` before the closure (and at least `min` ms) to the release, eased in / out
      const inWin = (lead: number, min: number, rin: number, rout: number) => {
        const a = Math.min(it.on - lead, it.end - min);
        return t >= a && t <= it.end ? 1 : t < a ? quintic(1 - (a - t) / rin) : quintic(1 - (t - it.end) / rout);
      };
      if (vis === 'PP') {
        // the lips finish closing at the closure's onset (the closing gesture starts ~60 ms before it: real lips take
        // 80-120 ms to close from an open vowel; a later, faster seal read as a one-frame snap) and part at the release.
        // A nasal m is heard WITH the lips sealed: it holds to its vowel onset (released at the loudness rise it opened
        // while the murmur was still sounding: manuel, Karmaşık); b / p part at the burst. The envelope itself comes
        // from the seal spring in mouthAt
        // (before another consonant the lips part at that consonant: the release search found the vowel's rise after it,
        // and kurumsal's m held shut through the s, mouthClose .13 at the a's onset)
        const nx = items[ii + 1], nxV = nx ? PHONEMES[nx.ph]?.viseme : undefined;
        // (an m keeps its hold before t / k and a sonorant: the release search finds the burst after the stop's silent
        // closure, or the sonorant's own rise, and the m is heard to it; parted at the aligned end, 'Welcome to',
        // 'transform complex' and 'Hastam yapay' opened while the m still sounded. Before a fricative the search ran on to
        // the vowel after its quiet frication, and before d / g to the stop's release into the vowel)
        const nasal = it.ph === 'm', nxC = nx ? PHONEMES[nx.ph]?.cls : undefined;
        const partAtC = !nasal || nxC === 'fric' || nxC === 'affr' || nx?.ph === 'd' || nx?.ph === 'g';
        const clus = !!nx && nx.kind === 'C' && nx.on - it.end < 20 && nxV !== 'PP' && nxV !== 'FF' && partAtC;
        const rel = it.rel ?? it.end;
        // (the closing time scales with how far the lips are apart: from an open a ~70 ms, from a small ü ~35; a
        // fixed lead sealed the whole short second ü of büyü-me)
        // (and never before ~60 % of the vowel before it, closing faster instead: a 70 ms a before b / p was sealed over
        // most of its length, 'kısa bir', 'konuşabilmek', 'yapıyor')
        let pvJ = 0.1, pvKeep = -Infinity;
        for (let j = ii - 1; j >= 0; j--) { const q = items[j]!; if (q.kind === 'P') break; if (q.kind === 'V') { pvJ = (q.shape.jaw ?? 0) * q.amp + 0.1 * Math.min(1, (q.shape.pucker ?? 0) + (q.shape.funnel ?? 0)); pvKeep = q.on + TUNE.keepV * (q.end - q.on) + 1000 / TUNE.sealClose; break; } }
        // (up to 1.25x: at 1.15 the loud a's, jaw .25+, closed into their m in one 28 px frame)
        const lead = TUNE.sealLead * Math.min(1.25, Math.max(0.45, pvJ / 0.2));
        // (the closure starts where the voice falls, when that is earlier than the aligned onset: yapay's p sealed only on
        // its burst, ~40 ms late)
        let onA = it.on, fall = it.on, fell = false;
        { let pk = 0, tPk = it.on - 120; for (let x = it.on - 120; x <= it.on; x += 10) { const l = acousticAt(x).loud; if (l > pk) { pk = l; tPk = x; } }
          let lo = pk; for (let x = tPk; x <= rel; x += 10) lo = Math.min(lo, acousticAt(x).loud);
          if (pk - lo > 0.25) { const half = lo + 0.5 * (pk - lo); for (let x = tPk; x <= it.on + 20; x += 5) if (acousticAt(x).loud < half) { fall = Math.min(it.on, x); onA = Math.max(it.on - 25, fall); fell = true; break; } } }
        const a0 = Math.max(rel - 125 - lead, Math.min(onA - lead, rel - TUNE.minSeal - TUNE.sealLead));
        const a1 = Math.min(Math.max(a0, pvKeep), onA + 5);
        const r2 = clus ? Math.min(rel, it.end) : nasal ? Math.max(rel, it.end) + TUNE.mHold : rel - 10;
        // (and not before ~10 ms ahead of the closure itself, nor after the voice's fall, where it is long enough to hold
        // the seal: completed 25-40 ms early, the complex ɑ was half shut on its loudest frame and the transform m sealed on
        // the ɹ; this only moves the closure later, it does not hurry it like a short vowel does)
        // (only where the voice's own fall confirms that timing, and long enough before the release actually used (r2):
        // with no fall to go by the aligned onset alone moved Teslim's m, aligned 35 ms late, a frame later)
        const a = fell ? Math.max(a1, Math.min(onA - TUNE.sealLate, fall, Math.min(rel, r2) - TUNE.minSeal - TUNE.sealLead)) : a1;
        if (t >= a - 40 && t <= rel) sealUrg = Math.max(sealUrg, Math.min(1, (a1 - a0) / 40));
        // (out of an open vowel (or its liquid) that the voice itself falls from, mouthAt starts closing early enough to
        // be shut by then at the lips' own speed: from a loud a's wide opening the closure takes 80-100 ms, and the late
        // bound left Hastam / müşteri / Karmaşık open into their heard m; after a close vowel or a consonant the jaw is
        // on its way down by itself)
        // (not before about the vowel's middle, less the lips' reaction: a 60-80 ms a would close from its onset)
        let pv = items[ii - 1]; if (pv && pv.kind === 'C' && (LIQ.has(pv.ph) || pv.ph === 'ɾ')) pv = items[ii - 2];
        if (fell && t < a && pv && pv.kind === 'V' && (pv.shape.jaw ?? 0) >= 0.17 && fall + TUNE.planD < sealDue) { sealDue = fall + TUNE.planD; sealFrom = (pv.on + pv.end) / 2 - TUNE.planMid; sealShort = fall - pv.on <= TUNE.planShort; }
        const e = t >= a && t <= r2 ? 1 : t < a ? quintic(1 - (a - t) / 20) : quintic(1 - (t - r2) / 15);
        seal = Math.max(seal, e);
        // (for mouthAt: until when a nasal m's contact holds)
        if (nasal && !clus && t >= a) sealHold = Math.max(sealHold, Math.min(rel, it.end));
      }
      // (narrow windows: at 50 ms in / 40 ms out the sibilant jaw cap covered the neighbouring vowels' cores in fast
      // speech, so 'sıdır', '-rinizi' never opened)
      // (f / v leave the teeth at the voice's release too, not at the segment end: the v of Vision held ~30 ms into its ɪ)
      else if (vis === 'FF') {
        const e1 = Math.min(it.end, (it.rel ?? it.end) - 5), a1 = Math.min(it.on - 15, e1 - 40);
        labioDental = Math.max(labioDental, t >= a1 && t <= e1 ? 1 : t < a1 ? quintic(1 - (a1 - t) / 30) : quintic(1 - (t - e1) / 20));
      }
      // (the cap lets go in the consonant's last ~25 ms so the next vowel opens on time: kurumsal's a peaked 54 ms late)
      if (vis === 'SS' || vis === 'SH') { const e1 = Math.max(it.on + 20, it.end - 25), a1 = Math.min(it.on - 5, e1 - 30); sibilant = Math.max(sibilant, t >= a1 && t <= e1 ? 1 : t < a1 ? quintic(1 - (a1 - t) / 25) : quintic(1 - (t - e1) / 25)); }
    }
    if (it.kind === 'V') { const r = (it.shape.funnel ?? 0) + (it.shape.pucker ?? 0); const w = weight(it, 3, t); rounded += w * r; rw += w; if (r < 0.1 && !it.rg && t >= it.on && t < it.end) unrV = true; }
  }
  const ch = {} as Record<Ch, number>;
  for (const c of CH) ch[c] = num[c] / den[GROUP[c]]!;
  // every syllable is a visible beat: at fast rates the dominance average let a close vowel and the consonants around it
  // reach the same opening (the mouth held one slit through 'ğınık verilerinizi'). Inside a vowel's own core it opens to
  // at least 60 % of its target; inside a lingual consonant's core the jaw comes back up toward the consonant's height
  let press = 0, floorJaw = 0, floorLD = 0, uCore = 0;
  if (nuc && nucW > 0.5) {
    // every vowel reaches ~80 % of its own opening in its core, even a 60 ms one (short close vowels peaked at half of
    // theirs, so half the syllables made no visible beat); open vowels 85 %
    const j0 = nuc.shape.jaw ?? 0;
    const k = (j0 >= 0.17 ? 0.85 + TUNE.prFloor * (nuc.pr ?? 0) : j0 < 0.1 ? 0.9 : 0.8) * Math.min(1, (nucW - 0.5) / 0.4);
    // (never past the jaw ceiling: a loud stressed a's floor reached .316 over jawMax .29)
    floorJaw = Math.min(opt.jawMax, k * (nuc.shape.jaw ?? 0) * nuc.amp); floorLD = k * (nuc.shape.lowerDown ?? 0) * nuc.amp;
    ch.jaw = Math.max(ch.jaw, floorJaw);
    ch.lowerDown = Math.max(ch.lowerDown, floorLD);
    // a close rounded vowel's core is a small round opening (u / ü with a neighbour's jaw read as a flared 'oh')
    if ((nuc.shape.pucker ?? 0) >= 1.2) {
      // (but its core still bobs open to ~0.08 with the press eased below: at the spec's ~0.05 behind the press a u
      // was no more open than the r / j beside it, 'ku-ru-m', 'büyü' one frozen pout)
      uCore = Math.min(1, (nucW - 0.5) / 0.4);
      floorJaw = Math.max(floorJaw, uCore * TUNE.uJaw);
      ch.jaw = Math.max(floorJaw, Math.min(ch.jaw, 1.5 * (nuc.shape.jaw ?? 0) * nuc.amp + (1 - nucW) * 0.2));
      ch.lowerDown = Math.min(ch.lowerDown, 1.5 * (nuc.shape.lowerDown ?? 0) + (1 - nucW) * 0.3);
      // and the lips press in a little around it (this rig's pucker parts them into an 'o')
      press = 0.5 * nucW;
    }
  }
  // an unrounded vowel keeps its shape over most of its span, whatever rounding its neighbours carry in (büyü-me read
  // as büyü-mö, ajans as ojans): rounding reaches it only in its last ~2 frames
  if (nuc && nucW > 0.3 && ((nuc.shape.stretch ?? 0) > 0.1 || (nuc.shape.funnel ?? 0) + (nuc.shape.pucker ?? 0) < 0.1)) {
    const cap = 0.15 + (1 - nucW) * 1.2;
    if (ch.pucker > cap) ch.pucker = cap;
    if (ch.funnel > cap) ch.funnel = cap;
  }
  // every close nucleus the voice itself has: the viseme classifier's vowel evidence (1 - consonant - silence) peaks on
  // each nucleus and dips on each consonant (not the loudness: its 0.4-2.2 kHz band misses close vowels, an n between
  // two i's was louder than both). Used where the aligned timing is off (a trough window over the voice's vowel, a u
  // the live edge stretched), never to add a syllable the timeline does not have
  const vb = voiceBeat(t, acousticAt);
  const tcx = (q: Item) => (q.on + q.end) / 2;
  let pvC: Item | undefined, nvC: Item | undefined;
  for (const q of items) { if (q.kind === 'P') { if (tcx(q) <= t) pvC = undefined; else break; } else if (q.kind === 'V') { if (tcx(q) <= t) pvC = q; else { nvC = q; break; } } }
  if (pvC && t - pvC.end > 250) pvC = undefined;
  if (nvC && nvC.on - t > 250) nvC = undefined;
  const closeV = (q?: Item) => !!q && (q.shape.jaw ?? 0) < 0.125, rnd = (q?: Item) => closeV(q) && (q!.shape.pucker ?? 0) >= 1.2;
  const nucC = pvC && nvC ? (t - tcx(pvC) < tcx(nvC) - t ? pvC : nvC) : pvC ?? nvC;
  // (not over a j / r / l the timeline has here: the classifier hears them as vowel, the i-j of '-iyor' merged)
  const liq = items.some((q) => q.kind === 'C' && LIQ.has(q.ph) && t >= q.on - 15 && t <= q.end + 15);
  const vPk = nucC && closeV(nucC) && !liq ? vb.pk : 0;
  // syllable troughs: inside a consonant (>= 20 ms) between two vowels the jaw and lower lip sit about one dot below the
  // lower of the two vowels (in fast close-vowel runs the consonants never pulled the mouth back down: 'sıdır',
  // 'dağınık', 'inTELligence' merged into one slit), deepest at the consonant's middle
  // (a short consonant's dip lasts at least 50 ms, centred on it, and the vowels' opening floors give way inside it:
  // a 20 ms n between two i's never moved the springs, and 'ri-ni-zi' held one frozen shape for 170 ms)
  let troughW = 0, troughLiq = false, troughPh = '';
  for (let i = 0; i < items.length; i++) {
    const c = items[i]!;
    if (c.kind !== 'C' || PHONEMES[c.ph]?.viseme === 'HH') continue;
    const cm = (c.on + c.end) / 2, half = Math.max(TUNE.dipHalf, (c.end - c.on) / 2);
    let c0 = cm - half, c1 = cm + half;
    if (t <= c0 || t >= c1) continue;
    let pv: Item | undefined, nv: Item | undefined;
    for (let j = i - 1; j >= 0; j--) { const q = items[j]!; if (q.kind === 'P') break; if (q.kind === 'V') { if (c.on - q.end < 250) pv = q; break; } }
    for (let j = i + 1; j < items.length; j++) { const q = items[j]!; if (q.kind === 'P') break; if (q.kind === 'V') { if (q.on - c.end < 250) nv = q; break; } }
    if (!pv || !nv) continue;
    // (next to a close vowel the dip leaves that vowel's middle half: the 68 ms windows of a 10 ms ɾ and a 20 ms n left
    // 17 ms of verilerinizi's 70 ms first i, 36 px against the ɾ's 28, 40 now; m / b / p / f / v keep their windows for
    // the seals)
    const lab = PHONEMES[c.ph]?.viseme === 'PP' || PHONEMES[c.ph]?.viseme === 'FF', cp = !lab && closeV(pv), cn = !lab && closeV(nv);
    if (cp) c0 = Math.max(c0, Math.min(cm - 12, tcx(pv) + TUNE.ccCore * (pv.end - pv.on)));
    if (cn) c1 = Math.min(c1, Math.max(cm + 12, tcx(nv) - TUNE.ccCore * (nv.end - nv.on)));
    if (t <= c0 || t >= c1) continue;
    const vj = Math.min((pv.shape.jaw ?? 0) * pv.amp, (nv.shape.jaw ?? 0) * nv.amp);
    const vl = Math.min((pv.shape.lowerDown ?? 0) * pv.amp, (nv.shape.lowerDown ?? 0) * nv.amp);
    // (flat-topped: the full dip holds over the middle of the window, so it survives the speed limits and 30 fps)
    // (and gives way where the voice has a close nucleus with its own consonant dip close by: the window was misplaced)
    // (steeper on the side of a close vowel, so the shorter window still holds its dip over two 30 fps frames; the open
    // side keeps its ramp: steeper there, closings into m / b / p and open vowels' middles went)
    const xw = (t - c0) / (c1 - c0), w = Math.min(1, ((xw < 0.5 ? cp : cn) ? TUNE.ccTop : 1.6) * Math.sin(Math.PI * xw)) * (1 - vPk * vb.near);
    const capJ = Math.max(vj - TUNE.dipJ, 0.02), capL = Math.max(vl - 0.08, 0);
    if (ch.jaw > capJ) ch.jaw += (capJ - ch.jaw) * w;
    if (ch.lowerDown > capL) ch.lowerDown += (capL - ch.lowerDown) * w;
    troughW = w; troughLiq = LIQ.has(c.ph); troughPh = c.ph;
    break;
  }
  // (the width breathes too: a tongue consonant between i's lets go ~30 % of the spread; it held .55 through ri-ni-zi)
  const spr = (q?: Item) => !!q && (q.shape.stretch ?? 0) >= 0.4, spr2 = spr(pvC) && spr(nvC);
  if (spr2) ch.stretch *= 1 - TUNE.stBreath * troughW;
  floorJaw *= 1 - troughW; floorLD *= 1 - troughW;
  // rounding spans: a run of rounded vowels (and the consonants between them, and the consonant just before the first)
  // holds one rounding plateau, peaking on the vowels, ramping in over ~60 ms before and out over ~60 ms after (the
  // pucker peaked on the j / r between rounded vowels and let go inside the second: büyüme, kurum)
  {
    const isR = (q: Item) => q.kind === 'V' && (q.shape.pucker ?? 0) + (q.shape.funnel ?? 0) >= 0.6;
    for (let i = 0; i < items.length; i++) {
      if (!isR(items[i]!)) continue;
      let j = i, minP = items[i]!.shape.pucker ?? 0, minF = items[i]!.shape.funnel ?? 0;
      // extend over consonants to the next rounded vowel (no pause, no unrounded vowel between)
      for (let k = i + 1; k < items.length; k++) {
        const q = items[k]!;
        if (q.kind === 'P' || (q.kind === 'V' && !isR(q))) break;
        if (isR(q)) { if (q.on - items[j]!.end > 220) break; j = k; minP = Math.min(minP, q.shape.pucker ?? 0); minF = Math.min(minF, q.shape.funnel ?? 0); }
      }
      const prev = items[i - 1];
      const s0 = prev && prev.kind === 'C' && items[i]!.on - prev.on < 140 ? prev.on : items[i]!.on - 30, s1 = items[j]!.end;
      // the ramps stop at the unrounded vowel before / after and at a bilabial after (m / b / p end the span)
      let lo = -Infinity, hi = Infinity;
      for (let k = i - 1; k >= 0; k--) { const q = items[k]!; if (q.kind === 'V' || q.kind === 'P') { lo = q.end; break; } }
      for (let k = j + 1; k < items.length; k++) { const q = items[k]!; if (q.kind === 'V' || q.kind === 'P' || PHONEMES[q.ph]?.viseme === 'PP') { hi = q.on; break; } }
      const ramp = t < lo || t > hi ? 0 : t < s0 ? quintic(1 - (s0 - t) / Math.min(60, Math.max(1, s0 - lo))) : t > s1 ? quintic(1 - (t - s1) / Math.min(60, Math.max(1, hi - s1))) : 1;
      const ease = 1 - 0.18 * troughW;
      // (and between two rounded vowels the funnel gives way in the trough too: its own round hole, +0.08 there, held the
      // lips as open on the j of büyü as on the ü's, 46 / 49 px; the ramps into / out of a span keep it, the f of
      // transform would open 31 px in one frame into its ɔ; and not on a ş / ç / c, whose flare is its own: ş of
      // dönüştürüyoruz F .15 -> .04)
      const between = j > i && t > items[i]!.on && t < items[j]!.end, fEase = PHONEMES[troughPh]?.viseme === 'SH' ? 1 : 1 - TUNE.rFun * troughW;
      if (ramp > 0) { ch.pucker = Math.max(ch.pucker * ease, 0.85 * minP * ramp * ease); ch.funnel = between ? Math.max(ch.funnel, 0.85 * minF) * fEase : Math.max(ch.funnel, 0.85 * minF * ramp) + 0.08 * troughW * ramp; }
      i = j;
    }
  }
  // the mouth never contradicts the sound's energy (the most visible sync cue): a loud voiced vowel that the timeline
  // has no vowel for (a late word, a misaligned edge) opens with the shape the voice itself says; real silence under
  // a timeline vowel relaxes it
  {
    const a = acousticAt(t);
    let pk = 0;
    for (let x = t - 60; x <= t + 60; x += 20) pk = Math.max(pk, acousticAt(x).loud);
    const vowelish = a.voiced && a.loud > 0.45 && a.loud > pk - 0.18 ? Math.min(1, (a.loud - 0.45) / 0.25) : 0;
    const miss = vowelish * Math.max(0, 1 - 2 * vowelW);
    if (miss > 0.01) {
      const ac = acousticVowel(a, vowelTargets, opt.lang).shape;
      const k = miss * 0.85;
      for (const c of CH) ch[c] = (1 - k) * ch[c] + k * (ac[c] ?? 0) * (GROUP[c] === 3 ? 0.4 : c === 'jaw' || c === 'lowerDown' ? VOWEL_JAW : 1);
    }
    let pk2 = 0, sil = 1;
    for (let x = t - 90; x <= t + 90; x += 15) { const q = acousticAt(x); pk2 = Math.max(pk2, q.loud); if (q.ps !== undefined) sil = Math.min(sil, q.ps < 0.5 ? 0 : 1); }
    // (quiet speech is not silence: where the classifier hears speech, a soft stretch like 'intelligence' keeps moving)
    if (pk2 < 0.07 && sil > 0) { const q = Math.min(1, (0.07 - pk2) / 0.05); for (const c of CH) ch[c] *= 1 - 0.85 * q; }
    // no rounding held in a silence unless a rounded sound is about to start (anticipation)
    if (pk2 < 0.1) {
      let ant = 0;
      for (const it of items) if (((it.shape.pucker ?? 0) + (it.shape.funnel ?? 0) > 0.5) && it.on >= t) ant = Math.max(ant, weight(it, 3, t));
      const k = 0.3 + 0.7 * ant;
      ch.pucker *= k; ch.funnel *= k;
    }
  }
  // acoustic seal: where the classifier hears m / b / p clearly for ~40 ms but the timeline has none there (the aligner
  // stretched 'for' over the m of 'transform'), the lips close anyway
  if (ACOUSTIC_SEAL > 0 && seal < 0.5) {
    let n = 0, sum = 0;
    for (let x = t - 20; x <= t + 20; x += 10) { const q = acousticAt(x).pp; if (q !== undefined) { n++; sum += q; } }
    if (n >= 4) { const m = sum / n; if (m > ACOUSTIC_SEAL) seal = Math.max(seal, Math.min(1, (m - ACOUSTIC_SEAL) / 0.2)); }
  }
  // acoustic labiodental: where the classifier hears f / v for ~20 ms the lower lip rises to the teeth even when the
  // timeline has none there (a late word's v merged into the k before it: dağınık verilerinizi)
  if (labioDental < 0.5 && seal < 0.5) {
    let n = 0, sum = 0;
    for (let x = t - 10; x <= t + 20; x += 10) { const q = acousticAt(x).pf; if (q !== undefined) { n++; sum += q; } }
    // (two consecutive frames: a v squeezed to 20 ms after a k averaged under the threshold)
    let m2 = 0; for (let x = t - 20; x <= t + 10; x += 10) { const a1 = acousticAt(x).pf, a2 = acousticAt(x + 10).pf; if (a1 !== undefined && a2 !== undefined) m2 = Math.max(m2, Math.min(a1, a2)); }
    // (only in the voice's dip: the classifier's f / v lingers ~20 ms into the vowel after it)
    let pkL = 0; for (let x = t - 90; x <= t + 90; x += 15) pkL = Math.max(pkL, acousticAt(x).loud);
    const lh = acousticAt(t).loud, inDip = lh < 0.3 || lh < pkL - 0.2;
    if (n >= 3 && inDip) { const m = Math.max(sum / n, 0.8 * m2); if (m > TUNE.acLabio) labioDental = Math.max(labioDental, Math.min(1, (m - TUNE.acLabio) / 0.15)); }
  }
  // the consonant constraints only act where the voice really dips (a consonant is quieter than the vowels around
  // it): a misaligned m / b / p never closes the lips on an audible vowel
  if (seal > 0 || labioDental > 0 || sibilant > 0) {
    let pk = 0;
    for (let x = t - 90; x <= t + 90; x += 15) pk = Math.max(pk, acousticAt(x).loud);
    const consAt = (x: number) => {
      const here = Math.min(acousticAt(x - 10).loud, acousticAt(x).loud, acousticAt(x + 10).loud);
      return here < 0.12 ? 1 : Math.min(1, Math.max(0, (pk - here - 0.06) / 0.2));
    };
    const cons = consAt(t);
    // the lips close toward an m / b / p while the vowel before it still sounds: its dip up to 45 ms ahead counts
    // (gated on the dip at t alone, the closure could only start inside the consonant and snapped shut in one frame)
    let consSeal = cons; for (let d = 15; d <= TUNE.sealAhead; d += 15) consSeal = Math.max(consSeal, consAt(t + d));
    // a voiced m between vowels barely dips: where the classifier itself hears m / b / p, the seal may close
    let ppk = 0, pfk = 0;
    for (let x = t - 30; x <= t + 30; x += 10) { const q = acousticAt(x); ppk = Math.max(ppk, q.pp ?? 0); pfk = Math.max(pfk, q.pf ?? 0); }
    let ppAhead = ppk; for (let x = t + 40; x <= t + 60; x += 10) ppAhead = Math.max(ppAhead, acousticAt(x).pp ?? 0);
    seal *= Math.max(consSeal, Math.min(1, 2 * ppAhead)); labioDental *= Math.max(cons, Math.min(1, 2 * pfk)); sibilant *= Math.max(cons, 0.5);
  }
  // jaw: sibilants nearly shut, ceiling, speed limit (|dJ| <= 0.1 per 60 fps frame = 6 / s)
  // acoustic beats: where the voice itself is a consonant, the jaw and lower lip come up a little. The aligner can merge
  // short consonants into the vowels around them in fast speech (i-n-i as one i); the audio still says where they are
  let acDip = 0;
  {
    const q0 = acousticAt(t - 10).pc, q1 = acousticAt(t).pc, q2 = acousticAt(t + 10).pc;
    if (q0 !== undefined && q1 !== undefined && q2 !== undefined && seal < 0.3) {
      const pc = (q0 + q1 + q2) / 3;
      ch.jaw *= 1 - TUNE.pcK * pc; ch.lowerDown *= 1 - 0.45 * pc;
      // where the classifier clearly hears a consonant for ~30 ms the vowel floors give way too (the live decode can
      // hold one long i over 'i-n-i' for a few frames; the voice itself still says n)
      acDip = Math.min(1, Math.max(0, (pc - TUNE.pcDip) / 0.3));
    }
  }
  // (an aligned vowel's core keeps its floor otherwise: the classifier's consonant evidence lags a frame or two into
  // the vowel)
  ch.jaw = Math.max(ch.jaw, floorJaw * (1 - acDip)); ch.lowerDown = Math.max(ch.lowerDown, floorLD * (1 - acDip));
  floorJaw *= 1 - acDip; floorLD *= 1 - acDip;
  // every close nucleus the voice has opens to its floor, wherever the timeline put it (a u / ü to ~0.08: at the spec's
  // ~0.05 behind the lips' press a u was no more open than the r / j beside it, 'ku-ru-m', 'büyü' one frozen pout)
  if (vPk > 0 && seal < 0.3) {
    const j0 = nucC!.shape.jaw ?? 0, k = j0 < 0.1 ? 0.9 : 0.8, cr = (nucC!.shape.pucker ?? 0) >= 1.2;
    const nj = Math.max(k * j0 * nucC!.amp, cr ? TUNE.uJaw : 0), nl = k * (nucC!.shape.lowerDown ?? 0) * nucC!.amp, pk = vPk * (1 - troughW);
    ch.jaw = Math.max(ch.jaw, pk * nj); ch.lowerDown = Math.max(ch.lowerDown, pk * nl);
    floorJaw = Math.max(floorJaw, pk * nj); floorLD = Math.max(floorLD, pk * nl);
    if (cr) uCore = Math.max(uCore, pk);
  }
  // (the press around a u gives way on its nucleus: the jaw's bob shows as the lips' opening)
  press *= 1 - 0.6 * uCore * (1 - troughW);
  // syllabic rhythm: the opening follows the voice's syllable envelope (loudness here against its local peak), from
  // ENV_FLOOR of the target at a consonant dip to all of it on the vowel peak. The shapes stay the phonemes'; this only
  // makes every syllable a visible open-close cycle (fast close-vowel runs held one slit: 'mumbling between chomps')
  if (ENV_K > 0 && seal < 0.3) {
    let pk = 0; for (let x = t - 150; x <= t + 150; x += 15) pk = Math.max(pk, acousticAt(x).loud);
    if (pk > 0.15) {
      const r = Math.min(1, acousticAt(t).loud / pk);
      ch.jaw *= 1 - ENV_K * (1 - r); ch.lowerDown *= 1 - 0.8 * ENV_K * (1 - r);
    }
  }
  let jaw = Math.min(opt.jawMax, ch.jaw);
  // only m / b / p (and silence) shut the lips: audible speech keeps a small opening (a closed mouth on a vowel or an
  // n / s reads as a fake m)
  { const a = acousticAt(t); if ((a.loud > 0.12 || (a.ps !== undefined && a.ps < 0.3)) && seal < 0.5 && labioDental < 0.5) { const k = a.ps !== undefined && a.ps < 0.3 ? 1 : Math.min(1, (a.loud - 0.12) / 0.15); jaw = Math.max(jaw, 0.03 * k); ch.lowerDown = Math.max(ch.lowerDown, 0.06 * k); } }
  // (and an aligned vowel's core is never capped by a neighbouring sibilant)
  if (sibilant > 0) { const sb = sibilant * (1 - Math.min(1, Math.max(0, (nucW - 0.5) / 0.3))); jaw = Math.min(jaw, 0.04 + (1 - sb) * Math.max(0, jaw - 0.04)); }
  // speaking smile layer, x0.3 on rounded vowels; never over a seal (the seal itself is applied after smoothing)
  const roundAmt = rw > 0 ? Math.min(1, rounded / rw / 0.4) : 0;
  // (none on open vowels either: raised corners over a dropped jaw read as an open-mouthed smile / laugh)
  const smileLayer = opt.warm * speaking * (1 - roundAmt) * (1 - seal) * (1 - Math.min(1, jaw / 0.18));
  // rounded lips are never spread at the same time (a pout with stretched corners reads as neither)
  const roundNow = Math.min(1, (ch.pucker + ch.funnel) / 0.5);
  ch.stretch *= 1 - 0.75 * roundNow; ch.smile *= 1 - roundNow;
  const asym = 0.02 * Math.sin(t * 0.0013) + 0.01 * Math.sin(t * 0.0031 + 1.3);
  // micro-motion: real lips never hold perfectly still (~1-2 % slow wander while speaking)
  const wander = speaking * (0.012 * Math.sin(t * 0.0047 + 0.7) + 0.008 * Math.sin(t * 0.0113 + 2.1));
  const w: Record<string, number> = {
    jawOpen: jaw,
    mouthFunnel: ch.funnel,
    mouthPucker: ch.pucker,
    mouthStretchLeft: ch.stretch * (1 + asym),
    mouthStretchRight: ch.stretch * (1 - asym),
    mouthSmileLeft: Math.min(0.12, ch.smile + smileLayer) * (1 + asym),
    mouthSmileRight: Math.min(0.12, ch.smile + smileLayer) * (1 - asym),
    mouthLowerDownLeft: ch.lowerDown * (1 + asym) + wander,
    mouthLowerDownRight: ch.lowerDown * (1 - asym) + wander,
    mouthUpperUpLeft: ch.upperUp + 0.6 * wander,
    mouthUpperUpRight: ch.upperUp + 0.6 * wander,
    mouthClose: press * jaw,
  };
  // plan B's lip morphs are driven past 1 (rig calibration); clamp only at zero and a sane ceiling
  // (pucker too: plan B narrows the mouth only ~15 % at 1, ~28 % at 1.8)
  // (the pout's ceiling eases on a consonant between rounded vowels: at 1.0 the r of ku-ru-m held a frozen kiss; on a
  // j / r / l to ~.6, below the u / ü beside it)
  // (but not inside the rounded vowel itself: through the pout spring's ~37 ms read-ahead the lower ceiling and the
  // eased core push reached into a short u / ü before a liquid, pucker .95 -> .74)
  const inRV = items.some((q) => q.kind === 'V' && (q.shape.pucker ?? 0) + (q.shape.funnel ?? 0) >= 0.6 && t >= q.on && t <= q.end);
  // (a j / r / l between two u / ü to ~.5: at ~.58 its 30 fps frames showed .75-.77; not a w, rounded itself: the w of
  // 'you would' went .74 -> .66 and took the ʊ's pout with it)
  for (const k in w) w[k] = Math.max(0, Math.min(k.startsWith('mouthLowerDown') ? 1.6 : k.startsWith('mouthUpperUp') ? 0.7 : k === 'mouthPucker' ? 1.0 - (troughLiq && !inRV ? (rnd(pvC) && rnd(nvC) && troughPh !== 'w' ? 0.5 : 0.42) : 0.28) * troughW : 1, w[k]!));
  // (a spread vowel's core, for the width's breathing between spread vowels in mouthAt)
  const inSV = items.some((q) => { const m = Math.min(15, 0.25 * (q.end - q.on)); return q.kind === 'V' && (q.shape.stretch ?? 0) >= 0.4 && t >= q.on + m && t <= q.end - m; });
  // the vowel core at t, for the constraints re-applied after smoothing (mouthAt)
  const core: Core = { w: nuc ? nucW : 0, round: nuc ? (nuc.shape.pucker ?? 0) + (nuc.shape.funnel ?? 0) >= 0.6 : false, p: nuc?.shape.pucker ?? 0, f: nuc?.shape.funnel ?? 0, jaw: floorJaw, ld: floorLD, st: nuc && (nuc.shape.pucker ?? 0) + (nuc.shape.funnel ?? 0) < 0.3 ? nuc.shape.stretch ?? 0 : 0, tw: inRV ? 0 : troughW, ts: inSV || !spr2 ? 0 : troughW, pr: nuc?.pr ?? 0, unr: unrV ? Math.min(1, Math.max(0, (acousticAt(t).loud - 0.15) / 0.25)) : 0 };
  // (cc: t lies between two close vowels, rr: between two u / ü, for the springs in mouthAt)
  return { w, seal, labio: labioDental, core, sealUrg, sealDue, sealFrom, sealShort, sealHold, cc: closeV(pvC) && closeV(nvC), rr: rnd(pvC) && rnd(nvC) };
}
