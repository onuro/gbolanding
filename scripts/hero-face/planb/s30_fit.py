# Step 2b/3: align ICT neutral to the sculpt (similarity + TPS on feature correspondences), then a
# non-rigid ICP (closest points + membrane smoothness, CG solve) so the fitted ICT takes the sculpt's shape.
#   Blender -b --python s30_fit.py
# out: WORK/fit.npz (X_fit for all 26719 ICT vertices in sculpt units + similarity), OUT/inspect/fit_*.png
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from features import *

f = dict(np.load(WORK + '/features.npz'))
d = np.load(WORK + '/dec.npz')
SV, SF, Spart = d['V'], d['F'], d['part']
IV, polys, pg = load_ict()
IT = np.load(WORK + '/ict_tris.npy'); ITG = np.load(WORK + '/ict_trigroup.npy')
NS = 14062                                  # surface verts: face, head/neck, mouth socket, eye sockets
surfT = IT[np.isin(ITG, [0, 1, 2, 3, 4])]
IPD_S, IPD_I = float(f['IPD_S']), float(f['IPD_I'])

# ------------------------------------------------------------------ correspondences
src, dst, wts, tags = [], [], [], []
def add(p, q, w, tag):
    src.append(np.asarray(p, float)); dst.append(np.asarray(q, float)); wts.append(w); tags.append(tag)
ts = np.linspace(0.1, 0.9, 9)
for side in ('L', 'R'):
    aS, bS, upS, loS = split_outline(f['S_lidOutline_' + side])
    aI, bI, upI, loI = split_outline(f['I_lidOutline_' + side])
    add(aI, aS, 3, 'canthus'); add(bI, bS, 3, 'canthus')
    for p, q in zip(resample_by_x(upI, aI[0], bI[0], ts), resample_by_x(upS, aS[0], bS[0], ts)): add(p, q, 2, 'lidU')
    for p, q in zip(resample_by_x(loI, aI[0], bI[0], ts), resample_by_x(loS, aS[0], bS[0], ts)): add(p, q, 2, 'lidL')
for k in ('nasion', 'noseTip', 'subnasale', 'upperLipFront', 'lowerLipFront', 'sulcus', 'pogonion'):
    add(f['I_' + k], f['S_' + k], 2, k)
add(f['I_mouthCornerL'], f['S_mouthCornerL'], 3, 'corner'); add(f['I_mouthCornerR'], f['S_mouthCornerR'], 3, 'corner')
cr = f['S_crease']; xcS = cr[-1, 0]
silU, silL = f['I_silU'], f['I_silL']; xcI = abs(f['I_mouthCornerL'][0])
tl = np.linspace(-0.55, 0.55, 11)
creaseAt = lambda t: np.stack([np.interp(t * xcS, cr[:, 0], cr[:, k]) for k in range(3)], 1)
su = silU[np.argsort(silU[:, 0])]; sl = silL[np.argsort(silL[:, 0])]
edgeAt = lambda S, t: np.stack([np.interp(t * xcI, S[:, 0], S[:, k]) for k in range(3)], 1)
EPS = 0.0015
for p, q in zip(edgeAt(su, tl), creaseAt(tl)): add(p, q + [0, EPS, 0], 2, 'lipU')
for p, q in zip(edgeAt(sl, tl), creaseAt(tl)): add(p, q - [0, EPS, 0], 2, 'lipL')
src = np.array(src); dst = np.array(dst); wts = np.array(wts, float)
log('correspondences', len(src))

# ------------------------------------------------------------------ similarity
rigid = [i for i, t in enumerate(tags) if t in ('canthus', 'corner', 'noseTip', 'subnasale', 'nasion', 'pogonion', 'upperLipFront', 'lowerLipFront')]
s, R, t = umeyama(src[rigid], dst[rigid])
sim = lambda X: s * X @ R.T + t
res = np.linalg.norm(sim(src) - dst, axis=1)
log('similarity scale', round(s, 5), 'residual mean %.4f max %.4f' % (res.mean(), res.max()))
for tg in sorted(set(tags)):
    m = np.array([x == tg for x in tags]); log('   %-14s %.4f' % (tg, res[m].mean()))

# ------------------------------------------------------------------ TPS (3D, phi = r)
def tps_fit(P, Q, lam=1e-4):
    n = len(P)
    K = np.linalg.norm(P[:, None] - P[None], axis=2)
    A = np.zeros((n + 4, n + 4))
    A[:n, :n] = K + lam * np.eye(n)
    A[:n, n] = 1; A[:n, n + 1:] = P; A[n, :n] = 1; A[n + 1:, :n] = P.T
    B = np.zeros((n + 4, 3)); B[:n] = Q
    W = np.linalg.solve(A, B)
    return P, W
