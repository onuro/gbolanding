# Plan C step 40: build the talking / blinking render mesh from the decimated sculpt + the fitted ICT.
#  A. eye openings: drop the skin hidden inside each eyeball, snap the lid margins onto the sphere
#  B. lip cut: Dijkstra path along the seam crease, corner to corner; path vertices split upper / lower
#  B2. Taubin smoothing of the decimated rest skin away from eyes / lids / lips / nose (the decimation ripple
#     otherwise shows as streaks when the expressions stretch or compress the skin)
#  C. inner-lip strips (off by default), mouth interior from the fitted ICT: socket + gums / tongue (dark 'mouth'
#     part) and the 20 front teeth (molars dropped); the socket rim follows the lip edge so it never pokes out
#  D. eyeballs: clean UV spheres around the gaze axis (sclera / iris parts, remapped eye-axis cosine)
#  E. bind every skin vertex to the fitted ICT surface (upper / lower lip kept apart along the seam) and
#     transfer ICT expression deltas through the fit's deformation gradient J
#  F. procedural eyelid blink: the lids ROTATE about the eyeball's corner-to-corner axis (smoothed angle field,
#     margins land exactly on the meeting curve), blended into ICT's blink further out; the eyeball retreats a
#     little along its gaze in eyeBlink so the linear morph never shows it through the lid mid-blink;
#     eyeLook targets rotate the eyeballs
#  G. normalise to W (origin = midpoint between the pupils, W = 2 x IPD), landmarks, feature masks
# out: OUT/work/rig.npz (+ rig-raw.json/.bin for the Node exporter)
#   Blender -b --factory-startup --python s40_rig.py -- [--extra]
import sys, os, heapq
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from mathutils.bvhtree import BVHTree
from mathutils import Vector

args = argv_after_dashes()
def arg(k, d):
    return type(d)(args[args.index('--' + k) + 1]) if '--' + k in args else d
KAPPA = arg('kappa', 0.15)        # lids meet this far up from the lower margin (share of the opening)
LID_T = arg('lid-t', 0.010)       # closed-lid clearance over the eyeball (sculpt units)
IRIS_DEG = arg('iris-deg', 24.0)  # iris half-angle on the eyeball (engine threshold is ~30 deg)
STRIP = arg('strip', 0.0)         # inner-lip strip depth (0 = off: the smoothed notch faces already read as lip thickness)
BL_UP = (arg('blink-up0', 0.035), arg('blink-up1', 0.18))   # upper-lid falloff (distance from the margin): rigid lid sheet, stretch above the crease
BL_LO = (arg('blink-lo0', 0.02), arg('blink-lo1', 0.09))
EYE_BACK_TOL = arg('eye-back-tol', 0.0025)  # allowed lid / eyeball overlap mid-blink before the eyeball retreats (sculpt units)
SOCK_ATTACH = (arg('sock-a0', 0.03), arg('sock-a1', 0.16))  # socket rim follows the lip edge within this distance
TH_SMOOTH = arg('th-smooth', 60)   # diffusion passes on the blink rotation-angle field
TAUBIN_EYE = arg('taubin-eye', 0.03)  # no smoothing this close to the lid margins
TAUBIN_LIP = arg('taubin-lip', 0.05)  # no smoothing on the vermilion (this far from the seam)
TAUBIN = arg('taubin', 10)        # Taubin smoothing passes on the rest skin away from the features (0 = off)

TARGETS = ['jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthSmile_L', 'mouthSmile_R', 'mouthStretch_L', 'mouthStretch_R',
           'mouthLowerDown_L', 'mouthLowerDown_R', 'mouthUpperUp_L', 'mouthUpperUp_R', 'eyeBlink_L', 'eyeBlink_R',
           'eyeWide_L', 'eyeWide_R', 'eyeSquint_L', 'eyeSquint_R', 'browInnerUp_L', 'browInnerUp_R']
if '--extra' in args:
    TARGETS += ['mouthPress_L', 'mouthPress_R', 'mouthRollLower', 'mouthRollUpper', 'browDown_L', 'browDown_R']
LOOKS = ['eyeLookUp_L', 'eyeLookUp_R', 'eyeLookDown_L', 'eyeLookDown_R', 'eyeLookIn_L', 'eyeLookIn_R', 'eyeLookOut_L', 'eyeLookOut_R']
PART = dict(skin=0, mouth=1, teeth=2, sclera=3, iris=4, lacrimal=5)

d = np.load(WORK + '/dec.npz')
VS, FS, CS = d['V'].copy(), d['F'].copy(), d['comp'].copy()
LMS = json.load(open(WORK + '/landmarks.json'))
fit = np.load(WORK + '/fit.npz')
XI, X0I, sI, RI, JI, interior = fit['X'], fit['X0'], float(fit['s']), fit['R'], fit['J'], fit['interior_face']
VI, polys, pg = load_ict()
TI = np.load(WORK + '/ict_tris.npy'); TGI = np.load(WORK + '/ict_trigroup.npy'); VGI = np.load(WORK + '/ict_vgroup.npy')
EYE_R = 0.1755
eyes = LMS['eyes']            # [0] = -x (subject's right), [1] = +x (subject's left)
mc = LMS['mouthCorner']
seamC = np.array(LMS['seamColumns'])
def seam_y(x):
    return np.interp(np.abs(x), seamC[:, 0], seamC[:, 1])

# clamp J singular values (the fit squeezes / stretches some regions a lot)
if '--no-j' in args: JI = np.tile(np.eye(3), (len(JI), 1, 1))
U_, S_, Vt_ = np.linalg.svd(JI)
S_ = np.clip(S_, 0.35, 2.2)
JI = U_ @ (S_[..., None] * Vt_)

# ================================================================ A. eye openings
head_tri = CS[FS[:, 0]] == 0
cen = VS[FS].mean(1)
drop = np.zeros(len(FS), bool)
for e in eyes:
    c = np.array(e['centre'])
    drop |= head_tri & (np.linalg.norm(cen - c, axis=1) < EYE_R - 0.0005) & (cen[:, 2] > c[2] - 0.05)
