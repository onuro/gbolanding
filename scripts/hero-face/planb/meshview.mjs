#!/usr/bin/env node
// Plan B: quick software raster of a lab mesh (z-buffered triangles, front ortho or yawed), grey clay shading
// plus optional overlays, for checking look-mesh edits (lids, lash strip, lips, nose) without the engine.
//   node meshview.mjs --mesh lab/mesh-sfb.json --out o.png [--rect x0,y0,x1,y1 (W, y up)] [--px 900]
//        [--expr jawOpen:0.3,...] [--yaw deg] [--overlay part|featw|featx|featz|feat|bakex|bakey|none]
//        [--light x,y,z]
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
const SRC = resolve(PB, arg('mesh', 'lab/mesh-sfb.json'));
const OUT = arg('out', '/tmp/meshview.png');
const [x0, y0, x1, y1] = arg('rect', '-0.6,-0.9,0.6,0.7').split(',').map(Number);
const PXW = +arg('px', 900);
const OVER = arg('overlay', 'none');
const YAW = (+arg('yaw', 0) * Math.PI) / 180;
const LIGHT = arg('light', '-0.12,0.72,0.68').split(',').map(Number);
const EXPR = (arg('expr', '') || '').split(',').filter(Boolean).map((kv) => { const [k, w] = kv.split(':'); return [k, +w]; });

const hdr = JSON.parse(readFileSync(SRC, 'utf8'));
const buf = readFileSync(SRC.replace(/\.json$/, '.bin'));
const L = hdr.layout;
const view = (k) => {
  const l = L[k];
  const b = buf.buffer.slice(buf.byteOffset + l.offset, buf.byteOffset + l.offset + l.count * l.size * 4);
  return l.type === 'u32' ? new Uint32Array(b) : new Float32Array(b);
};
const P = view('position'), N = view('normal'), bake = view('bake'), feat = view('feat'), idx = view('index');
const NV = hdr.vertexCount;
for (const [name, w] of EXPR) {
  const dp = view(`morph:${name}:position`), dn = view(`morph:${name}:normal`);
  for (let q = 0; q < NV * 3; q++) { P[q] += w * dp[q]; N[q] += w * dn[q]; }
}
const cy = Math.cos(YAW), sy = Math.sin(YAW);
const X = new Float32Array(NV), Y = new Float32Array(NV), Z = new Float32Array(NV);
for (let i = 0; i < NV; i++) { X[i] = cy * P[i * 3] + sy * P[i * 3 + 2]; Y[i] = P[i * 3 + 1]; Z[i] = -sy * P[i * 3] + cy * P[i * 3 + 2]; }
const Wpx = PXW, Hpx = Math.round((PXW * (y1 - y0)) / (x1 - x0));
const sc = Wpx / (x1 - x0);
const zb = new Float32Array(Wpx * Hpx).fill(-1e9);
const img = Buffer.alloc(Wpx * Hpx * 3);
const ll = Math.hypot(...LIGHT); const Ld = LIGHT.map((v) => v / ll);
const partCol = [[200, 200, 200], [255, 60, 60], [255, 255, 120], [120, 200, 255], [60, 120, 255], [255, 160, 40]];
const shade = (i) => {
  let nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2];
  const rx = cy * nx + sy * nz, rz = -sy * nx + cy * nz; nx = rx; nz = rz;
  const l = Math.hypot(nx, ny, nz) || 1;
  const d = Math.max(0, (nx * Ld[0] + ny * Ld[1] + nz * Ld[2]) / l);
  let g = 0.18 + 0.82 * d;
  let c = [g * 235, g * 230, g * 225];
  const part = Math.round(bake[i * 4 + 3]);
  const tint = (col, a) => { c = c.map((v, k) => v * (1 - a) + col[k] * g * a); };
  if (OVER === 'part' && part) tint(partCol[part], 0.7);
  if (OVER === 'featw' || OVER === 'feat') tint([255, 120, 0], Math.min(1, feat[i * 4 + 3]));
  if (OVER === 'featx' || OVER === 'feat') tint(feat[i * 4 + 1] > 0 ? [255, 60, 160] : [60, 255, 160], Math.min(1, feat[i * 4]) * 0.8);
  if (OVER === 'featz' || OVER === 'feat') tint([80, 160, 255], Math.min(1, feat[i * 4 + 2]));
  if (OVER === 'bakex') c = [bake[i * 4] * 255, bake[i * 4] * 255, bake[i * 4] * 255];
  if (OVER === 'bakey') c = [bake[i * 4 + 1] * 255, bake[i * 4 + 1] * 255, bake[i * 4 + 1] * 255];
  return c;
};
const col = new Float32Array(NV * 3);
for (let i = 0; i < NV; i++) col.set(shade(i), i * 3);
for (let t = 0; t < idx.length; t += 3) {
  const a = idx[t], b = idx[t + 1], c = idx[t + 2];
  const ax = (X[a] - x0) * sc, ay = (y1 - Y[a]) * sc, bx = (X[b] - x0) * sc, by = (y1 - Y[b]) * sc, cx = (X[c] - x0) * sc, cyy = (y1 - Y[c]) * sc;
  const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxx = Math.min(Wpx - 1, Math.ceil(Math.max(ax, bx, cx)));
  const miny = Math.max(0, Math.floor(Math.min(ay, by, cyy))), maxy = Math.min(Hpx - 1, Math.ceil(Math.max(ay, by, cyy)));
  if (minx > maxx || miny > maxy) continue;
  const den = (by - cyy) * (ax - cx) + (cx - bx) * (ay - cyy);
  if (Math.abs(den) < 1e-12) continue;
  for (let py = miny; py <= maxy; py++) for (let px = minx; px <= maxx; px++) {
    const u = ((by - cyy) * (px + 0.5 - cx) + (cx - bx) * (py + 0.5 - cyy)) / den;
    const v = ((cyy - ay) * (px + 0.5 - cx) + (ax - cx) * (py + 0.5 - cyy)) / den;
    const w = 1 - u - v;
    if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
    const z = u * Z[a] + v * Z[b] + w * Z[c];
    const o = py * Wpx + px;
    if (z <= zb[o]) continue;
    zb[o] = z;
    for (let k = 0; k < 3; k++) img[o * 3 + k] = Math.max(0, Math.min(255, u * col[a * 3 + k] + v * col[b * 3 + k] + w * col[c * 3 + k]));
  }
}
await sharp(img, { raw: { width: Wpx, height: Hpx, channels: 3 } }).png().toFile(OUT);
console.log(OUT, Wpx, Hpx);
