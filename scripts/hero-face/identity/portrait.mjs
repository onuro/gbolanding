// Portrait helpers: framing from landmarks, greyscale portraits (front / 3-4 / profile) and a
// quick dot-grid preview in the spirit of ref 2 (not the production look, just readability).
import * as ict from './ict.mjs';
import { buildTris, vertexNormals, render } from './raster.mjs';

let _scene = null;
/** Eye model from the neutral mesh: both ICT eyeball meshes are spheres (outer = sclera + cornea,
 *  inner = "iris" sphere). Without textures we cut the cornea cap out of the outer sphere and paint
 *  iris/pupil albedo onto the inner sphere by angular radius around the optical axis. */
function eyeModel() {
  const P = ict.neutral();
  const skip = new Set();
  const valb = new Float32Array(ict.NV).fill(0.62); // skin
  for (const [side, [a, b]] of [['L', ict.GROUPS.eyeballL], ['R', ict.GROUPS.eyeballR]]) {
    const irisStart = ict.IRIS[side][0];
    const c = centroid(P, a, irisStart);
    let apex = a;
    for (let i = a; i < irisStart; i++) if (P[i * 3 + 2] > P[apex * 3 + 2]) apex = i;
    let ax = [P[apex * 3] - c[0], P[apex * 3 + 1] - c[1], P[apex * 3 + 2] - c[2]];
    const al = Math.hypot(...ax);
    ax = ax.map((v) => v / al);
    for (let i = a; i < b; i++) {
      const d = [P[i * 3] - c[0], P[i * 3 + 1] - c[1], P[i * 3 + 2] - c[2]];
      const s = d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2];
      const r = Math.sqrt(Math.max(0, d[0] ** 2 + d[1] ** 2 + d[2] ** 2 - s * s));
      if (i < irisStart) {
        valb[i] = 0.74;
        if (s > 0 && r < 0.8) skip.add(i);
      } else {
        valb[i] = s <= 0 ? 0.7 : r < 0.27 ? 0.015 : r < 0.62 ? 0.11 : r < 0.74 ? 0.06 : 0.7;
      }
    }
  }
  for (let i = ict.GROUPS.teeth[0]; i < ict.GROUPS.teeth[1]; i++) valb[i] = 0.8;
  for (let i = ict.GROUPS.gumsTongue[0]; i < ict.GROUPS.gumsTongue[1]; i++) valb[i] = 0.3;
  for (let i = ict.GROUPS.mouthSocket[0]; i < ict.GROUPS.mouthSocket[1]; i++) valb[i] = 0.35;
  return { skip, valb };
}
export function scene(opts = {}) {
  const key = JSON.stringify(opts);
  if (!_scene || _scene.key !== key) {
    const em = eyeModel();
    _scene = { key, ...buildTris(ict.faces(), { ...opts, skipVerts: em.skip }), valb: em.valb };
  }
  return _scene;
}

function centroid(P, a, b) {
  const c = [0, 0, 0];
  for (let i = a; i < b; i++) for (let k = 0; k < 3; k++) c[k] += P[i * 3 + k];
  return c.map((v) => v / (b - a));
}
export function eyeCentres(P) {
  return { L: centroid(P, ...ict.GROUPS.eyeballL), R: centroid(P, ...ict.GROUPS.eyeballR) };
}

/** Face width W (cm): silhouette width of the front half of the face at cheekbone height. */
export function faceWidth(P) {
  const e = eyeCentres(P);
  const ipd = Math.hypot(e.L[0] - e.R[0], e.L[1] - e.R[1], e.L[2] - e.R[2]);
  const ey = (e.L[1] + e.R[1]) / 2, ez = (e.L[2] + e.R[2]) / 2;
  let m = 0;
  const [a, b] = ict.GROUPS.face;
  for (let i = a; i < b; i++) {
    const y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (y < ey - 0.75 * ipd || y > ey + 0.05 * ipd) continue;
    if (z < ez - 0.9 * ipd) continue; // stay in front of the ear
    m = Math.max(m, Math.abs(P[i * 3]));
  }
  return { W: 2 * m, ipd, eyeY: ey, eyeZ: ez, mid: [(e.L[0] + e.R[0]) / 2, ey, ez] };
}

/**
 * view: 'front' | 'q34' | 'profile' | 'ref'
 * size: output square-ish frame; the face width W maps to `wFrac` of the frame width.
 */
