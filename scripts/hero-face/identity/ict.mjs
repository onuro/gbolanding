// ICT-FaceKit Light loader for the identity lab (build-time only, not shipped).
// Own tiny OBJ parser so this folder does not depend on the renderer agent's lab-mesh.mjs.
// ICT units are centimetres, +Y up, +Z out of the face (toward the camera), +X = subject's left.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ICT_DIR = process.env.ICT_DIR || path.resolve(HERE, '../../../.cache/hero-face/ict');
export const NV = 26719;

// Vertex ranges from the ICT README (inclusive start, exclusive end).
export const GROUPS = {
  face: [0, 9409],
  headNeck: [9409, 11248],
  mouthSocket: [11248, 13294],
  eyeSocketL: [13294, 13678],
  eyeSocketR: [13678, 14062],
  gumsTongue: [14062, 17039],
  teeth: [17039, 21451],
  eyeballL: [21451, 23021], // sclera 21451..22220, iris 22221..23020
  eyeballR: [23021, 24591],
  lacrimalL: [24591, 24795],
  lacrimalR: [24795, 24999],
  eyeBlendL: [24999, 25023],
  eyeBlendR: [25023, 25047],
  eyeOcclL: [25047, 25199],
  eyeOcclR: [25199, 25351],
  lashesL: [25351, 26035],
  lashesR: [26035, 26719],
};
export const IRIS = { L: [22221, 23021], R: [23791, 24591] };

// Multi-PIE 68 landmark vertex ids (README). 0-16 jaw, 17-26 brows, 27-30 nose bridge,
// 31-35 nostrils, 36-47 eyes, 48-59 outer lip, 60-67 inner lip. Point 0 is on the subject's right (-X).
export const LM68 = [1225, 1888, 1052, 367, 1719, 1722, 2199, 1447, 966, 3661, 4390, 3927, 3924, 2608, 3272, 4088, 3443, 268, 493, 1914, 2044, 1401, 3615, 4240, 4114, 2734, 2509, 978, 4527, 4942, 4857, 1140, 2075, 1147, 4269, 3360, 1507, 1542, 1537, 1528, 1518, 1511, 3742, 3751, 3756, 3721, 3725, 3732, 5708, 5695, 2081, 0, 4275, 6200, 6213, 6346, 6461, 5518, 5957, 5841, 5702, 5711, 5533, 6216, 6207, 6470, 5517, 5966];
export const JAW_R_EXT = [1280, 1278, 1275, 1272, 1248, 12, 820, 1834, 1902, 243, 844, 781, 1673, 2199, 801, 1447, 800];
export const JAW_L_EXT = [3041, 3661, 3042, 4390, 3880, 3022, 3085, 2484, 4102, 4036, 3061, 2253, 3466, 3490, 3493, 3496, 3498];

/** Parse only the `v` lines of an OBJ into a Float32Array(NV*3). */
export function parsePositions(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const out = new Float32Array(NV * 3);
  let n = 0;
  let i = 0;
  const L = txt.length;
  while (i < L) {
    let e = txt.indexOf('\n', i);
    if (e < 0) e = L;
    if (txt.charCodeAt(i) === 118 /* v */ && txt.charCodeAt(i + 1) === 32) {
      const parts = txt.slice(i + 2, e).trim().split(/\s+/);
      out[n * 3] = +parts[0];
      out[n * 3 + 1] = +parts[1];
      out[n * 3 + 2] = +parts[2];
      n++;
    }
    i = e + 1;
  }
  if (n !== NV) throw new Error(`${file}: expected ${NV} vertices, got ${n}`);
  return out;
}

/** Parse polygons (vertex indices only) and the material of each polygon. */
export function parseFaces(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const polys = [];
  const mats = [];
  let mat = '';
  for (const line of txt.split('\n')) {
    if (line.startsWith('usemtl ')) mat = line.slice(7).trim();
    else if (line.startsWith('f ')) {
      const idx = line.slice(2).trim().split(/\s+/).map((t) => parseInt(t, 10) - 1);
      polys.push(idx);
      mats.push(mat);
    }
  }
  return { polys, mats };
}

let _neutral = null;
let _faces = null;
const _ids = new Map();
const _expr = new Map();

export function neutral() {
  if (!_neutral) _neutral = parsePositions(path.join(ICT_DIR, 'generic_neutral_mesh.obj'));
  return _neutral;
}
export function faces() {
  if (!_faces) _faces = parseFaces(path.join(ICT_DIR, 'generic_neutral_mesh.obj'));
  return _faces;
}
/** Identity mode i as a delta from the neutral mesh. */
export function identityDelta(i) {
  if (!_ids.has(i)) {
    const p = parsePositions(path.join(ICT_DIR, `identity${String(i).padStart(3, '0')}.obj`));
    const n = neutral();
    for (let k = 0; k < p.length; k++) p[k] -= n[k];
    _ids.set(i, p);
  }
  return _ids.get(i);
}
/** Expression shape as a delta from the neutral mesh (ICT expressions are authored on the mean face). */
export function expressionDelta(name) {
  if (!_expr.has(name)) {
    const p = parsePositions(path.join(ICT_DIR, `${name}.obj`));
    const n = neutral();
    for (let k = 0; k < p.length; k++) p[k] -= n[k];
    _expr.set(name, p);
  }
  return _expr.get(name);
}
export const NUM_IDS = 30;
export function loadAllIdentities() {
  const a = [];
  for (let i = 0; i < NUM_IDS; i++) a.push(identityDelta(i));
  return a;
}

/** neutral + sum_i w_i * (identity_i - neutral) + sum_e x_e * (expr_e - neutral) */
export function blend(weights, expr = {}) {
  const n = neutral();
  const out = new Float32Array(n);
  for (let i = 0; i < weights.length && i < NUM_IDS; i++) {
    const w = weights[i];
    if (!w) continue;
    const d = identityDelta(i);
    for (let k = 0; k < out.length; k++) out[k] += w * d[k];
  }
  for (const [name, x] of Object.entries(expr)) {
    if (!x) continue;
    const d = expressionDelta(name);
    for (let k = 0; k < out.length; k++) out[k] += x * d[k];
  }
  return out;
}

export function readWeights(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const w = Array.isArray(j) ? j : j.weights;
  const out = new Array(NUM_IDS).fill(0);
  for (let i = 0; i < Math.min(NUM_IDS, w.length); i++) out[i] = +w[i] || 0;
  return out;
}

export function vtx(P, i) {
  return [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
}
