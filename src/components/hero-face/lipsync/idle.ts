// Idle life for the hero face, framework-free and pure in t (seconds): the preview's head sway, blinks, and the
// occasional soft closed-lip smile the owner asked for. Kept separate from the lip-sync driver so the plain
// ?face=1 preview can load it without the G2P / coarticulation code.

export interface IdlePose {
  yaw: number;
  pitch: number;
  roll: number;
  y: number;
}

/** The dev preview's idle sway (radians / W), unchanged from HeroFacePreview. */
export const idleSway = (t: number): IdlePose => ({
  yaw: 0.035 * Math.sin(t * 0.31),
  pitch: 0.02 * Math.sin(t * 0.23 + 1),
  roll: 0.01 * Math.sin(t * 0.17 + 2),
  y: 0.003 * Math.sin(t * 2 * Math.PI * 0.22),
});

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoother = (x: number) => {
  const u = Math.max(0, Math.min(1, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

/** Blinks as in the preview: a 0.17 s sine lid, the first at 2.5 s, then every 2.67-6.17 s (seeded, pure in t). */
export function createBlinks(seed = 11) {
  const r = rng(seed);
  const starts: number[] = [2.5];
  const extend = (t: number) => {
    while (starts[starts.length - 1]! < t + 10) starts.push(starts[starts.length - 1]! + 0.17 + 2.5 + r() * 3.5);
  };
  return (t: number) => {
    extend(t);
    for (const s of starts) {
      if (s > t) break;
      const k = t - s;
      if (k <= 0.17) return Math.sin((k / 0.17) * Math.PI);
    }
    return 0;
  };
}

export interface SmileEvent {
  /** start, s */
  t0: number;
  /** ease in, hold, ease out, s */
  tin: number;
  hold: number;
  tout: number;
  /** peak mouthSmile (0.12-0.3) */
  peak: number;
  /** left / right asymmetry, signed fraction */
  asym: number;
}

export interface SmileValue {
  smile: number;
  asym: number;
}

export function smileEnvelope(e: SmileEvent, t: number): number {
  const u = t - e.t0;
  if (u <= 0) return 0;
  if (u < e.tin) return smoother(u / e.tin);
  const h = u - e.tin;
  if (h < e.hold) return 1 - 0.06 * Math.sin((Math.PI * h) / e.hold) ** 2; // a hint of settling in the hold
  const o = h - e.hold;
  return o < e.tout ? 1 - smoother(o / e.tout) : 0;
}

export const smileEnd = (e: SmileEvent) => e.t0 + e.tin + e.hold + e.tout;

/** A warm smile event with the owner's ranges: in 0.6-0.9 s, hold 1.5-3 s, out 0.8-1.2 s, peak 0.2-0.3 (below ~0.2 the
 *  smile does not read at hero-card size; above ~0.3 it starts to look like a grin). */
export function makeSmile(t0: number, r: () => number, opts: { peak?: [number, number]; hold?: [number, number] } = {}): SmileEvent {
  const [p0, p1] = opts.peak ?? [0.34, 0.46];
  const [h0, h1] = opts.hold ?? [1.5, 3];
  return {
    t0,
    tin: 0.6 + 0.3 * r(),
    hold: h0 + (h1 - h0) * r(),
    tout: 0.8 + 0.4 * r(),
    peak: p0 + (p1 - p0) * r(),
    asym: (r() < 0.5 ? -1 : 1) * (0.04 + 0.1 * r()),
  };
}

/** Idle smiles every ~6-14 s (irregular), the first a few seconds after start. Pure in t. */
export function createIdleSmiles(seed = 5, firstAt?: number) {
  const r = rng(seed);
  const events: SmileEvent[] = [makeSmile(firstAt ?? 3 + 1.5 * r(), r)];
  const extend = (t: number) => {
    while (events[events.length - 1]!.t0 < t + 20) {
      const last = events[events.length - 1]!;
      // start to start 6-14 s, never overlapping the previous smile
      events.push(makeSmile(Math.max(last.t0 + 6 + 8 * r(), smileEnd(last) + 1.5), r));
    }
  };
  return (t: number): SmileValue => {
    extend(t);
    let best: SmileValue = { smile: 0, asym: 0 };
    for (const e of events) {
      if (e.t0 > t) break;
      const v = e.peak * smileEnvelope(e, t);
      if (v > best.smile) best = { smile: v, asym: e.asym };
    }
    return best;
  };
}

/** Smile -> morphs: closed-lip, a touch asymmetric, a whisper of stretch. On this face mouthSmile alone parts the
 *  lips a hair from ~0.25, so a small seal rides along (jawOpen = mouthClose = 0.1 x smile keeps them together). */
export function smileMorphs(v: SmileValue): Record<string, number> {
  const L = v.smile * (1 + v.asym), R = v.smile * (1 - v.asym);
  const seal = 0.1 * v.smile;
  return {
    mouthSmileLeft: L,
    mouthSmileRight: R,
    mouthStretchLeft: 0.12 * L,
    mouthStretchRight: 0.12 * R,
    jawOpen: seal,
    mouthClose: seal,
  };
}

/** Duchenne coupling: a real smile narrows the eyes a little (the lower lids rise), a beat after the mouth.
 *  k = eyeSquint per unit of mouthSmile (the idle smile 0.22-0.3 -> 0.24-0.33: a visible, gentle lower-lid rise,
 *  never a squint-glare), lag in s. The lids hand over to blinks (the performers scale the squint by 1 - blink). */
export const DUCHENNE = { k: 1.2, lag: 0.1, max: 0.5 };

export function duchenneMorphs(v: SmileValue): { eyeSquintLeft: number; eyeSquintRight: number } {
  const s = Math.min(DUCHENNE.max, DUCHENNE.k * v.smile);
  return { eyeSquintLeft: s * (1 + 0.5 * v.asym), eyeSquintRight: s * (1 - 0.5 * v.asym) };
}

/** Every morph the performers drive, at 0: samples are absolute (engine.setMorphs merges, so a morph a
 *  performer stops mentioning would otherwise keep its last weight). */
export const ZERO_MORPHS: Readonly<Record<string, number>> = Object.freeze({
  jawOpen: 0, mouthClose: 0, mouthFunnel: 0, mouthPucker: 0, mouthSmileLeft: 0, mouthSmileRight: 0, mouthStretchLeft: 0,
  mouthStretchRight: 0, mouthLowerDownLeft: 0, mouthLowerDownRight: 0, mouthUpperUpLeft: 0, mouthUpperUpRight: 0,
  eyeBlinkLeft: 0, eyeBlinkRight: 0,
  eyeSquintLeft: 0, eyeSquintRight: 0, browInnerUpLeft: 0, browInnerUpRight: 0, browDownLeft: 0, browDownRight: 0,
});

export interface PerformerSample {
  pose: IdlePose;
  morphs: Record<string, number>;
  speaking: boolean;
  /** index of the line being spoken (talk mode), -1 otherwise */
  line: number;
}

export interface Performer {
  sample(t: number): PerformerSample;
}

/** Idle only: sway + blinks + occasional smiles (with the Duchenne eye narrowing). */
export function createIdlePerformer(opts: { seed?: number; firstSmileAt?: number } = {}): Performer {
  const blink = createBlinks(11 + (opts.seed ?? 0));
  const smiles = createIdleSmiles(5 + (opts.seed ?? 0), opts.firstSmileAt);
  return {
    sample(t) {
      const b = blink(t);
      const eyes = duchenneMorphs(smiles(t - DUCHENNE.lag));
      return {
        pose: idleSway(t),
        morphs: {
          ...ZERO_MORPHS, eyeBlinkLeft: b, eyeBlinkRight: b, ...smileMorphs(smiles(t)),
          eyeSquintLeft: eyes.eyeSquintLeft * (1 - b), eyeSquintRight: eyes.eyeSquintRight * (1 - b),
        },
        speaking: false,
        line: -1,
      };
    },
  };
}
