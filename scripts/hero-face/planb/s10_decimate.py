# Step 1: split the sculpt into parts and decimate to a render mesh (~55k tris) that protects the face.
#   Blender -b --python s10_decimate.py -- [--head-tris 46000] [--test]
# out: WORK/dec.npz  (V, F, part per vertex, comp per vertex), OUT/inspect/dec_*.png
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

args = argv_after_dashes()
def arg(k, d):
    return type(d)(args[args.index('--' + k) + 1]) if '--' + k in args else d
HEAD_TRIS = arg('head-tris', 46000)

V, F = load_sculpt()
comp = np.load(WORK + '/sculpt_comp.npy')
info = json.load(open(WORK + '/sculpt_comp.json'))
fcomp = comp[F[:, 0]]

# which eyeball shell to keep per eye: the one whose front is outermost (cornea bulge)
def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]; b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]; c = x[:3]; return c, np.sqrt(x[3] + c @ c)
eyes = {}
for side, pair in (('L', (3, 4)), ('R', (5, 6))):  # L = +x (subject's left)
    best = None
    for k in pair:
        P = V[comp == k]; c, r = fit_sphere(P)
        d = P - c; rr = np.linalg.norm(d, axis=1); cz = d[:, 2] / rr
        front = rr[cz > 0.97].mean(); rim = rr[(cz > 0.6) & (cz < 0.8)].mean(); back = rr[cz < 0].mean()
        log('eye', side, 'comp', k, 'c', c.round(4), 'r', round(r, 4), 'front r', round(front, 4), 'rim r', round(rim, 4), 'back r', round(back, 4))
        if best is None or front > best[1]:
            best = (k, front)
    eyes[side] = best[0]
log('eyeball shells kept', eyes)

# parts: 0 head, 1 ear, 2 eyeball, 3 brow, 4 lash (upper wing), 5 lash (lower)
PARTMAP = {0: 0, 1: 1, 2: 1, eyes['L']: 2, eyes['R']: 2, 7: 3, 8: 3, 9: 4, 10: 4, 11: 5, 12: 5}
TARGET = {0: HEAD_TRIS, 1: 2400, 2: 1600, 3: 900, 4: 700, 5: 160}

import bpy, bmesh
reset_scene()
setup_render((900, 1100))
outV, outF, outPart, outComp = [], [], [], []
nv = 0
FACE_TRIS = arg('face-tris', 40000)
BACK_TRIS = arg('back-tris', 9000)

def decimate(Vp, Fp, ratio, pinned=None, name='m'):
    ob = make_mesh(name, Vp, Fp)
    m = ob.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = min(1.0, ratio)
    m.use_symmetry = True
    m.symmetry_axis = 'X'
    if pinned is not None and pinned.any():
        # Blender adds len*(2-w1-w2)*factor to an edge's collapse cost: weight 0 pins, weight 1 = plain QEM
        vg = ob.vertex_groups.new(name='free')
        vg.add([int(i) for i in np.nonzero(~pinned)[0]], 1.0, 'REPLACE')
        m.vertex_group = 'free'
        m.vertex_group_factor = 1000.0
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier='dec')
    ob.select_set(False)
    Vd, Fd = mesh_arrays(ob)
    bpy.data.objects.remove(ob)
    return Vd, Fd

def submesh(Fsel):
    used = np.unique(Fsel)
    remap = -np.ones(len(V), np.int64); remap[used] = np.arange(len(used))
    return used, remap[Fsel]

for k in range(len(info)):
    if k not in PARTMAP: continue
    p = PARTMAP[k]
    Fk = F[fcomp == k]
    if p == 0:
        cen = V[Fk].mean(1)
        inface = (cen[:, 2] > 0.05) & (cen[:, 1] > -1.5) & (cen[:, 1] < 0.45) & (np.abs(cen[:, 0]) < 0.78)
        Ff, Fb = Fk[inface], Fk[~inface]
        seam = np.intersect1d(np.unique(Ff), np.unique(Fb))
        log('head split: face tris', len(Ff), 'back tris', len(Fb), 'seam verts', len(seam))
        pieces = []
        for Fs, tgt, nm in ((Ff, FACE_TRIS, 'face'), (Fb, BACK_TRIS, 'back')):
            used, Fl = submesh(Fs)
            pin = np.isin(used, seam)
            Vd, Fd = decimate(V[used], Fl, tgt / len(Fs), pin, nm)
            log('  piece', nm, len(Fs), '->', len(Fd))
            pieces.append((Vd, Fd))
        # weld the pinned seam (exact coordinates survive)
        Va, Fa = pieces[0]; Vb, Fb2 = pieces[1]
        key = lambda X: [tuple(r) for r in np.round(X * 1e6).astype(np.int64)]
        ka = {kk: i for i, kk in enumerate(key(Va))}
        mapb = np.arange(len(Vb)) + len(Va)
        hits = 0
        for i, kk in enumerate(key(Vb)):
            j = ka.get(kk)
            if j is not None: mapb[i] = j; hits += 1
        keep = mapb >= len(Va)
        newidx = np.cumsum(keep) - 1 + len(Va)
        mapb[keep] = newidx[keep]
        Vd = np.concatenate([Va, Vb[keep]]); Fd = np.concatenate([Fa, mapb[Fb2]])
        log('  welded seam verts', hits, 'of', len(seam))
    else:
        used, Fl = submesh(Fk)
        Vd, Fd = decimate(V[used], Fl, TARGET[p] / len(Fk), None, 'c%d' % k)
    log('comp', k, 'part', p, 'tris', len(Fk), '->', len(Fd), 'verts', len(Vd))
    outV.append(Vd); outF.append(Fd + nv); outPart.append(np.full(len(Vd), p)); outComp.append(np.full(len(Vd), k))
    nv += len(Vd)
