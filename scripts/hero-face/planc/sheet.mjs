// Plan C: contact sheet of lab captures (crops of the mouth / eyes, or full frames), using sharp.
//   node sheet.mjs --out sheet.png --crop mouth|eyes|full --scale 1 a.png b.png ...
import sharp from 'sharp';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const out = opt('out', 'sheet.png'), crop = opt('crop', 'full'), scale = +opt('scale', 1), cols = +opt('cols', 0);
const files = argv;
const O = [990.5, 703.5], W = 818;
const boxes = { mouth: [O[0] - 260, O[1] + 0.468 * W - 150, 520, 300], eyes: [O[0] - 420, O[1] - 150, 840, 300], face: [O[0] - 560, O[1] - 520, 1120, 1200], full: null };
const tiles = [];
for (const f of files) {
  let img = sharp(f);
  const b = boxes[crop];
  if (b) img = img.extract({ left: Math.round(b[0]), top: Math.round(b[1]), width: b[2], height: b[3] });
  const meta = b ? { width: b[2], height: b[3] } : await sharp(f).metadata();
  const w = Math.round(meta.width * scale), h = Math.round(meta.height * scale);
  tiles.push({ buf: await img.resize(w, h).png().toBuffer(), w, h });
}
const nc = cols || tiles.length, nr = Math.ceil(tiles.length / nc);
const tw = tiles[0].w, th = tiles[0].h, gap = 6;
const comp = tiles.map((t, k) => ({ input: t.buf, left: (k % nc) * (tw + gap), top: Math.floor(k / nc) * (th + gap) }));
await sharp({ create: { width: nc * tw + (nc - 1) * gap, height: nr * th + (nr - 1) * gap, channels: 3, background: '#303030' } }).composite(comp).png().toFile(out);
console.log('wrote', out);
