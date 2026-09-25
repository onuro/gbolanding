# Plan C step 30: fit ICT-FaceKit's neutral head onto the sculpt.
#  1. landmark pairs (eyes, nose, lips, chin, eyeball centres) -> similarity (Umeyama)
#  2. biharmonic RBF warp through the landmarks + dense eye-margin / inner-lip contour correspondences
#  3. non-rigid ICP on the face + head groups: nearest point on the sculpt skin (normal-compatible), residuals
#     smoothed by normalised convolution on the (welded) ICT graph, coarse -> fine; constraints held
#  4. interior parts (mouth socket, teeth, eye sockets, inner lips/lids) follow by Gaussian extension
#  5. deformation gradient J per ICT vertex (for transferring expression deltas to the sculpt's proportions)
# out: WORK/fit.npz, OUT/inspect/fit_*.png
#   Blender -b --factory-startup --python s30_fit.py -- [--iters 40]
import sys, os, heapq
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from mathutils import Vector

args = argv_after_dashes()
def arg(k, d):
    return type(d)(args[args.index('--' + k) + 1]) if '--' + k in args else d
ITERS = arg('iters', 40)

# ---------------------------------------------------------------- data
VI, polys, pg = load_ict()
TI = np.load(WORK + '/ict_tris.npy'); TGI = np.load(WORK + '/ict_trigroup.npy'); VGI = np.load(WORK + '/ict_vgroup.npy')
NI = len(VI)
d = np.load(WORK + '/dec.npz')
VS, FS, CS = d['V'], d['F'], d['comp']
LMS = json.load(open(WORK + '/landmarks.json'))
EYE_R = 0.1755
eyesS = LMS['eyes']

# sculpt skin target: head + ears + neck minus the skin hidden inside the eyeballs
cen = VS[FS].mean(1)
hidden = np.zeros(len(FS), bool)
for e in eyesS:
    hidden |= np.linalg.norm(cen - np.array(e['centre']), axis=1) < EYE_R - 0.002
FT = FS[~hidden]
bvhS = BVHTree.FromPolygons(VS.tolist(), FT.tolist())
NS = vertex_normals(VS, FT)

# ---------------------------------------------------------------- ICT graph (face + head welded)
surf = VGI <= 1
Tsurf = TI[TGI <= 1]
# weld by position
key = np.round(VI / 1e-4).astype(np.int64)
_, weld = np.unique(key, axis=0, return_inverse=True)
weld = weld.ravel()
def graph_edges(T):
    E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    return np.unique(np.sort(E, axis=1), axis=0)
E_all = graph_edges(TI)
# welded edges for smoothing (map to representative = min index per weld id)
rep = np.full(weld.max() + 1, -1)
for i in range(NI):
    if rep[weld[i]] < 0: rep[weld[i]] = i
R_ = rep[weld]
Ew = np.unique(np.sort(R_[E_all], axis=1), axis=0)
Ew = Ew[Ew[:, 0] != Ew[:, 1]]
lap = Laplacian(NI, Ew)
adj = [[] for _ in range(NI)]
Ef = graph_edges(TI[TGI == 0])
for a, b in Ef:
    L = np.linalg.norm(VI[a] - VI[b]); adj[a].append((b, L)); adj[b].append((a, L))
def dijkstra(s, t):
    dist = {s: 0.0}; prev = {}; pq = [(0.0, s)]
    while pq:
        dd, u = heapq.heappop(pq)
        if u == t: break
        if dd > dist.get(u, 1e18): continue
        for v, w in adj[u]:
            nd = dd + w
            if nd < dist.get(v, 1e18):
                dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
    path = [t]
    while path[-1] != s: path.append(prev[path[-1]])
    return path[::-1]
def chain(ids):
    out = []
    for a, b in zip(ids[:-1], ids[1:]):
        p = dijkstra(a, b)
        out += p if not out else p[1:]
    return out
LM = ICT_LM68

# ---------------------------------------------------------------- similarity from core landmarks
def sfit(p):  # sculpt point from a list
    return np.array(p, np.float64)
