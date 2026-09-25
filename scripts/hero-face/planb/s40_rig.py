# Step 4: turn the decimated sculpt into a talking, blinking head.
#   * rip the closed lips along the crease so the mouth can open; build a dark mouth pouch on the new lip rim
#   * fitted ICT teeth (decimated) behind the lips
#   * bind every skin vertex (head, ears, brows, lashes) to the fitted ICT surface (barycentric, upper/lower-lip
#     restricted). Each ICT expression is mapped into sculpt space through a heavily smoothed (regional) Jacobian of
#     the fit, interpolated at the bound points, then low-pass filtered on the ripped sculpt graph (wide for jaw/mouth
#     shapes, narrow for eye/brow shapes); the nose is kept near-rigid in mouth shapes; a local relax pass smooths
#     the deltas around any triangles a shape still folds
#   * eyes: the sculpt's own eyeballs stay; eyeLook* rotate them, eyeBlink* also tuck them in a little so the
#     closing lid never dips behind the cornea; the upper lid margin is driven onto the lower lid for a full blink
#   * jawOpen: the lower lip body, the mentolabial fold and the chin ride a rigid fit of the chin's own motion (no
#     fold sharpening); the 3 rings next to the lip rim are relaxed tangentially at rest (no flipping slivers)
#   Blender -b --python s40_rig.py -- [--jac fit|sim] [--jac-iters 400] [--frames 0|1] [--laps 20] [--laps-mouth 150]
#                                     [--relax 1] [--jaw-rigid 0.85] [--rim-relax 12] [--out rig]
#   (--jaw-rigid 0 --rim-relax 0 reproduces the 23:28 rig)
#   (defaults = the shipped rig; --frames 1 --jac-iters 60 --laps-mouth 20 --relax 0 reproduces the first version,
#    whose jaw / smile shapes rippled the cheeks and lower lip)
# out: WORK/<out>.npz
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from features import *
import bpy, bmesh
from mathutils import Vector

ARGS = argv_after_dashes()
def arg(k, d):
    return type(d)(ARGS[ARGS.index('--' + k) + 1]) if '--' + k in ARGS else d
JAC = arg('jac', 'fit')          # fit: local fit Jacobian (smoothed) | sim: global similarity only
JAC_ITERS = arg('jac-iters', 400)
FRAMES = arg('frames', 0)        # 1: bound offsets ride the deformed ICT frames | 0: interpolate ICT displacements
LAPS = arg('laps', 20)           # smoothing iterations of the transferred deltas on the sculpt (eye / brow shapes)
LAPS_M = arg('laps-mouth', 150) # ... for jaw / mouth shapes (the lower face tolerates, and needs, a much wider filter)
RELAX = arg('relax', 1)          # local extra smoothing of the deltas wherever a shape folds the skin
RIG_OUT = arg('out', 'rig')
JAW_RIGID = arg('jaw-rigid', 0.85)  # jawOpen: blend lower lip body / sulcus / chin toward a local rigid fit (0 = off)
RIM_RELAX = arg('rim-relax', 12)   # tangential relaxation rounds on the 3 rings next to the lip rim (sliver removal; 0 = off)
log('options: jac', JAC, JAC_ITERS, 'frames', FRAMES, 'laps', LAPS, LAPS_M, 'relax', RELAX, 'jaw-rigid', JAW_RIGID, 'rim-relax', RIM_RELAX, 'out', RIG_OUT)
EXPR = ['jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthSmile_L', 'mouthSmile_R', 'mouthStretch_L', 'mouthStretch_R',
        'mouthLowerDown_L', 'mouthLowerDown_R', 'mouthUpperUp_L', 'mouthUpperUp_R', 'mouthPress_L', 'mouthPress_R',
        'mouthRollLower', 'mouthRollUpper', 'eyeBlink_L', 'eyeBlink_R', 'eyeWide_L', 'eyeWide_R', 'eyeSquint_L', 'eyeSquint_R',
        'eyeLookUp_L', 'eyeLookUp_R', 'eyeLookDown_L', 'eyeLookDown_R', 'eyeLookIn_L', 'eyeLookIn_R', 'eyeLookOut_L', 'eyeLookOut_R',
        'browInnerUp_L', 'browInnerUp_R', 'browDown_L', 'browDown_R']

f = dict(np.load(WORK + '/features.npz'))
fit = dict(np.load(WORK + '/fit.npz'))
d = np.load(WORK + '/dec.npz')
SV, SF, Spart = d['V'].copy(), d['F'].copy(), d['part'].copy()
IV, polys, pg = load_ict()
IT = np.load(WORK + '/ict_tris.npy'); ITG = np.load(WORK + '/ict_trigroup.npy')
Xfit = fit['Xfit']; sS, RS = float(fit['s']), fit['R']
inner = fit['inner']
NS = 14062
reset_scene()

# =========================================================== 1. lip rip on the head
head_v = np.nonzero(Spart == 0)[0]
crease = f['S_crease']
def dist_to_poly(P, poly):
    out = np.full(len(P), 1e9)
    for a, b in zip(poly[:-1], poly[1:]):
        e = b - a; t = np.clip(((P - a) @ e) / (e @ e), 0, 1)
        out = np.minimum(out, np.linalg.norm(P - a - t[:, None] * e, axis=1))
    return out
headF_mask = Spart[SF[:, 0]] == 0
E, nb = adjacency(len(SV), SF[headF_mask])
near = np.zeros(len(SV), bool)
near[head_v] = np.linalg.norm(SV[head_v] - crease.mean(0), axis=1) < 0.4
dc = np.full(len(SV), 1.0); dc[near] = dist_to_poly(SV[near], crease)
cand = np.nonzero(near)[0]
vR = cand[np.argmin(np.linalg.norm(SV[cand] - crease[0], axis=1))]
vL = cand[np.argmin(np.linalg.norm(SV[cand] - crease[-1], axis=1))]
path = dijkstra_path(nb, SV, vR, vL, lambda u, w: np.linalg.norm(SV[u] - SV[w]) * (1 + ((dc[u] + dc[w]) / 2 / 0.0012) ** 2), allowed=near)
path = np.array(path)
log('crease path', len(path), 'verts, max dist to crease %.4f' % dc[path].max(), 'corners', SV[vR].round(3), SV[vL].round(3))