def tps_apply(model, X):
    P, W = model
    out = np.zeros_like(X)
    for i in range(0, len(X), 4000):
        x = X[i:i + 4000]
        K = np.linalg.norm(x[:, None] - P[None], axis=2)
        out[i:i + 4000] = K @ W[:len(P)] + W[len(P)] + x @ W[len(P) + 1:]
    return out
P0 = sim(src)
tps = tps_fit(P0, dst, lam=2e-3)
X0 = sim(IV)
Xt = tps_apply(tps, X0)
res = np.linalg.norm(tps_apply(tps, P0) - dst, axis=1)
log('TPS residual mean %.4f max %.4f' % (res.mean(), res.max()))

# ------------------------------------------------------------------ ICT ring distance from the mouth / eye openings
Ef, nbI = adjacency(len(IV), IT[ITG == 0])
Tf = IT[ITG == 0]
Ea = np.sort(np.concatenate([Tf[:, [0, 1]], Tf[:, [1, 2]], Tf[:, [2, 0]]]), axis=1)
ue, cnt = np.unique(Ea, axis=0, return_counts=True)
bnd = ue[cnt == 1]
bv = np.unique(bnd)
def ring_from(seeds):
    dist = np.full(len(IV), 10 ** 6); dist[seeds] = 0; front = list(seeds); r = 0
    while front:
        r += 1; nxt = []
        for u in front:
            for w in nbI[u]:
                if dist[w] > r: dist[w] = r; nxt.append(w)
        front = nxt
    return dist
mouthLoop = bv[(np.abs(IV[bv, 1] + 3.36) < 1.0) & (np.abs(IV[bv, 0]) < 3)]
eyeLoops = bv[(IV[bv, 1] > 2.5) & (IV[bv, 1] < 4.5) & (np.abs(IV[bv, 0]) > 1.5) & (np.abs(IV[bv, 0]) < 5)]
ringM = ring_from(mouthLoop); ringE = ring_from(eyeLoops)
def nearest_vert(p, cand):
    return cand[np.argmin(np.linalg.norm(IV[cand] - p, axis=1))]
faceV = np.arange(9409)
silV = np.unique([nearest_vert(p, faceV) for p in np.concatenate([su, sl])])
lidV = np.unique([nearest_vert(p, faceV) for p in np.concatenate([f['I_lidOutline_L'], f['I_lidOutline_R']]) if np.isfinite(p).all()])
rM = int(np.median(ringM[silV])); rE = int(np.median(ringE[lidV]))
log('ring distance: lip edge from mouth loop', rM, 'lid margin from eye loop', rE)
inner = np.zeros(len(IV), bool)
inner[:NS] = False
inner[(ringM < rM)] = True
inner[(ringE < rE)] = True
inner[9409:NS] = False
inner[11248:NS] = True     # mouth socket + eye sockets: smoothness only
data_ok = np.zeros(len(IV), bool); data_ok[:11248] = True; data_ok &= ~inner
log('ICT surface verts with a data term', data_ok.sum(), 'inner/free', (~data_ok[:NS]).sum())

# handles for the curve constraints: nearest ICT surface vertex to each correspondence source
handle = np.array([nearest_vert(p, np.arange(11248)) for p in src])
hw = wts * 4.0

# ------------------------------------------------------------------ sculpt target surface (head + ears, no eye membrane)
targF = SF[np.isin(Spart[SF[:, 0]], [0, 1])]
mem = np.zeros(len(SV), bool)
for side in ('L', 'R'):
    c, r = f['S_eyeC_' + side], float(f['S_eyeR_' + side])
    mem |= (np.linalg.norm(SV - c, axis=1) < r - 0.0015) & (Spart == 0)
targF = targF[~mem[targF].all(1)]
bvhT = make_bvh(SV, targF)
SN = vertex_normals(SV, targF)
from mathutils import Vector

# ------------------------------------------------------------------ non-rigid ICP
E = np.sort(np.concatenate([surfT[:, [0, 1]], surfT[:, [1, 2]], surfT[:, [2, 0]]]), axis=1)
E = np.unique(E, axis=0)
ei, ej = np.r_[E[:, 0], E[:, 1]], np.r_[E[:, 1], E[:, 0]]
deg = np.bincount(ei, minlength=NS).astype(float)
def Kmul(D):
    out = deg[:, None] * D
    for k in range(3):
        out[:, k] -= np.bincount(ei, weights=D[ej, k], minlength=NS)
    return out
