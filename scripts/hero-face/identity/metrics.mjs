// Femininity / attractiveness cues measured straight from the blended ICT mesh.
// All lengths are divided by the interpupillary distance (eyeball centres), the same ruler the look
// report uses (face width W ~= 2 IPD), so head size drops out and only proportions count.
import * as ict from './ict.mjs';

const LM = ict.LM68;
const g = (P, i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
const lm = (P, j) => g(P, LM[j]);

function centroid(P, a, b) {
  const c = [0, 0, 0];
  for (let i = a; i < b; i++) for (let k = 0; k < 3; k++) c[k] += P[i * 3 + k];
  return c.map((v) => v / (b - a));
}

// Midline vertices of the face + head groups on the neutral mesh (x == 0 exactly there).
let _mid = null;
function midline() {
  if (_mid) return _mid;
  const P = ict.neutral();
  const out = [];
  for (let i = 0; i < ict.GROUPS.headNeck[1]; i++) if (Math.abs(P[i * 3]) < 1e-4) out.push(i);
  _mid = out;
  return out;
}

// Mirror correspondence (x -> -x) on the neutral face group, by nearest neighbour on a hash grid.
let _mirror = null;
export function mirrorMap() {
  if (_mirror) return _mirror;
  const P = ict.neutral();
  const [a, b] = ict.GROUPS.face;
  const cell = 0.5;
  const grid = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = a; i < b; i++) {
    const k = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  const m = new Int32Array(b - a).fill(-1);
  for (let i = a; i < b; i++) {
    const x = -P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    let best = -1, bd = 1e9;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const arr = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
      if (!arr) continue;
      for (const j of arr) {
        const d = (P[j * 3] - x) ** 2 + (P[j * 3 + 1] - y) ** 2 + (P[j * 3 + 2] - z) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
    }
    if (bd < 0.01) m[i - a] = best;
  }
  _mirror = m;
  return m;
}

/** Midline profile z(y) sampled from the midline vertices (nearest in y, max z to stay on the surface). */
function midZ(P, y, tol = 0.25) {
  let best = -1e9;
  for (const i of midline()) {
    if (Math.abs(P[i * 3 + 1] - y) < tol && P[i * 3 + 2] > best) best = P[i * 3 + 2];
  }
  return best;
}

/** Front-most surface z of the face group near (x, y). */
function surfZ(P, x, y, r = 0.3) {
  let best = -1e9;
  const [a, b] = ict.GROUPS.face;
  for (let i = a; i < b; i++) {
    if (Math.abs(P[i * 3] - x) > r || Math.abs(P[i * 3 + 1] - y) > r) continue;
    if (P[i * 3 + 2] > best) best = P[i * 3 + 2];
  }
  return best;
}

export function measure(P) {
  const eL = centroid(P, ...ict.GROUPS.eyeballL), eR = centroid(P, ...ict.GROUPS.eyeballR);
  const ipd = Math.hypot(eL[0] - eR[0], eL[1] - eR[1], eL[2] - eR[2]);
  const eyeY = (eL[1] + eR[1]) / 2, eyeZ = (eL[2] + eR[2]) / 2;
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const L = (j) => lm(P, j);
  const n = (v) => v / ipd;

  // cornea apex (front of the eye) per side
  let apexZ = -1e9;
  for (let i = ict.GROUPS.eyeballL[0]; i < ict.IRIS.L[0]; i++) apexZ = Math.max(apexZ, P[i * 3 + 2]);

  // midline landmarks: nasion = deepest midline point near the eye line; glabella = most forward above it
  let nas = { y: 0, z: 1e9 };
  for (const i of midline()) {
    const y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (y > eyeY - 0.15 * ipd && y < eyeY + 0.35 * ipd && z > eyeZ && z < nas.z) nas = { y, z };
  }
  let gla = { y: 0, z: -1e9 };
  for (const i of midline()) {
    const y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (y > nas.y && y < nas.y + 0.6 * ipd && z > gla.z) gla = { y, z };
  }
  const zF1 = midZ(P, gla.y + 0.45 * ipd), zF2 = midZ(P, gla.y + 1.05 * ipd);

  // nose dorsum straightness: max deviation of the midline profile from the nasion->tip chord
  const tip = L(30);
  let hump = -1e9;
  for (const i of midline()) {
    const y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (y >= nas.y || y <= tip[1] + 0.3) continue;
    if (z < eyeZ) continue;
    const t = (y - nas.y) / (tip[1] - nas.y);
    const zc = nas.z + t * (tip[2] - nas.z);
    hump = Math.max(hump, z - zc);
  }

  // slab silhouettes
  const slab = (y0, y1, zMin, groups = ['face']) => {
    let m = 0;
    for (const gname of groups) {
      const [a, b] = ict.GROUPS[gname];
      for (let i = a; i < b; i++) {
        const y = P[i * 3 + 1], z = P[i * 3 + 2];
        if (y < y0 || y > y1 || z < zMin) continue;
        m = Math.max(m, Math.abs(P[i * 3]));
      }
    }
    return 2 * m;
  };
  const menton = L(8);
  const zygW = slab(eyeY - 0.55 * ipd, eyeY - 0.1 * ipd, eyeZ - 0.8 * ipd);
  const neckW = slab(menton[1] - 0.8 * ipd, menton[1] - 0.6 * ipd, -1e9, ['face', 'headNeck']);
  const craniumW = slab(eyeY + 0.5 * ipd, eyeY + 1.3 * ipd, -1e9, ['face', 'headNeck']);

  // Adam's apple: midline neck bump above the chord between two neck heights
  const nA = menton[1] - 0.45 * ipd, nB = menton[1] - 1.6 * ipd;
  const zA = midZ(P, nA, 0.3), zB = midZ(P, nB, 0.3);
  let adam = -1e9;
  for (const i of midline()) {
    const y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (y > nA || y < nB || P[i * 3 + 2] < 0) continue;
    const t = (y - nA) / (nB - nA);
    adam = Math.max(adam, z - (zA + t * (zB - zA)));
  }

  // asymmetry of the face group (rms of mirrored mismatch, cm)
  const mm = mirrorMap();
  let asum = 0, acnt = 0;
  for (let k = 0; k < mm.length; k++) {
    const j = mm[k];
    if (j < 0) continue;
    const i = k + ict.GROUPS.face[0];
    const dx = P[i * 3] + P[j * 3], dy = P[i * 3 + 1] - P[j * 3 + 1], dz = P[i * 3 + 2] - P[j * 3 + 2];
    asum += dx * dx + dy * dy + dz * dz;
    acnt++;
  }

  // cheekbone (malar) prominence: surface height at the malar eminence vs the cheek below it
  const malar = (sx) => surfZ(P, sx * 0.6 * ipd, eyeY - 0.4 * ipd) - surfZ(P, sx * 0.6 * ipd, eyeY - 0.95 * ipd);
  const malarProj = (malar(1) + malar(-1)) / 2;
  const cheekW = Math.abs(L(15)[0] - L(1)[0]);
  const jawW = Math.abs(L(12)[0] - L(4)[0]);
  const lowJawW = Math.abs(L(11)[0] - L(5)[0]);
  const chinW = Math.abs(L(10)[0] - L(6)[0]);
  const eyeW = (d(L(36), L(39)) + d(L(42), L(45))) / 2;
  const eyeH = ((L(37)[1] + L(38)[1]) / 2 - (L(41)[1] + L(40)[1]) / 2 + (L(43)[1] + L(44)[1]) / 2 - (L(47)[1] + L(46)[1]) / 2) / 2;

  return {
    ipdCm: ipd,
    zygW: n(zygW),
    cheekW: n(cheekW),
    malarProj: n(malarProj),
    jawRatio: jawW / cheekW,
    lowJawRatio: lowJawW / cheekW,
    chinRatio: chinW / cheekW,
    faceLen: n(nas.y - menton[1]),
    lowerFace: n(L(33)[1] - menton[1]),
    chinH: n(L(57)[1] - menton[1]),
    philtrum: n(L(33)[1] - L(51)[1]),
    lipH: n(L(51)[1] - L(57)[1]),
    upperLip: n(L(51)[1] - L(62)[1]),
    lowerLip: n(L(66)[1] - L(57)[1]),
    mouthW: n(Math.abs(L(54)[0] - L(48)[0])),
    noseW: n(Math.abs(L(35)[0] - L(31)[0])),
    noseL: n(nas.y - L(33)[1]),
    noseProj: n(tip[2] - L(33)[2]),
    noseHump: n(hump),
    browProt: n(gla.z - nas.z),
    eyeDeep: n((L(19)[2] + L(24)[2]) / 2 - apexZ),
    foreheadSlope: (zF1 - zF2) / (1.05 * ipd - 0.45 * ipd),
    eyeW: n(eyeW),
    eyeH: n(eyeH),
    canthalTilt: n(((L(45)[1] - L(42)[1]) + (L(36)[1] - L(39)[1])) / 2),
    browH: n((L(19)[1] + L(24)[1]) / 2 - eyeY),
    lipProj: n(L(51)[2] - L(33)[2]),
    chinProj: n(menton[2] - L(57)[2]),
    neckW: n(neckW),
    craniumW: n(craniumW),
    cranioFacial: craniumW / zygW,
    eyeToFace: eyeW / cheekW,
    adam: n(adam),
    asym: Math.sqrt(asum / Math.max(1, acnt)),
  };
}

// Female direction and rough weight (literature-guided sexual-dimorphism effect sizes, plus a few
// attractiveness cues). Score = sum(sign*weight*z) with z standardised over random N(0,1) identities.
// Monotonic, so pushing it hard gives neotenic caricatures (huge cranium, tiny chin, stalk neck):
// use it only to rank random draws. The optimiser uses FEM_TARGETS instead.
export const FEM_WEIGHTS = {
  browProt: -1.6, eyeDeep: -0.8, foreheadSlope: -1.0, jawRatio: -0.9, lowJawRatio: -0.6, chinRatio: -0.4,
  lowerFace: -0.8, faceLen: -0.5, chinH: -0.8, philtrum: -0.4, lipH: 0.7, noseW: -0.7, noseL: -0.5,
  noseProj: -0.3, noseHump: -0.5, eyeH: 0.4, eyeW: 0.3, canthalTilt: 0.3, chinProj: -0.4, neckW: -1.2,
  adam: -0.6, cheekW: 0.3, malarProj: 0.5,
};

// Target z-scores for an adult (25-40), feminine, attractive-but-natural face, with importance weights.
// Roughly "female mean plus a little": half the male-female effect size plus ~30%, capped so that
// childlike cues (big cranium vs face, eyes vs face, tiny chin, stalk neck) stay near the population.
export const FEM_TARGETS = {
  browProt: [-1.2, 1.0], eyeDeep: [-0.6, 0.5], foreheadSlope: [-0.8, 0.6],
  jawRatio: [-0.9, 0.8], lowJawRatio: [-0.7, 0.5], chinRatio: [-0.5, 0.3],
  lowerFace: [-0.5, 0.6], faceLen: [-0.2, 0.4], chinH: [-0.6, 0.6], philtrum: [-0.5, 0.4],
  lipH: [0.9, 0.6], lipProj: [0.5, 0.3], noseW: [-0.8, 0.5], noseL: [-0.5, 0.4], noseProj: [-0.2, 0.3],
  noseHump: [-0.5, 0.4], eyeH: [0.4, 0.3], eyeW: [0.2, 0.3], canthalTilt: [0.5, 0.3], chinProj: [-0.3, 0.3],
  neckW: [-1.0, 0.7], adam: [-0.5, 0.3], malarProj: [1.0, 0.6], cheekW: [0.3, 0.3],
  cranioFacial: [0.0, 0.6], eyeToFace: [0.2, 0.5],
};

export function femScore(m, stats) {
  let s = 0;
  const parts = {};
  for (const k of new Set([...Object.keys(FEM_WEIGHTS), ...Object.keys(FEM_TARGETS)])) {
    parts[k] = (m[k] - stats[k].mean) / (stats[k].sd || 1);
    if (FEM_WEIGHTS[k]) s += FEM_WEIGHTS[k] * parts[k];
  }
  return { score: s, z: parts };
}

/** Target fit: 10 - weighted rms distance to FEM_TARGETS (higher = closer to the adult-female target). */
export function targetFit(m, stats, targets = FEM_TARGETS) {
  let e = 0, ws = 0;
  for (const [k, [t, w]] of Object.entries(targets)) {
    const z = (m[k] - stats[k].mean) / (stats[k].sd || 1);
    e += w * (z - t) ** 2;
    ws += w;
  }
  return 10 - 10 * Math.sqrt(e / ws);
}