export function portrait(P, view = 'front', { width = 520, height = 640, wFrac = 0.5, teeth = false, ao = 40, light, fy = 0.4 } = {}) {
  const sc = scene({ teeth });
  const N = vertexNormals(P, sc.tris);
  const fw = faceWidth(P);
  // Frame on the look report's ruler: W = 2 x IPD (catchlight distance), so proportions compare honestly.
  const pxPerCm = (wFrac * width) / (2 * fw.ipd);
  const views = {
    front: { yaw: 0, pitch: 0 },
    q34: { yaw: 32, pitch: -2 },
    profile: { yaw: 90, pitch: 0, focusShift: [0, -0.12, -0.12] },
    ref: { yaw: 0, pitch: 0 },
  };
  const v = views[view];
  const lights =
    light ||
    (view === 'ref'
      ? [{ dir: [-0.16, 0.85, 0.5], k: 1.0, shadow: true }]
      : [
          { dir: [-0.42, 0.5, 0.76], k: 0.78, shadow: true },
          { dir: [0.6, 0.05, 0.8], k: 0.1, shadow: false },
        ]);
  const out = render({
    P, N, tris: sc.tris, triMat: sc.triMat, valb: sc.valb, width, height,
    yaw: v.yaw, pitch: v.pitch, fovDeg: 20, pxPerCm,
    focus: v.focusShift ? fw.mid.map((c, k) => c + v.focusShift[k] * fw.ipd * 2) : fw.mid,
    pivot: [0, fw.eyeY - 1.0, fw.eyeZ - 7.0], lights,
    ambient: view === 'ref' ? 0.05 : 0.2, aoDirs: ao, exposure: view === 'ref' ? 1 : 0.92,
    spec: view === 'ref' ? { ks: 0.35, exp: 48 } : { ks: 0.1, exp: 28 },
    fx: 0.5, fy,
  });
  out.fy = fy;
  out.fw = fw;
  out.pxPerCm = pxPerCm;
  return out;
}

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Dot-grid preview from a 'ref'-lit render: square grid at pitch W/59 anchored on the eye midpoint,
 * cell-averaged luminance -> gaussian dot + halo, mint tint, tone curve 1 - exp(-1.15x).
 */
export function dotPreview(r, { W: wPx, pitchDiv = 59, gain = 1 } = {}) {
  const { W, H, lum, mask } = r;
  const p = wPx / pitchDiv;
  const ox = 0.5 * W, oy = (r.fy ?? 0.4) * H;
  // normalise: 97th percentile of covered luminance -> 1.0
  const vals = [];
  for (let k = 0; k < W * H; k += 3) if (mask[k]) vals.push(lum[k]);
  vals.sort((a, b) => a - b);
  const ref = vals[Math.floor(vals.length * 0.97)] || 1;
  const acc = new Float32Array(W * H);
  const i0 = Math.floor(-ox / p) - 1, i1 = Math.ceil((W - ox) / p) + 1;
  const j0 = Math.floor(-oy / p) - 1, j1 = Math.ceil((H - oy) / p) + 1;
  const sig = 0.37 * p * 0.55;
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const gx = ox + i * p, gy = oy + j * p;
      // cell average
      let s = 0, c = 0, n = 0;
      const x0 = Math.floor(gx - p / 2), x1 = Math.floor(gx + p / 2), y0 = Math.floor(gy - p / 2), y1 = Math.floor(gy + p / 2);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        n++;
        const k = y * W + x;
        if (mask[k]) { c++; s += lum[k]; }
      }
      if (!c) continue;
      const cov = c / n;
      const L = ((s / c) / ref) * gain;
      const alpha = smooth(0.05, 0.12, L) * cov;
      if (alpha <= 0) continue;
      const I = 2.0 * Math.pow(L, 1.1) * alpha;
      const rr = (0.17 + 0.2 * smooth(0.08, 0.65, L) + 0.03 * smooth(0.65, 1.2, L)) * p;
      const reach = Math.ceil(p * 1.6);
      for (let y = Math.floor(gy - reach); y <= gy + reach; y++) {
        if (y < 0 || y >= H) continue;
        for (let x = Math.floor(gx - reach); x <= gx + reach; x++) {
          if (x < 0 || x >= W) continue;
          const d = Math.hypot(x + 0.5 - gx, y + 0.5 - gy);
          const core = 1 - smooth(rr - 0.6, rr + 0.6, d);
          const halo = Math.exp(-(d * d) / (2 * sig * sig)) * 0.5 + 0.07 * Math.exp(-d / p);
          acc[y * W + x] += I * (0.75 * core + halo);
        }
      }
    }
  }
  const rgb = new Uint8Array(W * H * 3);
  const tint = [0.91, 0.99, 1.0];
  for (let k = 0; k < W * H; k++) {
    const t = 1 - Math.exp(-1.15 * acc[k]);
    for (let c = 0; c < 3; c++) {
      const v = Math.min(1, t * (tint[c] + (1 - tint[c]) * t));
      rgb[k * 3 + c] = Math.round(255 * v);
    }
  }
  return rgb;
}

