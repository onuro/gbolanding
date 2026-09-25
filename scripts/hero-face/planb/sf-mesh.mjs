#!/usr/bin/env node
// Plan B: Sketchfab "Stylized Anime Female Head" (Rodesqa, CC BY 4.0) rigged with ICT-FaceKit expressions
// -> hero-face lab mesh (same format as scripts/hero-face/lab-mesh.mjs: json header + bin, read by
// src/components/hero-face/engine/lab-mesh.ts).
//
// Input: the intermediate written by s60_export_src.py (WORK/sf-src.json + .bin: W-normalised positions, parts,
// eye-axis cosine, indices, morph position deltas, landmarks incl. a sculpt Multi-PIE 68).
// This script adds what the engine expects: smooth normals, key-light visibility + AO bake (three-mesh-bvh),
// mouth weight, convexity, feature masks, per-morph normal deltas.
//
//   node sf-mesh.mjs [--src <sf-src.json>] [--out <dir>] [--name sf] [--targets required|lipsync|all|a,b,c]
//                    [--light -0.12,0.72,0.68] [--cone 18] [--rays-vis 64] [--rays-ao 128]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '../package.json'));
const THREE = await import(require.resolve('three'));
const { MeshBVH } = await import(require.resolve('three-mesh-bvh'));

const PB = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const SRC = resolve(arg('src', join(PB, 'work/sf-src.json')));
const OUT = resolve(arg('out', PB));
const NAME = arg('name', 'sf');
const LIGHT = arg('light', '-0.12,0.72,0.68').split(',').map(Number);
const CONE_DEG = +arg('cone', 18);
const RAYS_VIS = +arg('rays-vis', 64);
const RAYS_AO = +arg('rays-ao', 128);

const LIPSYNC = ['jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthSmile_L', 'mouthSmile_R', 'mouthStretch_L', 'mouthStretch_R',
  'mouthLowerDown_L', 'mouthLowerDown_R', 'mouthUpperUp_L', 'mouthUpperUp_R', 'eyeBlink_L', 'eyeBlink_R'];
const REQUIRED = [...LIPSYNC, 'eyeWide_L', 'eyeWide_R', 'eyeSquint_L', 'eyeSquint_R', 'browInnerUp_L', 'browInnerUp_R'];
const arkitName = (n) => n.replace(/_L$/, 'Left').replace(/_R$/, 'Right');

const hdr = JSON.parse(readFileSync(SRC, 'utf8'));
const buf = readFileSync(SRC.replace(/\.json$/, '.bin'));
const view = (k) => {
  const l = hdr.layout[k];
  const ab = buf.buffer.slice(buf.byteOffset + l.offset, buf.byteOffset + l.offset + l.count * l.size * 4);
  return l.type === 'u32' ? new Uint32Array(ab) : new Float32Array(ab);
};
const tsel = arg('targets', 'required');
const TARGETS = tsel === 'all' ? hdr.names : tsel === 'lipsync' ? LIPSYNC : tsel === 'required' ? REQUIRED : tsel.split(',');

const P = view('position'), partOf = view('part'), aEye = view('eye'), tris = view('index');
const NV = hdr.vertexCount;
const PART = hdr.partIds;

function computeNormals(pos, T) {
  const acc = new Float32Array(pos.length);
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t], b = T[t + 1], c = T[t + 2];
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

const t0 = Date.now();
const N = computeNormals(P, tris);
const lmk = hdr.landmarks;
const mouthC = lmk.mouthCentre;

// ---- mouth weight (as lab-mesh.mjs)
const mouthW = new Float32Array(NV);
for (let i = 0; i < NV; i++) {
  const dx = P[i * 3] - mouthC[0], dy = (P[i * 3 + 1] - mouthC[1]) * 1.3;
  mouthW[i] = Math.exp(-(dx * dx + dy * dy) / (2 * 0.12 * 0.12));
  if (partOf[i] === PART.mouth || partOf[i] === PART.teeth) mouthW[i] = 1;
}

