// Text -> timed phoneme segments: tokenise, G2P (Turkish / English), durations with stress, phrase-final
// lengthening and a little seeded jitter, pauses at punctuation, and accent times for the tiny head nods.
// The real voice path can skip this file and hand timed phonemes / visemes straight to buildTrack().
import { enWord } from './g2p-en';
import { trWord } from './g2p-tr';
import { DIPHTHONGS, PHONEMES, type Viseme, type WordPhone } from './phonemes';

export type Lang = 'tr' | 'en';

export interface Segment {
  /** phoneme symbol ('' for a pause) */
  ph: string;
  viseme: Viseme;
  /** ms from the utterance start */
  start: number;
  end: number;
  vowel: boolean;
  stress: 0 | 1;
}

export interface Timed {
  segments: Segment[];
  durationMs: number;
  /** accented syllables: vowel onset (ms) and strength 0..1 (head nods) */
  accents: { t: number; k: number }[];
}

export interface TimingOptions {
  lang: Lang;
  /** speaking rate (1 = base durations; the default 0.92 is a calm assistant, ~5 syllables / s) */
  rate?: number;
  seed?: number;
  /** rest before / after the speech, ms (default 0: the performer owns the silences) */
  leadMs?: number;
  tailMs?: number;
}

const PAUSE: Record<string, number> = { ',': 230, ';': 300, ':': 300, '-': 200, '.': 480, '!': 480, '?': 480, '…': 480 };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Token = { word: string } | { punct: string };

const TR_ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** An integer as the agent says it (0 .. 999 999 999), for the mouth: spoken numbers need syllables too. */
export function numberWords(n: number, lang: Lang): string {
  if (!Number.isFinite(n) || n < 0 || n > 999_999_999) return '';
  if (n === 0) return lang === 'tr' ? 'sıfır' : 'zero';
  const out: string[] = [];
  const under1000 = (x: number) => {
    const h = Math.floor(x / 100), r = x % 100;
    if (lang === 'tr') {
      if (h) out.push(h > 1 ? `${TR_ONES[h]} yüz` : 'yüz');
      if (r >= 10) out.push(TR_TENS[Math.floor(r / 10)]!);
      if (r % 10) out.push(TR_ONES[r % 10]!);
    } else {
      if (h) out.push(`${EN_ONES[h]} hundred`);
      if (r >= 20) { out.push(EN_TENS[Math.floor(r / 10)]!); if (r % 10) out.push(EN_ONES[r % 10]!); }
      else if (r) out.push(EN_ONES[r]!);
    }
  };
  const m = Math.floor(n / 1e6), k = Math.floor((n % 1e6) / 1000), u = n % 1000;
  if (m) { under1000(m); out.push(lang === 'tr' ? 'milyon' : 'million'); }
  if (k) { if (!(lang === 'tr' && k === 1)) under1000(k); out.push(lang === 'tr' ? 'bin' : 'thousand'); }
  if (u) under1000(u);
  return out.filter(Boolean).join(' ');
}

export function tokenize(text: string, lang?: Lang): Token[] {
  const out: Token[] = [];
  const re = /([A-Za-zÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜüÂâÎîÛû]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜüÂâÎîÛû]+)*)|(%?\d+(?:[.,]\d+)?%?)|([,.;:!?…]|\s-\s)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) out.push({ word: m[1] });
    else if (m[2]) {
      // numbers are spoken: "%30" / "30%" -> yüzde otuz / thirty percent, "1,5" -> bir buçuk-ish (both parts)
      if (!lang) continue;
      const pct = m[2].includes('%');
      const parts = m[2].replace(/%/g, '').split(/[.,]/).map(Number);
      const words: string[] = [];
      if (pct && lang === 'tr') words.push('yüzde');
      for (const p of parts) words.push(numberWords(p, lang));
      if (pct && lang === 'en') words.push('percent');
      for (const w of words.join(' ').split(/\s+/).filter(Boolean)) out.push({ word: w });
    } else if (m[3]) out.push({ punct: m[3].trim() });
  }
  return out;
}

