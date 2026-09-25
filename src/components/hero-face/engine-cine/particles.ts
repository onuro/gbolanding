import * as THREE from 'three';
import type { LookParams } from './look';
import { mulberry32At } from './rng';

// Builds the single Points geometry: lattice + free scatter + stars + 4 catchlights.
// Lattice indices are relative to the anchor (the projected head origin), so the grid rides the head.

export const KIND = { lattice: 0, scatter: 1, star: 2, catch: 3, dust: 4 } as const;

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

export interface LatticeLayout {
  pitch: number;
  range: LatticeRange;
  frame: FrameW;
}

/** Lattice pitch (device px), cell range covering the viewport (+ 2 cells) and the visible frame in W. */
export function latticeLayout(look: LookParams, devW: number, devH: number, Wdev: number, ox: number, oy: number): LatticeLayout {
  let pitch = Math.max(look.minPitchDevPx, Wdev / look.gridDiv);
  if (look.snapPitch) pitch = Math.max(look.minPitchDevPx, Math.round(pitch));
  const ax = ox + look.gridPhase[0] * pitch, ay = oy + look.gridPhase[1] * pitch;
  const range = {
    i0: Math.floor(-ax / pitch) - 2,
    i1: Math.ceil((devW - ax) / pitch) + 2,
    j0: Math.floor(-ay / pitch) - 2,
    j1: Math.ceil((devH - ay) / pitch) + 2,
  };
  const frame: FrameW = { u0: -ox / Wdev, u1: (devW - ox) / Wdev, v0: -oy / Wdev, v1: (devH - oy) / Wdev };
  return { pitch, range, frame };
}

// Random streams are keyed to this reference layout (ref 2 at its native 1832 x 1580 device px, the framing the
// owner approved the look in). mulberry32 is a counter generator, so each particle's numbers are drawn by
// index: in the ref-2 framing every particle gets exactly the numbers it always had (the approved stills stay
// byte-identical), and on every other canvas a lattice cell (i, j) (relative to the head anchor) and every
// free-scatter particle get the same numbers as in ref 2. Resizes and other devices therefore no longer re-roll
// the face and the scatter (before, 8 CSS px of extra width re-rolled every particle).
export const REF_LAYOUT = { devW: 1832, devH: 1580, faceWidthDev: 818, origin: [990.5, 703.5] } as const;
// lattice cells outside the reference range draw from a far, disjoint part of the stream
const FAR_STREAM = 1 << 30;
// wide-card side strips of free scatter (see buildParticleGeometry) draw from a third, disjoint part
const STRIP_STREAM = 0xc0000000;

function starCandidates(look: LookParams, frame: FrameW): number {
  return Math.round(look.starsPerW2 * (frame.u1 - frame.u0) * (frame.v1 - frame.v0));
}

/**
 * scatterHalfX (W, head space): on a wide card (look.fieldStretch) the free-scatter box is widened to +-scatterHalfX
 * by two side strips at the same particle density per area, appended after the ref-2 box's particles (which keep
 * their numbers), so the stretched far field reaches the canvas side edges. 0 / <= the box: no strips.
 */
