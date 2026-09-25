# Inspect ICT neutral: group colours, boundary loops of the face group, eyeball spheres.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

V, polys, pg = load_ict()
T, TG = [], []
for p, g in zip(polys, pg):
    for k in range(1, len(p) - 1):
        T.append((p[0], p[k], p[k + 1])); TG.append(g)
T = np.array(T); TG = np.array(TG)
log('ict verts', len(V), 'tris', len(T), 'bbox', V.min(0).round(2), V.max(0).round(2))
# eyeball spheres
def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]; b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]; c = x[:3]; return c, np.sqrt(x[3] + c @ c)
for g in (7, 8):
    a, b = ICT_GROUP_VERTS[g]
    sa, sb = (21451, 22220) if g == 7 else (23021, 23790)
    c, r = fit_sphere(V[sa:sb + 1])
    log('ict eyeball', g, 'centre', c.round(3), 'r', round(r, 3))
lm = V[ICT_LM68]
log('ict lm eye corners', lm[36].round(2), lm[39].round(2), lm[42].round(2), lm[45].round(2))
log('ict lm mouth corners', lm[48].round(2), lm[54].round(2), 'nose tip', lm[30].round(2), 'chin', lm[8].round(2))
log('ict lm upper lip top', lm[51].round(2), 'lower lip bottom', lm[57].round(2), 'inner', lm[62].round(2), lm[66].round(2))
# boundary loops of the face group (0) triangles
Tf = T[TG == 0]
Ea = np.sort(np.concatenate([Tf[:, [0, 1]], Tf[:, [1, 2]], Tf[:, [2, 0]]]), axis=1)
ue, cnt = np.unique(Ea, axis=0, return_counts=True)
b = ue[cnt == 1]
log('face boundary edges', len(b))
# group loops
adj = {}
for a_, b_ in b:
    adj.setdefault(a_, []).append(b_); adj.setdefault(b_, []).append(a_)
seen = set(); loops = []
for s in adj:
    if s in seen: continue
    loop = [s]; seen.add(s); prev = None; cur = s
    while True:
        nx = [n for n in adj[cur] if n != prev and n not in seen]
        if not nx: break
        prev, cur = cur, nx[0]; loop.append(cur); seen.add(cur)
    loops.append(loop)
for L in loops:
    P = V[L]
    log('loop', len(L), 'centre', P.mean(0).round(2), 'bbox', P.min(0).round(2), P.max(0).round(2))
np.save(WORK + '/ict_tris.npy', T); np.save(WORK + '/ict_trigroup.npy', TG)

sc = reset_scene()
setup_render((900, 900))
cols = [(0.62, 0.62, 0.64), (0.5, 0.5, 0.8), (0.9, 0.3, 0.3), (0.3, 0.9, 0.3), (0.3, 0.9, 0.3), (0.9, 0.5, 0.5), (1, 1, 0.8),
        (0.9, 0.9, 0.2), (0.9, 0.9, 0.2), (0.2, 0.8, 0.9), (0.2, 0.8, 0.9), (1, 0, 1), (1, 0, 1), (0.5, 0.2, 0.9), (0.5, 0.2, 0.9), (0.1, 0.1, 0.1), (0.1, 0.1, 0.1)]
for g in range(17):
    if g in (11, 12, 13, 14, 15, 16): continue
    ob = make_mesh('g%d' % g, V, T[TG == g]); set_smooth(ob)
    ob.data.materials.append(material('m%d' % g, cols[g]))
os.makedirs(OUT + '/inspect', exist_ok=True)
cz = V[:, 2].max()
c = camera('front', (0, 2, 80), (0, 2, 0), ortho=26); render_to(OUT + '/inspect/ict_front.png', c)
c = camera('side', (80, 2, 0), (0, 2, 0), ortho=26); render_to(OUT + '/inspect/ict_side.png', c)
mc = lm[[48, 54]].mean(0)
c = camera('mouth', (mc[0], mc[1], 80), tuple(mc), ortho=7); render_to(OUT + '/inspect/ict_mouth.png', c)
ec = lm[[42, 45]].mean(0)
c = camera('eye', (ec[0], ec[1], 80), tuple(ec), ortho=5); render_to(OUT + '/inspect/ict_eye.png', c)
for g in (0, 1, 3, 4, 9, 10): bpy_mod().data.objects['g%d' % g].hide_render = True
c = camera('mouthin', (mc[0] + 30, mc[1], mc[2] + 60), tuple(mc - np.array([0, 0, 2])), ortho=9); render_to(OUT + '/inspect/ict_mouth_inside.png', c)
log('done')
