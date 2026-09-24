#!/usr/bin/env node
// ICT-FaceKit Light (MIT, (c) 2020 USC Institute for Creative Technologies) OBJ -> hero-face lab mesh.
//
// Parses the neutral mesh plus optional identity and expression weights, keeps the groups listed
// in PLAN.md §2 (face, head/neck, mouth socket, eye sockets, eyeballs, lacrimal/tear lines; teeth
// simplified with meshopt), computes welded smooth normals, normalises (origin = midpoint between
// the pupils, face width W = 2 x IPD = 1, +Y up, +Z toward the camera), bakes per-vertex key-light
// visibility (cone rays) + ambient occlusion with three-mesh-bvh, and writes
//   <out>/mesh-<name>.json   (header: layout, parts, landmarks, morph names)
//   <out>/mesh-<name>.bin    (little-endian arrays referenced by the header)
//
// usage:
//   node lab-mesh.mjs [--identity weights.json] [--expr jawOpen=0.3 --expr mouthSmile_L=0.1 | --expr a=0.1,b=0.2]
//                     [--targets lipsync|all|none|name,name] [--name neutral] [--out <dir>]
//                     [--light -0.16,0.85,0.50] [--rays-vis 64] [--rays-ao 128] [--teeth 0.35]
// identity weights.json: [w0, w1, ...] | {"weights":[...]} | {"identity003": 1.2, "7": -0.4, ...}
//   Base = neutral + sum_i w_i (identity_i - neutral); only identity000-029 are cached locally.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { MeshoptSimplifier } from 'meshoptimizer';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const DEFAULT_ICT = join(REPO, '.cache/hero-face/ict');
const DEFAULT_OUT = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/lab';

// ---------------------------------------------------------------- CLI
function parseArgs(argv) {
  const o = { expr: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    if (k === 'expr') o.expr.push(v); else o[k] = v;
  }
  return o;
}
const args = parseArgs(process.argv.slice(2));
const ICT = resolve(args.ict || DEFAULT_ICT);
const OUT = resolve(args.out || DEFAULT_OUT);
const LIGHT = (args.light || '-0.16,0.85,0.50').split(',').map(Number);
const RAYS_VIS = +(args['rays-vis'] || 64);
const RAYS_AO = +(args['rays-ao'] || 128);
const TEETH_RATIO = +(args.teeth || 0.35);
const NAME = args.name || (args.identity ? basename(args.identity).replace(/\.json$/, '') : 'neutral');

const LIPSYNC_TARGETS = [
  'jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthSmile_L', 'mouthSmile_R',
  'mouthStretch_L', 'mouthStretch_R', 'mouthLowerDown_L', 'mouthLowerDown_R', 'mouthUpperUp_L', 'mouthUpperUp_R',
  'eyeBlink_L', 'eyeBlink_R',
];
const ALL_TARGETS = [
  ...LIPSYNC_TARGETS, 'mouthPress_L', 'mouthPress_R', 'mouthRollLower', 'mouthRollUpper',
  'eyeLookUp_L', 'eyeLookUp_R', 'eyeLookDown_L', 'eyeLookDown_R', 'eyeLookIn_L', 'eyeLookIn_R', 'eyeLookOut_L', 'eyeLookOut_R',
  'eyeWide_L', 'eyeWide_R', 'eyeSquint_L', 'eyeSquint_R', 'browInnerUp_L', 'browInnerUp_R', 'browDown_L', 'browDown_R',
];
let TARGETS = LIPSYNC_TARGETS;
if (args.targets === 'all') TARGETS = ALL_TARGETS;
else if (args.targets === 'none') TARGETS = [];
else if (args.targets && args.targets !== 'lipsync') TARGETS = args.targets.split(',');

const arkitName = (n) => n.replace(/_L$/, 'Left').replace(/_R$/, 'Right');