// ---- feature masks (same definitions as lab-mesh.mjs, driven by the sculpt's Multi-PIE 68)
const feat = new Float32Array(NV * 4);
{
  const lm = lmk.multiPie68;
  const pts = (ids) => ids.map((k) => [lm[k][0], lm[k][1]]);
  const outer = pts([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59]);
  const inner = pts([60, 61, 62, 63, 64, 65, 66, 67]);
  const upperOuter = pts([48, 49, 50, 51, 52, 53, 54]);
  const lidR = pts([36, 37, 38, 39]), lidL = pts([42, 43, 44, 45]);
  const segDist = (x, y, poly, closed) => {
    let best = 1e9; const n = poly.length, m = closed ? n : n - 1;
    for (let k = 0; k < m; k++) {
      const [ax, ay] = poly[k], [bx, by] = poly[(k + 1) % n];
      const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-12;
      const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
      best = Math.min(best, Math.hypot(x - ax - t * ex, y - ay - t * ey));
    }
    return best;
  };
  const inside = (x, y, poly) => {
    let c = false;
    for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) {
      const [xi, yi] = poly[k], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) c = !c;
    }
    return c;
  };
  const seamY = (x) => {
    const xs = inner.map((q) => q[0]); const xl = Math.min(...xs), xr = Math.max(...xs);
    const t = Math.max(xl, Math.min(xr, x));
    const up = [inner[0], inner[1], inner[2], inner[3], inner[4]], lo = [inner[4], inner[5], inner[6], inner[7], inner[0]];
    const interp = (poly) => {
      for (let k = 0; k + 1 < poly.length; k++) {
        const [ax, ay] = poly[k], [bx, by] = poly[k + 1];
        if ((t - ax) * (t - bx) <= 0) return ay + ((t - ax) / (bx - ax || 1e-9)) * (by - ay);
      }
      return poly[0][1];
    };
    return 0.5 * (interp(up) + interp(lo));
  };
  const mouthZ = mouthC[2];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < NV; i++) {
    if (partOf[i] !== PART.skin) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (N[i * 3 + 2] < 0.05) continue;
    if (z > mouthZ - 0.12 && Math.abs(x) < 0.3 && y < -0.35 && y > -0.68) {
      const d = segDist(x, y, outer, true) * (inside(x, y, outer) ? 1 : -1);
      feat[i * 4] = smooth(-0.006, 0.006, d);
      feat[i * 4 + 1] = Math.tanh((y - seamY(x)) / 0.008);
      const du = segDist(x, y + 0.002, upperOuter, false);
      feat[i * 4 + 2] = y > -0.5 ? Math.exp(-(du * du) / (2 * 0.0075 * 0.0075)) : 0;
    }
    if (z > -0.12 && y > -0.08 && y < 0.1 && Math.abs(x) < 0.45) {
      const lid = x < 0 ? lidR : lidL;
      const dl = segDist(x, y - 0.004, lid, false);
      const xs = lid.map((q) => q[0]);
      let yl = null;
      for (let k = 0; k + 1 < lid.length; k++) {
        const [ax, ay] = lid[k], [bx, by] = lid[k + 1];
        if ((x - ax) * (x - bx) <= 0) { yl = ay + ((x - ax) / (bx - ax || 1e-9)) * (by - ay); break; }
      }
      if (yl !== null && x >= Math.min(...xs) && x <= Math.max(...xs)) feat[i * 4 + 3] = Math.exp(-(dl * dl) / (2 * 0.007 * 0.007)) * smooth(-0.003, 0.003, y - yl);
    }
  }
}

