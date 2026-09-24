// Pure-Node software rasteriser for identity-lab portraits (greyscale, bald).
// Deferred: rasterise triangle id + barycentrics with a z-buffer, then shade per pixel with
// interpolated smooth normals, a soft shadow map for the key light and a multi-direction
// shadow-map ambient occlusion. Deterministic, no GPU, ~0.5-2 s per 800x800 view.
import { GROUPS, IRIS } from './ict.mjs';

export const MAT = { skin: 0, sclera: 1, iris: 2, teeth: 3, gums: 4 };
const MAT_ALBEDO = [0.78, 0.82, 0.16, 0.85, 0.35];

/** Triangulate the ICT polygons for the groups we draw. */
export function buildTris(faces, { teeth = false, eyes = true, skipVerts = null } = {}) {
  const tris = [];
  const mats = [];
  const inG = (v, g) => v >= GROUPS[g][0] && v < GROUPS[g][1];
  for (let p = 0; p < faces.polys.length; p++) {
    const poly = faces.polys[p];
    const v0 = poly[0];
    let m = -1;
    if (inG(v0, 'face') || inG(v0, 'headNeck') || inG(v0, 'mouthSocket') || inG(v0, 'eyeSocketL') || inG(v0, 'eyeSocketR')) m = MAT.skin;
    else if (eyes && (inG(v0, 'eyeballL') || inG(v0, 'eyeballR'))) {
      const iris = (v0 >= IRIS.L[0] && v0 < IRIS.L[1]) || (v0 >= IRIS.R[0] && v0 < IRIS.R[1]);
      m = iris ? MAT.iris : MAT.sclera;
    } else if (teeth && inG(v0, 'teeth')) m = MAT.teeth;
    else if (teeth && inG(v0, 'gumsTongue')) m = MAT.gums;
    if (m < 0) continue;
    if (skipVerts && m === MAT.sclera && poly.every((v) => skipVerts.has(v))) continue; // transparent cornea
    for (let k = 1; k + 1 < poly.length; k++) {
      tris.push(poly[0], poly[k], poly[k + 1]);
      mats.push(m);
    }
  }
  return { tris: Uint32Array.from(tris), triMat: Uint8Array.from(mats) };
}

export function vertexNormals(P, tris) {
  const N = new Float32Array(P.length);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; // area weighted
    for (const i of [a, b, c]) {
      N[i] += nx;
      N[i + 1] += ny;
      N[i + 2] += nz;
    }
  }
  for (let i = 0; i < N.length; i += 3) {
    const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1;
    N[i] /= l;
    N[i + 1] /= l;
    N[i + 2] /= l;
  }
  return N;
}

function rotMat(yawDeg, pitchDeg, rollDeg = 0) {
  const y = (yawDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180, r = (rollDeg * Math.PI) / 180;
  const cy = Math.cos(y), sy = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p), cr = Math.cos(r), sr = Math.sin(r);
  // R = Rz(roll) * Rx(pitch) * Ry(yaw)
  const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const Rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp];
  const Rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1];
  const mul = (A, B) => {
    const C = new Array(9).fill(0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
    return C;
  };
  return mul(Rz, mul(Rx, Ry));
}
const norm3 = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Orthographic depth map along direction d (toward light), over the vertex set V (view space). */
function shadowMap(V, tris, d, res) {
  const lz = norm3(d);
  const up = Math.abs(lz[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const lx = norm3(cross(up, lz));
  const ly = cross(lz, lx);
  const n = V.length / 3;
  const L = new Float32Array(n * 3);
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (let i = 0; i < n; i++) {
    const x = V[i * 3], y = V[i * 3 + 1], z = V[i * 3 + 2];
    const a = x * lx[0] + y * lx[1] + z * lx[2];
    const b = x * ly[0] + y * ly[1] + z * ly[2];
    const c = x * lz[0] + y * lz[1] + z * lz[2];
    L[i * 3] = a;
    L[i * 3 + 1] = b;
    L[i * 3 + 2] = c;
    if (a < mnx) mnx = a;
    if (a > mxx) mxx = a;
    if (b < mny) mny = b;
    if (b > mxy) mxy = b;
  }
  const pad = 0.5;
  mnx -= pad; mny -= pad; mxx += pad; mxy += pad;
  const s = (res - 1) / Math.max(mxx - mnx, mxy - mny);
  const D = new Float32Array(res * res).fill(-1e9);
  for (let t = 0; t < tris.length; t += 3) {
    const i0 = tris[t] * 3, i1 = tris[t + 1] * 3, i2 = tris[t + 2] * 3;
    const x0 = (L[i0] - mnx) * s, y0 = (L[i0 + 1] - mny) * s, z0 = L[i0 + 2];
    const x1 = (L[i1] - mnx) * s, y1 = (L[i1 + 1] - mny) * s, z1 = L[i1 + 2];
    const x2 = (L[i2] - mnx) * s, y2 = (L[i2 + 1] - mny) * s, z2 = L[i2 + 2];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-9) continue;
    const bx0 = Math.max(0, Math.floor(Math.min(x0, x1, x2))), bx1 = Math.min(res - 1, Math.ceil(Math.max(x0, x1, x2)));
    const by0 = Math.max(0, Math.floor(Math.min(y0, y1, y2))), by1 = Math.min(res - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const w0 = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / area;
        const w1 = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue; // slight dilation closes cracks
        const z = w0 * z0 + w1 * z1 + w2 * z2;
        const k = y * res + x;
        if (z > D[k]) D[k] = z;
      }
    }
  }
  return {
    D, res, s, mnx, mny, lx, ly, lz,
    /** fraction lit at view-space point (x,y,z), PCF radius in texels */
    vis(x, y, z, bias, rad = 1) {
      const a = (x * lx[0] + y * lx[1] + z * lx[2] - mnx) * s;
      const b = (x * ly[0] + y * ly[1] + z * ly[2] - mny) * s;
      const c = x * lz[0] + y * lz[1] + z * lz[2];
      const ia = Math.round(a), ib = Math.round(b);
      let lit = 0, cnt = 0;
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const u = ia + dx, v = ib + dy;
          cnt++;
          if (u < 0 || v < 0 || u >= res || v >= res) { lit++; continue; }
          if (c + bias >= D[v * res + u]) lit++;
        }
      }
      return lit / cnt;
    },
  };
}

