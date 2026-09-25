#!/usr/bin/env node
// Pixel comparison of two same-size renders (e.g. a lab render vs the owner-approved frame).
// usage: node qa/imgdiff.mjs A.png B.png [--diff out.png] [--side out.png] [--gain 8] [--json out.json]
//   --diff : |A-B| (max over RGB) x gain, grayscale, full size
//   --side : A | B | diff (diff in magenta), half size
// Prints identical / max / mean abs / RMSE / PSNR / SSIM (8x8 box, luma) / changed-pixel counts.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const diffOut = opt('diff'); const sideOut = opt('side'); const gain = +opt('gain', '8'); const jsonOut = opt('json');
const [aPath, bPath] = argv;
if (!aPath || !bPath) { console.error('usage: imgdiff.mjs A.png B.png [--diff d.png] [--side s.png] [--gain 8]'); process.exit(1); }

const load = async (p) => { const { data, info } = await sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
const A = await load(aPath), B = await load(bPath);
if (A.w !== B.w || A.h !== B.h) { console.error(`size mismatch ${A.w}x${A.h} vs ${B.w}x${B.h}`); process.exit(1); }
const { w, h } = A; const n = w * h;
const dm = new Uint8Array(n);
let maxAbs = 0, sumAbs = 0, sumSq = 0, gt0 = 0, gt2 = 0, gt8 = 0, lumA = 0, lumB = 0;
const ga = new Float64Array(n), gb = new Float64Array(n);
for (let i = 0; i < n; i++) {
  let m = 0;
  for (let c = 0; c < 3; c++) {
    const d = Math.abs(A.data[3 * i + c] - B.data[3 * i + c]);
    sumAbs += d; sumSq += d * d; if (d > m) m = d;
  }
  dm[i] = m; if (m > maxAbs) maxAbs = m;
  if (m > 0) gt0++; if (m > 2) gt2++; if (m > 8) gt8++;
  ga[i] = (A.data[3 * i] + A.data[3 * i + 1] + A.data[3 * i + 2]) / 3;
  gb[i] = (B.data[3 * i] + B.data[3 * i + 1] + B.data[3 * i + 2]) / 3;
  lumA += ga[i]; lumB += gb[i];
}
const mse = sumSq / (3 * n);
// SSIM over non-overlapping 8x8 boxes (luma)
const K = 8, C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
let ssimSum = 0, ssimN = 0;
for (let by = 0; by + K <= h; by += K) for (let bx = 0; bx + K <= w; bx += K) {
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let y = by; y < by + K; y++) for (let x = bx; x < bx + K; x++) {
    const i = y * w + x, a = ga[i], b = gb[i];
    sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b;
  }
  const m = K * K, ma = sa / m, mb = sb / m;
  const va = saa / m - ma * ma, vb = sbb / m - mb * mb, cab = sab / m - ma * mb;
  ssimSum += ((2 * ma * mb + C1) * (2 * cab + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2)); ssimN++;
}
const res = {
  a: aPath, b: bPath, size: [w, h],
  identical: maxAbs === 0,
  maxAbs, meanAbs: +(sumAbs / (3 * n)).toFixed(4), rmse: +Math.sqrt(mse).toFixed(4),
  psnrDb: mse === 0 ? null : +(10 * Math.log10(255 * 255 / mse)).toFixed(2),
  ssim8: +(ssimSum / ssimN).toFixed(5),
  pxChanged: gt0, pxChangedGt2: gt2, pxChangedGt8: gt8, pxTotal: n,
  meanLumaA: +(lumA / n).toFixed(3), meanLumaB: +(lumB / n).toFixed(3),
};
console.log(JSON.stringify(res, null, 1));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(res, null, 1));
const amp = Buffer.alloc(n);
for (let i = 0; i < n; i++) amp[i] = Math.min(255, dm[i] * gain);
if (diffOut) await sharp(amp, { raw: { width: w, height: h, channels: 1 } }).png().toFile(diffOut);
if (sideOut) {
  const rgb = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) { rgb[3 * i] = amp[i]; rgb[3 * i + 1] = amp[i] ? 30 : 0; rgb[3 * i + 2] = amp[i]; }
  const W3 = w * 3;
  const row = Buffer.alloc(W3 * h * 3);
  for (let y = 0; y < h; y++) {
    A.data.copy(row, (y * W3) * 3, y * w * 3, (y + 1) * w * 3);
    B.data.copy(row, (y * W3 + w) * 3, y * w * 3, (y + 1) * w * 3);
    rgb.copy(row, (y * W3 + 2 * w) * 3, y * w * 3, (y + 1) * w * 3);
  }
  await sharp(row, { raw: { width: W3, height: h, channels: 3 } }).resize(Math.round(W3 / 2), Math.round(h / 2), { kernel: 'lanczos3' }).png().toFile(sideOut);
}