FS = FS[~drop]
log('eye openings: dropped', int(drop.sum()), 'hidden skin triangles')
def boundary_loops(F):
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    Es = np.sort(E, axis=1)
    ue, inv, cnt = np.unique(Es, axis=0, return_inverse=True, return_counts=True)
    bmask = cnt[inv.ravel()] == 1
    bE = E[bmask]  # oriented boundary edges
    nxt = {a: b for a, b in bE}
    loops, seen = [], set()
    for a in nxt:
        if a in seen: continue
        L = [a]; seen.add(a); cur = nxt[a]
        while cur != a and cur not in seen:
            L.append(cur); seen.add(cur); cur = nxt.get(cur, a)
        loops.append(L)
    return loops
margins = []
for e in eyes:
    c = np.array(e['centre'])
    loops = boundary_loops(FS)
    best = min(loops, key=lambda L: abs(np.linalg.norm(VS[L].mean(0) - c) - EYE_R) + 10 * (np.linalg.norm(VS[L].mean(0)[:2] - c[:2]) > 0.2))
    L = np.array(best)
    # snap onto the sphere
    dv = VS[L] - c
    VS[L] = c + dv / np.linalg.norm(dv, axis=1, keepdims=True) * (EYE_R + 0.0006)
    margins.append(L)
    log('eye margin loop', len(L), 'verts, centre', VS[L].mean(0).round(3))

# ================================================================ B. lip cut
headV = np.unique(FS[CS[FS[:, 0]] == 0])
Eh = FS[CS[FS[:, 0]] == 0]
adj = {}
for a, b in np.unique(np.sort(np.concatenate([Eh[:, [0, 1]], Eh[:, [1, 2]], Eh[:, [2, 0]]]), axis=1), axis=0):
    adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
def seam_dist(p):
    x = np.clip(abs(p[0]), 0, mc[0])
    y = np.interp(x, seamC[:, 0], seamC[:, 1]); z = np.interp(x, seamC[:, 0], seamC[:, 2])
    return np.hypot(p[1] - y, p[2] - z) + max(0, abs(p[0]) - mc[0]) * 3
def near_vertex(p, pool):
    return pool[np.argmin(np.linalg.norm(VS[pool] - p, axis=1))]
pool = headV[np.linalg.norm(VS[headV] - np.array([0, -1.0, 0.85]), axis=1) < 0.35]
cR = near_vertex(np.array([-mc[0], mc[1], mc[2]]), pool); cL = near_vertex(np.array(mc), pool)
def dijkstra(s, t, cost):
    dist = {s: 0.0}; prev = {}; pq = [(0.0, s)]
    while pq:
        dd, u = heapq.heappop(pq)
        if u == t: break
        if dd > dist[u]: continue
        for v in adj[u]:
            nd = dd + cost(u, v)
            if nd < dist.get(v, 1e18):
                dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
    path = [t]
    while path[-1] != s: path.append(prev[path[-1]])
    return path[::-1]
sd = {}
def sdist(v):
    if v not in sd: sd[v] = seam_dist(VS[v])
    return sd[v]
path = dijkstra(cR, cL, lambda u, v: np.linalg.norm(VS[u] - VS[v]) * (1 + ((sdist(u) + sdist(v)) / 2 / 0.0025) ** 2))
path = np.array(path)
# relax the path onto the smooth seam curve (removes the zig-zag of the triangulated grid)
for v in (path[1:-1] if '--relax-seam' in args else []):
    x = VS[v][0]
    VS[v][1] = seam_y(x); VS[v][2] = np.interp(abs(x), seamC[:, 0], seamC[:, 2])
log('seam path', len(path), 'verts from', VS[path[0]].round(3), 'to', VS[path[-1]].round(3), 'max seam dist', max(sdist(v) for v in path))
# split interior path vertices: fan around each vertex separated by the two path edges
nV = len(VS)
dup = {}
VS = np.concatenate([VS, VS[path[1:-1]]])       # duplicate slots for the lower-lip copies
CS = np.concatenate([CS, np.zeros(len(path) - 2, CS.dtype)])
tri_of_v = {}
for ti, f in enumerate(FS):
    for v in f: tri_of_v.setdefault(v, []).append(ti)
for k in range(1, len(path) - 1):
    v, p, n = path[k], path[k - 1], path[k + 1]
    T = tri_of_v[v]
    # flood over triangles sharing an edge (v, w) with w not in {p, n}
    groups = []
    left = set(T)
    while left:
        t0 = left.pop(); g = {t0}; st = [t0]
        while st:
            t = st.pop()
            others = [w for w in FS[t] if w != v]
            for t2 in list(left):
                o2 = [w for w in FS[t2] if w != v]
                share = set(others) & set(o2)
                if share and not (share <= {p, n}):
                    left.discard(t2); g.add(t2); st.append(t2)
        groups.append(g)
    if len(groups) != 2:
        log('  warn: path vertex', v, 'fan groups', len(groups)); continue
    gy = [np.mean([VS[FS[t]].mean(0)[1] for t in g]) for g in groups]
    lower = groups[int(np.argmin(gy))]
    nid = nV + k - 1; dup[v] = nid
    for t in lower:
        FS[t][FS[t] == v] = nid
upper_path = path.copy()
lower_path = np.array([path[0]] + [dup.get(v, v) for v in path[1:-1]] + [path[-1]])
log('lip cut: split', len(dup), 'vertices')
# smooth the cut: (1) 1-D Laplacian along the path (removes the grid zig-zag; both copies keep sharing positions),
# (2) a few position-Laplacian passes over the two rings of lip skin next to the cut (softens the sharp notch faces)
Pp = VS[path].copy()
for _ in range(12):
    Pp[1:-1] = 0.5 * Pp[1:-1] + 0.25 * (Pp[:-2] + Pp[2:])
VS[upper_path] = Pp; VS[lower_path] = Pp
Ecut = np.unique(np.sort(np.concatenate([FS[:, [0, 1]], FS[:, [1, 2]], FS[:, [2, 0]]]), axis=1), axis=0)
nb_c = [[] for _ in range(len(VS))]
for a, b in Ecut:
    nb_c[a].append(b); nb_c[b].append(a)
on_path = set(upper_path.tolist()) | set(lower_path.tolist())
ring = set()
front = set(on_path)
for _ in range(2):
    nxt_ = set()
    for v in front: nxt_ |= set(nb_c[v])
    nxt_ -= on_path; ring |= nxt_; front = nxt_
ring = np.array(sorted(ring))
for _ in range(4):
    avg = np.array([VS[nb_c[v]].mean(0) for v in ring])
    VS[ring] = 0.5 * VS[ring] + 0.5 * avg
