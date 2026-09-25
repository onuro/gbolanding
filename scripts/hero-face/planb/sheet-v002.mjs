#!/usr/bin/env node
// Plan B sheets: labelled tiles (sharp from the repo root).
//   node sheet-v002.mjs --out o.png --tile 610,526 [--cols 3] [--crop x,y,w,h] [--title "text"] a.png "label a" b.png@x,y,w,h "label b" ...
// Each item is "<png>[@x,y,w,h]" followed by its label; the per-item crop overrides --crop. Tiles are resized
// to --tile (fit: contain on black), 8 px gutters, 30 px label strip above each tile.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../../package.json'));
const sharp = require('sharp');
const argv = process.argv.slice(2);
const opt = {}; const items = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { opt[argv[i].slice(2)] = argv[++i]; continue; }
  items.push({ f: argv[i], l: argv[i + 1] || '' }); i++;
}
const [TW, TH] = (opt.tile || '610,526').split(',').map(Number);
const cols = +(opt.cols || items.length);
const G = 8, LH = 30, TT = opt.title ? 40 : 0;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const comp = [];
for (let k = 0; k < items.length; k++) {
  let [f, c] = items[k].f.split('@');
  c = c || opt.crop;
  let im = sharp(f).removeAlpha();
  if (c) { const [x, y, w, h] = c.split(',').map(Number); im = im.extract({ left: x, top: y, width: w, height: h }); }
  const buf = await sharp(await im.png().toBuffer()).resize(TW, TH, { fit: 'contain', background: '#000' }).png().toBuffer();
  const col = k % cols, row = Math.floor(k / cols);
  const left = col * (TW + G), top = TT + row * (TH + LH + G);
  comp.push({ input: buf, left, top: top + LH });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${LH}"><text x="6" y="21" font-family="Helvetica, Arial" font-size="17" fill="#ddd">${esc(items[k].l)}</text></svg>`;
  comp.push({ input: Buffer.from(svg), left, top });
}
const rows = Math.ceil(items.length / cols);
const Wt = Math.min(cols, items.length) * (TW + G) - G, Ht = TT + rows * (TH + LH + G) - G;
if (opt.title) comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Wt}" height="${TT}"><text x="8" y="28" font-family="Helvetica, Arial" font-size="22" fill="#fff">${esc(opt.title)}</text></svg>`), left: 0, top: 0 });
await sharp({ create: { width: Wt, height: Ht, channels: 3, background: '#1b1b1b' } }).composite(comp).png().toFile(opt.out);
console.log(opt.out, Wt, 'x', Ht);
