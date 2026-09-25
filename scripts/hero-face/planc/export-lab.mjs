#!/usr/bin/env node
// Plan C: rig-raw (from s40_rig.py, Blender) -> hero-face lab mesh (json header + bin), the format of
// scripts/hero-face/lab-mesh.mjs / engine/lab-mesh.ts. Adds what the engine needs on top of the rig:
// smooth normals, convexity (curv), feature masks (lip vermilion / side / upper-lip border / lash line),
// baked key-light visibility + AO (three-mesh-bvh) and per-target normal deltas.
// Geometry: "free Cute girl face" by Rodesqa (Sketchfab; used with the artist's permission) rigged with
// ICT-FaceKit Light expressions (MIT, (c) 2020 USC Institute for Creative Technologies).
//   node export-lab.mjs [--raw <dir with rig-raw.json>] [--out <dir>] [--name cute] [--light -0.16,0.85,0.50] [--cone 18]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const HF = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const RAW = arg('raw', join(HF, 'work'));
const OUT = arg('out', HF);
const NAME = arg('name', 'cute');
const LIGHT = arg('light', '-0.12,0.72,0.68').split(',').map(Number);
const CONE_DEG = +arg('cone', 18);
const RAYS_VIS = +arg('rays-vis', 64);
const RAYS_AO = +arg('rays-ao', 128);

const t0 = Date.now();
const hdr = JSON.parse(readFileSync(join(RAW, 'rig-raw.json'), 'utf8'));
const bin = readFileSync(join(RAW, 'rig-raw.bin'));
const NV = hdr.vertexCount, NI = hdr.indexCount;
let off = 0;
const take = (Ctor, n) => { const a = new Ctor(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + n * 4)); off += n * 4; return a; };
const P = take(Float32Array, NV * 3);
const tris = take(Uint32Array, NI);
const partOf = take(Float32Array, NV);
const aEye = take(Float32Array, NV);
const morphRaw = hdr.morphs.map(() => take(Float32Array, NV * 3));
const PART = hdr.partIds;

// ---------------------------------------------------------------- normals (no welding: the lip cut must stay open)
function computeNormals(pos) {
  const n = new Float32Array(NV * 3);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1x = pos[b * 3] - ax, e1y = pos[b * 3 + 1] - ay, e1z = pos[b * 3 + 2] - az;
    const e2x = pos[c * 3] - ax, e2y = pos[c * 3 + 1] - ay, e2z = pos[c * 3 + 2] - az;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    for (const v of [a, b, c]) { n[v * 3] += nx; n[v * 3 + 1] += ny; n[v * 3 + 2] += nz; }
  }
  for (let v = 0; v < NV; v++) {
    const l = Math.hypot(n[v * 3], n[v * 3 + 1], n[v * 3 + 2]) || 1;
    n[v * 3] /= l; n[v * 3 + 1] /= l; n[v * 3 + 2] /= l;
  }
  return n;
}
const N = computeNormals(P);

