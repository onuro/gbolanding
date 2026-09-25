#!/usr/bin/env node
// Plan B x approved-v002 look: per-mesh LOOK DATA for the rigged sculpt (no geometry change at rest).
// Reads the final rig export planb/lab/mesh-sfp.{json,bin} and writes planb/lab/mesh-<name>.{json,bin} with the same
// layout, fixing what the engine's ICT-tuned conventions misread on this anime-leaning sculpt:
//   --iris <W>        human iris: remap the eye-axis cosine so the engine's hard-coded iris edge (cos 0.865, ICT
//                     eyeball r 0.092 W) lands at this iris radius on the sculpt's 0.134 W eyeball (default 0.047;
//                     its own sculpted iris is 0.050 W, but under the engine thresholds it rendered 0.067 W = an
//                     anime disc that fills the whole lid opening: no white, 'dark pits')
//   --lid-rim <W>     tag the lid margins (skin within this distance outside the eyeball sphere, in front of it) as
//                     part 5 'lacrimal', which ICT has and the sculpt lacks: the lit lid rim / tear line that gives
//                     #5 its soft eye outline (default 0.012; 0 = off)
//   --rim-vis / --rim-ao / --rim-nz   light terms given to the lid rim (defaults 0.85 / 0.75) and its facing filter (N.z > 0.35)
//   --rim-mode skin|eyeball|both|off   'eyeball': ICT-style film = the visible eyeball band within --rim-band (W, front
//                     projection) of the lids becomes part 5, the full almond outline #5 has (the skin rim only lights
//                     the lower lid)
//   --brow-flat / --lash-flat <0..1>  shade the brow ribbons / lash strips with the smoothed surface's normals (no drawn
//                     highlight edge on the raised strips; rest normals only, geometry unchanged)
//   --brow <f>        brow ribbons (sculpted raised strips) read as brow HAIR: key visibility x f, AO x f (default 1 = off)
//   --lash <f>        upper lash strips: same darkening (default 1 = off)
//   --hair-y <y>      skin below this y (shoulders / chest) leaves the 'skin' part range the hair volume is fitted
//                     to (moved to part range 'skin-body', same part id 0, so shading is unchanged) (default -1.02)
//   --rest <name:w,...>  bake a rest expression of the rig's own targets into the base shape (positions + normals),
//                     e.g. browInnerUpLeft:0.5,browInnerUpRight:0.5 (the sculpt's brows sit low and slope to the nose)
//   --rest-renorm <names>  targets of --rest whose deltas are then scaled by (1 - w), so weight 1 still reaches the
//                     original full pose (eyeBlink: baked 0.15 rest lid + blink 1 = exactly closed, no over-closure)
//   --jaw-gain <g>    jawOpen target x g (position + normal deltas) so a driver weight opens this smaller mouth
//                     like ICT's (default 1)
//   --debug <png>     front-projection map of the tagged regions
//   --outdir <dir>    where mesh-<name>.* go (default planb/lab, the lab server root)
//   node sfp-look-mesh.mjs [--src lab/mesh-sfp.json] [--name sfq] [flags]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '../../../package.json'));
const requireHF = createRequire(join(HERE, '../package.json')); // three + three-mesh-bvh (scripts/hero-face/node_modules)
const PB = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.lastIndexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; }; // last one wins (mesh-r1.sh overrides)
const SRC = resolve(arg('src', join(PB, 'lab/mesh-sfp.json')));
const NAME = arg('name', 'sfq');
const IRIS = +arg('iris', 0.047);
const LIDRIM = +arg('lid-rim', 0.012);
const RIMVIS = +arg('rim-vis', 0.85), RIMAO = +arg('rim-ao', 0.75), RIMNZ = +arg('rim-nz', 0.35);
const RIMMODE = arg('rim-mode', 'skin'); // skin | eyeball | both | off
const RIMBAND = +arg('rim-band', 0.005), LIDNEAR = +arg('lid-near', 0.008);
const BROW = +arg('brow', 1);
const BROWFLAT = +arg('brow-flat', 0), LASHFLAT = +arg('lash-flat', 0);
const LASH = +arg('lash', 1);
const HAIRY = +arg('hair-y', -1.02);
const JAWG = +arg('jaw-gain', 1);
const RENORM = new Set((arg('rest-renorm', '') || '').split(',').filter(Boolean));
const REST = (arg('rest', '') || '').split(',').filter(Boolean).map((kv) => { const [k, w] = kv.split(':'); return [k, +w]; });
const DEBUG = arg('debug', '');
const OUTDIR = resolve(arg('outdir', join(PB, 'lab')));
// ---- round 1 (r1) additions, all off by default (look-v002.sh output unchanged)
const EXTRA_SRC = resolve(arg('extra', join(PB, 'mesh-sfp-all.json')));
const LASHSHELL = arg('lash-shell', 'keep'); // keep | remove: the sculpt's separate upper lash 'visor' + lower lash wing shells
const BROWSHELL = arg('brow-shell', 'keep'); // keep | flat: brow tubes laid onto the skin (hair drawn on skin, no ridge / shadow)
const BROWLIFT = (arg('brow-lift', '0,0') || '0,0').split(',').map(Number); // flat brows: y lift (W) at the inner, outer end
const BROWTONE = +arg('brow-tone', 1); // flat brows: key visibility / AO x this (hair tone)
const WARPS = argv.flatMap((a, i) => (a === '--warp' ? [argv[i + 1]] : [])); // "move|scale,cx,cy,cz,rx,ry,rz,dx,dy,dz[,sym]"
const TEETH = (arg('teeth', '0,0') || '0,0').split(',').map(Number); // teeth dy, dz (W)
const REBAKE = argv.includes('--rebake');
const JAWCOUPLE = (arg('jaw-couple', '') || '').split(',').filter(Boolean).map((kv) => { const [k, w] = kv.split(':'); return [k, +w]; });
const GAINS = (arg('gain', '') || '').split(',').filter(Boolean).map((kv) => { const [k, w] = kv.split(':'); return [k, +w]; });
const RIMUP = +arg('rim-band-up', 0.006), RIMLO = +arg('rim-band-lo', 0.007); // --rim-mode band: upper (feat.w) / lower (part 5) band widths (W)
const RIMUPMODE = arg('rim-up-mode', 'featw'), RIMUPK = +arg('rim-up-k', 0.6); // upper band: feat.w lash line | part5 film at RIMVIS x k
const CLEARW = argv.includes('--clear-featw'); // drop the rig's own lash-line band (it sat on the lid shelf under the visor)
const LIPTAG = (arg('lip-tag', '') || '').split(',').filter(Boolean).map(Number); // upper vermilion: extra band above the tagged lip (W), border gain