Vd = np.concatenate(outV); Fd = np.concatenate(outF); Pd = np.concatenate(outPart); Cd = np.concatenate(outComp)
log('total verts', len(Vd), 'tris', len(Fd))
# QEM leaves a few small dimples on smooth areas (jaw side / neck, seam of the two head pieces): Taubin-smooth
# the head away from the features (eyes, nose, mouth stay byte-identical)
head = Pd == 0
Eh = edges_of(Fd[head[Fd[:, 0]]])
Lh = Laplacian(len(Vd), Eh)
dfeat = np.full(len(Vd), 9.0)
for c_, rad in (((0.353, -0.15, 0.7), 0.33), ((-0.353, -0.15, 0.7), 0.33), ((0, -0.55, 1.0), 0.24), ((0, -0.89, 0.88), 0.32)):
    dfeat = np.minimum(dfeat, np.linalg.norm(Vd - np.array(c_), axis=1) / rad)
wsm = np.clip((dfeat - 1.0) / 0.35, 0, 1) * head
V0 = Vd.copy()
for it in range(12):
    for lam in (0.5, -0.53):
        Vd = Vd + (lam * wsm)[:, None] * (Lh.avg(Vd) - Vd)
mv = np.linalg.norm(Vd - V0, axis=1)
log('taubin: moved verts', (mv > 1e-5).sum(), 'max %.4f mean(moved) %.5f' % (mv.max(), mv[mv > 1e-5].mean()),
    '| moved > 0.01: %d, of those with y > -1.6 (head / face): %d, max there %.4f at %s' % ((mv > 0.01).sum(), ((mv > 0.01) & (V0[:, 1] > -1.6)).sum(),
    mv[V0[:, 1] > -1.6].max(), V0[V0[:, 1] > -1.6][np.argmax(mv[V0[:, 1] > -1.6])].round(3)), 'global max at', V0[np.argmax(mv)].round(3))
# untangle: QEM + Taubin leave a handful of folded slivers (ear roots, temple): relax only their vertices
Eall = edges_of(Fd); Lall = Laplacian(len(Vd), Eall)
for it in range(20):
    fn_ = np.cross(Vd[Fd[:, 1]] - Vd[Fd[:, 0]], Vd[Fd[:, 2]] - Vd[Fd[:, 0]]); fn_ /= np.linalg.norm(fn_, axis=1, keepdims=True) + 1e-15
    vn_ = Lall.smooth(vertex_normals(Vd, Fd), 3, 0.5); ref_ = vn_[Fd].mean(1); ref_ /= np.linalg.norm(ref_, axis=1, keepdims=True) + 1e-15
    bad_ = ((fn_ * ref_).sum(1) < 0.2) & np.isin(Pd[Fd[:, 0]], [0, 1])
    if it == 0: log('untangle: folded head/ear tris', bad_.sum())
    if not bad_.any(): break
    bv_ = np.unique(Fd[bad_])
    Vd[bv_] = Lall.avg(Vd)[bv_]
log('untangle: folded head/ear tris left', bad_.sum(), 'after', it, 'rounds')
# density report: median edge length on face vs back of head
head = Pd == 0
Fh = Fd[head[Fd[:, 0]]]
L = np.linalg.norm(Vd[Fh[:, 0]] - Vd[Fh[:, 1]], axis=1)
cen = Vd[Fh].mean(1)
face = (cen[:, 2] > 0.5) & (cen[:, 1] > -1.1) & (cen[:, 1] < 0.2)
mouth = np.linalg.norm(cen - np.array([0, -0.88, 0.9]), axis=1) < 0.15
lids = np.minimum(np.linalg.norm(cen - np.array([0.353, -0.15, 0.7]), axis=1), np.linalg.norm(cen - np.array([-0.353, -0.15, 0.7]), axis=1)) < 0.25
log('edge length median: face', np.median(L[face]).round(4), 'mouth', np.median(L[mouth]).round(4), 'lids', np.median(L[lids]).round(4), 'rest', np.median(L[~face]).round(4))
np.savez(WORK + '/dec.npz', V=Vd, F=Fd, part=Pd, comp=Cd, eyes=np.array([eyes['L'], eyes['R']]))

ob = make_mesh('dec', Vd, Fd); set_smooth(ob)
ob.data.materials.append(material('grey', (0.6, 0.6, 0.62)))
c = camera('face', (0, -0.35, 12), (0, -0.35, 0), ortho=2.0)
render_to(OUT + '/inspect/dec_face.png', c)
bpy.context.scene.display.shading.show_xray = False
# wireframe look at the mouth + eye
ob.modifiers.new('wf', 'WIREFRAME').thickness = 0.0012
ob.data.materials.append(material('dark', (0.05, 0.05, 0.05)))
ob.modifiers['wf'].material_offset = 1
ob.modifiers['wf'].use_replace = False
c = camera('mouth', (0, -0.88, 12), (0, -0.88, 0), ortho=0.6)
render_to(OUT + '/inspect/dec_mouth_wire.png', c)
c = camera('eye', (0.36, -0.15, 12), (0.36, -0.15, 0), ortho=0.6)
render_to(OUT + '/inspect/dec_eye_wire.png', c)
log('done')
