// Speech front-end shared by the live lip-sync and the offline lab: log-mel frames of the agent's voice.
// 16 kHz analysis (low-pass + decimation from the context rate), 25 ms Hamming window, 512-point FFT, 24 mel bands
// 80-7600 Hz, plus log energy and a hiss share. Pure (no Web Audio), so the lab and the page compute identical
// frames from the same samples.

export const MEL_BANDS = 24;
export const FS = 16000;
const WIN = 400; // 25 ms at 16 kHz
const NFFT = 512;

export interface MelFrame {
  /** log mel energies (natural log, floored) */
  mel: Float32Array;
  /** log frame energy */
  logE: number;
  /** RMS of the window at the source rate */
  rms: number;
  /** energy share above 4 kHz (s / ş / z / f hiss) */
  hiss: number;
}

function lowpass(n: number, fc: number): Float64Array {
  const h = new Float64Array(n);
  const m = (n - 1) / 2;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = i - m;
    const s = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (n - 1));
    h[i] = s * w;
    sum += h[i]!;
  }
  for (let i = 0; i < n; i++) h[i]! /= sum;
  return h;
}

// in-place radix-2 complex FFT
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]!; re[i] = re[j]!; re[j] = t; t = im[i]!; im[i] = im[j]!; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b]! * cr - im[b]! * ci, xi = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - xr; im[b] = im[a]! - xi;
        re[a]! += xr; im[a]! += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

const mel = (f: number) => 2595 * Math.log10(1 + f / 700);
const imel = (m: number) => 700 * (Math.pow(10, m / 2595) - 1);

/** Source samples one frame reads (size the analyser's fftSize to at least this). */
export function frameSpan(sampleRate: number): number {
  const D = Math.max(1, Math.round(sampleRate / FS));
  return WIN * D + 80;
}

export function createMelFrontend(sampleRate: number) {
  const D = Math.max(1, Math.round(sampleRate / FS));
  const taps = lowpass(D === 1 ? 1 : 31, 7600 / sampleRate);
  const half = (taps.length - 1) / 2;
  const ham = new Float64Array(WIN).map((_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WIN - 1)));
  const fsA = sampleRate / D;
  // triangular mel filters over the 257 power bins
  const lo = mel(80), hi = mel(7600);
  const edges = Array.from({ length: MEL_BANDS + 2 }, (_, i) => (imel(lo + ((hi - lo) * i) / (MEL_BANDS + 1)) / fsA) * NFFT);
  const filt: { k0: number; w: Float64Array }[] = [];
  for (let b = 0; b < MEL_BANDS; b++) {
    const l = edges[b]!, c = edges[b + 1]!, r = edges[b + 2]!;
    const k0 = Math.floor(l), k1 = Math.ceil(r);
    const w = new Float64Array(k1 - k0 + 1);
    for (let k = k0; k <= k1; k++) w[k - k0] = k < c ? Math.max(0, (k - l) / (c - l)) : Math.max(0, (r - k) / (r - c));
    filt.push({ k0, w });
  }
  const hissBin = Math.round((4000 / fsA) * NFFT);
  const re = new Float64Array(NFFT), im = new Float64Array(NFFT), pw = new Float64Array(NFFT / 2 + 1);
  /** One frame ending at `end` (exclusive) in `buf` (default: the end of the buffer). */
  return function frame(buf: Float32Array, end = buf.length): MelFrame {
    const start = end - 1 - half - (WIN - 1) * D;
    re.fill(0); im.fill(0);
    let e = 0, prev = 0;
    for (let k = 0; k < WIN; k++) {
      const c = start + k * D;
      let y = 0;
      if (D === 1) y = buf[c] ?? 0;
      else for (let j = 0; j < taps.length; j++) y += taps[j]! * (buf[c - half + j] ?? 0);
      e += y * y;
      re[k] = (y - 0.97 * prev) * ham[k]!;
      prev = y;
    }
    const rms = Math.sqrt(e / WIN);
    fft(re, im);
    let tot = 0, hs = 0;
    for (let k = 0; k <= NFFT / 2; k++) { const p = re[k]! * re[k]! + im[k]! * im[k]!; pw[k] = p; tot += p; if (k >= hissBin) hs += p; }
    const out = new Float32Array(MEL_BANDS);
    for (let b = 0; b < MEL_BANDS; b++) {
      const { k0, w } = filt[b]!;
      let s = 0;
      for (let i = 0; i < w.length; i++) s += w[i]! * (pw[k0 + i] ?? 0);
      out[b] = Math.log(s + 1e-10);
    }
    return { mel: out, logE: Math.log(e + 1e-10), rms, hiss: tot > 0 ? hs / tot : 0 };
  };
}
