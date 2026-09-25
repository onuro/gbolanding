// Talk-mode performer for the dev preview and the lab: plays lines (text -> mimicked speech, no audio) over the
// idle life (sway, blinks), adds tiny head nods on accented syllables and a gentle smile after each sentence.
// Around the mouth: the Duchenne eye narrowing with the smiles, a subtle lid tension on stressed syllables and
// minimal brow life (expression.ts). Pure in t (seconds), so the preview's rAF loop and the lab's frame-by-frame
// renders see the same thing.
import { EXPR, EXPR_TAIL, planExpression, sampleExpression, type ExprPlan } from './expression';
import { createBlinks, createIdlePerformer, DUCHENNE, duchenneMorphs, idleSway, makeSmile, rng, smileEnd, smileEnvelope, smileMorphs, ZERO_MORPHS, type Performer, type SmileEvent } from './idle';
import { timeText, type Lang } from './timing';
import { buildTrack, type Track } from './track';
import type { StyleName } from './visemes';

export interface Line {
  text: string;
  lang: Lang;
}

export const SITE_LINES: Line[] = [
  { text: "Merhaba, ben GBO Vision'ın yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?", lang: 'tr' },
  { text: "Hi, I'm the GBO Vision assistant. How can I help your business today?", lang: 'en' },
];

export interface PerformerOptions {
  mode?: 'idle' | 'talk';
  style?: StyleName;
  /** which of SITE_LINES to play when `lines` is not given (default: both, alternating) */
  lang?: Lang | 'both';
  lines?: Line[];
  seed?: number;
  /** silence before the first line, s (default 1.2) */
  leadSec?: number;
  /** silence between lines, s (default 3.4: room for the post-sentence smile) */
  gapSec?: number;
  /** loop the lines (default true) */
  loop?: boolean;
  /** first idle smile time, s (idle mode) */
  firstSmileAt?: number;
}

export type { Performer, PerformerSample } from './idle';

interface Planned {
  line: Line;
  track: Track;
  /** start within the cycle, s */
  t0: number;
  dur: number;
  expr: ExprPlan;
}

