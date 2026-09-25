#!/usr/bin/env node
// Hero-face lab-mesh post-process: a more feminine NOSE, MOUTH and BROW for the ICT-FaceKit identity, same person.
//
// Reads any lab mesh written by scripts/hero-face/lab-mesh.mjs (json header + bin, any morph set: lipsync / face /
// gaze incl. eyeLook*), moves the REST positions with smooth, landmark-driven, region-weighted displacement fields,
// and re-derives everything that depends on the rest shape exactly the way lab-mesh.mjs builds it:
//   normals (area-weighted, skin welded), convexity (curv), key-light visibility + AO (bake.xy, same light / cone /
//   ray counts / seed as the header's bake), morph NORMAL deltas (N(rest' + dp) - N(rest')), landmarks, bbox.
// Morph POSITION deltas are kept as they are (deltas on top of the new rest shape): every expression moves the same
// vertices by the same amounts, so jaw / lips / lids / brows animate exactly as before, only from the new rest.
// The feature masks (feat: lip vermilion / side / upper-lip border / lash line) ride the vertices and are kept.
// The eyeballs (sclera, iris) never move. Topology, vertex order, index buffer, layout order are unchanged.
//
// usage:
//   node feminize.mjs <in mesh-*.json> <out mesh-*.json> [--strength 1] [--nose 1] [--mouth 1] [--brow 1]
//                     [--set key=value,key=value] [--name <mesh name>] [--no-bake] [--verify]
//   --strength   scales every amplitude (0 = identity: the output reproduces the input's derived data)
//   --nose / --mouth / --brow   per-region multipliers on top of --strength
//   --set        override single parameters of P below (e.g. --set tipNarrow=0.2,bowPeak=0.006)
//   --verify     no deformation: re-derive normals / curv / bake / morph normals from the input and report the
//                max deviation from the stored arrays (checks this script reproduces lab-mesh.mjs)
//   --no-bake    keep the input's visibility / AO (fast preview; shadows then no longer match the new shape)
// Units: W (face width = 2 x IPD), origin between the pupils, +Y up, +Z toward the camera (lab-mesh convention).
// Landmarks used: multiPie68 (27-35 nose, 17-26 brows, 48-67 lips), mouthCentre, pupils.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

// ------------------------------------------------------------------ parameters (strength 1)
// Displacements in W (1 W ~ 11.9 cm on this identity; 0.01 W ~ 1.2 mm ~ one dot at 90 dots across the face).
export const P = {
  // NOSE -------------------------------------------------------------------------------------------------------
  bridgeNarrow: 0.28,    // dorsum: |x| compressed toward the midline by up to this share (sharper ridge, thin highlight)
  bridgeHalfW: 0.105,   // |x| where the dorsum narrowing has faded out (clear of the inner eye corners at |x| ~0.137)
  bridgeCrest: 0.009,   // half-width of the dorsum crest strip that is not compressed (W)
  bridgeSide: 0.005,    // dorsum side walls set back (W): the ridge stands out as an edge
  tipNarrow: 0.22,      // tip lobule |x| compression (refined, narrower tip)
  tipR: [0.085, 0.07],  // tip lobule radii (x, y)
  tipPoint: 0.0045,     // tip-defining point pushed forward (W): a small bright point instead of a round ball
  tipPointR: 0.032,
  tipLift: 0.0015,       // tip rotated up a touch (W)
  alarIn: 0.016,        // alar lobules pulled toward the midline (W): compact base, less flare
  alarBack: 0.006,      // alar lobules set back (W): less exposed rim / flare
  alarDown: 0.006,      // alar rims lowered a touch (W): hides a little of the nostril openings from the front
  alarC: [0.1, -0.035], // alar lobule centre: |x| (W) and y relative to landmark 33 (subnasale) + (tip - sub) / 2
  alarR: [0.065, 0.075], // (x radius unused since v7: the lobule weight is a profile from the midline to the crease)
  alarEdge: 0.128,      // |x| of the alar crease (ala / cheek junction) where the nose-base reshaping has faded out
  baseNarrow: 0.07,     // whole nose base |x| compression (nostrils, columella base, alar grooves)
  // MOUTH ------------------------------------------------------------------------------------------------------
  mouthNarrow: 0.07,    // lips |x| compressed by this share (corners move in by share x corner |x|)
  upperFwd: 0.007,      // upper vermilion forward (W): fuller upper lip, catches the key light
  upperUp: 0.006,      // upper vermilion border raised (W): more vermilion height
  bowPeak: 0.0045,      // Cupid's bow peaks raised (W)
  bowDip: 0.0035,       // Cupid's bow centre notch lowered (W)
  bowPeakX: 0.048,      // |x| of the bow peaks (W)
  philtrumBack: 0.016,
  philtrumFade: 0.075,  // height above the border (W) where the philtrum set-back has faded out  // upper-lip skin (philtrum) set back (W): no lit 'moustache' bump above the lip
  lowerBack: 0.01,     // lower vermilion set back (W): less heavy lower lip
  lowerUp: 0.006,
  lowerTaper: 0.004,    // extra set-back of the lower vermilion toward the corners (W)       // lower vermilion border raised (W): lower lip a little less tall
  // BROW -------------------------------------------------------------------------------------------------------
  browBack: 0.013,      // supraorbital ridge set back (W): less forward bone
  browLift: 0.026,      // brow tissue lifted toward the tails (W, at the tail; 0 at the inner brow): an arch
  browGlabella: 0.4,    // share of the set-back that also acts on the glabella (between the brows)
};

