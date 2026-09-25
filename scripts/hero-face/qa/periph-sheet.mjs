#!/usr/bin/env node
// Periphery sheet: ref 2 | render (| more renders) for the face-to-particles transition zones.
//   node qa/periph-sheet.mjs --ref 10.webp --out sheet.png render1.png [render2.png ...] [--labels a,b] [--title t]
//   [--regions periph|full] [--scale 1]
// All images framed like ref 2 (1832x1580 device px, W = 818 px, origin = catchlight midpoint 990.5, 703.5).
import sharp from 'sharp';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const ref = resolve(opt('ref'));
const out = resolve(opt('out', 'periph.png'));
const title = opt('title', '');
const labels = (opt('labels', '') || '').split(',').filter(Boolean);
const set = opt('regions', 'periph');
const gscale = +opt('scale', '1');
const renders = argv.map((p) => resolve(p));
const head = { cx: 990.5, ey: 703.5, W: 818 };

// [name, u0, v0, u1, v1, scale] in W (v down)
const SETS = {
  periph: [
    ['crown / forehead top', -0.62, -0.98, 0.62, -0.38, 0.75],
    ['temple + cheek side (viewer-left)', -1.0, -0.45, -0.3, 0.55, 0.75],
    ['temple + cheek side (viewer-right)', 0.3, -0.45, 1.0, 0.55, 0.75],
    ['jaw / chin -> neck', -0.6, 0.45, 0.6, 1.05, 0.75],
    ['cheek edge close-up (viewer-left)', -0.72, 0.0, -0.36, 0.36, 1.5],
    ['forehead edge close-up (top-left)', -0.6, -0.72, -0.24, -0.36, 1.5],
  ],
  full: [['full frame', -1.211, -0.86, 1.028, 1.071, 0.5]],
};
const REG = SETS[set] || SETS.periph;
const px = (u, v) => [Math.round(head.cx + u * head.W), Math.round(head.ey + v * head.W)];
const label = (text, w, h = 30) => Buffer.from(
  `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/>` +
  `<text x="8" y="21" font-family="Helvetica, Arial" font-size="16" fill="#9fe">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`);
async function crop(file, [u0, v0, u1, v1], s) {
  const meta = await sharp(file).metadata();
  let [x0, y0] = px(u0, v0), [x1, y1] = px(u1, v1);
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(meta.width, x1); y1 = Math.min(meta.height, y1);
  const w = x1 - x0, h = y1 - y0;
  return { buf: await sharp(file).extract({ left: x0, top: y0, width: w, height: h }).resize(Math.round(w * s), Math.round(h * s), { kernel: s >= 1 ? 'nearest' : 'lanczos3' }).png().toBuffer(), w: Math.round(w * s), h: Math.round(h * s) };
}
const gap = 10;
const cols = [ref, ...renders];
const names = ['ref 2', ...renders.map((r, i) => labels[i] || r.split('/').pop())];
const rows = [];
for (const r of REG) {
  const s = r[5] * gscale;
  rows.push({ name: r[0], tiles: await Promise.all(cols.map((c) => crop(c, r.slice(1, 5), s))) });
}
const width = Math.max(...rows.map((r) => r.tiles.reduce((a, t) => a + t.w + gap, gap)));
let y = title ? 36 : 0;
const comps = [];
if (title) comps.push({ input: label(title, width, 36), left: 0, top: 0 });
for (const r of rows) {
  comps.push({ input: label(`${r.name}: ${names.join(' | ')}`, width), left: 0, top: y });
  y += 30;
  let x = gap;
  for (const t of r.tiles) { comps.push({ input: t.buf, left: x, top: y }); x += t.w + gap; }
  y += Math.max(...r.tiles.map((t) => t.h)) + gap;
}
await sharp({ create: { width, height: y, channels: 3, background: '#000' } }).composite(comps).png().toFile(out);
console.log(out);
