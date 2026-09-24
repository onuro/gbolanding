#!/usr/bin/env node
// Intersection checks for an identity under the ICT expressions (which were authored on the mean face).
// Tissue test: skin surface = face + head/neck + mouth socket + eye sockets, winding-consistent, so the
// first ray hit tells whether a point sits in air (hit is "entering" tissue) or inside tissue ("exiting").
//  - teeth: teeth vertices that end up inside lip/cheek tissue (majority vote over 14 ray directions)
//  - eyes: eyeball vertices inside lid tissue, and how much of the visible eye stays uncovered at blink 1
//  - lips: inner-lip landmark pairs crossing (upper lip passing below the lower lip)
// Usage: node check-expr.mjs --out <dir> --weights a.json[,b.json] [--names a,b] [--render 1]
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import * as ict from './ict.mjs';
import { portrait } from './portrait.mjs';
import { writePNG } from './png.mjs';
import { arg } from './util.mjs';

const SKIN_GROUPS = ['face', 'headNeck', 'mouthSocket', 'eyeSocketL', 'eyeSocketR'];
function skinTris() {
  const F = ict.faces();
  const tris = [];
  const inSkin = (v) => SKIN_GROUPS.some((g) => v >= ict.GROUPS[g][0] && v < ict.GROUPS[g][1]);
  for (const poly of F.polys) {
    if (!inSkin(poly[0])) continue;
    for (let k = 1; k + 1 < poly.length; k++) tris.push(poly[0], poly[k], poly[k + 1]);
  }
  return new Uint32Array(tris);
}
const SKIN = skinTris();

function buildBVH(P) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
  g.setIndex(new THREE.BufferAttribute(SKIN, 1));
  return { g, bvh: new MeshBVH(g) };
}

// orientation sign so that +1 means the triangle winding normal points from tissue to air
function orientSign(bvh, P) {
  const tip = ict.LM68[30];
  const ray = new THREE.Ray(new THREE.Vector3(P[tip * 3], P[tip * 3 + 1], P[tip * 3 + 2] + 5), new THREE.Vector3(0, 0, -1));
  const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
  return hit && hit.face.normal.z > 0 ? 1 : -1;
}

const DIRS = [];
for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1], [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]])
  DIRS.push(new THREE.Vector3(...d).normalize());

/** returns 'in' (inside tissue), 'air', with vote counts */
function classify(bvh, sign, p) {
  let inside = 0, air = 0;
  const ray = new THREE.Ray();
  for (const d of DIRS) {
    ray.origin.copy(p);
    ray.direction.copy(d);
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
    if (!hit) { air++; continue; }
    const s = sign * hit.face.normal.dot(d);
    if (s > 0) inside++; else air++;
  }
  return { inside, air, isIn: inside > air + 2 };
}

// tooth classes from the ICT README tooth table
function toothName(i) {
  const up = i < 19247;
  const T = [
    [17895, 17991, 'U canine'], [17991, 18067, 'U lateral incisor'], [18067, 18219, 'U central incisor'],
    [18219, 18295, 'U lateral incisor'], [18295, 18391, 'U canine'],
    [20079, 20169, 'L canine'], [20169, 20263, 'L lateral incisor'], [20263, 20435, 'L central incisor'],
    [20435, 20529, 'L lateral incisor'], [20529, 20619, 'L canine'],
  ];
  for (const [a, b, n] of T) if (i >= a && i < b) return n;
  return up ? 'U premolar/molar' : 'L premolar/molar';
}

function depthTo(bvh, p) {
  const t = bvh.closestPointToPoint(p);
  return t ? t.distance : 0;
}

