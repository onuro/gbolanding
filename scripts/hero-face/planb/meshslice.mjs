#!/usr/bin/env node
// Plan B: cross-section of a lab mesh (plane x = const, drawn as z right / y up) with part colours, to inspect the
// lid / lash-strip / eyeball stack and the lips in profile.
//   node meshslice.mjs --mesh lab/mesh-sfb.json --out o.png --x 0.25 [--rect z0,y0,z1,y1] [--px 900] [--expr k:w,...]
//   several meshes: --mesh a.json,b.json (drawn in white / orange)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '../../../package.json'));
const sharp = require('sharp');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const PB = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb';
const OUT = arg('out', '/tmp/slice.png');
const XS = +arg('x', 0.25);
const [z0, y0, z1, y1] = arg('rect', '-0.2,-0.15,0.2,0.2').split(',').map(Number);
const PXW = +arg('px', 900);
const EXPR = (arg('expr', '') || '').split(',').filter(Boolean).map((kv) => { const [k, w] = kv.split(':'); return [k, +w]; });
const Wpx = PXW, Hpx = Math.round((PXW * (y1 - y0)) / (z1 - z0));
const sc = Wpx / (z1 - z0);
const img = Buffer.alloc(Wpx * Hpx * 3);
const partCol = [[235, 235, 235], [255, 70, 70], [255, 255, 120], [120, 200, 255], [60, 120, 255], [255, 160, 40]];
const meshCol = [null, [255, 150, 60], [120, 255, 120]];
const plot = (x, y, c) => { if (x < 0 || y < 0 || x >= Wpx || y >= Hpx) return; const o = (y * Wpx + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
const line = (ax, ay, bx, by, c) => { const n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))) + 1; for (let k = 0; k <= n; k++) plot(Math.round(ax + ((bx - ax) * k) / n), Math.round(ay + ((by - ay) * k) / n), c); };
// grid every 0.05 W
for (let g = Math.ceil(z0 / 0.05) * 0.05; g < z1; g += 0.05) line((g - z0) * sc, 0, (g - z0) * sc, Hpx - 1, Math.abs(g) < 1e-6 ? [70, 70, 90] : [35, 35, 35]);
for (let g = Math.ceil(y0 / 0.05) * 0.05; g < y1; g += 0.05) line(0, (y1 - g) * sc, Wpx - 1, (y1 - g) * sc, Math.abs(g) < 1e-6 ? [70, 70, 90] : [35, 35, 35]);
const meshes = arg('mesh', 'lab/mesh-sfb.json').split(',');
meshes.forEach((m, mi) => {
  const SRC = resolve(PB, m);
  const hdr = JSON.parse(readFileSync(SRC, 'utf8'));
  const buf = readFileSync(SRC.replace(/\.json$/, '.bin'));
  const view = (k) => { const l = hdr.layout[k]; const b = buf.buffer.slice(buf.byteOffset + l.offset, buf.byteOffset + l.offset + l.count * l.size * 4); return l.type === 'u32' ? new Uint32Array(b) : new Float32Array(b); };
  const P = view('position'), bake = view('bake'), idx = view('index');
  // connected components: shells other than the largest few get their own colours (brows / lashes)
  const NVc = P.length / 3; const par = new Int32Array(NVc).map((_, i) => i);
  const fnd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < idx.length; t += 3) { const r = fnd(idx[t]); par[fnd(idx[t + 1])] = r; par[fnd(idx[t + 2])] = r; }
  const size = new Map(); for (let i = 0; i < NVc; i++) { const r = fnd(i); size.set(r, (size.get(r) || 0) + 1); }
  const shellCol = (i) => { const n = size.get(fnd(i)); return n === 452 ? [255, 80, 200] : n === 352 ? [80, 255, 120] : n === 82 ? [255, 200, 0] : null; };
  for (const [name, w] of EXPR) { if (!hdr.layout[`morph:${name}:position`]) continue; const dp = view(`morph:${name}:position`); for (let q = 0; q < P.length; q++) P[q] += w * dp[q]; }
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    const pts = [];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3];
      const da = P[a * 3] - XS, db = P[b * 3] - XS;
      if ((da < 0) === (db < 0)) continue;
      const s = da / (da - db);
      pts.push([P[a * 3 + 2] + s * (P[b * 3 + 2] - P[a * 3 + 2]), P[a * 3 + 1] + s * (P[b * 3 + 1] - P[a * 3 + 1])]);
    }
    if (pts.length !== 2) continue;
    const c = meshCol[mi] || shellCol(v[0]) || partCol[Math.round(bake[v[0] * 4 + 3])] || [255, 0, 255];
    line((pts[0][0] - z0) * sc, (y1 - pts[0][1]) * sc, (pts[1][0] - z0) * sc, (y1 - pts[1][1]) * sc, c);
  }
});
await sharp(img, { raw: { width: Wpx, height: Hpx, channels: 3 } }).png().toFile(OUT);
console.log(OUT, Wpx, Hpx);
