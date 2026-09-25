#!/usr/bin/env node
// Head-relative crop of one image (ref 2 framing: W = 818 px, origin = catchlight midpoint 990.5, 703.5).
//   node qa/crop.mjs --in img.png --out crop.png --r u0,v0,u1,v1 [--scale 2] [--kernel nearest|lanczos3]
import sharp from 'sharp';
import { resolve } from 'node:path';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const head = { cx: +arg('cx', 990.5), ey: +arg('ey', 703.5), W: +arg('W', 818) };
const [u0, v0, u1, v1] = arg('r', '-0.5,-0.2,0.5,0.2').split(',').map(Number);
const s = +arg('scale', 2);
const inp = resolve(arg('in'));
const meta = await sharp(inp).metadata();
let x0 = Math.max(0, Math.round(head.cx + u0 * head.W)), y0 = Math.max(0, Math.round(head.ey + v0 * head.W));
let x1 = Math.min(meta.width, Math.round(head.cx + u1 * head.W)), y1 = Math.min(meta.height, Math.round(head.ey + v1 * head.W));
await sharp(inp).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
  .resize(Math.round((x1 - x0) * s), Math.round((y1 - y0) * s), { kernel: arg('kernel', 'nearest') }).png().toFile(resolve(arg('out')));
