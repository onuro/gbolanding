// Gauss-Newton ridge fit of identity weights to target metric z-scores:
//   min_w  sum_k W_k (z_k(w) - t_k)^2  +  lambda * |w - mu|^2      (symmetric modes only)
// mu is the prior centre (0 = the mean face, or a random draw for diversity); lambda keeps the face
// near that centre (averageness ~ attractiveness) and inside the N(0,1) shell.
import * as ict from './ict.mjs';
import { measure } from './metrics.mjs';

export const ANTISYM = [9, 20, 25, 28];

function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export function zOf(w, stats, keys) {
  const m = measure(ict.blend(w));
  return keys.map((k) => (m[k] - stats[k].mean) / (stats[k].sd || 1));
}

export function fitTargets({ stats, targets, mu = null, lambda = 0.3, iters = 7, lim = 2.4, asym = null }) {
  const keys = Object.keys(targets);
  const t = keys.map((k) => targets[k][0]);
  const W = keys.map((k) => targets[k][1]);
  const modes = [...Array(ict.NUM_IDS).keys()].filter((i) => !ANTISYM.includes(i));
  const m0 = mu ? mu.slice() : new Array(ict.NUM_IDS).fill(0);
  let w = m0.slice();
  if (asym) for (const i of ANTISYM) w[i] = asym[i] || 0;
  else for (const i of ANTISYM) w[i] = 0;
  let best = null;
  const objective = (z, ww) => {
    let e = 0;
    for (let r = 0; r < keys.length; r++) e += W[r] * (z[r] - t[r]) ** 2;
    for (const mi of modes) e += lambda * (ww[mi] - m0[mi]) ** 2;
    return e;
  };
  for (let it = 0; it < iters; it++) {
    const z0 = zOf(w, stats, keys);
    // numeric Jacobian (central, step 0.5 sigma)
    const J = keys.map(() => new Array(modes.length).fill(0));
    modes.forEach((mi, c) => {
      const wp = w.slice(), wm = w.slice();
      wp[mi] += 0.5;
      wm[mi] -= 0.5;
      const zp = zOf(wp, stats, keys), zm = zOf(wm, stats, keys);
      for (let r = 0; r < keys.length; r++) J[r][c] = zp[r] - zm[r];
    });
    const n = modes.length;
    const A = Array.from({ length: n }, () => new Array(n).fill(0));
    const b = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let r = 0; r < keys.length; r++) s += W[r] * J[r][i] * J[r][j];
        A[i][j] = s + (i === j ? lambda : 0);
      }
      let s = 0;
      for (let r = 0; r < keys.length; r++) {
        const jw = modes.reduce((acc, mj, c) => acc + J[r][c] * w[mj], 0);
        s += W[r] * J[r][i] * (t[r] - z0[r] + jw);
      }
      b[i] = s + lambda * m0[modes[i]];
    }
    const x = solve(A, b);
    // damped step (max 1 sigma per mode per iteration), keep the best iterate
    const step = modes.map((mi, c) => x[c] - w[mi]);
    const sm = Math.max(...step.map(Math.abs));
    const f = sm > 1 ? 1 / sm : 1;
    const obj0 = objective(z0, w);
    if (!best || obj0 < best.obj) best = { obj: obj0, w: w.slice() };
    modes.forEach((mi, c) => (w[mi] = Math.max(-lim, Math.min(lim, w[mi] + f * step[c]))));
  }
  {
    const zl = zOf(w, stats, keys);
    const o = objective(zl, w);
    if (best && best.obj < o) w = best.w;
  }
  const z = zOf(w, stats, keys);
  const resid = Object.fromEntries(keys.map((k, i) => [k, +(z[i] - t[i]).toFixed(2)]));
  return { w, resid };
}
