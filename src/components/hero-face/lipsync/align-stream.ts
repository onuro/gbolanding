// Streaming text-to-voice alignment for the live lip-sync: which sound of the agent's words is being spoken, when.
//
// The call audio is narrowband (almost nothing above ~4 kHz), so the vowels are read from what survives: F1 / F2
// every 10 ms (LPC at 8 kHz, speaker-normalised to its own P10..P90 range) and the 0.4-2.2 kHz loudness. The
// transcript gives each word's syllables as it arrives (at about its spoken onset, but sentence pauses make it up to
// ~0.7 s early and it can be ~0.4 s late). A semi-Markov Viterbi over the utterance's units ([pause] consonant-gap
// vowel ...) is re-solved over the last ~2 s every 50 ms, so late words re-label the audio they belong to; a
// "pending" unit at the end absorbs speech whose words have not arrived yet. Segments older than ~1.5 s are
// committed.
// With a viseme model (viseme-net.ts: this voice's frames -> 12 mouth classes) the emissions are its posteriors and
// every consonant is its own unit (m / b / p timed on their own). Measured against a wav2vec2 forced alignment of the
// real calls (scratchpad streameval.ts), the formant emissions alone showed the right vowel only ~26 % of the time.
// Pure (no Web Audio): the page and the offline replay feed it the same samples and words.
import { createFormantTracker, createPitchTracker, formantWindow } from './acoustic';
import { createMelFrontend, frameSpan } from './features';
import { DIPHTHONGS, PHONEMES } from './phonemes';
import { tokenize, type Lang } from './timing';
import { trWord } from './g2p-tr';
import { enWord } from './g2p-en';
import { createVisemeNet, visClassOf, type VisModel, type VisModelQ } from './viseme-net';

export interface AlignSeg {
  kind: 'V' | 'C' | 'P' | 'X'; // vowel, consonant gap, pause, speech with no text yet
  /** vowel symbol (V) */
  v?: string;
  /** consonants of the gap (C) */
  cons?: string[];
  stress: 0 | 1;
  /** ms on the audio clock */
  start: number;
  end: number;
  /** the next syllable's vowel (for C: lip rounding anticipates it) */
  nextV?: string;
  /** diphthong: the target the vowel glides to (V) */
  v2?: string;
  /** word index in the utterance and vowel index in the word (diagnostics) */
  w?: number;
  k?: number;
}

/** This agent voice (Cartesia clone, real calls 2026-09-25): speaker range and vowel targets in (F1, F2) normalised
 *  to the P10..P90 range; EM-fitted offline (align2.ts, two calls per language) and used as the starting point of the online estimate. */
export const VOICE_PRIOR: Record<Lang, { n1: [number, number]; n2: [number, number]; lead: number; targets: Record<string, [number, number]> }> = {
  tr: {
    n1: [293, 844], n2: [1072, 2222], lead: 250,
    targets: { a: [0.89, 0.44], e: [0.56, 0.79], 'ɯ': [0.32, 0.52], i: [0.2, 0.86], o: [0.56, 0.09], 'ø': [0.48, 0.57], u: [0.21, 0.1], y: [0.19, 0.67] },
  },
  en: {
    n1: [321, 852], n2: [1038, 2177], lead: 368,
    targets: { a: [0.95, 0.4], e: [0.64, 0.9], i: [0.15, 0.96], o: [0.6, 0.13], u: [0.21, 0.17], 'æ': [0.88, 0.7], 'ɑ': [0.88, 0.25], 'ʌ': [0.71, 0.43], 'ɛ': [0.62, 0.79], 'ɪ': [0.31, 0.75], 'ɔ': [0.53, 0.02], 'ʊ': [0.3, 0.2], 'ə': [0.54, 0.54], 'ɝ': [0.42, 0.46], 'ø': [0.45, 0.6], y: [0.15, 0.75], 'ɯ': [0.25, 0.55] },
  },
};