log('cut smoothing: path', len(path), 'verts, lip ring', len(ring))
if TAUBIN > 0:
    # Taubin (lambda / mu) smoothing of the decimated skin on the cheeks / chin / forehead: removes the decimation
    # ripple that shows up when ICT's expressions stretch the skin; eyes, lids, lips, nose and ears are left untouched
    headS_ = np.unique(FS[CS[FS[:, 0]] == 0])
    Pv = VS[headS_]
    dist_feat = np.full(len(Pv), 9.0)
    for e, L_ in zip(eyes, margins):
        # lid rims + lash shelf only (the lid sheet, crease and brow get smoothed)
        dm = np.min(np.linalg.norm(Pv[:, None] - VS[L_][None], axis=2), axis=1)
        dist_feat = np.minimum(dist_feat, dm - TAUBIN_EYE)
    mid_ = LMS['mid']
    for p_, r_ in ((mid_['noseTip'], 0.16), (mid_['subnasale'], 0.05), ([0.15, -0.72, 0.8], 0.1), ([-0.15, -0.72, 0.8], 0.1), (mid_['nasion'], 0.08)):
        dist_feat = np.minimum(dist_feat, np.linalg.norm(Pv - np.array(p_), axis=1) - r_)
    # lips: the vermilion (about 0.05 either side of the seam) is kept, the philtrum / chin skin gets smoothed
    lipd = np.hypot(np.maximum(0, np.abs(Pv[:, 0]) - mc[0] - 0.01), np.maximum(0, np.abs(Pv[:, 1] - seam_y(Pv[:, 0])) - TAUBIN_LIP))
    lipd = np.where(Pv[:, 2] > 0.5, lipd, 9.0)
    dist_feat = np.minimum(dist_feat, lipd)
    wT = np.zeros(len(VS)); wT[headS_] = np.clip(dist_feat / 0.06, 0, 1)
    on_b = np.zeros(len(VS), bool)
    for L in boundary_loops(FS): on_b[L] = True
    on_b[list(on_path)] = True
    wT[on_b] = 0
    lapT = Laplacian(len(VS), Ecut)
    for _ in range(TAUBIN):
        VS += (0.5 * wT)[:, None] * (lapT.avg(VS) - VS)
        VS += (-0.53 * wT)[:, None] * (lapT.avg(VS) - VS)
    log('taubin: %d passes on %d verts (weight > 0)' % (TAUBIN, int((wT > 0).sum())))

# ================================================================ C. inner-lip strips
Ntmp = vertex_normals(VS, FS)
stripV, stripF, strip_parent = [], [], []
base = len(VS)
for side, P, tilt in ((('upper', upper_path, 0.45), ('lower', lower_path, -0.45)) if STRIP > 0 else ()):
    rings = [P]
    for frac in (0.5, 1.0):
        ring = []
        for k, v in enumerate(P):
            u = abs(VS[v][0]) / mc[0]
            taper = np.sqrt(max(0.0, 1 - min(u, 1) ** 2))
            n_in = np.array([-0.9 * VS[v][0], 0.0, -1.0]); n_in /= np.linalg.norm(n_in)   # toward the mouth arc's centre
            dvec = n_in + np.array([0, tilt, 0]); dvec /= np.linalg.norm(dvec)
            ring.append(base + len(stripV))
            stripV.append(VS[v] + dvec * STRIP * frac * taper); strip_parent.append(v)
        rings.append(np.array(ring))
    for r0, r1 in zip(rings[:-1], rings[1:]):
        for k in range(len(P) - 1):
            a, b, c_, d_ = r0[k], r0[k + 1], r1[k + 1], r1[k]
            for tri in ((a, b, c_), (a, c_, d_)):
                stripF.append(tri)
stripV = np.array(stripV).reshape(-1, 3); stripF = np.array(stripF, np.int64).reshape(-1, 3)
VS = np.concatenate([VS, stripV]); CS = np.concatenate([CS, np.full(len(stripV), 9)])
# orient strip triangles: upper strip faces down (toward the lower lip), lower strip faces up
Vt = VS
fn = np.cross(Vt[stripF[:, 1]] - Vt[stripF[:, 0]], Vt[stripF[:, 2]] - Vt[stripF[:, 0]])
half = len(stripF) // 2
flip = np.r_[fn[:half, 1] > 0, fn[half:, 1] < 0]
stripF[flip] = stripF[flip][:, [0, 2, 1]]
# drop degenerate strip tris at the tapered corners
area = np.linalg.norm(np.cross(Vt[stripF[:, 1]] - Vt[stripF[:, 0]], Vt[stripF[:, 2]] - Vt[stripF[:, 0]]), axis=1)
stripF = stripF[area > 1e-9]
strip_parent = np.array(strip_parent, np.int64)
skinF = np.concatenate([FS, stripF])
log('inner-lip strips', len(stripV), 'verts', len(stripF), 'tris')

# ================================================================ C2. mouth socket + teeth (fitted ICT)
bvhHead = BVHTree.FromPolygons(VS.tolist(), FS[CS[FS[:, 0]] == 0].tolist())
def inside_head(p):
    q = Vector(p); hits = 0
    for _ in range(30):
        h = bvhHead.ray_cast(q + Vector((0, 0, 1e-5)), Vector((0, 0, 1)))
        if h[0] is None: break
        hits += 1; q = h[0] + Vector((0, 0, 1e-4))
    return hits % 2 == 1
def sub_mesh(mask_tri):
    T = TI[mask_tri]
    used = np.unique(T); remap = -np.ones(len(VI), np.int64); remap[used] = np.arange(len(used))
    return used, remap[T]
# mouth-local affine X ~ A X0 + b from the fitted lip / chin / cheek surface around the mouth: moves the socket and
# teeth rigidly-ish with the sculpt's (narrower) mouth instead of the lip-by-lip Gaussian extension
mc0 = X0I[ICT_LM68[62]]
selA = np.where((VGI == 0) & ~interior & (np.linalg.norm(X0I - mc0, axis=1) < 0.22))[0]
MA = np.linalg.lstsq(np.c_[X0I[selA], np.ones(len(selA))], XI[selA], rcond=None)[0]
A_m, b_m = MA[:3].T, MA[3]
log('mouth affine from', len(selA), 'verts; singular values', np.linalg.svd(A_m)[1].round(3))
mouth_map = lambda Q: Q @ A_m.T + b_m
sockI, sockF = sub_mesh(TGI == 2)
n_socket = len(sockI)
if '--no-gums' not in args:
    # gums + tongue (ICT group 5) join the dark interior: they hide the tooth roots seen through an open mouth
    gumI, gumF = sub_mesh(TGI == 5)
    sockF = np.concatenate([sockF, gumF + len(sockI)]); sockI = np.concatenate([sockI, gumI])