// ---------------------------------------------------------------- ICT topology (README tables)
// polygon index ranges (inclusive) per geometry group
const GROUP_POLYS = [
  [0, 9229], [9230, 11143], [11144, 13225], [13226, 13629], [13630, 14033], [14034, 17005], [17006, 21495],
  [21496, 23093], [23094, 24691], [24692, 24854], [24855, 25017], [25018, 25032], [25033, 25047],
  [25048, 25175], [25176, 25303], [25304, 25843], [25844, 26383],
];
const PART = { skin: 0, mouth: 1, teeth: 2, sclera: 3, iris: 4, lacrimal: 5 };
const PART_NAMES = Object.keys(PART);
function groupPart(g) {
  if (g === 0 || g === 1 || g === 3 || g === 4) return PART.skin;
  if (g === 2) return PART.mouth;
  if (g === 6) return PART.teeth;
  if (g === 7 || g === 8) return -2; // eyes: decided per vertex (sclera vs iris)
  if (g === 9 || g === 10) return PART.lacrimal;
  return -1; // dropped: gums/tongue, eye blend, eye occlusion, eyelashes
}
const IRIS_V = [[22221, 23020], [23791, 24590]];
const EYE_V = [[21451, 23020], [23021, 24590]]; // left (+X), right (-X)
const inR = (i, [a, b]) => i >= a && i <= b;

// ---------------------------------------------------------------- OBJ parsing
function parsePositions(file) {
  const t = readFileSync(file, 'utf8');
  const out = new Float32Array(26719 * 3);
  let n = 0, i = 0;
  const L = t.length;
  while (i < L) {
    let e = t.indexOf('\n', i); if (e < 0) e = L;
    if (t.charCodeAt(i) === 118 && t.charCodeAt(i + 1) === 32) { // 'v '
      const p = t.slice(i + 2, e).trim().split(/\s+/);
      out[n++] = +p[0]; out[n++] = +p[1]; out[n++] = +p[2];
    }
    i = e + 1;
  }
  if (n !== out.length) throw new Error(`${file}: expected 26719 vertices, got ${n / 3}`);
  return out;
}
function parseFaces(file) {
  const t = readFileSync(file, 'utf8');
  const polys = []; // [group, [v...]]
  let poly = 0, g = 0;
  for (const line of t.split('\n')) {
    if (!line.startsWith('f ')) continue;
    while (poly > GROUP_POLYS[g][1]) g++;
    const vs = line.slice(2).trim().split(/\s+/).map((s) => parseInt(s, 10) - 1);
    polys.push([g, vs]);
    poly++;
  }
  if (poly !== 26384) throw new Error(`expected 26384 polygons, got ${poly}`);
  return polys;
}

// ---------------------------------------------------------------- weights
function parseKV(list) {
  const o = {};
  for (const item of list) for (const kv of item.split(',')) {
    if (!kv) continue;
    const [k, v] = kv.split('=');
    o[k.trim()] = v === undefined ? 1 : +v;
  }
  return o;
}
function loadIdentity(file) {
  if (!file) return [];
  const j = JSON.parse(readFileSync(resolve(file), 'utf8'));
  const arr = Array.isArray(j) ? j : Array.isArray(j.weights) ? j.weights : Array.isArray(j.identity) ? j.identity : null;
  const w = [];
  if (arr) arr.forEach((v, i) => { if (v) w.push([i, +v]); });
  else for (const [k, v] of Object.entries(j)) {
    const m = /^(?:identity)?(\d+)$/.exec(k);
    if (m && +v) w.push([+m[1], +v]);
  }
  return w;
}