/** 0 below e0, 1 above e1, smooth (Hermite) in between. */
function smoothstepRange(e0: number, e1: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

export function createPerformer(opts: PerformerOptions = {}): Performer {
  if ((opts.mode ?? 'talk') === 'idle') return createIdlePerformer({ seed: opts.seed, firstSmileAt: opts.firstSmileAt });
  const style = opts.style ?? 'minimal';
  const lines = opts.lines ?? (opts.lang && opts.lang !== 'both' ? SITE_LINES.filter((l) => l.lang === opts.lang) : SITE_LINES);
  const lead = opts.leadSec ?? 1.2, gap = opts.gapSec ?? 3.4, loop = opts.loop ?? true;
  const seed = opts.seed ?? 0;
  const plan: Planned[] = [];
  let c = 0;
  lines.forEach((line, i) => {
    const timed = timeText(line.text, { lang: line.lang, seed: 7 + i + seed });
    const track = buildTrack(timed.segments, { style, seed: 3 + i, accents: timed.accents });
    plan.push({ line, track, t0: c, dur: track.durationMs / 1000, expr: planExpression(line.text, timed, i + seed) });
    c += track.durationMs / 1000 + gap;
  });
  const cycle = c;
  const blink = createBlinks(11 + seed);

  // gentle smile after each sentence, fitted into the gap (eased out before the next line); varies per cycle
  const smileCache = new Map<string, SmileEvent>();
  const postSmile = (k: number, i: number): SmileEvent => {
    const key = `${k}:${i}`;
    let e = smileCache.get(key);
    if (!e) {
      const r = rng(97 + 31 * k + 7 * i + seed);
      const room = gap - 0.35 - 0.25; // start 0.35 s after the line, end 0.25 s before the next
      e = makeSmile(0.35, r, { peak: [0.28, 0.38], hold: [1, 1.6] });
      const over = e.tin + e.hold + e.tout - room;
      if (over > 0) e.hold = Math.max(0.4, e.hold - over);
      smileCache.set(key, e);
      if (smileCache.size > 64) smileCache.delete(smileCache.keys().next().value!);
    }
    return e;
  };

  return {
    sample(t) {
      const b = blink(t);
      const pose = idleSway(t);
      const morphs: Record<string, number> = { ...ZERO_MORPHS, eyeBlinkLeft: b, eyeBlinkRight: b };
      // eyes + brows: lid tension / narrowing, inner-brow lifts, settles, Duchenne with the post-sentence smile
      let sqL = 0, sqR = 0, upL = 0, upR = 0, dnL = 0, dnR = 0;
      const addSmileEyes = (e: SmileEvent, after: number) => {
        const a = after - DUCHENNE.lag;
        if (a <= 0 || a >= smileEnd(e)) return;
        const d = duchenneMorphs({ smile: e.peak * smileEnvelope(e, a), asym: e.asym });
        sqL += d.eyeSquintLeft; sqR += d.eyeSquintRight;
      };
      let speaking = false;
      let lineIdx = -1;
      const u = t - lead;
      // from -0.4 s: the first line's anticipation ramps in like every later cycle's (no one-frame onset jump)
      if (u >= -0.4 && plan.length) {
        const k = Math.max(0, Math.floor(u / cycle));
        if (loop || k === 0) {
          const local = u - k * cycle;
          for (let i = 0; i < plan.length; i++) {
            const p = plan[i]!;
            // this cycle's instance, and (looping) the next cycle's, whose lead-in can start before the wrap
            for (const tl of loop ? [local - p.t0, local - cycle - p.t0] : [local - p.t0]) {
              if (tl >= -0.4 && tl <= p.dur + 0.4) {
                // speech (the track is rest outside [0, dur]; +-0.4 s lets it settle)
                const w = p.track.weightsAt(tl * 1000);
                for (const [m, v] of Object.entries(w)) morphs[m] = (morphs[m] ?? 0) + v;
                pose.pitch += p.track.nodAt(tl * 1000);
                if (tl >= 0 && tl <= p.dur) { speaking = true; lineIdx = i; }
                // a hint of eye narrowing on smiling / spread visemes (and the warm undertone)
                const sp = EXPR.lidSpread * 0.5 * ((w.mouthSmileLeft ?? 0) + (w.mouthSmileRight ?? 0));
                sqL += sp; sqR += sp;
                // engaged talking eyes: a warm lower-lid baseline that breathes slowly through the line, and a
                // brow lift at the phrase start that relaxes toward its end (intonation declination); accents ride on top
                const env = smoothstepRange(-0.25, 0.35, tl) * (1 - smoothstepRange(p.dur - 0.1, p.dur + 0.6, tl));
                const breath = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.33 * tl + 1.7 * i);
                const warm = env * (EXPR.talkSquint[0] + (EXPR.talkSquint[1] - EXPR.talkSquint[0]) * breath);
                sqL += warm * 1.04; sqR += warm * 0.96;
                const decl = env * EXPR.talkBrow * (1 - 0.7 * Math.min(1, Math.max(0, tl / Math.max(0.5, p.dur))));
                upL += decl; upR += decl * 0.9;
              }
              if (tl >= -0.5 && tl <= p.dur + EXPR_TAIL) {
                const x = sampleExpression(p.expr, tl);
                sqL += x.squintL; sqR += x.squintR; upL += x.upL; upR += x.upR; dnL += x.downL; dnR += x.downR;
              }
            }
            const after = local - p.t0 - p.dur;
            if (after > 0 && after < gap) {
              const e = postSmile(k, i);
              if (after < smileEnd(e)) {
                const s = smileMorphs({ smile: e.peak * smileEnvelope(e, after), asym: e.asym });
                for (const [m, v] of Object.entries(s)) morphs[m] = (morphs[m] ?? 0) + v;
              }
              addSmileEyes(e, after);
            }
          }
        } else if (!loop) {
          // one-shot finished: carry the last post-sentence smile, then plain idle (no idle smiles here)
          const p = plan[plan.length - 1]!;
          const after = u - p.t0 - p.dur;
          const e = postSmile(0, plan.length - 1);
          if (after < smileEnd(e)) {
            const s = smileMorphs({ smile: e.peak * smileEnvelope(e, after), asym: e.asym });
            for (const [m, v] of Object.entries(s)) morphs[m] = (morphs[m] ?? 0) + v;
          }
          addSmileEyes(e, after);
        }
      }
      for (const m in morphs) morphs[m] = Math.max(0, Math.min(1, morphs[m]!));
      morphs.mouthClose = Math.min(morphs.mouthClose!, morphs.jawOpen!);
      // capped; the lids hand over to the blink (squint + a full blink would overlap the lids)
      const open = 1 - b;
      morphs.eyeSquintLeft = Math.min(EXPR.maxSquint, sqL) * open;
      morphs.eyeSquintRight = Math.min(EXPR.maxSquint, sqR) * open;
      morphs.browInnerUpLeft = Math.min(EXPR.maxBrowUp, upL);
      morphs.browInnerUpRight = Math.min(EXPR.maxBrowUp, upR);
      morphs.browDownLeft = Math.min(EXPR.maxBrowDown, dnL);
      morphs.browDownRight = Math.min(EXPR.maxBrowDown, dnR);
      return { pose, morphs, speaking, line: lineIdx };
    },
  };
}

/** Duration (s) of one line as the performer times it (for clip lengths). */
export function lineDuration(line: Line, seed = 0, i = 0): number {
  return timeText(line.text, { lang: line.lang, seed: 7 + i + seed }).durationMs / 1000;
}