def cg(Amul, B, X, diag, iters=400, tol=1e-7):
    Rr = B - Amul(X); Z = Rr / diag[:, None]; Pp = Z.copy(); rz = (Rr * Z).sum(0)
    b2 = (B * B).sum(0) + 1e-30
    for it in range(iters):
        Ap = Amul(Pp); a = rz / ((Pp * Ap).sum(0) + 1e-30)
        X = X + Pp * a; Rr = Rr - Ap * a
        if ((Rr * Rr).sum(0) / b2).max() < tol * tol: break
        Z = Rr / diag[:, None]; rz2 = (Rr * Z).sum(0); Pp = Z + Pp * (rz2 / (rz + 1e-30)); rz = rz2
    return X, it
X = Xt[:NS].copy()
Xbase = Xt[:NS].copy()
D = np.zeros((NS, 3))
bodyT = IT[np.isin(ITG, [0, 1])]
innerT = inner[bodyT].any(1)
SNv = vertex_normals(SV, SF)
neckY = Xt[9409:11248, 1].min()
revS = np.nonzero(np.isin(Spart, [0]) & ~mem & (SV[:, 1] > neckY + 0.15))[0]
log('reverse samples', len(revS), 'neck y', round(neckY, 3))
schedule = [(80, 0.30, 0.2), (40, 0.20, 0.3), (20, 0.12, 0.4), (10, 0.08, 0.5), (5, 0.05, 0.5), (2.5, 0.035, 0.5), (1.2, 0.025, 0.5), (0.6, 0.018, 0.5), (0.4, 0.014, 0.5), (0.4, 0.012, 0.5)]
for alpha, tau, ncos in schedule:
    X = Xbase + D
    Xall = np.r_[X, Xt[NS:]]
    NI = vertex_normals(Xall, bodyT)[:NS]
    C = np.zeros((NS, 3)); w = np.zeros(NS)
    for i in np.nonzero(data_ok[:NS])[0]:
        loc, nrm, k, dist = bvhT.find_nearest(Vector(X[i]))
        if loc is None or dist > tau: continue
        if np.array(nrm) @ NI[i] < ncos: continue
        C[i] = loc; w[i] = 1.0
    # reverse: sculpt samples -> closest point on the current ICT surface (pulls ICT into the sculpt's features)
    bvhC = make_bvh(Xall, bodyT)
    FN = np.cross(Xall[bodyT[:, 1]] - Xall[bodyT[:, 0]], Xall[bodyT[:, 2]] - Xall[bodyT[:, 0]])
    FN /= np.linalg.norm(FN, axis=1, keepdims=True) + 1e-12
    ri, rb, rp = [], [], []
    for i in revS:
        loc, nrm, k, dist = bvhC.find_nearest(Vector(SV[i]))
        if loc is None or dist > tau or innerT[k]: continue
        if FN[k] @ SNv[i] < ncos: continue
        tri = bodyT[k]; A_, B_, C_ = Xall[tri]
        v0, v1, v2 = B_ - A_, C_ - A_, np.array(loc) - A_
        d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
        den = d00 * d11 - d01 * d01 + 1e-18
        bv_ = (d11 * d20 - d01 * d21) / den; bw_ = (d00 * d21 - d01 * d20) / den
        ri.append(tri); rb.append((1 - bv_ - bw_, bv_, bw_)); rp.append(SV[i])
    ri = np.array(ri); rb = np.clip(np.array(rb), 0, 1); rb /= rb.sum(1, keepdims=True); rp = np.array(rp)
    rw = 0.5 * np.ones(len(ri))
    Wt = w.copy(); Ct = C * w[:, None]
    for h, q, ww in zip(handle, dst, hw):
        Wt[h] += ww; Ct[h] += ww * q
    B = Ct - Wt[:, None] * Xbase
    sb = (rb[:, :, None] * Xbase[ri]).sum(1)
    for k in range(3):
        np.add.at(B, ri[:, k], (rw * rb[:, k])[:, None] * (rp - sb))
    rdiag = np.zeros(NS)
    for k in range(3):
        np.add.at(rdiag, ri[:, k], rw * rb[:, k] ** 2)
    def Amul(Z):
        out = alpha * Kmul(Z) + Wt[:, None] * Z
        sr = (rb[:, :, None] * Z[ri]).sum(1) * rw[:, None]
        for k in range(3):
            np.add.at(out, ri[:, k], rb[:, k][:, None] * sr)
        return out
    D, its = cg(Amul, B, D, alpha * deg + Wt + rdiag + 1e-9)
    X = Xbase + D
    ok = w > 0
    dres = np.linalg.norm(X[ok] - C[ok], axis=1)
    rres = np.linalg.norm((rb[:, :, None] * X[ri]).sum(1) - rp, axis=1)
    hres = np.linalg.norm(X[handle] - dst, axis=1)
    log('ICP a %5.1f tau %.3f: fwd %d res %.4f/p95 %.4f  rev %d res %.4f/p95 %.4f  handles %.4f/max %.4f (cg %d)' % (alpha, tau, ok.sum(), dres.mean(), np.percentile(dres, 95), len(ri), rres.mean(), np.percentile(rres, 95), hres.mean(), hres.max(), its))