// ---------------------------------------------------------------- geometry helpers
function computeNormals(pos, tris, weldKey) {
  // area-weighted normals, accumulated per weld key so seams between groups stay smooth
  const nv = pos.length / 3;
  const acc = new Float32Array((weldKey ? weldKey.count : nv) * 3);
  const key = weldKey ? weldKey.map : null;
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t], b = tris[t + 1], c = tris[t + 2];
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1x = pos[b * 3] - ax, e1y = pos[b * 3 + 1] - ay, e1z = pos[b * 3 + 2] - az;
    const e2x = pos[c * 3] - ax, e2y = pos[c * 3 + 1] - ay, e2z = pos[c * 3 + 2] - az;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    for (const v of [a, b, c]) {
      const k = key ? key[v] : v;
      acc[k * 3] += nx; acc[k * 3 + 1] += ny; acc[k * 3 + 2] += nz;
    }
  }
  const n = new Float32Array(nv * 3);
  for (let v = 0; v < nv; v++) {
    const k = key ? key[v] : v;
    const x = acc[k * 3], y = acc[k * 3 + 1], z = acc[k * 3 + 2];
    const l = Math.hypot(x, y, z) || 1;
    n[v * 3] = x / l; n[v * 3 + 1] = y / l; n[v * 3 + 2] = z / l;
  }
  return n;
}
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
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- main
async function main() {
  const t0 = Date.now();
  const neutral = parsePositions(join(ICT, 'generic_neutral_mesh.obj'));
  const polys = parseFaces(join(ICT, 'generic_neutral_mesh.obj'));
  const base = neutral.slice();

  const idW = loadIdentity(args.identity);
  for (const [i, w] of idW) {
    const f = join(ICT, `identity${String(i).padStart(3, '0')}.obj`);
    if (!existsSync(f)) { console.warn(`! identity${i} not cached, skipped`); continue; }
    const m = parsePositions(f);
    for (let k = 0; k < base.length; k++) base[k] += w * (m[k] - neutral[k]);
  }
  const exprW = parseKV(args.expr);
  const exprCache = new Map();
  const loadExpr = (name) => {
    if (!exprCache.has(name)) {
      const m = parsePositions(join(ICT, `${name}.obj`));
      for (let k = 0; k < m.length; k++) m[k] -= neutral[k];
      exprCache.set(name, m);
    }
    return exprCache.get(name);
  };
  for (const [name, w] of Object.entries(exprW)) {
    const d = loadExpr(name);
    for (let k = 0; k < base.length; k++) base[k] += w * d[k];
  }

  // ---- triangles of kept groups, part per vertex
  const vPart = new Int8Array(26719).fill(-1);
  const trisByPart = {};
  for (const [g, vs] of polys) {
    let p = groupPart(g);
    if (p === -1) continue;
    for (let k = 1; k + 1 < vs.length; k++) {
      const tri = [vs[0], vs[k], vs[k + 1]];
      let tp = p;
      if (p === -2) tp = tri.some((v) => inR(v, IRIS_V[0]) || inR(v, IRIS_V[1])) ? PART.iris : PART.sclera;
      (trisByPart[tp] ||= []).push(...tri);
      for (const v of tri) if (vPart[v] < 0 || tp === PART.iris) vPart[v] = tp;
    }
  }
  // ---- simplify teeth
  if (trisByPart[PART.teeth] && TEETH_RATIO < 1) {
    await MeshoptSimplifier.ready;
    const idx = new Uint32Array(trisByPart[PART.teeth]);
    const target = Math.floor((idx.length * TEETH_RATIO) / 3) * 3;
    const [simp] = MeshoptSimplifier.simplify(idx, base, 3, target, 0.02, []);
    trisByPart[PART.teeth] = Array.from(simp);
  }
  // ---- compaction (sorted by part so each part is one contiguous index range)
  const order = [PART.skin, PART.lacrimal, PART.mouth, PART.teeth, PART.sclera, PART.iris];
  const remap = new Int32Array(26719).fill(-1);
  const oldOf = [];
  const tris = [];
  const parts = [];
  for (const p of order) {
    const t = trisByPart[p] || [];
    const start = tris.length;
    for (const v of t) {
      if (remap[v] < 0) { remap[v] = oldOf.length; oldOf.push(v); }
      tris.push(remap[v]);
    }
    parts.push({ name: PART_NAMES[p], id: p, start, count: tris.length - start });
  }
  const NV = oldOf.length;
  const partOf = new Float32Array(NV);
  for (let i = 0; i < NV; i++) partOf[i] = vPart[oldOf[i]];

  // ---- normalisation: pupils (front cap of each eyeball), W = 2 x IPD
  const pupil = EYE_V.map((r) => {
    let zmax = -1e9;
    for (let v = r[0]; v <= r[1]; v++) zmax = Math.max(zmax, base[v * 3 + 2]);
    const s = [0, 0, 0]; let c = 0;
    for (let v = r[0]; v <= r[1]; v++) if (base[v * 3 + 2] > zmax - 0.12) { s[0] += base[v * 3]; s[1] += base[v * 3 + 1]; s[2] += base[v * 3 + 2]; c++; }
    return s.map((x) => x / c);
  });
  const eyeCentre = EYE_V.map((r) => {
    const s = [0, 0, 0]; let c = 0;
    for (let v = r[0]; v <= IRIS_V[EYE_V.indexOf(r)][0] - 1; v++) { s[0] += base[v * 3]; s[1] += base[v * 3 + 1]; s[2] += base[v * 3 + 2]; c++; }
    return s.map((x) => x / c);
  });
  const IPD = Math.hypot(pupil[0][0] - pupil[1][0], pupil[0][1] - pupil[1][1], pupil[0][2] - pupil[1][2]);
  const Wcm = 2 * IPD;
  const O = [(pupil[0][0] + pupil[1][0]) / 2, (pupil[0][1] + pupil[1][1]) / 2, (pupil[0][2] + pupil[1][2]) / 2];
  const S = 1 / Wcm;
  const nrm = (p) => [(p[0] - O[0]) * S, (p[1] - O[1]) * S, (p[2] - O[2]) * S];
  const P = new Float32Array(NV * 3);
  for (let i = 0; i < NV; i++) {
    const v = oldOf[i];
    P[i * 3] = (base[v * 3] - O[0]) * S; P[i * 3 + 1] = (base[v * 3 + 1] - O[1]) * S; P[i * 3 + 2] = (base[v * 3 + 2] - O[2]) * S;
  }
  const weldable = new Uint8Array(NV);
  for (let i = 0; i < NV; i++) weldable[i] = partOf[i] === PART.skin ? 1 : 0;
  const weld = buildWeld(P, weldable, 1e-5);
  const N = computeNormals(P, tris, weld);

  // ---- per-vertex eye-axis cosine (for iris/pupil ghost shading; rides eyeLook morphs)
  const aEye = new Float32Array(NV);
  const eyeC = eyeCentre.map(nrm), pup = pupil.map(nrm);
  for (let i = 0; i < NV; i++) {
    const v = oldOf[i];
    const e = inR(v, EYE_V[0]) ? 0 : inR(v, EYE_V[1]) ? 1 : -1;
    if (e < 0) continue;
    const c = eyeC[e], ax = [pup[e][0] - c[0], pup[e][1] - c[1], pup[e][2] - c[2]];
    const al = Math.hypot(...ax);
    const d = [P[i * 3] - c[0], P[i * 3 + 1] - c[1], P[i * 3 + 2] - c[2]];
    const dl = Math.hypot(...d) || 1;
    aEye[i] = (d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]) / (al * dl);
  }

  // ---- landmarks (normalised)
  const LM68 = [1225, 1888, 1052, 367, 1719, 1722, 2199, 1447, 966, 3661, 4390, 3927, 3924, 2608, 3272, 4088, 3443, 268, 493, 1914, 2044, 1401, 3615, 4240, 4114, 2734, 2509, 978, 4527, 4942, 4857, 1140, 2075, 1147, 4269, 3360, 1507, 1542, 1537, 1528, 1518, 1511, 3742, 3751, 3756, 3721, 3725, 3732, 5708, 5695, 2081, 0, 4275, 6200, 6213, 6346, 6461, 5518, 5957, 5841, 5702, 5711, 5533, 6216, 6207, 6470, 5517, 5966];
  const at = (v) => nrm([base[v * 3], base[v * 3 + 1], base[v * 3 + 2]]).map((x) => +x.toFixed(5));
  const mouthC = nrm([0, (base[5533 * 3 + 1] + base[5517 * 3 + 1]) / 2, (base[5533 * 3 + 2] + base[5517 * 3 + 2]) / 2]);
  const landmarks = {
    pupilL: pup[0].map((x) => +x.toFixed(5)), pupilR: pup[1].map((x) => +x.toFixed(5)),
    eyeCentreL: eyeC[0].map((x) => +x.toFixed(5)), eyeCentreR: eyeC[1].map((x) => +x.toFixed(5)),
    mouthCentre: mouthC.map((x) => +x.toFixed(5)),
    mouthCornerL: at(6213), mouthCornerR: at(5708), upperLip: at(0), lowerLip: at(5518),
    innerUpperLip: at(5533), innerLowerLip: at(5517), noseTip: at(4857), chin: at(966),
    multiPie68: LM68.map(at),
  };
  // ---- mouth weight
  const mouthW = new Float32Array(NV);
  for (let i = 0; i < NV; i++) {
    const dx = P[i * 3] - mouthC[0], dy = (P[i * 3 + 1] - mouthC[1]) * 1.3;
    mouthW[i] = Math.exp(-(dx * dx + dy * dy) / (2 * 0.12 * 0.12));
    if (partOf[i] === PART.mouth || partOf[i] === PART.teeth) mouthW[i] = 1;
  }

  // ---- convexity (sculpt term): N . (p - laplacian-smoothed p), two scales, skin only
  const curv = new Float32Array(NV);
  {
    const nb = Array.from({ length: weld.count }, () => new Set());
    for (let t = 0; t < tris.length; t += 3) {
      const a = weld.map[tris[t]], b = weld.map[tris[t + 1]], c = weld.map[tris[t + 2]];
      nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
    }
    const K = weld.count;
    const base0 = new Float32Array(K * 3), cnt = new Float32Array(K);
    for (let i = 0; i < NV; i++) { const k = weld.map[i]; base0[k * 3] += P[i * 3]; base0[k * 3 + 1] += P[i * 3 + 1]; base0[k * 3 + 2] += P[i * 3 + 2]; cnt[k]++; }
    for (let k = 0; k < K; k++) { base0[k * 3] /= cnt[k]; base0[k * 3 + 1] /= cnt[k]; base0[k * 3 + 2] /= cnt[k]; }
    const smooth = (src, iters) => {
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
    const s1 = smooth(base0, 12), s2 = smooth(base0, 48);
    const raw = new Float32Array(NV);
    const vals = [];
    for (let i = 0; i < NV; i++) {
      if (partOf[i] !== PART.skin && partOf[i] !== PART.lacrimal) continue;
      const k = weld.map[i];
      const d1 = (base0[k * 3] - s1[k * 3]) * N[i * 3] + (base0[k * 3 + 1] - s1[k * 3 + 1]) * N[i * 3 + 1] + (base0[k * 3 + 2] - s1[k * 3 + 2]) * N[i * 3 + 2];
      const d2 = (base0[k * 3] - s2[k * 3]) * N[i * 3] + (base0[k * 3 + 1] - s2[k * 3 + 1]) * N[i * 3 + 1] + (base0[k * 3 + 2] - s2[k * 3 + 2]) * N[i * 3 + 2];
      raw[i] = d1 * 2.0 + d2;
      vals.push(Math.abs(raw[i]));
    }
    vals.sort((a, b) => a - b);
    const q = vals[Math.floor(vals.length * 0.95)] || 1;
    for (let i = 0; i < NV; i++) curv[i] = Math.max(-1, Math.min(1, raw[i] / q));
  }

  // ---- bake key-light visibility + AO (three-mesh-bvh)
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(tris), 1));
  const bvh = new MeshBVH(geo);
  const Ld = new THREE.Vector3(...LIGHT).normalize();
  const rnd = mulberry32(1234);
  const coneDirs = [];
  const cone = (4 * Math.PI) / 180;
  const tU = new THREE.Vector3(), tV = new THREE.Vector3();
  tU.set(0, 0, 1).cross(Ld).normalize(); tV.copy(Ld).cross(tU).normalize();
  for (let k = 0; k < RAYS_VIS; k++) {
    const r = Math.sqrt((k + 0.5) / RAYS_VIS) * Math.tan(cone), a = k * 2.399963;
    coneDirs.push(Ld.clone().addScaledVector(tU, r * Math.cos(a)).addScaledVector(tV, r * Math.sin(a)).normalize());
  }
  const hemi = [];
  for (let k = 0; k < RAYS_AO; k++) { // cosine-weighted, fibonacci spiral
    const u = (k + 0.5) / RAYS_AO, r = Math.sqrt(u), a = k * 2.399963;
    hemi.push([r * Math.cos(a), r * Math.sin(a), Math.sqrt(1 - u)]);
  }
  const vis = new Float32Array(NV).fill(1), ao = new Float32Array(NV).fill(1);
  const ray = new THREE.Ray(), o = new THREE.Vector3(), n = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3(), d = new THREE.Vector3();
  const AO_MAX = 0.10, EPS = 0.0015;
  for (let i = 0; i < NV; i++) {
    const pp = partOf[i];
    if (pp === PART.teeth || pp === PART.mouth) { vis[i] = 0; ao[i] = 0.2; continue; }
    n.set(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    o.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).addScaledVector(n, EPS);
    // visibility (independent of N.L so the shader can do its own soft terminator)
    let hit = 0;
    for (const dir of coneDirs) { ray.set(o, dir); if (bvh.raycastFirst(ray, THREE.DoubleSide, 0.0005, 3)) hit++; }
    vis[i] = 1 - hit / RAYS_VIS;
    // AO
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

  // ---- morph targets (position + normal deltas, normalised units)
  const morphs = [];
  for (const name of TARGETS) {
    const dRaw = loadExpr(name);
    const dp = new Float32Array(NV * 3);
    let sx = 0, sw = 0;
    for (let i = 0; i < NV; i++) {
      const v = oldOf[i];
      for (let k = 0; k < 3; k++) dp[i * 3 + k] = dRaw[v * 3 + k] * S;
      const m = Math.hypot(dp[i * 3], dp[i * 3 + 1], dp[i * 3 + 2]);
      sx += P[i * 3] * m; sw += m;
    }
    const Pt = new Float32Array(NV * 3);
    for (let k = 0; k < Pt.length; k++) Pt[k] = P[k] + dp[k];
    const Nt = computeNormals(Pt, tris, weld);
    const dn = new Float32Array(NV * 3);
    for (let k = 0; k < dn.length; k++) dn[k] = Nt[k] - N[k];
    morphs.push({ name: arkitName(name), source: name, dp, dn, centroidX: +(sx / (sw || 1)).toFixed(4) });
  }

  // ---- write
  const chunks = [];
  let offset = 0;
  const layout = {};
  const add = (key, arr, type, size) => {
    const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
    layout[key] = { offset, type, size, count: arr.length / size };
    chunks.push(buf); offset += buf.length;
    const pad = (4 - (offset % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
  };
  const bake = new Float32Array(NV * 4);
  for (let i = 0; i < NV; i++) { bake[i * 4] = vis[i]; bake[i * 4 + 1] = ao[i]; bake[i * 4 + 2] = mouthW[i]; bake[i * 4 + 3] = partOf[i]; }
  add('position', P, 'f32', 3);
  add('normal', N, 'f32', 3);
  add('bake', bake, 'f32', 4);
  add('eye', aEye, 'f32', 1);
  add('curv', curv, 'f32', 1);
  add('index', new Uint32Array(tris), 'u32', 1);
  const morphMeta = [];
  for (const m of morphs) {
    add(`morph:${m.name}:position`, m.dp, 'f32', 3);
    add(`morph:${m.name}:normal`, m.dn, 'f32', 3);
    morphMeta.push({ name: m.name, source: m.source, centroidX: m.centroidX });
  }
  const bb = [[1e9, 1e9, 1e9], [-1e9, -1e9, -1e9]];
  for (let i = 0; i < NV; i++) for (let k = 0; k < 3; k++) { bb[0][k] = Math.min(bb[0][k], P[i * 3 + k]); bb[1][k] = Math.max(bb[1][k], P[i * 3 + k]); }
  const header = {
    format: 'hero-face-lab-mesh', version: 1, name: NAME,
    source: 'ICT-FaceKit Light, commit da5f95a607f5e6b37755b38d3385d7f2853732e5',
    copyright: 'ICT-FaceKit (c) 2020 USC Institute for Creative Technologies, MIT License',
    units: 'W (face width = 2 x interpupillary distance); origin = midpoint between pupils; +Y up, +Z toward camera',
    Wcm: +Wcm.toFixed(4), ipdCm: +IPD.toFixed(4),
    identity: idW, expressions: exprW, light: LIGHT, bake: { raysVis: RAYS_VIS, raysAo: RAYS_AO, aoMax: AO_MAX },
    vertexCount: NV, indexCount: tris.length, parts, partIds: PART, layout, morphs: morphMeta, landmarks,
    bbox: bb.map((a) => a.map((x) => +x.toFixed(4))),
  };
  mkdirSync(OUT, { recursive: true });
  const bin = join(OUT, `mesh-${NAME}.bin`), json = join(OUT, `mesh-${NAME}.json`);
  header.bin = basename(bin);
  writeFileSync(bin, Buffer.concat(chunks));
  writeFileSync(json, JSON.stringify(header, null, 1));
  const sideCheck = morphMeta.filter((m) => /Left$|Right$/.test(m.name)).map((m) => `${m.name}:x=${m.centroidX}`).join(' ');
  console.log(`wrote ${json} (${NV} verts, ${tris.length / 3} tris, ${morphs.length} targets, ${(offset / 1e6).toFixed(2)} MB) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`W=${Wcm.toFixed(3)} cm, IPD=${IPD.toFixed(3)} cm; parts: ${parts.map((p) => `${p.name}=${p.count / 3}`).join(' ')}`);
  if (sideCheck) console.log(`side check (+x = subject's left = viewer's right): ${sideCheck}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
