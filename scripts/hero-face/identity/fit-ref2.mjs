#!/usr/bin/env node
// Fit identity #5 (r6fem2s4) to ref 2's hand-marked landmarks at ref 2's framing.
//
//   min  sum_l |proj_l(w, e, pitch) - t_l|^2 / sigma_l^2                    (landmarks, px)
//      + sum_i ((w_i - w5_i) / sw)^2                                          (stay recognisably #5)
//      + sum_g ((e_g - e0_g) / se_g)^2                                        (small, natural rest expression)
//      + lf * sum_k W_k (z_k - t_k)^2                                         (female-target metrics, fem2s)
//   s.t. |w_i| <= 2.5, antisymmetric modes 9/20/25/28 = 0, e_g in [lo, hi]
//
// Projection = lab normalisation (origin = pupil midpoint, W = 2 x IPD) + the engine camera (vertical
// FOV 20 deg, W spans Wpx at the origin depth), with ref 2's measured pupils as origin / IPD.
// Targets are mirrored/averaged left-right first (our face is symmetric and rendered at pose 0).
// Levenberg-Marquardt with a numeric Jacobian, box constraints by projection.
//
// usage: node fit-ref2.mjs --lm ref2-landmarks.json --init f5-orig.json --out <dir> [--tag a]
//        [--sw 0.8] [--lf 0.4] [--pitch 0|free] [--iters 40] [--no-expr]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { subsetModel, pupilSets, camera, project } from './fitcore.mjs';
import { measure, targetFit, femScore } from './metrics.mjs';
import { PRESETS } from './presets.mjs';
import { arg } from './util.mjs';

const ANTISYM = [9, 20, 25, 28];
const MIRROR68 = (() => {
  const m = new Array(68).fill(-1);
  const pairs = [[0, 16], [1, 15], [2, 14], [3, 13], [4, 12], [5, 11], [6, 10], [7, 9], [17, 26], [18, 25], [19, 24], [20, 23], [21, 22],
    [31, 35], [32, 34], [36, 45], [37, 44], [38, 43], [39, 42], [40, 47], [41, 46], [48, 54], [49, 53], [50, 52], [59, 55], [58, 56],
    [60, 64], [61, 63], [67, 65]];
  for (const [a, b] of pairs) { m[a] = b; m[b] = a; }
  for (const c of [8, 27, 28, 29, 30, 33, 51, 57, 62, 66]) m[c] = c;
  return m;
})();

// sexually dimorphic cues that must not move the masculine way vs #5: [metric, +1 bigger = feminine / -1, tolerance z]
export const KEEP_CUES = [
  ['lipH', 1, 0.15], ['lowerLip', 1, 0.2], ['upperLip', 1, 0.2], ['malarProj', 1, 0.35], ['eyeW', 1, 0.3], ['eyeH', 1, 0.3],
  ['canthalTilt', 1, 0.3], ['browProt', -1, 0.25], ['eyeDeep', -1, 0.35], ['foreheadSlope', -1, 0.35], ['jawRatio', -1, 0.15],
  ['lowJawRatio', -1, 0.15], ['chinRatio', -1, 0.25], ['noseW', -1, 0.2], ['noseHump', -1, 0.3], ['neckW', -1, 0.2],
  ['adam', -1, 0.2], ['chinH', -1, 0.35], ['lipProj', 1, 0.3],
];

