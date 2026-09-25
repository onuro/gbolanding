# Step 8: verify an exported hero-face lab mesh (json + bin) end to end, the way the engine will read it.
#   Blender -b --python s80_verify.py -- [--mesh OUT/lab/mesh-sfp.json] [--ref OUT/lab/mesh-f5s.json] [--json out.json]
# Checks: layout / index / part integrity, finite data, morph list, rest slivers, folded triangles per morph and in
# lip-sync combos, seam coherence (every coincident vertex pair must move together, except the intended lip split),
# lid closure (front ray grid over each eye: no sclera / iris hits at blink 1), mouth opening (front rays through the
# lips: dark mouth / teeth hits, no see-through holes) and the lip gap vs a reference mesh (ICT f5s).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from mathutils import Vector
from mathutils.bvhtree import BVHTree

args = argv_after_dashes()
opt = lambda k, d: args[args.index('--' + k) + 1] if '--' + k in args else d
MESH = opt('mesh', OUT + '/lab/mesh-sfp.json')
REF = opt('ref', OUT + '/lab/mesh-f5s.json')
JOUT = opt('json', OUT + '/rig-checks/final-verify.json')
REQUIRED = ['jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthSmileLeft', 'mouthSmileRight', 'mouthStretchLeft',
            'mouthStretchRight', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight',
            'eyeBlinkLeft', 'eyeBlinkRight']
PART = dict(skin=0, mouth=1, teeth=2, sclera=3, iris=4, lacrimal=5)
report = {'mesh': MESH, 'problems': []}
def problem(s):
    report['problems'].append(s); log('PROBLEM:', s)

def load(path):
    h = json.load(open(path)); raw = open(os.path.join(os.path.dirname(path), h['bin']), 'rb').read()
    def view(k):
        l = h['layout'][k]; dt = np.uint32 if l['type'] == 'u32' else np.float32
        return np.frombuffer(raw, dt, l['count'] * l['size'], l['offset']).reshape(-1, l['size']) if l['size'] > 1 else np.frombuffer(raw, dt, l['count'], l['offset'])
    return h, raw, view

h, raw, view = load(MESH)
NV = h['vertexCount']
# ------------------------------------------------------------ 1. layout / index / parts
spans = []
for k, l in h['layout'].items():
    end = l['offset'] + l['count'] * l['size'] * 4
    if l['offset'] % 4: problem('layout %s offset not 4-byte aligned' % k)
    if end > len(raw): problem('layout %s runs past the bin (%d > %d)' % (k, end, len(raw)))
    if k != 'index' and l['count'] != NV: problem('layout %s count %d != vertexCount %d' % (k, l['count'], NV))
    spans.append((l['offset'], end, k))
spans.sort()
for (a0, a1, ka), (b0, b1, kb) in zip(spans[:-1], spans[1:]):
    if b0 < a1: problem('layout overlap %s / %s' % (ka, kb))
P = view('position').astype(np.float64); N = view('normal').astype(np.float64); bake = view('bake'); I = view('index').astype(np.int64)
eyec = view('eye'); feat = view('feat'); curv = view('curv')
if I.max() >= NV: problem('index out of range')
T = I.reshape(-1, 3)
pos = 0
for p in h['parts']:
    if p['start'] != pos: problem('part %s not contiguous' % p['name'])
    pos += p['count']