// ------------------------------------------------------------------ CLI
function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { o._.push(a); continue; }
    const k = a.slice(2);
    const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    o[k] = v;
  }
  return o;
}

// ------------------------------------------------------------------ small math
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const bump = (t) => (t >= 1 ? 0 : (1 - t * t) * (1 - t * t)); // compact C1 kernel on |t| < 1 (t >= 0)
const bump2 = (dx, dy) => bump(Math.min(1, Math.sqrt(dx * dx + dy * dy)));
function interpY(poly, x) { // poly sorted by x: [[x, y], ...] -> y at x (clamped)
  if (x <= poly[0][0]) return poly[0][1];
  for (let k = 0; k + 1 < poly.length; k++) {
    const [ax, ay] = poly[k], [bx, by] = poly[k + 1];
    if (x <= bx) return ay + ((x - ax) / (bx - ax || 1e-9)) * (by - ay);
  }
  return poly[poly.length - 1][1];
}

// ------------------------------------------------------------------ mesh io
export function readMesh(jsonPath) {
  const header = JSON.parse(readFileSync(jsonPath, 'utf8'));
  if (header.format !== 'hero-face-lab-mesh') throw new Error(`${jsonPath}: not a hero-face lab mesh`);
  const bin = readFileSync(join(dirname(jsonPath), header.bin));
  const ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
  const arr = {};
  for (const [k, l] of Object.entries(header.layout)) {
    arr[k] = l.type === 'u32' ? new Uint32Array(ab.slice(l.offset, l.offset + 4 * l.count * l.size)) : new Float32Array(ab.slice(l.offset, l.offset + 4 * l.count * l.size));
  }
  return { header, arr, NV: header.vertexCount };
}
function writeMesh(jsonPath, header, arr) {
  const keys = Object.keys(header.layout).sort((a, b) => header.layout[a].offset - header.layout[b].offset);
  const chunks = [];
  let offset = 0;
  const layout = {};
  for (const k of keys) {
    const a = arr[k], l = header.layout[k];
    const buf = Buffer.from(a.buffer, a.byteOffset, a.byteLength);
    layout[k] = { offset, type: l.type, size: l.size, count: a.length / l.size };
    chunks.push(buf); offset += buf.length;
    const pad = (4 - (offset % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
  }
  const out = { ...header, layout };
  mkdirSync(dirname(jsonPath), { recursive: true });
  out.bin = basename(jsonPath).replace(/\.json$/, '.bin');
  writeFileSync(join(dirname(jsonPath), out.bin), Buffer.concat(chunks));
  writeFileSync(jsonPath, JSON.stringify(out, null, 1));
  return offset;
}

// ------------------------------------------------------------------ derived data (as scripts/hero-face/lab-mesh.mjs)
function buildWeld(pos, weldable, eps) {
  const map = new Uint32Array(pos.length / 3);
  const seen = new Map();
  let count = 0;
  for (let v = 0; v < map.length; v++) {
    if (!weldable[v]) { map[v] = count++; continue; }
    const k = `${Math.round(pos[v * 3] / eps)},${Math.round(pos[v * 3 + 1] / eps)},${Math.round(pos[v * 3 + 2] / eps)}`;
    let id = seen.get(k);
    if (id === undefined) { id = count++; seen.set(k, id); }
    map[v] = id;
  }
  return { map, count };
}
function computeNormals(pos, tris, weld) {
  const nv = pos.length / 3;
  const acc = new Float32Array(weld.count * 3);
  const key = weld.map;
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1x = pos[b * 3] - ax, e1y = pos[b * 3 + 1] - ay, e1z = pos[b * 3 + 2] - az;
    const e2x = pos[c * 3] - ax, e2y = pos[c * 3 + 1] - ay, e2z = pos[c * 3 + 2] - az;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    for (const v of [a, b, c]) { const k = key[v]; acc[k * 3] += nx; acc[k * 3 + 1] += ny; acc[k * 3 + 2] += nz; }
  }
  const n = new Float32Array(nv * 3);
  for (let v = 0; v < nv; v++) {
    const k = key[v];
    const x = acc[k * 3], y = acc[k * 3 + 1], z = acc[k * 3 + 2];
    const l = Math.hypot(x, y, z) || 1;
    n[v * 3] = x / l; n[v * 3 + 1] = y / l; n[v * 3 + 2] = z / l;
  }
  return n;
}
function computeCurv(P, N, tris, weld, partOf) {
  const NV = P.length / 3, K = weld.count;
  const nb = Array.from({ length: K }, () => new Set());
  for (let t = 0; t < tris.length; t += 3) {
    const a = weld.map[tris[t]], b = weld.map[tris[t + 1]], c = weld.map[tris[t + 2]];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const base0 = new Float32Array(K * 3), cnt = new Float32Array(K);
  for (let i = 0; i < NV; i++) { const k = weld.map[i]; base0[k * 3] += P[i * 3]; base0[k * 3 + 1] += P[i * 3 + 1]; base0[k * 3 + 2] += P[i * 3 + 2]; cnt[k]++; }
  for (let k = 0; k < K; k++) { base0[k * 3] /= cnt[k]; base0[k * 3 + 1] /= cnt[k]; base0[k * 3 + 2] /= cnt[k]; }
  const smoothPos = (src, iters) => {
    let a = src.slice(), b = new Float32Array(K * 3);
    for (let it = 0; it < iters; it++) {
      for (let k = 0; k < K; k++) {
        const ns = nb[k]; if (!ns.size) { b[k * 3] = a[k * 3]; b[k * 3 + 1] = a[k * 3 + 1]; b[k * 3 + 2] = a[k * 3 + 2]; continue; }
        let x = 0, y = 0, z = 0; for (const j of ns) { x += a[j * 3]; y += a[j * 3 + 1]; z += a[j * 3 + 2]; }
        const w = 1 / ns.size; b[k * 3] = 0.5 * a[k * 3] + 0.5 * x * w; b[k * 3 + 1] = 0.5 * a[k * 3 + 1] + 0.5 * y * w; b[k * 3 + 2] = 0.5 * a[k * 3 + 2] + 0.5 * z * w;
      }
      [a, b] = [b, a];
    }
    return a;
  };
  const s1 = smoothPos(base0, 12), s2 = smoothPos(base0, 48);
  const raw = new Float32Array(NV);
  const vals = [];
  for (let i = 0; i < NV; i++) {
    if (partOf[i] !== 0 && partOf[i] !== 5) continue;
    const k = weld.map[i];
    const d1 = (base0[k * 3] - s1[k * 3]) * N[i * 3] + (base0[k * 3 + 1] - s1[k * 3 + 1]) * N[i * 3 + 1] + (base0[k * 3 + 2] - s1[k * 3 + 2]) * N[i * 3 + 2];
    const d2 = (base0[k * 3] - s2[k * 3]) * N[i * 3] + (base0[k * 3 + 1] - s2[k * 3 + 1]) * N[i * 3 + 1] + (base0[k * 3 + 2] - s2[k * 3 + 2]) * N[i * 3 + 2];
    raw[i] = d1 * 2.0 + d2;
    vals.push(Math.abs(raw[i]));
  }
  vals.sort((a, b) => a - b);
  const q = vals[Math.floor(vals.length * 0.95)] || 1;
  const curv = new Float32Array(NV);
  for (let i = 0; i < NV; i++) curv[i] = Math.max(-1, Math.min(1, raw[i] / q));
  return curv;
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function computeBake(P, N, tris, partOf, header) {
  const NV = P.length / 3;
  const LIGHT = header.light || [-0.16, 0.85, 0.5];
  const bk = header.bake || {};
  const RAYS_VIS = bk.raysVis ?? 64, RAYS_AO = bk.raysAo ?? 128, CONE_DEG = bk.coneDeg ?? 4, AO_MAX = bk.aoMax ?? 0.1, EPS = 0.0015;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));
  const bvh = new MeshBVH(geo);
  const Ld = new THREE.Vector3(...LIGHT).normalize();
  const rnd = mulberry32(1234);
  const coneDirs = [];
  const cone = (CONE_DEG * Math.PI) / 180;
  const tU = new THREE.Vector3(), tV = new THREE.Vector3();
  tU.set(0, 0, 1).cross(Ld).normalize(); tV.copy(Ld).cross(tU).normalize();
  for (let k = 0; k < RAYS_VIS; k++) {
    const r = Math.sqrt((k + 0.5) / RAYS_VIS) * Math.tan(cone), a = k * 2.399963;
    coneDirs.push(Ld.clone().addScaledVector(tU, r * Math.cos(a)).addScaledVector(tV, r * Math.sin(a)).normalize());
  }
  const hemi = [];
  for (let k = 0; k < RAYS_AO; k++) {
    const u = (k + 0.5) / RAYS_AO, r = Math.sqrt(u), a = k * 2.399963;
    hemi.push([r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u)]);
  }
  const vis = new Float32Array(NV).fill(1), ao = new Float32Array(NV).fill(1);
  const ray = new THREE.Ray(), o = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < NV; i++) {
    const pp = partOf[i];
    if (pp === 2 || pp === 1) { vis[i] = 0; ao[i] = 0.2; continue; }
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
  return { vis, ao };
}

