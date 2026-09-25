// Face expression that rides along with the mouth while she talks: a very subtle lid tension on stressed
// syllables, a hint of eye narrowing on smiling / spread visemes, and minimal brow / forehead life (a slight
// inner-brow lift on emphasised words and at the end of a question, a whisper of brow settle after a phrase,
// occasionally a touch asymmetric). The Duchenne eye narrowing that comes with a smile lives in idle.ts
// (duchenneMorphs) so the plain idle preview has it without this module.
// Owner direction: slight and warm; never a squint-glare, a blink, a surprised or a frowning look; driven by the
// speech rhythm (accents, phrase ends, question ends), not random. Pure in t (seconds from the line start).
// Morphs: eyeSquint*, browInnerUp*, browDown* (mesh-f5s exports them; on a mesh without them the engine ignores
// the keys).
import { rng } from './idle';
import type { Timed } from './timing';

export const EXPRESSION_MORPHS = [
  'eyeSquintLeft', 'eyeSquintRight', 'browInnerUpLeft', 'browInnerUpRight', 'browDownLeft', 'browDownRight',
] as const;

/** Amplitudes (morph weights). Raised ~2x after the owner saw no visible change on the dot lattice: eyeSquint
 *  ~0.3 is a visible but gentle lower-lid rise, browInnerUp ~0.3 a clear lift (0.45+ reads worried), browDown
 *  above ~0.1 starts to read as a frown. */
export const EXPR = {
  /** lid tension on accented syllables (eyeSquint, x accent strength) */
  lidAccent: 0.28,
  /** eye narrowing per unit of the speech smile channel (spread visemes + the warm undertone) */
  lidSpread: 1.3,
  /** inner-brow lift on an emphasised word (x accent strength) */
  browAccent: [0.04, 0.07] as [number, number],
  /** inner-brow lift at the end of a question */
  browQuestion: [0.07, 0.1] as [number, number],
  /** brow settle after a phrase (browDown) */
  browSettle: [0.015, 0.025] as [number, number],
  /** engaged talking eyes: lower-lid baseline while a line is spoken (breathes slowly between the two) */
  talkSquint: [0.24, 0.38] as [number, number],
  /** brow lift at a phrase start, relaxing ~70% toward the phrase end (intonation declination) */
  talkBrow: 0.05,
  maxSquint: 0.65,
  maxBrowUp: 0.14,
  maxBrowDown: 0.03,
};

/** How long after the line end the expression keeps moving (question release, last settle), s. */
export const EXPR_TAIL = 2;

interface Ev {
  /** s from the line start */
  t: number;
  a: number;
  /** left / right: L = a (1 + asym), R = a (1 - asym) */
  asym: number;
}

export interface ExprPlan {
  dur: number;
  /** lid tension on accented syllables */
  lids: Ev[];
  /** inner-brow lifts on emphasised words */
  lifts: Ev[];
  /** brow settles after phrases */
  settles: Ev[];
  /** inner-brow lift over the end of a question: rises t0 -> t1, holds to the line end, then releases */
  question: (Ev & { t0: number }) | null;
}

export interface ExprValue {
  squintL: number;
  squintR: number;
  upL: number;
  upR: number;
  downL: number;
  downR: number;
}

const smoother = (x: number) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const lerp = ([a, b]: [number, number], x: number) => a + (b - a) * x;

/** Attack from `a0` to `a1`, decay from `a1` to `d1` (s, relative to the event). */
const bump = (u: number, a0: number, a1: number, d1: number) =>
  u <= a0 || u >= d1 ? 0 : u < a1 ? smoother((u - a0) / (a1 - a0)) : 1 - smoother((u - a1) / (d1 - a1));

/** Mostly near-symmetric, occasionally a touch asymmetric. Always draws two numbers (stable streams). */
const asymOf = (r: () => number) => {
  const pick = r(), mag = r();
  const s = pick < 0.5 ? -1 : 1;
  return s * (pick < 0.18 || pick > 0.82 ? 0.12 + 0.13 * mag : 0.05 * mag);
};

/** Per-line expression plan from the timed text (seeded; its own random stream). */
export function planExpression(text: string, timed: Timed, seed = 0): ExprPlan {
  const r = rng(1009 + 17 * seed);
  const dur = timed.durationMs / 1000;
  const lids: Ev[] = [];
  const lifts: Ev[] = [];
  for (const a of timed.accents) {
    const t = a.t / 1000;
    lids.push({ t, a: a.k, asym: 0 });
    // the phrase's main accent usually lifts the brows a touch, the secondary one sometimes
    const x = r(), amp = r(), asym = asymOf(r);
    if (x < (a.k >= 0.9 ? 0.75 : 0.35)) lifts.push({ t, a: a.k * lerp(EXPR.browAccent, amp), asym });
  }
  const question = /\?\s*$/.test(text.trim())
    ? { t0: Math.max(0, dur - 1.0), t: Math.max(0.2, dur - 0.2), a: lerp(EXPR.browQuestion, r()), asym: asymOf(r) }
    : null;
  const settles: Ev[] = [];
  for (const s of timed.segments) {
    // pauses inside the line (commas, full stops): the brows settle as the phrase ends
    if (s.viseme !== 'rest' || s.start <= 0 || s.end - s.start < 150 || s.end >= timed.durationMs) continue;
    settles.push({ t: s.start / 1000, a: lerp(EXPR.browSettle, r()), asym: asymOf(r) });
  }
  // line end: settle right away, or after a question's lift has released
  settles.push({ t: question ? dur + 0.75 : dur, a: lerp(EXPR.browSettle, r()), asym: asymOf(r) });
  return { dur, lids, lifts, settles, question };
}

/** Expression at `tl` s from the line start (0 far outside the line). */
export function sampleExpression(p: ExprPlan, tl: number): ExprValue {
  const v: ExprValue = { squintL: 0, squintR: 0, upL: 0, upR: 0, downL: 0, downR: 0 };
  if (tl < -0.5 || tl > p.dur + EXPR_TAIL) return v;
  for (const e of p.lids) {
    const s = EXPR.lidAccent * e.a * bump(tl - e.t, -0.12, 0.05, 0.42);
    v.squintL += s; v.squintR += s;
  }
  for (const e of p.lifts) {
    const s = e.a * bump(tl - e.t, -0.2, 0.08, 0.72);
    v.upL += s * (1 + e.asym); v.upR += s * (1 - e.asym);
  }
  const q = p.question;
  if (q) {
    const end = p.dur + 0.15;
    const s = q.a * (tl < q.t ? smoother((tl - q.t0) / (q.t - q.t0)) : tl < end ? 1 : 1 - smoother((tl - end) / 0.8));
    v.upL += s * (1 + q.asym); v.upR += s * (1 - q.asym);
  }
  for (const e of p.settles) {
    const s = e.a * bump(tl - e.t, 0, 0.25, 0.95);
    v.downL += s * (1 + e.asym); v.downR += s * (1 - e.asym);
  }
  return v;
}