mid = LMS['mid']
eL, eR = eyesS[1], eyesS[0]  # sculpt eyes[1] is at +x = subject's left (ICT 'left' = +x too)
mc = LMS['mouthCorner']
seamC = np.array(LMS['seamColumns'])
def seam_at(x):
    ax_ = abs(x)
    y = np.interp(ax_, seamC[:, 0], seamC[:, 1]); z = np.interp(ax_, seamC[:, 0], seamC[:, 2])
    return np.array([x, y, z])
def surf_pt(x, y, z0=2.0):
    h = bvhS.ray_cast(Vector((x, y, z0)), Vector((0, 0, -1)))
    return np.array(h[0])
# ICT eyeball centres
def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]; b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]; c = x[:3]; return c, np.sqrt(x[3] + c @ c)
cI_L, rI = fit_sphere(VI[21451:22221]); cI_R, _ = fit_sphere(VI[23021:23791])
# ICT midline lip peaks (max z on the midline between the landmarks)
midI = np.where((np.abs(VI[:, 0]) < 0.02) & (VGI == 0))[0]
def ict_mid_peak(y0, y1):
    m = midI[(VI[midI, 1] > y0) & (VI[midI, 1] < y1)]
    return m[np.argmax(VI[m, 2])]
iUL = ict_mid_peak(VI[LM[62], 1], VI[LM[51], 1] + 0.3)
iLL = ict_mid_peak(VI[LM[57], 1] - 0.2, VI[LM[66], 1])
pairs = [  # (ict vertex index or ('pt', xyz), sculpt xyz, weight in similarity)
    (LM[36], eR['outer'], 1), (LM[39], eR['inner'], 1), (LM[42], eL['inner'], 1), (LM[45], eL['outer'], 1),
    (LM[37], eR['up23'], 1), (LM[38], eR['up13'], 1), (LM[40], eR['lo13'], 1), (LM[41], eR['lo23'], 1),
    (LM[43], eL['up13'], 1), (LM[44], eL['up23'], 1), (LM[46], eL['lo23'], 1), (LM[47], eL['lo13'], 1),
    (LM[27], mid['nasion'], 1), (LM[30], mid['noseTip'], 1), (LM[33], mid['subnasale'], 1),
    (LM[31], surf_pt(-0.152, -0.722), 1), (LM[35], surf_pt(0.152, -0.722), 1),
    (LM[48], [-mc[0], mc[1], mc[2]], 1), (LM[54], mc, 1),
    (iUL, mid['upperLip'], 1), (iLL, mid['lowerLip'], 1),
    (LM[62], seam_at(0.0), 1), (LM[66], seam_at(0.0), 1),
    (LM[8], mid['chin45'], 1),
    (('pt', cI_L), eL['centre'], 2), (('pt', cI_R), eR['centre'], 2),
]
for k in (61, 63, 65, 67):  # inner lip, by x fraction of the ICT inner corners
    f = VI[LM[k], 0] / VI[LM[64], 0]
    pairs.append((LM[k], seam_at(f * mc[0]), 1))
for k in (28, 29):
    f = (VI[LM[k], 1] - VI[LM[27], 1]) / (VI[LM[30], 1] - VI[LM[27], 1])
    y = mid['nasion'][1] + f * (mid['noseTip'][1] - mid['nasion'][1])
    pairs.append((LM[k], surf_pt(0.0, y), 1))
def ict_pt(a):
    return a[1] if isinstance(a, tuple) else VI[a]
src = np.array([ict_pt(a) for a, _, _ in pairs]); dst = np.array([sfit(b) for _, b, _ in pairs])
wts = np.array([w for _, _, w in pairs], np.float64)
core = wts > 0
rep_src = np.repeat(src, wts.astype(int), axis=0); rep_dst = np.repeat(dst, wts.astype(int), axis=0)
s, Rm, t = umeyama(rep_src, rep_dst)
log('similarity scale', round(s, 5), '(sculpt units per cm) ->  W_ict in sculpt units', round(s * 12.993, 4))
X0 = (s * (Rm @ VI.T)).T + t
res = np.linalg.norm((s * (Rm @ src.T)).T + t - dst, axis=1)
log('landmark residual after similarity: mean', res.mean().round(4), 'max', res.max().round(4))
for (a, b, w), r in zip(pairs, res):
    pass

