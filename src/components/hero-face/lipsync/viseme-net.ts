// Speaker-specific viseme classifier for the agent's voice (trained 2026-09-25 on the real calls' audio, labels from a
// wav2vec2 CTC forced alignment of their transcripts): 10 ms log-mel frames (features.ts) -> posteriors over 12 mouth
// classes. A small MLP over frames t-200..t+120 ms: ~50k multiply-adds per frame.
import { PHONEMES } from './phonemes';

export interface VisModel {
  classes: string[];
  ctx: number[];
  dim: number;
  mu: number[];
  sd: number[];
  prior: number[];
  layers: { w: number[][]; b: number[] }[];
}

/** The shipped form: int8 weights (base64, row-major nOut x nIn) with per-row scales. */
export interface VisModelQ {
  classes: string[];
  ctx: number[];
  dim: number;
  mu: number[];
  sd: number[];
  prior: number[];
  layers: { nIn: number; nOut: number; q: string; s: number[]; b: number[] }[];
}

export const VIS_CLASSES = ['sil', 'PP', 'FF', 'SS', 'SH', 'CC', 'AA', 'EE', 'II', 'YI', 'OO', 'UU'] as const;
export type VisClass = (typeof VIS_CLASSES)[number];

const CLASS_OF: Record<string, number> = {};
for (const p of ['m', 'b', 'p']) CLASS_OF[p] = 1;
for (const p of ['f', 'v']) CLASS_OF[p] = 2;
for (const p of ['s', 'z']) CLASS_OF[p] = 3;
for (const p of ['ʃ', 'ʒ', 'tʃ', 'dʒ']) CLASS_OF[p] = 4;
for (const p of ['t', 'd', 'n', 'l', 'ɾ', 'k', 'g', 'ŋ', 'h', 'j', 'θ', 'ð', 'ɹ']) CLASS_OF[p] = 5;
for (const p of ['a', 'ɑ', 'æ', 'ʌ', 'aɪ', 'aʊ']) CLASS_OF[p] = 6;
for (const p of ['e', 'ɛ', 'eɪ']) CLASS_OF[p] = 7;
for (const p of ['i', 'ɪ']) CLASS_OF[p] = 8;
for (const p of ['ɯ', 'ə', 'ɝ']) CLASS_OF[p] = 9;
for (const p of ['o', 'ɔ', 'ø', 'oʊ', 'ɔɪ']) CLASS_OF[p] = 10;
for (const p of ['u', 'ʊ', 'y', 'w']) CLASS_OF[p] = 11;
/** Mouth class of a phoneme (-1 unknown). */
export const visClassOf = (p: string) => CLASS_OF[p] ?? (PHONEMES[p]?.cls === 'vowel' ? 9 : PHONEMES[p] ? 5 : -1);

// how acceptable class k is as a realisation of class c (confusions the voice / the classifier really makes: ı ~ i ~ e,
// o ~ u, m ~ n, s ~ ş ~ f); 1 on the diagonal
const SIM: number[][] = (() => {
  const n = VIS_CLASSES.length, S: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j): number => (i === j ? 1 : 0)));
  const set = (a: VisClass, b: VisClass, v: number) => { const i = VIS_CLASSES.indexOf(a), j = VIS_CLASSES.indexOf(b); S[i]![j] = Math.max(S[i]![j]!, v); S[j]![i] = Math.max(S[j]![i]!, v); };
  const V: VisClass[] = ['AA', 'EE', 'II', 'YI', 'OO', 'UU'], C: VisClass[] = ['PP', 'FF', 'SS', 'SH', 'CC'];
  for (const a of V) for (const b of V) if (a !== b) set(a, b, 0.08);
  for (const a of C) for (const b of C) if (a !== b) set(a, b, 0.08);
  set('AA', 'EE', 0.3); set('AA', 'OO', 0.25); set('EE', 'II', 0.3); set('II', 'YI', 0.35); set('EE', 'YI', 0.2); set('YI', 'UU', 0.25);
  set('OO', 'UU', 0.35); set('PP', 'CC', 0.3); set('FF', 'SS', 0.3); set('SS', 'SH', 0.3); set('FF', 'CC', 0.2); set('SS', 'CC', 0.2); set('SH', 'CC', 0.2);
  // consonants next to vowels (coarticulated edges) and closures in silence
  for (const a of C) for (const b of V) set(a, b, a === 'CC' ? 0.12 : 0.04);
  set('sil', 'PP', 0.2); set('sil', 'CC', 0.12); set('sil', 'FF', 0.08); set('sil', 'SS', 0.06);
  return S;
})();

function unpack(l: VisModelQ['layers'][number]) {
  const bin = atob(l.q), w = new Float32Array(l.nIn * l.nOut);
  for (let i = 0; i < w.length; i++) { const c = bin.charCodeAt(i); w[i] = (c > 127 ? c - 256 : c) * l.s[Math.floor(i / l.nIn)]!; }
  return { w, b: Float32Array.from(l.b), nIn: l.nIn, nOut: l.nOut };
}

export function createVisemeNet(m: VisModel | VisModelQ) {
  const L = m.layers.map((l) => ('q' in l ? unpack(l) : { w: Float32Array.from(l.w.flat()), b: Float32Array.from(l.b), nIn: l.w[0]!.length, nOut: l.b.length }));
  const mu = Float32Array.from(m.mu), isd = Float32Array.from(m.sd.map((s) => 1 / s));
  const bufs = [new Float32Array(m.ctx.length * m.dim), ...L.map((l) => new Float32Array(l.nOut))];
  const logPrior = m.prior.map((p) => Math.log(p));
  return {
    ctxMin: Math.min(...m.ctx),
    ctxMax: Math.max(...m.ctx),
    /** Log posteriors of the frame at index i; `frame(j)` returns the raw 25-dim frame j (clamped by the caller). */
    forward(frame: (j: number) => Float32Array, i: number, out: Float32Array) {
      const x = bufs[0]!;
      for (let c = 0; c < m.ctx.length; c++) {
        const f = frame(i + m.ctx[c]!), o = c * m.dim;
        for (let d = 0; d < m.dim; d++) x[o + d] = (f[d]! - mu[d]!) * isd[d]!;
      }
      let inp = x;
      for (let k = 0; k < L.length; k++) {
        const l = L[k]!, y = bufs[k + 1]!;
        for (let o = 0; o < l.nOut; o++) {
          let s = l.b[o]!;
          const row = o * l.nIn;
          for (let j = 0; j < l.nIn; j++) s += l.w[row + j]! * inp[j]!;
          y[o] = k < L.length - 1 ? Math.max(0, s) : s;
        }
        inp = y;
      }
      let mx = -1e30; for (let c = 0; c < inp.length; c++) mx = Math.max(mx, inp[c]!);
      let z = 0; for (let c = 0; c < inp.length; c++) z += Math.exp(inp[c]! - mx);
      const lz = mx + Math.log(z);
      for (let c = 0; c < inp.length; c++) out[c] = inp[c]! - lz;
    },
    /** Emission score of mouth class c for a frame's log posteriors: log sum_k SIM[c][k] P(k), minus beta x its prior. */
    score(lp: Float32Array, c: number, beta: number) {
      const row = SIM[c]!;
      let s = 0, pr = 0;
      for (let k = 0; k < row.length; k++) { if (row[k]! > 0) { s += row[k]! * Math.exp(lp[k]!); pr += row[k]! * Math.exp(logPrior[k]!); } }
      return Math.log(s + 1e-4) - beta * Math.log(pr);
    },
  };
}