// live deploy (publish-live.sh): append more of the rig's own targets from --extra (mesh-sfp-all) as driven morphs, e.g.
// browDownLeft,browDownRight + the eight eyeLook* (rigid 30 / 30 / 25 / 30 deg eyeball turns with lid follow, the ICT /
// follow.ts EYE_ROT_DEG convention). They are appended before every step below, so the rest shape, the flat brows
// (barycentric skin deltas), gains and retouch treat them like the lab mesh's own targets. Off by default (byte-identical).
const ADDT = (arg('add-targets', '') || '').split(',').filter(Boolean);

const hdr = JSON.parse(readFileSync(SRC, 'utf8'));
let buf = readFileSync(SRC.replace(/\.json$/, '.bin'));
if (ADDT.length) {
  const eh = JSON.parse(readFileSync(EXTRA_SRC, 'utf8'));
  const eb = readFileSync(EXTRA_SRC.replace(/\.json$/, '.bin'));
  if (eh.vertexCount !== hdr.vertexCount) throw new Error('add-targets: vertex count differs');
  const chunks = [buf];
  let off = buf.length;
  for (const name of ADDT) {
    if (hdr.morphs.some((m) => m.name === name)) throw new Error('add-targets: already a morph: ' + name);
    const em = eh.morphs.find((m) => m.name === name);
    if (!em) throw new Error('add-targets: no rig target ' + name);
    for (const s of ['position', 'normal']) {
      const l = eh.layout[`morph:${name}:${s}`];
      const bytes = eb.subarray(l.offset, l.offset + l.count * l.size * 4);
      hdr.layout[`morph:${name}:${s}`] = { offset: off, type: 'f32', size: l.size, count: l.count };
      chunks.push(Buffer.from(bytes)); off += bytes.length;
    }
    hdr.morphs.push({ ...em });
  }
  buf = Buffer.concat(chunks);
}
const out = Buffer.from(buf); // same layout, edited in place
const L = hdr.layout;
const view = (k) => {
  const l = L[k];
  return l.type === 'u32' ? new Uint32Array(out.buffer, out.byteOffset + l.offset, l.count * l.size) : new Float32Array(out.buffer, out.byteOffset + l.offset, l.count * l.size);
};
const P = view('position'), N = view('normal'), bake = view('bake'), eye = view('eye'), feat = view('feat'), idx = view('index');
const NV = hdr.vertexCount;
const lm = hdr.landmarks;
const part = (i) => Math.round(bake[i * 4 + 3]);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const report = {};

// extra rig targets for the rest shape only (mouthRoll*, mouthPress*, browDown*, eyeLook*: exported by the rig, not
// carried in the lab mesh); same vertex order as mesh-sfp (checked: identical positions)
let EXTRA = null;
const extraView = (k) => {
  if (!EXTRA) {
    const h = JSON.parse(readFileSync(EXTRA_SRC, 'utf8'));
    const b = readFileSync(EXTRA_SRC.replace(/\.json$/, '.bin'));
    if (h.vertexCount !== hdr.vertexCount) throw new Error('extra targets: vertex count differs');
    EXTRA = { h, b };
  }
  const l = EXTRA.h.layout[k];
  if (!l) return null;
  return new Float32Array(EXTRA.b.buffer.slice(EXTRA.b.byteOffset + l.offset, EXTRA.b.byteOffset + l.offset + l.count * l.size * 4));
};
// landmark tracking: every landmark follows its nearest vertex through the rest shape / warps below
const lmTrack = [];
{
  const nearest = (q) => { let b = -1, d = 1e9; for (let i = 0; i < NV; i++) { if (part(i) !== 0) continue; const e = Math.hypot(P[i * 3] - q[0], P[i * 3 + 1] - q[1], P[i * 3 + 2] - q[2]); if (e < d) { d = e; b = i; } } return b; };
  for (const k of ['mouthCentre', 'mouthCornerL', 'mouthCornerR', 'upperLip', 'lowerLip', 'innerUpperLip', 'innerLowerLip', 'noseTip', 'chin']) {
    if (lm[k]) { const i = nearest(lm[k]); lmTrack.push({ k, i, p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]] }); }
  }
  lm.multiPie68.forEach((q, j) => { const i = nearest(q); lmTrack.push({ k: 'm68', j, i, p: [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]] }); });
}