me = bpy.data.meshes.new('tmp'); ob = None
obh = make_mesh('head_all', SV, SF)
bm = bmesh.new(); bm.from_mesh(obh.data)
bm.verts.ensure_lookup_table()
pe = []
for a, b in zip(path[:-1], path[1:]):
    e = bm.edges.get((bm.verts[int(a)], bm.verts[int(b)]))
    assert e is not None
    pe.append(e)
nv0 = len(bm.verts)
bmesh.ops.split_edges(bm, edges=pe)
bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
bm.verts.index_update()
nv1 = len(bm.verts)
SV2 = np.array([v.co[:] for v in bm.verts])
SF2 = np.array([[v.index for v in fc.verts] for fc in bm.faces])
bm.free()
log('rip: verts', nv0, '->', nv1, '(+%d)' % (nv1 - nv0))
Spart2 = np.r_[Spart, np.zeros(nv1 - nv0, Spart.dtype)]
# pair original / duplicate by position; the copy whose faces sit lower is the lower-lip vertex
dups = np.arange(nv0, nv1)
key = {tuple(np.round(SV2[i] * 1e7).astype(np.int64)): i for i in path}
pair = {}
for j in dups:
    i = key[tuple(np.round(SV2[j] * 1e7).astype(np.int64))]
    pair[i] = j
cyf = SV2[SF2].mean(1)[:, 1]
def mean_face_y(v):
    m = (SF2 == v).any(1); return cyf[m].mean()
upperRim, lowerRim = [vR], [vR]
for i in path[1:-1]:
    j = pair[int(i)]
    if mean_face_y(i) >= mean_face_y(j): upperRim.append(int(i)); lowerRim.append(int(j))
    else: upperRim.append(int(j)); lowerRim.append(int(i))
upperRim.append(vL); lowerRim.append(vL)
upperRim, lowerRim = np.array(upperRim), np.array(lowerRim)
SV, SF, Spart = SV2, SF2, Spart2
NV = len(SV)
# smooth the rim curve itself (1D along the path, ends fixed); both copies of a rim vertex share the result
P = SV[upperRim].copy()
for it in range(6):
    P[1:-1] = 0.5 * P[1:-1] + 0.25 * (P[:-2] + P[2:])
moved = np.linalg.norm(P - SV[upperRim], axis=1)
SV[upperRim] = P; SV[lowerRim] = P
log('rim smoothing moved max %.4f mean %.4f' % (moved.max(), moved.mean()))
# decimation + rim smoothing leave needle slivers (min angle 1-3 deg) within 2 rings of the rim; they flip under the
# lip shapes and spoil the smooth normals (dark ticks on the lower lip). Relax the 3 rings next to the rim
# tangentially (Laplacian step minus its normal part): the surface stays, the triangles even out.
if RIM_RELAX:
    hF_ = SF[Spart[SF[:, 0]] == 0]
    _, nbR = adjacency(NV, hF_)
    ringR = np.full(NV, 99); ringR[upperRim] = 0; ringR[lowerRim] = 0
    fr_ = list(np.r_[upperRim, lowerRim])
    for k_ in range(3):
        nx_ = []
        for u_ in fr_:
            for w_ in nbR[u_]:
                if ringR[w_] > k_ + 1: ringR[w_] = k_ + 1; nx_.append(w_)
        fr_ = nx_
    relaxV = np.nonzero((ringR >= 1) & (ringR <= 3))[0]
    ER_ = adjacency(NV, hF_)[0]; LR_ = Laplacian(NV, ER_)
    def minang(V_, T_):
        a_, b_, c_ = V_[T_[:, 0]], V_[T_[:, 1]], V_[T_[:, 2]]
        L_ = np.sort(np.stack([np.linalg.norm(b_ - c_, axis=1), np.linalg.norm(c_ - a_, axis=1), np.linalg.norm(a_ - b_, axis=1)], 1), 1)
        return np.degrees(np.arccos(np.clip((L_[:, 1] ** 2 + L_[:, 2] ** 2 - L_[:, 0] ** 2) / (2 * L_[:, 1] * L_[:, 2] + 1e-18), -1, 1)))
    nearT = hF_[(ringR[hF_] <= 4).any(1)]
    a0_ = minang(SV, nearT); V0_ = SV.copy()
    bvh0_ = make_bvh(V0_, hF_)
    def tnorm(V_, T_):
        c_ = np.cross(V_[T_[:, 1]] - V_[T_[:, 0]], V_[T_[:, 2]] - V_[T_[:, 0]]); return c_ / (np.linalg.norm(c_, axis=1, keepdims=True) + 1e-18)
    n0T_ = tnorm(V0_, nearT)
    free_ = relaxV.copy()
    for it in range(RIM_RELAX):
        Nr_ = vertex_normals(SV, hF_)
        dv_ = LR_.avg(SV) - SV
        dv_ -= (dv_ * Nr_).sum(1, keepdims=True) * Nr_
        SV[free_] += 0.4 * dv_[free_]
        # stay exactly on the sculpted surface
        for v_ in free_:
            SV[v_] = np.array(bvh0_.find_nearest(Vector(SV[v_]))[0])
        # guard: a vertex of any triangle the relax turned over goes back to its rest spot and stays there
        badT_ = (tnorm(SV, nearT) * n0T_).sum(1) < 0.5
        if badT_.any():
            back_ = np.intersect1d(np.unique(nearT[badT_]), free_)
            SV[back_] = V0_[back_]; free_ = np.setdiff1d(free_, back_)
    a1_ = minang(SV, nearT)
    log('rim-ring relax guard: %d verts pinned back' % (len(relaxV) - len(free_)))
    log('rim-ring relax: %d verts, moved max %.4f mean %.4f; tris near the rim with min angle < 3 deg %d -> %d, < 8 deg %d -> %d, min %.1f -> %.1f' % (
        len(relaxV), np.linalg.norm(SV[relaxV] - V0_[relaxV], axis=1).max(), np.linalg.norm(SV[relaxV] - V0_[relaxV], axis=1).mean(),
        (a0_ < 3).sum(), (a1_ < 3).sum(), (a0_ < 8).sum(), (a1_ < 8).sum(), a0_.min(), a1_.min()))