# ---------------------------------------------------------------- dense contour constraints
cons = {}  # ict vertex -> sculpt target
for (a, b, w) in pairs:
    if not isinstance(a, tuple): cons[int(a)] = np.array(b, np.float64)
# eye margins
eye_contours = {}
for side, (ids, e) in {'R': ([36, 37, 38, 39, 40, 41, 36], eR), 'L': ([42, 43, 44, 45, 46, 47, 42], eL)}.items():
    path = chain([LM[k] for k in ids])[:-1]
    P = np.array(e['contour']); up = np.array(e['contourUp'])
    xi, xo = e['inner'][0], e['outer'][0]
    Ii, Io = X0[LM[39 if side == 'R' else 42], 0], X0[LM[36 if side == 'R' else 45], 0]
    # upper part of the ICT loop: from outer corner (36 / 45 index position) over the top
    n_up = len(chain([LM[k] for k in ids[:4]]))
    for j, v in enumerate(path):
        f = np.clip((X0[v, 0] - Ii) / (Io - Ii), 0, 1)
        is_up = (j < n_up) if side == 'R' else (j < n_up)
        # side R: ids start at outer (36) over 37, 38 to inner (39): upper = first n_up; L: 42 inner -> 43, 44 -> 45 outer: upper = first n_up
        S = P[up] if is_up else P[~up]
        fx = (S[:, 0] - xi) / (xo - xi)
        o = np.argsort(fx)
        tgt = np.array([np.interp(f, fx[o], S[o, k]) for k in range(3)])
        cons[int(v)] = tgt
    eye_contours[side] = path
    log('eye', side, 'ICT margin path', len(path), 'verts')
# inner lip contour 60..67
lip_path = chain([LM[k] for k in (60, 61, 62, 63, 64, 65, 66, 67, 60)])[:-1]
x60, x64 = X0[LM[60], 0], X0[LM[64], 0]
for v in lip_path:
    f = (X0[v, 0] - x60) / (x64 - x60)
    cons[int(v)] = seam_at(-mc[0] + f * 2 * mc[0])
log('inner lip path', len(lip_path), 'verts; constraints total', len(cons))

# regions inside the contours (inner lids / inner lips): flood from the face-group boundary loops
info = json.load(open(WORK + '/ict_info.json'))
loops = info['loops']
blocked = set(cons.keys())
def flood(seeds, stop):
    seen = set(seeds); st = list(seeds)
    while st:
        u = st.pop()
        for v, _ in adj[u]:
            if v not in seen and v not in stop:
                seen.add(v); st.append(v)
    return seen
loop_mouth = [L for L in loops if len(L) == 74][0]
loops_eye = [L for L in loops if len(L) == 42]
inner_lip = flood(loop_mouth, set(lip_path))
inner_lid = set()
for L, side in zip(loops_eye, ('L', 'R') if VI[loops_eye[0][0], 0] > 0 else ('R', 'L')):
    inner_lid |= flood(L, set(eye_contours[side]))
log('inner-lip region', len(inner_lip), 'inner-lid region', len(inner_lid))
interior_face = np.zeros(NI, bool)
interior_face[list(inner_lip)] = True; interior_face[list(inner_lid)] = True

# ---------------------------------------------------------------- biharmonic RBF warp through the constraints
ci = np.array(sorted(cons.keys())); ct = np.array([cons[k] for k in ci])
P0 = X0[ci]; D0 = ct - P0
def rbf_fit(P, D, lam=1e-6):
    n = len(P)
    K = np.linalg.norm(P[:, None] - P[None], axis=2)
    A = np.zeros((n + 4, n + 4)); A[:n, :n] = K + lam * np.eye(n); A[:n, n:] = np.c_[np.ones(n), P]; A[n:, :n] = A[:n, n:].T
    rhs = np.zeros((n + 4, 3)); rhs[:n] = D
    return np.linalg.solve(A, rhs)
