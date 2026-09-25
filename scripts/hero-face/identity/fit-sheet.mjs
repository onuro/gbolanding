#!/usr/bin/env node
// Side-by-side check of a fitted identity against ref 2 at ref 2's exact framing (pupil midpoint + IPD
// measured on 10.webp, engine camera: vertical FOV 20 deg).
// Panels: ref 2 | shaded grey (ref-2 key light, the engine's direction) | shaded grey (soft studio light)
//         | dot preview (portrait.mjs dotPreviewRef2) ; optional landmark overlay on the ref panel.
// usage: node fit-sheet.mjs --lm ref2-landmarks.json --fit fitA.json [--fit fitB.json ...] --out sheet.png
//        [--crop face|eyes|mouth|nose|x0,y0,x1,y1] [--scale 0.5] [--labels a,b] [--pts 1]
// A fit json is {weights:[30], expr:{name:value}, pitchDeg?} (fit-ref2.mjs output, f5-fit.json + f5-rest.json via --rest).
import fs from 'node:fs';
import sharp from 'sharp';
import * as ict from './ict.mjs';
import { scene } from './portrait.mjs';
import { vertexNormals, render } from './raster.mjs';
import { dotPreviewRef2 } from './portrait.mjs';
import { loadTargets, makeModel, lmError } from './fit-ref2.mjs';
import { camera, pupilSets } from './fitcore.mjs';
import { arg } from './util.mjs';

const argv = process.argv.slice(2);
const fits = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--fit') fits.push(argv[i + 1]);
const rests = [];
for (let i = 0; i < argv.length; i++) if (argv[i] === '--rest') rests.push(argv[i + 1]);
const labels = arg('--labels', '').split(',').filter(Boolean);
const lmFile = arg('--lm');
const { targets, origin, Wpx, size, J } = loadTargets(lmFile);
const REF = arg('--ref', '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/images/10.webp');
const sc = +arg('--scale', 0.5);
const views = arg('--views', 'key,studio,dots').split(',');
const CROPS = { face: [560, 440, 1430, 1480], eyes: [640, 600, 1350, 820], mouth: [780, 900, 1210, 1290], nose: [820, 660, 1170, 1100], full: [0, 0, 1832, 1580] };
const crop = (CROPS[arg('--crop', 'face')] || arg('--crop').split(',').map(Number));
const [cx0, cy0, cx1, cy1] = crop;
const W = Math.round(size[0] * sc), H = Math.round(size[1] * sc);

function loadFit(f, restFile) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const w = Array.isArray(j) ? j : j.weights;
  let expr = j.expr || {};
  let pitch = j.pitchDeg || 0;
  if (restFile) { const r = JSON.parse(fs.readFileSync(restFile, 'utf8')); expr = r.expr || {}; pitch = r.pose?.pitchDeg || 0; }
  return { w: w.map(Number), expr, pitch };
}

async function panelFromRGB(rgb, w, h) {
  return sharp(Buffer.from(rgb), { raw: { width: w, height: h, channels: 3 } })
    .extract({ left: Math.round(cx0 * sc), top: Math.round(cy0 * sc), width: Math.round((cx1 - cx0) * sc), height: Math.round((cy1 - cy0) * sc) })
    .png().toBuffer();
}

function renderFit({ w, expr, pitch }) {
  const P = ict.blend(w, expr);
  const ps = pupilSets(P);
  const pc = ps.map((s) => { const c = [0, 0, 0]; for (const v of s) for (let k = 0; k < 3; k++) c[k] += P[v * 3 + k]; return c.map((x) => x / s.length); });
  const ipd = Math.hypot(pc[0][0] - pc[1][0], pc[0][1] - pc[1][1], pc[0][2] - pc[1][2]);
  const mid = [(pc[0][0] + pc[1][0]) / 2, (pc[0][1] + pc[1][1]) / 2, (pc[0][2] + pc[1][2]) / 2];
  const pxPerCm = (Wpx * sc) / (2 * ipd);
  const sn = scene({ teeth: false });
  const N = vertexNormals(P, sn.tris);
  const base = {
    P, N, tris: sn.tris, triMat: sn.triMat, valb: sn.valb, width: W, height: H, fovDeg: 20, pxPerCm,
    focus: mid, pivot: mid, pitch: pitch || 0, fx: origin[0] / size[0], fy: origin[1] / size[1],
  };
  const out = {};
  if (views.includes('key') || views.includes('dots')) {
    out.key = render({ ...base, lights: [{ dir: [-0.16, 0.85, 0.5], k: 1.0, shadow: true }], ambient: 0.06, aoDirs: 40, spec: { ks: 0.35, exp: 48 }, exposure: 1 });
  }
  if (views.includes('studio')) {
    out.studio = render({ ...base, lights: [{ dir: [-0.35, 0.45, 0.82], k: 0.72, shadow: true }, { dir: [0.55, 0.1, 0.83], k: 0.2, shadow: false }], ambient: 0.22, aoDirs: 40, spec: { ks: 0.12, exp: 30 }, exposure: 0.95 });
  }
  if (views.includes('dots')) {
    out.key.fy = base.fy;
    out.dots = dotPreviewRef2(out.key, P, { W: Wpx * sc });
  }
  return { out, P };
}

