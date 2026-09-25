#!/usr/bin/env node
// Tiny montage/crop helper for Plan B QA (sharp from the repo root).
//   node montage.mjs --out o.png [--cols 3] [--scale 0.5] [--crop x,y,w,h] [--label] a.png b.png ...
import { createRequire } from 'node:module';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../../package.json'));
const sharp = require('sharp');
const argv = process.argv.slice(2);
const opt = {}; const files = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { const k = argv[i].slice(2); const v = (k !== 'label' && argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : '1'; opt[k] = v; }
  else files.push(argv[i]);
}
const cols = +(opt.cols || files.length), scale = +(opt.scale || 1);
const crop = opt.crop ? opt.crop.split(',').map(Number) : null;
const tiles = [];
for (const f of files) {
  let im = sharp(f).removeAlpha();
  if (crop) im = im.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
  const buf = await im.png().toBuffer();
  const m = await sharp(buf).metadata();
  const w = Math.round(m.width * scale), h = Math.round(m.height * scale);
  let t = await sharp(buf).resize(w, h).png().toBuffer();
  if (opt.label) {
    const svg = `<svg width="${w}" height="22"><rect width="100%" height="100%" fill="#000" opacity="0.6"/><text x="6" y="16" font-size="14" font-family="Helvetica" fill="#fff">${basename(f).replace(/&/g, '')}</text></svg>`;
    t = await sharp(t).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
  }
  tiles.push({ t, w, h });
}
const tw = Math.max(...tiles.map((x) => x.w)), th = Math.max(...tiles.map((x) => x.h));
const rows = Math.ceil(tiles.length / cols);
const comp = tiles.map((x, i) => ({ input: x.t, left: (i % cols) * tw, top: Math.floor(i / cols) * th }));
await sharp({ create: { width: tw * Math.min(cols, tiles.length), height: th * rows, channels: 3, background: '#000' } }).composite(comp).png().toFile(opt.out);
console.log('wrote', opt.out, tw * Math.min(cols, tiles.length), 'x', th * rows);