// symmetric rest-expression groups: [name, members, lo, hi, prior mean, prior sd]
export const EXPR_GROUPS = [
  ['mouthSmile', ['mouthSmile_L', 'mouthSmile_R'], 0.03, 0.14, 0.07, 0.05],
  ['mouthRollUpper', ['mouthRollUpper'], 0, 0.35, 0, 0.18],
  ['mouthRollLower', ['mouthRollLower'], 0, 0.35, 0, 0.18],
  ['mouthUpperUp', ['mouthUpperUp_L', 'mouthUpperUp_R'], 0, 0.35, 0, 0.15],
  ['mouthLowerDown', ['mouthLowerDown_L', 'mouthLowerDown_R'], 0, 0.25, 0, 0.12],
  ['mouthPress', ['mouthPress_L', 'mouthPress_R'], 0, 0.3, 0, 0.12],
  ['mouthStretch', ['mouthStretch_L', 'mouthStretch_R'], 0, 0.25, 0, 0.12],
  ['mouthFunnel', ['mouthFunnel'], 0, 0.25, 0, 0.1],
  ['mouthPucker', ['mouthPucker'], 0, 0.25, 0, 0.1],
  ['eyeWide', ['eyeWide_L', 'eyeWide_R'], 0, 0.35, 0, 0.15],
  ['eyeSquint', ['eyeSquint_L', 'eyeSquint_R'], 0, 0.35, 0, 0.15],
  ['eyeBlink', ['eyeBlink_L', 'eyeBlink_R'], 0, 0.25, 0, 0.1],
  ['browInnerUp', ['browInnerUp_L', 'browInnerUp_R'], 0, 0.35, 0, 0.15],
  ['browDown', ['browDown_L', 'browDown_R'], 0, 0.3, 0, 0.12],
  ['eyeLookUp', ['eyeLookUp_L', 'eyeLookUp_R'], 0, 0.25, 0, 0.1],
  ['eyeLookDown', ['eyeLookDown_L', 'eyeLookDown_R'], 0, 0.25, 0, 0.1],
];