if pos != len(I): problem('parts cover %d of %d indices' % (pos, len(I)))
tpart = np.zeros(len(T), np.int64)
for p in h['parts']:
    tpart[p['start'] // 3:(p['start'] + p['count']) // 3] = p['id']
vpart = bake[:, 3].round().astype(np.int64)
# triangle part from its vertices (iris wins over sclera at the limbus); must agree with the header's index ranges
tv = vpart[T]
tpart_v = np.where((tv == 4).any(1), 4, tv.max(1))
eyeT = np.isin(tpart_v, [3, 4]) & np.isin(tpart, [3, 4])
mis = (tpart_v != tpart) & ~eyeT
report['range_mismatch_tris'] = int(mis.sum())
if mis.any(): problem('%d triangles sit in another part\'s index range (index order does not match header parts)' % mis.sum())
if ((tv != tv[:, :1]).any(1) & ~np.isin(tv, [3, 4]).all(1)).any(): problem('triangles mixing vertex parts outside the eyes')
tpart = tpart_v
for k in ('position', 'normal', 'bake', 'eye', 'curv', 'feat'):
    if not np.isfinite(view(k)).all(): problem('non-finite values in ' + k)
nl = np.linalg.norm(N, axis=1)
report['normals'] = dict(min=float(nl.min()), max=float(nl.max()))
if abs(nl.min() - 1) > 1e-3 or abs(nl.max() - 1) > 1e-3: problem('normals not unit length (%.4f..%.4f)' % (nl.min(), nl.max()))
names = [m['name'] for m in h['morphs']]
miss = [n for n in REQUIRED if n not in names]
if miss: problem('missing morphs ' + ', '.join(miss))
D = {}
for n in names:
    dp = view('morph:%s:position' % n).astype(np.float64); dn = view('morph:%s:normal' % n)
    if not (np.isfinite(dp).all() and np.isfinite(dn).all()): problem('non-finite morph ' + n)
    D[n] = dp
side = {}
for n in names:
    m = np.linalg.norm(D[n], axis=1); cx = float((P[:, 0] * m).sum() / max(m.sum(), 1e-12))
    side[n] = dict(max=round(float(m.max()), 4), centroidX=round(cx, 4))
    if n.endswith('Left') and cx <= 0.01: problem('%s centroid x %.3f (Left must be +x)' % (n, cx))
    if n.endswith('Right') and cx >= -0.01: problem('%s centroid x %.3f (Right must be -x)' % (n, cx))
report['morphs'] = side
log('layout ok; parts', [(p['name'], p['count'] // 3) for p in h['parts']], '; morphs', len(names))
bk = {nm: (float(bake[vpart == i, 0].max()) if (vpart == i).any() else None, float(bake[vpart == i, 1].mean()) if (vpart == i).any() else None) for nm, i in PART.items()}
report['bake_vis_max_ao_mean'] = bk
if bk['mouth'][0] not in (None, 0.0) or bk['teeth'][0] not in (None, 0.0): problem('mouth / teeth not baked dark (vis > 0)')

# ------------------------------------------------------------ 2. rest slivers / degenerates
def tri_geom(X, TT):
    a, b, c = X[TT[:, 0]], X[TT[:, 1]], X[TT[:, 2]]
    cr = np.cross(b - a, c - a); A = 0.5 * np.linalg.norm(cr, axis=1)
    L = np.stack([np.linalg.norm(b - c, axis=1), np.linalg.norm(c - a, axis=1), np.linalg.norm(a - b, axis=1)], 1)
    # min angle via law of cosines on the shortest edge
    Ls = np.sort(L, 1); x, y, z = Ls[:, 0], Ls[:, 1], Ls[:, 2]
    cosm = np.clip((y * y + z * z - x * x) / (2 * y * z + 1e-18), -1, 1)
    return A, np.degrees(np.arccos(cosm)), cr / (2 * A[:, None] + 1e-18)
A0, ang0, n0 = tri_geom(P, T)
eyeC = [np.array(h['landmarks']['eyeCentreL']), np.array(h['landmarks']['eyeCentreR'])]
eyeR = float(h['landmarks'].get('eyeRadius', 0.13))
cen = P[T].mean(1)
inEye = np.zeros(len(T), bool)
for c in eyeC: inEye |= np.linalg.norm(cen - c, axis=1) < eyeR * 0.995
skinT = tpart == 0
visSkin = skinT & ~inEye            # skin minus the lid membrane behind the eyeballs
rs = {}
for nm, i in PART.items():
    m = tpart == i
    if not m.any(): continue
    rs[nm] = dict(tris=int(m.sum()), degenerate=int((A0[m] < 1e-10).sum()), minAngle_lt1=int((ang0[m] < 1).sum()), minAngle_lt3=int((ang0[m] < 3).sum()),
                  minAngle=round(float(ang0[m].min()), 3))
report['rest_slivers'] = rs
log('rest slivers', rs)
# flipped at rest relative to a smoothed local normal (the decimation untangle target)
E = edges_of(T[visSkin]); Lp = Laplacian(NV, E)
VN = vertex_normals(P, T[visSkin]); VNs = Lp.smooth(VN, 3, 0.5); VNs /= np.linalg.norm(VNs, axis=1, keepdims=True) + 1e-15
ref = VNs[T].mean(1); ref /= np.linalg.norm(ref, axis=1, keepdims=True) + 1e-15
restFold = visSkin & ((n0 * ref).sum(1) < 0)
report['rest_folded_skin'] = int(restFold.sum())
log('rest folded visible-skin tris', int(restFold.sum()), cen[restFold].round(3)[:10].tolist())

# ------------------------------------------------------------ 3. folds per morph / combo
# front-visible = facing the camera side (rest normal z > -0.1) and in the face box; a fold there can show
face = visSkin & (n0[:, 2] > -0.1) & (np.abs(cen[:, 0]) < 0.6) & (cen[:, 1] > -1.0) & (cen[:, 1] < 0.35)
COMBOS = {
    'AA': {'jawOpen': 0.5, 'mouthLowerDownLeft': 0.3, 'mouthLowerDownRight': 0.3, 'mouthUpperUpLeft': 0.1, 'mouthUpperUpRight': 0.1, 'mouthStretchLeft': 0.1, 'mouthStretchRight': 0.1},
    'EE': {'jawOpen': 0.18, 'mouthStretchLeft': 0.45, 'mouthStretchRight': 0.45, 'mouthSmileLeft': 0.3, 'mouthSmileRight': 0.3, 'mouthLowerDownLeft': 0.2, 'mouthLowerDownRight': 0.2, 'mouthUpperUpLeft': 0.15, 'mouthUpperUpRight': 0.15},
    'OO': {'jawOpen': 0.22, 'mouthFunnel': 0.55, 'mouthPucker': 0.45},
    'OH': {'jawOpen': 0.38, 'mouthFunnel': 0.5, 'mouthLowerDownLeft': 0.15, 'mouthLowerDownRight': 0.15},
    'MBP': {'jawOpen': 0.1, 'mouthClose': 0.1, 'mouthPucker': 0.1},
    'FV': {'jawOpen': 0.12, 'mouthUpperUpLeft': 0.2, 'mouthUpperUpRight': 0.2, 'mouthRollLower': 0.0},
    'talk': {'jawOpen': 0.35, 'mouthLowerDownLeft': 0.2, 'mouthLowerDownRight': 0.2, 'mouthUpperUpLeft': 0.07, 'mouthUpperUpRight': 0.07, 'mouthSmileLeft': 0.12, 'mouthSmileRight': 0.12},
    'blink': {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1},
    'blinkSmile': {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1, 'mouthSmileLeft': 0.5, 'mouthSmileRight': 0.5},
}
def posed(w):
    X = P.copy()
    for n, x in w.items():
        if x and n in D: X += x * D[n]
    return X
def folds(X, mask):
    A1, ang1, n1 = tri_geom(X, T)
    flip = mask & ((n0 * n1).sum(1) < 0)
    bent = mask & ((n0 * n1).sum(1) < 0.25)
    coll = mask & (A1 < 0.15 * A0)
    return flip, bent, coll
fold_rep = {}
for n in names:
    row = {}
    for w in (0.35, 0.7, 1.0):
        fl, be, co = folds(P + w * D[n], face)
        row['w%.2f' % w] = [int(fl.sum()), int(be.sum()), int(co.sum())]
    fold_rep[n] = row
for cn, w in COMBOS.items():
    fl, be, co = folds(posed(w), face)
    fold_rep['combo:' + cn] = dict(flip=int(fl.sum()), bent=int(be.sum()), collapsed=int(co.sum()),
                                   where=cen[fl | co].round(3)[:12].tolist())
report['folds_face (flip, bent<0.25, area<15%)'] = fold_rep
for k, v in fold_rep.items(): log('folds %-22s %s' % (k, v))

# ------------------------------------------------------------ 4. seam coherence (tearing)
# every group of coincident rest vertices must move as one, except at the lip split, where it may move as exactly two
# clusters (upper / lower lip) and every mouth-pouch rim vertex must move with a skin vertex of its group
key = np.round(P * 2 ** 20).astype(np.int64)
order = np.lexsort(key.T[::-1]); ks = key[order]
brk = np.r_[True, (ks[1:] != ks[:-1]).any(1)]
gid = np.cumsum(brk) - 1
groups = [order[gid == g] for g in np.unique(gid[np.r_[~brk[1:], False] | ~brk])] if (~brk).any() else []
Dall = np.stack([D[n] for n in names], 1)          # NV x M x 3
mcY = h['landmarks']['mouthCentre'][1]
seam = {'groups': len(groups), 'lip_groups': 0, 'tearing': [], 'pouch_unattached': []}
for g in groups:
    sig = Dall[g].reshape(len(g), -1)
    cl = []
    for i in range(len(g)):
        for c in cl:
            if np.abs(sig[i] - sig[c[0]]).max() < 1e-6: c.append(i); break
        else: cl.append([i])
    atLip = abs(P[g[0], 0]) < 0.3 and abs(P[g[0], 1] - mcY) < 0.08
    if atLip: seam['lip_groups'] += 1
    if len(cl) > (2 if atLip else 1):
        dmax = max(float(np.abs(sig[c[0]] - sig[cl[0][0]]).max()) for c in cl)
        seam['tearing'].append(dict(verts=g.tolist(), parts=vpart[g].tolist(), clusters=len(cl), dmax=round(dmax, 5), at=P[g[0]].round(3).tolist()))
    for c in cl:
        pp = set(vpart[g[c]].tolist())
        if 1 in pp and 0 not in pp and 0 in vpart[g]:
            seam['pouch_unattached'].append(dict(verts=g.tolist(), at=P[g[0]].round(3).tolist()))
report['seams'] = dict(groups=seam['groups'], lip_groups=seam['lip_groups'], tearing=seam['tearing'][:20], n_tearing=len(seam['tearing']),
                       pouch_unattached=seam['pouch_unattached'][:20], n_pouch_unattached=len(seam['pouch_unattached']))
log('coincident groups', seam['groups'], 'at the lip split', seam['lip_groups'], '| tearing groups', len(seam['tearing']), seam['tearing'][:4],
    '| pouch rim not moving with the lip', len(seam['pouch_unattached']))
if seam['tearing']: problem('%d coincident vertex groups tear apart under some morph' % len(seam['tearing']))
if seam['pouch_unattached']: problem('%d mouth-pouch rim vertices do not move with the lip rim' % len(seam['pouch_unattached']))
# skin boundary loops (holes) other than the lip rim / neck cut
def boundary_edges(TT):
    E_ = np.sort(np.concatenate([TT[:, [0, 1]], TT[:, [1, 2]], TT[:, [2, 0]]]), axis=1)
    u, c = np.unique(E_, axis=0, return_counts=True)
    return u[c == 1]
be = boundary_edges(T[skinT])
# group into connected loops
from collections import defaultdict
adj = defaultdict(list)
for a, b in be: adj[a].append(b); adj[b].append(a)
seen = set(); loops = []
for s in adj:
    if s in seen: continue
    st = [s]; comp = []
    while st:
        u = st.pop()
        if u in seen: continue
        seen.add(u); comp.append(u); st.extend(adj[u])
    Q = P[comp]
    loops.append(dict(n=len(comp), centre=Q.mean(0).round(3).tolist(), ext=(Q.max(0) - Q.min(0)).round(3).tolist()))
loops.sort(key=lambda d: -d['n'])
report['skin_boundary_loops'] = loops[:30]
log('skin boundary loops (n, centre, extent):', [(d['n'], d['centre'], d['ext']) for d in loops[:14]], '... total', len(loops))

# ------------------------------------------------------------ 5. ray probes (front, orthographic along -z)
def bvh_of(X):
    return BVHTree.FromPolygons([tuple(map(float, p)) for p in X], [tuple(map(int, t)) for t in T], all_triangles=True)
def probe(X, xs, ys, pitch_deg=0.0):
    """first-hit part per ray; rays start at z = 2 and travel -z (tilted by pitch: camera slightly above = +)"""
    bvh = bvh_of(X)
    th = np.radians(pitch_deg); d = Vector((0, -np.sin(th), -np.cos(th)))
    out = np.full((len(ys), len(xs)), -1, np.int64)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            o = Vector((x, y + 2 * np.tan(th), 2.0))
            loc, nrm, k, dd = bvh.ray_cast(o, d)
            if loc is not None: out[j, i] = tpart[k]
    return out
lm = h['landmarks']
res = {}
# lids: grid over each eye's opening
for sd, pup in (('L', lm['pupilL']), ('R', lm['pupilR'])):
    xs = np.linspace(pup[0] - 0.11, pup[0] + 0.11, 89); ys = np.linspace(pup[1] - 0.07, pup[1] + 0.07, 57)
    for nm, w in (('rest', {}), ('blink0.5', {'eyeBlinkLeft': 0.5, 'eyeBlinkRight': 0.5}), ('blink1', {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1}),
                  ('blink1+smile', {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1, 'mouthSmileLeft': 0.5, 'mouthSmileRight': 0.5})):
        for pitch in (0, 8, -8):
            g = probe(posed(w), xs, ys, pitch)
            eyeHits = int(np.isin(g, [3, 4]).sum())
            res['eye%s %s pitch%+d' % (sd, nm, pitch)] = eyeHits
            if nm.startswith('blink1') and eyeHits: problem('eye %s %s pitch %+d: %d front rays still hit the eyeball' % (sd, nm, pitch, eyeHits))
report['lid_probe_eyeball_hits'] = res
log('lid probes (rays hitting sclera/iris):', res)
# mouth: vertical line + area grid through the lips
mc = lm['mouthCentre']; cw = abs(lm['mouthCornerL'][0])
xs = np.linspace(-cw * 1.05, cw * 1.05, 81); ys = np.linspace(mc[1] - 0.12, mc[1] + 0.08, 101)
def mouth_stats(X, pitch=0):
    g = probe(X, xs, ys, pitch)
    dy = ys[1] - ys[0]
    col = g[:, len(xs) // 2]
    darkcol = np.isin(col, [1, 2])
    gap = darkcol.sum() * dy
    return dict(gap_mid=round(float(gap), 4), dark_area=round(float(np.isin(g, [1, 2]).sum() * dy * (xs[1] - xs[0])), 5),
                teeth_rays=int((g == 2).sum()), mouth_rays=int((g == 1).sum()), see_through=int((g == -1).sum()))
ms = {}
for nm, w in [('rest', {})] + [('jaw%.2f' % a, {'jawOpen': a}) for a in (0.2, 0.35, 0.5)] + [(k, v) for k, v in COMBOS.items() if k != 'blink' and k != 'blinkSmile']:
    ms[nm] = mouth_stats(posed(w))
    if ms[nm]['see_through']: problem('%s: %d mouth-area rays hit nothing (hole)' % (nm, ms[nm]['see_through']))
report['mouth_probe'] = ms
log('mouth probes:', ms)

# ------------------------------------------------------------ 6. reference (ICT f5s): same probes, same weights
if os.path.exists(REF):
    hr, rawr, viewr = load(REF)
    Pr = viewr('position').astype(np.float64); Tr = viewr('index').astype(np.int64).reshape(-1, 3)
    vpr = viewr('bake')[:, 3].round().astype(np.int64); tvr = vpr[Tr]; tpr = np.where((tvr == 4).any(1), 4, tvr.max(1))
    Dr = {m['name']: viewr('morph:%s:position' % m['name']).astype(np.float64) for m in hr['morphs']}
    mcr = hr['landmarks']['mouthCentre']; cwr = abs(hr['landmarks']['mouthCornerL'][0])
    xsr = np.linspace(-cwr * 1.05, cwr * 1.05, 81); ysr = np.linspace(mcr[1] - 0.12, mcr[1] + 0.08, 101)
    refm = {}
    for nm, w in [('jaw%.2f' % a, {'jawOpen': a}) for a in (0.2, 0.35, 0.5)] + [(k, v) for k, v in COMBOS.items() if not k.startswith('blink')]:
        X = Pr.copy()
        for n, x in w.items():
            if x and n in Dr: X += x * Dr[n]
        bvh = BVHTree.FromPolygons([tuple(map(float, p)) for p in X], [tuple(map(int, t)) for t in Tr], all_triangles=True)
        g = np.full((len(ysr), len(xsr)), -1)
        for j, y in enumerate(ysr):
            for i, x in enumerate(xsr):
                loc, nrm, k, dd = bvh.ray_cast(Vector((x, y, 2.0)), Vector((0, 0, -1)))
                if loc is not None: g[j, i] = tpr[k]
        dy = ysr[1] - ysr[0]
        refm[nm] = dict(gap_mid=round(float(np.isin(g[:, len(xsr) // 2], [1, 2]).sum() * dy), 4),
                        dark_area=round(float(np.isin(g, [1, 2]).sum() * dy * (xsr[1] - xsr[0])), 5))
    report['ref'] = dict(mesh=REF, mouthWidth=round(2 * cwr, 4), probes=refm)
    report['mouth_width'] = round(2 * cw, 4)
    log('reference %s (mouth width %.3f W) vs this mesh (mouth width %.3f W): gap at x=0 / dark area' % (os.path.basename(REF), 2 * cwr, 2 * cw))
    for nm in refm:
        log('   %-8s ref %.3f / %.4f   this %.3f / %.4f' % (nm, refm[nm]['gap_mid'], refm[nm]['dark_area'], ms[nm]['gap_mid'], ms[nm]['dark_area']))

json.dump(report, open(JOUT, 'w'), indent=1)
log('problems:', len(report['problems']))
for p in report['problems']: log('  -', p)
log('wrote', JOUT)
