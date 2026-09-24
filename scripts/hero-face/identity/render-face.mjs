#!/usr/bin/env node
// Render lab views for one weight vector.
// Usage: node render-face.mjs --weights w.json --out <dir> --name <id> [--views front,q34,profile,ref,dots] [--size 300x370]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ict from './ict.mjs';
import { portrait, dotPreview, dotPreviewRef2 } from './portrait.mjs';
import { writePNG } from './png.mjs';
import { arg } from './util.mjs';

export function renderFace(P, dir, name, { views = ['front', 'q34', 'profile'], width = 300, height = 370, ao = 32, wFrac = 0.5, fy = 0.4 } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const files = {};
  for (const v of views) {
    const vv = v === 'dots' || v === 'dots2' ? 'ref' : v;
    const r = portrait(P, vv, { width, height, ao, wFrac, fy });
    const f = path.join(dir, `${name}_${v}.png`);
    const wPx = 2 * r.fw.ipd * r.pxPerCm;
    writePNG(f, r.W, r.H, v === 'dots' ? dotPreview(r, { W: wPx }) : v === 'dots2' ? dotPreviewRef2(r, P, { W: wPx }) : r.rgb);
    files[v] = f;
  }
  return files;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  const w = ict.readWeights(arg('--weights'));
  const [width, height] = arg('--size', '300x370').split('x').map(Number);
  const views = arg('--views', 'front,q34,profile').split(',');
  const files = renderFace(ict.blend(w), arg('--out', '.'), arg('--name', 'face'), { views, width, height });
  console.log(JSON.stringify(files));
}