// ------------------------------------------------------------------ front-surface depth (rest skin, orthographic)
function frontDepth(P, tris, partOf, x0, x1, y0, y1, step) {
  const W = Math.ceil((x1 - x0) / step), H = Math.ceil((y1 - y0) / step);
  const Z = new Float32Array(W * H).fill(-1e9);
  for (let t = 0; t < tris.length; t += 3) {
    const v = [tris[t], tris[t + 1], tris[t + 2]];
    if (partOf[v[0]] !== 0) continue;
    const px = v.map((i) => (P[i * 3] - x0) / step), py = v.map((i) => (P[i * 3 + 1] - y0) / step), pz = v.map((i) => P[i * 3 + 2]);
    const d = (px[1] - px[0]) * (py[2] - py[0]) - (px[2] - px[0]) * (py[1] - py[0]);
    if (Math.abs(d) < 1e-12) continue;
    const minx = Math.max(0, Math.floor(Math.min(...px))), maxx = Math.min(W - 1, Math.ceil(Math.max(...px)));
    const miny = Math.max(0, Math.floor(Math.min(...py))), maxy = Math.min(H - 1, Math.ceil(Math.max(...py)));
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const a = ((px[1] - x) * (py[2] - y) - (px[2] - x) * (py[1] - y)) / d;
      const b = ((px[2] - x) * (py[0] - y) - (px[0] - x) * (py[2] - y)) / d;
      const c = 1 - a - b;
      if (a < -1e-6 || b < -1e-6 || c < -1e-6) continue;
      const z = a * pz[0] + b * pz[1] + c * pz[2];
      const k = y * W + x;
      if (z > Z[k]) Z[k] = z;
    }
  }
  return (x, y) => {
    const fx = (x - x0) / step, fy = (y - y0) / step;
    const ix = Math.round(fx), iy = Math.round(fy);
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) return null;
    // max over the 3x3 neighbourhood (conservative: thin features keep their front)
    let z = -1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const X = ix + dx, Y = iy + dy;
      if (X >= 0 && Y >= 0 && X < W && Y < H) z = Math.max(z, Z[Y * W + X]);
    }
    return z < -1e8 ? null : z;
  };
}

