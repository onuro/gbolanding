#!/usr/bin/env node
// Ref 2 vs lab captures, pupil-aligned. The lab frames ref 2 with origin (990.5,703.5) and W 818 device px
// (catchlight midpoint); ref 2's measured pupils give (995,717) and W 824. Each capture is scaled/shifted
// so its pupil midpoint and IPD land on ref 2's before cropping, so features compare 1:1.
// usage: node lab-compare.mjs --ref 10.webp --img a.png --img b.png --labels ref,a,b --crop face|eyes|mouth|nose|x0,y0,x1,y1
//        --out cmp.png [--scale 0.6] [--from 990.5,703.5,818] [--to 995,717,824] [--levels 0,255]
import sharp from 'sharp';
import { arg } from './util.mjs';

const argv = process.argv.slice(2);
const imgs = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--img') imgs.push(argv[i + 1]);
const labels = arg('--labels', '').split(',');
const CROPS = { face: [560, 440, 1430, 1480], eyes: [640, 600, 1350, 820], mouth: [780, 1040, 1210, 1300], nose: [840, 660, 1150, 1110], lower: [640, 900, 1350, 1480], full: [0, 0, 1832, 1580] };
const c = CROPS[arg('--crop', 'face')] || arg('--crop').split(',').map(Number);
const sc = +arg('--scale', 0.6);
const [fx, fy, fw] = arg('--from', '990.5,703.5,818').split(',').map(Number);
const [tx, ty, tw] = arg('--to', '995,717,824').split(',').map(Number);
const lv = arg('--levels', '0,255').split(',').map(Number);
const cw = c[2] - c[0], ch = c[3] - c[1];
const OW = Math.round(cw * sc), OH = Math.round(ch * sc);

async function aligned(file, isRef) {
  let k = 1, ox = 0, oy = 0;
  if (!isRef) { k = tw / fw; ox = fx * k - tx; oy = fy * k - ty; }
  // pixel (x,y) in target frame = source (x + ox)/k ...: resize source by k, then crop at (c0 + ox, c1 + oy)
  const meta = await sharp(file).metadata();
  const RW = Math.round(meta.width * k), RH = Math.round(meta.height * k);
  const pad = 80;
  let img = sharp(file).removeAlpha().resize(RW, RH).extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#000' });
  const buf = await img.png().toBuffer();
  let s = sharp(buf).extract({ left: Math.round(c[0] + ox + pad), top: Math.round(c[1] + oy + pad), width: cw, height: ch }).resize(OW, OH);
  if (lv[0] !== 0 || lv[1] !== 255) s = s.linear(255 / (lv[1] - lv[0]), (-lv[0] * 255) / (lv[1] - lv[0]));
  return s.png().toBuffer();
}

const tiles = [await aligned(arg('--ref'), true)];
for (const f of imgs) tiles.push(await aligned(f, false));
const gap = 6, top = 20;
const SW = tiles.length * OW + (tiles.length - 1) * gap, SH = OH + top;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">`;
tiles.forEach((_, i) => (svg += `<text x="${i * (OW + gap) + 4}" y="15" fill="#ffd040" font-size="14" font-family="monospace">${labels[i] || (i ? imgs[i - 1].split('/').pop() : 'ref 2')}</text>`));
svg += '</svg>';
await sharp({ create: { width: SW, height: SH, channels: 3, background: '#111' } })
  .composite([...tiles.map((b, i) => ({ input: b, left: i * (OW + gap), top })), { input: Buffer.from(svg), left: 0, top: 0 }])
  .png().toFile(arg('--out'));
console.log(arg('--out'), SW + 'x' + SH);