// ---- rest expression (first, so every mask below sees the final rest shape)
for (const [name, w] of REST) {
  let dp, dn;
  if (L[`morph:${name}:position`]) { dp = view(`morph:${name}:position`); dn = view(`morph:${name}:normal`); }
  else {
    dp = extraView(`morph:${name}:position`);
    if (!dp) throw new Error('no target ' + name);
    dn = extraView(`morph:${name}:normal`) || new Float32Array(NV * 3);
  }
  for (let i = 0; i < NV; i++) {
    for (let c = 0; c < 3; c++) { P[i * 3 + c] += w * dp[i * 3 + c]; N[i * 3 + c] += w * dn[i * 3 + c]; }
    const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; N[i * 3] /= l; N[i * 3 + 1] /= l; N[i * 3 + 2] /= l;
  }
  if (RENORM.has(name)) { for (let q = 0; q < dp.length; q++) { dp[q] *= 1 - w; dn[q] *= 1 - w; } }
}
if (REST.length) report.rest = { ...Object.fromEntries(REST), renorm: [...RENORM] };
if (ADDT.length) report.addTargets = ADDT;

// ---- r1: the sculpt's separate shells. The upper lashes are a thick tube (a 'visor') 0.045 W proud of the lid margin
// with anime flicks past the eye corners, the lower lash a small outer wing, the brows raised tubes 0.02-0.03 W off the
// skin. In the lattice they read as a black band over the eyes (the visor and its baked shadow) and heavy, low brows.
const morphNames = hdr.morphs.map((m) => m.name);
const shellKind = new Uint8Array(NV); // 1 upper lash, 2 lower lash, 3 brow
{
  const par = new Int32Array(NV).map((_, i) => i);
  const fnd = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < idx.length; t += 3) { const r = fnd(idx[t]); par[fnd(idx[t + 1])] = r; par[fnd(idx[t + 2])] = r; }
  const acc = new Map();
  for (let i = 0; i < NV; i++) {
    if (part(i) !== 0) continue;
    const r = fnd(i); const a = acc.get(r) || { n: 0, x: 0, y: 0, vs: [] };
    a.n++; a.x += Math.abs(P[i * 3]); a.y += P[i * 3 + 1]; a.vs.push(i); acc.set(r, a);
  }
  const found = [];
  for (const a of acc.values()) {
    if (a.n > 1000) continue; // head, ears
    const x = a.x / a.n, y = a.y / a.n;
    const kind = y > 0.07 && y < 0.2 && x > 0.1 && x < 0.4 ? 3 : y > -0.02 && y < 0.05 && x > 0.15 && x < 0.42 ? 1 : y > -0.07 && y < -0.01 && x > 0.25 && x < 0.42 ? 2 : 0;
    if (kind) { for (const i of a.vs) shellKind[i] = kind; found.push({ kind, n: a.n, x: +x.toFixed(3), y: +y.toFixed(3) }); }
  }
  report.shells = found;
}
const isMainSkin = (i) => part(i) === 0 && !shellKind[i];
if (LASHSHELL === 'remove') {
  // degenerate every lash-shell triangle: the main skin's own lid margin (at the visor's lower edge, on the eyeball)
  // becomes the lid line, as on a human eye
  let n = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const k = shellKind[idx[t]];
    if (k === 1 || k === 2) { idx[t + 1] = idx[t]; idx[t + 2] = idx[t]; n++; }
  }
  report.lashShellRemoved = n;
}
if (BROWSHELL === 'flat') {
  // lay each brow vertex onto the main skin straight behind it (after an optional lift), 0.001 W proud, with the skin's
  // normal and the skin's morph deltas (barycentric), so the brow is hair drawn on the skin and moves with it
  const tris = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (a === b || !isMainSkin(a) || !isMainSkin(b) || !isMainSkin(c)) continue;
    const ys = [P[a * 3 + 1], P[b * 3 + 1], P[c * 3 + 1]];
    if (Math.max(...ys) < 0.0 || Math.min(...ys) > 0.4) continue;
    tris.push(a, b, c);
  }
  const G = 0.01, grid = new Map();
  for (let q = 0; q < tris.length; q += 3) {
    const xs = [tris[q], tris[q + 1], tris[q + 2]].map((v) => P[v * 3]), ys = [tris[q], tris[q + 1], tris[q + 2]].map((v) => P[v * 3 + 1]);
    for (let gx = Math.floor(Math.min(...xs) / G); gx <= Math.floor(Math.max(...xs) / G); gx++)
      for (let gy = Math.floor(Math.min(...ys) / G); gy <= Math.floor(Math.max(...ys) / G); gy++) {
        const key = gx * 10007 + gy; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(q);
      }
  }
  const mviews = morphNames.map((m) => [view(`morph:${m}:position`), view(`morph:${m}:normal`)]);
  let n = 0, miss = 0;
  for (let i = 0; i < NV; i++) {
    if (shellKind[i] !== 3) continue;
    const x = P[i * 3];
    const f = smooth(0.09, 0.43, Math.abs(x));
    const y = P[i * 3 + 1] + BROWLIFT[0] + (BROWLIFT[1] - BROWLIFT[0]) * f;
    let best = null;
    for (const q of grid.get(Math.floor(x / G) * 10007 + Math.floor(y / G)) || []) {
      const a = tris[q], b = tris[q + 1], c = tris[q + 2];
      const ax = P[a * 3], ay = P[a * 3 + 1], bx = P[b * 3], by = P[b * 3 + 1], cx = P[c * 3], cy = P[c * 3 + 1];
      const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(den) < 1e-14) continue;
      const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den, v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den, w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      const z = u * P[a * 3 + 2] + v * P[b * 3 + 2] + w * P[c * 3 + 2];
      if (!best || z > best.z) best = { z, a, b, c, u, v, w };
    }
    if (!best) { miss++; continue; }
    const { a, b, c, u, v, w } = best;
    let nx = u * N[a * 3] + v * N[b * 3] + w * N[c * 3], ny = u * N[a * 3 + 1] + v * N[b * 3 + 1] + w * N[c * 3 + 1], nz = u * N[a * 3 + 2] + v * N[b * 3 + 2] + w * N[c * 3 + 2];
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    P[i * 3] = x + 0.001 * nx; P[i * 3 + 1] = y + 0.001 * ny; P[i * 3 + 2] = best.z + 0.001 * nz;
    N[i * 3] = nx; N[i * 3 + 1] = ny; N[i * 3 + 2] = nz;
    for (const [dp, dn] of mviews) for (let k = 0; k < 3; k++) {
      dp[i * 3 + k] = u * dp[a * 3 + k] + v * dp[b * 3 + k] + w * dp[c * 3 + k];
      dn[i * 3 + k] = u * dn[a * 3 + k] + v * dn[b * 3 + k] + w * dn[c * 3 + k];
    }
    // curvature / features of the skin underneath (no raised ridge)
    view('curv')[i] = u * view('curv')[a] + v * view('curv')[b] + w * view('curv')[c];
    for (let k = 0; k < 4; k++) feat[i * 4 + k] = 0;
    n++;
  }
  report.browShell = { flattened: n, miss, lift: BROWLIFT, tone: BROWTONE };
}