// ------------------------------------------------------------------ the displacement field
// A pure function of the rest position (+ precomputed context), so welded duplicates move together, and landmarks
// can be moved with exactly the same map. Returns [dx, dy, dz].
function makeField(header, P0, tris, partOf, prm, gains) {
  const lm = header.landmarks;
  const L = lm.multiPie68;
  if (!L || L.length !== 68) throw new Error('mesh has no multiPie68 landmarks');
  const g = { nose: gains.nose, mouth: gains.mouth, brow: gains.brow };
  // --- nose frame
  const root = L[27], tip = L[30], sub = L[33];
  const noseLen = root[1] - tip[1];               // ~0.23 W
  const dorsTop = root[1] + 0.05, dorsBot = tip[1] + 0.035;
  const alarY = sub[1] + (tip[1] - sub[1]) / 2 + prm.alarC[1];
  // --- mouth frame
  const byX = (ids) => ids.map((k) => [L[k][0], L[k][1]]).sort((a, b) => a[0] - b[0]);
  const upperOuter = byX([48, 49, 50, 51, 52, 53, 54]);
  const lowerOuter = byX([48, 59, 58, 57, 56, 55, 54]);
  const innerUp = byX([48, 60, 61, 62, 63, 64, 54]);
  const innerLo = byX([48, 60, 67, 66, 65, 64, 54]);
  const cornerX = 0.5 * (Math.abs(L[48][0]) + Math.abs(L[54][0]));
  const mc = lm.mouthCentre;
  const seamY = (x) => 0.5 * (interpY(innerUp, x) + interpY(innerLo, x));
  // --- brow frame
  const browIn = 0.5 * (Math.abs(L[21][0]) + Math.abs(L[22][0]));
  const browTail = 0.5 * (Math.abs(L[17][0]) + Math.abs(L[26][0]));
  const browY = 0.5 * (L[19][1] + L[24][1]);      // brow peak height (~0.22)
  const lidY = 0.5 * (L[37][1] + L[38][1] + L[43][1] + L[44][1]) / 2; // upper lid margin (~0.03)
  // --- front surface
  const zf = frontDepth(P0, tris, partOf, -0.7, 0.7, -1.0, 0.6, 0.003);
  const front = (x, y, z) => { const f = zf(x, y); return f === null ? 1 : smooth(-0.035, -0.012, z - f); };

  const ctx = { root, tip, sub, alarY, cornerX, mc, browIn, browTail, browY, lidY, upperOuter, lowerOuter };
  const field = (x, y, z, part) => {
    let dx = 0, dy = 0, dz = 0;
    if (part === 3 || part === 4) return [0, 0, 0]; // eyeballs never move
    const ax = Math.abs(x), sx = Math.sign(x) || 0;
    // ============================================================ NOSE
    if (g.nose > 0 && z > -0.2 && ax < 0.26 && y < root[1] + 0.12 && y > sub[1] - 0.09) {
      const k = g.nose;
      // dorsum narrowing (x compression toward the midline, faded out before the inner eye corners and the tip)
      const wyB = smooth(dorsTop + 0.04, dorsTop - 0.03, y) * smooth(dorsBot - 0.03, dorsBot + 0.03, y);
      if (wyB > 0) {
        const hw = prm.bridgeHalfW;
        // the crest strip (|x| < bridgeCrest) keeps its width, so its highlight stays >= one dot wide and bright;
        // the side walls are drawn in toward it (0 again at |x| >= hw)
        const f = Math.max(0, ax - prm.bridgeCrest) * (1 - smooth(0.35 * hw, hw, ax));
        dx -= sx * k * prm.bridgeNarrow * f * wyB;
        // side walls set back: ridge stands out
        dz -= k * prm.bridgeSide * wyB * smooth(0.008, 0.04, ax) * (1 - smooth(0.06, hw, ax));
      }
      // tip lobule: narrower, a defined forward point, a touch of lift
      const tx = x / prm.tipR[0], ty = (y - tip[1]) / prm.tipR[1];
      const wT = bump2(tx, ty);
      if (wT > 0) {
        dx -= k * prm.tipNarrow * x * wT;
        dy += k * prm.tipLift * wT;
      }
      const wP = bump2(x / prm.tipPointR, (y - tip[1] - 0.004) / (prm.tipPointR * 1.1));
      if (wP > 0 && z > tip[2] - 0.08) dz += k * prm.tipPoint * wP;
      // nose base: nostrils + alae compressed toward the midline. Everything fades out inside the alar crease
      // (|x| ~ alarEdge), so the ala tucks in and the crease opens a little, while the cheek / upper-lip skin next
      // to the ala keeps its shape (moving it too turns it up into the key: bright bulbs beside the nose base)
      const edge = 1 - smooth(prm.alarEdge - 0.022, prm.alarEdge + 0.008, ax);
      const wyN = bump(Math.abs(y - (alarY + 0.005)) / 0.1);
      if (wyN > 0) dx -= k * prm.baseNarrow * x * wyN * edge;
      // alar lobules: in, back, a touch down
      const wA = smooth(0.015, 0.06, ax) * edge * bump(Math.abs(y - alarY) / prm.alarR[1]);
      if (wA > 0) {
        dx -= sx * k * prm.alarIn * wA;
        dz -= k * prm.alarBack * wA;
        dy -= k * prm.alarDown * wA;
      }
    }
    // ============================================================ MOUTH
    if (g.mouth > 0 && z > -0.3 && ax < 0.36 && y < sub[1] + 0.02 && y > mc[1] - 0.3) {
      const k = g.mouth;
      // narrower mouth: |x| compression, full inside the corners, fading out on the cheeks / chin / nose base
      const wyM = bump(Math.abs(y - mc[1]) / 0.2) * smooth(sub[1] + 0.01, sub[1] - 0.04, y);
      const wxM = 1 - smooth(cornerX * 0.95, cornerX + 0.13, ax);
      dx -= k * prm.mouthNarrow * x * wyM * wxM;
      const fr = front(x, y, z);
      if (fr > 0) {
        const wxL = 1 - smooth(cornerX * 0.55, cornerX * 1.02, ax); // lip shaping fades toward the corners
        const s = seamY(x);
        const yu = interpY(upperOuter, x), yl = interpY(lowerOuter, x);
        // upper lip: t = 0 at the seam, 1 at the vermilion border
        if (y >= s) {
          const hU = Math.max(0.02, yu - s);
          const t = (y - s) / hU;
          const above = Math.max(0, y - yu);                 // distance above the border (W)
          // forward push confined to the vermilion (max at the border: a crisp lit border ridge), gone 0.01 W above
          const verm = t <= 1 ? smooth(0.05, 0.75, t) : bump(above / 0.01);
          const lift = t <= 1 ? smooth(0.0, 1.0, t) : bump(above / 0.045);
          // Cupid's bow: peaks up, centre notch down (applied with the border lift profile)
          const bow = prm.bowPeak * Math.exp(-(((ax - prm.bowPeakX) / 0.024) ** 2)) - prm.bowDip * Math.exp(-((x / 0.017) ** 2));
          dz += k * fr * wxL * prm.upperFwd * verm;
          dy += k * fr * wxL * (prm.upperUp + bow) * lift;
          // philtrum (upper-lip skin between the border and the nose base) set back a little
          // deepest right above the border ridge, fading out toward the nose base: the lower philtrum turns more
          // upright (off the key's specular angle, so it no longer lights up as a block) and the border stands out
          // as one crisp lit ridge (white roll) with the Cupid's bow shape
          const ph = y > yu ? smooth(0.0, 0.011, above) * (1 - smooth(0.011, prm.philtrumFade, above)) * (1 - smooth(0.06, 0.14, ax)) : 0;
          dz -= k * fr * prm.philtrumBack * ph;
        } else {
          const hL = Math.max(0.02, s - yl);
          const t = (s - y) / hL;
          const below = Math.max(0, yl - y);
          const verm = t <= 1 ? smooth(0.1, 0.8, t) : Math.exp(-(below * below) / (2 * 0.02 * 0.02));
          const lift = t <= 1 ? smooth(0.0, 1.0, t) : bump(below / 0.05);
          // set back, more toward the sides (a rounder, shorter lower-lip highlight instead of a wide bar)
          dz -= k * fr * wxL * (prm.lowerBack + prm.lowerTaper * smooth(0.03, 0.12, ax)) * verm;
          dy += k * fr * wxL * prm.lowerUp * lift;
        }
      }
    }
    // ============================================================ BROW
    if (g.brow > 0 && ax < 0.62 && y > lidY + 0.005 && y < browY + 0.2) {
      const k = g.brow;
      const fr = front(x, y, z);
      if (fr > 0) {
        // supraorbital ridge set back: centred on the ridge band, fading to 0 at the lid crease and on the forehead
        const wy = bump(Math.abs(y - (browY - 0.055)) / 0.125);
        const wx = (prm.browGlabella + (1 - prm.browGlabella) * smooth(0.02, browIn + 0.05, ax)) * (1 - smooth(browTail - 0.02, browTail + 0.12, ax));
        dz -= k * fr * prm.browBack * wy * wx;
        // lift toward the tails: 0 at the inner brow, full at the tail; the band between lid crease and forehead
        const lat = smooth(browIn + 0.02, browTail - 0.03, ax) * (1 - smooth(browTail + 0.06, browTail + 0.16, ax));
        const wyL = bump(Math.abs(y - (browY - 0.04)) / 0.15) * smooth(lidY + 0.01, lidY + 0.06, y);
        dy += k * fr * prm.browLift * lat * wyL;
      }
    }
    return [dx, dy, dz];
  };
  return { field, ctx };
}

