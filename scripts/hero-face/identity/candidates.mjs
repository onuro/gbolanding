#!/usr/bin/env node
// Generate identity candidates (random draws ranked by the femininity score + directed draws along the
// score gradient), measure them, render front / 3-4 / dot preview and build a labelled contact sheet.
// Usage: node candidates.mjs --out <labDir> --round r1 [--extra extra.json] [--seed 7] [--nRandom 16 --nDirected 16]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { measure, femScore, targetFit } from './metrics.mjs';
import { PRESETS } from './presets.mjs';
import { renderFace } from './render-face.mjs';
import { makeSheet } from './sheet.mjs';
import { rng, gauss, arg, clampW } from './util.mjs';

export const ANTISYM = [9, 20, 25, 28]; // purely left/right-antisymmetric modes (measured: asymFrac 1.00)
const out = arg('--out', '.');
const round = arg('--round', 'r1');
const seed = +arg('--seed', 7);
const nRandom = +arg('--nRandom', 16);
const nDirected = +arg('--nDirected', 0);
const extraPath = arg('--extra', '');
const { stats } = JSON.parse(fs.readFileSync(path.join(out, 'data', 'stats.json'), 'utf8'));
const effects = JSON.parse(fs.readFileSync(path.join(out, 'data', 'mode-effects.json'), 'utf8'));
ict.loadAllIdentities();

const g = effects.map((e) => (ANTISYM.includes(e.mode) ? 0 : e.femPerSigma));
const gn = Math.hypot(...g);
const gh = g.map((v) => v / gn);
const r = rng(seed);
const draw = (asymScale = 0.25) => Array.from({ length: ict.NUM_IDS }, (_, i) => gauss(r) * (ANTISYM.includes(i) ? asymScale : 1));
const rank = arg('--rank', 'fit');
const TGT = PRESETS[arg('--targets', 'bal')];
const score = (w) => { const m = measure(ict.blend(w)); return rank === 'fit' ? targetFit(m, stats, TGT) : femScore(m, stats).score; };

const cands = [];
if (nRandom > 0) {
  const pool = [];
  for (let s = 0; s < 4000; s++) {
    const w = draw();
    if (Math.max(...w.map(Math.abs)) > 2.5) continue;
    // cheap linear proxy first, exact score for the promising ones
    const lin = w.reduce((a, x, i) => a + x * g[i], 0);
    pool.push({ w, lin });
  }
  pool.sort((a, b) => b.lin - a.lin);
  const top = pool.slice(0, 400).map((p) => ({ ...p, s: score(p.w) })).sort((a, b) => b.s - a.s);
  const picked = [];
  for (const p of top) {
    if (picked.every((q) => Math.hypot(...q.w.map((x, i) => x - p.w[i])) > 3.5)) picked.push(p);
    if (picked.length >= nRandom) break;
  }
  picked.forEach((p, k) => cands.push({ id: `${round}R${String(k).padStart(2, '0')}`, w: p.w, note: `random N(0,1), top ${rank} of 4000` }));
}
if (nDirected > 0) {
  const alphas = [2.5, 3, 3.5, 4];
  const betas = [0.35, 0.7];
  let k = 0;
  for (let rep = 0; rep < Math.ceil(nDirected / (alphas.length * betas.length)); rep++) {
    for (const a of alphas) for (const b of betas) {
      if (k >= nDirected) break;
      const rr = draw(0.5);
      const dot = rr.reduce((s, x, i) => s + x * gh[i], 0);
      const perp = rr.map((x, i) => x - dot * gh[i]);
      const w = clampW(gh.map((x, i) => a * x + b * perp[i]));
      cands.push({ id: `${round}D${String(k).padStart(2, '0')}`, w, note: `directed: ${a} along fem gradient + ${b} x random residual` });
      k++;
    }
  }
}
if (extraPath) {
  for (const e of JSON.parse(fs.readFileSync(extraPath, 'utf8'))) cands.push({ ...e, w: clampW(e.w.concat(new Array(ict.NUM_IDS).fill(0)).slice(0, ict.NUM_IDS)) });
}

const dir = path.join(out, 'cands');
fs.mkdirSync(dir, { recursive: true });
const tiles = [];
const rows = [];
for (const c of cands) {
  const P = ict.blend(c.w);
  const m = measure(P);
  const f = femScore(m, stats);
  const files = renderFace(P, dir, c.id, { views: ['front', 'q34', 'dots'], width: 260, height: 320, ao: 24 });
  const norm = Math.hypot(...c.w);
  const fit = targetFit(m, stats, TGT);
  rows.push({ ...c, score: f.score, fit, norm, maxAbs: Math.max(...c.w.map(Math.abs)), metrics: m, z: f.z });
  const zs = f.z;
  tiles.push({
    imgs: [files.front, files.q34, files.dots].map((p) => path.relative(dir, p)),
    label: `${c.id}  fit ${fit.toFixed(2)}  fem ${f.score.toFixed(1)}  |w| ${norm.toFixed(1)}${c.tag ? '  ' + c.tag : ''}`,
    sub: `brow ${zs.browProt.toFixed(1)} jaw ${zs.jawRatio.toFixed(1)} chinH ${zs.chinH.toFixed(1)} lipH ${zs.lipH.toFixed(1)} noseW ${zs.noseW.toFixed(1)} neck ${zs.neckW.toFixed(1)} malar ${zs.malarProj.toFixed(1)} cran ${zs.cranioFacial.toFixed(1)} eye/face ${zs.eyeToFace.toFixed(1)}`,
  });
  process.stdout.write(`${c.id}(${fit.toFixed(2)}) `);
}
fs.writeFileSync(path.join(out, `${round}-candidates.json`), JSON.stringify(rows, null, 1));
const png = makeSheet({ dir, name: `sheet-${round}`, title: `Identity candidates ${round}`, note: 'front | 3/4 | dot preview (ref-2 key light). z-scores vs random N(0,1) identities; female direction: brow-, jaw-, chinH-, lipH+, noseW-, neck-, malar+.', tiles, cols: 4, tileW: 260, tileH: 320 });
console.log('\n' + png);
