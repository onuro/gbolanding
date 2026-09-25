#!/usr/bin/env node
// Zoomed reference crop with a labelled pixel grid (for marking landmarks by eye), optional point overlay.
// usage: node refcrop.mjs --img 10.webp --rect x0,y0,x1,y1 --scale 4 --grid 10 --out crop.png
//        [--pts pts.json (either {name:[x,y]} or [[x,y,label?],...])] [--gamma 0.6] [--blur 0]
import sharp from 'sharp';
import fs from 'node:fs';
import { arg } from './util.mjs';

const img = arg('--img');
const [x0, y0, x1, y1] = arg('--rect').split(',').map(Number);
const k = +arg('--scale', 4);
const g = +arg('--grid', 10);
const lines = arg('--lines', '1') === '1';
const gamma = +arg('--gamma', 1);
const levels = arg('--levels', '0,255').split(',').map(Number);
const blur = +arg('--blur', 0);
const out = arg('--out');
const ptsFile = arg('--pts', '');
const w = x1 - x0, h = y1 - y0;
const OW = Math.round(w * k), OH = Math.round(h * k);
let pipe = sharp(img).extract({ left: x0, top: y0, width: w, height: h }).greyscale();
if (blur > 0) pipe = pipe.blur(blur);
let base = await pipe.resize(OW, OH, { kernel: arg('--kernel', 'nearest') }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
if (base.info.channels === 1) { const d3 = Buffer.alloc(base.data.length * 3); for (let i = 0; i < base.data.length; i++) d3[i * 3] = d3[i * 3 + 1] = d3[i * 3 + 2] = base.data[i]; base = { data: d3, info: { ...base.info, channels: 3 } }; }
// brighten via gamma manually (sharp gamma() is limited to >=1)
if (gamma !== 1 || levels[0] !== 0 || levels[1] !== 255) {
  const d = base.data;
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(Math.max(0, Math.min(1, (i - levels[0]) / (levels[1] - levels[0]))), gamma));
  for (let i = 0; i < d.length; i++) d[i] = lut[d[i]];
}
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * k}" height="${h * k}">`;
for (let x = Math.ceil(x0 / g) * g; x < x1; x += g) {
  const major = x % (g * 5) === 0;
  svg += lines ? `<line x1="${(x - x0) * k}" y1="0" x2="${(x - x0) * k}" y2="${h * k}" stroke="${major ? '#ff3030' : '#a02020'}" stroke-opacity="${major ? 0.8 : 0.45}" stroke-width="1"/>` : `<line x1="${(x - x0) * k}" y1="0" x2="${(x - x0) * k}" y2="${major ? 14 : 6}" stroke="#ff3030" stroke-width="1"/><line x1="${(x - x0) * k}" y1="${h * k}" x2="${(x - x0) * k}" y2="${h * k - (major ? 14 : 6)}" stroke="#ff3030" stroke-width="1"/>`;
  if (major) svg += `<text x="${(x - x0) * k + 2}" y="12" fill="#ffd040" font-size="12" font-family="monospace">${x}</text>`;
}
for (let y = Math.ceil(y0 / g) * g; y < y1; y += g) {
  const major = y % (g * 5) === 0;
  svg += lines ? `<line x1="0" y1="${(y - y0) * k}" x2="${w * k}" y2="${(y - y0) * k}" stroke="${major ? '#30a0ff' : '#205080'}" stroke-opacity="${major ? 0.8 : 0.45}" stroke-width="1"/>` : `<line x1="0" y1="${(y - y0) * k}" x2="${major ? 14 : 6}" y2="${(y - y0) * k}" stroke="#30a0ff" stroke-width="1"/><line x1="${w * k}" y1="${(y - y0) * k}" x2="${w * k - (major ? 14 : 6)}" y2="${(y - y0) * k}" stroke="#30a0ff" stroke-width="1"/>`;
  if (major) svg += `<text x="2" y="${(y - y0) * k - 2}" fill="#40ffd0" font-size="12" font-family="monospace">${y}</text>`;
}
if (ptsFile) {
  const P = JSON.parse(fs.readFileSync(ptsFile, 'utf8'));
  const list = Array.isArray(P) ? P : Object.entries(P).map(([n, v]) => [v[0], v[1], n]);
  for (const [px, py, lab, col] of list) {
    if (px < x0 || px > x1 || py < y0 || py > y1) continue;
    const X = (px - x0) * k, Y = (py - y0) * k;
    svg += `<circle cx="${X}" cy="${Y}" r="4" fill="none" stroke="${col || '#00ff60'}" stroke-width="2"/>`;
    if (lab) svg += `<text x="${X + 6}" y="${Y - 4}" fill="${col || '#00ff60'}" font-size="11" font-family="monospace">${lab}</text>`;
  }
}
svg += '</svg>';
await sharp(base.data, { raw: { width: OW, height: OH, channels: 3 } })
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png().toFile(out);
console.log(out);
