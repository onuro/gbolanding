# Split the sculpt into connected components, save labels, render each (coloured) for identification.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

V, F = load_sculpt()
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
comp = rank[inv]  # 0 = largest
np.save(WORK + '/sculpt_comp.npy', comp)
info = []
for k in range(len(u)):
    m = comp == k
    fm = m[F[:, 0]]
    # closed?  boundary edges of this component
    Fk = F[fm]
    Ea = np.sort(np.concatenate([Fk[:, [0, 1]], Fk[:, [1, 2]], Fk[:, [2, 0]]]), axis=1)
    ue, cnt = np.unique(Ea, axis=0, return_counts=True)
    info.append(dict(k=k, verts=int(m.sum()), tris=int(fm.sum()), boundary=int((cnt == 1).sum()),
                     lo=V[m].min(0).round(3).tolist(), hi=V[m].max(0).round(3).tolist(), mean=V[m].mean(0).round(3).tolist()))
    log(info[-1])
json.dump(info, open(WORK + '/sculpt_comp.json', 'w'), indent=1)

sc = reset_scene()
setup_render((900, 700))
cols = [(0.6, 0.6, 0.62), (0.9, 0.3, 0.3), (0.3, 0.9, 0.3), (0.3, 0.3, 0.9), (0.9, 0.9, 0.3), (0.9, 0.3, 0.9),
        (0.3, 0.9, 0.9), (1, 0.6, 0.2), (0.6, 0.2, 1), (0.2, 1, 0.6), (1, 1, 1), (0.5, 0.2, 0.1), (0.1, 0.5, 0.2)]
for k in range(len(u)):
    fm = comp[F[:, 0]] == k
    ob = make_mesh('c%d' % k, V, F[fm])
    set_smooth(ob)
    ob.data.materials.append(material('m%d' % k, cols[k % len(cols)]))
c = camera('face', (0, -0.15, 12), (0, -0.15, 0), ortho=1.6)
render_to(OUT + '/inspect/comp_eyes.png', c)
bpy_mod().data.objects['c0'].hide_render = True
render_to(OUT + '/inspect/comp_eyes_nohead.png', c)
c = camera('side', (8, -0.15, 6), (0.35, -0.15, 0.6), ortho=1.0)
render_to(OUT + '/inspect/comp_eyes_nohead_side.png', c)
log('done')
