// Core of the ref-2 landmark fit: blend model restricted to a vertex subset, lab normalisation
// (origin = pupil midpoint, W = 2 x IPD, pupils = front cap of each eyeball as in lab-mesh.mjs) and the
// engine camera (vertical FOV 20 deg, W at the origin depth spans Wpx device px).
import * as ict from './ict.mjs';

export const EXPR_NAMES = [
  'mouthSmile_L', 'mouthSmile_R', 'mouthRollUpper', 'mouthRollLower', 'mouthUpperUp_L', 'mouthUpperUp_R',
  'mouthLowerDown_L', 'mouthLowerDown_R', 'mouthPress_L', 'mouthPress_R', 'mouthStretch_L', 'mouthStretch_R',
  'mouthFunnel', 'mouthPucker', 'mouthClose', 'jawOpen', 'eyeWide_L', 'eyeWide_R', 'eyeSquint_L', 'eyeSquint_R',
  'eyeBlink_L', 'eyeBlink_R', 'browInnerUp_L', 'browInnerUp_R', 'browDown_L', 'browDown_R',
  'eyeLookUp_L', 'eyeLookUp_R', 'eyeLookDown_L', 'eyeLookDown_R', 'eyeLookIn_L', 'eyeLookIn_R', 'eyeLookOut_L', 'eyeLookOut_R',
];
export const EYE_V = [[21451, 23020], [23021, 24590]]; // +X (subject left), -X (subject right)

/** pupil vertex sets (front cap, z > zmax - 0.12 cm) on a given full mesh */
export function pupilSets(P) {
  return EYE_V.map(([a, b]) => {
    let zmax = -1e9;
    for (let v = a; v <= b; v++) zmax = Math.max(zmax, P[v * 3 + 2]);
    const s = [];
    for (let v = a; v <= b; v++) if (P[v * 3 + 2] > zmax - 0.12) s.push(v);
    return s;
  });
}

/**
 * Subset model. vids: vertex ids needed (landmarks + pupil sets + extras).
 * Returns { eval(w, e) -> Float64Array(3*n) positions for the subset in cm }.
 */
export function subsetModel(vids) {
  const n = vids.length;
  const N0 = ict.neutral();
  const base = new Float64Array(n * 3);
  vids.forEach((v, k) => { for (let c = 0; c < 3; c++) base[k * 3 + c] = N0[v * 3 + c]; });
  const ID = [];
  for (let i = 0; i < ict.NUM_IDS; i++) {
    const d = ict.identityDelta(i);
    const a = new Float64Array(n * 3);
    vids.forEach((v, k) => { for (let c = 0; c < 3; c++) a[k * 3 + c] = d[v * 3 + c]; });
    ID.push(a);
  }
  const EX = {};
  for (const name of EXPR_NAMES) {
    const d = ict.expressionDelta(name);
    const a = new Float64Array(n * 3);
    vids.forEach((v, k) => { for (let c = 0; c < 3; c++) a[k * 3 + c] = d[v * 3 + c]; });
    EX[name] = a;
  }
  const idx = new Map(vids.map((v, k) => [v, k]));
  return {
    n, idx, vids,
    eval(w, e = {}) {
      const out = Float64Array.from(base);
      for (let i = 0; i < w.length; i++) { const x = w[i]; if (!x) continue; const a = ID[i]; for (let k = 0; k < out.length; k++) out[k] += x * a[k]; }
      for (const [name, x] of Object.entries(e)) { if (!x) continue; const a = EX[name]; if (!a) throw new Error('expr ' + name); for (let k = 0; k < out.length; k++) out[k] += x * a[k]; }
      return out;
    },
  };
}

/** camera for a frame of height Hpx (device px) with W spanning Wpx at the origin depth */
export function camera(Hpx, Wpx, fovDeg = 20) {
  const f = Hpx / 2 / Math.tan((fovDeg * Math.PI) / 360);
  return { f, D: f / Wpx, Wpx };
}

/**
 * Normalise (lab-mesh) + project. X: subset positions (cm); pupil: [setL, setR] of subset indices.
 * Returns { uv: Float64Array(2n) px offsets from the origin (x right, y down), Wcm, O, S, Pn (normalised 3D) }.
 * pose: optional {pitch} in degrees about the X axis through the origin (+ = chin down).
 */
export function project(X, pupil, cam, pose = null) {
  const pc = pupil.map((set) => {
    const s = [0, 0, 0];
    for (const k of set) for (let c = 0; c < 3; c++) s[c] += X[k * 3 + c];
    return s.map((v) => v / set.length);
  });
  const ipd = Math.hypot(pc[0][0] - pc[1][0], pc[0][1] - pc[1][1], pc[0][2] - pc[1][2]);
  const Wcm = 2 * ipd;
  const O = [(pc[0][0] + pc[1][0]) / 2, (pc[0][1] + pc[1][1]) / 2, (pc[0][2] + pc[1][2]) / 2];
  const S = 1 / Wcm;
  const n = X.length / 3;
  const uv = new Float64Array(n * 2);
  const Pn = new Float64Array(n * 3);
  const cp = pose ? Math.cos((pose.pitch * Math.PI) / 180) : 1, sp = pose ? Math.sin((pose.pitch * Math.PI) / 180) : 0;
  for (let k = 0; k < n; k++) {
    const x = (X[k * 3] - O[0]) * S;
    let y = (X[k * 3 + 1] - O[1]) * S, z = (X[k * 3 + 2] - O[2]) * S;
    if (pose) { const y2 = cp * y - sp * z, z2 = sp * y + cp * z; y = y2; z = z2; }
    Pn[k * 3] = x; Pn[k * 3 + 1] = y; Pn[k * 3 + 2] = z;
    const q = cam.f / (cam.D - z);
    uv[k * 2] = q * x;
    uv[k * 2 + 1] = -q * y;
  }
  return { uv, Wcm, O, S, Pn, pupils: pc };
}