const cam = camera(size[1], Wpx);
const cols = [];
// ref panel (with optional fitted-landmark overlay)
const refBuf = await sharp(REF).resize(W, H).removeAlpha().extract({ left: Math.round(cx0 * sc), top: Math.round(cy0 * sc), width: Math.round((cx1 - cx0) * sc), height: Math.round((cy1 - cy0) * sc) }).png().toBuffer();
const pw = Math.round((cx1 - cx0) * sc), ph = Math.round((cy1 - cy0) * sc);
const tiles = [];
const svgText = (s, x, y, c = '#ffd040') => `<text x="${x}" y="${y}" fill="${c}" font-size="14" font-family="monospace">${s}</text>`;
const colours = ['#00ff80', '#ff40a0', '#40c0ff', '#ffb000'];
let refOverlay = '';
const rows = [];
for (let f = 0; f < fits.length; f++) {
  const fit = loadFit(fits[f], rests[f]);
  const model = makeModel(targets, fit.w, fit.expr);
  const err = lmError(model, cam, targets, fit.w, fit.expr, fit.pitch, true);
  if (arg('--pts', '1') === '1') {
    for (const r of err.rows) {
      if (r.synth) continue;
      const t = targets.find((t) => t.key === r.key);
      const x = (origin[0] + t.tRaw[0] + r.du - cx0) * sc, y = (origin[1] + t.tRaw[1] + r.dv - cy0) * sc;
      refOverlay += `<circle cx="${x}" cy="${y}" r="2.5" fill="none" stroke="${colours[f % 4]}" stroke-width="1.5"/>`;
    }
  }
  const { out } = renderFit(fit);
  const row = [];
  for (const v of views) {
    const r = out[v];
    const rgb = v === 'dots' ? r : r.rgb;
    row.push(await panelFromRGB(rgb, W, H));
  }
  rows.push({ row, label: (labels[f] || fits[f].split('/').pop()) + `  lm rms ${err.rmsPx.toFixed(1)}px (${(err.rmsW * 100).toFixed(2)}%W)` });
}
if (arg('--pts', '1') === '1') for (const t of targets) {
  if (t.synth) continue;
  const x = (origin[0] + t.tRaw[0] - cx0) * sc, y = (origin[1] + t.tRaw[1] - cy0) * sc;
  refOverlay += `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="#ffe000"/>`;
}
const refPanel = await sharp(refBuf).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}">${refOverlay}</svg>`), top: 0, left: 0 }]).png().toBuffer();
const refClean = refBuf;
const gap = 6, top = 22;
const nc = 1 + views.length;
const SW = nc * pw + (nc - 1) * gap, SH = rows.length * (ph + top) + (rows.length - 1) * gap;
const comp = [];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}">`;
rows.forEach((r, i) => {
  const y = i * (ph + top + gap);
  comp.push({ input: i === 0 ? refPanel : refClean, left: 0, top: y + top });
  r.row.forEach((b, j) => comp.push({ input: b, left: (j + 1) * (pw + gap), top: y + top }));
  svg += svgText(r.label, 4, y + 16);
  svg += svgText(i === 0 ? 'ref 2 (yellow = marked, green/pink = fitted)' : 'ref 2', 4, y + top + ph - 6, '#9fe');
  views.forEach((v, j) => (svg += svgText(v, (j + 1) * (pw + gap) + 4, y + top + ph - 6, '#9fe')));
});
svg += '</svg>';
comp.push({ input: Buffer.from(svg), left: 0, top: 0 });
await sharp({ create: { width: SW, height: SH, channels: 3, background: '#101010' } }).composite(comp).png().toFile(arg('--out'));
console.log(arg('--out'), SW + 'x' + SH);
