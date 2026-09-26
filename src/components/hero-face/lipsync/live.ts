// Live lip-sync: the AI agent's voice (the AnalyserNode VoiceButton puts on the agent's LiveKit track, handed over by
// the window 'face-voice' event) and its transcript words drive the mouth, over the idle life (sway, blinks).
// Mic audio never reaches this: VoiceButton only announces the agent track's analyser.
//
// The sound says WHEN, the words say WHAT: align-stream.ts aligns the transcript's syllables to the voice every
// 50 ms (vowels from F1 / F2, consonants in the loudness dips, pauses at punctuation), speech-anim.ts turns the aligned
// timeline into coarticulated mouth shapes (width for i / e vs o / u / ö / ü, closures for m / b / p, the jaw riding
// the syllable loudness) and blends the vowel toward what the voice itself says where the alignment is unsure.
// The face asks VoiceButton for a little playback look-ahead (window.__faceLookahead), so the mouth is shown for
// the moment being heard with that much of the future already analysed (plus the output latency, e.g. Bluetooth).
import { createStreamAligner } from './align-stream';
import { EXPR } from './expression';
import { createIdlePerformer, duchenneMorphs, smileMorphs, type Performer } from './idle';
import { ANIM_DEFAULTS, mouthAt } from './speech-anim';
import { createSpeechFace } from './speech-face';
import type { Lang } from './timing';
import type { VisModelQ } from './viseme-net';

/** Playback look-ahead the face asks for, seconds. The viseme classifier reads 120 ms past a frame and the live decode
 *  settles ~350 ms behind the audio (an i-n-i showed as one long i until then); m / b / p close ~70 ms ahead of their
 *  sound. Unseen calls against a forced alignment (streameval.ts, checks2.ts): right vowel TR 93 / 94 / 95 %, EN 85 /
 *  87 / 89 % and m / b / p sealed 91 / 96 / 98 % at 270 / 350 / 450 ms. */
export const FACE_LOOKAHEAD = 0.35;

// the viseme model (~74 kB) is fetched when a performer is made, well before the agent's first word
let visModel: VisModelQ | null = null, visLoading: Promise<void> | null = null;
const loadVis = () => { visLoading ??= import('./viseme-model').then((m) => { visModel = m.VIS_MODEL; }).catch(() => { visLoading = null; }); };

export interface LiveVoice {
  /** current agent analyser (null outside a call / between tracks) */
  analyser: AnalyserNode | null;
  /** the orb's signal (window 'orb-level', 0..1) */
  level: number;
  /** a call is live (window 'orb-live') */
  live: boolean;
  /** agent transcript chunks not yet consumed (audio-clock ms at arrival) */
  chunks: { id: string; text: string; atCtxMs: number | null; atPerf: number }[];
  /** performance.now() of the visitor's latest recognised speech (0: none yet) */
  userAt: number;
}

/** Listens for 'face-voice' (detail: AnalyserNode | null), 'orb-live', 'orb-level' and the agent's 'face-transcript'. */
export function listenFaceVoice(): { voice: LiveVoice; detach(): void } {
  const voice: LiveVoice = { analyser: null, level: 0, live: false, chunks: [], userAt: 0 };
  (window as { __faceLookahead?: number }).__faceLookahead = FACE_LOOKAHEAD;
  const tr = (e: Event) => {
    const d = (e as CustomEvent).detail as { id: string; text: string; agent: boolean } | null;
    if (!d || !d.text) return;
    // the visitor talking (ends her waiting smile after a question)
    if (!d.agent) { voice.userAt = performance.now(); return; }
    const ctx = voice.analyser?.context;
    voice.chunks.push({ id: d.id, text: d.text, atCtxMs: ctx ? ctx.currentTime * 1000 : null, atPerf: performance.now() });
    if (voice.chunks.length > 200) voice.chunks.splice(0, voice.chunks.length - 200);
  };
  const on = (e: Event) => { voice.analyser = ((e as CustomEvent).detail as AnalyserNode | null) ?? null; };
  const lv = (e: Event) => { voice.live = (e as CustomEvent).detail === true; if (!voice.live) { voice.analyser = null; voice.level = 0; } };
  const lvl = (e: Event) => { const d = Number((e as CustomEvent).detail); voice.level = Number.isFinite(d) ? d : 0; };
  window.addEventListener('face-transcript', tr);
  window.addEventListener('face-voice', on);
  window.addEventListener('orb-live', lv);
  window.addEventListener('orb-level', lvl);
  return {
    voice,
    detach() {
      window.removeEventListener('face-voice', on); window.removeEventListener('orb-live', lv); window.removeEventListener('orb-level', lvl); window.removeEventListener('face-transcript', tr);
      delete (window as { __faceLookahead?: number }).__faceLookahead;
    },
  };
}

