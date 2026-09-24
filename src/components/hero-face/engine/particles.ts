import * as THREE from 'three';
import type { LookParams } from './look';
import { mulberry32 } from './rng';

// Builds the single Points geometry: lattice + free scatter + stars + 4 catchlights.
// Lattice indices are relative to the anchor (the projected head origin), so the grid rides the head.

export const KIND = { lattice: 0, scatter: 1, star: 2, catch: 3 } as const;

// free-scatter domain in head space (W): x, y (up), z
export const SCATTER_DOMAIN = { x: [-1.35, 1.35], y: [-1.25, 1.0], z: [-0.55, 0.22] } as const;

export interface LatticeRange {
  i0: number;
  i1: number;
  j0: number;
  j1: number;
}

export interface FrameW {
  // visible frame in head-relative W (v down)
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export function buildParticleGeometry(look: LookParams, lat: LatticeRange, frame: FrameW, seed: number): { geometry: THREE.BufferGeometry; scatterNorm: number; counts: Record<string, number> } {
  const rnd = mulberry32(seed * 7919 + 17);
  const nLat = (lat.i1 - lat.i0 + 1) * (lat.j1 - lat.j0 + 1);
  const nScatter = Math.max(0, Math.round(look.scatterCount));
  // stars: uniform over the frame, thinned inside the face oval (stars.py uses d >= 2.0 IPD-oval)
  const stars: [number, number][] = [];
  const frameArea = (frame.u1 - frame.u0) * (frame.v1 - frame.v0);
  const candidates = Math.round(look.starsPerW2 * frameArea);
  for (let k = 0; k < candidates; k++) {
    const u = frame.u0 + rnd() * (frame.u1 - frame.u0);
    const v = frame.v0 + rnd() * (frame.v1 - frame.v0);
    const d = Math.hypot(u / 0.5, v / 0.5 / 1.3);
    const pAcc = Math.min(1, Math.max(0, (d - 1.7) / 0.6));
    if (rnd() < pAcc) stars.push([u, v]);
  }
  const n = nLat + nScatter + stars.length + 4;
  const pos = new Float32Array(n * 3);
  const r1 = new Float32Array(n * 4);
  const r2 = new Float32Array(n * 4);
  const kind = new Float32Array(n);
  let k = 0;
  const fillRand = () => {
    for (let c = 0; c < 4; c++) { r1[k * 4 + c] = rnd(); r2[k * 4 + c] = rnd(); }
  };
  for (let j = lat.j0; j <= lat.j1; j++) {
    for (let i = lat.i0; i <= lat.i1; i++) {
      pos[k * 3] = i; pos[k * 3 + 1] = j; pos[k * 3 + 2] = 0;
      kind[k] = KIND.lattice; fillRand(); k++;
    }
  }
  const D = SCATTER_DOMAIN;
  for (let s = 0; s < nScatter; s++) {
    pos[k * 3] = D.x[0] + rnd() * (D.x[1] - D.x[0]);
    pos[k * 3 + 1] = D.y[0] + rnd() * (D.y[1] - D.y[0]);
    pos[k * 3 + 2] = D.z[0] + Math.pow(rnd(), 0.8) * (D.z[1] - D.z[0]);
    kind[k] = KIND.scatter; fillRand(); k++;
  }
  for (const [u, v] of stars) {
    pos[k * 3] = u; pos[k * 3 + 1] = v; pos[k * 3 + 2] = 0.5 + rnd();
    kind[k] = KIND.star; fillRand(); k++;
  }
  for (let e = 0; e < 2; e++) {
    for (let sec = 0; sec < 2; sec++) {
      pos[k * 3] = e; pos[k * 3 + 1] = sec; pos[k * 3 + 2] = 0;
      kind[k] = KIND.catch; fillRand(); k++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.BufferAttribute(r1, 4));
  g.setAttribute('aRand2', new THREE.BufferAttribute(r2, 4));
  g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  // expected survivors per cell -> acceptance per particle
  const domainArea = (D.x[1] - D.x[0]) * (D.y[1] - D.y[0]);
  const scatterNorm = nScatter > 0 ? (domainArea * look.gridDiv * look.gridDiv) / nScatter : 0;
  return { geometry: g, scatterNorm, counts: { lattice: nLat, scatter: nScatter, stars: stars.length, catch: 4 } };
}
