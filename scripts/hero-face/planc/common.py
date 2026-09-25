# Plan C shared helpers (copied from plan B, adapted for the 'free Cute girl face' sculpt) (run inside headless Blender 4.4: numpy 1.26, no scipy).
# All geometry lives in "OBJ space": +Y up, +Z toward the viewer, X to the viewer's right
# (= subject's left). Blender objects are created in that same space; cameras are rotated to match.
import os, sys, time, json, math
import numpy as np

REPO = '/Users/onuroztaskiran/FE Apps/tt6/gbolanding'
SCULPT_OBJ = REPO + '/.cache/hero-face/sketchfab-cute/cute-girl-face.obj'
ICT_DIR = REPO + '/.cache/hero-face/ict'
OUT = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc'
WORK = OUT + '/work'
os.makedirs(WORK, exist_ok=True)

T0 = time.time()
def log(*a):
    print('[%6.1fs]' % (time.time() - T0), *a, flush=True)

# ------------------------------------------------------------------ OBJ io
def parse_obj(path, want_faces=True):
    """OBJ parser: returns V (n,3) float64, list of polygons (0-based) and a group id per polygon."""
    with open(path, 'r') as f:
        txt = f.read()
    lines = txt.split('\n')
    vl = [l[2:] for l in lines if l.startswith('v ')]
    V = np.array(' '.join(vl).split(), dtype=np.float64).reshape(-1, 3)
    if not want_faces:
        return V, None
    polys, pgrp, gnames = [], [], {}
    g = 0
    for l in lines:
        if l.startswith('f '):
            polys.append([int(t.split('/')[0]) - 1 for t in l[2:].split()])
            pgrp.append(g)
        elif l.startswith('g '):
            nm = l[2:].strip()
            g = gnames.setdefault(nm, len(gnames))
    parse_obj.groups = gnames
    parse_obj.pgroup = np.array(pgrp, np.int64)
    return V, polys

def tri_of_polys(polys):
    T = []
    for p in polys:
        for k in range(1, len(p) - 1):
            T.append((p[0], p[k], p[k + 1]))
    return np.array(T, dtype=np.int64)

def load_sculpt():
    """triangulated sculpt: V, F, fgroup (per triangle), group names"""
    cache = WORK + '/sculpt_raw.npz'
    if os.path.exists(cache):
        d = np.load(cache, allow_pickle=True)
        return d['V'], d['F'], d['FG'], d['gnames'].item()
    V, polys = parse_obj(SCULPT_OBJ)
    pg = parse_obj.pgroup
    T, TG = [], []
    for p, g in zip(polys, pg):
        for k in range(1, len(p) - 1):
            T.append((p[0], p[k], p[k + 1])); TG.append(g)
    F = np.array(T, np.int64); FG = np.array(TG, np.int64)
    np.savez(cache, V=V, F=F, FG=FG, gnames=np.array(parse_obj.groups, dtype=object))
    return V, F, FG, parse_obj.groups

ICT_GROUP_POLYS = [
    (0, 9229), (9230, 11143), (11144, 13225), (13226, 13629), (13630, 14033), (14034, 17005), (17006, 21495),
    (21496, 23093), (23094, 24691), (24692, 24854), (24855, 25017), (25018, 25032), (25033, 25047),
    (25048, 25175), (25176, 25303), (25304, 25843), (25844, 26383),
]
ICT_GROUP_VERTS = [
    (0, 9408), (9409, 11247), (11248, 13293), (13294, 13677), (13678, 14061), (14062, 17038), (17039, 21450),
    (21451, 23020), (23021, 24590), (24591, 24794), (24795, 24998), (24999, 25022), (25023, 25046),
    (25047, 25198), (25199, 25350), (25351, 26034), (26035, 26718),
]
ICT_LM68 = [1225, 1888, 1052, 367, 1719, 1722, 2199, 1447, 966, 3661, 4390, 3927, 3924, 2608, 3272, 4088, 3443,
            268, 493, 1914, 2044, 1401, 3615, 4240, 4114, 2734, 2509, 978, 4527, 4942, 4857, 1140, 2075, 1147, 4269,
            3360, 1507, 1542, 1537, 1528, 1518, 1511, 3742, 3751, 3756, 3721, 3725, 3732, 5708, 5695, 2081, 0, 4275,
            6200, 6213, 6346, 6461, 5518, 5957, 5841, 5702, 5711, 5533, 6216, 6207, 6470, 5517, 5966]