export function checkIdentity(w, { exprSets } = {}) {
  const sets = exprSets || {
    rest: {},
    jaw05: { jawOpen: 0.5 },
    jaw055: { jawOpen: 0.55 },
    jaw05_speech: { jawOpen: 0.5, mouthLowerDown_L: 0.3, mouthLowerDown_R: 0.3, mouthUpperUp_L: 0.1, mouthUpperUp_R: 0.1 },
    jaw05_close05: { jawOpen: 0.5, mouthClose: 0.5 },
    close03: { mouthClose: 0.3 },
    jaw03_close03: { jawOpen: 0.3, mouthClose: 0.3 },
    blink05: { eyeBlink_L: 0.5, eyeBlink_R: 0.5 },
    blink1: { eyeBlink_L: 1, eyeBlink_R: 1 },
    jaw05_blink1: { jawOpen: 0.5, eyeBlink_L: 1, eyeBlink_R: 1 },
  };
  const res = {};
  // visible-eye reference (rest pose): eyeball vertices whose +z ray escapes the skin
  const P0 = ict.blend(w);
  const b0 = buildBVH(P0);
  const vis0 = [];
  const pv = new THREE.Vector3();
  for (const g of ['eyeballL', 'eyeballR']) {
    const [a, b] = ict.GROUPS[g];
    for (let i = a; i < b; i++) {
      pv.set(P0[i * 3], P0[i * 3 + 1], P0[i * 3 + 2]);
      const hit = b0.bvh.raycastFirst(new THREE.Ray(pv.clone(), new THREE.Vector3(0, 0, 1)), THREE.DoubleSide);
      if (!hit) vis0.push(i);
    }
  }
  for (const [name, expr] of Object.entries(sets)) {
    const P = ict.blend(w, expr);
    const { bvh } = buildBVH(P);
    const sign = orientSign(bvh, P);
    const p = new THREE.Vector3();
    // teeth
    let tIn = 0, tMax = 0, tOut = 0;
    const tWorst = [];
    const back = new THREE.Vector3(0, 0, -1);
    for (let i = ict.GROUPS.teeth[0]; i < ict.GROUPS.teeth[1]; i += 2) {
      p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      // poke-out: tooth sits in front of the outer lip/face skin (a -z ray first meets outward-facing face skin)
      const hb = bvh.raycastFirst(new THREE.Ray(p.clone(), back), THREE.DoubleSide);
      if (hb && sign * hb.face.normal.z > 0 && SKIN[hb.faceIndex * 3] < ict.GROUPS.headNeck[1]) tOut++;
      const c = classify(bvh, sign, p);
      if (c.isIn) {
        tIn++;
        const d = depthTo(bvh, p);
        if (d > tMax) tMax = d;
        if (d > 0.05) tWorst.push(toothName(i));
      }
    }
    // eyes inside lid tissue
    let eIn = 0, eMax = 0;
    for (const g of ['eyeballL', 'eyeballR']) {
      const [a, b] = ict.GROUPS[g];
      for (let i = a; i < b; i += 2) {
        p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
        if (P[i * 3 + 2] < P0[ict.LM68[39] * 3 + 2] - 1.5) continue; // back of the eyeball sits in the socket
        const c = classify(bvh, sign, p);
        if (c.isIn) {
          eIn++;
          eMax = Math.max(eMax, depthTo(bvh, p));
        }
      }
    }
    // how much of the rest-visible eye stays uncovered (+z ray escapes)
    let unc = 0;
    for (const i of vis0) {
      p.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
      if (!bvh.raycastFirst(new THREE.Ray(p.clone(), new THREE.Vector3(0, 0, 1)), THREE.DoubleSide)) unc++;
    }
    // lip seam ordering at the inner-lip landmark pairs (upper - lower, cm; negative = crossed)
    const L = (j) => [P[ict.LM68[j] * 3], P[ict.LM68[j] * 3 + 1], P[ict.LM68[j] * 3 + 2]];
    const seam = [[61, 67], [62, 66], [63, 65]].map(([u, l]) => +(L(u)[1] - L(l)[1]).toFixed(3));
    res[name] = {
      teethInside: tIn, teethMaxDepthMm: +(tMax * 10).toFixed(2), teethPokeOut: tOut,
      teethDeep: Object.entries(tWorst.reduce((m, n) => ((m[n] = (m[n] || 0) + 1), m), {})).map(([n, c]) => `${n} x${c}`).join(', '),
      eyeInside: eIn, eyeMaxDepthMm: +(eMax * 10).toFixed(2),
      eyeUncoveredFrac: +(unc / Math.max(1, vis0.length)).toFixed(3),
      lipSeamCm: seam, lipsCrossed: seam.some((s) => s < -0.03),
    };
  }
  return res;
}

