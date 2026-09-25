# Geometric feature extraction shared by the sculpt and ICT (same definitions on both meshes, so the
# correspondences are consistent): eyeball spheres, lid-margin outlines (surface / eyeball intersection),
# mid-sagittal profile landmarks, lip contact curves.
import heapq
import numpy as np

def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]; b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]; c = x[:3]
    return c, float(np.sqrt(x[3] + c @ c))

def adjacency(n, F):
    E = np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
    E = np.unique(E, axis=0)
    nb = [[] for _ in range(n)]
    for a, b in E:
        nb[a].append(b); nb[b].append(a)
    return E, nb

def dijkstra_path(nb, V, src, dst, cost_fn, allowed=None):
    dist = {src: 0.0}; prev = {}
    pq = [(0.0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == dst: break
        if d > dist.get(u, 1e18): continue
        for w in nb[u]:
            if allowed is not None and not allowed[w]: continue
            nd = d + cost_fn(u, w)
            if nd < dist.get(w, 1e18):
                dist[w] = nd; prev[w] = u; heapq.heappush(pq, (nd, w))
    path = [dst]
    while path[-1] != src:
        path.append(prev[path[-1]])
    return path[::-1]

def plane_x_profile(V, F, x0=0.0, zmin=-1e9):
    """intersection of the mesh with the plane x = x0 -> (m,3) points (unordered)"""
    s = V[:, 0] - x0 - 1.37e-6 * (np.abs(V).max())
    pts = []
    for (a, b) in ((0, 1), (1, 2), (2, 0)):
        ia, ib = F[:, a], F[:, b]
        m = (s[ia] * s[ib]) < 0
        t = s[ia[m]] / (s[ia[m]] - s[ib[m]])
        pts.append(V[ia[m]] + t[:, None] * (V[ib[m]] - V[ia[m]]))
    P = np.concatenate(pts)
    return P[P[:, 2] > zmin]

def profile_landmarks(P, y_eye, ipd, lip_edges):
    """P: midline points. lip_edges = (y of the upper lip's lower edge, y of the lower lip's upper edge) at x=0
    (the same value twice for closed lips). returns dict of named 3D points on the front profile."""
    ys = np.round(P[:, 1] / (ipd * 0.004)).astype(int)
    front = {}
    for i, k in enumerate(ys):
        if k not in front or P[i, 2] > P[front[k], 2]: front[k] = i
    Q = P[sorted(front.values(), key=lambda i: -P[i, 1])]  # top -> bottom
    y, z = Q[:, 1], Q[:, 2]
    def band(y0, y1):
        return np.nonzero((y <= max(y0, y1)) & (y >= min(y0, y1)))[0]
    yu, yl = lip_edges
    out = {}
    b = band(y_eye, y_eye - 1.2 * ipd); i_tip = b[np.argmax(z[b])]; out['noseTip'] = Q[i_tip]
    b = band(y_eye + 0.35 * ipd, y[i_tip]); b = b[y[b] > y[i_tip] + 0.25 * ipd]
    out['nasion'] = Q[b[np.argmin(z[b])]]
    b = band(yu + 0.01 * ipd, yu + 0.2 * ipd); i_ul = b[np.argmax(z[b])]; out['upperLipFront'] = Q[i_ul]
    b = np.arange(i_tip + 1, i_ul)
    ch = z[i_tip] + (y[b] - y[i_tip]) / (y[i_ul] - y[i_tip]) * (z[i_ul] - z[i_tip])
    out['subnasale'] = Q[b[np.argmax(ch - z[b])]]
    b = band(yl - 0.01 * ipd, yl - 0.2 * ipd); i_ll = b[np.argmax(z[b])]; out['lowerLipFront'] = Q[i_ll]
    b = band(y[i_ll] - 0.3 * ipd, y[i_ll] - 1.0 * ipd); i_pg = b[np.argmax(z[b])]; out['pogonion'] = Q[i_pg]
    b = np.arange(i_ll + 1, i_pg)
    ch = z[i_ll] + (y[b] - y[i_ll]) / (y[i_pg] - y[i_ll]) * (z[i_pg] - z[i_ll])
    out['sulcus'] = Q[b[np.argmax(ch - z[b])]]
    b = band(y[i_pg], y[i_pg] - 0.6 * ipd); b = b[b > i_pg]
    out['menton'] = Q[b[np.argmax(-y[b] - 0.6 * z[b])]]
    return out, Q

def lid_outline(V, F, c, r, frame_up=np.array([0, 1, 0.0]), nbins=72, vmask=None):
    """front-view outline of the region where the surface dips below the eyeball sphere (the lid margin).
    returns (nbins,3) points ordered by angle around the eye axis (+z), NaN where missing."""
    phi = np.linalg.norm(V - c, axis=1) - r
    if vmask is not None:
        phi = np.where(vmask, phi, np.nan)
    pts = []
    for (a, b) in ((0, 1), (1, 2), (2, 0)):
        ia, ib = F[:, a], F[:, b]
        pa, pb = phi[ia], phi[ib]
        m = np.isfinite(pa) & np.isfinite(pb) & (pa * pb < 0)
        t = pa[m] / (pa[m] - pb[m])
        pts.append(V[ia[m]] + t[:, None] * (V[ib[m]] - V[ia[m]]))
    P = np.concatenate(pts)
    d = P - c
    P = P[d[:, 2] > 0.35 * r]  # front cap only
    d = P - c
    ang = np.arctan2(d[:, 1], d[:, 0])
    rad = np.hypot(d[:, 0], d[:, 1])
    bins = ((ang + np.pi) / (2 * np.pi) * nbins).astype(int) % nbins
    out = np.full((nbins, 3), np.nan)
    best = np.full(nbins, -1.0)
    for i in range(len(P)):
        k = bins[i]
        if rad[i] > best[k]:
            best[k] = rad[i]; out[k] = P[i]
    return out

def split_outline(O):
    """split an angle-ordered outline into canthi + upper/lower arcs (each ordered by x ascending)"""
    ok = np.isfinite(O[:, 0])
    P = O[ok]
    iL, iR = np.argmin(P[:, 0]), np.argmax(P[:, 0])
    a, b = P[iL], P[iR]
    mid = lambda x: a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1])
    up = P[P[:, 1] > mid(P[:, 0])]; lo = P[P[:, 1] < mid(P[:, 0])]
    up = up[np.argsort(up[:, 0])]; lo = lo[np.argsort(lo[:, 0])]
    return a, b, up, lo