def rbf_eval(P, coef, X):
    out = np.zeros((len(X), 3))
    for a in range(0, len(X), 4000):
        K = np.linalg.norm(X[a:a + 4000, None] - P[None], axis=2)
        out[a:a + 4000] = K @ coef[:len(P)] + np.c_[np.ones(len(K)), X[a:a + 4000]] @ coef[len(P):]
    return out
# subsample the dense contour points for the RBF (it gets ill-conditioned when points are very close)
sel = [0]
for i in range(1, len(ci)):
    if np.min(np.linalg.norm(P0[sel] - P0[i], axis=1)) > 0.012: sel.append(i)
sel = np.array(sel)
coef = rbf_fit(P0[sel], D0[sel], lam=1e-4)
X1 = X0 + rbf_eval(P0[sel], coef, X0)
log('rbf through', len(sel), 'of', len(ci), 'constraints; residual at all constraints', np.linalg.norm(X1[ci] - ct, axis=1).max().round(4))

# ---------------------------------------------------------------- non-rigid ICP (face + head)
def normals_of(X):
    return vertex_normals(X, Tsurf)
free = surf & ~interior_face
free[ci] = False
X = X1.copy()
X[ci] = ct
smooth_sched = np.linspace(60, 6, ITERS).astype(int)
dmax_sched = np.linspace(0.25, 0.06, ITERS)
for it in range(ITERS):
    N = normals_of(X)
    r = np.zeros((NI, 3)); w = np.zeros(NI)
    for i in np.where(free)[0]:
        co, no, idx, dist = bvhS.find_nearest(Vector(X[i]))
        if co is None or dist > dmax_sched[it]: continue
        c = np.array(co); n_ = np.array(no)
        if n_ @ N[i] < 0.4: continue
        r[i] = c - X[i]; w[i] = 1.0
    r[ci] = ct - X[ci]; w[ci] = 4.0
    k = smooth_sched[it]
    numr = np.zeros((NI, 3)); np.add.at(numr, R_, r * w[:, None])
    denr = np.zeros(NI); np.add.at(denr, R_, w)
    num = lap.smooth(numr, k, 0.5)[R_]
    den = lap.smooth(denr, k, 0.5)[R_]
    u = np.where(den[:, None] > 1e-6, num / np.maximum(den, 1e-6)[:, None], 0)
    upd = surf.copy()
    X[upd] += 0.7 * u[upd]
    X[ci] = ct
    if it % 5 == 0 or it == ITERS - 1:
        dd = np.linalg.norm(r[free & (w > 0)], axis=1)
        log('icp', it, 'smooth', k, 'matched', int((w[free] > 0).sum()), '/', int(free.sum()), 'resid mean', dd.mean().round(5), 'p95', np.percentile(dd, 95).round(5))
# final exact projection of the free face verts (small residual) with a light smoothing of the result
for i in np.where(free & (VGI == 0))[0]:
    co, no, idx, dist = bvhS.find_nearest(Vector(X[i]))
    if co is not None and dist < 0.03: X[i] = np.array(co)
X_surf = X.copy()

# ---------------------------------------------------------------- interior parts follow (Gaussian extension)
disp = X - X0
known = surf & ~interior_face
known[ci] = True
kd = KDTree(int(known.sum()))
kidx = np.where(known)[0]
for j, i in enumerate(kidx): kd.insert(X0[i], j)
kd.balance()
need = ~known
sig = 0.05
for i in np.where(need)[0]:
    hits = kd.find_n(X0[i], 24)
    if not hits: continue
    dd = np.array([h[2] for h in hits]); jj = np.array([h[1] for h in hits])
    ww = np.exp(-(dd / max(sig, dd.min() * 1.5)) ** 2)
    X[i] = X0[i] + (ww[:, None] * disp[kidx[jj]]).sum(0) / ww.sum()
log('interior extended', int(need.sum()))

