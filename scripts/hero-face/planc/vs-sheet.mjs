// Plan C: side-by-side sheet, ref 2 next to lab renders at the ref-2 framing (1832 x 1580 device px,
// pupil midpoint (990.5, 703.5), W = 818 px), with labels. Uses sharp (scripts/hero-face/node_modules).
//   node vs-sheet.mjs --out sheet.png --crop full|eyes|lips|face [--scale 0.5] [--cols N]
//        [--ref <ref.png|webp>] [--labels "ref 2,a,b"] [--mouth "x,y;x,y"] img1.png img2.png ...
// Crops (device px): full = whole frame; face = 1300 x 1400 around the face; eyes = 1000 x 330 around the
// pupils; lips = 560 x 380 around each image's own mouth centre (--mouth, one per image incl. the ref;
// default: ref (995, 1150), renders (990.5, 1124)).
import sharp from 'sharp';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const out = opt('out', 'sheet.png'), crop = opt('crop', 'full'), scale = +opt('scale', crop === 'full' ? 0.5 : 1);
const ref = opt('ref', '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/images/10.webp');
const noRef = ref === 'none';
const cols = +opt('cols', 0);
const labels = (opt('labels', '') || '').split(',').filter((s) => s.length);
const mouths = (opt('mouth', '') || '').split(';').filter(Boolean).map((s) => s.split(',').map(Number));
const files = noRef ? argv : [ref, ...argv];
const O = [990.5, 703.5];
const box = (k) => {
  if (crop === 'full') return null;
  if (crop === 'face') return [O[0] - 650, O[1] - 620, 1300, 1400];
  if (crop === 'eyes') return [O[0] - 500, O[1] - 170, 1000, 330];
  const m = mouths[k] || (k === 0 && !noRef ? [995, 1150] : [990.5, 1124]);
  return [m[0] - 280, m[1] - 190, 560, 380];
};
const tiles = [];
for (let k = 0; k < files.length; k++) {
  let img = sharp(files[k]).removeAlpha();
  const meta = await sharp(files[k]).metadata();
  const b = box(k);
  if (b) {
    const l = Math.max(0, Math.round(b[0])), t = Math.max(0, Math.round(b[1]));
    img = img.extract({ left: l, top: t, width: Math.min(b[2], meta.width - l), height: Math.min(b[3], meta.height - t) });
  }
  const w0 = b ? b[2] : meta.width, h0 = b ? b[3] : meta.height;
  const w = Math.round(w0 * scale), h = Math.round(h0 * scale);
  let buf = await img.resize(w, h, { fit: 'fill' }).png().toBuffer();
  const lab = labels[k];
  if (lab) {
    const fs = Math.max(14, Math.round(Math.min(w, h) * 0.05));
    const svg = `<svg width="${w}" height="${h}"><rect x="0" y="0" width="${Math.round(fs * 0.62 * lab.length + fs)}" height="${Math.round(fs * 1.6)}" fill="#000" fill-opacity="0.65"/><text x="${Math.round(fs * 0.5)}" y="${Math.round(fs * 1.15)}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" fill="#ffd27a">${lab.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
    buf = await sharp(buf).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer();
  }
  tiles.push({ buf, w, h });
}
const nc = cols || tiles.length, nr = Math.ceil(tiles.length / nc);
const tw = tiles[0].w, th = tiles[0].h, gap = 8;
const comp = tiles.map((t, k) => ({ input: t.buf, left: (k % nc) * (tw + gap), top: Math.floor(k / nc) * (th + gap) }));
await sharp({ create: { width: nc * tw + (nc - 1) * gap, height: nr * th + (nr - 1) * gap, channels: 3, background: '#3a3a3a' } }).composite(comp).png().toFile(out);
console.log('wrote', out);