def load_ict():
    cache = WORK + '/ict_neutral.npz'
    if os.path.exists(cache):
        d = np.load(cache, allow_pickle=True)
        return d['V'], list(d['polys']), d['pgroup']
    V, polys = parse_obj(ICT_DIR + '/generic_neutral_mesh.obj')
    pgroup = np.zeros(len(polys), np.int64)
    for g, (a, b) in enumerate(ICT_GROUP_POLYS):
        pgroup[a:b + 1] = g
    np.savez(cache, V=V, polys=np.array(polys, dtype=object), pgroup=pgroup)
    return V, polys, pgroup

def load_ict_expr(name, neutral):
    cache = WORK + '/ict_%s.npy' % name
    if os.path.exists(cache):
        return np.load(cache)
    V, _ = parse_obj(ICT_DIR + '/%s.obj' % name, want_faces=False)
    D = V - neutral
    np.save(cache, D)
    return D

# ------------------------------------------------------------------ geometry
def vertex_normals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    l = np.linalg.norm(N, axis=1, keepdims=True)
    l[l == 0] = 1
    return N / l

def edges_of(F):
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    E = np.sort(E, axis=1)
    return np.unique(E, axis=0)

def umeyama(src, dst, with_scale=True):
    """similarity dst ~ s R src + t"""
    ms, md = src.mean(0), dst.mean(0)
    A, B = src - ms, dst - md
    C = B.T @ A / len(src)
    U, S, Vt = np.linalg.svd(C)
    D = np.eye(3)
    if np.linalg.det(U @ Vt) < 0:
        D[2, 2] = -1
    R = U @ D @ Vt
    s = (S * np.diag(D)).sum() / (A ** 2).sum() * len(src) if with_scale else 1.0
    t = md - s * R @ ms
    return s, R, t

class Laplacian:
    """uniform graph Laplacian as index arrays; smooth() does Jacobi-style averaging"""
    def __init__(self, n, E):
        self.n = n
        self.i = np.concatenate([E[:, 0], E[:, 1]])
        self.j = np.concatenate([E[:, 1], E[:, 0]])
        self.deg = np.bincount(self.i, minlength=n).astype(np.float64)
        self.deg[self.deg == 0] = 1
    def avg(self, X):
        out = np.zeros_like(X)
        if X.ndim == 1:
            out = np.bincount(self.i, weights=X[self.j], minlength=self.n)
        else:
            for k in range(X.shape[1]):
                out[:, k] = np.bincount(self.i, weights=X[self.j, k], minlength=self.n)
        return out / (self.deg if X.ndim == 1 else self.deg[:, None])
    def smooth(self, X, iters, lam=0.5, fixed=None):
        X = X.copy()
        for _ in range(iters):
            Y = X + lam * (self.avg(X) - X)
            if fixed is not None:
                Y[fixed] = X[fixed]
            X = Y
        return X

# ------------------------------------------------------------------ blender helpers
def bpy_mod():
    import bpy
    return bpy

def reset_scene():
    bpy = bpy_mod()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    return bpy.context.scene

def make_mesh(name, V, F, collection=None):
    bpy = bpy_mod()
    me = bpy.data.meshes.new(name)
    V = np.asarray(V, np.float32)
    F = np.asarray(F, np.int32)
    me.vertices.add(len(V))
    me.vertices.foreach_set('co', V.ravel())
    me.loops.add(F.size)
    me.loops.foreach_set('vertex_index', F.ravel())
    me.polygons.add(len(F))
    me.polygons.foreach_set('loop_start', np.arange(0, F.size, 3, dtype=np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(F), 3, np.int32))
    me.update(calc_edges=True)
    me.validate(verbose=False)
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob

def mesh_arrays(ob):
    me = ob.data
    V = np.zeros(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', V)
    me.calc_loop_triangles()
    T = np.zeros(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get('vertices', T)
    return V.reshape(-1, 3).astype(np.float64), T.reshape(-1, 3).astype(np.int64)

def set_smooth(ob):
    me = ob.data
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), bool))
    me.update()

def material(name, rgb, rough=0.6, emit=None):
    bpy = bpy_mod()
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    if emit is not None:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = 1.0
    return m

