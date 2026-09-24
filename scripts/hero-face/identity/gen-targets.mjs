#!/usr/bin/env node
// Build target-fitted candidates (presets x prior centres) into an extra.json for candidates.mjs.
// Usage: node gen-targets.mjs --out <labDir> --round r2 [--lambda 0.3] [--reps 4] [--beta 0.6]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { PRESETS } from './presets.mjs';
import { fitTargets, ANTISYM } from './optimise.mjs';
import { rng, gauss, arg } from './util.mjs';

const out = arg('--out', '.');
const round = arg('--round', 'r2');
const lambda = +arg('--lambda', 0.3);
const reps = +arg('--reps', 4);
const beta = +arg('--beta', 0.6);
const seed = +arg('--seed', 101);
const presetFilter = arg('--presets', '');
const { stats } = JSON.parse(fs.readFileSync(path.join(out, 'data', 'stats.json'), 'utf8'));
ict.loadAllIdentities();

const r = rng(seed);
const list = [];
for (const [name, targets] of Object.entries(PRESETS)) {
  if (presetFilter && !presetFilter.split(',').includes(name)) continue;
  for (let k = 0; k <= reps; k++) {
    const mu = k === 0 ? null : Array.from({ length: ict.NUM_IDS }, (_, i) => (ANTISYM.includes(i) ? 0 : beta * gauss(r)));
    const { w, resid } = fitTargets({ stats, targets, mu, lambda });
    const worst = Object.entries(resid).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([a, b]) => `${a}${b}`).join(' ');
    list.push({ id: `${round}${name}${k}`, tag: `${name}${k ? ' mu~' + beta : ' mu=0'}`, w: w.map((x) => +x.toFixed(3)), note: `target fit preset=${name} lambda=${lambda} worst:${worst}` });
    process.stdout.write('.');
  }
}
fs.writeFileSync(path.join(out, `${round}-extra.json`), JSON.stringify(list, null, 1));
console.log(`\n${list.length} -> ${path.join(out, `${round}-extra.json`)}`);