export function timeText(text: string, opts: TimingOptions): Timed {
  const rate = opts.rate ?? 0.92;
  const rnd = mulberry32(opts.seed ?? 7);
  const g2p = opts.lang === 'tr' ? trWord : enWord;
  const stressK = opts.lang === 'tr' ? 1.18 : 1.3;
  const unstressedK = opts.lang === 'tr' ? 0.96 : 0.82;

  // group words into phrases (split at punctuation)
  const toks = tokenize(text, opts.lang);
  const phrases: { words: WordPhone[][]; pause: number }[] = [];
  let cur: WordPhone[][] = [];
  for (const tk of toks) {
    if ('word' in tk) {
      const w = g2p(tk.word);
      if (w.length) cur.push(w);
    } else if (cur.length) {
      phrases.push({ words: cur, pause: PAUSE[tk.punct] ?? 250 });
      cur = [];
    }
  }
  if (cur.length) phrases.push({ words: cur, pause: 0 });

  const segs: Segment[] = [];
  const accents: { t: number; k: number }[] = [];
  let t = opts.leadMs ?? 0;
  if (t > 0) segs.push({ ph: '', viseme: 'rest', start: 0, end: t, vowel: false, stress: 0 });
  phrases.forEach((ph, pi) => {
    // accent words: the first word with >= 2 syllables and the longest word
    const sylCount = (w: WordPhone[]) => (w.length ? w[w.length - 1]!.syl + 1 : 0);
    const firstLong = ph.words.findIndex((w) => sylCount(w) >= 2);
    let longest = 0;
    ph.words.forEach((w, i) => { if (sylCount(w) > sylCount(ph.words[longest]!)) longest = i; });
    const accentWords = new Map<number, number>();
    accentWords.set(firstLong >= 0 ? firstLong : 0, 1);
    if (!accentWords.has(longest)) accentWords.set(longest, 0.6);

    ph.words.forEach((w, wi) => {
      const lastSyl = w.length ? w[w.length - 1]!.syl : 0;
      const phraseFinal = wi === ph.words.length - 1;
      w.forEach((p, k) => {
        const info = PHONEMES[p.p];
        if (!info) return;
        let d = info.dur / rate;
        const vowel = info.cls === 'vowel';
        if (vowel) {
          d *= p.stress ? stressK : unstressedK;
          if (p.long) d *= 1.6;
        } else if (k === 0) d *= 1.1;
        if (phraseFinal && p.syl === lastSyl) d *= vowel ? 1.45 : 1.25;
        d *= 0.93 + 0.14 * rnd();
        if (vowel && p.stress && accentWords.has(wi)) { accents.push({ t, k: accentWords.get(wi)! }); accentWords.delete(wi); }
        const di = DIPHTHONGS[p.p];
        if (di) {
          const d1 = d * 0.6;
          segs.push({ ph: di[0], viseme: PHONEMES[di[0]]!.viseme, start: t, end: t + d1, vowel: true, stress: p.stress ?? 0 });
          segs.push({ ph: di[1], viseme: PHONEMES[di[1]]!.viseme, start: t + d1, end: t + d, vowel: true, stress: 0 });
        } else {
          segs.push({ ph: p.p, viseme: info.viseme, start: t, end: t + d, vowel, stress: p.stress ?? 0 });
        }
        t += d;
      });
    });
    if (pi < phrases.length - 1 && ph.pause > 0) {
      const d = ph.pause * (0.9 + 0.2 * rnd());
      segs.push({ ph: '', viseme: 'rest', start: t, end: t + d, vowel: false, stress: 0 });
      t += d;
    }
  });
  const tail = opts.tailMs ?? 0;
  if (tail > 0) { segs.push({ ph: '', viseme: 'rest', start: t, end: t + tail, vowel: false, stress: 0 }); t += tail; }
  return { segments: segs, durationMs: t, accents };
}