function fibSphere(n) {
  const out = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    out.push([Math.cos(g * i) * r, y, Math.sin(g * i) * r]);
  }
  return out;
}

/**
 * Render one view.
 * opts: P, N, tris, triMat, width, height, yaw, pitch, fovDeg, focus [x,y,z] (world, lands at (fx*W, fy*H)),
 *       pxPerCm, pivot, lights: [{dir:[x,y,z] (view space, toward light), k, shadow}], ambient, aoDirs,
 *       spec: {ks, exp}, fx, fy
 * returns { rgb (sRGB greyscale), lum (linear Float32), mask (Uint8, 1 = covered), tri (Int32) }
 */
export function render(opts) {
  const {
    P, N, tris, triMat, width: W, height: H,
    yaw = 0, pitch = 0, roll = 0, fovDeg = 20, focus, pxPerCm, pivot = [0, 1.5, 1],
    lights = [{ dir: [-0.25, 0.55, 0.8], k: 0.9, shadow: true }],
    ambient = 0.28, aoDirs = 48, spec = { ks: 0.12, exp: 28 }, fx = 0.5, fy = 0.42, albedo = MAT_ALBEDO, valb = null, exposure = 1,
  } = opts;
  const R = rotMat(yaw, pitch, roll);
  const nV = P.length / 3;
  const f = H / 2 / Math.tan((fovDeg * Math.PI) / 360);
  const D = f / pxPerCm;
  // focus after rotation
  const fr = [0, 0, 0];
  {
    const q = [focus[0] - pivot[0], focus[1] - pivot[1], focus[2] - pivot[2]];
    for (let i = 0; i < 3; i++) fr[i] = R[i * 3] * q[0] + R[i * 3 + 1] * q[1] + R[i * 3 + 2] * q[2] + pivot[i];
  }
  // view-space vertices (camera at origin looking -Z) and rotated normals
  const V = new Float32Array(nV * 3);
  const NR = new Float32Array(nV * 3);
  for (let i = 0; i < nV; i++) {
    const q0 = P[i * 3] - pivot[0], q1 = P[i * 3 + 1] - pivot[1], q2 = P[i * 3 + 2] - pivot[2];
    for (let k = 0; k < 3; k++) {
      V[i * 3 + k] = R[k * 3] * q0 + R[k * 3 + 1] * q1 + R[k * 3 + 2] * q2 + pivot[k] - fr[k] - (k === 2 ? D : 0);
      NR[i * 3 + k] = R[k * 3] * N[i * 3] + R[k * 3 + 1] * N[i * 3 + 1] + R[k * 3 + 2] * N[i * 3 + 2];
    }
  }
  // project
  const S = new Float32Array(nV * 3); // sx, sy, 1/w
  const cx = fx * W, cy = fy * H;
  for (let i = 0; i < nV; i++) {
    const w = -V[i * 3 + 2];
    S[i * 3] = cx + (f * V[i * 3]) / w;
    S[i * 3 + 1] = cy - (f * V[i * 3 + 1]) / w;
    S[i * 3 + 2] = 1 / w;
  }
  const zbuf = new Float32Array(W * H).fill(0); // stores 1/w, larger = closer
  const tid = new Int32Array(W * H).fill(-1);
  const bar0 = new Float32Array(W * H), bar1 = new Float32Array(W * H);
  for (let t = 0, ti = 0; t < tris.length; t += 3, ti++) {
    const i0 = tris[t] * 3, i1 = tris[t + 1] * 3, i2 = tris[t + 2] * 3;
    const x0 = S[i0], y0 = S[i0 + 1], q0 = S[i0 + 2];
    const x1 = S[i1], y1 = S[i1 + 1], q1 = S[i1 + 2];
    const x2 = S[i2], y2 = S[i2 + 1], q2 = S[i2 + 2];
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(area) < 1e-12) continue;
    const bx0 = Math.max(0, Math.floor(Math.min(x0, x1, x2))), bx1 = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
    const by0 = Math.max(0, Math.floor(Math.min(y0, y1, y2))), by1 = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
    for (let y = by0; y <= by1; y++) {
      const py = y + 0.5;
      for (let x = bx0; x <= bx1; x++) {
        const px = x + 0.5;
        const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area;
        const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const q = w0 * q0 + w1 * q1 + w2 * q2;
        const k = y * W + x;
        if (q > zbuf[k]) {
          zbuf[k] = q;
          tid[k] = ti;
          bar0[k] = w0;
          bar1[k] = w1;
        }
      }
    }
  }
  // shadow maps
  const Ls = lights.map((l) => ({ ...l, d: norm3(l.dir) }));
  for (const l of Ls) if (l.shadow) l.sm = shadowMap(V, tris, l.d, 1400);
  const aoSet = [];
  if (aoDirs > 0) {
    for (const d of fibSphere(aoDirs * 2)) {
      if (d[2] < -0.35) continue; // light comes from the front hemisphere + sides only (camera side)
      aoSet.push({ d, sm: shadowMap(V, tris, d, 420) });
    }
  }
  const lum = new Float32Array(W * H);
  const mask = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) {
    const ti = tid[k];
    if (ti < 0) continue;
    mask[k] = 1;
    const t = ti * 3;
    const i0 = tris[t] * 3, i1 = tris[t + 1] * 3, i2 = tris[t + 2] * 3;
    // perspective-correct barycentrics
    let b0 = bar0[k] * S[i0 + 2], b1 = bar1[k] * S[i1 + 2], b2 = (1 - bar0[k] - bar1[k]) * S[i2 + 2];
    const sb = b0 + b1 + b2;
    b0 /= sb; b1 /= sb; b2 /= sb;
    let nx = b0 * NR[i0] + b1 * NR[i1] + b2 * NR[i2];
    let ny = b0 * NR[i0 + 1] + b1 * NR[i1 + 1] + b2 * NR[i2 + 1];
    let nz = b0 * NR[i0 + 2] + b1 * NR[i1 + 2] + b2 * NR[i2 + 2];
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl; ny /= nl; nz /= nl;
    const px = b0 * V[i0] + b1 * V[i1] + b2 * V[i2];
    const py = b0 * V[i0 + 1] + b1 * V[i1 + 1] + b2 * V[i2 + 1];
    const pz = b0 * V[i0 + 2] + b1 * V[i1 + 2] + b2 * V[i2 + 2];
    let vx = -px, vy = -py, vz = -pz;
    const vl = Math.hypot(vx, vy, vz);
    vx /= vl; vy /= vl; vz /= vl;
    if (nx * vx + ny * vy + nz * vz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const a = valb ? b0 * valb[tris[t]] + b1 * valb[tris[t + 1]] + b2 * valb[tris[t + 2]] : albedo[triMat[ti]];
    let c = 0;
    // ambient occlusion (cosine-weighted visibility over the directions)
    if (aoSet.length) {
      let num = 0, den = 0;
      for (const o of aoSet) {
        const cw = nx * o.d[0] + ny * o.d[1] + nz * o.d[2];
        if (cw <= 0) continue;
        den += cw;
        num += cw * o.sm.vis(px + nx * 0.25, py + ny * 0.25, pz + nz * 0.25, 0.1, 0);
      }
      c += ambient * a * (den > 0 ? num / den : 1);
    } else c += ambient * a;
    for (const l of Ls) {
      const ndl = nx * l.d[0] + ny * l.d[1] + nz * l.d[2];
      if (ndl <= 0) continue;
      const vis = l.sm ? l.sm.vis(px + nx * 0.08, py + ny * 0.08, pz + nz * 0.08, 0.04, 2) : 1;
      c += l.k * a * ndl * vis;
      if (spec && spec.ks) {
        let hx = l.d[0] + vx, hy = l.d[1] + vy, hz = l.d[2] + vz;
        const hl = Math.hypot(hx, hy, hz);
        const ndh = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl);
        const sk = triMat[ti] === MAT.iris || triMat[ti] === MAT.sclera ? 3 : 1;
        c += l.k * spec.ks * sk * Math.pow(ndh, spec.exp * (sk > 1 ? 8 : 1)) * vis;
      }
    }
    lum[k] = c * exposure;
  }
  const rgb = new Uint8Array(W * H * 3);
  for (let k = 0; k < W * H; k++) {
    const v = Math.max(0, Math.min(1, lum[k]));
    const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    const g = Math.round(s * 255);
    rgb[k * 3] = rgb[k * 3 + 1] = rgb[k * 3 + 2] = g;
  }
  return { rgb, lum, mask, tid, W, H, f, D, V, S };
}

