#!/usr/bin/env node
// "Floor" map of a dot render: grey erosion (min filter, removes the dots) then a box blur, which leaves
// the low-frequency ghost shading (eye openings, lid folds, lip seam) that the dots sit on.
// usage: node floor.mjs --img 10.webp --out floor.png [--r 6] [--blur 3] [--mode min|p25]
import sharp from 'sharp';
import { arg } from './util.mjs';

const r = +arg('--r', 6);
const bl = +arg('--blur', 3);
const mode = arg('--mode', 'min');
const { data, info } = await sharp(arg('--img')).greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, C = info.channels;
const src = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) src[i] = data[i * C];
// separable min filter (square window) for 'min'; for 'p25' a 2-pass approx: min of row-means...
function minFilter(a) {
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 1e9;
    for (let d = -r; d <= r; d++) { const xx = Math.min(W - 1, Math.max(0, x + d)); const v = a[y * W + xx]; if (v < m) m = v; }
    t[y * W + x] = m;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 1e9;
    for (let d = -r; d <= r; d++) { const yy = Math.min(H - 1, Math.max(0, y + d)); const v = t[yy * W + x]; if (v < m) m = v; }
    o[y * W + x] = m;
  }
  return o;
}
function boxBlur(a, rad) {
  if (rad <= 0) return a;
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  for (let y = 0; y < H; y++) { let s = 0, n = 0; for (let x = -rad; x < W + rad; x++) { if (x + rad < W && x + rad >= 0) { s += a[y * W + x + rad]; n++; } if (x - rad - 1 >= 0) { s -= a[y * W + x - rad - 1]; n--; } if (x >= 0 && x < W) t[y * W + x] = s / n; } }
  for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let y = -rad; y < H + rad; y++) { if (y + rad < H && y + rad >= 0) { s += t[(y + rad) * W + x]; n++; } if (y - rad - 1 >= 0) { s -= t[(y - rad - 1) * W + x]; n--; } if (y >= 0 && y < H) o[y * W + x] = s / n; } }
  return o;
}
let f = minFilter(src);
if (mode === 'open') { // opening = dilate(erode): keeps broad bright areas, removes small dots
  const neg = f.map((v) => -v); const d = minFilter(neg); f = d.map((v) => -v);
}
f = boxBlur(f, bl);
const gain = +arg('--gain', 0);
let mx = 0; for (const v of f) if (v > mx) mx = v;
const k = gain > 0 ? gain : 255 / Math.max(1, mx);
const gam = +arg('--gamma', 0.7);
const out = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) out[i] = Math.round(255 * Math.pow(Math.min(1, (f[i] * k) / 255), gam));
await sharp(out, { raw: { width: W, height: H, channels: 1 } }).png().toFile(arg('--out'));
console.log(arg('--out'), 'max', mx.toFixed(1), 'gain', k.toFixed(2));