// ---- convexity: N . (p - laplacian-smoothed p) at two scales (skin only, as lab-mesh.mjs)
const curv = new Float32Array(NV);
{
  const nb = Array.from({ length: NV }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const smoothP = (src, iters) => {
    let a = src.slice(), b = new Float32Array(NV * 3);
    for (let it = 0; it < iters; it++) {
      for (let k = 0; k < NV; k++) {
        const ns = nb[k]; if (!ns.size) { b[k * 3] = a[k * 3]; b[k * 3 + 1] = a[k * 3 + 1]; b[k * 3 + 2] = a[k * 3 + 2]; continue; }
        let x = 0, y = 0, z = 0; for (const j of ns) { x += a[j * 3]; y += a[j * 3 + 1]; z += a[j * 3 + 2]; }
        const w = 1 / ns.size; b[k * 3] = 0.5 * a[k * 3] + 0.5 * x * w; b[k * 3 + 1] = 0.5 * a[k * 3 + 1] + 0.5 * y * w; b[k * 3 + 2] = 0.5 * a[k * 3 + 2] + 0.5 * z * w;
      }
      [a, b] = [b, a];
    }
    return a;
  };
  // the sculpt is ~2x denser than ICT around the features: scale the smoothing iterations accordingly
  const s1 = smoothP(P, 24), s2 = smoothP(P, 96);
  const raw = new Float32Array(NV); const vals = [];
  for (let i = 0; i < NV; i++) {
    if (partOf[i] !== PART.skin) continue;
    const d1 = (P[i * 3] - s1[i * 3]) * N[i * 3] + (P[i * 3 + 1] - s1[i * 3 + 1]) * N[i * 3 + 1] + (P[i * 3 + 2] - s1[i * 3 + 2]) * N[i * 3 + 2];
    const d2 = (P[i * 3] - s2[i * 3]) * N[i * 3] + (P[i * 3 + 1] - s2[i * 3 + 1]) * N[i * 3 + 1] + (P[i * 3 + 2] - s2[i * 3 + 2]) * N[i * 3 + 2];
    raw[i] = d1 * 2.0 + d2; vals.push(Math.abs(raw[i]));
  }
  vals.sort((a, b) => a - b);
  const q = vals[Math.floor(vals.length * 0.95)] || 1;
  for (let i = 0; i < NV; i++) curv[i] = Math.max(-1, Math.min(1, raw[i] / q));
}

// ---- key-light visibility + AO (three-mesh-bvh, same sampling as lab-mesh.mjs)
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
// MeshBVH reorders the geometry's index buffer in place: give it a copy, or the written index no longer matches the
// part ranges in the header (the bug in the 23:31 mesh-sfp / mesh-sf exports: mouth + teeth tris landed in 'skin')
geo.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));
const bvh = new MeshBVH(geo);
const Ld = new THREE.Vector3(...LIGHT).normalize();
const rnd = mulberry32(1234);
const coneDirs = [];
const cone = (CONE_DEG * Math.PI) / 180;
const tU = new THREE.Vector3(0, 0, 1).cross(Ld).normalize(), tV = Ld.clone().cross(tU).normalize();
for (let k = 0; k < RAYS_VIS; k++) {
  const r = Math.sqrt((k + 0.5) / RAYS_VIS) * Math.tan(cone), a = k * 2.399963;
  coneDirs.push(Ld.clone().addScaledVector(tU, r * Math.cos(a)).addScaledVector(tV, r * Math.sin(a)).normalize());
}
const hemi = [];
for (let k = 0; k < RAYS_AO; k++) { const u = (k + 0.5) / RAYS_AO, r = Math.sqrt(u), a = k * 2.399963; hemi.push([r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u)]); }
const vis = new Float32Array(NV).fill(1), ao = new Float32Array(NV).fill(1);
const ray = new THREE.Ray(), o = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3();
const AO_MAX = 0.10, EPS = 0.0015;
for (let i = 0; i < NV; i++) {
  const pp = partOf[i];
  if (pp === PART.teeth || pp === PART.mouth) { vis[i] = 0; ao[i] = 0.2; continue; }
  n.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
  o.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).addScaledVector(n, EPS);
  let hit = 0;
  for (const dir of coneDirs) { ray.set(o, dir); if (bvh.raycastFirst(ray, THREE.DoubleSide, 0.0005, 3)) hit++; }
  vis[i] = 1 - hit / RAYS_VIS;
  t1.set(Math.abs(n.x) < 0.9 ? 1 : 0, Math.abs(n.x) < 0.9 ? 0 : 1, 0).cross(n).normalize(); t2.copy(n).cross(t1);
  const rot = rnd() * Math.PI * 2, cr = Math.cos(rot), sr = Math.sin(rot);
  let occ = 0;
  for (const h of hemi) {
    const hx = h[0] * cr - h[1] * sr, hy = h[0] * sr + h[1] * cr;
    d.set(0, 0, 0).addScaledVector(t1, hx).addScaledVector(t2, hy).addScaledVector(n, h[2]).normalize();
    ray.set(o, d);
    const hh = bvh.raycastFirst(ray, THREE.DoubleSide, 0.0005, AO_MAX);
    if (hh) occ += 1 - (hh.distance / AO_MAX) * 0.5;
  }
  ao[i] = 1 - occ / RAYS_AO;
}

