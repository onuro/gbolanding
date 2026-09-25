#!/usr/bin/env node
// Periphery statistics of a ref-2-framed image (1832x1580, W = 818, origin 990.5, 703.5):
// dot peaks (local maxima) -> per elliptical band around the face: occupancy (peaks per lattice cell),
// peak brightness quantiles, grid alignment (share of peaks within 0.2 p of a lattice node), inter-dot floor.
//   node qa/periph-stats.mjs img.png [img2.png ...] [--json out.json] [--map out.png]
// e = |(u / 0.49, (v - 0.07) / 0.71)| : 1 = approximate face oval (u, v in W, v down)
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const jsonOut = opt('json'); const mapOut = opt('map'); const T = +opt('thr', '38');
const files = argv;
const head = { cx: 990.5, ey: 703.5, W: 818 };
const P = 818 / 59;
const eOf = (x, y) => { const u = (x - head.cx) / head.W, v = (y - head.ey) / head.W; return Math.hypot(u / 0.49, (v - 0.07) / 0.71); };
const results = {};
const maps = [];
for (const f of files) {
  const { data, info } = await sharp(f).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const L = (x, y) => data[y * w + x];
  // peaks: strict local max in a 7x7 window, above T
  const peaks = [];
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
    const c = L(x, y); if (c < T) continue;
    let ok = true;
    for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (!dx && !dy) continue; const n = L(x + dx, y + dy);
      if (n > c || (n === c && (dy < 0 || (dy === 0 && dx < 0)))) { ok = false; break; }
    }
    if (ok) peaks.push([x, y, c]);
  }
  // lattice phase from peaks in the bright face centre (|u|<0.3, -0.5<v<0.1)
  let sx = 0, cx = 0, sy = 0, cy = 0;
  for (const [x, y] of peaks) {
    const u = (x - head.cx) / head.W, v = (y - head.ey) / head.W;
    if (Math.abs(u) < 0.3 && v > -0.5 && v < 0.1) { const ax = 2 * Math.PI * x / P, ay = 2 * Math.PI * y / P; sx += Math.sin(ax); cx += Math.cos(ax); sy += Math.sin(ay); cy += Math.cos(ay); }
  }
  const phx = Math.atan2(sx, cx) / (2 * Math.PI) * P, phy = Math.atan2(sy, cy) / (2 * Math.PI) * P;
  // bands
  const NB = 26; const bands = Array.from({ length: NB }, () => ({ n: 0, area: 0, vals: [], aligned: 0, floor: [] }));
  const bi = (e) => Math.min(NB - 1, Math.floor(e / 0.1));
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const b = bands[bi(eOf(x, y))]; b.area += 4; if (((x ^ y) & 6) === 0) b.floor.push(L(x, y)); }
  for (const [x, y, c] of peaks) {
    const b = bands[bi(eOf(x, y))]; b.n++; b.vals.push(c);
    const rx = ((x - phx) / P) % 1, ry = ((y - phy) / P) % 1;
    const dx = Math.min(Math.abs(rx), 1 - Math.abs(rx)), dy = Math.min(Math.abs(ry), 1 - Math.abs(ry));
    if (Math.hypot(dx, dy) < 0.2) b.aligned++;
  }
  const q = (a, p) => { if (!a.length) return 0; const s = [...a].sort((m, n) => m - n); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const rows = bands.map((b, i) => ({ e: +(i * 0.1).toFixed(1), occ: +(b.n / (b.area / (P * P))).toFixed(3), p25: q(b.vals, 0.25), p50: q(b.vals, 0.5), p90: q(b.vals, 0.9), align: b.n ? +(b.aligned / b.n).toFixed(2) : 0, floor: q(b.floor, 0.5), floor25: q(b.floor, 0.25) }));
  results[f] = { phase: [phx, phy], peaks: peaks.length, bands: rows };
  // 2D occupancy / brightness map at 0.05 W blocks
  const B = Math.round(0.05 * head.W); const mw = Math.ceil(w / B), mh = Math.ceil(h / B);
  const cnt = new Float32Array(mw * mh), sum = new Float32Array(mw * mh);
  for (const [x, y, c] of peaks) { const k = Math.floor(y / B) * mw + Math.floor(x / B); cnt[k]++; sum[k] += c; }
  maps.push({ f, mw, mh, cnt, sum, B });
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(results, null, 1));
// print table side by side
const names = Object.keys(results);
console.log('e    ' + names.map((n) => n.split('/').pop().slice(0, 30).padEnd(44)).join(''));
console.log('     ' + names.map(() => 'occ   p25 p50 p90 aln  flr'.padEnd(44)).join(''));
for (let i = 0; i < 26; i++) {
  let line = (i * 0.1).toFixed(1).padEnd(5);
  for (const n of names) { const r = results[n].bands[i]; line += `${r.occ.toFixed(2).padStart(4)} ${String(r.p25).padStart(4)} ${String(r.p50).padStart(3)} ${String(r.p90).padStart(3)} ${r.align.toFixed(2)} ${String(r.floor).padStart(3)}`.padEnd(44); }
  console.log(line);
}
if (mapOut) {
  // occupancy (R/G) and mean brightness maps, one row per file, scaled 8x
  const S = 6; const comps = [];
  let y = 0; let width = 0;
  for (const m of maps) {
    const cells = (m.B * m.B) / (P * P);
    const occ = Buffer.alloc(m.mw * m.mh * 3), bri = Buffer.alloc(m.mw * m.mh * 3);
    for (let k = 0; k < m.mw * m.mh; k++) {
      const o = Math.min(1, m.cnt[k] / cells); const b = m.cnt[k] ? m.sum[k] / m.cnt[k] / 255 : 0;
      occ[3 * k] = occ[3 * k + 1] = occ[3 * k + 2] = Math.round(255 * o);
      bri[3 * k] = Math.round(255 * b); bri[3 * k + 1] = Math.round(255 * b * o); bri[3 * k + 2] = Math.round(255 * b * 0.3);
    }
    const a = await sharp(occ, { raw: { width: m.mw, height: m.mh, channels: 3 } }).resize(m.mw * S, m.mh * S, { kernel: 'nearest' }).png().toBuffer();
    const b = await sharp(bri, { raw: { width: m.mw, height: m.mh, channels: 3 } }).resize(m.mw * S, m.mh * S, { kernel: 'nearest' }).png().toBuffer();
    comps.push({ input: a, left: 0, top: y }, { input: b, left: m.mw * S + 8, top: y });
    width = Math.max(width, 2 * m.mw * S + 8); y += m.mh * S + 8;
  }
  await sharp({ create: { width, height: y, channels: 3, background: '#300' } }).composite(comps).png().toFile(mapOut);
}
