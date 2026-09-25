# Plan C step 0: inspect the "free Cute girl face" sculpt: groups, connected components, boundaries, grey renders.
#   Blender -b --python s00_inspect.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

V, F, FG, gnames = load_sculpt()
log('sculpt', V.shape, F.shape, 'bbox', V.min(0).round(3), V.max(0).round(3), 'groups', gnames)
for nm, g in gnames.items():
    m = FG == g
    vs = np.unique(F[m])
    log('group', nm, 'tris', m.sum(), 'verts', len(vs), 'bbox', V[vs].min(0).round(3), V[vs].max(0).round(3))

# connected components (label propagation)
E = edges_of(F)
lab = np.arange(len(V))
for it in range(5000):
    m = np.minimum(lab[E[:, 0]], lab[E[:, 1]])
    new = lab.copy()
    np.minimum.at(new, E[:, 0], m); np.minimum.at(new, E[:, 1], m)
    new = new[new]
    if (new == lab).all(): break
    lab = new
u, inv, c = np.unique(lab, return_inverse=True, return_counts=True)
order = np.argsort(-c)
rank = np.empty_like(order); rank[order] = np.arange(len(order))
comp = rank[inv]
np.save(WORK + '/sculpt_comp.npy', comp)
fcomp = comp[F[:, 0]]
info = []
for k in range(len(u)):
    m = comp == k
    fm = fcomp == k
    Fk = F[fm]
    Ea = np.sort(np.concatenate([Fk[:, [0, 1]], Fk[:, [1, 2]], Fk[:, [2, 0]]]), axis=1)
    ue, cnt = np.unique(Ea, axis=0, return_counts=True)
    grp = np.bincount(FG[fm], minlength=len(gnames))
    info.append(dict(k=k, verts=int(m.sum()), tris=int(fm.sum()), boundary=int((cnt == 1).sum()), nonmanifold=int((cnt > 2).sum()),
                     groups=grp.tolist(), lo=V[m].min(0).round(3).tolist(), hi=V[m].max(0).round(3).tolist(), mean=V[m].mean(0).round(3).tolist()))
    if k < 40: log(info[-1])
log('components', len(u))
json.dump(info, open(WORK + '/sculpt_comp.json', 'w'), indent=1)
# unused vertices
used = np.zeros(len(V), bool); used[F.ravel()] = True
log('unused verts', (~used).sum())

sc = reset_scene()
setup_render((800, 1000))
cols = [(0.6, 0.6, 0.62), (0.9, 0.3, 0.3), (0.3, 0.9, 0.3), (0.3, 0.3, 0.9), (0.9, 0.9, 0.3), (0.9, 0.3, 0.9),
        (0.3, 0.9, 0.9), (1, 0.6, 0.2), (0.6, 0.2, 1), (0.2, 1, 0.6), (1, 1, 1), (0.5, 0.2, 0.1), (0.1, 0.5, 0.2)]
os.makedirs(OUT + '/inspect', exist_ok=True)
# whole sculpt grey
ob = make_mesh('sculpt', V, F); set_smooth(ob)
ob.data.materials.append(material('grey', (0.6, 0.6, 0.62)))
cy = (V[:, 1].min() + V[:, 1].max()) / 2
c = camera('front', (0, cy, 20), (0, cy, 0), ortho=5.2); render_to(OUT + '/inspect/sculpt_front.png', c)
c = camera('side', (20, cy, 0), (0, cy, 0), ortho=5.2); render_to(OUT + '/inspect/sculpt_side.png', c)
c = camera('q34', (8, 0.0, 13), (0, -0.8, 0), lens=70); render_to(OUT + '/inspect/sculpt_34.png', c)
ob.hide_render = True
# per group colours
for nm, g in gnames.items():
    o2 = make_mesh('g_' + nm, V, F[FG == g]); set_smooth(o2)
    o2.data.materials.append(material('mg' + nm, cols[(g + 1) % len(cols)]))
c = camera('front', (0, cy, 20), (0, cy, 0), ortho=5.2); render_to(OUT + '/inspect/groups_front.png', c)
c = camera('side', (20, cy, 0), (0, cy, 0), ortho=5.2); render_to(OUT + '/inspect/groups_side.png', c)
log('done')