const HOP = 10; // ms per frame
const SIG = 0.26; // vowel target spread (normalised units)
let DEBUG = false, lastDebug = '';
export function alignDebug(on: boolean) { DEBUG = on; return () => lastDebug; }
let DIP_V0 = 1.5, DIP_V = 2.5, DIP_C = 0.12;
let X_PENALTY = 0.7; // speech with no text yet: per-frame cost vs a real unit (higher: stretch the text instead)
export function setXPenalty(v: number) { X_PENALTY = v; }
// classifier-only stretches: 0 = per-frame argmax with 30 ms runs, 1 = Viterbi (switch cost, vowel-to-vowel extra cost,
// unvoiced-vowel penalty, minimum frames for silence / consonant / vowel). Transcript held back 0.8 s on unseen calls
// (streameval DELAY=800): right mouth class there 68 -> 76 % Turkish, 61 -> 72 % English
let X_MODE = 1, X_SW = 2, X_VV = 1, X_UV = 1, X_MIN = [3, 2, 4];
export function setXDecode(mode: number, sw = X_SW, vv = X_VV, uv = X_UV, min = X_MIN) { X_MODE = mode; X_SW = sw; X_VV = vv; X_UV = uv; X_MIN = min; }
export function setDip(v0: number, v: number, c: number) { DIP_V0 = v0; DIP_V = v; DIP_C = c; }
const SYL_MS = 170; // syllable spacing inside a word, ms
let PROG_SIGMA = 400; // progress prior spread, ms
// per text unit already reached at the live edge (the path that has consumed fewer units was cheaper, so the edge ran
// a unit behind and a syllable's shape landed on the next one: çalı-ş-a showed ı over ı-ş-a for ~0.7 s)
let PROG_BONUS = 1; // (1: right vowel +1 %, one-behind 3 -> 1 % on unseen tr9; streameval PB)
export function setProgBonus(v: number) { PROG_BONUS = v; }
export function setProgSigma(v: number) { PROG_SIGMA = v; }
let LOUD_BELOW_PEAK = 28; // vowels are louder than (running speech peak - this), dB (offline: P97 - 22 = peak - ~28)
export function setLoudBelowPeak(v: number) { LOUD_BELOW_PEAK = v; }
const SONORANT = new Set(['m', 'n', 'l', 'ɾ', 'j', 'w', 'ɹ', 'ŋ', 'v']);

type Unit = { kind: 'P' | 'C' | 'V' | 'X'; v?: string; v2?: string; cons?: string[]; stress: 0 | 1; dmin: number; dmax: number; mu: number; son: boolean; word: number; k: number; first?: boolean; cls?: number };
let VIS_BETA = 0.5, VIS_GAIN = 2; // (gain 2: English right vowel 71 -> 76 %, false m / b / p 16 -> 9 of 120; Turkish unchanged, streameval)
export function setVis(beta: number, gain: number) { VIS_BETA = beta; VIS_GAIN = gain; }

