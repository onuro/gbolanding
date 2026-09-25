// Acoustic features for live lip-sync, straight from the agent's voice (no transcript, so they cannot drift from the
// sound): loudness, the first two formants (LPC on a ~12 kHz decimation) and a fricative (hiss) cue. F1 tracks how
// open the vowel is (i/u low, a high); F2 tracks front/back (i/e high: spread lips, o/u low: rounded lips).
// Pure DSP on a Float32 time-domain buffer (the most recent samples last), so the lab / node tests run it too.

export interface VoiceFrame {
  /** RMS of the analysis window */
  rms: number;
  /** first / second formant, Hz (NaN when not found) */
  f1: number;
  f2: number;
  /** 0..1: hiss share (s / ş / z / f / ç), from the first-difference energy ratio */
  fric: number;
  /** mean frequency of the window, Hz */
  fq: number;
}

const ORDER = 12;
const N = 384; // analysis window at the decimated rate (~32 ms at 12 kHz)

function lowpassTaps(n: number, fc: number): Float64Array {
  // windowed sinc (Blackman), fc as a fraction of the sample rate
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

/** Samples of history the tracker reads (size the analyser's fftSize to at least this). */
export function formantWindow(sampleRate: number): number {
  const D = Math.max(1, Math.round(sampleRate / 12000));
  return N * D + 64;
}

export function createFormantTracker(sampleRate: number) {
  const D = Math.max(1, Math.round(sampleRate / 12000));
  const fs = sampleRate / D;
  const taps = lowpassTaps(33, 5200 / sampleRate);
  const half = (taps.length - 1) / 2;
  const x = new Float64Array(N);
  const r = new Float64Array(ORDER + 1);
  const a = new Float64Array(ORDER + 1);
  const tmp = new Float64Array(ORDER + 1);
  const ham = new Float64Array(N).map((_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const F0 = 150, F1H = 4200, STEP = 25;
  const nf = Math.floor((F1H - F0) / STEP) + 1;
  const env = new Float64Array(nf);
  const cosT: Float64Array[] = [], sinT: Float64Array[] = [];
  for (let i = 0; i < nf; i++) {
    const w = (2 * Math.PI * (F0 + i * STEP)) / fs;
    const c = new Float64Array(ORDER + 1), s = new Float64Array(ORDER + 1);
    for (let k = 0; k <= ORDER; k++) { c[k] = Math.cos(w * k); s[k] = Math.sin(w * k); }
    cosT.push(c); sinT.push(s);
  }

  return function analyse(buf: Float32Array): VoiceFrame {
    const L = buf.length;
    // the decimation filter reads half a filter length either side of each output sample
    const n = Math.min(N, Math.floor((L - 2 - 2 * half) / D) + 1);
    const start = L - 1 - half - (n - 1) * D;
    const span = L - start;
    // loudness + hiss (full rate, the same window)
    let e = 0, ed = 0;
    for (let i = start; i < L; i++) {
      const v = buf[i]!, d = v - buf[i - 1]!; // start >= half >= 1
      e += v * v; ed += d * d;
    }
    const rms = Math.sqrt(e / span);
    // "mean frequency" from the first-difference energy ratio (a sine at f gives 2 (1 - cos 2 pi f / fs)): voiced
    // speech keeps its energy under ~1.5 kHz, hiss (s / ş / z / f) sits at 4-8 kHz
    const fq = e > 0 ? (sampleRate / (2 * Math.PI)) * Math.acos(Math.max(-1, 1 - ed / e / 2)) : 0;
    const fric = Math.min(1, Math.max(0, (fq - 1800) / 2200));
    if (rms < 1e-4) return { rms, f1: NaN, f2: NaN, fric, fq };
    // decimate (low-pass + every D-th sample), pre-emphasis, Hamming
    let prev = 0;
    for (let k = 0; k < N; k++) {
      if (k >= n) { x[k] = 0; continue; }
      const c = start + k * D;
      let y = 0;
      for (let j = 0; j < taps.length; j++) y += taps[j]! * buf[c - half + j]!;
      x[k] = (y - 0.9 * prev) * ham[k]!;
      prev = y;
    }
    // autocorrelation + Levinson-Durbin
    for (let k = 0; k <= ORDER; k++) {
      let s = 0;
      for (let i = k; i < N; i++) s += x[i]! * x[i - k]!;
      r[k] = s;
    }
    if (!(r[0]! > 0)) return { rms, f1: NaN, f2: NaN, fric, fq };
    r[0]! *= 1.0001;
    for (let k = 1; k <= ORDER; k++) r[k]! *= Math.exp(-0.5 * Math.pow((2 * Math.PI * 60 * k) / fs, 2)); // lag window (60 Hz)
    a.fill(0); a[0] = 1;
    let err = r[0]!;
    for (let i = 1; i <= ORDER; i++) {
      let acc = r[i]!;
      for (let j = 1; j < i; j++) acc += a[j]! * r[i - j]!;
      const k = -acc / err;
      tmp.set(a);
      for (let j = 1; j < i; j++) a[j] = tmp[j]! + k * tmp[i - j]!;
      a[i] = k;
      err *= 1 - k * k;
      if (err <= 0) return { rms, f1: NaN, f2: NaN, fric, fq };
    }
    // LPC envelope peaks
    for (let i = 0; i < nf; i++) {
      let re = 0, im = 0;
      const c = cosT[i]!, s = sinT[i]!;
      for (let k = 0; k <= ORDER; k++) { re += a[k]! * c[k]!; im -= a[k]! * s[k]!; }
      env[i] = 1 / (re * re + im * im);
    }
    let f1 = NaN, f2 = NaN;
    for (let i = 1; i < nf - 1; i++) {
      if (!(env[i]! > env[i - 1]! && env[i]! >= env[i + 1]!)) continue;
      // parabolic refinement on the log envelope
      const l0 = Math.log(env[i - 1]!), l1 = Math.log(env[i]!), l2 = Math.log(env[i + 1]!);
      const den = l0 - 2 * l1 + l2;
      const f = F0 + STEP * (i + (den < 0 ? (0.5 * (l0 - l2)) / den : 0));
      if (Number.isNaN(f1)) { if (f >= 250 && f <= 1150) f1 = f; else if (f > 1150) break; }
      else if (f >= f1 + 250 && f >= 700 && f <= 3300) { f2 = f; break; }
    }
    return { rms, f1, f2, fric, fq };
  };
}
