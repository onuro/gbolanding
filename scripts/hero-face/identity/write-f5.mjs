#!/usr/bin/env node
// Write the renderer hand-off files from a fit-ref2.mjs run:
//   <dir>/f5-fit.json  : {"weights":[30]}  (lab-mesh.mjs --identity f5-fit.json)
//   <dir>/f5-rest.json : static rest expression, baked into the base like lab-mesh.mjs --expr does
// usage: node write-f5.mjs --run runs/c2.json --dir <identity dir> --version v1 [--check check.json] [--note "..."]
import fs from 'node:fs';
import path from 'node:path';
import { arg } from './util.mjs';

const run = JSON.parse(fs.readFileSync(arg('--run'), 'utf8'));
const dir = arg('--dir');
const version = arg('--version', 'v1');
const check = arg('--check', '') ? JSON.parse(fs.readFileSync(arg('--check'), 'utf8')) : null;
const now = new Date().toISOString();
const fit = {
  name: 'f5-fit',
  version,
  updated: now,
  note: 'Identity #5 "Youthful round" (r6fem2s4) refitted to ref 2 (images/10.webp) landmarks: ICT-FaceKit Light identity000..029 weights, face = neutral + sum w_i (identity_i - neutral). Use with f5-rest.json (rest expression). Built by scripts/hero-face/identity/fit-ref2.mjs.',
  usage: 'node scripts/hero-face/lab-mesh.mjs --identity f5-fit.json --expr "$(node -p \'require(`./f5-rest.json`).exprArg\')" --name f5fit',
  source: { base: 'r6fem2s4', run: path.basename(arg('--run')), pitchDeg: run.pitchDeg },
  weights: run.weights,
  weightsBefore: [2.4, -0.449, -0.179, 0.069, -1.215, 0.351, -1.069, -0.047, -0.358, 0, -0.134, 0.727, -0.154, 0.131, -0.752, -0.263, 1.168, 1.107, 0.758, 0.225, 0, -0.609, -1.073, 0.129, -0.896, 0, -1.098, 0.257, 0, 0.704],
  maxAbs: +Math.max(...run.weights.map(Math.abs)).toFixed(3),
  landmarkError: {
    unit: 'px in 10.webp (W = 824 px) and fraction of W; 46 hand-marked ref-2 landmarks, left/right averaged',
    before: run.lmBefore, after: run.lmAfter,
  },
  femininity: run.fem,
};
const exprArg = Object.entries(run.expr).map(([k, v]) => `${k}=${v}`).join(',');
const rest = {
  name: 'f5-rest',
  version,
  updated: now,
  note: 'Static rest-pose expression for f5-fit.json, as ICT expression weights (source OBJ names; ARKit names in exprArkit). Bake it into the base mesh (lab-mesh.mjs --expr <exprArg>) so the rest face (pupils, landmarks, bake) is computed with it; lip-sync / blink morphs then add on top. The smile is INCLUDED here, so the runtime baseline smile (PLAN 5: mouthSmile 0.06) should be 0 when this rest pose is baked, or the face over-smiles.',
  expr: run.expr,
  exprArg,
  exprArkit: Object.fromEntries(Object.entries(run.expr).map(([k, v]) => [k.replace(/_L$/, 'Left').replace(/_R$/, 'Right'), v])),
  pose: { pitchDeg: run.pitchDeg || 0, note: 'fitted at pose 0 (no head pitch needed)' },
  framing: {
    note: 'Ref 2 measured pupils (iris-disc centres): R (789,716), L (1201,718) device px -> pupil midpoint (995, 717), W = 2 IPD = 824 px. The lab currently frames ref 2 with origin (990.5, 703.5), W 818 (catchlight midpoint): that puts our pupils ~13 px (1 grid row) above ref 2\'s. Pupil-aligned framing would be origin [995, 717], W 824.',
    ref2PupilOrigin: [995, 717],
    ref2W: 824,
  },
  checks: check ? { issues: check.issues, eyeBlinkMax: check.eyeBlinkMax, restLipGapCm: check.restLipGapCm, teethPokeOut: Object.fromEntries(Object.entries(check.checks).map(([k, v]) => [k, v.teethPokeOut])) } : null,
};
fs.writeFileSync(path.join(dir, 'f5-fit.json'), JSON.stringify(fit, null, 1));
fs.writeFileSync(path.join(dir, 'f5-rest.json'), JSON.stringify(rest, null, 1));
console.log('wrote', path.join(dir, 'f5-fit.json'), path.join(dir, 'f5-rest.json'), exprArg);