# side labels near the mouth: multi-source BFS over the ripped head from the two rim chains
_, nb2 = adjacency(NV, SF[Spart[SF[:, 0]] == 0])
side = np.zeros(NV, np.int8)     # +1 upper lip side, -1 lower lip side, 0 unrestricted
mouth_zone = (Spart == 0) & (np.linalg.norm((SV - crease.mean(0)) * [1, 1.6, 1], axis=1) < 0.3)
dist = np.full(NV, 10 ** 6)
from collections import deque
q = deque()
for v in upperRim[1:-1]: side[v] = 1; dist[v] = 0; q.append(v)
for v in lowerRim[1:-1]: side[v] = -1; dist[v] = 0; q.append(v)
while q:
    u = q.popleft()
    for w in nb2[u]:
        if mouth_zone[w] and dist[w] > dist[u] + 1:
            dist[w] = dist[u] + 1; side[w] = side[u]; q.append(w)
xc = abs(SV[vL, 0])
side[np.abs(SV[:, 0]) > 0.9 * xc] = 0
log('side labels: upper', (side > 0).sum(), 'lower', (side < 0).sum())

# =========================================================== 2. eyes: centres, optical axes, pupils
eye = {}
for sd, sgn in (('L', 1), ('R', -1)):
    m = (Spart == 2) & (np.sign(SV[:, 0]) == sgn)
    c = f['S_eyeC_' + sd]; r = float(f['S_eyeR_' + sd])
    dv = SV[m] - c; rr = np.linalg.norm(dv, axis=1)
    top = rr > np.percentile(rr, 97)
    ax = (dv[top] / rr[top, None]).mean(0); ax /= np.linalg.norm(ax)
    pupil = c + ax * rr.max()
    eye[sd] = dict(c=c, r=r, ax=ax, pupil=pupil, mask=m)
    log('eye', sd, 'axis', ax.round(3), 'pupil', pupil.round(4))

# =========================================================== 3. ICT Jacobian field (neutral cm -> fitted sculpt units)
surfT = IT[np.isin(ITG, [0, 1, 2, 3, 4])]
Eict, nbI = adjacency(NS, surfT)
N0 = vertex_normals(IV[:NS], surfT); N1 = vertex_normals(Xfit[:NS], surfT)
J = np.zeros((NS, 3, 3))
for i in range(NS):
    nbr = nbI[i]
    if len(nbr) < 2:
        J[i] = sS * RS; continue
    e0 = IV[nbr] - IV[i]; e1 = Xfit[nbr] - Xfit[i]
    sc = np.sqrt((e1 ** 2).sum() / max((e0 ** 2).sum(), 1e-12))
    A = e0.T @ e0 + np.outer(N0[i], N0[i]) * (e0 ** 2).sum() / len(nbr)
    Bm = e1.T @ e0 + np.outer(N1[i] * sc, N0[i]) * (e0 ** 2).sum() / len(nbr)
    J[i] = Bm @ np.linalg.inv(A + 1e-9 * np.eye(3))
Lg = Laplacian(NS, Eict)
Jf = Lg.smooth(J.reshape(NS, 9), JAC_ITERS, 0.5).reshape(NS, 3, 3)
if JAC == 'sim': Jf[:] = sS * RS
sv = np.linalg.svd(Jf, compute_uv=False)
for nm_, c_ in (('mouth', np.array([0, -0.88, 0.9])), ('eyeL', f['S_eyeC_L']), ('cheekL', np.array([0.45, -0.55, 0.7]))):
    k_ = np.argmin(np.linalg.norm(Xfit[:NS] - c_, axis=1))
    log('   J at %-6s' % nm_, (np.linalg.svd(Jf[k_], compute_uv=False) / sS).round(3))
log('Jacobian singular values (x s^-1): median', np.median(sv, 0).round(3) / sS, 'p5', np.percentile(sv, 5, axis=0).round(3) / sS, 'p95', np.percentile(sv, 95, axis=0).round(3) / sS)

# =========================================================== 4. bind skin vertices to the fitted ICT surface
bindT_all = IT[np.isin(ITG, [0, 1, 3, 4])]
lowerI = f['I_lower_mask']
tri_lower = lowerI[bindT_all].all(1); tri_upper = ~lowerI[bindT_all].any(1)
tri_socket = np.isin(ITG[np.isin(ITG, [0, 1, 3, 4])], [3, 4])
skin = np.isin(Spart, [0, 1, 3, 4, 5])
mem = np.zeros(NV, bool)
for sd in ('L', 'R'):
    mem |= (np.linalg.norm(SV - eye[sd]['c'], axis=1) < eye[sd]['r'] - 0.0015) & (Spart == 0)
def sub_bvh(mask):
    idx = np.nonzero(mask)[0]
    return make_bvh(Xfit, bindT_all[idx]), idx
