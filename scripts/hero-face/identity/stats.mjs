#!/usr/bin/env node
// Population statistics of the metrics over random N(0,1) identities, and the per-mode effect of +1
// sigma on every metric (in population-sd units). Writes stats.json and mode-effects.json to --out.
// Usage: node stats.mjs --out <dir> [--n 2000]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { measure, femScore, FEM_WEIGHTS } from './metrics.mjs';
import { rng, gauss, arg } from './util.mjs';

const out = arg('--out', '.');
const N = +arg('--n', 2000);
fs.mkdirSync(out, { recursive: true });
ict.loadAllIdentities();
const r = rng(12345);
const rows = [];
const t0 = Date.now();
for (let s = 0; s < N; s++) {
  const w = Array.from({ length: ict.NUM_IDS }, () => gauss(r));
  rows.push(measure(ict.blend(w)));
}
const keys = Object.keys(rows[0]);
const stats = {};
for (const k of keys) {
  const v = rows.map((m) => m[k]);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  stats[k] = { mean, sd };
}
const mean = measure(ict.neutral());
fs.writeFileSync(path.join(out, 'stats.json'), JSON.stringify({ n: N, stats, meanFace: mean }, null, 1));

// per-mode effects (central difference at +-1)
const effects = [];
for (let i = 0; i < ict.NUM_IDS; i++) {
  const wp = new Array(ict.NUM_IDS).fill(0), wm = new Array(ict.NUM_IDS).fill(0);
  wp[i] = 1;
  wm[i] = -1;
  const mp = measure(ict.blend(wp)), mn = measure(ict.blend(wm));
  const e = {};
  for (const k of keys) e[k] = (mp[k] - mn[k]) / 2 / (stats[k].sd || 1);
  const fp = femScore(mp, stats).score, fm = femScore(mn, stats).score;
  effects.push({ mode: i, femPerSigma: (fp - fm) / 2, effects: e });
}
fs.writeFileSync(path.join(out, 'mode-effects.json'), JSON.stringify(effects, null, 1));
console.log(`n=${N} in ${Date.now() - t0} ms`);
for (const e of effects) {
  const top = Object.entries(e.effects)
    .filter(([k]) => k !== 'asym')
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 6)
    .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v.toFixed(2)}`)
    .join(' ');
  console.log(`mode ${String(e.mode).padStart(2)} fem/σ ${e.femPerSigma.toFixed(2).padStart(6)} | ${top}`);
}
