# Step 2a: geometric features on the decimated sculpt and on ICT neutral (same definitions on both).
#   Blender -b --python s20_features.py
# out: WORK/features.npz, OUT/inspect/feat_*.png
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from features import *

d = np.load(WORK + '/dec.npz')
SV, SF, Spart = d['V'], d['F'], d['part']
headF = SF[Spart[SF[:, 0]] == 0]
N = vertex_normals(SV, SF)
feat = {}

# ---------------- sculpt eyeballs + lid outlines (front-view aperture: rays that hit the eyeball first)
S_eye = {}
Smask = np.isin(Spart[SF[:, 0]], [0, 2])
SFc = SF[Smask]; SFc_part = Spart[SFc[:, 0]]
bvhS = make_bvh(SV, SFc)
for side, sgn in (('L', 1), ('R', -1)):
    m = (Spart == 2) & (np.sign(SV[:, 0]) == sgn)
    c, r = fit_sphere(SV[m])
    idx, pts, xs, ys = front_cast(bvhS, c[0] - 1.05 * r, c[0] + 1.05 * r, c[1] - 0.7 * r, c[1] + 0.7 * r, 220, 150, c[2] + 3 * r)
    tgt = (idx >= 0) & (SFc_part[np.maximum(idx, 0)] == 2)
    O = aperture_outline(tgt, pts, c[:2])
    feat['S_eyeC_' + side] = c; feat['S_eyeR_' + side] = r
    feat['S_lidOutline_' + side] = O
    feat['S_eyeMask_' + side] = tgt
    a, b, up, lo = split_outline(O)
    log('sculpt eye', side, 'c', c.round(4), 'r', round(r, 4), 'canthi', a.round(3), b.round(3), 'n up/lo', len(up), len(lo), 'aperture px', tgt.sum())
IPD_S = abs(feat['S_eyeC_L'][0] - feat['S_eyeC_R'][0])

# ---------------- sculpt midline profile
prof = {'creaseMid': np.array([0.0, -0.88, 0.91])}  # rough hint; refined by the slice notch search below

# ---------------- sculpt lip crease: per vertical slice, the notch (local z minimum between the lip bulges)
cen = SV[headF].mean(1)
mf = headF[(np.abs(cen[:, 1] - prof['creaseMid'][1]) < 0.15) & (cen[:, 2] > prof['creaseMid'][2] - 0.4)]
def notch(Vm, Fm, x, yc, ywin=0.06, bump=0.05, zmin=0.3):
    P = plane_x_profile(Vm, Fm, x, zmin=zmin)
    if len(P) < 5: return None
    ys = np.round(P[:, 1] / 0.002).astype(int); keep = {}
    for i, k in enumerate(ys):
        if k not in keep or P[i, 2] > P[keep[k], 2]: keep[k] = i
    Q = P[sorted(keep.values(), key=lambda i: -P[i, 1])]
    y, z = Q[:, 1], Q[:, 2]; best = None
    for i in range(1, len(Q) - 1):
        if abs(y[i] - yc) > ywin: continue
        if z[i] <= z[i - 1] and z[i] <= z[i + 1]:
            up = z[(y > y[i]) & (y < y[i] + bump)]; lo = z[(y < y[i]) & (y > y[i] - bump)]
            if len(up) and len(lo):
                dep = min(up.max(), lo.max()) - z[i]
                if best is None or dep > best[0]: best = (dep, Q[i])
    return best
cr = []
yc = prof['creaseMid'][1]
for x in np.linspace(0, 0.32, 129):
    b = notch(SV, mf, x, yc)
    if b is None or b[0] < 0.0015: break
    cr.append(b[1]); yc = b[1][1]
cr = np.array(cr)
crease = np.concatenate([cr[::-1] * np.array([-1, 1, 1]), cr[1:]])   # mirror (the sculpt is symmetric)
feat['S_crease'] = crease
feat['S_mouthCornerL'] = crease[-1]; feat['S_mouthCornerR'] = crease[0]
P = plane_x_profile(SV, headF, 0.0, zmin=0.2)
prof, Q = profile_landmarks(P, feat['S_eyeC_L'][1], IPD_S, (cr[0][1], cr[0][1]))
prof['creaseMid'] = cr[0]
for k, v in prof.items():
    feat['S_' + k] = v
log('sculpt profile', {k: v.round(3).tolist() for k, v in prof.items()})
log('sculpt crease pts', len(crease), 'corners', crease[0].round(3), crease[-1].round(3))

# ================= ICT
IV, polys, pg = load_ict()
IT = np.load(WORK + '/ict_tris.npy'); ITG = np.load(WORK + '/ict_trigroup.npy')
IN = vertex_normals(IV, IT[np.isin(ITG, [0, 1, 2, 3, 4])])
faceT = IT[ITG == 0]
lidT = IT[np.isin(ITG, [0, 3, 4])]
I_eye = {}
for side, sgn, (a, b) in (('L', 1, (21451, 22220)), ('R', -1, (23021, 23790))):
    c, r = fit_sphere(IV[a:b + 1])
    feat['I_eyeC_' + side] = c; feat['I_eyeR_' + side] = r
