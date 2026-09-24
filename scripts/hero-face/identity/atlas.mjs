#!/usr/bin/env node
// Mode atlas: every identity mode at -A and +A sigma (front + profile), plus a labelled sheet.
// Usage: node atlas.mjs --out <dir> [--amp 2.5] [--modes 0-29]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { renderFace } from './render-face.mjs';
import { makeSheet } from './sheet.mjs';
import { arg } from './util.mjs';

const out = arg('--out', '.');
const amp = +arg('--amp', 2.5);
const [m0, m1] = arg('--modes', '0-29').split('-').map(Number);
const effPath = path.join(out, 'data', 'mode-effects.json');
const eff = fs.existsSync(effPath) ? JSON.parse(fs.readFileSync(effPath, 'utf8')) : [];
const dir = path.join(out, 'atlas');
const tiles = [];
for (let i = m0; i <= m1; i++) {
  const imgs = [];
  for (const s of [-1, 1]) {
    const w = new Array(ict.NUM_IDS).fill(0);
    w[i] = s * amp;
    const f = renderFace(ict.blend(w), dir, `m${String(i).padStart(2, '0')}${s < 0 ? 'n' : 'p'}`, { views: ['front', 'profile'], width: 200, height: 250, ao: 24 });
    imgs.push(f.front, f.profile);
  }
  const e = eff[i];
  const top = e
    ? Object.entries(e.effects).filter(([k]) => k !== 'asym').sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5)
        .map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v.toFixed(2)}`).join(' ')
    : '';
  tiles.push({
    imgs: [imgs[0], imgs[2], imgs[1], imgs[3]].map((f) => path.relative(dir, f)),
    label: `mode ${i}: -${amp} | +${amp}  (front-, front+, profile-, profile+)  fem/σ ${e ? e.femPerSigma.toFixed(2) : '?'}`,
    sub: `per +1σ: ${top}`,
  });
  process.stdout.write(`${i} `);
}
const png = makeSheet({ dir, name: `atlas_${m0}-${m1}`, title: `ICT identity modes ${m0}-${m1} at ±${amp}σ`, note: 'Each tile: front at -A, front at +A, profile at -A, profile at +A. Metric deltas are per +1σ in population-sd units.', tiles, cols: 3, tileW: 200, tileH: 250 });
console.log('\n' + png);
