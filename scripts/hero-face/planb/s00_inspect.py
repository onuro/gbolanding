# Inspect the raw sculpt + ICT neutral: stats, components, boundaries, grey renders.
#   Blender -b --python s00_inspect.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

V, F = load_sculpt()
log('sculpt', V.shape, F.shape, 'bbox', V.min(0), V.max(0))
# components via union-find on edges
E = edges_of(F)
parent = np.arange(len(V))
def find(a):
    while parent[a] != a:
        parent[a] = parent[parent[a]]; a = parent[a]
    return a
# vectorised label propagation instead of python union-find
lab = np.arange(len(V))
for it in range(2000):
    m = np.minimum(lab[E[:, 0]], lab[E[:, 1]])
    new = lab.copy()
    np.minimum.at(new, E[:, 0], m); np.minimum.at(new, E[:, 1], m)
    new = new[new]
    if (new == lab).all(): break
    lab = new
u, c = np.unique(lab, return_counts=True)
log('components', len(u), sorted(c)[-10:])
# boundary edges
Eall = np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
ue, cnt = np.unique(Eall, axis=0, return_counts=True)
b = ue[cnt == 1]
log('boundary edges', len(b), 'nonmanifold', (cnt > 2).sum())
if len(b):
    bv = np.unique(b)
    log('boundary verts y range', V[bv, 1].min(), V[bv, 1].max(), 'z', V[bv, 2].min(), V[bv, 2].max())
i = np.argmax(V[:, 2]); log('max z vertex', V[i]); i = np.argmin(V[:, 2]); log('min z vertex', V[i])
for comp in u[np.argsort(c)][::-1][:6]:
    m = lab == comp
    log('comp', comp, m.sum(), 'bbox', V[m].min(0).round(3), V[m].max(0).round(3))

sc = reset_scene()
setup_render((800, 1000))
ob = make_mesh('sculpt', V, F)
set_smooth(ob)
ob.data.materials.append(material('grey', (0.6, 0.6, 0.62)))
os.makedirs(OUT + '/inspect', exist_ok=True)
c = camera('front', (0, -0.3, 12), (0, -0.3, 0), ortho=4.6)
render_to(OUT + '/inspect/sculpt_front.png', c)
c = camera('side', (12, -0.3, 0), (0, -0.3, 0), ortho=4.6)
render_to(OUT + '/inspect/sculpt_side.png', c)
c = camera('q34', (6, 0.2, 9), (0, -0.2, 0), lens=85)
render_to(OUT + '/inspect/sculpt_34.png', c)
c = camera('face', (0, 0.1, 12), (0, 0.1, 0), ortho=2.2)
render_to(OUT + '/inspect/sculpt_face.png', c)
log('done')