bvh_all, idx_all = sub_bvh(~tri_socket)
bvh_up, idx_up = sub_bvh(~tri_socket & tri_upper)
bvh_lo, idx_lo = sub_bvh(~tri_socket & tri_lower)
bvh_mem, idx_mem = sub_bvh(np.ones(len(bindT_all), bool))
bind_tri = np.full(NV, -1); bind_bar = np.zeros((NV, 3)); bind_off = np.zeros((NV, 3))
NF = vertex_normals(Xfit[:NS], bindT_all)
def bary(p, tri, X):
    A_, B_, C_ = X[tri]
    v0, v1, v2 = B_ - A_, C_ - A_, p - A_
    d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01 + 1e-18
    b1 = (d11 * d20 - d01 * d21) / den; b2 = (d00 * d21 - d01 * d20) / den
    return np.array([1 - b1 - b2, b1, b2])
def frames(X, Nv, tri, b):
    """per bound vertex: origin (barycentric point) + orthonormal frame (edge tangent, bitangent, interpolated normal)"""
    base = (b[:, :, None] * X[tri]).sum(1)
    n = (b[:, :, None] * Nv[tri]).sum(1); n /= np.linalg.norm(n, axis=1, keepdims=True)
    e = X[tri[:, 1]] - X[tri[:, 0]]
    e -= (e * n).sum(1, keepdims=True) * n; e /= np.linalg.norm(e, axis=1, keepdims=True)
    return base, e, np.cross(n, e), n
for i in np.nonzero(skin)[0]:
    if mem[i]: bvh, idx = bvh_mem, idx_mem
    elif side[i] > 0: bvh, idx = bvh_up, idx_up
    elif side[i] < 0: bvh, idx = bvh_lo, idx_lo
    else: bvh, idx = bvh_all, idx_all
    loc, nrm, k, dd = bvh.find_nearest(Vector(SV[i]))
    t = idx[k]; tri = bindT_all[t]
    b = np.clip(bary(np.array(loc), tri, Xfit), 0, 1); b /= b.sum()
    bind_tri[i] = t; bind_bar[i] = b
Ls = np.nonzero(skin)[0]
base, e1, e2, n = frames(Xfit, NF, bindT_all[bind_tri[Ls]], bind_bar[Ls])
o = SV[Ls] - base
bind_off[Ls] = np.c_[(o * e1).sum(1), (o * e2).sum(1), (o * n).sum(1)]
hs = np.abs(bind_off[Ls, 2]); ts_ = np.hypot(bind_off[Ls, 0], bind_off[Ls, 1])
face_ = (SV[Ls, 2] > 0.3) & (SV[Ls, 1] > -1.35) & (Spart[Ls] == 0)
log('binding offsets on the face: normal median %.4f p95 %.4f max %.4f | tangential p95 %.4f max %.4f' % (np.median(hs[face_]), np.percentile(hs[face_], 95), hs[face_].max(), np.percentile(ts_[face_], 95), ts_[face_].max()))

def skin_positions(Xd):
    """evaluate bound skin positions on a deformed fitted-ICT surface Xd"""
    Nd = vertex_normals(Xd[:NS], bindT_all)
    base, e1, e2, n = frames(Xd, Nd, bindT_all[bind_tri[Ls]], bind_bar[Ls])
    of = bind_off[Ls]
    return base + of[:, :1] * e1 + of[:, 1:2] * e2 + of[:, 2:] * n
P_rest = skin_positions(Xfit)
log('binding round-trip error max %.2e' % np.abs(P_rest - SV[skin]).max())

# =========================================================== 5. teeth (fitted ICT teeth, decimated) + mouth pouch
teethT = IT[ITG == 6]
# crowns only: ICT teeth carry full roots (normally hidden by the gums, which we drop). Cut every tooth at
# its crown height, measured from its own incisal/occlusal extreme in ICT neutral (cm).
TEETH = [(17039, 17229), (17230, 17415), (17416, 17606), (17607, 17729), (17730, 17894), (17895, 17990), (17991, 18066), (18067, 18142),
         (18143, 18218), (18219, 18294), (18295, 18390), (18391, 18555), (18556, 18678), (18679, 18869), (18870, 19055), (19056, 19246),
         (19247, 19425), (19426, 19601), (19602, 19813), (19814, 19951), (19952, 20078), (20079, 20168), (20169, 20262), (20263, 20348),
         (20349, 20434), (20435, 20528), (20529, 20618), (20619, 20745), (20746, 20883), (20884, 21095), (21096, 21271), (21272, 21450)]
CROWN = [0.75, 0.75, 0.8, 0.85, 0.85, 1.0, 0.9, 1.05, 1.05, 0.9, 1.0, 0.85, 0.85, 0.8, 0.75, 0.75]
crownV = np.zeros(len(IV), bool)
for ti, (a, b) in enumerate(TEETH):
    yy = IV[a:b + 1, 1]
    h = CROWN[ti % 16]
    crownV[a:b + 1] = (yy < yy.min() + h) if ti < 16 else (yy > yy.max() - h * 0.95)
# only the arch that shows through the lips: upper and lower first premolar -> first premolar
front = np.zeros(len(IV), bool)
for ti in list(range(4, 12)) + list(range(20, 28)):
    a, b = TEETH[ti]; front[a:b + 1] = True
