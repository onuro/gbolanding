import * as THREE from 'three';
import type { FaceMeshData } from './lab-mesh';

// Head / hair volume (a3 'volume'): nested, noise-lit shells around the ICT skull that give the particle
// face the head mass ref 2 suggests (crown, temples, sides, long hair falling behind the jaw).
// Built once from the skin vertices (no asset): a star-shaped radius field of the skull around C
// (spherical cap) continued by cylindrical curtains below the equator whose radius is the running max
// of the skin's horizontal extent (the hair drapes outside the ears and jaw), plus a flare.
// Every layer k is the base surface pushed out by t_k along the field direction; layers are drawn
// additively (front faces only) into the volume target, so the accumulated opacity falls off outward
// (inner shells' silhouettes end first) and the lattice samples it like the lit face.
// Units: W, head space (origin between the pupils, +Y up, +Z toward the camera).
//
// Attributes: position, normal (smoothed, outward), aHair = (along-strand s, across-strand c, layer 0..1,
// base density), aOpen = face-opening weight (1 = hair, 0 = the face stays uncovered; soft edge).

export interface HairVolumeOptions {
  centre: [number, number, number];
  layers: number[]; // shell offsets t_k (W)
  layerDensity: number[]; // opacity weight per layer
  bottom: number; // curtain bottom y (W)
  flare: number; // curtain radius growth per W downward
  thetaBins: number;
  capRows: number;
  curtainRows: number;
  openE: [number, number]; // face-opening ellipse e (frontal projection): hair density 0 inside [0], 1 beyond [1]
  curtainOpen: [number, number, number]; // curtain front gap half-angle (deg) at the eye line, at the jaw (y -0.5), below the chin (y -0.9)
}

export const HAIR_DEFAULTS: HairVolumeOptions = {
  centre: [0, 0.12, -0.67],
  layers: [0.03, 0.08, 0.14, 0.21],
  layerDensity: [0.42, 0.3, 0.18, 0.1],
  bottom: -1.45,
  flare: 0.1,
  thetaBins: 96,
  capRows: 28,
  curtainRows: 34,
  openE: [0.88, 1.02],
  curtainOpen: [36, 60, 76],
};