# ---------------------------------------------------------------- deformation gradient per ICT vertex
# J = argmin sum_j w_j |J dx_j - dy_j|^2 + lam |J - I|^2 over Gaussian-weighted surface neighbours (dx: similarity-aligned
# rest, dy: fitted); the regulariser keeps the (unobserved) normal direction at identity
SIGJ = arg('sig-j', 0.12)
J = np.tile(np.eye(3), (NI, 1, 1))
ks = np.where(surf & ~interior_face)[0]
kdJ = KDTree(len(ks))
for j, i in enumerate(ks): kdJ.insert(X0[i], j)
kdJ.balance()
for i in np.where(surf)[0]:
    hits = kdJ.find_range(X0[i], 2.5 * SIGJ)
    if len(hits) < 6: continue
    jj = ks[np.array([h[1] for h in hits])]; dd = np.array([h[2] for h in hits])
    w = np.exp(-(dd / SIGJ) ** 2)
    dx = X0[jj] - X0[i]; dy = X[jj] - X[i]
    A = (dx * w[:, None]).T @ dx; B = (dy * w[:, None]).T @ dx
    lam = 0.05 * np.trace(A) / 3 + 1e-12
    J[i] = (B + lam * np.eye(3)) @ np.linalg.inv(A + lam * np.eye(3))
Jf = lap.smooth(J.reshape(NI, 9), arg('j-smooth', 30), 0.5)[R_]
J[surf] = Jf.reshape(NI, 3, 3)[surf]
dets = np.linalg.det(J[surf & ~interior_face])
log('J det on surface: p5 %.3f median %.3f p95 %.3f' % tuple(np.percentile(dets, [5, 50, 95])))

np.savez(WORK + '/fit.npz', X=X, X0=X0, X1=X1, s=s, R=Rm, t=t, J=J, cons_i=ci, cons_t=ct, interior_face=interior_face,
         lip_path=np.array(lip_path), eyeR=np.array(eye_contours['R']), eyeL=np.array(eye_contours['L']), iUL=iUL, iLL=iLL)
# fit error on the face
dd = []
for i in np.where((VGI == 0) & ~interior_face)[0]:
    co, no, idx, dist = bvhS.find_nearest(Vector(X[i])); dd.append(dist)
dd = np.array(dd)
log('final face fit distance: mean %.5f p95 %.5f max %.5f' % (dd.mean(), np.percentile(dd, 95), dd.max()))

# ---------------------------------------------------------------- renders
import bpy
reset_scene()
setup_render((1000, 1000))
obS = make_mesh('sculpt', VS, FS); set_smooth(obS)
obS.data.materials.append(material('grey', (0.62, 0.62, 0.64)))
Tf = TI[(TGI == 0)]
obI = make_mesh('ict', X, Tf)
obI.data.materials.append(material('ict', (0.9, 0.35, 0.2)))
wf = obI.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.0015; wf.use_replace = True
c = camera('face', (0, -0.4, 20), (0, -0.4, 0), ortho=2.3); render_to(OUT + '/inspect/fit_face.png', c)
c = camera('mouth', (0, -0.97, 20), (0, -0.97, 0), ortho=0.6); render_to(OUT + '/inspect/fit_mouth.png', c)
c = camera('eye', (0.42, -0.2, 20), (0.42, -0.2, 0), ortho=0.5); render_to(OUT + '/inspect/fit_eye.png', c)
c = camera('side', (20, -0.4, 0), (0, -0.4, 0), ortho=2.6); render_to(OUT + '/inspect/fit_side.png', c)
# interior parts
obS.hide_render = True; obI.hide_render = True
for g, col in ((2, (0.3, 0.3, 0.9)), (6, (0.95, 0.95, 0.9))):
    ob = make_mesh('g%d' % g, X, TI[TGI == g]); set_smooth(ob); ob.data.materials.append(material('m%d' % g, col))
obS.hide_render = False
c = camera('side2', (20, -0.9, 0), (0, -0.9, 0.5), ortho=1.2); render_to(OUT + '/inspect/fit_interior_side.png', c)
obS.hide_render = True
c = camera('front2', (0, -0.95, 20), (0, -0.95, 0), ortho=0.8); render_to(OUT + '/inspect/fit_interior_front.png', c)
log('done')
