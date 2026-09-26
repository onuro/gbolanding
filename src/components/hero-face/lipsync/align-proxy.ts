// The page side of align-worker.ts: the streaming aligner's interface as live.ts uses it, with the analysis and the
// decodes in a worker. text() / audio() are posted (the audio in a pooled buffer, handed back after use); acousticAt()
// runs here, every call, on a mirror of the recent frames (the same formula as align-stream.ts, from the values the
// worker sends after each chunk); timeline(), frontierMs() and state() are the latest the worker sent. Where workers
// are missing or fail to start, the aligner runs on the page as before.
import { createStreamAligner, VOICE_PRIOR, type AlignSeg } from './align-stream';
import type { Lang } from './timing';
import type { VisModelQ } from './viseme-net';

const HOP = 10; // ms per frame (align-stream.ts)
const RING = 4096; // mirrored frames (~41 s)

export interface Aligner {
  text(id: string, text: string, atMs: number): void;
  audio(buf: Float32Array, endSample: number): void;
  acousticAt(ms: number): ReturnType<ReturnType<typeof createStreamAligner>['acousticAt']>;
  timeline(): AlignSeg[];
  targets(): Record<string, [number, number]>;
  frontierMs(): number;
  state(): ReturnType<ReturnType<typeof createStreamAligner>['state']>;
  dispose(): void;
}

const NONE = { loud: 0, f1n: NaN, f2n: NaN, voiced: false, db: -120, f0: NaN, pc: undefined as number | undefined, pp: undefined as number | undefined, pf: undefined as number | undefined, ps: undefined as number | undefined };

/** vis: the page's classifier, for the fallback only (the worker loads its own) */
export function createAligner(sampleRate: number, lang: Lang, vis?: VisModelQ): Aligner {
  let worker: Worker | null = null;
  try {
    worker = typeof Worker !== 'undefined' ? new Worker(new URL('./align-worker.ts', import.meta.url), { type: 'module' }) : null;
  } catch { worker = null; }
  if (!worker) {
    const al = createStreamAligner(sampleRate, lang, vis);
    return { ...al, dispose() { /* nothing held */ } };
  }
  const w = worker;
  // the mirror: slot f % RING holds absolute frame f when has[slot] === f
  const has = new Float64Array(RING).fill(-1);
  const E = new Float64Array(RING), F1 = new Float64Array(RING), F2 = new Float64Array(RING), P0 = new Float64Array(RING);
  const LP = new Float32Array(RING * 12);
  let th = -88, below = 28, N1: [number, number] = [...VOICE_PRIOR[lang].n1], N2: [number, number] = [...VOICE_PRIOR[lang].n2];
  let tl: AlignSeg[] = [], frontier = 0;
  let st = { units: 0, u0: 0, f0: 0, committed: 0, live: 0, N1, N2, peak: -60, lead: VOICE_PRIOR[lang].lead, uttF0: 0 } as ReturnType<Aligner['state']>;
  const pool: Float32Array[] = [];
  let failed = false;
  let fallback: ReturnType<typeof createStreamAligner> | null = null;

  w.onmessage = (ev: MessageEvent) => {
    const d = ev.data;
    if (d.type !== 'frames') return;
    if (d.buf && pool.length < 6) pool.push(d.buf);
    if (d.reset) has.fill(-1);
    const n = d.e.length;
    for (let j = 0; j < n; j++) {
      const f = d.from + j, s = ((f % RING) + RING) % RING;
      has[s] = f; E[s] = d.e[j]; F1[s] = d.f1[j]; F2[s] = d.f2[j]; P0[s] = d.p0[j];
      LP.set(d.lp.subarray(j * 12, j * 12 + 12), s * 12);
    }
    th = d.th; below = d.below; N1 = d.N1; N2 = d.N2;
    frontier = d.frontier; st = d.state;
    if (d.timeline) tl = d.timeline;
  };
  // a worker that cannot load its module (or dies): the aligner moves back to the page, from the next chunk on
  w.onerror = () => { failed = true; fallback ??= createStreamAligner(sampleRate, lang, vis); };
  w.postMessage({ type: 'init', sampleRate, lang });

  const at = (f: number) => { const s = ((f % RING) + RING) % RING; return has[s] === f ? s : -1; };
  return {
    text(id, text, atMs) {
      if (failed) { fallback!.text(id, text, atMs); return; }
      w.postMessage({ type: 'text', id, text, at: atMs });
    },
    audio(buf, endSample) {
      if (failed) { fallback!.audio(buf, endSample); return; }
      let b = pool.pop();
      if (!b || b.length !== buf.length) b = new Float32Array(buf.length);
      b.set(buf);
      w.postMessage({ type: 'audio', buf: b, end: endSample }, [b.buffer]);
    },
    acousticAt(ms) {
      if (failed) return fallback!.acousticAt(ms);
      const i = Math.round(ms / HOP), si = at(i);
      if (si < 0) return { ...NONE };
      // loudness over the last 30 ms (the syllable envelope, not single frames)
      let e = -120;
      for (let k = i - 2; k <= i; k++) { const sk = at(k); if (sk >= 0) e = Math.max(e, E[sk]!); }
      const voiced = e > th && Number.isFinite(F1[si]!) && Number.isFinite(F2[si]!);
      let pc: number | undefined, pp: number | undefined, pf: number | undefined, ps: number | undefined;
      if (!Number.isNaN(LP[si * 12]!)) {
        const l = (k: number) => LP[si * 12 + k]!;
        pc = 0; for (let k = 1; k <= 5; k++) pc += Math.exp(l(k));
        pp = Math.exp(l(1)); pf = Math.exp(l(2)); ps = Math.exp(l(0));
      }
      return {
        loud: Math.max(0, Math.min(1, (e - th) / below)),
        f1n: (F1[si]! - N1[0]) / Math.max(50, N1[1] - N1[0]),
        f2n: (F2[si]! - N2[0]) / Math.max(100, N2[1] - N2[0]),
        voiced, db: e, f0: P0[si]!, pc, pp, pf, ps,
      };
    },
    timeline() { return failed ? fallback!.timeline() : tl; },
    targets() { return VOICE_PRIOR[lang].targets; },
    frontierMs() { return failed ? fallback!.frontierMs() : frontier; },
    state() { return failed ? fallback!.state() : st; },
    dispose() { w.terminate(); },
  };
}