sockV = mouth_map(X0I[sockI])
log('mouth interior: socket', n_socket, 'verts, gums + tongue', len(sockI) - n_socket, 'verts')
# teeth: decimate in Blender, then bind each decimated vertex to the nearest original tooth vertex (same jaw)
# upper (17039-19246) and lower (19247-21450) teeth are decimated and bound separately so no vertex picks up
# the other jaw's motion
import bpy
from mathutils.kdtree import KDTree
reset_scene()
tV_, tF_, tS_ = [], [], []
# ICT's 32 teeth are separate shells (8 per quadrant, molar -> central incisor); the molars (tooth centroid deeper
# than TEETH_ZMIN cm in ICT space) only ever show as clutter through the mouth corners and are dropped
Tt = TI[TGI == 6]
Et = edges_of(Tt); tlab = np.arange(len(VI))
for _ in range(500):
    m_ = np.minimum(tlab[Et[:, 0]], tlab[Et[:, 1]]); new_ = tlab.copy()
    np.minimum.at(new_, Et[:, 0], m_); np.minimum.at(new_, Et[:, 1], m_); new_ = new_[new_]
    if (new_ == tlab).all(): break
    tlab = new_
tz = {c: VI[np.unique(Tt)][tlab[np.unique(Tt)] == c][:, 2].mean() for c in np.unique(tlab[np.unique(Tt)])}
TEETH_ZMIN = arg('teeth-zmin', 8.0)
keep_tooth = np.array([tz.get(tlab[a], -1e9) > TEETH_ZMIN for a in TI[:, 0]])
log('teeth: keeping', sum(1 for z_ in tz.values() if z_ > TEETH_ZMIN), 'of', len(tz), 'teeth (centroid z >', TEETH_ZMIN, 'cm)')
for lo_, hi_ in ((17039, 19246), (19247, 21450)):
    sel_t = (TGI == 6) & (TI.min(1) >= lo_) & (TI.max(1) <= hi_) & keep_tooth
    tI, tF0 = sub_mesh(sel_t)
    obT = make_mesh('teeth', mouth_map(X0I[tI]), tF0)
    if arg('teeth-ratio', 1.0) < 1.0:
        m = obT.modifiers.new('dec', 'DECIMATE'); m.ratio = arg('teeth-ratio', 1.0)
        bpy.context.view_layer.objects.active = obT; obT.select_set(True)
        bpy.ops.object.modifier_apply(modifier='dec')
    Vt_, Ft_ = mesh_arrays(obT)
    kdT = KDTree(len(tI))
    for j, i in enumerate(tI): kdT.insert(mouth_map(X0I[i]), j)
    kdT.balance()
    tF_.append(Ft_ + sum(len(a) for a in tV_)); tV_.append(Vt_); tS_.append(np.array([tI[kdT.find(p)[1]] for p in Vt_]))
teethV, teethF, teeth_src = np.concatenate(tV_), np.concatenate(tF_), np.concatenate(tS_)
# push socket vertices that poke out of the head back inside (toward the mouth centre)
mcen = np.array([0, seam_y(0) + 0.02, 0.55])
out = np.array([not inside_head(p) for p in sockV])
log('socket verts outside the head', int(out.sum()), '/', len(sockV))
for i in np.where(out)[0]:
    p = sockV[i]
    for s_ in np.linspace(0.97, 0.3, 30):
        q = mcen + (p - mcen) * s_
        if inside_head(q): sockV[i] = mcen + (p - mcen) * max(0.3, s_ - 0.03); break
outT = np.array([not inside_head(p) for p in teethV])
log('teeth verts outside the head', int(outT.sum()), '/', len(teethV))
shift = 0.0
while outT.any() and shift < 0.08:
    shift += 0.004
    outT = np.array([not inside_head(p - [0, 0, shift]) for p in teethV])
teethV = teethV - [0, 0, shift]
log('teeth pushed back by', round(shift, 3), '; still outside', int(outT.sum()))
# incisor clearance behind the lip seam (midline)
inc = teethV[np.abs(teethV[:, 0]) < 0.03]
log('teeth front z %.4f vs seam z %.4f' % (inc[:, 2].max() if len(inc) else np.nan, np.interp(0, seamC[:, 0], seamC[:, 2])))

# ================================================================ D. eyeballs (UV spheres around the gaze axis)
eyeV, eyeF, eyeAttr, eyePart, eyeSide = [], [], [], [], []
gaze = []
for side, e in enumerate(eyes):
    c = np.array(e['centre'])
    P = np.array(e['contour'])
    xi_, xo_ = e['inner'][0], e['outer'][0]
    ymid = 0.5 * (e['upTop'][1] + e['loBot'][1])
    tgt = np.array([0.5 * (xi_ + xo_), ymid + 0.15 * (e['upTop'][1] - e['loBot'][1]), 0])
    dxy = (tgt[:2] - c[:2]) / EYE_R
    ax = np.array([dxy[0], dxy[1], np.sqrt(max(0, 1 - dxy @ dxy))])
    gaze.append(ax)
    up0 = np.array([0, 1, 0.]); ey = up0 - (up0 @ ax) * ax; ey /= np.linalg.norm(ey); ex = np.cross(ey, ax)
    NR, NSG = 30, 48
    base_i = len(eyeV)
    pole = c + ax * EYE_R
    eyeV.append(pole); eyeAttr.append(1.0)
    for i in range(1, NR):
        th = np.pi * (i / NR) ** 1.3   # denser rings toward the cornea (iris / pupil edges)
        for j in range(NSG):
            ph = 2 * np.pi * j / NSG
            dvec = np.cos(th) * ax + np.sin(th) * (np.cos(ph) * ex + np.sin(ph) * ey)
            eyeV.append(c + EYE_R * dvec)
            eyeAttr.append(np.cos(min(np.pi, th * 30.1 / IRIS_DEG)))
    back = len(eyeV); eyeV.append(c - ax * EYE_R); eyeAttr.append(-1.0)
    ring = lambda i: base_i + 1 + (i - 1) * NSG
    for j in range(NSG):
        eyeF.append((base_i, ring(1) + j, ring(1) + (j + 1) % NSG))
    for i in range(1, NR - 1):
        for j in range(NSG):
            a, b = ring(i) + j, ring(i) + (j + 1) % NSG
            c2, d2 = ring(i + 1) + (j + 1) % NSG, ring(i + 1) + j
            eyeF += [(a, d2, c2), (a, c2, b)]
    for j in range(NSG):
        eyeF.append((back, ring(NR - 1) + (j + 1) % NSG, ring(NR - 1) + j))
    eyeSide += [side] * (len(eyeV) - base_i)
