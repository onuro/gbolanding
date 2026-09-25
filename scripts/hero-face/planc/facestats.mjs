// Plan C: luminance statistics of ref-2-framed images (1832 x 1580, pupils midpoint (990.5, 703.5), W 818 px).
//   node facestats.mjs img1 img2 ...
// Per image: percentiles p50/75/90/95/99 of luma in the face core (ellipse |u|/0.42, (v-0.12)/0.62 < 1, eyes
// included) and per-region dot peaks: for each 14 px lattice cell the max luma, then the share of cells whose
// peak is > 200 and the mean peak, for regions forehead / cheeks / nose ridge / lips / chin (W offsets).
import sharp from 'sharp';
const O = [990.5, 703.5], W = 818;
const regions = {
  forehead: [-0.14, -0.42, 0.14, -0.2], cheekL: [-0.36, 0.08, -0.16, 0.26], cheekR: [0.16, 0.08, 0.36, 0.26],
  ridge: [-0.03, 0.0, 0.03, 0.26], lips: [-0.16, 0.42, 0.16, 0.62], chin: [-0.1, 0.62, 0.1, 0.8],
};
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const L = (x, y) => { const i = 3 * (y * w + x); return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; };
  const vals = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const u = (x - O[0]) / W, v = (y - O[1]) / W;
    if (Math.hypot(u / 0.42, (v - 0.12) / 0.62) < 1) vals.push(L(x, y));
  }
  vals.sort((a, b) => a - b);
  const pc = (p) => vals[Math.floor(p * (vals.length - 1))].toFixed(0);
  const reg = {};
  for (const [k, [u0, v0, u1, v1]] of Object.entries(regions)) {
    const x0 = Math.round(O[0] + u0 * W), x1 = Math.round(O[0] + u1 * W), y0 = Math.round(O[1] + v0 * W), y1 = Math.round(O[1] + v1 * W);
    let n = 0, hot = 0, s = 0;
    for (let cy = y0; cy + 14 <= y1; cy += 14) for (let cx = x0; cx + 14 <= x1; cx += 14) {
      let m = 0; for (let y = cy; y < cy + 14; y++) for (let x = cx; x < cx + 14; x++) m = Math.max(m, L(x, y));
      n++; s += m; if (m > 200) hot++;
    }
    reg[k] = `${(100 * hot / n).toFixed(0)}%/${(s / n).toFixed(0)}`;
  }
  console.log(f.split('/').slice(-2).join('/').padEnd(28), `core p50/75/90/95/99 ${pc(0.5)}/${pc(0.75)}/${pc(0.9)}/${pc(0.95)}/${pc(0.99)}`, ' peaks>200%/meanPeak', JSON.stringify(reg));
}