def resample_curve(P, ts):
    """P ordered polyline; ts in [0,1] by arc length"""
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    s = np.r_[0, np.cumsum(seg)]; s /= s[-1]
    return np.stack([np.interp(ts, s, P[:, k]) for k in range(3)], 1)

def resample_by_x(P, x0, x1, ts):
    """P ordered by x; sample at x = x0 + t (x1 - x0)"""
    xs = x0 + np.asarray(ts) * (x1 - x0)
    return np.stack([np.interp(xs, P[:, 0], P[:, k]) for k in range(3)], 1)

def vertex_normals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    l = np.linalg.norm(N, axis=1, keepdims=True); l[l == 0] = 1
    return N / l

# ------------------------------------------------------------------ front-view ray casting (Blender BVH)
def make_bvh(V, F):
    from mathutils.bvhtree import BVHTree
    return BVHTree.FromPolygons([tuple(v) for v in V], [tuple(int(i) for i in f) for f in F], all_triangles=True)

def front_cast(bvh, x0, x1, y0, y1, nx, ny, zstart):
    """rays along -z from z = zstart over a grid; returns hit tri index grid (-1 = miss) and hit points"""
    from mathutils import Vector
    xs = np.linspace(x0, x1, nx); ys = np.linspace(y1, y0, ny)   # rows top -> bottom
    idx = -np.ones((ny, nx), np.int64); pts = np.full((ny, nx, 3), np.nan)
    d = Vector((0, 0, -1))
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            loc, nrm, k, dist = bvh.ray_cast(Vector((x, y, zstart)), d)
            if k is not None:
                idx[j, i] = k; pts[j, i] = loc
    return idx, pts, xs, ys

def aperture_outline(target_mask, pts, center_xy, nbins=96):
    """target_mask (ny,nx) bool = ray hits the eyeball; outline = outermost target pixel per angle bin"""
    J, I = np.nonzero(target_mask)
    P = pts[J, I]
    d = P[:, :2] - center_xy
    ang = np.arctan2(d[:, 1], d[:, 0]); rad = np.hypot(d[:, 0], d[:, 1])
    bins = ((ang + np.pi) / (2 * np.pi) * nbins).astype(int) % nbins
    out = np.full((nbins, 3), np.nan); best = np.full(nbins, -1.0)
    for k in range(len(P)):
        b = bins[k]
        if rad[k] > best[b]: best[b] = rad[k]; out[b] = P[k]
    return out

def gap_edges(gap_mask, pts):
    """per column: the lip surface point just above / below the gap (first non-gap hit)"""
    ny, nx = gap_mask.shape
    up, lo, cols = [], [], []
    for i in range(nx):
        g = np.nonzero(gap_mask[:, i])[0]
        if not len(g): continue
        j0, j1 = g.min(), g.max()
        if j0 - 1 < 0 or j1 + 1 >= ny: continue
        a, b = pts[j0 - 1, i], pts[j1 + 1, i]
        if np.isfinite(a).all() and np.isfinite(b).all():
            up.append(a); lo.append(b); cols.append(i)
    return np.array(up), np.array(lo), np.array(cols)