// ---------------------------------------------------------------- feature masks (sculpt contours, normalised W)
const C = hdr.contours;
const lm = hdr.landmarks;
const outer = [...C.lipOuterUp, ...C.lipOuterLo.slice().reverse()];
const upperOuter = C.lipOuterUp;
const seam = C.seam;
const segDist = (x, y, poly, closed) => {
  let best = 1e9;
  const n = poly.length, m = closed ? n : n - 1;
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
const interpY = (poly, x) => {
  const xs = poly.map((q) => q[0]);
  const t = Math.max(Math.min(...xs), Math.min(Math.max(...xs), x));
  for (let k = 0; k + 1 < poly.length; k++) {
    const [ax, ay] = poly[k], [bx, by] = poly[k + 1];
    if ((t - ax) * (t - bx) <= 0) return ay + ((t - ax) / (bx - ax || 1e-9)) * (by - ay);
  }
  return poly[0][1];
};
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mouthC = lm.mouthCentre;
const lidL = C.lidUpL, lidR = C.lidUpR;
const feat = new Float32Array(NV * 4);
for (let i = 0; i < NV; i++) {
  if (partOf[i] !== PART.skin) continue;
  const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
  if (N[i * 3 + 2] < 0.05) continue;
  if (z > mouthC[2] - 0.12 && Math.abs(x) < 0.3 && y < mouthC[1] + 0.13 && y > mouthC[1] - 0.2) {
    const d = segDist(x, y, outer, true) * (inside(x, y, outer) ? 1 : -1);
    feat[i * 4] = smooth(-0.006, 0.006, d);
    feat[i * 4 + 1] = Math.tanh((y - interpY(seam, x)) / 0.008);
    const du = segDist(x, y + 0.002, upperOuter, false);
    feat[i * 4 + 2] = y > interpY(seam, x) ? Math.exp(-(du * du) / (2 * 0.0075 * 0.0075)) : 0;
  }
  if (z > -0.2 && y > -0.08 && y < 0.12 && Math.abs(x) < 0.45) {
    const lid = x < 0 ? lidR : lidL;
    const xs = lid.map((q) => q[0]);
    if (x >= Math.min(...xs) && x <= Math.max(...xs)) {
      const yl = interpY(lid, x);
      const dl = segDist(x, y - 0.004, lid, false);
      feat[i * 4 + 3] = Math.exp(-(dl * dl) / (2 * 0.007 * 0.007)) * smooth(-0.003, 0.003, y - yl);
    }
  }
}

// ---------------------------------------------------------------- convexity (sculpt term), skin only
const curv = new Float32Array(NV);
{
  const nb = Array.from({ length: NV }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const sm = (src, iters) => {
    let a = src.slice(), b = new Float32Array(NV * 3);
    for (let it = 0; it < iters; it++) {
      for (let k = 0; k < NV; k++) {
        const ns = nb[k];
        if (!ns.size) { b[k * 3] = a[k * 3]; b[k * 3 + 1] = a[k * 3 + 1]; b[k * 3 + 2] = a[k * 3 + 2]; continue; }
        let x = 0, y = 0, z = 0; for (const j of ns) { x += a[j * 3]; y += a[j * 3 + 1]; z += a[j * 3 + 2]; }
        const w = 1 / ns.size; b[k * 3] = 0.5 * a[k * 3] + 0.5 * x * w; b[k * 3 + 1] = 0.5 * a[k * 3 + 1] + 0.5 * y * w; b[k * 3 + 2] = 0.5 * a[k * 3 + 2] + 0.5 * z * w;
      }
      [a, b] = [b, a];
    }
    return a;
  };
  const s1 = sm(P, 12), s2 = sm(P, 48);
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

// ---------------------------------------------------------------- bake key-light visibility + AO
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
geo.setIndex(new THREE.BufferAttribute(tris, 1));
const bvh = new MeshBVH(geo);
const Ld = new THREE.Vector3(...LIGHT).normalize();
let seed = 1234;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
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
const mouthW = new Float32Array(NV);
for (let i = 0; i < NV; i++) {
  const dx = P[i * 3] - mouthC[0], dy = (P[i * 3 + 1] - mouthC[1]) * 1.3;
  mouthW[i] = Math.exp(-(dx * dx + dy * dy) / (2 * 0.12 * 0.12));
  if (partOf[i] === PART.mouth || partOf[i] === PART.teeth) mouthW[i] = 1;
}

// ---------------------------------------------------------------- morph normal deltas
const morphs = hdr.morphs.map((name, k) => {
  const dp = morphRaw[k];
  const Pt = new Float32Array(NV * 3);
  let sx = 0, sw = 0;
  for (let i = 0; i < NV; i++) {
    for (let j = 0; j < 3; j++) Pt[i * 3 + j] = P[i * 3 + j] + dp[i * 3 + j];
    const m = Math.hypot(dp[i * 3], dp[i * 3 + 1], dp[i * 3 + 2]); sx += P[i * 3] * m; sw += m;
  }
  const Nt = computeNormals(Pt);
  const dn = new Float32Array(NV * 3);
  for (let j = 0; j < dn.length; j++) dn[j] = Nt[j] - N[j];
  return { name, source: hdr.sources[k], dp, dn, centroidX: +(sx / (sw || 1)).toFixed(4) };
});

// ---------------------------------------------------------------- write (same layout as lab-mesh.mjs)
const chunks = []; let offset = 0; const layout = {};
const add = (key, arr, type, size) => {
  const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  layout[key] = { offset, type, size, count: arr.length / size };
  chunks.push(buf); offset += buf.length;
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
  source: '"free Cute girl face" by Rodesqa (Sketchfab; used with the artist\'s permission), rigged with ICT-FaceKit Light expressions (commit da5f95a607f5e6b37755b38d3385d7f2853732e5)',
  copyright: 'Sculpt: Rodesqa (permission granted to GBO Vision). Expression deltas: ICT-FaceKit (c) 2020 USC Institute for Creative Technologies, MIT License',
  units: 'W (face width = 2 x interpupillary distance); origin = midpoint between pupils; +Y up, +Z toward camera',
  Wsculpt: hdr.Wsculpt, ipdSculpt: hdr.ipdSculpt, rig: hdr.params,
  light: LIGHT, bake: { raysVis: RAYS_VIS, raysAo: RAYS_AO, aoMax: AO_MAX, coneDeg: CONE_DEG },
  vertexCount: NV, indexCount: NI, parts: hdr.parts, partIds: PART, layout, morphs: morphMeta, landmarks: lm,
  bbox: bb.map((a) => a.map((x) => +x.toFixed(4))),
};
mkdirSync(OUT, { recursive: true });
const binPath = join(OUT, `mesh-${NAME}.bin`), jsonPath = join(OUT, `mesh-${NAME}.json`);
header.bin = basename(binPath);
writeFileSync(binPath, Buffer.concat(chunks));
writeFileSync(jsonPath, JSON.stringify(header, null, 1));
const side = morphMeta.filter((m) => /Left$|Right$/.test(m.name)).map((m) => `${m.name}:x=${m.centroidX}`).join(' ');
console.log(`wrote ${jsonPath} (${NV} verts, ${NI / 3} tris, ${morphs.length} targets, ${(offset / 1e6).toFixed(2)} MB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`parts: ${hdr.parts.map((p) => `${p.name}=${p.count / 3}`).join(' ')}`);
console.log(`side check (+x = subject's left): ${side}`);
let fx = 0, fw = 0; for (let i = 0; i < NV; i++) { if (feat[i * 4] > 0.5) fx++; if (feat[i * 4 + 3] > 0.5) fw++; }
console.log(`feature masks: vermilion ${fx} verts, lash line ${fw} verts; vis mean ${(vis.reduce((a, b) => a + b, 0) / NV).toFixed(3)}, ao mean ${(ao.reduce((a, b) => a + b, 0) / NV).toFixed(3)}`);
