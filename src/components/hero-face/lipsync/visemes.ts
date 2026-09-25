// Viseme -> morph targets for the hero face (ICT-FaceKit identity #5, ARKit-named morphs), plus the styles.
// Owner direction: minimal. The table is the 'natural' ceiling (the most we would ever show) and it is already
// small; 'subtle' and 'minimal' scale it down per channel group. Tuned by looking at hero-card renders.
import type { Viseme } from './phonemes';

/** Symmetric mouth channels; L/R are split at the end (small asymmetry). */
export const CHANNELS = ['jaw', 'close', 'funnel', 'pucker', 'smile', 'stretch', 'lowerDown', 'upperUp'] as const;
export type Channel = (typeof CHANNELS)[number];
export type Target = Partial<Record<Channel, number>>;

/** Channel groups share the coarticulation behaviour (dominance, anticipation, smoothing). */
export type Group = 'open' | 'round' | 'spread';
export const GROUP: Record<Channel, Group> = {
  jaw: 'open', close: 'open', lowerDown: 'open', upperUp: 'open', funnel: 'round', pucker: 'round', smile: 'spread', stretch: 'spread',
};

// 'natural' ceiling. Rest (all 0) is the mesh neutral: lips together, barely parted inside.
export const TARGETS: Record<Viseme, Target> = {
  rest: {},
  // lips meet: tiny jaw with mouthClose = jawOpen keeps them sealed; a hint of press forward
  PP: { jaw: 0.03, close: 0.03, pucker: 0.04 },
  // lower lip up toward the upper teeth: the lip rises against a small jaw drop (close), upper lip lifts a little
  FF: { jaw: 0.06, close: 0.05, upperUp: 0.1, stretch: 0.03 },
  TH: { jaw: 0.07, lowerDown: 0.06, upperUp: 0.03 },
  DD: { jaw: 0.07, lowerDown: 0.07, upperUp: 0.03, stretch: 0.05 },
  LL: { jaw: 0.09, lowerDown: 0.07, upperUp: 0.03, stretch: 0.03 },
  SS: { jaw: 0.035, lowerDown: 0.07, upperUp: 0.05, stretch: 0.1, smile: 0.04 },
  SH: { jaw: 0.05, lowerDown: 0.06, upperUp: 0.06, funnel: 0.2, pucker: 0.12 },
  RR: { jaw: 0.06, lowerDown: 0.04, funnel: 0.12, pucker: 0.14 },
  KK: { jaw: 0.1, lowerDown: 0.06, upperUp: 0.02 },
  HH: { jaw: 0.08, lowerDown: 0.05 },
  JJ: { jaw: 0.05, lowerDown: 0.05, stretch: 0.12, smile: 0.06 },
  WW: { jaw: 0.04, funnel: 0.14, pucker: 0.36 },
  AA: { jaw: 0.2, lowerDown: 0.16, upperUp: 0.05, stretch: 0.04 },
  EE: { jaw: 0.12, lowerDown: 0.12, upperUp: 0.05, stretch: 0.14, smile: 0.07 },
  IH: { jaw: 0.07, lowerDown: 0.08, upperUp: 0.04, stretch: 0.18, smile: 0.1 },
  YI: { jaw: 0.08, lowerDown: 0.07, upperUp: 0.02, stretch: 0.07 },
  OO: { jaw: 0.13, lowerDown: 0.06, funnel: 0.34, pucker: 0.14 },
  UU: { jaw: 0.06, funnel: 0.2, pucker: 0.38 },
  ER: { jaw: 0.08, lowerDown: 0.04, funnel: 0.14, pucker: 0.12 },
  AX: { jaw: 0.09, lowerDown: 0.07, upperUp: 0.02 },
};

/** Dominance (Cohen-Massaro): how strongly a segment imposes its target on each group vs its neighbours.
 *  Bilabials own the lip opening; tongue consonants take their lip shape (rounding, spread) from the vowels
 *  around them; h takes the next vowel's shape. */
export const DOMINANCE: Record<Viseme, [open: number, round: number, spread: number]> = {
  rest: [1.4, 1, 1],
  PP: [5, 0.7, 0.8], FF: [3.5, 0.6, 0.8], TH: [1.4, 0.4, 0.5], DD: [0.9, 0.3, 0.4], LL: [0.7, 0.3, 0.4], SS: [1.3, 0.4, 0.8],
  SH: [1.1, 2, 1], RR: [0.7, 1.4, 0.8], KK: [0.6, 0.3, 0.3], HH: [0.15, 0.15, 0.15], JJ: [0.7, 0.5, 1.3],
  WW: [1.6, 3, 1.6],
  AA: [1, 1, 1], EE: [1, 1, 1], IH: [1, 1, 1.1], YI: [1, 1, 1], OO: [1, 1.3, 1], UU: [1, 1.5, 1], ER: [1, 1.1, 1], AX: [0.7, 0.7, 0.7],
};

export type StyleName = 'minimal' | 'subtle' | 'natural';

export interface LipStyle {
  /** gains on the target table per channel family */
  jaw: number;
  /** lowerDown / upperUp */
  lips: number;
  /** funnel / pucker */
  round: number;
  /** smile / stretch */
  spread: number;
  /** multiplier on the smoothing time constants (> 1 = softer) */
  smooth: number;
  /** left / right asymmetry (fraction) */
  asym: number;
  /** head nod on accented syllables, radians (+ nods down) */
  nod: number;
  /** warm smile carried under the speech (0..1 of mouthSmile) */
  warm: number;
  /** hard ceiling for jawOpen */
  jawMax: number;
}

export const STYLES: Record<StyleName, LipStyle> = {
  // default: barely parted lips, jaw almost still, shapes only hinted
  minimal: { jaw: 0.8, lips: 1.0, round: 1.0, spread: 1.0, smooth: 1.1, asym: 0.06, nod: 0.011, warm: 0.1, jawMax: 0.18 },
  // a little more articulation, still restrained
  subtle: { jaw: 0.6, lips: 0.7, round: 0.75, spread: 0.75, smooth: 1.1, asym: 0.06, nod: 0.006, warm: 0.035, jawMax: 0.13 },
  // the most we would ever show: still small, never theatrical
  natural: { jaw: 0.85, lips: 0.9, round: 0.95, spread: 0.9, smooth: 1, asym: 0.07, nod: 0.009, warm: 0.03, jawMax: 0.19 },
};

export const styleGain = (s: LipStyle, c: Channel) =>
  c === 'jaw' || c === 'close' ? s.jaw : c === 'lowerDown' || c === 'upperUp' ? s.lips : c === 'funnel' || c === 'pucker' ? s.round : s.spread;