// ---- r1: retouch warps (liquify-style gaussian brushes on every part, so the mouth interior / teeth / eyes follow):
//   move,cx,cy,cz,rx,ry,rz,dx,dy,dz[,sym]    d = (dx,dy,dz) g(p)            sym: also at -cx with -dx
//   scale,cx,cy,cz,rx,ry,rz,sx,sy,sz         d = ((x-cx) sx, (y-cy) sy, (z-cz) sz) g(p)
//   g = exp(-|((p - c) / r)|^2); position only (normals follow the surface change below; morph deltas unchanged)
let movedAny = false;
const P0 = Float32Array.from(P);
if (WARPS.length) {
  const specs = [];
  for (const s of WARPS) {
    const a = s.split(','); const t = a[0]; const v = a.slice(1, 10).map(Number); const sym = a[10] === 'sym';
    specs.push({ t, v }); if (sym) specs.push({ t, v: [-v[0], v[1], v[2], v[3], v[4], v[5], -v[6], v[7], v[8]] });
  }
  const D = new Float32Array(NV * 3);
  for (const { t, v } of specs) {
    const [cx, cy, cz, rx, ry, rz, a, b, c] = v;
    for (let i = 0; i < NV; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
      if (e > 16) continue;
      const g = Math.exp(-e);
      if (t === 'move') { D[i * 3] += a * g; D[i * 3 + 1] += b * g; D[i * 3 + 2] += c * g; }
      else { D[i * 3] += (x - cx) * a * g; D[i * 3 + 1] += (y - cy) * b * g; D[i * 3 + 2] += (z - cz) * c * g; }
    }
  }
  let mx = 0;
  for (let q = 0; q < D.length; q++) { P[q] += D[q]; mx = Math.max(mx, Math.abs(D[q])); }
  report.warps = { n: specs.length, maxMove: +mx.toFixed(4) };
  movedAny = true;
}
if (TEETH[0] || TEETH[1]) {
  // the sculpt's upper teeth sit 0.04 W behind the lip seam and above it: none shows in the open visemes
  for (let i = 0; i < NV; i++) if (part(i) === 2) { P[i * 3 + 1] += TEETH[0]; P[i * 3 + 2] += TEETH[1]; }
  report.teeth = TEETH;
}
if (movedAny) {
  // normals: add the change of the geometric normal (keeps the rig export's own normal smoothing elsewhere)
  const live = idx; // degenerate lash tris contribute nothing
  const G0 = geoNormals(P0, live), G1 = geoNormals(P, live);
  for (let i = 0; i < NV; i++) {
    const x = N[i * 3] + G1[i * 3] - G0[i * 3], y = N[i * 3 + 1] + G1[i * 3 + 1] - G0[i * 3 + 1], z = N[i * 3 + 2] + G1[i * 3 + 2] - G0[i * 3 + 2];
    const l = Math.hypot(x, y, z) || 1; N[i * 3] = x / l; N[i * 3 + 1] = y / l; N[i * 3 + 2] = z / l;
  }
}
// landmarks follow their vertices (mouth corners / centre drive the engine's lip seam + corner shadows); --track-lm
if (argv.includes('--track-lm')) {
  const moved = {};
  for (const t of lmTrack) {
    const d = [P[t.i * 3] - t.p[0], P[t.i * 3 + 1] - t.p[1], P[t.i * 3 + 2] - t.p[2]];
    const tgt = t.k === 'm68' ? lm.multiPie68[t.j] : lm[t.k];
    for (let k = 0; k < 3; k++) tgt[k] = +(tgt[k] + d[k]).toFixed(5);
    if (t.k !== 'm68' && Math.hypot(...d) > 1e-4) moved[t.k] = d.map((q) => +q.toFixed(4));
  }
  report.landmarksMoved = moved;
}
if (REBAKE) {
  // key-light visibility + AO for the new rest shape (sf-mesh.mjs sampling: cone 18 deg x 64, hemisphere x 128, AO 0.1 W),
  // so no shadow of the removed visor / old brow tubes stays painted on the lids
  const t0 = Date.now();
  const THREE = await import(requireHF.resolve('three'));
  const { MeshBVH } = await import(requireHF.resolve('three-mesh-bvh'));
  const live = [];
  for (let t = 0; t < idx.length; t += 3) if (idx[t] !== idx[t + 1]) live.push(idx[t], idx[t + 1], idx[t + 2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(P), 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(live), 1));
  const bvh = new MeshBVH(geo);
  const LIGHTV = hdr.light || [-0.12, 0.72, 0.68];
  const CONE = ((hdr.bake && hdr.bake.coneDeg) || 18) * Math.PI / 180, RV = (hdr.bake && hdr.bake.raysVis) || 64, RA = (hdr.bake && hdr.bake.raysAo) || 128;
  const AO_MAX = (hdr.bake && hdr.bake.aoMax) || 0.1, EPS = 0.0015;
  const Ld = new THREE.Vector3(...LIGHTV).normalize();
  const tU = new THREE.Vector3(0, 0, 1).cross(Ld).normalize(), tV = Ld.clone().cross(tU).normalize();
  const coneDirs = [];
  for (let k = 0; k < RV; k++) { const r = Math.sqrt((k + 0.5) / RV) * Math.tan(CONE), a = k * 2.399963; coneDirs.push(Ld.clone().addScaledVector(tU, r * Math.cos(a)).addScaledVector(tV, r * Math.sin(a)).normalize()); }
  const hemi = [];
  for (let k = 0; k < RA; k++) { const u = (k + 0.5) / RA, r = Math.sqrt(u), a = k * 2.399963; hemi.push([r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u)]); }
  const rnd = mulberry32(1234);
  const ray = new THREE.Ray(), o = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3();
  let nb = 0;
  for (let i = 0; i < NV; i++) {
    const pp = part(i);
    const r0 = rnd(); // one draw per vertex in index order, as sf-mesh.mjs
    if (pp === 1 || pp === 2) continue;
    if (shellKind[i] === 1 || shellKind[i] === 2) { if (LASHSHELL === 'remove') continue; }
    n.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    o.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).addScaledVector(n, EPS);
    let hit = 0;
    for (const dir of coneDirs) { ray.set(o, dir); if (bvh.raycastFirst(ray, THREE.DoubleSide, 0.0005, 3)) hit++; }
    t1.set(Math.abs(n.x) < 0.9 ? 1 : 0, Math.abs(n.x) < 0.9 ? 0 : 1, 0).cross(n).normalize(); t2.copy(n).cross(t1);
    const rot = r0 * Math.PI * 2, cr = Math.cos(rot), sr = Math.sin(rot);
    let occ = 0;
    for (const h of hemi) {
      const hx = h[0] * cr - h[1] * sr, hy = h[0] * sr + h[1] * cr;
      d.set(0, 0, 0).addScaledVector(t1, hx).addScaledVector(t2, hy).addScaledVector(n, h[2]).normalize();
      ray.set(o, d);
      const hh = bvh.raycastFirst(ray, THREE.DoubleSide, 0.0005, AO_MAX);
      if (hh) occ += 1 - (hh.distance / AO_MAX) * 0.5;
    }
    bake[i * 4] = 1 - hit / RV; bake[i * 4 + 1] = 1 - occ / RA; nb++;
  }
  report.rebake = { verts: nb, s: +((Date.now() - t0) / 1000).toFixed(1) };
}
if (BROWSHELL === 'flat' && BROWTONE !== 1) {
  for (let i = 0; i < NV; i++) if (shellKind[i] === 3) { bake[i * 4] *= BROWTONE; bake[i * 4 + 1] *= BROWTONE; }
}

