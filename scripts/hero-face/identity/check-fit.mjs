#!/usr/bin/env node
// Intersection checks (check-expr.mjs) for a fitted identity WITH its rest expression baked in,
// against the mean face baseline: jawOpen / speech visemes / mouthClose / blinks.
// usage: node check-fit.mjs --fit fit.json [--rest rest.json] [--out dir --name tag] [--render 1]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { checkIdentity, verdict } from './check-expr.mjs';
import { portrait } from './portrait.mjs';
import { writePNG } from './png.mjs';
import { arg } from './util.mjs';

const j = JSON.parse(fs.readFileSync(arg('--fit'), 'utf8'));
const w = (Array.isArray(j) ? j : j.weights).map(Number);
let rest = j.expr || {};
if (arg('--rest', '')) rest = JSON.parse(fs.readFileSync(arg('--rest'), 'utf8')).expr || {};
const add = (e) => { const o = { ...rest }; for (const [k, v] of Object.entries(e)) o[k] = (o[k] || 0) + v; return o; };
const SETS = {
  rest: {},
  jaw05: { jawOpen: 0.5 },
  jaw055: { jawOpen: 0.55 },
  jaw05_speech: { jawOpen: 0.5, mouthLowerDown_L: 0.3, mouthLowerDown_R: 0.3, mouthUpperUp_L: 0.1, mouthUpperUp_R: 0.1 },
  jaw05_close05: { jawOpen: 0.5, mouthClose: 0.5 },
  close03: { mouthClose: 0.3 },
  jaw03_close03: { jawOpen: 0.3, mouthClose: 0.3 },
  jaw02_funnel: { jawOpen: 0.2, mouthFunnel: 0.3, mouthPucker: 0.2 },
  blink05: { eyeBlink_L: 0.5, eyeBlink_R: 0.5 },
  blink1: { eyeBlink_L: 1, eyeBlink_R: 1 },
  jaw05_blink1: { jawOpen: 0.5, eyeBlink_L: 1, eyeBlink_R: 1 },
};
const sets = Object.fromEntries(Object.entries(SETS).map(([k, e]) => [k, add(e)]));
const base = checkIdentity(new Array(ict.NUM_IDS).fill(0), { exprSets: SETS });
const r = checkIdentity(w, { exprSets: sets });
// smallest eyeBlink that closes the lids as well as the mean face at 1.0
const bl = {};
for (const b of [1, 1.05, 1.1, 1.15, 1.2, 1.3]) bl['b' + b] = add({ eyeBlink_L: b, eyeBlink_R: b });
const blr = checkIdentity(w, { exprSets: bl });
const eyeBlinkMax = +(Object.entries(blr).find(([, v]) => v.eyeUncoveredFrac <= base.blink1.eyeUncoveredFrac + 0.005)?.[0].slice(1) ?? 1.3);
const issues = verdict(r, base);
const out = { issues, eyeBlinkMax, restLipGapCm: r.rest.lipSeamCm, checks: r, meanFace: base };
if (arg('--out', '')) {
  const dir = arg('--out'); const name = arg('--name', 'fit');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}-check.json`), JSON.stringify(out, null, 1));
  if (arg('--render', '1') === '1') {
    for (const [tag, e, view] of [['jaw05', SETS.jaw05_speech, 'front'], ['jaw05q', SETS.jaw05, 'q34'], ['close03', SETS.jaw03_close03, 'front'], ['blink1', { eyeBlink_L: eyeBlinkMax, eyeBlink_R: eyeBlinkMax }, 'front']]) {
      const pr = portrait(ict.blend(w, add(e)), view, { width: 360, height: 440, teeth: true, ao: 24, wFrac: 0.62 });
      writePNG(path.join(dir, `${name}_${tag}.png`), pr.W, pr.H, pr.rgb);
    }
  }
}
console.log(JSON.stringify({ issues, eyeBlinkMax, restLipGapCm: r.rest.lipSeamCm, rest: { teethInside: r.rest.teethInside, teethPokeOut: r.rest.teethPokeOut }, jaw05: { teethInside: r.jaw05.teethInside, teethPokeOut: r.jaw05.teethPokeOut, max: r.jaw05.teethMaxDepthMm }, blink1Unc: r.blink1.eyeUncoveredFrac, baseBlink1Unc: base.blink1.eyeUncoveredFrac }, null, 1));