// ------------------------------------------------------------------ main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [inPath, outPath] = args._;
  if (!inPath || (!outPath && !args.verify)) {
    console.error('usage: node feminize.mjs <in mesh.json> <out mesh.json> [--strength 1] [--nose 1] [--mouth 1] [--brow 1] [--set k=v,...] [--name n] [--no-bake] [--verify]');
    process.exit(1);
  }
  const t0 = Date.now();
  const m = readMesh(resolve(inPath));
  const { header, arr, NV } = m;
  const prm = { ...P };
  if (args.set) for (const kv of args.set.split(',')) {
    const [k, v] = kv.split('=');
    if (!(k in prm)) throw new Error(`unknown parameter ${k}`);
    prm[k] = v.includes(':') ? v.split(':').map(Number) : +v;
  }
  const strength = args.verify ? 0 : +(args.strength ?? 1);
  const gains = { nose: strength * +(args.nose ?? 1), mouth: strength * +(args.mouth ?? 1), brow: strength * +(args.brow ?? 1) };
  const tris = arr.index;
  const bake = arr.bake;
  const partOf = new Int8Array(NV);
  for (let i = 0; i < NV; i++) partOf[i] = Math.round(bake[i * 4 + 3]);
  const P0 = arr.position;
  const weldable = new Uint8Array(NV);
  for (let i = 0; i < NV; i++) weldable[i] = partOf[i] === 0 ? 1 : 0;
  const weld = buildWeld(P0, weldable, 1e-5);

  // ---- displace the rest shape
  const { field } = makeField(header, P0, tris, partOf, prm, gains);
  const P1 = new Float32Array(P0.length);
  let maxD = 0;
  for (let i = 0; i < NV; i++) {
    const [dx, dy, dz] = field(P0[i * 3], P0[i * 3 + 1], P0[i * 3 + 2], partOf[i]);
    P1[i * 3] = P0[i * 3] + dx; P1[i * 3 + 1] = P0[i * 3 + 1] + dy; P1[i * 3 + 2] = P0[i * 3 + 2] + dz;
    maxD = Math.max(maxD, Math.hypot(dx, dy, dz));
  }
  // ---- derived data
  const N1 = computeNormals(P1, tris, weld);
  const curv1 = computeCurv(P1, N1, tris, weld, partOf);
  let vis, ao;
  if (args['no-bake'] && !args.verify) {
    vis = new Float32Array(NV); ao = new Float32Array(NV);
    for (let i = 0; i < NV; i++) { vis[i] = bake[i * 4]; ao[i] = bake[i * 4 + 1]; }
  } else ({ vis, ao } = computeBake(P1, N1, tris, partOf, header));
  const bake1 = new Float32Array(bake);
  for (let i = 0; i < NV; i++) { bake1[i * 4] = vis[i]; bake1[i * 4 + 1] = ao[i]; }
  const out = { ...arr, position: P1, normal: N1, curv: curv1, bake: bake1 };
  const morphNames = (header.morphs || []).map((mm) => mm.name);
  for (const name of morphNames) {
    const dp = arr[`morph:${name}:position`];
    const Pt = new Float32Array(P1.length);
    for (let k = 0; k < Pt.length; k++) Pt[k] = P1[k] + dp[k];
    const Nt = computeNormals(Pt, tris, weld);
    const dn = new Float32Array(Nt.length);
    for (let k = 0; k < dn.length; k++) dn[k] = Nt[k] - N1[k];
    out[`morph:${name}:normal`] = dn;
  }

  if (args.verify) {
    const maxDiff = (a, b, stride = 1, comp = null) => { let mx = 0; for (let i = 0; i < a.length; i++) { if (comp !== null && i % stride !== comp) continue; mx = Math.max(mx, Math.abs(a[i] - b[i])); } return mx; };
    console.log('verify (re-derived from the unmodified rest shape vs stored):');
    console.log('  normal  max |d| =', maxDiff(N1, arr.normal).toExponential(2));
    console.log('  curv    max |d| =', maxDiff(curv1, arr.curv).toExponential(2));
    console.log('  vis     max |d| =', maxDiff(bake1, bake, 4, 0).toExponential(2), ' ao max |d| =', maxDiff(bake1, bake, 4, 1).toExponential(2));
    for (const name of morphNames) console.log(`  morph ${name} normal max |d| =`, maxDiff(out[`morph:${name}:normal`], arr[`morph:${name}:normal`]).toExponential(2));
    console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    process.exit(0);
  }

  // ---- header: landmarks move with the same map, bbox, provenance
  const mv = (p) => { const [dx, dy, dz] = field(p[0], p[1], p[2], 0); return [p[0] + dx, p[1] + dy, p[2] + dz].map((v) => +v.toFixed(5)); };
  const lmOut = {};
  for (const [k, v] of Object.entries(header.landmarks)) {
    if (k === 'multiPie68') lmOut[k] = v.map(mv);
    else if (/^(pupil|eyeCentre)/.test(k)) lmOut[k] = v;
    else if (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number') lmOut[k] = mv(v);
    else lmOut[k] = v;
  }
  const bb = [[1e9, 1e9, 1e9], [-1e9, -1e9, -1e9]];
  for (let i = 0; i < NV; i++) for (let k = 0; k < 3; k++) { bb[0][k] = Math.min(bb[0][k], P1[i * 3 + k]); bb[1][k] = Math.max(bb[1][k], P1[i * 3 + k]); }
  const name = args.name || basename(outPath).replace(/^mesh-/, '').replace(/\.json$/, '');
  const hdr = {
    ...header, name, landmarks: lmOut, bbox: bb.map((a) => a.map((x) => +x.toFixed(4))),
    sculpt: [...(header.sculpt || []), {
      script: 'scripts/hero-face/sculpt/feminize.mjs', from: header.name, strength, gains, params: prm,
      bake: args['no-bake'] ? 'kept from input' : 'recomputed',
    }],
  };
  const bytes = writeMesh(resolve(outPath), hdr, out);
  console.log(`wrote ${resolve(outPath)} (${NV} verts, ${morphNames.length} morphs, ${(bytes / 1e6).toFixed(2)} MB), max displacement ${maxD.toFixed(4)} W, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