// ---- iris: cos' = cos(k acos(cos)); ICT iris edge angle = acos(0.865) on r_ict; sculpt angle for IRIS = asin(IRIS / r)
const R_EYE = lm.eyeRadius;
const ICT_EDGE = Math.acos(0.865);
const k = ICT_EDGE / Math.asin(Math.min(0.99, IRIS / R_EYE));
let nEye = 0;
for (let i = 0; i < NV; i++) {
  const p = part(i);
  if (p !== 3 && p !== 4) continue;
  eye[i] = Math.cos(Math.min(Math.PI, k * Math.acos(Math.max(-1, Math.min(1, eye[i])))));
  nEye++;
}
report.iris = { target: IRIS, eyeRadius: R_EYE, k: +k.toFixed(3), pupilRadius: +(R_EYE * Math.sin(Math.acos(0.9815) / k)).toFixed(4), verts: nEye };

// ---- lid margins -> part 5 (lacrimal); skin only, in front of the eyeball, not the lash-strip wings
const tags = new Uint8Array(NV); // 1 lid rim, 2 brow, 3 lash, 4 body (no hair fit)
if (LIDRIM > 0 && (RIMMODE === 'skin' || RIMMODE === 'both')) {
  let n = 0;
  for (let i = 0; i < NV; i++) {
    if (part(i) !== 0) continue;
    for (const c of [lm.eyeCentreL, lm.eyeCentreR]) {
      const dx = P[i * 3] - c[0], dy = P[i * 3 + 1] - c[1], dz = P[i * 3 + 2] - c[2];
      const d = Math.hypot(dx, dy, dz) - R_EYE;
      if (d > -0.004 && d < LIDRIM && dz > 0.6 * R_EYE && Math.hypot(dx, dy) < 0.115 && N[i * 3 + 2] > RIMNZ) {
        // ICT's lacrimal film faces forward and sits in the key (vis ~0.9, AO ~0.77): the sculpt's lid margins
        // are tucked under the lids (vis ~0), so they get the film's light terms
        bake[i * 4 + 3] = 5; bake[i * 4] = Math.max(bake[i * 4], RIMVIS); bake[i * 4 + 1] = Math.max(bake[i * 4 + 1], RIMAO);
        tags[i] = 1; n++; break;
      }
    }
  }
  report.lidRim = n;
}
if (RIMMODE === 'band') {
  if (CLEARW) for (let i = 0; i < NV; i++) feat[i * 4 + 3] = 0;
  // r1: lid margins found in the FRONT VIEW (what the lattice sees): visible skin within a thin band of the visible
  // eyeball. Lower lid -> part 5 (the lit tear line, --rim-band-lo W wide); upper lid -> feat.w (the engine's
  // lash-line term, soft, --rim-band-up W wide), since the sculpt's own upper margin sat under the removed visor.
  const RES = 0.0015, X0 = -0.5, X1 = 0.5, Y0 = -0.2, Y1 = 0.16;
  const BW = Math.round((X1 - X0) / RES), BH = Math.round((Y1 - Y0) / RES);
  const zb = new Float32Array(BW * BH).fill(-1e9), pid = new Int8Array(BW * BH).fill(-1);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (a === b) continue;
    const pa = part(a); if (pa === 1 || pa === 2) continue;
    const ax = (P[a * 3] - X0) / RES, ay = (Y1 - P[a * 3 + 1]) / RES, bx = (P[b * 3] - X0) / RES, by = (Y1 - P[b * 3 + 1]) / RES, cx = (P[c * 3] - X0) / RES, cy = (Y1 - P[c * 3 + 1]) / RES;
    const mnx = Math.max(0, Math.floor(Math.min(ax, bx, cx))), mxx = Math.min(BW - 1, Math.ceil(Math.max(ax, bx, cx)));
    const mny = Math.max(0, Math.floor(Math.min(ay, by, cy))), mxy = Math.min(BH - 1, Math.ceil(Math.max(ay, by, cy)));
    if (mnx > mxx || mny > mxy) continue;
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-12) continue;
    const eyeTri = pa === 3 || pa === 4 ? 1 : 0;
    for (let py = mny; py <= mxy; py++) for (let px = mnx; px <= mxx; px++) {
      const u = ((by - cy) * (px + 0.5 - cx) + (cx - bx) * (py + 0.5 - cy)) / den, v = ((cy - ay) * (px + 0.5 - cx) + (ax - cx) * (py + 0.5 - cy)) / den, w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      const z = u * P[a * 3 + 2] + v * P[b * 3 + 2] + w * P[c * 3 + 2];
      const o = py * BW + px; if (z <= zb[o]) continue; zb[o] = z; pid[o] = eyeTri;
    }
  }
  // nearest visible-eyeball pixel for every pixel (two-pass 8-neighbour propagation of seed coordinates)
  const sx = new Int32Array(BW * BH).fill(-1), sy = new Int32Array(BW * BH).fill(-1), dd = new Float32Array(BW * BH).fill(1e9);
  for (let o = 0; o < BW * BH; o++) if (pid[o] === 1) { sx[o] = o % BW; sy[o] = (o / BW) | 0; dd[o] = 0; }
  const relax = (o, q) => { if (sx[q] < 0) return; const x = o % BW, y = (o / BW) | 0; const d = Math.hypot(x - sx[q], y - sy[q]); if (d < dd[o]) { dd[o] = d; sx[o] = sx[q]; sy[o] = sy[q]; } };
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const o = y * BW + x; if (x > 0) relax(o, o - 1); if (y > 0) { relax(o, o - BW); if (x > 0) relax(o, o - BW - 1); if (x < BW - 1) relax(o, o - BW + 1); } }
    for (let y = BH - 1; y >= 0; y--) for (let x = BW - 1; x >= 0; x--) { const o = y * BW + x; if (x < BW - 1) relax(o, o + 1); if (y < BH - 1) { relax(o, o + BW); if (x < BW - 1) relax(o, o + BW + 1); if (x > 0) relax(o, o + BW - 1); } }
  }
  let nUp = 0, nLo = 0;
  for (let i = 0; i < NV; i++) {
    if (!isMainSkin(i) && part(i) !== 5) continue;
    const px = Math.floor((P[i * 3] - X0) / RES), py = Math.floor((Y1 - P[i * 3 + 1]) / RES);
    if (px < 0 || py < 0 || px >= BW || py >= BH) continue;
    const o = py * BW + px;
    if (pid[o] !== 0 || P[i * 3 + 2] < zb[o] - 0.004 || sx[o] < 0) continue; // visible skin only
    const d = dd[o] * RES;
    const below = sy[o] > py; // nearest eyeball pixel is below the vertex (larger image y): upper lid
    if (below && d < RIMUP) {
      if (RIMUPMODE === 'part5') {
        // as ICT's lacrimal film on #5: the upper margin is part 5 too, at a lower light (judge: ~0.6x the lower rim)
        if (N[i * 3 + 2] > 0) { bake[i * 4 + 3] = 5; bake[i * 4] = Math.max(bake[i * 4], RIMVIS * RIMUPK); bake[i * 4 + 1] = Math.max(bake[i * 4 + 1], RIMAO); tags[i] = 1; nUp++; }
      } else {
        const w = 1 - smooth(RIMUP * 0.45, RIMUP, d);
        feat[i * 4 + 3] = Math.max(feat[i * 4 + 3], w); nUp++;
      }
    } else if (!below && d < RIMLO && N[i * 3 + 2] > 0) {
      bake[i * 4 + 3] = 5; bake[i * 4] = Math.max(bake[i * 4], RIMVIS); bake[i * 4 + 1] = Math.max(bake[i * 4 + 1], RIMAO); tags[i] = 1; nLo++;
    }
  }
  report.lidBand = { up: nUp, lo: nLo, bandUp: RIMUP, bandLo: RIMLO };
}
if (RIMMODE === 'eyeball' || RIMMODE === 'both') {
  // lid skin near each eyeball (candidates), then eyeball verts in front whose xy distance to them < RIMBAND
  const lids = [];
  for (let i = 0; i < NV; i++) {
    if (part(i) !== 0 && part(i) !== 5) continue;
    for (const c of [lm.eyeCentreL, lm.eyeCentreR]) {
      const dx = P[i * 3] - c[0], dy = P[i * 3 + 1] - c[1], dz = P[i * 3 + 2] - c[2];
      if (Math.hypot(dx, dy, dz) - R_EYE < LIDNEAR && dz > 0.3 * R_EYE && Math.hypot(dx, dy) < 0.13) { lids.push(i); break; }
    }
  }
  let n = 0;
  for (let i = 0; i < NV; i++) {
    const p = part(i); if (p !== 3 && p !== 4) continue;
    if (N[i * 3 + 2] < 0.2 || eye[i] > 0.8) continue; // front-facing sclera only, never the iris
    let d = 1e9;
    for (const j of lids) { const e = Math.hypot(P[i * 3] - P[j * 3], P[i * 3 + 1] - P[j * 3 + 1]); if (e < d) d = e; }
    if (d < RIMBAND) { bake[i * 4 + 3] = 5; bake[i * 4] = Math.max(bake[i * 4], RIMVIS); bake[i * 4 + 1] = Math.max(bake[i * 4 + 1], RIMAO); tags[i] = 1; n++; }
  }
  report.eyeRim = { lids: lids.length, tagged: n };
}