export function createStreamAligner(sampleRate: number, lang: Lang, vis?: VisModel | VisModelQ) {
  const net = vis ? createVisemeNet(vis) : null;
  const prior = VOICE_PRIOR[lang];
  const ft = createFormantTracker(sampleRate, 8000, 10);
  const pt = createPitchTracker(sampleRate);
  const fe = createMelFrontend(sampleRate);
  const need = Math.max(frameSpan(sampleRate), formantWindow(sampleRate, 8000)) + 16;
  const hopS = (sampleRate * HOP) / 1000;
  const g2p = lang === 'tr' ? trWord : enWord;

  // ---- frames (absolute frame index f -> arrays at f - base)
  let base = -1;
  let E: number[] = [], F1: number[] = [], F2: number[] = [], P0: number[] = [];
  let MF: Float32Array[] = [], LP: (Float32Array | null)[] = [];
  const ZERO = new Float32Array(25);
  let nextFrame = -1;
  let peak = -60, peakHold = -60;
  // speaker normalisation: running P10 / P90 from histograms seeded with the prior
  const h1 = new Float64Array(120), h2 = new Float64Array(140); // F1 150..1350 (10 Hz), F2 600..3400 (20 Hz)
  const seedHist = (h: Float64Array, lo: number, step: number, p10: number, p90: number, w: number) => {
    for (let i = 0; i < h.length; i++) { const f = lo + i * step; if (f >= p10 && f <= p90) h[i] += w / ((p90 - p10) / step); }
    const edge = (f: number) => Math.min(h.length - 1, Math.max(0, Math.round((f - lo) / step)));
    h[edge(p10 - 3 * step)]! += w * 0.125; h[edge(p90 + 3 * step)]! += w * 0.125;
  };
  seedHist(h1, 150, 10, prior.n1[0], prior.n1[1], 300); seedHist(h2, 600, 20, prior.n2[0], prior.n2[1], 300);
  let N1: [number, number] = [...prior.n1], N2: [number, number] = [...prior.n2];
  const pct = (h: Float64Array, lo: number, step: number, q: number) => {
    let tot = 0; for (const v of h) tot += v;
    let acc = 0; for (let i = 0; i < h.length; i++) { acc += h[i]!; if (acc >= q * tot) return lo + i * step; }
    return lo + (h.length - 1) * step;
  };

  // ---- text units of the current utterance
  let units: Unit[] = [];
  let uttId = '', uttWords = 0, wordArrive: number[] = [];
  let pendingCons: { p: string; wi: number; first: boolean }[] = []; // consonants after the last vowel so far
  let wordVowels: number[] = [];
  let pauseNext = true;
  let lead = prior.lead;

  // ---- committed timeline + the anchor of the live decode
  const committed: AlignSeg[] = [];
  let live: AlignSeg[] = [];
  let u0 = 0; // first unit of the decode window
  let f0 = 0; // first frame of the decode window (absolute)
  let uttF0 = 0; // absolute frame at which the utterance began

  const PEND: Unit = { kind: 'X', stress: 0, dmin: 0, dmax: 400, mu: 30, son: false, word: -1, k: 0 };
  const TAILP: Unit = { kind: 'P', stress: 0, dmin: 0, dmax: 2000, mu: 80, son: false, word: -1, k: 0 };

  function addWords(text: string, atMs: number) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    for (const w of words.slice(uttWords)) {
      const wi = wordArrive.length;
      wordArrive.push(atMs);
      let k = 0, firstPh = true;
      for (const tk of tokenize(w, lang)) {
        if ('punct' in tk) { pauseNext = true; continue; }
        for (const p of g2p(tk.word)) for (const q of DIPHTHONGS[p.p] ? [DIPHTHONGS[p.p]![0]] : [p.p]) {
          const glide = DIPHTHONGS[p.p]?.[1];
          const info = PHONEMES[q];
          if (!info) continue;
          const isFirst = firstPh; firstPh = false;
          if (info.cls !== 'vowel') { pendingCons.push({ p: q, wi, first: isFirst }); continue; }
          if (net) {
            // one unit per consonant; the previous word's final consonants come before a pause (punctuation), this
            // word's after it; the word's first sound carries the arrival anchor (an empty unit for a vowel onset)
            const coda = pendingCons.filter((c) => c.wi !== wi), onset = pendingCons.filter((c) => c.wi === wi);
            for (const c of coda) {
              const d = (PHONEMES[c.p]?.dur ?? 60) / HOP;
              units.push({ kind: 'C', cons: [c.p], stress: 0, dmin: 1, dmax: 25, mu: Math.max(2, d * 0.8), son: SONORANT.has(c.p), word: c.wi, k: wordVowels[c.wi] ?? 1, cls: visClassOf(c.p) });
            }
            if (pauseNext && units.length > 1) units.push({ kind: 'P', stress: 0, dmin: 0, dmax: 150, mu: 25, son: false, word: wi, k });
            pauseNext = false;
            pendingCons = onset;
            for (const c of pendingCons) {
              const d = (PHONEMES[c.p]?.dur ?? 60) / HOP;
              units.push({ kind: 'C', cons: [c.p], stress: 0, dmin: 1, dmax: 25, mu: Math.max(2, d * 0.8), son: SONORANT.has(c.p), word: c.wi, k: c.wi === wi ? k : wordVowels[c.wi] ?? 1, first: c.first, cls: visClassOf(c.p) });
            }
            if (isFirst) units.push({ kind: 'C', cons: [], stress: 0, dmin: 0, dmax: 6, mu: 2, son: true, word: wi, k, first: true, cls: -1 });
          } else {
            if (pauseNext && units.length > 1) units.push({ kind: 'P', stress: 0, dmin: 0, dmax: 150, mu: 25, son: false, word: wi, k });
            pauseNext = false;
            const cd = pendingCons.reduce((a, c) => a + (PHONEMES[c.p]?.dur ?? 60), 0) / HOP;
            units.push({ kind: 'C', cons: pendingCons.map((c) => c.p), stress: 0, dmin: pendingCons.length ? 2 : 0, dmax: pendingCons.length ? 30 : 6, mu: Math.max(2, cd * 0.8), son: pendingCons.every((c) => SONORANT.has(c.p)), word: wi, k });
          }
          units.push({ kind: 'V', v: q, v2: glide, stress: p.stress ?? 0, dmin: 5, dmax: glide ? 36 : 28, mu: glide ? 14 : 9, son: true, word: wi, k: k++, cls: visClassOf(q) });
          wordVowels[wi] = k;
          pendingCons = [];
        }
      }
    }
    uttWords = words.length;
  }

  // ---- emissions (per frame, absolute index)
  const loudTh = () => peak - LOUD_BELOW_PEAK;
  const n1 = (f: number) => (f - N1[0]) / Math.max(50, N1[1] - N1[0]);
  const n2 = (f: number) => (f - N2[0]) / Math.max(100, N2[1] - N2[0]);
  // syllable rhythm: how far a frame sits below the loudness peaks on BOTH sides (+-80 ms), dB. Consonants live in
  // these dips, vowels on the peaks; without it, vowel harmony (neighbouring syllables sounding alike) lets the live
  // edge lose count of the syllables. Unknown (0) where the right side is not heard yet.
  function dipAt(i: number) {
    const hi = E.length - 1;
    if (i + 4 > hi) return 0;
    let l = -1e9, r = -1e9;
    for (let k = Math.max(0, i - 8); k <= i; k++) l = Math.max(l, E[k]!);
    for (let k = i; k <= Math.min(hi, i + 8); k++) r = Math.max(r, E[k]!);
    return Math.max(0, Math.min(l, r) - E[i]!);
  }
  function vEm(v: string, i: number) {
    const e = E[i]!, th = loudTh();
    if (!(e > th) || !Number.isFinite(F1[i]!) || !Number.isFinite(F2[i]!)) return -2.5;
    const t = prior.targets[v] ?? [0.5, 0.5];
    const a = n1(F1[i]!) - t[0], b = n2(F2[i]!) - t[1];
    const dz = Math.max(0, dipAt(i) - DIP_V0) / DIP_V;
    return -0.5 * (a * a + b * b) / (SIG * SIG) + 0.04 * (e - th) - 0.5 * dz * dz;
  }
  function cEm(son: boolean, i: number) { const d = E[i]! - (loudTh() + (son ? 6 : -2)); return (d > 0 ? -0.5 * (d / 5) ** 2 : 0) + DIP_C * Math.min(8, dipAt(i)); }
  function pEm(i: number) { const e = E[i]!, th = loudTh(); return e < th - 2 ? 0 : e < th + 4 ? -1 : -3; }
  function xEm(i: number) {
    // speech that is not in the text yet: the best of any vowel or a consonant, a little worse than a real unit
    let best = cEm(false, i);
    if (E[i]! > loudTh() && Number.isFinite(F1[i]!) && Number.isFinite(F2[i]!)) for (const v of Object.keys(prior.targets)) best = Math.max(best, vEm(v, i));
    return best - X_PENALTY;
  }
  const emOld = (u: Unit, i: number) => (u.kind === 'V' ? vEm(u.v!, i) : u.kind === 'C' ? cEm(u.son, i) : u.kind === 'P' ? pEm(i) : xEm(i));
  function emVis(u: Unit, lp: Float32Array) {
    if (u.kind === 'P') return net!.score(lp, 0, VIS_BETA);
    if (u.kind === 'X') { let b = -1e9; for (let c = 1; c < 12; c++) b = Math.max(b, net!.score(lp, c, VIS_BETA)); return b - X_PENALTY; }
    // an empty onset unit (vowel-initial word): a glottal onset, closure-like or already the vowel
    if (u.cls === -1 || u.cls === undefined) return Math.max(net!.score(lp, 5, VIS_BETA), net!.score(lp, 0, VIS_BETA)) - 0.3;
    return net!.score(lp, u.cls, VIS_BETA);
  }
  const em = (u: Unit, i: number) => {
    const lp = net ? LP[i] : null;
    return lp ? VIS_GAIN * emVis(u, lp) : net ? 0.5 * emOld(u, i) : emOld(u, i);
  };

  // ---- decode the window [f0, fEnd) over units[u0..] + pending + tail pause
  let poolV = new Float64Array(0), poolB = new Int16Array(0);
  function decode(fEnd: number) {
    const W = fEnd - f0;
    if (W <= 0) return;
    const U = [...units.slice(u0), PEND, TAILP];
    const lastU = units[units.length - 1];
    const lastExp = lastU && lastU.word >= 0 ? wordArrive[lastU.word]! + lead + lastU.k * SYL_MS : -1e9;
    const N = U.length;
    const NEG = -1e30;
    // the lattice lives in pooled buffers (a fresh allocation per decode every 50 ms fed the garbage collector)
    const need = (N + 1) * (W + 1);
    if (poolV.length < need) { poolV = new Float64Array(Math.ceil(need * 1.5)); poolB = new Int16Array(poolV.length); }
    poolV.fill(NEG, 0, need);
    const V: Float64Array[] = [], B: Int16Array[] = [];
    for (let i = 0; i <= N; i++) { V.push(poolV.subarray(i * (W + 1), (i + 1) * (W + 1))); B.push(poolB.subarray(i * (W + 1), (i + 1) * (W + 1))); }
    V[0]![0] = 0;
    const pre = new Float64Array(W + 1);
    // best "ongoing" end: unit i started d frames ago and is still running at the window end
    let endBest = NEG, endI = 0, endD = 0;
    const dbgBest: number[] = [];
    for (let i = 1; i <= N; i++) {
      const u = U[i - 1]!;
      for (let t = 0; t < W; t++) pre[t + 1] = pre[t]! + em(u, f0 + t - base);
      const anchor = u.kind === 'C' && (net ? u.first === true : u.k === 0) && u.word >= 0 ? wordArrive[u.word]! + lead : null;
      const Vi = V[i]!, Vp = V[i - 1]!, Bi = B[i]!;
      // duration log-normal cost per length (a table: the log was the decode's hottest line)
      const soft = u.kind === 'P' || u.kind === 'X' ? 0.2 : 1, dTop = Math.min(u.dmax, W);
      const dc = new Float64Array(dTop + 1);
      for (let d = 0; d <= dTop; d++) { if (d === 0) { dc[0] = u.kind === 'P' || u.kind === 'X' ? -1 : -0.5; continue; } const z = Math.log(d / u.mu) / 0.5; dc[d] = -0.5 * z * z * soft; }
      const durCost = (d: number, done: boolean) => (!done && d > 0 && d < u.mu ? 0 : dc[d]!); // unfinished: never penalise being short
      for (let t = 0; t <= W; t++) {
        let best = NEG, bd = 0;
        const dmax = Math.min(u.dmax, t);
        const pt = pre[t]!;
        for (let d = u.dmin; d <= dmax; d++) {
          const pv = Vp[t - d]!;
          if (pv <= NEG) continue;
          let s = pv + pt - pre[t - d]! + dc[d]!;
          if (anchor !== null) { const e = ((f0 + t - d) * HOP - anchor) / 600; s += -0.5 * e * e; }
          if (s > best) { best = s; bd = d; }
        }
        Vi[t] = best; Bi[t] = bd;
      }
      // ongoing at the end; the progress prior keeps the live edge from lagging: the unit being spoken now should be
      // near where its word's arrival says (a lagging path would otherwise be cheap: fewer units to complete)
      const expNow = u.word >= 0 ? wordArrive[u.word]! + lead + u.k * SYL_MS : u.kind === 'X' || i >= N - 1 ? lastExp + SYL_MS : null;
      const prog = expNow === null ? 0 : -0.5 * (((f0 + W) * HOP - expNow) / PROG_SIGMA) ** 2;
      for (let d = Math.max(1, u.dmin); d <= Math.min(u.dmax, W); d++) {
        const pv = Vp[W - d]!;
        if (pv <= NEG) continue;
        let s = pv + pre[W]! - pre[W - d]! + durCost(d, false) + prog + PROG_BONUS * Math.min(i, N - 2);
        if (anchor !== null) { const e = ((f0 + W - d) * HOP - anchor) / 600; s += -0.5 * e * e; }
        if (s > endBest) { endBest = s; endI = i; endD = d; }
        if (DEBUG && s > (dbgBest[i] ?? -1e30)) dbgBest[i] = s;
      }
    }
    // backtrack from the ongoing unit
    const segs: AlignSeg[] = [];
    const uIdx: number[] = []; // window unit index of each segment
    const push = (i: number, s: number, e: number) => {
      const u = U[i]!;
      if (e <= s) return;
      segs.push({ kind: u.kind, v: u.v, v2: u.v2, cons: u.cons, stress: u.stress, start: (f0 + s) * HOP, end: (f0 + e) * HOP, w: u.word, k: u.k });
      uIdx.push(i);
    };
    push(endI - 1, W - endD, W);
    let t = W - endD;
    for (let i = endI - 1; i >= 1; i--) { const d = B[i]![t]!; push(i - 1, t - d, t); t -= d; }
    segs.reverse(); uIdx.reverse();
    live = segs;
    if (DEBUG) lastDebug = U.map((u, i) => `${u.kind}${u.v ?? (u.cons ?? []).join('')}:${dbgBest[i + 1] !== undefined ? dbgBest[i + 1]!.toFixed(1) : '-'}`).join(' ');
    // commit what ended long enough ago (bounds the window); never the pending / tail units
    const commitBefore = (fEnd - 150) * HOP;
    let used = 0, newF0 = f0, newU0 = u0;
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k]!;
      if (s.end > commitBefore || uIdx[k]! >= U.length - 2) break;
      committed.push(s); used = k + 1; newF0 = s.end / HOP; newU0 = u0 + uIdx[k]! + 1;
    }
    if (used) { live = segs.slice(used); f0 = Math.round(newF0); u0 = newU0; }
    if (committed.length > 600) committed.splice(0, committed.length - 600);
  }

  // speech the text has not reached (X: late or missing words) is split by the classifier's own frame decisions into
  // vowel / consonant / pause runs, so the mouth still makes syllables there instead of holding one shape
  const X_VOWEL: Record<Lang, string[]> = { tr: ['', '', '', '', '', '', 'a', 'e', 'i', 'ɯ', 'o', 'u'], en: ['', '', '', '', '', '', 'ɑ', 'ɛ', 'ɪ', 'ə', 'o', 'u'] };
  const X_CONS = ['', 'm', 'f', 's', 'ʃ', 't'];
  // Viterbi over the 12 classes with minimum durations and switch costs (per-frame argmax flickered and lost 1/3 of
  // the vowels in late-text stretches): one class per frame of [a, b), -1 where no posterior exists yet
  function viterbiX(a: number, b: number): Int8Array {
    const n = b - a, out = new Int8Array(Math.max(0, n)).fill(-1);
    let e = n; while (e > 0 && !(a + e - 1 >= 0 && a + e - 1 < LP.length && LP[a + e - 1])) e--;
    let s = 0; while (s < e && !(a + s >= 0 && LP[a + s])) s++;
    if (e - s <= 0) return out;
    const quiet = (i: number) => (E[i] ?? -120) < loudTh() - 4;
    const voicedAt = (i: number) => Number.isFinite(P0[i] ?? NaN);
    const voicedNear = (i: number) => { for (let j = i - 10; j <= i + 10; j++) if (j >= a && j < b && voicedAt(j)) return true; return false; };
    // states: (class, dwell 0..m-1); the last dwell state loops
    const MIN = X_MIN, S: number[] = [], first: number[] = [], last: number[] = [];
    for (let c = 0; c < 12; c++) { first.push(S.length); const m = c === 0 ? MIN[0]! : c < 6 ? MIN[1]! : MIN[2]!; for (let k = 0; k < m; k++) S.push(c); last.push(S.length - 1); }
    const NS = S.length, L = e - s, NEG = -1e30;
    const V = new Float64Array(NS), V2 = new Float64Array(NS), BP = new Int16Array(L * NS);
    const emit = new Float64Array(12);
    const em = (i: number) => {
      // (a frame the classifier never saw inside [s, e) - dropped frames on the live page leave holes - votes for no
      // class: the path carries on through it; reading it crashed the page's frame loop and froze the face mid-call)
      const lp = LP[i], q = quiet(i), vo = voicedAt(i), vn = voicedNear(i);
      for (let c = 0; c < 12; c++) {
        let x = lp ? lp[c] ?? 0 : 0;
        if (c > 0 && q) x -= 6;
        if (c >= 6 && !vo) x -= X_UV;
        else if (c > 0 && c < 6 && !vn) x -= 6;
        emit[c] = x;
      }
    };
    em(a + s);
    for (let k = 0; k < NS; k++) V[k] = k === first[S[k]!] ? emit[S[k]!]! : NEG;
    for (let t = 1; t < L; t++) {
      em(a + s + t);
      // best predecessor per target class entry: from any class's last dwell state
      for (let k = 0; k < NS; k++) {
        const c = S[k]!;
        let best = NEG, bp = -1;
        if (k !== first[c]) { best = V[k - 1]!; bp = k - 1; if (k === last[c] && V[k]! > best) { best = V[k]!; bp = k; } }
        else {
          if (k === last[c]) { best = V[k]!; bp = k; }
          for (let c2 = 0; c2 < 12; c2++) {
            if (c2 === c) continue;
            const j = last[c2]!;
            const vv = c >= 6 && c2 >= 6 ? X_VV : 0;
            const x = V[j]! - X_SW - vv;
            if (x > best) { best = x; bp = j; }
          }
        }
        V2[k] = best + emit[c]!; BP[t * NS + k] = bp;
      }
      V.set(V2);
    }
    let bk = 0; for (let k = 1; k < NS; k++) if (V[k]! > V[bk]!) bk = k;
    for (let t = L - 1; t >= 0; t--) { out[s + t] = S[bk]!; if (t > 0) bk = BP[t * NS + bk]!; }
    return out;
  }

  function expandX(list: AlignSeg[]): AlignSeg[] {
    if (!net) return list;
    const out: AlignSeg[] = [];
    for (const sg of list) {
      if (sg.kind !== 'X') { out.push(sg); continue; }
      const a = Math.round(sg.start / HOP) - base, b = Math.round(sg.end / HOP) - base;
      if (X_MODE === 1) {
        const cl = viterbiX(a, b);
        let i = 0;
        while (i < cl.length) {
          let j = i; while (j < cl.length && cl[j] === cl[i]) j++;
          const cur = cl[i]!, start = (a + i + base) * HOP, end = (a + j + base) * HOP;
          if (cur < 0) out.push({ ...sg, start, end });
          else if (cur === 0) out.push({ kind: 'P', stress: 0, start, end });
          else if (cur < 6) out.push({ kind: 'C', cons: [X_CONS[cur]!], stress: 0, start, end });
          else out.push({ kind: 'V', v: X_VOWEL[lang][cur]!, stress: 0, start, end });
          i = j;
        }
        continue;
      }
      let cur = -2, runS = a;
      const flush = (e: number) => {
        if (cur === -2 || e <= runS) return;
        const start = (runS + base) * HOP, end = (e + base) * HOP;
        if (cur < 0) out.push({ ...sg, start, end });                          // no posterior yet: stays X
        else if (cur === 0) out.push({ kind: 'P', stress: 0, start, end });
        else if (cur < 6) out.push({ kind: 'C', cons: [X_CONS[cur]!], stress: 0, start, end });
        else out.push({ kind: 'V', v: X_VOWEL[lang][cur]!, stress: 0, start, end });
      };
      // only audible voice makes sounds: breath / noise in a pause stays a pause (the voice's in-breath after a
      // sentence was heard as 'u' + 's' and made a pout in the silence). Vowels need voicing (a pitch), and a hiss
      // with no voiced run next to it is breath
      const quiet = (i: number) => (E[i] ?? -120) < loudTh() - 4;
      const voicedAt = (i: number) => Number.isFinite(P0[i] ?? NaN);
      const voicedNear = (i: number) => { for (let j = i - 10; j <= i + 10; j++) if (j >= a && j < b && voicedAt(j)) return true; return false; };
      for (let i = a; i < b; i++) {
        const lp = i >= 0 && i < LP.length ? LP[i] : null;
        let c = -1;
        if (lp) {
          c = 0;
          if (!quiet(i)) for (let k = 1; k < 12; k++) if (lp[k]! > lp[c]!) c = k;
          if (c >= 6 && !voicedAt(i)) c = 0;
          else if (c > 0 && c < 6 && !voicedNear(i)) c = 0;
        }
        // short runs (< 30 ms) join the current one
        if (c !== cur) {
          let len = 0; for (let j = i; j < b && j < i + 3; j++) { const q = j < LP.length ? LP[j] : null; let cj = -1; if (q) { cj = 0; if (!quiet(j)) for (let k = 1; k < 12; k++) if (q[k]! > q[cj]!) cj = k; if (cj >= 6 && !voicedAt(j)) cj = 0; else if (cj > 0 && cj < 6 && !voicedNear(j)) cj = 0; } if (cj === c) len++; else break; }
          if (len >= 3 || cur === -2) { flush(i); cur = c; runS = i; }
        }
      }
      flush(b);
    }
    return out;
  }

  function annotateNext(list: AlignSeg[]) {
    for (let i = 0; i < list.length; i++) if (list[i]!.kind === 'C') for (let j = i + 1; j < list.length; j++) if (list[j]!.kind === 'V') { list[i]!.nextV = list[j]!.v; break; }
    return list;
  }

  return {
    /** Agent transcript chunk (the whole utterance text so far) at audio-clock time atMs. */
    text(id: string, text: string, atMs: number) {
      if (id !== uttId) {
        // a new utterance: whatever is live becomes final, the unit list restarts
        committed.push(...live); live = [];
        uttId = id; uttWords = 0; wordArrive = []; wordVowels = []; pendingCons = []; pauseNext = true;
        units = [{ kind: 'P', stress: 0, dmin: 0, dmax: 300, mu: 30, son: false, word: -1, k: 0 }];
        u0 = 0;
        f0 = Math.max(nextFrame - 50, base >= 0 ? base : 0, Math.floor((atMs - 500) / HOP));
        uttF0 = f0;
      }
      addWords(text, atMs);
    },
    /** New audio: `buf` holds the most recent samples, its last sample at absolute index `endSample`. */
    audio(buf: Float32Array, endSample: number) {
      const lastF = Math.floor((endSample - 900) / hopS); // the tracker window is centred ~10 ms behind the frame
      if (nextFrame < 0) { nextFrame = lastF; base = lastF; f0 = lastF; }
      const oldest = Math.ceil((endSample - buf.length + need) / hopS);
      if (nextFrame < oldest) {
        // missed samples (a stalled frame): pad with silence frames
        for (; nextFrame < oldest; nextFrame++) { E.push(-120); F1.push(NaN); F2.push(NaN); P0.push(NaN); MF.push(ZERO); LP.push(null); }
      }
      let added = 0;
      for (; nextFrame <= lastF; nextFrame++, added++) {
        const endIdx = buf.length - (endSample - Math.round(nextFrame * hopS)) + 768;
        const f = ft(buf.subarray(Math.max(0, endIdx - 1600), Math.min(buf.length, endIdx)));
        const m = fe(buf, Math.min(buf.length, endIdx - 168));
        let e = 0; for (let k = 4; k <= 16; k++) e += Math.exp(m.mel[k]!);
        const db = 10 * Math.log10(e + 1e-12);
        E.push(db); F1.push(f.f1); F2.push(f.f2);
        if (net) { const v = new Float32Array(25); v.set(m.mel); v[24] = m.logE; MF.push(v); LP.push(null); }
        P0.push(db > loudTh() ? pt(buf, Math.min(buf.length, endIdx - 384)).f0 : NaN);
        if (db > peak) { peak = db; peakHold = db; } else if (db > peak - 20) peak = Math.max(peakHold - 8, peak - HOP * 0.0015);
        if (db > loudTh() && Number.isFinite(f.f1) && Number.isFinite(f.f2)) {
          const i1 = Math.round((f.f1 - 150) / 10), i2 = Math.round((f.f2 - 600) / 20);
          if (i1 >= 0 && i1 < h1.length) h1[i1]! += 1;
          if (i2 >= 0 && i2 < h2.length) h2[i2]! += 1;
        }
      }
      // keep ~12 s of frames
      const keep = 1200;
      if (net) {
        // posteriors of the frames whose whole context (up to +120 ms) has arrived
        const hi = MF.length - 1;
        const at = (j: number) => MF[Math.max(0, Math.min(hi, j))]!;
        for (let i = Math.max(0, hi - net.ctxMax - added - 1); i <= hi - net.ctxMax; i++) {
          if (LP[i]) continue;
          const o = new Float32Array(12); net.forward(at, i, o); LP[i] = o;
        }
      }
      if (E.length > keep + 400) { const cut = E.length - keep; E = E.slice(cut); F1 = F1.slice(cut); F2 = F2.slice(cut); P0 = P0.slice(cut); if (net) { MF = MF.slice(cut); LP = LP.slice(cut); } base += cut; if (f0 < base) f0 = base; }
      if (added && nextFrame % 5 === 0) {
        N1 = [pct(h1, 150, 10, 0.1), pct(h1, 150, 10, 0.9)]; N2 = [pct(h2, 600, 20, 0.1), pct(h2, 600, 20, 0.9)];
        if (units.length) decode(nextFrame);
      }
    },
    /** Timeline up to the decode frontier (ms, audio clock), plus the next known syllables with typical durations. */
    timeline(): AlignSeg[] {
      const list = expandX([...committed.slice(-80), ...live]);
      return annotateNext(list);
    },
    /** Upcoming syllables not reached yet (anticipation), laid out from the frontier with typical durations. */
    upcoming(max = 3): { v: string; cons: string[] }[] {
      const out: { v: string; cons: string[] }[] = [];
      const lastV = [...live].reverse().find((s) => s.kind === 'V');
      let started = !lastV;
      for (let i = u0; i < units.length && out.length < max; i++) {
        const u = units[i]!;
        if (!started) { if (u.kind === 'V' && u.v === lastV!.v) started = true; continue; }
        if (u.kind === 'V') out.push({ v: u.v!, cons: units[i - 1]?.cons ?? [] });
      }
      return out;
    },
    frontierMs() { return nextFrame * HOP; },
    /** The voice at a time on the audio clock: syllable loudness 0..1 and speaker-normalised F1 / F2. */
    acousticAt(ms: number) {
      const i = Math.round(ms / HOP) - base;
      if (i < 0 || i >= E.length) return { loud: 0, f1n: NaN, f2n: NaN, voiced: false, db: -120, f0: NaN, pc: undefined as number | undefined, pp: undefined as number | undefined, pf: undefined as number | undefined, ps: undefined as number | undefined };
      // loudness over the last 30 ms (the syllable envelope, not single frames)
      let e = -120; for (let k = Math.max(0, i - 2); k <= i; k++) e = Math.max(e, E[k]!);
      const th = loudTh();
      const voiced = e > th && Number.isFinite(F1[i]!) && Number.isFinite(F2[i]!);
      // the classifier's consonant probability here (m b p f v s z ş ç and the lingual consonants), when known
      const lp = net ? LP[i] : null;
      let pc: number | undefined, pp: number | undefined, pf: number | undefined, ps: number | undefined;
      if (lp) { pc = 0; for (let k = 1; k <= 5; k++) pc += Math.exp(lp[k]!); pp = Math.exp(lp[1]!); pf = Math.exp(lp[2]!); ps = Math.exp(lp[0]!); }
      return { loud: Math.max(0, Math.min(1, (e - th) / LOUD_BELOW_PEAK)), f1n: n1(F1[i]!), f2n: n2(F2[i]!), voiced, db: e, f0: P0[i]!, pc, pp, pf, ps };
    },
    targets() { return prior.targets; },
    state() { return { units: units.length, u0, f0, committed: committed.length, live: live.length, N1, N2, peak, lead, uttF0 }; },
  };
}