def setup_render(res=(900, 1100), engine='WORKBENCH', samples=32):
    bpy = bpy_mod()
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    if engine == 'WORKBENCH':
        sc.render.engine = 'BLENDER_WORKBENCH'
        sh = sc.display.shading
        sh.light = 'STUDIO'
        sh.color_type = 'MATERIAL'
        sh.show_cavity = False
        sh.show_specular_highlight = True
        sc.display.render_aa = '8'
        sh.background_type = 'VIEWPORT'
        sh.background_color = (0.05, 0.05, 0.06)
    else:
        sc.render.engine = 'CYCLES'
        sc.cycles.samples = samples
        sc.cycles.device = 'CPU'
        sc.cycles.use_denoising = True
        w = bpy.data.worlds.new('w')
        sc.world = w
        w.use_nodes = True
        w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.03, 0.03, 0.035, 1)
    sc.view_settings.view_transform = 'Standard'
    return sc

def camera(name, loc, look_at, up=(0, 1, 0), ortho=None, lens=85):
    """camera in OBJ space looking at look_at with the given up vector"""
    bpy = bpy_mod()
    from mathutils import Matrix, Vector
    cam = bpy.data.cameras.new(name)
    if ortho:
        cam.type = 'ORTHO'
        cam.ortho_scale = ortho
    else:
        cam.lens = lens
    cam.clip_start, cam.clip_end = 0.01, 200
    ob = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(ob)
    f = (Vector(look_at) - Vector(loc)).normalized()
    r = f.cross(Vector(up)).normalized()
    u = r.cross(f)
    M = Matrix(((r.x, u.x, -f.x, loc[0]), (r.y, u.y, -f.y, loc[1]), (r.z, u.z, -f.z, loc[2]), (0, 0, 0, 1)))
    ob.matrix_world = M
    return ob

def add_light(kind, loc, look_at, energy, size=1.0):
    bpy = bpy_mod()
    from mathutils import Vector
    L = bpy.data.lights.new('L', kind)
    L.energy = energy
    if kind == 'AREA':
        L.size = size
    ob = bpy.data.objects.new('L', L)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    d = Vector(look_at) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob

def render_to(path, cam_ob):
    bpy = bpy_mod()
    sc = bpy.context.scene
    sc.camera = cam_ob
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path

def argv_after_dashes():
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

# ------------------------------------------------------------------ tiny PNG writer / plotting
def save_png(path, img):
    import zlib, struct
    img = np.ascontiguousarray(np.clip(img, 0, 255).astype(np.uint8))
    if img.ndim == 2:
        img = np.repeat(img[:, :, None], 3, 2)
    h, w, _ = img.shape
    raw = b''.join(b'\x00' + img[y].tobytes() for y in range(h))
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b'')
    open(path, 'wb').write(png)

def scatter_plot(path, pts2d, colors, rect, size=(800, 800), r=1):
    """pts2d in world units; rect = (x0, y0, x1, y1); y up"""
    W, H = size
    img = np.zeros((H, W, 3), np.float64)
    x0, y0, x1, y1 = rect
    px = ((pts2d[:, 0] - x0) / (x1 - x0) * (W - 1)).round().astype(int)
    py = ((y1 - pts2d[:, 1]) / (y1 - y0) * (H - 1)).round().astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    colors = np.broadcast_to(np.asarray(colors, np.float64), (len(pts2d), 3))
    for dx in range(-r + 1, r):
        for dy in range(-r + 1, r):
            qx, qy = np.clip(px + dx, 0, W - 1), np.clip(py + dy, 0, H - 1)
            img[qy[ok], qx[ok]] = colors[ok]
    save_png(path, img)

# ------------------------------------------------------------------ slicing
def slice_points(V, F, axis, value, step=0.25):
    """points sampled along the intersection of the triangle mesh with the plane V[:,axis]==value.
    returns (P (n,3), tri index per point)"""
    d = V[:, axis] - value
    dF = d[F]
    s = np.sign(dF)
    cross = (s.max(1) > 0) & (s.min(1) < 0)
    idx = np.where(cross)[0]
    out, tri = [], []
    for e0, e1 in ((0, 1), (1, 2), (2, 0)):
        a, b = F[idx, e0], F[idx, e1]
        da, db = d[a], d[b]
        m = (da * db) < 0
        t = da[m] / (da[m] - db[m])
        P = V[a[m]] + t[:, None] * (V[b[m]] - V[a[m]])
        out.append(P); tri.append(idx[m])
    return np.concatenate(out), np.concatenate(tri)