// ---- brow ribbons / lash strips: raised strips found by height above a heavily smoothed skin surface
if (BROW !== 1 || LASH !== 1 || BROWFLAT > 0 || LASHFLAT > 0) {
  const nb = Array.from({ length: NV }, () => []);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b);
  }
  let A = Float32Array.from(P), B = new Float32Array(NV * 3);
  for (let it = 0; it < 60; it++) {
    for (let v = 0; v < NV; v++) {
      const ns = nb[v]; if (!ns.length) { B.set(A.subarray(v * 3, v * 3 + 3), v * 3); continue; }
      let x = 0, y = 0, z = 0; for (const j of ns) { x += A[j * 3]; y += A[j * 3 + 1]; z += A[j * 3 + 2]; }
      const w = 1 / ns.length; B[v * 3] = 0.5 * A[v * 3] + 0.5 * x * w; B[v * 3 + 1] = 0.5 * A[v * 3 + 1] + 0.5 * y * w; B[v * 3 + 2] = 0.5 * A[v * 3 + 2] + 0.5 * z * w;
    }
    [A, B] = [B, A];
  }
  // smoothed-surface normals (area-weighted face normals of A)
  const NA = new Float32Array(NV * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const e1 = [A[b * 3] - A[a * 3], A[b * 3 + 1] - A[a * 3 + 1], A[b * 3 + 2] - A[a * 3 + 2]];
    const e2 = [A[c * 3] - A[a * 3], A[c * 3 + 1] - A[a * 3 + 1], A[c * 3 + 2] - A[a * 3 + 2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    for (const v of [a, b, c]) { NA[v * 3] += nx; NA[v * 3 + 1] += ny; NA[v * 3 + 2] += nz; }
  }
  for (let v = 0; v < NV; v++) { const l = Math.hypot(NA[v * 3], NA[v * 3 + 1], NA[v * 3 + 2]) || 1; NA[v * 3] /= l; NA[v * 3 + 1] /= l; NA[v * 3 + 2] /= l; }
  const flatten = (i, f) => {
    if (f <= 0) return;
    const x = N[i * 3] * (1 - f) + NA[i * 3] * f, y = N[i * 3 + 1] * (1 - f) + NA[i * 3 + 1] * f, z = N[i * 3 + 2] * (1 - f) + NA[i * 3 + 2] * f;
    const l = Math.hypot(x, y, z) || 1; N[i * 3] = x / l; N[i * 3 + 1] = y / l; N[i * 3 + 2] = z / l;
  };
  const Hs = new Float32Array(NV);
  for (let i = 0; i < NV; i++) Hs[i] = (P[i * 3] - A[i * 3]) * N[i * 3] + (P[i * 3 + 1] - A[i * 3 + 1]) * N[i * 3 + 1] + (P[i * 3 + 2] - A[i * 3 + 2]) * N[i * 3 + 2];
  const m68 = lm.multiPie68;
  const browPts = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26].map((q) => m68[q]);
  let nb2 = 0, nl = 0;
  for (let i = 0; i < NV; i++) {
    if (part(i) !== 0) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    const h = Hs[i];
    let db = 1e9; for (const q of browPts) db = Math.min(db, Math.hypot(x - q[0], y - q[1]));
    if (db < 0.06 && y > 0.06 && z > -0.2) {
      // ribbon + its skirt (the flatten reaches a little wider than the darkening so no edge line is left)
      const w = smooth(0.002, 0.008, h) * (1 - smooth(0.04, 0.06, db));
      const wf = smooth(0.0005, 0.004, h) * (1 - smooth(0.045, 0.065, db));
      if (w > 0) { const f = 1 - (1 - BROW) * w; bake[i * 4] *= f; bake[i * 4 + 1] *= f; tags[i] = 2; nb2++; }
      flatten(i, BROWFLAT * wf);
    }
    if (tags[i] === 0 && y > -0.02 && y < 0.09 && Math.abs(Math.abs(x) - 0.25) < 0.14 && z > -0.1) {
      const w = smooth(0.003, 0.01, h);
      const wf = smooth(0.001, 0.006, h);
      if (w > 0) { const f = 1 - (1 - LASH) * w; bake[i * 4] *= f; bake[i * 4 + 1] *= f; tags[i] = 3; nl++; }
      flatten(i, LASHFLAT * wf);
    }
  }
  report.brow = nb2; report.lash = nl;
}

