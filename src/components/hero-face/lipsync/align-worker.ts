/// <reference lib="webworker" />
// The live lip-sync's aligner off the main thread (align-proxy.ts is its page side). Every audio chunk's analysis and
// the ~2 s re-decode every 50 ms ran inside the animation frame that draws her: ~0.1 ms typical but 2-5 ms spikes on
// this Mac, several times that on a phone, i.e. dropped frames exactly while she talks (the owner: laggy / jittery lip
// sync on a phone, 2026-09-26). Same aligner, same inputs in the same order; the page reads its results one message
// later (well inside the voice's 350 ms look-ahead).
// in:  { type: 'init', sampleRate, lang } | { type: 'text', id, text, at } | { type: 'audio', buf, end }
// out: { type: 'frames', ...snapshot (the last TAIL frames' acoustics), frontier, state, timeline (null: unchanged), buf }
import { createStreamAligner } from './align-stream';
import type { Lang } from './timing';
import type { VisModelQ } from './viseme-net';

type Aligner = ReturnType<typeof createStreamAligner>;
// frames re-sent after every chunk: the page reads ~40 frames behind the newest, and a frame's classifier posterior
// arrives ~12 frames after it
const TAIL = 64;
let al: Aligner | null = null, sampleRate = 48000, lang: Lang = 'tr';
let vis: VisModelQ | null = null, withVis = false, sentRev = -1, fresh = true;
import('./viseme-model').then((m) => { vis = m.VIS_MODEL; }).catch(() => { /* aligns without the classifier */ });

const post = (msg: unknown, transfer: Transferable[]) => (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = (ev: MessageEvent) => {
  const d = ev.data;
  if (d.type === 'init') {
    sampleRate = d.sampleRate; lang = d.lang;
    al = createStreamAligner(sampleRate, lang, vis ?? undefined); withVis = !!vis; sentRev = -1; fresh = true;
    return;
  }
  if (!al) return;
  // the classifier arrived after the aligner was made: start over with it while nothing has been said yet (live.ts did
  // this on the page before)
  if (!withVis && vis && al.state().units === 0) { al = createStreamAligner(sampleRate, lang, vis); withVis = true; sentRev = -1; fresh = true; }
  if (d.type === 'text') { al.text(d.id, d.text, d.at); return; }
  if (d.type !== 'audio') return;
  al.audio(d.buf, d.end);
  const snap = al.snapshot(TAIL);
  const rev = al.rev();
  const timeline = rev !== sentRev ? al.timeline() : null;
  sentRev = rev;
  // (reset: a new aligner, the page drops the old one's frames)
  post({ type: 'frames', ...snap, reset: fresh, frontier: al.frontierMs(), state: al.state(), timeline, buf: d.buf },
    [snap.e.buffer, snap.f1.buffer, snap.f2.buffer, snap.p0.buffer, snap.lp.buffer, d.buf.buffer]);
  fresh = false;
};
