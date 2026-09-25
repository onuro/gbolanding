// Hero-face lip-sync driver (framework-free, no deps). Mimicked speech from text for now; the voice path can later
// feed timed phonemes / visemes straight into buildTrack() instead of text.
//
//   const timed = timeText('Merhaba, ben ...', { lang: 'tr' });           // G2P + durations + pauses + accents
//   const track = buildTrack(timed.segments, { style: 'minimal', accents: timed.accents });
//   engine.setMorphs(track.weightsAt(tMs));                                // 12 mouth morphs, mouthClose <= jawOpen
//
// or the whole preview behaviour (idle sway, blinks, idle / post-sentence smiles, talk loop):
//   const perf = createPerformer({ mode: 'talk', style: 'minimal', lang: 'both' });
//   const { pose, morphs } = perf.sample(tSec); engine.setPose(pose); engine.setMorphs(morphs);
export { createPerformer, lineDuration, SITE_LINES, type Line, type PerformerOptions } from './performer';
export type { Performer, PerformerSample } from './idle';
export { createBlinks, createIdlePerformer, createIdleSmiles, DUCHENNE, duchenneMorphs, idleSway, smileMorphs, ZERO_MORPHS } from './idle';
export { EXPR, EXPRESSION_MORPHS, planExpression, sampleExpression, type ExprPlan, type ExprValue } from './expression';
export { timeText, tokenize, type Lang, type Segment, type Timed, type TimingOptions } from './timing';
export { buildTrack, visemeWeights, MOUTH_MORPHS, resolveStyle, type MorphWeights, type Track, type TrackOptions } from './track';
export { DOMINANCE, STYLES, TARGETS, type LipStyle, type StyleName } from './visemes';
export { PHONEMES, type Viseme } from './phonemes';
export { trWord } from './g2p-tr';
export { enWord } from './g2p-en';