// ---- hair fit: shoulders / chest out of the 'skin' range (index reorder inside the skin part, same part id)
{
  const sp = hdr.parts.find((p) => p.name === 'skin');
  const keep = [], body = [];
  for (let t = sp.start; t < sp.start + sp.count; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const ymax = Math.max(P[a * 3 + 1], P[b * 3 + 1], P[c * 3 + 1]);
    (ymax < HAIRY ? body : keep).push(a, b, c);
    if (ymax < HAIRY) tags[a] = tags[b] = tags[c] = 4;
  }
  idx.set(keep, sp.start); idx.set(body, sp.start + keep.length);
  const parts = [];
  for (const p of hdr.parts) {
    if (p.name !== 'skin') { parts.push(p); continue; }
    parts.push({ ...p, count: keep.length }, { name: 'skin-body', id: p.id, start: p.start + keep.length, count: body.length });
  }
  hdr.parts = parts;
  report.hairFit = { y: HAIRY, skinTris: keep.length / 3, bodyTris: body.length / 3 };
}

// ---- jaw gain
if (JAWG !== 1) {
  const m = hdr.morphs.find((q) => q.name === 'jawOpen');
  for (const s of ['position', 'normal']) { const a = view(`morph:jawOpen:${s}`); for (let q = 0; q < a.length; q++) a[q] *= JAWG; }
  report.jawGain = JAWG; if (m) m.gain = JAWG;
}