eyeV = np.array(eyeV); eyeF = np.array(eyeF); eyeAttr = np.array(eyeAttr); eyeSide = np.array(eyeSide)
ang = np.arccos(np.clip([(p - np.array(eyes[s_]['centre'])) @ gaze[s_] / EYE_R for p, s_ in zip(eyeV, eyeSide)], -1, 1))
iris_v = np.degrees(ang) < IRIS_DEG
# orient: outward normals
fn = np.cross(eyeV[eyeF[:, 1]] - eyeV[eyeF[:, 0]], eyeV[eyeF[:, 2]] - eyeV[eyeF[:, 0]])
cc = np.array([eyes[s_]['centre'] for s_ in eyeSide[eyeF[:, 0]]])
bad = (fn * (eyeV[eyeF].mean(1) - cc)).sum(1) < 0
eyeF[bad] = eyeF[bad][:, [0, 2, 1]]
log('eyeballs', len(eyeV), 'verts', len(eyeF), 'tris; gaze axes', [g.round(3).tolist() for g in gaze], 'iris verts', int(iris_v.sum()))

# ================================================================ E. binding skin -> fitted ICT, delta transfer
NIv = len(VI)
lowerness = np.linalg.norm(load_ict_expr('jawOpen', VI), axis=1)
lowerness /= lowerness[ICT_LM68[66]]
okT = (TGI <= 1) & ~interior[TI].any(1)
TB = TI[okT]
lowT = lowerness[TB].mean(1)
bvhAll = BVHTree.FromPolygons(XI.tolist(), TB.tolist())
bvhUp = BVHTree.FromPolygons(XI.tolist(), TB[lowT < 0.5].tolist())
bvhLo = BVHTree.FromPolygons(XI.tolist(), TB[lowT >= 0.5].tolist())
TBu, TBl = TB[lowT < 0.5], TB[lowT >= 0.5]
skin_idx = np.unique(skinF)
NSk = len(VS)
is_lower_copy = np.zeros(NSk, bool); is_lower_copy[list(dup.values())] = True
is_upper_path = np.zeros(NSk, bool); is_upper_path[upper_path[1:-1]] = True
strip_side = np.zeros(NSk, np.int8)  # +1 upper strip, -1 lower strip
nstrip = len(stripV)
strip_ids = np.arange(NSk - nstrip, NSk)
strip_side[strip_ids[: nstrip // 2]] = 1; strip_side[strip_ids[nstrip // 2:]] = -1
def bary(p, a, b, c):
    v0, v1, v2 = b - a, c - a, p - a
    d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1
    d20, d21 = v2 @ v0, v2 @ v1
    den = d00 * d11 - d01 * d01
    v = (d11 * d20 - d01 * d21) / den; w = (d00 * d21 - d01 * d20) / den
    b_ = np.clip(np.array([1 - v - w, v, w]), 0, None)
    return b_ / b_.sum()
bind_t = np.zeros((NSk, 3), np.int64); bind_b = np.zeros((NSk, 3)); bind_d = np.zeros(NSk)
# mouth band split topologically: flood from the lower-lip copies inside the band (the cut separates the lips there)
band = np.zeros(NSk, bool)
bi = skin_idx[(np.abs(VS[skin_idx, 0]) < mc[0] - 0.012) & (np.abs(VS[skin_idx, 1] - seam_y(VS[skin_idx, 0])) < 0.07) & (VS[skin_idx, 2] > 0.6) & (CS[skin_idx] == 0)]
band[bi] = True
nbr_s = [[] for _ in range(NSk)]
for a, b in np.unique(np.sort(np.concatenate([FS[:, [0, 1]], FS[:, [1, 2]], FS[:, [2, 0]]]), axis=1), axis=0):
    nbr_s[a].append(b); nbr_s[b].append(a)
lower_set = np.zeros(NSk, bool)
st = [v for v in dup.values() if band[v]]
for v in st: lower_set[v] = True
while st:
    u = st.pop()
    for w in nbr_s[u]:
        if band[w] and not lower_set[w] and not is_upper_path[w]:
            lower_set[w] = True; st.append(w)
log('mouth band', int(band.sum()), 'verts, lower lip side', int(lower_set.sum()))
nband = 0
for i in skin_idx:
    if strip_side[i] != 0: continue
    p = VS[i]
    in_band = band[i]
    if in_band:
        nband += 1
        up = not lower_set[i]
        bvh, TT = (bvhUp, TBu) if up else (bvhLo, TBl)
    else:
        bvh, TT = bvhAll, TB
    co, no, fi, dist = bvh.find_nearest(Vector(p))
    tri = TT[fi]
    bind_t[i] = tri; bind_b[i] = bary(np.array(co), XI[tri[0]], XI[tri[1]], XI[tri[2]]); bind_d[i] = dist
log('bound', len(skin_idx) - nstrip, 'skin verts (mouth band', nband, '); distance p50 %.4f p95 %.4f max %.4f' % (
    np.median(bind_d[skin_idx]), np.percentile(bind_d[skin_idx], 95), bind_d[skin_idx].max()))
lapS = Laplacian(NSk, np.unique(np.sort(np.concatenate([skinF[:, [0, 1]], skinF[:, [1, 2]], skinF[:, [2, 0]]]), axis=1), axis=0))
def ict_delta(name):
    D = load_ict_expr(name, VI)                  # cm, ICT frame
    D = (sI * (RI @ D.T)).T                       # sculpt units / frame
    return np.einsum('nij,nj->ni', JI, D)          # through the fit's deformation gradient
# ears + neck (separate shells that intersect the head): near the junction they copy the nearest head vertex
from mathutils.kdtree import KDTree as _KD
headS = skin_idx[(CS[skin_idx] == 0)]
kdH = _KD(len(headS))
for j, i in enumerate(headS): kdH.insert(VS[i], j)
kdH.balance()
attach = skin_idx[np.isin(CS[skin_idx], (3, 4, 5))]
att_near = np.zeros(len(attach), np.int64); att_w = np.zeros(len(attach))
for k, i in enumerate(attach):
    co, j, dist = kdH.find(VS[i])
    att_near[k] = headS[j]
def _ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
att_w = np.array([1 - _ss(0.03, 0.25, kdH.find(VS[i])[2]) for i in attach])
SMOOTH_IT = arg('smooth', 10)
# extra delta smoothing per target: ICT's pucker / funnel scans carry fine lip-compression wrinkles
SMOOTH_EXTRA = dict(mouthFunnel=arg('smooth-round', 30), mouthPucker=arg('smooth-round', 30))
def skin_delta(DI, it=None):
    out = np.zeros((NSk, 3))
    out[skin_idx] = (bind_b[skin_idx, :, None] * DI[bind_t[skin_idx]]).sum(1)
    out[strip_ids] = out[strip_parent]
    out = lapS.smooth(out, SMOOTH_IT if it is None else it, 0.5)
    out[attach] = att_w[:, None] * out[att_near] + (1 - att_w[:, None]) * out[attach]
    out[strip_ids] = out[strip_parent]
    return out

# socket rim -> lip edge: socket vertices near the cut copy the motion of the nearest inner-lip vertex (upper-jaw
# socket parts follow the upper lip, lower-jaw parts the lower lip) so the dark interior never pokes in front of a lip
low_sock = lowerness[sockI] >= 0.5
sock_nn = np.zeros(len(sockV), np.int64); sock_w = np.zeros(len(sockV))
is_sock = np.arange(len(sockI)) < n_socket   # only the socket rim follows the lips; gums stay with the teeth
for pool_, sel_ in ((upper_path, ~low_sock & is_sock), (lower_path, low_sock & is_sock)):
    Pp_ = VS[pool_]
    ii = np.where(sel_)[0]
    dd_ = np.linalg.norm(sockV[ii, None] - Pp_[None], axis=2)
    j_ = np.argmin(dd_, axis=1)
    sock_nn[ii] = pool_[j_]; sock_w[ii] = 1 - _ss(SOCK_ATTACH[0], SOCK_ATTACH[1], dd_[np.arange(len(ii)), j_])
log('socket rim: %d verts follow the lips (weight > 0.5: %d)' % (int((sock_w > 0).sum()), int((sock_w > 0.5).sum())))

if '--debug-seam' in args:
    DJ = skin_delta(ict_delta('jawOpen'))
    DJraw = np.zeros((NSk, 3)); DJraw[skin_idx] = (bind_b[skin_idx, :, None] * ict_delta('jawOpen')[bind_t[skin_idx]]).sum(1)
    for k in range(1, len(path) - 1):
        vu, vl = upper_path[k], lower_path[k]
        nl = [w for w in nbr_s[vl] if lower_set[w] and w != vl]
        print('x %+.3f  up |D| %.4f  lo |D| %.4f raw %.4f (low %.2f dist %.4f)  lo-nbrs %.4f raw %.4f' % (VS[vu][0], np.linalg.norm(DJ[vu]), np.linalg.norm(DJ[vl]), np.linalg.norm(DJraw[vl]),
              lowerness[bind_t[vl]].mean(), bind_d[vl], np.mean([np.linalg.norm(DJ[w]) for w in nl]) if nl else -1, np.mean([np.linalg.norm(DJraw[w]) for w in nl]) if nl else -1))

# ================================================================ F. procedural blink
def lid_frames():
    out = []
    for side, e in enumerate(eyes):
        c = np.array(e['centre']); L = margins[side]
        inner, outer = np.array(e['inner']), np.array(e['outer'])
        axis = outer - inner; span = np.linalg.norm(axis); axis /= span
        P = VS[L]
        u = (P - inner) @ axis / span
        # upper vs lower: above / below the corner line
        yline = inner[1] + u * (outer[1] - inner[1])
        up = P[:, 1] > yline
        us = np.linspace(0, 1, 81)
        def curve(sel):
            uu, PP = u[sel], P[sel]; o = np.argsort(uu)
            return np.array([np.interp(us, uu[o], PP[o, k]) for k in range(3)]).T
        U, Lo = curve(up), curve(~up)
        M = Lo + KAPPA * (U - Lo)
        def angle_about(a, b):  # signed angle about axis from vector a to b (both from c)
            a = a - (a @ axis) * axis; b = b - (b @ axis) * axis
            return np.arctan2(np.cross(a, b) @ axis, a @ b)
        th_up = np.array([angle_about(U[k] - c, M[k] - c) for k in range(len(us))])
        th_lo = np.array([angle_about(Lo[k] - c, M[k] - c) for k in range(len(us))])
        out.append(dict(c=c, axis=axis, inner=inner, span=span, us=us, U=U, Lo=Lo, M=M, th_up=th_up, th_lo=th_lo, margin=L, margin_up=L[up], margin_lo=L[~up]))
        log('eye', side, 'blink: upper lid travel %.1f deg, lower %.1f deg (centre column)' % (np.degrees(th_up[40]), np.degrees(th_lo[40])))
    return out
LIDS = lid_frames()
def rot(v, axis, th):
    k = axis; c_, s_ = np.cos(th), np.sin(th)
    return v * c_[:, None] + np.cross(k, v) * s_[:, None] + k[None] * (v @ k)[:, None] * (1 - c_)[:, None]
def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def poly_dist(P, Q):
    """distance from points P to polyline Q"""
    best = np.full(len(P), 1e9)
    for a, b in zip(Q[:-1], Q[1:]):
        ab = b - a; t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
        best = np.minimum(best, np.linalg.norm(P - (a + t[:, None] * ab), axis=1))
    return best
def angle_about_v(A, B, axis):
    """signed angles about axis from the rows of A to the rows of B"""
    A = A - (A @ axis)[:, None] * axis[None]; B = B - (B @ axis)[:, None] * axis[None]
    return np.arctan2(np.cross(A, B) @ axis, (A * B).sum(1))
def curve_at(Lf, key, u):
    return np.array([np.interp(u, Lf['us'], Lf[key][:, k]) for k in range(3)]).T
def blink_delta(side):
    """The lids ROTATE about the eyeball's horizontal axis (through its centre, corner to corner): the lid sheet slides
    over the eyeball without being compressed (no crumpling of the lash shelf), the skin above the lid crease stretches.
    Upper / lower margins land exactly on the meeting curve M."""
    Lf = LIDS[side]; c = Lf['c']; ax = Lf['axis']
    D = np.zeros((NSk, 3)); mblend = np.zeros(NSk)
    cand = skin_idx[(np.linalg.norm(VS[skin_idx] - c, axis=1) < 0.6) & (CS[skin_idx] == 0)]
    P = VS[cand]
    u = np.clip((P - Lf['inner']) @ ax / Lf['span'], 0, 1)
    Mu = curve_at(Lf, 'M', u)
    phiP = angle_about_v(Mu - c, P - c, ax)
    sgn_up = np.sign(np.median(Lf['th_up']))  # rotation U -> M; points above M have the opposite angle sign
    upper = phiP * sgn_up < 0
    dU = poly_dist(P, Lf['U']); dL = poly_dist(P, Lf['Lo'])
    w_up = 1 - smoothstep(BL_UP[0], BL_UP[1], dU); w_lo = 1 - smoothstep(BL_LO[0], BL_LO[1], dL)
    th = np.where(upper, np.interp(u, Lf['us'], Lf['th_up']) * w_up, np.interp(u, Lf['us'], Lf['th_lo']) * w_lo)
    # exact landing of the margin vertices on M
    pos = {int(v): k for k, v in enumerate(cand)}
    fixed = np.zeros(NSk, bool)
    for ids in (Lf['margin_up'], Lf['margin_lo']):
        kk = np.array([pos[int(v)] for v in ids if int(v) in pos])
        th[kk] = angle_about_v(P[kk] - c, Mu[kk] - c, ax)
        fixed[cand[kk]] = True
    # smooth the angle field over the skin (margins held): the column profile th(u) is steep near the corners, which
    # would shear the lid sheet into walls at its ends; diffusing it anchors the lid ends smoothly at the canthi
    TH = np.zeros(NSk); TH[cand] = th
    TH = lapS.smooth(TH, TH_SMOOTH, 0.5, fixed=fixed)
    th = TH[cand]
    Q = c + rot(P - c, ax, th)
    D[cand] = Q - P
    dd = np.where(upper, dU, dL)
    mblend[cand] = np.where(upper, 1 - smoothstep(BL_UP[1], BL_UP[1] + 0.08, dU), 1 - smoothstep(0.13, 0.22, dL))
    # the linear morph moves the margin along the chord, which dips into the eyeball mid-blink: find how far the
    # eyeball has to retreat along its gaze (linearly with the weight) to stay behind the lids (tolerance EYE_BACK_TOL)
    g = gaze[side]
    near = np.linalg.norm(P - c, axis=1) < EYE_R + 0.05
    moving = near & (np.abs(th) > 1e-4)
    back = 0.0
    for back in np.arange(0.0, 0.1, 0.0025):
        worst = 0.0
        for w in np.linspace(0.05, 1.0, 20):
            X = P[moving] + w * D[cand[moving]]
            r = np.linalg.norm(X - (c - back * w * g), axis=1)
            worst = max(worst, (EYE_R - r).max())
        if worst <= EYE_BACK_TOL: break
    log('eye', side, 'blink: rotated %d lid verts; eyeball retreat %.4f (overlap tol %.4f)' % (int((np.abs(th) > 1e-4).sum()), back, EYE_BACK_TOL))
    return D, mblend, back

# ================================================================ assemble per-part deltas
sock_src = sockI
def interior_delta(name):
    D = load_ict_expr(name, VI)
    D = (sI * (RI @ D.T)).T @ A_m.T
    return D[sock_src], D[teeth_src]
morph_names, morph_skin, morph_sock, morph_teeth, morph_eye = [], [], [], [], []
for name in TARGETS:
    DI = ict_delta(name)
    Ds = skin_delta(DI, SMOOTH_EXTRA.get(name))
    Dso, Dte = interior_delta(name)
    Dso = sock_w[:, None] * Ds[sock_nn] + (1 - sock_w[:, None]) * Dso
    De = np.zeros((len(eyeV), 3))
    if name.startswith('eyeBlink'):
        side = 1 if name.endswith('_L') else 0
        Dp, mb, back = blink_delta(side)
        if '--blink-pure' in args: mb = np.ones(NSk)
        Ds = mb[:, None] * Dp + (1 - mb[:, None]) * Ds
        De[eyeSide == side] = -back * gaze[side]
    if name.startswith('eye') and not name.startswith('eyeBlink'):
        # keep the lid margins out of the eyeball
        for side, Lf in enumerate(LIDS):
            c = Lf['c']
            near = skin_idx[np.linalg.norm(VS[skin_idx] - c, axis=1) < EYE_R + 0.04]
            q = VS[near] + Ds[near] - c
            r = np.linalg.norm(q, axis=1)
            fix = r < EYE_R + 0.002
            Ds[near[fix]] = c + q[fix] / r[fix, None] * (EYE_R + 0.002) - VS[near[fix]]
    morph_names.append(name); morph_skin.append(Ds); morph_sock.append(Dso); morph_teeth.append(Dte); morph_eye.append(De)
    mag = np.linalg.norm(Ds, axis=1)
    log('target %-18s skin max %.4f  socket max %.4f  teeth max %.4f' % (name, mag.max(), np.linalg.norm(Dso, axis=1).max(), np.linalg.norm(Dte, axis=1).max()))
for name in LOOKS:
    side = 1 if name.endswith('_L') else 0
    c = np.array(eyes[side]['centre'])
    sel = eyeSide == side
    deg = 25.0
    if 'Up' in name: axis, th = np.array([1., 0, 0]), -deg
    elif 'Down' in name: axis, th = np.array([1., 0, 0]), deg
    else:
        # In = toward the nose. +x eye looks toward -x; rotation about +y by -th moves +z toward -x
        toward_minus_x = ('In' in name) == (side == 1)
        axis, th = np.array([0, 1., 0]), (-deg if toward_minus_x else deg)
    De = np.zeros((len(eyeV), 3))
    v = eyeV[sel] - c
    De[sel] = rot(v, axis, np.full(sel.sum(), np.radians(th))) - v
    morph_names.append(name); morph_skin.append(np.zeros((NSk, 3))); morph_sock.append(np.zeros((len(sockV), 3)))
    morph_teeth.append(np.zeros((len(teethV), 3))); morph_eye.append(De)

# ================================================================ G. assemble + normalise
parts_v = []
skinV = VS; nskin = len(skinV)
allV = np.concatenate([skinV, sockV, teethV, eyeV])
off_sock = nskin; off_teeth = off_sock + len(sockV); off_eye = off_teeth + len(teethV)
vpart = np.concatenate([np.full(nskin, PART['skin']), np.full(len(sockV), PART['mouth']), np.full(len(teethV), PART['teeth']),
                        np.where(iris_v, PART['iris'], PART['sclera'])])
eye_attr = np.concatenate([np.zeros(nskin + len(sockV) + len(teethV)), eyeAttr])
eyeTriIris = iris_v[eyeF].any(1)
tri_sets = [(PART['skin'], skinF), (PART['mouth'], sockF + off_sock), (PART['teeth'], teethF + off_teeth),
            (PART['sclera'], eyeF[~eyeTriIris] + off_eye), (PART['iris'], eyeF[eyeTriIris] + off_eye)]
# compact: drop unreferenced skin vertices (the removed hidden eye skin)
allF = np.concatenate([t for _, t in tri_sets])
used = np.zeros(len(allV), bool); used[allF.ravel()] = True
remap = -np.ones(len(allV), np.int64); remap[used] = np.arange(used.sum())
parts = []
idx_list = []
start = 0
for pid, T in tri_sets:
    T2 = remap[T]
    idx_list.append(T2)
    parts.append(dict(name=[k for k, v in PART.items() if v == pid][0], id=pid, start=start * 3, count=len(T2) * 3))
    start += len(T2)
index = np.concatenate(idx_list)
V_all = allV[used]; part_all = vpart[used]; eye_all = eye_attr[used]
morphs = []
for k, name in enumerate(morph_names):
    Dall = np.concatenate([morph_skin[k], morph_sock[k], morph_teeth[k], morph_eye[k]])[used]
    morphs.append(Dall)
# normalisation
pupils = [np.array(eyes[s_]['centre']) + EYE_R * gaze[s_] for s_ in (1, 0)]  # L (+x), R (-x)
IPD = np.linalg.norm(pupils[0] - pupils[1]); Wsc = 2 * IPD
O = 0.5 * (pupils[0] + pupils[1]); S = 1 / Wsc
P = (V_all - O) * S
morphs = [m * S for m in morphs]
nrm = lambda p: ((np.asarray(p, np.float64) - O) * S)
log('normalisation: IPD %.4f sculpt units, W %.4f, origin %s; verts %d, tris %d' % (IPD, Wsc, O.round(4), len(P), len(index)))

# landmarks (fitted ICT LM68 -> sculpt positions; lips / eyes / nose from the sculpt measurements)
LM68 = [nrm(XI[i]) for i in ICT_LM68]
mouthC = nrm(seam_at := np.array([0, seam_y(0), np.interp(0, seamC[:, 0], seamC[:, 2])]))
mid = LMS['mid']
landmarks = dict(
    pupilL=nrm(pupils[0]).round(5).tolist(), pupilR=nrm(pupils[1]).round(5).tolist(),
    eyeCentreL=nrm(eyes[1]['centre']).round(5).tolist(), eyeCentreR=nrm(eyes[0]['centre']).round(5).tolist(),
    mouthCentre=mouthC.round(5).tolist(), mouthCornerL=nrm(mc).round(5).tolist(), mouthCornerR=nrm([-mc[0], mc[1], mc[2]]).round(5).tolist(),
    upperLip=nrm(mid['upperLip']).round(5).tolist(), lowerLip=nrm(mid['lowerLip']).round(5).tolist(),
    innerUpperLip=mouthC.round(5).tolist(), innerLowerLip=mouthC.round(5).tolist(),
    noseTip=nrm(mid['noseTip']).round(5).tolist(), chin=nrm(mid['chin45']).round(5).tolist(),
    multiPie68=[p.round(5).tolist() for p in LM68],
)
# sculpt-derived contours for the feature masks (normalised)
lip_outer_up, lip_outer_lo = [], []
yub, ylb = mid['upperLip'][1] - 0.01, mid['lowerLip'][1] - 0.045
for uu in np.linspace(-1, 1, 21):
    x = uu * mc[0]; yc = mc[1]
    bow = 0.012 * np.exp(-((abs(uu) - 0.28) / 0.16) ** 2) - 0.008 * np.exp(-(uu / 0.12) ** 2)
    lip_outer_up.append([x, yc + (yub - yc) * (1 - abs(uu) ** 2.4) + bow * (1 - abs(uu))])
    lip_outer_lo.append([x, yc + (ylb - yc) * (1 - uu ** 2)])
seam_line = [[x, seam_y(x)] for x in np.linspace(-mc[0], mc[0], 41)]
lid_up = []
for side in (1, 0):
    Lf = LIDS[side]
    lid_up.append(Lf['U'][:, :2].tolist())
contours = dict(lipOuterUp=lip_outer_up, lipOuterLo=lip_outer_lo, seam=seam_line, lidUpL=lid_up[0], lidUpR=lid_up[1])
contours = {k: [((np.array(p) - O[:2]) * S).round(5).tolist() for p in v] for k, v in contours.items()}

np.savez(WORK + '/rig.npz', P=P, index=index, part=part_all, eye=eye_all, morphs=np.array(morphs), names=np.array(morph_names), O=O, S=S)
# raw export for the Node exporter
hdr = dict(format='hero-face-rig-raw', name='cute', vertexCount=len(P), indexCount=int(index.size), parts=parts, partIds=PART,
           morphs=[n.replace('_L', 'Left').replace('_R', 'Right') if n[-2:] in ('_L', '_R') else n for n in morph_names], sources=morph_names,
           landmarks=landmarks, contours=contours, Wsculpt=Wsc, ipdSculpt=IPD, originSculpt=O.tolist(),
           params=dict(kappa=KAPPA, lidT=LID_T, irisDeg=IRIS_DEG, strip=STRIP))
blob = [P.astype(np.float32).tobytes(), index.astype(np.uint32).tobytes(), part_all.astype(np.float32).tobytes(), eye_all.astype(np.float32).tobytes()]
blob += [m.astype(np.float32).tobytes() for m in morphs]
open(WORK + '/rig-raw.bin', 'wb').write(b''.join(blob))
json.dump(hdr, open(WORK + '/rig-raw.json', 'w'), indent=1)
log('wrote rig-raw (%d morphs, %.1f MB)' % (len(morphs), sum(len(b) for b in blob) / 1e6))
