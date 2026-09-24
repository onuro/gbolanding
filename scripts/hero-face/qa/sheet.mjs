#!/usr/bin/env node
// Side-by-side sheet: reference crop | render crop at identical W scale (both framed like ref 2).
//   node qa/sheet.mjs --ref 10.webp --render cap.png --out sheet.png [--scale 2] [--regions default|full]
// Regions are defined head-relative (W = 2 IPD, origin = catchlight midpoint), so they map to
// the same features in both images.
import sharp from 'sharp';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ref = resolve(arg('ref'));
const ren = resolve(arg('render'));
const out = resolve(arg('out', 'sheet.png'));
const scale = +arg('scale', 2);
const head = { cx: +arg('cx', 990.5), ey: +arg('ey', 703.5), W: +arg('W', 818) };
const title = arg('title', '');

// [name, u0, v0, u1, v1] in W (v down)
const REGIONS = [
  ['nose bridge', -0.14, -0.02, 0.14, 0.26],
  ['left eye', -0.43, -0.12, -0.07, 0.12],
  ['mouth', -0.2, 0.36, 0.2, 0.68],
  ['forehead / crown', -0.25, -0.76, 0.25, -0.42],
  ['hair edge (left)', -1.2, -0.12, -0.6, 0.2],
  ['cheek / jaw (right)', 0.18, 0.1, 0.62, 0.62],
  ['stars (top left)', -1.2, -0.86, -0.72, -0.5],
];

const px = (u, v) => [Math.round(head.cx + u * head.W), Math.round(head.ey + v * head.W)];
const label = (text, w, h = 34) => Buffer.from(
  `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/>` +
  `<text x="10" y="23" font-family="Helvetica, Arial" font-size="18" fill="#9fe">${text}</text></svg>`);

async function crop(file, [u0, v0, u1, v1], s) {
  const img = sharp(file);
  const meta = await img.metadata();
  let [x0, y0] = px(u0, v0), [x1, y1] = px(u1, v1);
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(meta.width, x1); y1 = Math.min(meta.height, y1);
  const w = x1 - x0, h = y1 - y0;
  return { buf: await sharp(file).extract({ left: x0, top: y0, width: w, height: h }).resize(Math.round(w * s), Math.round(h * s), { kernel: 'nearest' }).png().toBuffer(), w: Math.round(w * s), h: Math.round(h * s) };
}

const tiles = [];
// full frames at 0.5x
const fullS = 0.5;
const fr = await sharp(ref).resize({ width: Math.round(1832 * fullS) }).png().toBuffer();
const fn = await sharp(ren).resize({ width: Math.round(1832 * fullS) }).png().toBuffer();
const fh = Math.round(1580 * fullS), fw = Math.round(1832 * fullS);
tiles.push({ name: 'full frame', a: { buf: fr, w: fw, h: fh }, b: { buf: fn, w: fw, h: fh } });
for (const r of REGIONS) tiles.push({ name: r[0], a: await crop(ref, r.slice(1), scale), b: await crop(ren, r.slice(1), scale) });

const gap = 12;
const width = Math.max(...tiles.map((t) => t.a.w + t.b.w + gap * 3));
let y = title ? 44 : 0;
const comps = [];
if (title) comps.push({ input: label(title, width, 44), left: 0, top: 0 });
for (const t of tiles) {
  comps.push({ input: label(`${t.name} — ref 2 (left) | render (right)`, width), left: 0, top: y });
  y += 34;
  comps.push({ input: t.a.buf, left: gap, top: y });
  comps.push({ input: t.b.buf, left: gap * 2 + t.a.w, top: y });
  y += Math.max(t.a.h, t.b.h) + gap;
}
await sharp({ create: { width, height: y, channels: 3, background: '#000' } }).composite(comps).png().toFile(out);
if (argv.includes('--split')) {
  // one file per tile pair, for quick inspection
  for (const [i, t] of tiles.entries()) {
    const w = t.a.w + t.b.w + gap * 3, h = Math.max(t.a.h, t.b.h) + gap * 2;
    const f = out.replace(/\.png$/, `-${i}-${t.name.replace(/[^a-z0-9]+/gi, '_')}.png`);
    await sharp({ create: { width: w, height: h, channels: 3, background: '#222' } })
      .composite([{ input: t.a.buf, left: gap, top: gap }, { input: t.b.buf, left: gap * 2 + t.a.w, top: gap }]).png().toFile(f);
  }
}
console.log(`sheet -> ${out} (${width}x${y})`);