export function buildParticleGeometry(look: LookParams, lat: LatticeRange, frame: FrameW, seed: number, scatterHalfX = 0): { geometry: THREE.BufferGeometry; scatterNorm: number; counts: Record<string, number> } {
  const s0 = (seed * 7919 + 17) >>> 0;
  let rnd = mulberry32At(s0, 0);
  const nLat = (lat.i1 - lat.i0 + 1) * (lat.j1 - lat.j0 + 1);
  const nScatter = Math.max(0, Math.round(look.scatterCount));
  const D = SCATTER_DOMAIN;
  const stripW = Math.max(0, scatterHalfX - D.x[1]);
  const nStrip = nScatter > 0 && stripW > 0 ? Math.round((nScatter * stripW) / (D.x[1] - D.x[0])) : 0;
  // reference stream offsets (see REF_LAYOUT): star candidates (3 draws each), lattice (8 per cell), scatter
  // (3 + 8 per particle), then the star attributes and catchlights
  const R = REF_LAYOUT;
  const ref = latticeLayout(look, R.devW, R.devH, R.faceWidthDev, R.origin[0], R.origin[1]);
  const refCols = ref.range.i1 - ref.range.i0 + 1;
  const refLat = refCols * (ref.range.j1 - ref.range.j0 + 1);
  const kLat = 3 * starCandidates(look, ref.frame);
  const kScatter = kLat + 8 * refLat;
  const kStars = kScatter + 11 * nScatter;
  // stars: uniform over the frame, thinned inside the face oval (stars.py uses d >= 2.0 IPD-oval)
  const stars: [number, number][] = [];
  const candidates = starCandidates(look, frame);
  for (let k = 0; k < candidates; k++) {
    const u = frame.u0 + rnd() * (frame.u1 - frame.u0);
    const v = frame.v0 + rnd() * (frame.v1 - frame.v0);
    const d = Math.hypot(u / 0.5, v / 0.5 / 1.3);
    const pAcc = Math.min(1, Math.max(0, (d - 1.7) / 0.6));
    if (rnd() < pAcc) stars.push([u, v]);
  }
  // a5: off-lattice dust specks, uniform over the lattice range (cell coords with a fractional offset)
  const nDust = Math.round(Math.max(0, look.dust?.[0] ?? 0) * nLat);
  const n = nLat + nScatter + 2 * nStrip + stars.length + 4 + nDust;
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
      const inRef = i >= ref.range.i0 && i <= ref.range.i1 && j >= ref.range.j0 && j <= ref.range.j1;
      const cell = inRef
        ? kLat + 8 * ((j - ref.range.j0) * refCols + (i - ref.range.i0))
        : FAR_STREAM + 8 * (((j + 4096) & 8191) * 8192 + ((i + 4096) & 8191));
      rnd = mulberry32At(s0, cell);
      pos[k * 3] = i; pos[k * 3 + 1] = j; pos[k * 3 + 2] = 0;
      kind[k] = KIND.lattice; fillRand(); k++;
    }
  }
  rnd = mulberry32At(s0, kScatter);
  for (let s = 0; s < nScatter; s++) {
    pos[k * 3] = D.x[0] + rnd() * (D.x[1] - D.x[0]);
    pos[k * 3 + 1] = D.y[0] + rnd() * (D.y[1] - D.y[0]);
    pos[k * 3 + 2] = D.z[0] + Math.pow(rnd(), 0.8) * (D.z[1] - D.z[0]);
    kind[k] = KIND.scatter; fillRand(); k++;
  }
  // wide cards: side strips [-halfX, x0) and (x1, halfX], same density and depth distribution as the box
  rnd = mulberry32At(s0, STRIP_STREAM);
  for (let s = 0; s < 2 * nStrip; s++) {
    const e = rnd() * stripW;
    pos[k * 3] = s < nStrip ? D.x[0] - e : D.x[1] + e;
    pos[k * 3 + 1] = D.y[0] + rnd() * (D.y[1] - D.y[0]);
    pos[k * 3 + 2] = D.z[0] + Math.pow(rnd(), 0.8) * (D.z[1] - D.z[0]);
    kind[k] = KIND.scatter; fillRand(); k++;
  }
  rnd = mulberry32At(s0, kStars);
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
  rnd = mulberry32At(s0, (1 << 29) + 17);
  for (let d = 0; d < nDust; d++) {
    pos[k * 3] = lat.i0 + rnd() * (lat.i1 - lat.i0 + 1) - 0.5;
    pos[k * 3 + 1] = lat.j0 + rnd() * (lat.j1 - lat.j0 + 1) - 0.5;
    pos[k * 3 + 2] = 0;
    kind[k] = KIND.dust; fillRand(); k++;
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
  return { geometry: g, scatterNorm, counts: { lattice: nLat, scatter: nScatter + 2 * nStrip, stars: stars.length, catch: 4, dust: nDust } };
}
