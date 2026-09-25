# Plan C step 1: detail views of the sculpt: eyeball sphere fits, midline profile, mouth / eye close-ups,
# where Group40947 sits (is it hidden inside the head?).
#   Blender -b --factory-startup --python s01_details.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

V, F, FG, gnames = load_sculpt()
comp = np.load(WORK + '/sculpt_comp.npy')
fcomp = comp[F[:, 0]]
os.makedirs(OUT + '/inspect', exist_ok=True)

def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]; b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]; c = x[:3]; return c, np.sqrt(x[3] + c @ c)
for k in (1, 2):
    P = V[comp == k]; c, r = fit_sphere(P)
    d = P - c; rr = np.linalg.norm(d, axis=1)
    log('eyeball comp', k, 'c', c.round(4), 'r', round(r, 4), 'resid max', np.abs(rr - r).max().round(5))
    # radial profile vs angle from +z
    cz = d[:, 2] / rr
    for a0 in (0.999, 0.99, 0.97, 0.94, 0.9, 0.85, 0.8, 0.7, 0.5, 0.0, -0.5):
        m = (cz > a0 - 0.01) & (cz <= a0 + 0.01)
        if m.any(): log('   cos', a0, 'r', rr[m].mean().round(4))
    # direction of the most protruding point
    i = np.argmax(rr); log('   max r dir', (d[i] / rr[i]).round(3), rr[i].round(4))

# midline profile of the head
H = comp == 0
m = H & (np.abs(V[:, 0]) < 0.004)
P = V[m]
o = np.argsort(P[:, 1])
P = P[o]
log('midline pts', len(P))
# front profile: for each y bin, max z
ys = np.arange(-1.5, 1.1, 0.01)
prof = []
for y in ys:
    q = P[np.abs(P[:, 1] - y) < 0.006]
    if len(q): prof.append((y, q[:, 2].max()))
prof = np.array(prof)
np.save(WORK + '/midline_front.npy', prof)
for y, z in prof[::3]:
    if y > -1.6: print('   y %.3f  z %.4f' % (y, z))
scatter_plot(OUT + '/inspect/midline_profile.png', P[:, [2, 1]], (1, 1, 1), (-1.5, -1.6, 1.3, 1.2), (900, 900), r=1)

# Group40947: inside the head? cast +z / -z rays from its vertices against the head
from mathutils.bvhtree import BVHTree
from mathutils import Vector
Fh = F[fcomp == 0]
bvh = BVHTree.FromPolygons(V.tolist(), Fh.tolist())
g2 = np.unique(F[FG == gnames['Group40947']])
inside = 0
for i in g2[::10]:
    p = Vector(V[i]); hits = 0
    q = p.copy()
    for _ in range(20):
        h = bvh.ray_cast(q + Vector((0, 0, 1e-5)), Vector((0, 0, 1)))
        if h[0] is None: break
        hits += 1; q = h[0] + Vector((0, 0, 1e-4))
    inside += hits % 2
log('Group40947 sample verts inside head (odd +z hits):', inside, '/', len(g2[::10]))
# neck comp: fraction of its verts inside the head
n5 = np.where(comp == 5)[0]
ins = 0; tot = 0
for i in n5[::25]:
    p = Vector(V[i]); hits = 0; q = p.copy()
    for _ in range(20):
        h = bvh.ray_cast(q + Vector((0, 0, 1e-5)), Vector((0, 0, 1)))
        if h[0] is None: break
        hits += 1; q = h[0] + Vector((0, 0, 1e-4))
    ins += hits % 2; tot += 1
log('neck verts inside head', ins, '/', tot)

sc = reset_scene()
setup_render((1000, 1000))
cols = {0: (0.62, 0.62, 0.64), 1: (0.85, 0.85, 0.9), 2: (0.85, 0.85, 0.9), 3: (0.6, 0.6, 0.62), 4: (0.6, 0.6, 0.62), 5: (0.55, 0.62, 0.55)}
for k in range(6):
    ob = make_mesh('c%d' % k, V, F[fcomp == k]); set_smooth(ob)
    ob.data.materials.append(material('m%d' % k, cols[k]))
ob = make_mesh('g2', V, F[FG == gnames['Group40947']]); set_smooth(ob)
ob.data.materials.append(material('mg2', (0.9, 0.2, 0.2)))
c = camera('face', (0, -0.35, 20), (0, -0.35, 0), ortho=2.3); render_to(OUT + '/inspect/face.png', c)
c = camera('mouth', (0, -0.95, 20), (0, -0.95, 0), ortho=0.8); render_to(OUT + '/inspect/mouth.png', c)
c = camera('mouthlow', (0, -2.2, 12), (0, -0.95, 0.9), ortho=0.8); render_to(OUT + '/inspect/mouth_below.png', c)
c = camera('mouthside', (12, -0.95, 1.2), (0, -0.95, 0.9), ortho=0.8); render_to(OUT + '/inspect/mouth_side.png', c)
c = camera('eye', (0.40, -0.19, 20), (0.40, -0.19, 0), ortho=0.7); render_to(OUT + '/inspect/eye.png', c)
c = camera('eyeside', (12, -0.19, 3), (0.4, -0.19, 0.5), ortho=0.8); render_to(OUT + '/inspect/eye_side.png', c)
for k in (0, 3, 4, 5): bpy_mod().data.objects['c%d' % k].hide_render = True
c = camera('front', (0, -1.1, 20), (0, -1.1, 0), ortho=3.2); render_to(OUT + '/inspect/nohead_front.png', c)
log('done')