/**
 * Closer stand-in for the ref-2 look (still not the production renderer): look-report dot law, edge
 * dissolution past 0.63 W, lattice top / neck fades, dim ghost layer (0.07) and cornea catchlights.
 * r: result of portrait(P, 'ref', ...); P: the mesh that was rendered; wPx: face width W in px (2 IPD).
 */
export function dotPreviewRef2(r, P, { W: wPx, seed = 1 } = {}) {
  const { W, H, lum, mask, S } = r;
  const p = wPx / 59;
  const ox = 0.5 * W, oy = (r.fy ?? 0.4) * H;
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const vals = [];
  for (let k = 0; k < W * H; k += 2) if (mask[k]) vals.push(lum[k]);
  vals.sort((a, b) => a - b);
  const ref = vals[Math.floor(vals.length * 0.97)] || 1;
  // chin row (screen y of the menton landmark)
  const chinY = S[ict.LM68[8] * 3 + 1];
  const acc = new Float32Array(W * H);
  const ghost = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) if (mask[k]) ghost[k] = 0.07 * Math.pow(Math.max(0, lum[k] / ref), 1.35);
  const i0 = Math.floor(-ox / p) - 1, i1 = Math.ceil((W - ox) / p) + 1;
  const j0 = Math.floor(-oy / p) - 1, j1 = Math.ceil((H - oy) / p) + 1;
  const sig = 0.37 * p;
  const splat = (gx, gy, I, rr) => {
    const reach = Math.ceil(p * 1.8);
    for (let y = Math.floor(gy - reach); y <= gy + reach; y++) {
      if (y < 0 || y >= H) continue;
      for (let x = Math.floor(gx - reach); x <= gx + reach; x++) {
        if (x < 0 || x >= W) continue;
        const d = Math.hypot(x + 0.5 - gx, y + 0.5 - gy);
        const core = 1 - smooth(rr - 0.7, rr + 0.7, d);
        acc[y * W + x] += I * (0.8 * core + 0.35 * Math.exp(-(d * d) / (2 * sig * sig)) + 0.07 * Math.exp(-d / p));
      }
    }
  };
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const gx = ox + i * p, gy = oy + j * p;
      let sum = 0, c = 0, n = 0;
      for (let y = Math.floor(gy - p / 2); y < Math.floor(gy + p / 2); y++) for (let x = Math.floor(gx - p / 2); x < Math.floor(gx + p / 2); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        n++;
        if (mask[y * W + x]) { c++; sum += lum[y * W + x]; }
      }
      if (!c) continue;
      const L = Math.pow((sum / c) / ref, 1.35);
      const ax = Math.abs(gx - ox) / wPx; // in W
      const up = (oy - gy) / wPx; // + above the eye line
      let dens = ax > 0.63 ? Math.exp(-(ax - 0.63) / 0.2) : 1;
      dens *= 1 - smooth(1.15, 1.45, ax);
      dens *= 1 - smooth(0.55, 1.0, up);
      dens *= 1 - smooth(chinY + 0.08 * wPx, chinY + 0.45 * wPx, gy);
      if (rnd() > dens) continue;
      const alpha = smooth(0.05, 0.12, L) * (c / n);
      if (alpha <= 0) continue;
      const I = 2.0 * Math.pow(L, 1.1) * alpha * (0.9 + 0.2 * rnd());
      const rr = Math.min(0.4, 0.17 + 0.2 * smooth(0.08, 0.65, L) + 0.03 * smooth(0.65, 1.2, L)) * p * (0.92 + 0.16 * rnd());
      splat(gx, gy, I, rr);
    }
  }
  // catchlights at the cornea apex of each eye (+ a dimmer secondary)
  for (const [a, b] of [[ict.GROUPS.eyeballL[0], ict.IRIS.L[0]], [ict.GROUPS.eyeballR[0], ict.IRIS.R[0]]]) {
    let apex = a;
    for (let i = a; i < b; i++) if (P[i * 3 + 2] > P[apex * 3 + 2]) apex = i;
    const cx = S[apex * 3] - 0.015 * wPx, cy = S[apex * 3 + 1] - 0.015 * wPx;
    splat(cx, cy, 2.0, 0.4 * p);
    splat(cx + 0.03 * wPx, cy + 0.02 * wPx, 1.2, 0.3 * p);
  }
  const rgb = new Uint8Array(W * H * 3);
  const mid = [0.91, 0.99, 1.0], peak = [0.98, 1.0, 1.0];
  for (let k = 0; k < W * H; k++) {
    const t = 1 - Math.exp(-1.15 * (acc[k] + ghost[k]));
    for (let q = 0; q < 3; q++) {
      const tint = mid[q] + (peak[q] - mid[q]) * t;
      rgb[k * 3 + q] = Math.round(255 * Math.min(1, t * tint));
    }
  }
  return rgb;
}
