# Plan C step 3: ICT neutral measurements (in W = 2 x IPD) for comparison with the sculpt, boundary loops of
# the face group, jaw "lowerness" field.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

V, polys, pg = load_ict()
T, TG = [], []
for p, g in zip(polys, pg):
    for k in range(1, len(p) - 1):
        T.append((p[0], p[k], p[k + 1])); TG.append(g)
T = np.array(T); TG = np.array(TG)
np.save(WORK + '/ict_tris.npy', T); np.save(WORK + '/ict_trigroup.npy', TG)
vg = np.zeros(len(V), np.int64)
for g, (a, b) in enumerate(ICT_GROUP_VERTS): vg[a:b + 1] = g
np.save(WORK + '/ict_vgroup.npy', vg)

def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]; b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]; c = x[:3]; return c, np.sqrt(x[3] + c @ c)
eyes = {}
for g, (sa, sb) in ((7, (21451, 22220)), (8, (23021, 23790))):
    c, r = fit_sphere(V[sa:sb + 1])
    a, b = ICT_GROUP_VERTS[g]
    P = V[a:b + 1]
    front = P[P[:, 2] > P[:, 2].max() - 0.12].mean(0)
    eyes[g] = (c, r, front)
    log('ict eyeball', g, 'centre', c.round(3), 'r', round(r, 3), 'pupil', front.round(3))
pL, pR = eyes[7][2], eyes[8][2]
ipd = np.linalg.norm(pL - pR); W = 2 * ipd
O = (pL + pR) / 2
log('IPD', round(ipd, 3), 'W', round(W, 3), 'origin', O.round(3))
lm = V[ICT_LM68]
n = lambda p: ((p - O) / W).round(3)
names = {8: 'chin', 30: 'nose tip', 33: 'subnasale', 27: 'nasion', 36: 'R eye outer', 39: 'R eye inner', 42: 'L eye inner', 45: 'L eye outer',
         37: 'R upper lid', 41: 'R lower lid', 48: 'mouth R', 54: 'mouth L', 51: 'upper lip top', 57: 'lower lip bottom', 62: 'inner upper', 66: 'inner lower',
         0: 'jaw R top', 16: 'jaw L top', 4: 'jaw R mid', 12: 'jaw L mid', 19: 'brow R', 24: 'brow L', 31: 'nostril R', 35: 'nostril L'}
for k, nm in names.items():
    log('  lm', k, nm, n(lm[k]))
log('mouth width W', round(np.linalg.norm(lm[54] - lm[48]) / W, 3), 'eye width W', round(np.linalg.norm(lm[45] - lm[42]) / W, 3),
    'eye open (37-41) W', round((lm[37][1] - lm[41][1]) / W, 3), 'nose width W', round(np.linalg.norm(lm[35] - lm[31]) / W, 3))
vf = V[vg <= 1]
log('face+head bbox W', n(vf.min(0)), n(vf.max(0)))
# lowerness (jawOpen displacement magnitude, normalised)
dj = load_ict_expr('jawOpen', V)
mag = np.linalg.norm(dj, axis=1)
log('jawOpen max disp cm', mag.max().round(3), 'at', V[np.argmax(mag)].round(2))
log('jaw disp at lm: chin', mag[ICT_LM68[8]].round(3), 'lower lip', mag[ICT_LM68[57]].round(3), 'upper lip', mag[ICT_LM68[51]].round(3),
    'inner upper', mag[ICT_LM68[62]].round(3), 'inner lower', mag[ICT_LM68[66]].round(3), 'mouth corner', mag[ICT_LM68[48]].round(3))
# inner lip gap at jawOpen 1
log('lip gap at jawOpen=1 (cm)', ((V[ICT_LM68[62]] + dj[ICT_LM68[62]])[1] - (V[ICT_LM68[66]] + dj[ICT_LM68[66]])[1]).round(3),
    'rest', (V[ICT_LM68[62]][1] - V[ICT_LM68[66]][1]).round(3))
db = load_ict_expr('eyeBlink_L', V)
mb = np.linalg.norm(db, axis=1)
log('blink L max disp', mb.max().round(3), 'at', V[np.argmax(mb)].round(2), 'lid lm 43/44 disp', db[ICT_LM68[43]].round(3), db[ICT_LM68[44]].round(3))
log('L eye upper lid 43,44 y', lm[43][1].round(3), lm[44][1].round(3), 'lower 47,46', lm[47][1].round(3), lm[46][1].round(3))

# boundary loops of the face group
Tf = T[TG == 0]
Ea = np.sort(np.concatenate([Tf[:, [0, 1]], Tf[:, [1, 2]], Tf[:, [2, 0]]]), axis=1)
ue, cnt = np.unique(Ea, axis=0, return_counts=True)
b = ue[cnt == 1]
adj = {}
for a_, b_ in b:
    adj.setdefault(a_, []).append(b_); adj.setdefault(b_, []).append(a_)
seen = set(); loops = []
for s in adj:
    if s in seen: continue
    loop = [s]; seen.add(s); prev = None; cur = s
    while True:
        nx = [q for q in adj[cur] if q != prev and q not in seen]
        if not nx: break
        prev, cur = cur, nx[0]; loop.append(cur); seen.add(cur)
    loops.append(loop)
for L in loops:
    P = V[L]
    log('face loop', len(L), 'centre W', n(P.mean(0)), 'bbox', n(P.min(0)), n(P.max(0)))
json.dump(dict(loops=[list(map(int, L)) for L in loops], W=W, O=O.tolist(), ipd=ipd), open(WORK + '/ict_info.json', 'w'))
log('done')
