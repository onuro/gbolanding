# Plan C step 10: decimate the sculpt's skin parts (head, ears, neck) into a render mesh that protects the
# eyes / lids / lips / nose. The eyeballs are replaced later by clean UV spheres (the sculpt's are exact
# spheres, r 0.1755). Group40947 (the neck's top cap, hidden inside the head) is dropped.
#   Blender -b --factory-startup --python s10_decimate.py -- [--head-tris 46000] [--vg-factor 10]
# out: WORK/dec.npz (V, F, comp per vertex), OUT/inspect/dec_*.png
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

args = argv_after_dashes()
def arg(k, d):
    return type(d)(args[args.index('--' + k) + 1]) if '--' + k in args else d
HEAD_TRIS = arg('head-tris', 46000)

V, F, FG, gnames = load_sculpt()
comp = np.load(WORK + '/sculpt_comp.npy')
fcomp = comp[F[:, 0]]
drop = FG == gnames['Group40947']
EYE_C = np.array([[-0.4018, -0.1881, 0.5437], [0.4018, -0.1881, 0.5437]])
TARGET = {0: HEAD_TRIS, 3: 3000, 4: 3000, 5: 6000}

import bpy
reset_scene()
setup_render((900, 1100))
outV, outF, outC = [], [], []
nv = 0
for k in (0, 3, 4, 5):
    Fk = F[(fcomp == k) & ~drop]
    used = np.unique(Fk)
    remap = -np.ones(len(V), np.int64); remap[used] = np.arange(len(used))
    P = V[used]
    ob = make_mesh('c%d' % k, P, remap[Fk])
    ratio = min(1.0, TARGET[k] / len(Fk))
    m = ob.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = ratio
    m.use_symmetry = True
    m.symmetry_axis = 'X'
    if k == 0:
        vg = ob.vertex_groups.new(name='face')
        fy = np.clip(1 - np.maximum(0, np.abs(P[:, 1] + 0.65) - 0.75) / 0.25, 0, 1)
        fz = np.clip((P[:, 2] - 0.1) / 0.35, 0, 1)
        fx = np.clip(1 - np.maximum(0, np.abs(P[:, 0]) - 0.7) / 0.2, 0, 1)
        w = 0.5 * fy * fz * fx
        for c_, rad in ((EYE_C[0] + [0, 0, 0.12], 0.26), (EYE_C[1] + [0, 0, 0.12], 0.26), ((0, -0.99, 0.9), 0.24), ((0, -0.66, 1.0), 0.2)):
            d = np.linalg.norm(P - np.array(c_), axis=1)
            w = np.maximum(w, np.clip(1.6 - d / rad, 0, 1))
        idx = np.where(w > 0)[0]
        for i in idx:
            vg.add([int(i)], float(w[i]), 'REPLACE')
        m.vertex_group = 'face'
        m.vertex_group_factor = arg('vg-factor', 10.0)
        m.invert_vertex_group = True  # Blender 4.4: the group marks where to decimate; inverted = protect
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier='dec')
    ob.select_set(False)
    Vd, Fd = mesh_arrays(ob)
    log('comp', k, 'tris', len(Fk), '->', len(Fd), 'verts', len(Vd))
    outV.append(Vd); outF.append(Fd + nv); outC.append(np.full(len(Vd), k))
    nv += len(Vd)
    ob.hide_render = True
Vd = np.concatenate(outV); Fd = np.concatenate(outF); Cd = np.concatenate(outC)
log('total verts', len(Vd), 'tris', len(Fd))
Fh = Fd[Cd[Fd[:, 0]] == 0]
L = np.linalg.norm(Vd[Fh[:, 0]] - Vd[Fh[:, 1]], axis=1)
cen = Vd[Fh].mean(1)
face = (cen[:, 2] > 0.4) & (cen[:, 1] > -1.4) & (cen[:, 1] < 0.2)
mouth = np.linalg.norm(cen - np.array([0, -0.99, 0.9]), axis=1) < 0.15
lids = np.min([np.linalg.norm(cen - (c + [0, 0, 0.17]), axis=1) for c in EYE_C], axis=0) < 0.16
log('edge length median: face', np.median(L[face]).round(4), 'mouth', np.median(L[mouth]).round(4), 'lids', np.median(L[lids]).round(4), 'rest', np.median(L[~face]).round(4))
np.savez(WORK + '/dec.npz', V=Vd, F=Fd, comp=Cd)

ob = make_mesh('dec', Vd, Fd); set_smooth(ob)
ob.data.materials.append(material('grey', (0.6, 0.6, 0.62)))
c = camera('face', (0, -0.4, 20), (0, -0.4, 0), ortho=2.3)
render_to(OUT + '/inspect/dec_face.png', c)
ob.modifiers.new('wf', 'WIREFRAME').thickness = 0.0008
ob.data.materials.append(material('dark', (0.05, 0.05, 0.05)))
ob.modifiers['wf'].material_offset = 1
ob.modifiers['wf'].use_replace = False
c = camera('mouth', (0, -0.97, 20), (0, -0.97, 0), ortho=0.55)
render_to(OUT + '/inspect/dec_mouth_wire.png', c)
c = camera('eye', (0.40, -0.19, 20), (0.40, -0.19, 0), ortho=0.55)
render_to(OUT + '/inspect/dec_eye_wire.png', c)
c = camera('facew', (0, -0.4, 20), (0, -0.4, 0), ortho=2.3)
render_to(OUT + '/inspect/dec_face_wire.png', c)
log('done')