IPD_I = abs(feat['I_eyeC_L'][0] - feat['I_eyeC_R'][0])
sc_I = IPD_I / IPD_S
ITc = IT[np.isin(ITG, [0, 1, 3, 4, 7, 8])]; ITc_g = ITG[np.isin(ITG, [0, 1, 3, 4, 7, 8])]
bvhI = make_bvh(IV, ITc)
for side in ('L', 'R'):
    c, r = feat['I_eyeC_' + side], feat['I_eyeR_' + side]
    idx, pts, xs, ys = front_cast(bvhI, c[0] - 1.05 * r, c[0] + 1.05 * r, c[1] - 0.7 * r, c[1] + 0.7 * r, 220, 150, c[2] + 3 * r)
    tgt = (idx >= 0) & np.isin(ITc_g[np.maximum(idx, 0)], [7, 8])
    O = aperture_outline(tgt, pts, c[:2])
    feat['I_lidOutline_' + side] = O
    a, b, up, lo = split_outline(O)
    log('ict eye', side, 'c', c.round(3), 'r', round(r, 3), 'canthi', a.round(2), b.round(2), 'n up/lo', len(up), len(lo), 'aperture px', tgt.sum())
# lip edges of the parted ICT lips: front-view rays that pass the lips (hit socket/teeth/gums)
jaw = load_ict_expr('jawOpen', IV)
lower = jaw[:, 1] < -0.25 * np.abs(jaw[:, 1]).max()
mouthC = IV[[5708, 6213]].mean(0)
xc = abs(IV[6213, 0])
ITm = IT[np.isin(ITG, [0, 1, 2, 5, 6])]; ITm_g = ITG[np.isin(ITG, [0, 1, 2, 5, 6])]
bvhM = make_bvh(IV, ITm)
idx, pts, xs, ys = front_cast(bvhM, -1.1 * xc, 1.1 * xc, mouthC[1] - 0.12 * IPD_I, mouthC[1] + 0.12 * IPD_I, 300, 120, 20.0)
gap = (idx >= 0) & (ITm_g[np.maximum(idx, 0)] != 0)
silU, silL, cols = gap_edges(gap, pts)
feat['I_gapMask'] = gap
feat['I_silU'] = silU; feat['I_silL'] = silL
mid = len(silU) // 2
P = plane_x_profile(IV, faceT, 0.0, zmin=5)
profI, QI = profile_landmarks(P, feat['I_eyeC_L'][1], IPD_I, (silU[mid][1], silL[mid][1]))
for k, v in profI.items():
    feat['I_' + k] = v
log('ict profile', {k: v.round(2).tolist() for k, v in profI.items()})
feat['I_mouthCornerL'] = IV[6213]; feat['I_mouthCornerR'] = IV[5708]
feat['I_lower_mask'] = lower
log('ict lip silhouettes', len(silU), 'gap at mid', (np.array(silU)[len(silU)//2, 1] - np.array(silL)[len(silL)//2, 1]).round(3))
feat['IPD_S'] = IPD_S; feat['IPD_I'] = IPD_I
np.savez(WORK + '/features.npz', **feat)

# ================= debug renders
reset_scene(); setup_render((1000, 1000))
ob = make_mesh('sculpt', SV, SF); set_smooth(ob); ob.data.materials.append(material('g', (0.6, 0.6, 0.62)))
add_points('lid', np.concatenate([feat['S_lidOutline_L'], feat['S_lidOutline_R']]), 0.004, (1, 0.2, 0.2))
add_points('crease', feat['S_crease'], 0.003, (0.2, 1, 0.2))
add_points('prof', np.array(list(prof.values())), 0.008, (0.2, 0.5, 1))
add_points('eyec', np.array([feat['S_eyeC_L'], feat['S_eyeC_R']]) + np.array([0, 0, 0.2]), 0.006, (1, 1, 0))
c = camera('f', (0, -0.5, 12), (0, -0.5, 0), ortho=1.6); render_to(OUT + '/inspect/feat_sculpt_front.png', c)
c = camera('s', (12, -0.5, 0.5), (0, -0.5, 0.5), ortho=1.6); render_to(OUT + '/inspect/feat_sculpt_side.png', c)
reset_scene(); setup_render((1000, 1000))
ob = make_mesh('ict', IV, IT[np.isin(ITG, [0, 1, 3, 4, 7, 8])]); set_smooth(ob); ob.data.materials.append(material('g', (0.6, 0.6, 0.62)))
add_points('lid', np.concatenate([feat['I_lidOutline_L'], feat['I_lidOutline_R']]), 0.004 * sc_I, (1, 0.2, 0.2))
add_points('sil', np.concatenate([feat['I_silU'], feat['I_silL']]), 0.003 * sc_I, (0.2, 1, 0.2))
add_points('prof', np.array(list(profI.values())), 0.008 * sc_I, (0.2, 0.5, 1))
cy = feat['I_eyeC_L'][1] - 0.5 * IPD_I
c = camera('f', (0, cy, 100), (0, cy, 0), ortho=1.6 * sc_I * 1.0); render_to(OUT + '/inspect/feat_ict_front.png', c)
c = camera('s', (100, cy, 8), (0, cy, 8), ortho=1.6 * sc_I); render_to(OUT + '/inspect/feat_ict_side.png', c)
log('done')