/** nearest mirror (x -> -x) vertex on the neutral mesh */
function mirrorVertex(v) {
  const P = ict.neutral();
  const x = -P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
  let best = -1, bd = 1e9;
  for (let i = 0; i < ict.GROUPS.eyeSocketR[1]; i++) {
    const d = (P[i * 3] - x) ** 2 + (P[i * 3 + 1] - y) ** 2 + (P[i * 3 + 2] - z) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/** load + symmetrise ref landmarks -> [{vid, t:[du,dv] (px from the ref pupil midpoint), sigma, name}] */
export function loadTargets(file) {
  const J = JSON.parse(fs.readFileSync(file, 'utf8'));
  const [R, L] = [J.pupils.R, J.pupils.L];
  const ox = (R[0] + L[0]) / 2, oy = (R[1] + L[1]) / 2;
  const Wpx = 2 * Math.hypot(L[0] - R[0], L[1] - R[1]);
  const raw = [];
  for (const p of J.points) {
    if (p.lm !== undefined) raw.push({ key: 'lm' + p.lm, vid: ict.LM68[p.lm], mkey: 'lm' + MIRROR68[p.lm], name: p.name, t: [p.px[0] - ox, p.px[1] - oy], sigma: p.sigma });
    else {
      const mv = mirrorVertex(p.v);
      raw.push({ key: 'v' + p.v, vid: p.v, mkey: 'v' + mv, name: p.name, t: [p.px[0] - ox, p.px[1] - oy], sigma: p.sigma });
      raw.push({ key: 'v' + mv, vid: mv, mkey: 'v' + p.v, name: p.name + ' (mirror)', t: [-(p.px[0] - ox), p.px[1] - oy], sigma: p.sigma, synth: true });
    }
  }
  const byKey = new Map(raw.map((r) => [r.key, r]));
  const out = raw.map((r) => {
    const m = byKey.get(r.mkey);
    if (!m || m === r) return { ...r, tRaw: r.t, t: r.key === r.mkey ? [0, r.t[1]] : r.t };
    return { ...r, tRaw: r.t, t: [(r.t[0] - m.t[0]) / 2, (r.t[1] + m.t[1]) / 2], sigma: (r.sigma + m.sigma) / 2 };
  });
  return { targets: out, origin: [ox, oy], Wpx, size: J.size, J };
}

// ---------------------------------------------------------------- model wrapper
export function makeModel(targets, w0, rest0 = {}) {
  const full0 = ict.blend(w0, rest0);
  const ps = pupilSets(full0);
  const vids = [...new Set([...targets.map((t) => t.vid), ...ps.flat(), ...ict.LM68])];
  const M = subsetModel(vids);
  const pup = ps.map((s) => s.map((v) => M.idx.get(v)));
  return { M, pup, pupilVids: ps };
}

export function exprFromGroups(eg) {
  const e = {};
  EXPR_GROUPS.forEach(([, members], g) => { for (const m of members) if (eg[g]) e[m] = eg[g]; });
  return e;
}

export function projectAll(model, cam, w, e, pitch = 0) {
  const X = model.M.eval(w, e);
  return project(X, model.pup, cam, pitch ? { pitch } : null);
}

function solveSym(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

/** landmark error summary (px at ref 2 scale, and W units) */
export function lmError(model, cam, targets, w, e, pitch = 0, raw = false) {
  const pr = projectAll(model, cam, w, e, pitch);
  const rows = targets.map((t) => {
    const k = model.M.idx.get(t.vid);
    const tt = raw ? t.tRaw : t.t;
    const du = pr.uv[k * 2] - tt[0], dv = pr.uv[k * 2 + 1] - tt[1];
    return { name: t.name, key: t.key, du, dv, d: Math.hypot(du, dv), sigma: t.sigma, synth: t.synth };
  });
  const real = rows.filter((r) => !r.synth);
  const rms = Math.sqrt(real.reduce((s, r) => s + r.d * r.d, 0) / real.length);
  const wrms = Math.sqrt(real.reduce((s, r) => s + (r.d / r.sigma) ** 2, 0) / real.length);
  const grp = (re) => {
    const g = real.filter((r) => re.test(r.name));
    return g.length ? Math.sqrt(g.reduce((s, r) => s + r.d * r.d, 0) / g.length) : 0;
  };
  return {
    rmsPx: rms, wrms, rmsW: rms / cam.Wpx,
    groups: { eyes: grp(/eye|lid/), brows: grp(/brow/), nose: grp(/nose|nostril|alar|subnasale/), lips: grp(/lip|mouth|seam|Cupid|corner/), jaw: grp(/jaw|chin|menton/) },
    rows,
  };
}

// ---------------------------------------------------------------- main fit
export function fit({ targets, cam, w5, sw = 0.8, lf = 0.4, pitchMode = '0', iters = 40, useExpr = true, stats, fixed = {}, verbose = true, extra = null, femMode = 'keep' }) {
  const modes = [...Array(ict.NUM_IDS).keys()].filter((i) => !ANTISYM.includes(i));
  const G = useExpr ? EXPR_GROUPS.length : 0;
  const hasPitch = pitchMode === 'free';
  const nP = modes.length + G + (hasPitch ? 1 : 0);
  const model = makeModel(targets, w5, {});
  const fem = PRESETS.fem2s;
  const femKeys = Object.keys(fem);
  const m5 = measure(ict.blend(w5));
  const z5 = Object.fromEntries(Object.keys(m5).filter((k) => stats[k]).map((k) => [k, (m5[k] - stats[k].mean) / (stats[k].sd || 1)]));
  const unpack = (p) => {
    const w = w5.slice();
    modes.forEach((mi, c) => (w[mi] = p[c]));
    for (const i of ANTISYM) w[i] = 0;
    const eg = new Array(EXPR_GROUPS.length).fill(0);
    for (let g = 0; g < G; g++) eg[g] = p[modes.length + g];
    for (const [name, v] of Object.entries(fixed)) { const g = EXPR_GROUPS.findIndex((x) => x[0] === name); if (g >= 0) eg[g] = v; }
    const pitch = hasPitch ? p[nP - 1] : +pitchMode || 0;
    return { w, eg, e: exprFromGroups(eg), pitch };
  };
  const lo = [], hi = [];
  modes.forEach(() => { lo.push(-2.5); hi.push(2.5); });
  for (let g = 0; g < G; g++) { lo.push(EXPR_GROUPS[g][2]); hi.push(EXPR_GROUPS[g][3]); }
  if (hasPitch) { lo.push(-6); hi.push(18); }
  const clamp = (p) => p.map((x, i) => Math.max(lo[i], Math.min(hi[i], x)));
  const residuals = (p, withFem = true) => {
    const { w, eg, e, pitch } = unpack(p);
    const pr = projectAll(model, cam, w, e, pitch);
    const r = [];
    for (const t of targets) {
      const k = model.M.idx.get(t.vid);
      r.push((pr.uv[k * 2] - t.t[0]) / t.sigma, (pr.uv[k * 2 + 1] - t.t[1]) / t.sigma);
    }
    modes.forEach((mi, c) => r.push((w[mi] - w5[mi]) / sw));
    for (let g = 0; g < G; g++) r.push((eg[g] - EXPR_GROUPS[g][4]) / EXPR_GROUPS[g][5]);
    if (hasPitch) r.push(pitch / 8);
    if (withFem && lf > 0 && femMode === 'keep') {
      // "no less feminine than #5" on the dimorphic cues: hinge on the wrong-way change beyond tol (z units)
      const m = measure(ict.blend(w));
      for (const [k, dir, tol] of KEEP_CUES) {
        const z = (m[k] - stats[k].mean) / (stats[k].sd || 1);
        const bad = dir * (z5[k] - z) - tol;
        r.push(bad > 0 ? Math.sqrt(lf) * bad / 0.15 : 0);
      }
    } else if (withFem && lf > 0) {
      const m = measure(ict.blend(w));
      for (const k of femKeys) {
        const [tz, wt] = fem[k];
        const z = (m[k] - stats[k].mean) / (stats[k].sd || 1);
        // one-sided: only penalise being on the wrong (less feminine) side of the target by more than 0.5 sd
        const dz = z - tz;
        const pen = Math.abs(dz) > 0.5 ? dz - Math.sign(dz) * 0.5 : 0;
        r.push(Math.sqrt(lf * wt) * pen);
      }
    }
    if (extra) for (const x of extra(w, e, pitch, model, cam)) r.push(x);
    return r;
  };
  let p = [];
  modes.forEach((mi) => p.push(w5[mi]));
  for (let g = 0; g < G; g++) p.push(EXPR_GROUPS[g][4]);
  if (hasPitch) p.push(0);
  p = clamp(p);
  const cost = (r) => r.reduce((s, x) => s + x * x, 0);
  let r0 = residuals(p);
  let c0 = cost(r0);
  let mu = 1e-2;
  if (verbose) console.log('start cost', c0.toFixed(2));
  for (let it = 0; it < iters; it++) {
    // numeric Jacobian (forward differences)
    const J = [];
    for (let j = 0; j < nP; j++) {
      const h = j < modes.length ? 1e-3 : j < modes.length + G ? 1e-3 : 1e-2;
      const q = p.slice();
      q[j] += h;
      const rq = residuals(q);
      J.push(rq.map((x, i) => (x - r0[i]) / h));
    }
    const A = Array.from({ length: nP }, () => new Array(nP).fill(0));
    const g = new Array(nP).fill(0);
    for (let a = 0; a < nP; a++) {
      for (let b = a; b < nP; b++) { let s = 0; for (let i = 0; i < r0.length; i++) s += J[a][i] * J[b][i]; A[a][b] = A[b][a] = s; }
      let s = 0; for (let i = 0; i < r0.length; i++) s += J[a][i] * r0[i]; g[a] = -s;
    }
    let improved = false;
    for (let tries = 0; tries < 8; tries++) {
      const Ad = A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + mu) + 1e-9 : v)));
      const dp = solveSym(Ad, g);
      const pn = clamp(p.map((x, i) => x + dp[i]));
      const rn = residuals(pn);
      const cn = cost(rn);
      if (cn < c0) { p = pn; r0 = rn; const rel = (c0 - cn) / c0; c0 = cn; mu = Math.max(1e-6, mu / 3); improved = true; if (verbose) console.log(`it ${it} cost ${cn.toFixed(3)} mu ${mu.toExponential(1)}`); if (rel < 1e-5) it = iters; break; }
      mu *= 4;
    }
    if (!improved) break;
  }
  const out = unpack(p);
  return { ...out, cost: c0, model, modes };
}

