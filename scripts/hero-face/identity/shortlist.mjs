#!/usr/bin/env node
// Re-render chosen candidates bigger (front, 3/4, ref-2 key light, dot preview) into a labelled sheet.
// Usage: node shortlist.mjs --out <labDir> --name sl1 --from r4-candidates.json,r5-candidates.json --ids a,b,c
//        [--size 340x416] [--cols 2] [--views front,q34,ref,dots] [--labels "id=text;id=text"]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { measure, femScore } from './metrics.mjs';
import { renderFace } from './render-face.mjs';
import { makeSheet } from './sheet.mjs';
import { arg } from './util.mjs';

const out = arg('--out', '.');
const name = arg('--name', 'shortlist');
const from = arg('--from', '').split(',').filter(Boolean).map((f) => (path.isAbsolute(f) ? f : path.join(out, f)));
const ids = arg('--ids', '').split(',').filter(Boolean);
const [tw, th] = arg('--size', '340x416').split('x').map(Number);
const cols = +arg('--cols', 2);
const views = arg('--views', 'front,q34,ref,dots').split(',');
const title = arg('--title', `Shortlist ${name}`);
const note = arg('--note', 'front (soft key) | 3/4 | ref-2 key light (-0.16, 0.85, 0.50) | quick dot preview at W/59 pitch');
const labels = Object.fromEntries(arg('--labels', '').split(';').filter(Boolean).map((s) => s.split('=')));
const { stats } = JSON.parse(fs.readFileSync(path.join(out, 'data', 'stats.json'), 'utf8'));
const all = from.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
ict.loadAllIdentities();
const dir = path.join(out, name);
fs.mkdirSync(dir, { recursive: true });
const tiles = [];
for (const id of ids) {
  const c = all.find((x) => x.id === id);
  if (!c) throw new Error('unknown id ' + id);
  const P = ict.blend(c.w);
  const z = femScore(measure(P), stats).z;
  const files = renderFace(P, dir, id, { views, width: tw, height: th, ao: 36 });
  tiles.push({
    imgs: views.map((v) => path.relative(dir, files[v])),
    label: `${labels[id] || id}`,
    sub: `z: brow ${z.browProt.toFixed(1)} eyeDeep ${z.eyeDeep.toFixed(1)} jaw ${z.jawRatio.toFixed(1)} chin ${z.chinRatio.toFixed(1)} lips ${z.lipH.toFixed(1)} noseW ${z.noseW.toFixed(1)} hump ${z.noseHump.toFixed(1)} malar ${z.malarProj.toFixed(1)} neck ${z.neckW.toFixed(1)} | ${c.note || ''}`.slice(0, 190),
  });
  process.stdout.write(id + ' ');
}
console.log('\n' + makeSheet({ dir, name, title, note, tiles, cols, tileW: tw, tileH: th }));