/** Issues relative to the mean face (the ICT expressions were sculpted on it, so its own overlaps are
 *  by design: eyeball/lid overlap hidden by the occlusion meshes, tooth roots inside the gums). */
export function verdict(r, base) {
  const issues = [];
  for (const [k, v] of Object.entries(r)) {
    const b = base ? base[k] : { teethInside: 0, teethMaxDepthMm: 0, teethPokeOut: 0, eyeInside: 0, eyeUncoveredFrac: 0 };
    const dT = v.teethInside - b.teethInside;
    if (v.teethPokeOut > b.teethPokeOut + 2) issues.push(`${k}: ${v.teethPokeOut} teeth verts poke out in front of the lips (mean face ${b.teethPokeOut})`);
    if (dT > 12 && v.teethMaxDepthMm > b.teethMaxDepthMm + 0.4) issues.push(`${k}: +${dT} teeth verts buried in cheek/lip tissue vs mean face (max ${v.teethMaxDepthMm} mm vs ${b.teethMaxDepthMm}; hidden, ${v.teethPokeOut} poke out; deepest: ${v.teethDeep})`);
    if (/blink1/.test(k) && v.eyeUncoveredFrac > b.eyeUncoveredFrac + 0.02) issues.push(`${k}: ${(v.eyeUncoveredFrac * 100).toFixed(1)}% of the open-eye area stays visible through the closed lids (mean face ${(b.eyeUncoveredFrac * 100).toFixed(1)}%)`);
    if (v.lipsCrossed && !(base && base[k].lipsCrossed)) issues.push(`${k}: lips cross (seam ${v.lipSeamCm.join(', ')} cm)`);
    if (v.lipsCrossed && base && base[k].lipsCrossed && Math.min(...v.lipSeamCm) < Math.min(...base[k].lipSeamCm) - 0.1) issues.push(`${k}: lips cross more than on the mean face (${Math.min(...v.lipSeamCm)} vs ${Math.min(...base[k].lipSeamCm)} cm)`);
  }
  return issues;
}

if (path.resolve(process.argv[1] || '') === new URL(import.meta.url).pathname.replace(/%20/g, ' ')) {
  const out = arg('--out', '.');
  const files = arg('--weights', '').split(',').filter(Boolean);
  const names = arg('--names', files.map((f) => path.basename(f, '.json')).join(',')).split(',');
  const doRender = arg('--render', '1') === '1';
  fs.mkdirSync(out, { recursive: true });
  const base = checkIdentity(new Array(ict.NUM_IDS).fill(0));
  const report = { _meanFace: { checks: base, note: 'baseline: ICT expressions were authored on this face' } };
  files.forEach((f, k) => {
    const w = ict.readWeights(f);
    const r = checkIdentity(w);
    report[names[k]] = { checks: r, issues: verdict(r, base) };
    console.log(names[k], report[names[k]].issues.length ? report[names[k]].issues : 'OK');
    if (doRender) {
      for (const [tag, expr, view] of [['jaw05', { jawOpen: 0.5, mouthLowerDown_L: 0.3, mouthLowerDown_R: 0.3, mouthUpperUp_L: 0.1, mouthUpperUp_R: 0.1 }, 'front'], ['jaw05q', { jawOpen: 0.5 }, 'q34'], ['close03', { mouthClose: 0.3 }, 'front'], ['blink1', { eyeBlink_L: 1, eyeBlink_R: 1 }, 'front']]) {
        const pr = portrait(ict.blend(w, expr), view, { width: 360, height: 440, teeth: true, ao: 24, wFrac: 0.62 });
        writePNG(path.join(out, `${names[k]}_${tag}.png`), pr.W, pr.H, pr.rgb);
      }
    }
  });
  fs.writeFileSync(path.join(out, 'expr-check.json'), JSON.stringify(report, null, 1));
}