# ------------------------------------------------------------------ extend to teeth / eyeballs / gums (not solved)
Xfit = Xt.copy(); Xfit[:NS] = X
Dsurf = X - Xt[:NS]
ref = np.arange(NS)[data_ok[:NS] | inner[:NS]]
for a in range(NS, len(IV), 2000):
    x = Xt[a:a + 2000]
    dd = np.linalg.norm(x[:, None] - Xt[ref][None], axis=2)
    wg = np.exp(-(dd / 0.05) ** 2); wg /= wg.sum(1, keepdims=True) + 1e-12
    Xfit[a:a + 2000] = x + wg @ Dsurf[ref]

# ------------------------------------------------------------------ report: sculpt face -> fitted ICT distance
bvhF = make_bvh(Xfit, IT[np.isin(ITG, [0, 1])])
faceS = np.nonzero((Spart == 0) & (SV[:, 2] > 0.3) & (SV[:, 1] > -1.35) & (SV[:, 1] < 0.35) & ~mem)[0]
dist = np.array([bvhF.find_nearest(Vector(SV[i]))[3] for i in faceS])
log('sculpt face -> fitted ICT: mean %.4f p50 %.4f p95 %.4f max %.4f' % (dist.mean(), np.median(dist), np.percentile(dist, 95), dist.max()))
np.savez(WORK + '/fit.npz', Xfit=Xfit, Xtps=Xt, s=s, R=R, t=t, data_ok=data_ok, inner=inner, ringM=ringM, ringE=ringE, rM=rM, rE=rE,
         src=src, dst=dst, handle=handle, faceS=faceS, faceDist=dist)

# ------------------------------------------------------------------ renders
reset_scene(); setup_render((900, 1000))
obS = make_mesh('sculpt', SV, SF); set_smooth(obS); obS.data.materials.append(material('g', (0.6, 0.6, 0.62)))
obI = make_mesh('ict', Xfit, IT[np.isin(ITG, [0, 1])]); set_smooth(obI); obI.data.materials.append(material('b', (0.55, 0.6, 0.7)))
obI.location.x = 1.6
c = camera('f', (0.8, -0.45, 14), (0.8, -0.45, 0), ortho=3.4); render_to(OUT + '/inspect/fit_side_by_side.png', c)
obI.location.x = 0
obS.hide_render = True
c = camera('f2', (0, -0.45, 14), (0, -0.45, 0), ortho=1.7); render_to(OUT + '/inspect/fit_ict_front.png', c)
c = camera('q', (5.5, 0.0, 9.5), (0, -0.45, 0.4), lens=110); render_to(OUT + '/inspect/fit_ict_34.png', c)
obS.hide_render = False; obI.hide_render = True
render_to(OUT + '/inspect/fit_sculpt_34.png', c)
# error map on the sculpt
obI.hide_render = False
bpy_mod().data.objects.remove(obI)
col = np.zeros((len(SV), 3)); col[:] = 0.5
e = np.clip(dist / 0.01, 0, 1)
col[faceS] = np.c_[e, 1 - np.abs(e - 0.5) * 2, 1 - e]
me = obS.data
attr = me.color_attributes.new('err', 'FLOAT_COLOR', 'POINT')
attr.data.foreach_set('color', np.c_[col, np.ones(len(SV))].astype(np.float32).ravel())
bpy_mod().context.scene.display.shading.color_type = 'VERTEX'
c = camera('f3', (0, -0.45, 14), (0, -0.45, 0), ortho=1.7); render_to(OUT + '/inspect/fit_error_front.png', c)
log('done')