export function buildHairVolume(mesh: FaceMeshData, o: HairVolumeOptions = HAIR_DEFAULTS): THREE.BufferGeometry {
  const P = mesh.position;
  const skinPart = mesh.parts.find((p) => p.name === 'skin');
  const skin = new Set<number>();
  if (skinPart) for (let i = skinPart.start; i < skinPart.start + skinPart.count; i++) skin.add(mesh.index[i]);
  const [cx, cy, cz] = o.centre;
  const NT = o.thetaBins;
  // ---- spherical radius field of the skull (upper hemisphere + a margin below the equator)
  const NP = 40; // polar bins 0..100 deg
  const PHI_MAX = (100 / 180) * Math.PI;
  const rS = new Float32Array(NT * NP);
  // ---- cylindrical horizontal extent per theta and height row
  const NY = 64;
  const yTop = cy, yBot = o.bottom;
  const rC = new Float32Array(NT * NY);
  const tBin = (x: number, z: number) => {
    const th = Math.atan2(x, z); // 0 = toward the camera
    return ((Math.floor(((th + Math.PI) / (2 * Math.PI)) * NT) % NT) + NT) % NT;
  };
  for (const v of skin) {
    const x = P[3 * v] - cx, y = P[3 * v + 1] - cy, z = P[3 * v + 2] - cz;
    const r = Math.hypot(x, y, z);
    const phi = Math.acos(Math.max(-1, Math.min(1, y / r)));
    const ti = tBin(x, z);
    if (phi < PHI_MAX) {
      const pi = Math.min(NP - 1, Math.floor((phi / PHI_MAX) * NP));
      rS[pi * NT + ti] = Math.max(rS[pi * NT + ti], r);
    }
    const yy = P[3 * v + 1];
    if (yy < yTop && yy > yBot) {
      const yi = Math.min(NY - 1, Math.floor(((yTop - yy) / (yTop - yBot)) * NY));
      rC[yi * NT + ti] = Math.max(rC[yi * NT + ti], Math.hypot(x, z));
    }
  }
  // fill holes + conservative smoothing (dilate by max, then blur) on the torus theta axis
  const dilate = (f: Float32Array, rows: number, it: number) => {
    for (let k = 0; k < it; k++) {
      const g = f.slice();
      for (let j = 0; j < rows; j++) for (let i = 0; i < NT; i++) {
        let m = f[j * NT + i];
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const jj = j + dj; if (jj < 0 || jj >= rows) continue;
          m = Math.max(m, f[jj * NT + ((i + di + NT) % NT)]);
        }
        g[j * NT + i] = m;
      }
      f.set(g);
    }
  };
  const fillRows = (f: Float32Array, rows: number) => {
    const has = (j: number) => { for (let i = 0; i < NT; i++) if (f[j * NT + i] > 0) return true; return false; };
    for (let j = 0; j < rows; j++) {
      const got: number[] = [];
      for (let i = 0; i < NT; i++) if (f[j * NT + i] > 0) got.push(i);
      if (!got.length) continue;
      for (let g = 0; g < got.length; g++) {
        const i0 = got[g], i1 = got[(g + 1) % got.length], span = ((i1 - i0 + NT - 1) % NT) + 1;
        const r0 = f[j * NT + i0], r1 = f[j * NT + i1];
        for (let d = 1; d < span; d++) f[j * NT + ((i0 + d) % NT)] = r0 + ((r1 - r0) * d) / span;
      }
    }
    for (let j = 0; j < rows; j++) {
      if (has(j)) continue;
      for (let d = 1; d < rows; d++) {
        const src = [j - d, j + d].find((k) => k >= 0 && k < rows && has(k));
        if (src !== undefined) { f.copyWithin(j * NT, src * NT, src * NT + NT); break; }
      }
    }
  };
  const blur = (f: Float32Array, rows: number, it: number) => {
    for (let k = 0; k < it; k++) {
      const g = f.slice();
      for (let j = 0; j < rows; j++) for (let i = 0; i < NT; i++) {
        let s = 0, n = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const jj = j + dj; if (jj < 0 || jj >= rows) continue;
          const w = (dj ? 0.5 : 1) * (di ? 0.5 : 1);
          s += w * f[jj * NT + ((i + di + NT) % NT)]; n += w;
        }
        g[j * NT + i] = s / n;
      }
      f.set(g);
    }
  };
  // near the pole a theta bin covers a sliver of the skull (solid angle ~ sin phi): most of the first rows' bins hold no
  // skin vertex (planb: 94 of 96 in the top row, still ~80 at 20 deg). Left at 0 they stayed near 0 through the dilate /
  // blur, so the shells dipped into the head at those angles and the crown became a spiky star with notches (two bright
  // 'ears' either side of a dark slit at the top of the card). Empty bins take the circular linear interpolation of their
  // row's filled bins (a row with none copies the nearest filled row); filled bins are untouched. Only the crown's rows
  // (phi < 30 deg): lower down the gaps are narrow enough for the dilate, and the approved hair shape stays exactly as it was.
  fillRows(rS, Math.round((30 / 100) * NP));
  dilate(rS, NP, 2); blur(rS, NP, 4);
  // polar cap row 0 is degenerate (few vertices): use the max of the first rows
  let top = 0;
  for (let i = 0; i < NT; i++) top = Math.max(top, rS[NT + i], rS[2 * NT + i]);
  for (let i = 0; i < NT; i++) rS[i] = Math.max(rS[i], top);
  dilate(rC, NY, 2); blur(rC, NY, 3);
  const sampleS = (phi: number, i: number) => {
    const f = Math.min(NP - 1.001, Math.max(0, (phi / PHI_MAX) * NP - 0.5));
    const j = Math.floor(f), a = f - j;
    return rS[j * NT + i] * (1 - a) + rS[(j + 1) * NT + i] * a;
  };
  // curtain radius: running max downward of the skin extent, never inside the cap's equator ring
  const runC = new Float32Array(NT * NY);
  for (let i = 0; i < NT; i++) {
    let m = sampleS(Math.PI / 2, i);
    for (let j = 0; j < NY; j++) { m = Math.max(m, rC[j * NT + i]); runC[j * NT + i] = m; }
  }
  blur(runC, NY, 2);
  const sampleC = (y: number, i: number) => {
    const f = Math.min(NY - 1.001, Math.max(0, ((yTop - y) / (yTop - yBot)) * NY - 0.5));
    const j = Math.floor(f), a = f - j;
    return runC[j * NT + i] * (1 - a) + runC[(j + 1) * NT + i] * a;
  };

  // ---- base surface grid: rows = cap (phi 0..90) then curtain (y from cy down to bottom)
  const NR = o.capRows + o.curtainRows;
  const cols = NT + 1; // duplicate seam column
  const base = new Float32Array(NR * cols * 3); // base point (skin-hugging)
  const dir = new Float32Array(NR * cols * 3); // outward offset direction
  const sAlong = new Float32Array(NR * cols);
  const cAcross = new Float32Array(NR * cols);
  const eqR = new Float32Array(cols);
  for (let r = 0; r < NR; r++) {
    for (let c = 0; c < cols; c++) {
      const i = c % NT;
      const th = ((i + 0.5) / NT) * 2 * Math.PI - Math.PI;
      const st = Math.sin(th), ct = Math.cos(th);
      const k = r * cols + c;
      let bx, by, bz, dx, dy, dz, s;
      if (r < o.capRows) {
        const phi = (r / (o.capRows - 1)) * (Math.PI / 2);
        const rad = sampleS(phi, i);
        dx = Math.sin(phi) * st; dy = Math.cos(phi); dz = Math.sin(phi) * ct;
        bx = cx + dx * rad; by = cy + dy * rad; bz = cz + dz * rad;
        s = phi * rad;
        if (r === o.capRows - 1) eqR[c] = rad;
      } else {
        const f = (r - o.capRows + 1) / o.curtainRows;
        const y = cy + (yBot - cy) * f;
        const rad = Math.max(sampleC(y, i), eqR[c] || sampleS(Math.PI / 2, i)) + o.flare * (cy - y);
        dx = st; dy = 0; dz = ct;
        bx = cx + dx * rad; by = y; bz = cz + dz * rad;
        s = (Math.PI / 2) * (eqR[c] || rad) + (cy - y);
      }
      base.set([bx, by, bz], 3 * k);
      dir.set([dx, dy, dz], 3 * k);
      sAlong[k] = s;
      cAcross[k] = th * 0.7; // arc-ish across coordinate (W at r ~ 0.7)
    }
  }
  // face opening (hair never covers the face): soft ellipse in the frontal projection, wider below the eyes
  // so the curtains fall behind the jaw; only for the front half of the head
  const opening = (x: number, y: number, z: number) => {
    const v = -y; // v down
    const ey = (v - 0.07) / (v > 0.07 ? 0.78 : 0.71);
    const ex = x / (0.5 + 0.06 * Math.max(0, Math.min(1, v / 0.6)));
    const e = Math.hypot(ex, ey);
    const front = smooth(-0.75, -0.35, z); // 1 in front of the ears
    const open = 1 - smooth(o.openE[0], o.openE[1], e);
    let m = 1 - open * front;
    if (y < cy) {
      // curtains fall beside / behind the jaw and neck, never in front of them
      const th = Math.abs(Math.atan2(x - cx, z - cz)) * 180 / Math.PI;
      const [a0, a1, a2] = o.curtainOpen;
      const g = y > -0.5 ? a0 + (a1 - a0) * smooth(cy, -0.5, y) : a1 + (a2 - a1) * smooth(-0.5, -0.9, y);
      m *= smooth(g - 10, g + 10, th);
    }
    return m;
  };
  // ---- layers
  const L = o.layers.length;
  const nV = L * NR * cols;
  const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), hair = new Float32Array(nV * 4), open = new Float32Array(nV);
  const idx: number[] = [];
  const tmp = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let l = 0; l < L; l++) {
    const t = o.layers[l];
    const off = l * NR * cols;
    for (let k = 0; k < NR * cols; k++) {
      const q = off + k;
      const x = base[3 * k] + dir[3 * k] * t, y = base[3 * k + 1] + dir[3 * k + 1] * t, z = base[3 * k + 2] + dir[3 * k + 2] * t;
      pos.set([x, y, z], 3 * q);
      hair.set([sAlong[k], cAcross[k], L > 1 ? l / (L - 1) : 0, o.layerDensity[l]], 4 * q);
      open[q] = opening(base[3 * k], base[3 * k + 1], base[3 * k + 2]);
    }
    // normals from the grid (central differences), outward
    for (let r = 0; r < NR; r++) for (let c = 0; c < cols; c++) {
      const q = off + r * cols + c;
      const cl = off + r * cols + (c === 0 ? NT - 1 : c - 1), cr = off + r * cols + (c === NT ? 1 : c + 1);
      const ru = off + Math.max(0, r - 1) * cols + c, rd = off + Math.min(NR - 1, r + 1) * cols + c;
      a.set(pos[3 * cr] - pos[3 * cl], pos[3 * cr + 1] - pos[3 * cl + 1], pos[3 * cr + 2] - pos[3 * cl + 2]);
      b.set(pos[3 * rd] - pos[3 * ru], pos[3 * rd + 1] - pos[3 * ru + 1], pos[3 * rd + 2] - pos[3 * ru + 2]);
      tmp.crossVectors(b, a);
      if (r === 0) tmp.set(0, 1, 0);
      if (tmp.lengthSq() < 1e-12) tmp.set(dir[3 * (r * cols + c)], dir[3 * (r * cols + c) + 1], dir[3 * (r * cols + c) + 2]);
      tmp.normalize();
      // make it outward
      if (tmp.x * dir[3 * (r * cols + c)] + tmp.y * dir[3 * (r * cols + c) + 1] + tmp.z * dir[3 * (r * cols + c) + 2] < 0) tmp.negate();
      nor.set([tmp.x, tmp.y, tmp.z], 3 * q);
    }
    for (let r = 0; r < NR - 1; r++) for (let c = 0; c < NT; c++) {
      const q00 = off + r * cols + c, q01 = q00 + 1, q10 = q00 + cols, q11 = q10 + 1;
      // skip quads that are fully inside the face opening
      if (Math.max(open[q00], open[q01], open[q10], open[q11]) < 1e-3) continue;
      // winding: outward-facing front faces (checked against the normal)
      a.set(pos[3 * q10] - pos[3 * q00], pos[3 * q10 + 1] - pos[3 * q00 + 1], pos[3 * q10 + 2] - pos[3 * q00 + 2]);
      b.set(pos[3 * q01] - pos[3 * q00], pos[3 * q01 + 1] - pos[3 * q00 + 1], pos[3 * q01 + 2] - pos[3 * q00 + 2]);
      tmp.crossVectors(a, b);
      const outward = tmp.x * nor[3 * q00] + tmp.y * nor[3 * q00 + 1] + tmp.z * nor[3 * q00 + 2] > 0;
      if (outward) idx.push(q00, q10, q01, q01, q10, q11);
      else idx.push(q00, q01, q10, q01, q11, q10);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aHair', new THREE.BufferAttribute(hair, 4));
  g.setAttribute('aOpen', new THREE.BufferAttribute(open, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