// ---- morphs: position deltas from the rig, normal deltas recomputed
const morphs = [];
for (const name of TARGETS) {
  const dp = view(`morph:${name}`);
  let sx = 0, sw = 0;
  const Pt = new Float32Array(NV * 3);
  for (let i = 0; i < NV; i++) {
    for (let k = 0; k < 3; k++) Pt[i * 3 + k] = P[i * 3 + k] + dp[i * 3 + k];
    const m = Math.hypot(dp[i * 3], dp[i * 3 + 1], dp[i * 3 + 2]); sx += P[i * 3] * m; sw += m;
  }
  const Nt = computeNormals(Pt, tris);
  const dn = new Float32Array(NV * 3);
  for (let k = 0; k < dn.length; k++) dn[k] = Nt[k] - N[k];
  morphs.push({ name: arkitName(name), source: name, dp, dn, centroidX: +(sx / (sw || 1)).toFixed(4) });
}

// ---- write
const chunks = []; let offset = 0; const layout = {};
const add = (key, arr, type, size) => {
  const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  layout[key] = { offset, type, size, count: arr.length / size };
  chunks.push(b); offset += b.length;
  const pad = (4 - (offset % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
};
const bake = new Float32Array(NV * 4);
for (let i = 0; i < NV; i++) { bake[i * 4] = vis[i]; bake[i * 4 + 1] = ao[i]; bake[i * 4 + 2] = mouthW[i]; bake[i * 4 + 3] = partOf[i]; }
add('position', P, 'f32', 3); add('normal', N, 'f32', 3); add('bake', bake, 'f32', 4); add('eye', aEye, 'f32', 1);
add('curv', curv, 'f32', 1); add('feat', feat, 'f32', 4); add('index', tris, 'u32', 1);
const morphMeta = [];
for (const m of morphs) { add(`morph:${m.name}:position`, m.dp, 'f32', 3); add(`morph:${m.name}:normal`, m.dn, 'f32', 3); morphMeta.push({ name: m.name, source: m.source, centroidX: m.centroidX }); }
const bb = [[1e9, 1e9, 1e9], [-1e9, -1e9, -1e9]];
for (let i = 0; i < NV; i++) for (let k = 0; k < 3; k++) { bb[0][k] = Math.min(bb[0][k], P[i * 3 + k]); bb[1][k] = Math.max(bb[1][k], P[i * 3 + k]); }
const header = {
  format: 'hero-face-lab-mesh', version: 1, name: NAME,
  source: '"Stylized Anime Female Head" by Rodesqa (https://sketchfab.com/3d-models/stylized-anime-female-head-e8d04325a74e46a98a6494abe721a8b2), CC BY 4.0; decimated, lips split, mouth interior added, rigged with ICT-FaceKit Light expressions (commit da5f95a607f5e6b37755b38d3385d7f2853732e5)',
  copyright: '"Stylized Anime Female Head" by Rodesqa, licensed under CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/), modified. Expression shapes and teeth: ICT-FaceKit (c) 2020 USC Institute for Creative Technologies, MIT License',
  units: `W (= 2 x ${hdr.wmode === 'centre' ? 'inter-eyeball-centre distance' : 'interpupillary distance'}; ${hdr.W_sculpt.toFixed(4)} sculpt units); origin = midpoint between pupils; +Y up, +Z toward camera`,
  Wcm: null, ipdCm: null, identity: [], expressions: {}, light: LIGHT,
  bake: { raysVis: RAYS_VIS, raysAo: RAYS_AO, aoMax: AO_MAX, coneDeg: CONE_DEG },
  vertexCount: NV, indexCount: tris.length, parts: hdr.parts, partIds: PART, layout, morphs: morphMeta, landmarks: lmk,
  bbox: bb.map((a) => a.map((x) => +x.toFixed(4))),
};
mkdirSync(OUT, { recursive: true });
const binPath = join(OUT, `mesh-${NAME}.bin`), jsonPath = join(OUT, `mesh-${NAME}.json`);
header.bin = basename(binPath);
writeFileSync(binPath, Buffer.concat(chunks));
writeFileSync(jsonPath, JSON.stringify(header, null, 1));
console.log(`wrote ${jsonPath} (${NV} verts, ${tris.length / 3} tris, ${morphs.length} targets, ${(offset / 1e6).toFixed(2)} MB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`parts: ${hdr.parts.map((p) => `${p.name}=${p.count / 3}`).join(' ')}`);
console.log(`side check (+x = subject's left): ${morphMeta.filter((m) => /Left$|Right$/.test(m.name)).map((m) => `${m.name}:x=${m.centroidX}`).join(' ')}`);
