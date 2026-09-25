// Phoneme inventory shared by the Turkish and English G2P, the timing model and the viseme table.
// Symbols are IPA-ish strings; a diphthong is one phoneme that the timing stage splits into two targets.

/** Mouth-shape classes (visemes). Tuned for the ICT-FaceKit morphs of the hero face (see visemes.ts). */
export type Viseme =
  | 'rest' // pause / breath: lips softly together
  | 'PP' // m b p: lips meet
  | 'FF' // f v: lower lip up under the upper teeth
  | 'TH' // θ ð
  | 'DD' // t d n ɾ: narrow, tongue behind the teeth
  | 'LL' // l: like DD, a touch more open
  | 'SS' // s z: teeth nearly together, slight spread
  | 'SH' // ʃ ʒ tʃ dʒ: slight protrusion
  | 'RR' // English ɹ: slight rounding
  | 'KK' // k g ŋ: mid, neutral
  | 'HH' // h: takes the next vowel's shape (low dominance)
  | 'JJ' // j: brief spread
  | 'WW' // w: rounded, protruded
  | 'AA' // a æ ɑ ʌ: the most open (still small)
  | 'EE' // e ɛ
  | 'IH' // i ɪ: spread, close
  | 'YI' // Turkish ı: close, neutral
  | 'OO' // o ɔ ø
  | 'UU' // u ʊ y
  | 'ER' // ɝ
  | 'AX'; // ə

export type PhClass = 'vowel' | 'stop' | 'nasal' | 'fric' | 'affr' | 'liquid' | 'tap' | 'glide' | 'h';

export interface PhonemeInfo {
  viseme: Viseme;
  cls: PhClass;
  /** base duration in ms at rate 1 */
  dur: number;
}

const V = (viseme: Viseme, dur: number): PhonemeInfo => ({ viseme, cls: 'vowel', dur });
const C = (viseme: Viseme, cls: PhClass, dur: number): PhonemeInfo => ({ viseme, cls, dur });

export const PHONEMES: Record<string, PhonemeInfo> = {
  // vowels
  a: V('AA', 95), 'æ': V('AA', 105), 'ɑ': V('AA', 105), 'ʌ': V('AA', 80),
  e: V('EE', 90), 'ɛ': V('EE', 90),
  i: V('IH', 85), 'ɪ': V('IH', 70),
  'ɯ': V('YI', 80),
  o: V('OO', 95), 'ɔ': V('OO', 100), 'ø': V('OO', 95),
  u: V('UU', 90), 'ʊ': V('UU', 70), y: V('UU', 90),
  'ə': V('AX', 55), 'ɝ': V('ER', 100),
  // diphthongs (split into two targets by timing.ts)
  'aɪ': V('AA', 150), 'eɪ': V('EE', 140), 'oʊ': V('OO', 140), 'aʊ': V('AA', 155), 'ɔɪ': V('OO', 155),
  // consonants
  p: C('PP', 'stop', 75), b: C('PP', 'stop', 65), m: C('PP', 'nasal', 70),
  f: C('FF', 'fric', 85), v: C('FF', 'fric', 65),
  'θ': C('TH', 'fric', 85), 'ð': C('TH', 'fric', 55),
  t: C('DD', 'stop', 70), d: C('DD', 'stop', 60), n: C('DD', 'nasal', 60), l: C('LL', 'liquid', 60), 'ɾ': C('DD', 'tap', 40),
  s: C('SS', 'fric', 90), z: C('SS', 'fric', 75),
  'ʃ': C('SH', 'fric', 95), 'ʒ': C('SH', 'fric', 80), 'tʃ': C('SH', 'affr', 100), 'dʒ': C('SH', 'affr', 90),
  'ɹ': C('RR', 'liquid', 60),
  k: C('KK', 'stop', 75), g: C('KK', 'stop', 65), 'ŋ': C('KK', 'nasal', 65),
  h: C('HH', 'h', 55),
  j: C('JJ', 'glide', 50), w: C('WW', 'glide', 60),
};

/** diphthong -> [first target, second target] (the first takes ~60 % of the duration) */
export const DIPHTHONGS: Record<string, [string, string]> = {
  'aɪ': ['a', 'ɪ'], 'eɪ': ['e', 'ɪ'], 'oʊ': ['o', 'ʊ'], 'aʊ': ['a', 'ʊ'], 'ɔɪ': ['ɔ', 'ɪ'],
};

export const isVowel = (p: string) => PHONEMES[p]?.cls === 'vowel';

/** One phoneme of a word as the G2P returns it. */
export interface WordPhone {
  p: string;
  /** syllable index within the word */
  syl: number;
  /** vowel only: 1 primary stress, 0 unstressed */
  stress?: 0 | 1;
  /** vowel only: lengthened (Turkish ğ, doubled vowels) */
  long?: boolean;
}

/** Syllabify a phoneme string by the onset-maximising rule shared by Turkish and (roughly) English:
 *  V.CV, VC.CV, VCC.CV; returns the syllable index per phoneme and the syllable count. */
export function syllabify(ps: string[]): { syl: number[]; count: number } {
  const vowelsAt = ps.map((p, i) => (isVowel(p) ? i : -1)).filter((i) => i >= 0);
  const syl = new Array<number>(ps.length).fill(0);
  if (!vowelsAt.length) return { syl, count: 1 };
  let s = 0;
  let prevV = -1;
  for (let k = 0; k < vowelsAt.length; k++) {
    const v = vowelsAt[k]!;
    if (prevV < 0) {
      for (let i = 0; i <= v; i++) syl[i] = 0;
    } else {
      const between = v - prevV - 1; // consonants between the two vowels
      const onset = between === 0 ? 0 : 1; // one consonant goes to the next syllable
      const split = v - onset;
      for (let i = prevV + 1; i < split; i++) syl[i] = s;
      s++;
      for (let i = split; i <= v; i++) syl[i] = s;
    }
    prevV = v;
  }
  for (let i = prevV + 1; i < ps.length; i++) syl[i] = s;
  return { syl, count: s + 1 };
}