teethT = teethT[crownV[teethT].all(1) & front[teethT].all(1)]
# the fitted ICT arch is wider than this small mouth: narrow it about the midline
# place the teeth from the smooth TPS warp (the ICP extension drags them with the squashed inner lips), narrowed to
# this small mouth, then translate so the upper incisal edge sits just under the lip line and behind the lips
TEETH_S = 0.93; TEETH_SX = 0.95
Xteeth = fit['Xtps'].copy()
tc = Xteeth[17039:21451].mean(0)
Xteeth[17039:21451] = tc + (Xteeth[17039:21451] - tc) * TEETH_S * np.array([TEETH_SX, 1, 1])
inc = np.arange(18067, 18219)                                     # upper central incisors
cm_ = crease[len(crease) // 2]
shift = np.array([0.0, (cm_[1] - 0.015) - Xteeth[inc, 1].min(), (cm_[2] - 0.036) - Xteeth[17039:21451, 2].max()])
Xteeth[17039:21451] += shift
log('teeth shift', shift.round(4))
tv = np.unique(teethT)
remap = -np.ones(len(IV), np.int64); remap[tv] = np.arange(len(tv))
TV = Xteeth[tv].copy(); TF = remap[teethT]
t_tri = np.stack([tv, tv, tv], 1); t_bar = np.tile([1.0, 0.0, 0.0], (len(tv), 1))
log('teeth', len(tv), 'verts ->', len(TV), 'verts', len(TF), 'tris')
# lower-teeth rigid motion per expression (Kabsch) for the pouch floor
lowerTeeth = np.arange(19247, 21451)

# pouch: rim loop = upper chain (R->L) + lower chain back (L->R, corners shared). The rings first run up/down
# the inner side of the lips in front of the teeth (vestibule), then back over / under the teeth to a back wall.
K = 6
#             rim   k1     k2     k3     k4     k5     k6
depth = np.array([0.0, 0.008, 0.026, 0.09, 0.26, 0.50, 0.64])
upOpen = np.array([0.0, 0.012, 0.090, 0.115, 0.120, 0.090, 0.040])
loOpen = np.array([0.0, 0.012, 0.080, 0.110, 0.120, 0.095, 0.050])
xs_ = np.array([1.0, 0.98, 0.98, 1.02, 1.2, 1.2, 0.9])
m_ = len(upperRim)
cols = list(upperRim) + list(lowerRim[1:-1][::-1])          # closed loop
colSide = [1] * m_ + [-1] * (m_ - 2)
colSide[0] = colSide[m_ - 1] = 0
ncol = len(cols)
mouthC = np.array([0.0, crease[len(crease) // 2, 1], crease[len(crease) // 2, 2]])
zc = mouthC[2]
PV = []; p_col = []; p_ring = []
for k in range(1, K + 1):
    for ci, v in enumerate(cols):
        p = SV[v].copy()
        env = np.sqrt(max(0.0, 1 - (abs(p[0]) / xc) ** 2))
        p[0] *= xs_[k]
        p[2] = min(p[2] - depth[k], zc - depth[k]) if k >= 3 else p[2] - depth[k]
        s_ = colSide[ci]
        if s_ > 0: p[1] += upOpen[k] * (0.25 + 0.75 * env)
        elif s_ < 0: p[1] -= loOpen[k] * (0.25 + 0.75 * env)
        else: p[1] += 0.5 * (upOpen[k] - loOpen[k]) * 0.25
        PV.append(p); p_col.append(ci); p_ring.append(k)
PV = np.array(PV); p_col = np.array(p_col); p_ring = np.array(p_ring)
capc = np.array([0.0, mouthC[1] - 0.01, zc - depth[K] - 0.03])
PV = np.r_[PV, capc[None]]; p_col = np.r_[p_col, -1]; p_ring = np.r_[p_ring, K + 1]
cap = len(PV) - 1
rim_ids = np.arange(ncol)
ring_ids = lambda k: ncol + (k - 1) * ncol + np.arange(ncol)
POS = np.r_[SV[cols], PV]
tris = []
for k in range(1, K + 1):
    a_ = rim_ids if k == 1 else ring_ids(k - 1); b_ = ring_ids(k)
    for i in range(ncol):
        j = (i + 1) % ncol
        tris.append((a_[i], b_[i], a_[j])); tris.append((a_[j], b_[i], b_[j]))
last = ring_ids(K)
for i in range(ncol):
    tris.append((last[i], ncol + cap, last[(i + 1) % ncol]))
PF = np.array(tris)
P_col = np.r_[np.arange(ncol), p_col]; P_ring = np.r_[np.zeros(ncol, int), p_ring]
# keep the pouch inside the skin (rest and every expression). "Inside" = inside the head shell with the lip
# opening capped (flesh + oral cavity), by ray parity. Offenders are pulled toward the pouch axis.
headFaces = SF[Spart[SF[:, 0]] == 0]
colsA = np.array(cols)
def capped(skinV):
    rimP = skinV[colsA]; c_ = rimP.mean(0)
    V_ = np.r_[skinV, c_[None]]; ci = len(skinV)
    capF = np.array([(colsA[i], colsA[(i + 1) % len(colsA)], ci) for i in range(len(colsA))])
    return make_bvh(V_, np.r_[headFaces, capF])
RAYD = [Vector(v).normalized() for v in ((0.31, 0.52, -0.79), (-0.43, -0.61, -0.66))]
def inside(bvh, P):
    out = np.zeros(len(P), bool)
    for i, p in enumerate(P):
        votes = 0
        for d_ in RAYD:
            o = Vector(p); n = 0
            for _ in range(40):
                loc, nrm, k, dd = bvh.ray_cast(o, d_)
                if loc is None: break
                n += 1; o = loc + d_ * 1e-5
            votes += n % 2
        out[i] = votes == 2 if votes != 1 else True   # disagreeing rays: treat as inside (grazing)
    return out
axisC = lambda: np.array([0.0, mouthC[1], 0.0])
def enforce_inside(P, skinV, rings, iters=6):
    bvh = capped(skinV)
    P = P.copy(); moved = 0
    idx = np.nonzero(rings > 0)[0]
    for it in range(iters):
        ok = inside(bvh, P[idx])
        bad = idx[~ok]
        if not len(bad): break
        moved += len(bad)
        # pull toward the pouch axis (x -> 0, y -> mouth line) and back
        P[bad, 0] *= 0.85
        P[bad, 1] = mouthC[1] + (P[bad, 1] - mouthC[1]) * 0.85
        P[bad, 2] -= 0.01
    return P, moved
POS, nout = enforce_inside(POS, SV, P_ring)
bvh_head = make_bvh(SV, headFaces)
log('pouch', len(POS), 'verts', len(PF), 'tris; pushed-in steps', nout)
okT = inside(capped(SV), TV)
log('teeth: outside the capped skin', (~okT).sum(), 'of', len(TV), '; incisal edges: upper y %.3f lower y %.3f, front z %.3f (crease y %.3f z %.3f)' % (
    TV[(np.abs(TV[:, 0]) < 0.05) & (TV[:, 1] < crease[:, 1].mean() + 0.05)][:, 1].min(), TV[(np.abs(TV[:, 0]) < 0.05)][:, 1].max() if False else TV[np.abs(TV[:, 0]) < 0.05][:, 1].min(), TV[:, 2].max(), crease[len(crease)//2, 1], crease[len(crease)//2, 2]))

# =========================================================== 6. expressions
Lskin = np.nonzero(skin)[0]
# smoothing graph for the transferred deltas: skin edges, minus anything touching the eye membrane (so the upper
# and lower lids only meet at the canthi, as the lips only meet at the corners after the rip)
Esk = adjacency(NV, SF[skin[SF[:, 0]]])[0]
Esk = Esk[~(mem[Esk[:, 0]] | mem[Esk[:, 1]])]
LapS = Laplacian(NV, Esk)
neckFade = 0.3 + 0.7 * np.clip((SV[:, 1] + 1.9) / 0.5, 0, 1) ** 2 * (3 - 2 * np.clip((SV[:, 1] + 1.9) / 0.5, 0, 1))
def kabsch(A, B):
    ca, cb = A.mean(0), B.mean(0)
    H = (A - ca).T @ (B - cb); U, S_, Vt = np.linalg.svd(H)
    Dd = np.eye(3); Dd[2, 2] = np.sign(np.linalg.det(Vt.T @ U.T))
    Rr = Vt.T @ Dd @ U.T
    return Rr, cb - Rr @ ca
# ---- lid closure: margin = skin vertices bordering the eye membrane
_, nbS = adjacency(NV, SF[skin[SF[:, 0]]])
def close_lids(dS, sd):
    E_ = eye[sd]; c = E_['c']
    sgn = np.sign(c[0])
    near_ = (np.linalg.norm(SV - c, axis=1) < 1.6 * E_['r']) & (Spart == 0) & ~mem & (np.sign(SV[:, 0]) == sgn)
    marg = np.array([i for i in np.nonzero(near_)[0] if any(mem[w] for w in nbS[i])])
    aS, bS, upS, loS = split_outline(f['S_lidOutline_' + sd])
    mid = lambda x: aS[1] + (x - aS[0]) / (bS[0] - aS[0]) * (bS[1] - aS[1])
    upM = marg[SV[marg, 1] > mid(SV[marg, 0]) + 0.004]; loM = marg[SV[marg, 1] < mid(SV[marg, 0]) - 0.004]
    Pu = SV[upM] + dS[upM]; Pl = SV[loM] + dS[loM]
    o = np.argsort(Pl[:, 0]); Pl = Pl[o]
    ytgt = np.interp(Pu[:, 0], Pl[:, 0], Pl[:, 1]) - 0.008
    ztgt = np.interp(Pu[:, 0], Pl[:, 0], Pl[:, 2]) + 0.008
    corr = np.zeros((len(upM), 3))
    corr[:, 1] = np.minimum(0, ytgt - Pu[:, 1])
    corr[:, 2] = np.maximum(0, ztgt - Pu[:, 2])
    # taper toward the canthi so the corners stay put
    t = np.clip((Pu[:, 0] - aS[0]) / (bS[0] - aS[0]), 0, 1)
    corr *= (np.sin(np.pi * t) ** 0.5)[:, None]
    log('   close %s: %d upper / %d lower margin verts, mean gap %.4f max %.4f' % (sd, len(upM), len(loM), -corr[:, 1].mean(), -corr[:, 1].min()))
    # propagate up the lid: BFS over non-membrane skin from the upper margin
    dist = np.full(NV, 1e9); src = np.full(NV, -1)
    from collections import deque
    q = deque()
    for k, v in enumerate(upM): dist[v] = 0; src[v] = k; q.append(v)
    upper_zone = near_ & (SV[:, 1] > mid(SV[:, 0]) - 0.002)
    while q:
        u = q.popleft()
        for w in nbS[u]:
            if not upper_zone[w] or mem[w]: continue
            dd = dist[u] + np.linalg.norm(SV[w] - SV[u])
            if dd < dist[w] and dd < 0.07: dist[w] = dd; src[w] = src[u]; q.append(w)
    hit = src >= 0
    fall = np.clip(1 - dist[hit] / 0.07, 0, 1) ** 2
    dS = dS.copy()
    dS[hit] += corr[src[hit]] * fall[:, None]
    # lash strips ride rigidly-ish on the lid margin: each lash vertex takes the (inverse-distance) average of the
    # full deltas of its 6 nearest margin vertices (upper strip -> upper margin, lower strip -> lower margin)
    for part_, M in ((4, upM), (5, loM)):
        lash = (Spart == part_) & (np.sign(SV[:, 0]) == sgn)
        for i in np.nonzero(lash)[0]:
            dd = np.linalg.norm(SV[M] - SV[i], axis=1); k = np.argsort(dd)[:6]
            w_ = 1 / (dd[k] + 0.004); w_ /= w_.sum()
            dS[i] = (w_[:, None] * dS[M[k]]).sum(0)
    return dS

# visible skin triangles (not the eye membrane behind the eyeballs) for the fold check
visT = SF[skin[SF[:, 0]] & ~mem[SF].any(1)]
def tri_nrm(V):
    c = np.cross(V[visT[:, 1]] - V[visT[:, 0]], V[visT[:, 2]] - V[visT[:, 0]]); l = np.linalg.norm(c, axis=1)
    return c / (l[:, None] + 1e-15), l
visN0, visA0 = tri_nrm(SV)
def folds(D):
    bad = np.zeros(len(visT), bool)
    for w in (1.0, 0.6, 0.3):
        n1, a1 = tri_nrm(SV + w * D)
        bad |= ((visN0 * n1).sum(1) < 0.25) | (a1 < 0.2 * visA0)
    return bad
def relax_folds(dS, base=None, rounds=6):
    """extra delta smoothing on a 3-ring around folded / collapsed triangles (evaluated at w = 1, .6, .3, on top of
    `base` if given: mouthClose is only meaningful on an open jaw). Keeps the best round."""
    b0 = np.zeros_like(dS) if base is None else base
    bad = folds(b0 + dS); nb0 = int(bad.sum()); best = (nb0, dS.copy())
    for r in range(rounds):
        if not bad.any(): break
        reg = np.zeros(NV, bool); reg[np.unique(visT[bad])] = True
        for _ in range(3):
            reg[Esk[reg[Esk[:, 0]], 1]] = True; reg[Esk[reg[Esk[:, 1]], 0]] = True
        reg &= skin & ~mem
        for _ in range(10):
            dS[reg] += 0.5 * (LapS.avg(dS)[reg] - dS[reg])
        bad = folds(b0 + dS)
        if bad.sum() < best[0]: best = (int(bad.sum()), dS.copy())
    return best[1], nb0, best[0]

# the nose stays (almost) rigid in jaw / mouth shapes: ICT's upper-lip motion otherwise shears the sculpt's deep
# nostril sills and alar creases into visible folds (pucker / funnel)
def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
nt, sn = f['S_noseTip'], f['S_subnasale']
noseCore = np.array([nt - [0, 0, 0.03], sn + [0, 0.04, 0.04], sn + [0.09, 0.04, -0.03], sn + [-0.09, 0.04, -0.03],
                     sn + [0.15, 0.10, -0.09], sn + [-0.15, 0.10, -0.09]])
dn_ = np.min(np.linalg.norm(SV[:, None, :] - noseCore[None], axis=2), axis=1)
noseAtt = 1 - 0.85 * (1 - smoothstep(0.03, 0.13, dn_))
log('nose attenuation: verts < 0.5: %d, subnasale %.2f, upper lip front %.2f' % ((noseAtt < 0.5).sum(),
    noseAtt[np.argmin(np.linalg.norm(SV - sn, axis=1))], noseAtt[np.argmin(np.linalg.norm(SV - f['S_upperLipFront'], axis=1))]))

morph_pos = {}
diag = {}
for name in EXPR:
    dI = load_ict_expr(name, IV)
    Xd = Xfit.copy()
    dX = np.einsum('nij,nj->ni', Jf, dI[:NS])
    Xd[:NS] += Lg.smooth(dX, 6, 0.5)
    dS = np.zeros((NV, 3))
    if FRAMES: dS[Lskin] = skin_positions(Xd) - P_rest
    else: dS[Lskin] = (bind_bar[Ls][:, :, None] * (Xd - Xfit)[bindT_all[bind_tri[Ls]]]).sum(1)
    dS = LapS.smooth(dS, LAPS_M if name.startswith(('jaw', 'mouth')) else LAPS, 0.5) * neckFade[:, None]
    if name.startswith(('jaw', 'mouth')): dS *= noseAtt[:, None]
    dS[~skin] = 0
    if name == 'jawOpen' and JAW_RIGID > 0:
        # (A) ICT's jawOpen everts the lower lip forward of the chin. ICT's mentolabial fold is shallow; this sculpt's is
        # deep and tight, so the eversion folds it into a dark slash (the fold normals turn 16-23 deg, the chin's 1-5).
        # Let the fold and the lip body ride the chin: fit the rigid motion of the field on the chin alone and blend
        # toward it from the lip's body (0 at the lip line, so the opening keeps ICT's shape) down to the fold (full).
        yr = np.interp(SV[:, 0], crease[:, 0], crease[:, 1])
        below = yr - SV[:, 1]
        reg = skin & (Spart == 0) & (np.abs(SV[:, 0]) < 0.3) & (below > 0.2) & (below < 0.45) & (SV[:, 2] > 0.45)
        Rr, tr = kabsch(SV[reg], SV[reg] + dS[reg])
        dRig = SV @ Rr.T + tr - SV
        wR = JAW_RIGID * smoothstep(0.015, 0.15, below) * (1 - smoothstep(0.22, 0.45, np.abs(SV[:, 0]))) * smoothstep(-1.6, -1.35, SV[:, 1]) * smoothstep(0.3, 0.55, SV[:, 2])
        wR[~skin | (Spart != 0)] = 0
        log('   jawOpen chin-rigid blend: fit over %d chin verts, rotation %.1f deg, field vs rigid on the chin p95 %.4f; blended verts %d, max change %.4f' % (
            reg.sum(), np.degrees(np.arccos(np.clip((np.trace(Rr) - 1) / 2, -1, 1))), np.percentile(np.linalg.norm(dRig[reg] - dS[reg], axis=1), 95), (wR > 0.01).sum(),
            (np.linalg.norm(dRig - dS, axis=1) * wR).max()))
        dS = dS * (1 - wR[:, None]) + dRig * wR[:, None]
    for chain in (upperRim, lowerRim):
        Dc = dS[chain].copy()
        for it in range(8):
            Dc[1:-1] = 0.5 * Dc[1:-1] + 0.25 * (Dc[:-2] + Dc[2:])
        dS[chain[1:-1]] = Dc[1:-1]
    if RELAX:
        dS, nb0, nb1 = relax_folds(dS, base=morph_pos['jawOpen'][0] if name == 'mouthClose' else None)
        if nb0: log('   %s: folded skin tris %d -> %d after local relax' % (name, nb0, nb1))
    # eyeballs: rotations for eyeLook, tuck for blink
    for sd in ('L', 'R'):
        E_ = eye[sd]; mm = E_['mask']
        if name.startswith('eyeLook') and name.endswith('_' + sd):
            # ICT's eyeLook shapes only move the lids (eyeballs are bone-driven in ARKit rigs): rotate the sculpt
            # eyeball about its centre by the ARKit-typical full-weight angle
            kind = name[len('eyeLook'):-2]
            nasal = -np.sign(E_['c'][0])          # toward the nose
            u = {'Up': np.array([0, 1.0, 0]), 'Down': np.array([0, -1.0, 0]), 'In': np.array([nasal, 0, 0]), 'Out': np.array([-nasal, 0, 0])}[kind]
            ang = np.radians({'Up': 25, 'Down': 30, 'In': 30, 'Out': 30}[kind])
            a0 = E_['ax']; a1 = a0 + np.tan(ang) * (u - (u @ a0) * a0); a1 /= np.linalg.norm(a1)
            k_ = np.cross(a0, a1); k_ /= np.linalg.norm(k_)
            Kx = np.array([[0, -k_[2], k_[1]], [k_[2], 0, -k_[0]], [-k_[1], k_[0], 0]])
            Rs = np.eye(3) + np.sin(ang) * Kx + (1 - np.cos(ang)) * Kx @ Kx
            p = SV[mm] - E_['c']
            dS[mm] = p @ Rs.T - p
        if name == 'eyeBlink_' + sd:
            dS[mm] = -(SV[mm] - E_['c']) * 0.08
            memE = mem & (np.sign(SV[:, 0]) == np.sign(E_['c'][0]))
            dS[memE] = -(SV[memE] - E_["c"]) * 0.45
            dS = close_lids(dS, sd)
    # teeth: barycentric on the (similarity-scaled) ICT teeth deltas
    dT = (t_bar[:, :, None] * (dI[t_tri] @ (sS * RS).T)).sum(1)
    # pouch: rim copies follow the lips exactly; deeper rings blend to the jaw (lower) / skull (upper)
    Rj, tj = kabsch(IV[lowerTeeth], IV[lowerTeeth] + dI[lowerTeeth])
    jawmove = np.linalg.norm(dI[lowerTeeth], axis=1).max() > 1e-3
    dP = np.zeros((len(POS), 3))
    rimd = dS[np.array(cols)]
    for i in range(len(POS)):
        k = P_ring[i]; c_ = P_col[i]
        w = [1.0, 0.95, 0.75, 0.3, 0.0, 0.0, 0.0, 0.0][k]
        if c_ < 0: sd_ = -1; dr = rimd[colSide.index(-1)] * 0 if False else rimd.mean(0) * 0.3
        else: sd_ = colSide[c_]; dr = rimd[c_]
        base = np.zeros(3)
        if sd_ <= 0 and jawmove:
            # rigid jaw of ICT, mapped through the similarity: p' = S Rj S^-1 (p - t) + ...
            pI = RS.T @ (POS[i] - fit['t']) / sS
            base = sS * RS @ (Rj @ pI + tj - pI)
            if sd_ == 0: base *= 0.5
        if sd_ > 0 and k >= 2: dr = dr * 1.0
        dP[i] = dr if k == 0 else w * dr + (1 - w) * base
    Pp, mv = enforce_inside(POS + dP, SV + dS, P_ring)
    dP = Pp - POS
    Ph, mv2 = enforce_inside(POS + 0.5 * dP, SV + 0.5 * dS, P_ring)
    dP += 2 * (Ph - (POS + 0.5 * dP)) * (mv2 > 0)
    # teeth vs skin: if the posed lips cut in front of the teeth, slide the teeth back (rigid, -z) for this shape
    bvhp = capped(SV + dS)
    sample = np.arange(0, len(TV), 3)
    push = 0.0
    for it in range(24):          # (was 8 = max 0.048: not enough for mouthRoll*, the teeth showed through the lip)
        ok = inside(bvhp, TV[sample] + dT[sample] - [0, 0, push])
        if ok.all(): break
        push += 0.006
    dT = dT - np.array([0, 0, push])
    if mv or mv2 or push: log('   %s: pouch pushed %d/%d, teeth slid back %.4f' % (name, mv, mv2, push))
    morph_pos[name] = (dS, dT, dP)

    nrm_ = np.linalg.norm(dS, axis=1); im = np.argmax(nrm_); mx = nrm_[im]
    diag[name] = mx
    log('%-18s max skin delta %.4f at %s (part %d)  teeth %.4f  pouch %.4f' % (name, mx, SV[im].round(2), Spart[im], np.linalg.norm(dT, axis=1).max(), np.linalg.norm(dP, axis=1).max()))

np.savez(WORK + '/%s.npz' % RIG_OUT, SV=SV, SF=SF, Spart=Spart, side=side, upperRim=upperRim, lowerRim=lowerRim,
         TV=TV, TF=TF, POS=POS, PF=PF, P_ring=P_ring, cols=np.array(cols),
         eyes=np.array([[*eye[s]['c'], eye[s]['r'], *eye[s]['ax'], *eye[s]['pupil']] for s in ('L', 'R')]),
         names=np.array(EXPR),
         **{'dS_' + n: v[0].astype(np.float32) for n, v in morph_pos.items()},
         **{'dT_' + n: v[1].astype(np.float32) for n, v in morph_pos.items()},
         **{'dP_' + n: v[2].astype(np.float32) for n, v in morph_pos.items()})
log('saved rig')