// ---- r1: jawOpen couples a little upper-lip lift (the upper lip rises and catches light as the mouth opens, instead of a
// dark hole under a static lip) and per-target gains (funnel / pucker: rounder O on this small mouth)
if (JAWCOUPLE.length) {
  const jp = view('morph:jawOpen:position'), jn = view('morph:jawOpen:normal');
  for (const [name, w] of JAWCOUPLE) {
    const dp = view(`morph:${name}:position`), dn = view(`morph:${name}:normal`);
    for (let q = 0; q < jp.length; q++) { jp[q] += w * dp[q]; jn[q] += w * dn[q]; }
  }
  report.jawCouple = Object.fromEntries(JAWCOUPLE);
}
for (const [name, g] of GAINS) {
  for (const s of ['position', 'normal']) { const a = view(`morph:${name}:${s}`); for (let q = 0; q < a.length; q++) a[q] *= g; }
  const m = hdr.morphs.find((q) => q.name === name); if (m) m.gain = g;
}
if (GAINS.length) report.gains = Object.fromEntries(GAINS);

hdr.name = NAME;
hdr.bin = `mesh-${NAME}.bin`;
hdr.lookData = { from: basename(SRC), ...report };
const dir = OUTDIR;
writeFileSync(join(dir, `mesh-${NAME}.bin`), out);
writeFileSync(join(dir, `mesh-${NAME}.json`), JSON.stringify(hdr, null, 1));
console.log(JSON.stringify(report));

if (DEBUG) {
  const sharp = require('sharp');
  const S = 900, sc = S / 2.2, cx = S / 2, cy = S * 0.42;
  const img = Buffer.alloc(S * S * 3);
  const col = [[70, 70, 70], [255, 200, 60], [80, 200, 255], [255, 90, 200], [90, 255, 120]];
  const order = [...Array(NV).keys()].sort((a, b) => P[a * 3 + 2] - P[b * 3 + 2]);
  for (const i of order) {
    const p = part(i); if (p !== 0 && p !== 5) continue;
    if (N[i * 3 + 2] < -0.2) continue;
    const x = Math.round(cx + P[i * 3] * sc), y = Math.round(cy - P[i * 3 + 1] * sc);
    if (x < 0 || y < 0 || x >= S || y >= S) continue;
    const c = col[tags[i]]; const sh = tags[i] ? 1 : 0.35 + 0.65 * Math.max(0, N[i * 3 + 2]);
    const o = (y * S + x) * 3; img[o] = c[0] * sh; img[o + 1] = c[1] * sh; img[o + 2] = c[2] * sh;
  }
  await sharp(img, { raw: { width: S, height: S, channels: 3 } }).png().toFile(DEBUG);
  console.log('debug', DEBUG);
}

function geoNormals(pos, T) {
  const acc = new Float32Array(pos.length);
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t], b = T[t + 1], c = T[t + 2];
    if (a === b) continue;
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1x = pos[b * 3] - ax, e1y = pos[b * 3 + 1] - ay, e1z = pos[b * 3 + 2] - az;
    const e2x = pos[c * 3] - ax, e2y = pos[c * 3 + 1] - ay, e2z = pos[c * 3 + 2] - az;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    for (const v of [a, b, c]) { acc[v * 3] += nx; acc[v * 3 + 1] += ny; acc[v * 3 + 2] += nz; }
  }
  for (let v = 0; v < acc.length / 3; v++) {
    const l = Math.hypot(acc[v * 3], acc[v * 3 + 1], acc[v * 3 + 2]) || 1;
    acc[v * 3] /= l; acc[v * 3 + 1] /= l; acc[v * 3 + 2] /= l;
  }
  return acc;
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