export const LIVE = {
  squint: [0.16, 0.26] as [number, number], // eye engagement while speaking (base, + accents)
  // a reply that ends in a question: once she has stopped, a soft closed-lip smile while she waits for the answer
  // (smile, asym, delay after her voice ends (s), longest hold (s), rise / fall time constants (s))
  askSmile: { smile: 0.3, asym: 0.08, delay: 0.25, hold: 6, rise: 0.18, fall: 0.25 },
};

export function createLivePerformer(voice: LiveVoice, lang: Lang = typeof document !== 'undefined' && document.documentElement.lang.startsWith('en') ? 'en' : 'tr'): Performer {
  const idle = createIdlePerformer({ firstSmileAt: 3 });
  loadVis();
  let last = 0, speak = 0, turn = 0, accent = 0, prevLoud = 0, alVis = false;
  // the question smile: the latest reply's id / text, how long she has been silent after it, its envelope
  let replyId = '', replyText = '', askAt = 0, askWait = 0, askEnv = 0;
  // the audio clock as the frames see it: ctx.currentTime moves in audio-callback blocks (~10-20 ms, more over
  // Bluetooth) and stands still between them, so it is carried on with the frame clock between blocks (at most 40 ms),
  // never backwards; the mouth stepped in blocks at 120 Hz (the live 'chirping')
  let clkCtx = -1, clkPerf = 0, clkLast = 0;
  const face = createSpeechFace(1 + Math.floor(Math.random() * 997)); // blinks / nods never repeat on the same beats
  const anim = { ...ANIM_DEFAULTS, lang };
  const mstate = { jaw: 0, t: 0 };
  // our own analyser, tapped off the agent's (a longer window; the orb's analyser stays untouched)
  let src: AnalyserNode | null = null, tap: AnalyserNode | null = null, buf: Float32Array<ArrayBuffer> | null = null;
  let al: ReturnType<typeof createStreamAligner> | null = null;
  const retap = (a: AnalyserNode | null) => {
    if (src && tap) { try { src.disconnect(tap); } catch { /* already gone */ } }
    src = a; tap = null; buf = null; al = null; clkCtx = -1; clkLast = 0;
    if (!a) return;
    try {
      tap = a.context.createAnalyser();
      tap.fftSize = 4096;
      tap.smoothingTimeConstant = 0;
      a.connect(tap);
      buf = new Float32Array(new ArrayBuffer(tap.fftSize * 4));
      al = createStreamAligner(a.context.sampleRate, lang, visModel ?? undefined);
      alVis = !!visModel;
    } catch { tap = null; al = null; }
  };

  return {
    sample(t) {
      const out = idle.sample(t);
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      if (voice.analyser !== src) retap(voice.analyser);
      // a call is live: the lips keep their speaking light through its pauses (and before her first word)
      if (voice.live) out.morphs._lipLight = 1;
      // only real call audio moves the mouth (never the orb level: that was the open / close fish)
      if (!voice.live || !src || !tap || !buf || !al) { voice.chunks.length = 0; return out; }
      // the model arrived after the tap was made: start over with it while nothing has been said yet
      if (!alVis && visModel && al.state().units === 0) { al = createStreamAligner(src.context.sampleRate, lang, visModel); alVis = true; }
      const ctx = src.context as AudioContext;
      const ctxMs = ctx.currentTime * 1000, perfMs = performance.now();
      if (ctxMs !== clkCtx) { if (ctxMs < clkCtx - 1000) clkLast = 0; clkCtx = ctxMs; clkPerf = perfMs; }
      const nowMs = Math.max(clkLast, ctxMs + Math.min(40, perfMs - clkPerf));
      clkLast = nowMs;
      for (const c of voice.chunks) {
        al.text(c.id, c.text, c.atCtxMs ?? nowMs - (performance.now() - c.atPerf));
        if (c.id !== replyId) { replyId = c.id; askAt = performance.now(); }
        replyText = c.text;
      }
      voice.chunks.length = 0;
      tap.getFloatTimeDomainData(buf);
      al.audio(buf, Math.round(ctx.currentTime * ctx.sampleRate));
      // the moment being heard now: the look-ahead delay plus the output latency behind the analyser
      const heard = nowMs - 1000 * (FACE_LOOKAHEAD + (ctx.baseLatency || 0) + (ctx.outputLatency || 0));
      const ac = al.acousticAt(heard);
      // speaking: the voice is loud, or the aligned timeline has speech around the moment heard (quiet words count)
      const tl = al.timeline();
      const inTurn = tl.some((q) => q.kind !== 'P' && q.end > heard - 700 && q.start < heard + 250);
      speak += ((ac.loud > 0.08 || inTurn ? 1 : 0) - speak) * (1 - Math.exp(-dt / 0.35));
      turn += ((inTurn ? 1 : 0) - turn) * (1 - Math.exp(-dt / (inTurn ? 0.2 : 0.8)));
      const onset = ac.loud - prevLoud > 0.2 ? 1 : 0;
      prevLoud = ac.loud;
      accent = Math.max(accent * Math.exp(-dt / 0.35), onset);
      const mouth = mouthAt(heard, tl, (ms) => al!.acousticAt(ms), al.targets(), anim, speak, mstate);
      const m = out.morphs;
      // the idle performer's smiles (peaks ~0.4 + Duchenne squint) are for listening pauses: while she talks they fade
      // out, or she grins through her words
      const quiet = 1 - 0.95 * Math.max(speak, turn);
      for (const key of ['mouthSmileLeft', 'mouthSmileRight', 'eyeSquintLeft', 'eyeSquintRight']) m[key] = (m[key] ?? 0) * quiet;
      for (const [key, v] of Object.entries(mouth)) m[key] = key.startsWith('mouthSmile') ? Math.max(m[key] ?? 0, v) : v;
      // eyes + brows: engaged while speaking, a little more on accents; the lids hand over to the blinks
      const blink = Math.max(m.eyeBlinkLeft ?? 0, m.eyeBlinkRight ?? 0);
      const sq = (LIVE.squint[0] * speak + (LIVE.squint[1] - LIVE.squint[0]) * accent) * (1 - blink);
      m.eyeSquintLeft = Math.min(EXPR.maxSquint, Math.max(m.eyeSquintLeft ?? 0, sq));
      m.eyeSquintRight = Math.min(EXPR.maxSquint, Math.max(m.eyeSquintRight ?? 0, sq * 0.96));
      // head with the voice's pitch, nods on strong accents, a brow raise on ~1 in 7, blinks at phrase ends,
      // glances away at a reply's start and in long turns (speech-face.ts)
      const f = face.step({ t: heard, dt, speak, loud: ac.loud, f0: ac.f0 ?? NaN, segs: al.timeline() });
      out.pose.pitch += f.pitch; out.pose.yaw += f.yaw; out.pose.roll += f.roll;
      m.browInnerUpLeft = Math.min(EXPR.maxBrowUp, (m.browInnerUpLeft ?? 0) + f.brow);
      m.browInnerUpRight = Math.min(EXPR.maxBrowUp, (m.browInnerUpRight ?? 0) + f.brow * 0.9);
      if (f.blink !== null) { m.eyeBlinkLeft = Math.max(f.blink, speak < 0.4 ? m.eyeBlinkLeft ?? 0 : 0); m.eyeBlinkRight = m.eyeBlinkLeft; }
      // she asked something: once her voice has ended (past the last aligned sound, quiet), a soft smile while she
      // waits; it goes as the visitor answers, as her next reply starts, or after askSmile.hold. Never while she speaks
      const A = LIVE.askSmile;
      const asked = /[?？]["'”’)\]]*\s*$/.test(replyText) && voice.userAt < askAt;
      const lastEnd = tl.reduce((e, q) => (q.kind !== 'P' ? Math.max(e, q.end) : e), 0);
      const done = heard > lastEnd + 150 && ac.loud < 0.05;
      askWait = asked && done ? askWait + dt : 0;
      const want = askWait > A.delay && askWait < A.delay + A.hold ? 1 : 0;
      askEnv += (want - askEnv) * (1 - Math.exp(-dt / (want > askEnv ? A.rise : A.fall)));
      if (askEnv > 0.001) {
        const s = A.smile * askEnv * askEnv * (3 - 2 * askEnv) * (1 - speak);
        const sm = smileMorphs({ smile: s, asym: A.asym }), dq = duchenneMorphs({ smile: s, asym: A.asym });
        for (const [key, v] of Object.entries(sm)) m[key] = Math.max(m[key] ?? 0, v);
        m.eyeSquintLeft = Math.min(EXPR.maxSquint, Math.max(m.eyeSquintLeft ?? 0, dq.eyeSquintLeft * (1 - blink)));
        m.eyeSquintRight = Math.min(EXPR.maxSquint, Math.max(m.eyeSquintRight ?? 0, dq.eyeSquintRight * (1 - blink)));
      }
      out.gaze = { yaw: f.gazeYaw, pitch: f.gazePitch };
      out.speaking = speak > 0.5;
      if (import.meta.env?.DEV) {
        const seg = tl.find((q) => q.start <= heard && q.end > heard);
        (globalThis as { __faceLive?: unknown }).__faceLive = { heard, loud: ac.loud, speak, seg: seg ? seg.kind + (seg.v ?? (seg.cons ?? []).join('')) : '-', nseg: tl.length, frontier: al.frontierMs(), jaw: mouth.jawOpen, ld: mouth.mouthLowerDownLeft, ...al.state() };
      }
      return out;
    },
  };
}