/** keep the closed-lip seam open by >= minCm at the three inner-lip pairs (no crossed / interpenetrating lips) */
export function seamGuard(minCm = 0.03) {
  const pairs = [[61, 67], [62, 66], [63, 65]].map(([u, l]) => [ict.LM68[u], ict.LM68[l]]);
  return (w, e, pitch, model) => {
    const X = model.M.eval(w, e);
    return pairs.map(([u, l]) => {
      const gap = X[model.M.idx.get(u) * 3 + 1] - X[model.M.idx.get(l) * 3 + 1];
      return gap < minCm ? (minCm - gap) / 0.01 : 0;
    });
  };
}

// ---------------------------------------------------------------- CLI
if (path.resolve(process.argv[1] || '') === new URL(import.meta.url).pathname.replace(/%20/g, ' ')) {
  const out = arg('--out', '.');
  const tag = arg('--tag', 'fit');
  const { targets, Wpx, origin, size } = loadTargets(arg('--lm'));
  const cam = camera(size[1], Wpx);
  const w5 = ict.readWeights(arg('--init'));
  ict.loadAllIdentities();
  const { stats } = JSON.parse(fs.readFileSync(arg('--stats', '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/identity/data/stats.json'), 'utf8'));
  const t0 = Date.now();
  const res = fit({ targets, cam, w5, stats, sw: +arg('--sw', 0.8), lf: +arg('--lf', 0.4), pitchMode: arg('--pitch', '0'), iters: +arg('--iters', 40), useExpr: !process.argv.includes('--no-expr'), femMode: arg('--fem', 'keep'), extra: seamGuard(+arg('--seam', 0.03)) });
  const model = res.model;
  const before = lmError(model, cam, targets, w5, {}, 0);
  const after = lmError(model, cam, targets, res.w, res.e, res.pitch);
  const mB = measure(ict.blend(w5)), mA = measure(ict.blend(res.w));
  const summary = {
    tag, ms: Date.now() - t0, pitchDeg: res.pitch,
    weights: res.w.map((x) => +x.toFixed(4)),
    expr: Object.fromEntries(Object.entries(res.e).filter(([, v]) => v > 1e-4).map(([k, v]) => [k, +v.toFixed(4)])),
    lmBefore: { rmsPx: +before.rmsPx.toFixed(2), rmsW: +before.rmsW.toFixed(4), groups: Object.fromEntries(Object.entries(before.groups).map(([k, v]) => [k, +v.toFixed(2)])) },
    lmAfter: { rmsPx: +after.rmsPx.toFixed(2), rmsW: +after.rmsW.toFixed(4), groups: Object.fromEntries(Object.entries(after.groups).map(([k, v]) => [k, +v.toFixed(2)])) },
    fem: { before: +targetFit(mB, stats, PRESETS.fem2s).toFixed(3), after: +targetFit(mA, stats, PRESETS.fem2s).toFixed(3), scoreBefore: +femScore(mB, stats).score.toFixed(2), scoreAfter: +femScore(mA, stats).score.toFixed(2) },
    dw: res.w.map((x, i) => +(x - w5[i]).toFixed(3)),
    maxAbs: Math.max(...res.w.map(Math.abs)),
    rows: after.rows.filter((r) => !r.synth).map((r) => ({ name: r.name, du: +r.du.toFixed(1), dv: +r.dv.toFixed(1) })),
    rowsBefore: before.rows.filter((r) => !r.synth).map((r) => ({ name: r.name, du: +r.du.toFixed(1), dv: +r.dv.toFixed(1) })),
  };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `${tag}.json`), JSON.stringify(summary, null, 1));
  console.log(JSON.stringify({ tag, pitch: summary.pitchDeg, expr: summary.expr, lmBefore: summary.lmBefore, lmAfter: summary.lmAfter, fem: summary.fem, maxAbs: summary.maxAbs }, null, 1));
}
