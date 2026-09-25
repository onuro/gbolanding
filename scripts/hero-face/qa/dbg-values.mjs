#!/usr/bin/env node
// Reads a seamDebug lattice view (view=dots, L.seamDebug=n: vI = 1.6 x value, disc, no halo) back into values
// at named head-relative points (ref 2 framing). usage: node qa/dbg-values.mjs dbg.png [--grid]
import sharp from 'sharp';
const argv = process.argv.slice(2);
const f = argv[0];
const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const val = (u, v) => {
  const x0 = Math.round(990.5 + u * 818), y0 = Math.round(703.5 + v * 818);
  let m = 0;
  for (let y = y0 - 7; y <= y0 + 7; y++) for (let x = x0 - 7; x <= x0 + 7; x++) m = Math.max(m, data[3 * (y * w + x) + 1]);
  const t = Math.min(0.999, m / 255 / 0.88 / 0.99);
  return -Math.log(1 - t) / (1.15 * 1.6);
};
const P = {
  pupilL: [-0.25, 0], pupilR: [0.25, 0], socketUpL: [-0.25, -0.06], noseTip: [0, 0.26], nostrilL: [-0.06, 0.3], mouth: [0, 0.52], lipCornerL: [-0.2, 0.52],
  cheekL: [-0.3, 0.22], cheekOutL: [-0.42, 0.25], cheekOutR: [0.42, 0.25], templeL: [-0.52, -0.12], templeR: [0.52, -0.12], earL: [-0.6, 0.05],
  forehead: [0, -0.4], foreheadTop: [0, -0.58], crown: [0, -0.72], browL: [-0.25, -0.13],
  jawL: [-0.4, 0.55], jawR: [0.4, 0.55], chin: [0, 0.72], underChin: [0, 0.84], neckL: [-0.25, 0.95],
};
for (const [k, [u, v]] of Object.entries(P)) console.log(k.padEnd(12), u.toFixed(2).padStart(6), v.toFixed(2).padStart(6), val(u, v).toFixed(3));
if (argv.includes('--grid')) {
  console.log('grid u -0.8..0.8 step 0.1 (cols), v -0.8..1.0 step 0.1 (rows)');
  for (let v = -0.8; v <= 1.001; v += 0.1) {
    let line = v.toFixed(1).padStart(5) + ' ';
    for (let u = -0.8; u <= 0.801; u += 0.1) line += val(u, v).toFixed(2).padStart(5);
    console.log(line);
  }
}
