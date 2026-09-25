# Step 5a: flatten the rig into engine parts, normalise to W units and write an intermediate
# (WORK/sf-src.json + .bin) that sf-mesh.mjs turns into the hero-face lab mesh (bake, normals, masks).
#   Blender -b --python s60_export_src.py -- [--wmode pupil|centre] [--rig rig]
#   pupil (default): W = 2 x interpupillary distance, as the ICT lab meshes and the reference framings (FRAMES W = 2 IPD)
#   centre: W = 2 x inter-eyeball-centre distance (the first exports; this sculpt's pupils diverge, so the face came out 5.8% larger)
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from features import *
from mathutils import Vector

args = argv_after_dashes()
WMODE = args[args.index('--wmode') + 1] if '--wmode' in args else 'pupil'
RIGN = args[args.index('--rig') + 1] if '--rig' in args else 'rig'
rig = dict(np.load(WORK + '/%s.npz' % RIGN))
f = dict(np.load(WORK + '/features.npz'))
fit = dict(np.load(WORK + '/fit.npz'))
IV, polys, pg = load_ict()
names = [str(n) for n in rig['names']]
SV, SF, Sp = rig['SV'], rig['SF'], rig['Spart']
TV, TF = rig['TV'], rig['TF']
PV, PF = rig['POS'], rig['PF']
eyes = rig['eyes']   # per eye: c(3) r ax(3) pupil(3)

PART = dict(skin=0, mouth=1, teeth=2, sclera=3, iris=4, lacrimal=5)
# ---- iris size: the sculpt's cornea bulge (radius above the sclera radius) marks the limbus
def limbus_cos(c, ax, P):
    """limbus = first angle (>= 10 deg) where the cornea bulge has flattened: r(th) - r(th + 8) < 0.006 r"""
    d = P - c; rr = np.linalg.norm(d, axis=1); th = np.degrees(np.arccos(np.clip((d / rr[:, None]) @ ax, -1, 1)))
    prof = lambda b: rr[(th >= b) & (th < b + 4)].mean()
    r0 = rr.mean()
    for b in range(10, 50, 2):
        if prof(b) - prof(b + 8) < 0.006 * r0:
            return np.cos(np.radians(b)), b, prof(0) - prof(b + 8)
    return np.cos(np.radians(25)), 25, 0.0
cosIris, angI, bulge = limbus_cos(rig['eyes'][0][:3], rig['eyes'][0][4:7], SV[(Sp == 2) & (SV[:, 0] > 0)])
log('sculpt limbus half-angle %.1f deg (cornea bulge %.4f)' % (angI, bulge))

# ---- vertex blocks: skin (head, ears, brows, lashes), eyeballs, pouch, teeth
skinV = np.nonzero(Sp != 2)[0]; eyeV = np.nonzero(Sp == 2)[0]
blocks = []   # (positions, tri list per part, part per vertex, eye cos, morph deltas dict)
def remapF(Fsel, verts):
    m = -np.ones(len(SV), np.int64); m[verts] = np.arange(len(verts)); return m[Fsel]
skF = SF[Sp[SF[:, 0]] != 2]; eyF = SF[Sp[SF[:, 0]] == 2]
eyeCos = np.zeros(len(SV)); eyeSide = np.zeros(len(SV), int)
for k, sgn in ((0, 1), (1, -1)):
    c, ax = eyes[k][:3], eyes[k][4:7]
    m = (Sp == 2) & (np.sign(SV[:, 0]) == sgn)
    d = SV[m] - c
    eyeCos[m] = (d / np.linalg.norm(d, axis=1, keepdims=True)) @ ax
irisVert = (Sp == 2) & (eyeCos >= cosIris)
triIris = irisVert[eyF].any(1)

V_all, parts_tris, vpart, veye = [], {}, [], []
def add_block(P, tris_by_part, vp, ve):
    base = sum(len(x) for x in V_all)
    V_all.append(P)
    for p, T in tris_by_part.items():
        parts_tris.setdefault(p, []).append(T + base)
    vpart.append(vp); veye.append(ve)
    return base
b_skin = add_block(SV[skinV], {PART['skin']: remapF(skF, skinV)}, np.zeros(len(skinV)), np.zeros(len(skinV)))
evp = np.where(irisVert[eyeV], PART['iris'], PART['sclera']).astype(float)
eF = remapF(eyF, eyeV)
b_eye = add_block(SV[eyeV], {PART['sclera']: eF[~triIris], PART['iris']: eF[triIris]}, evp, eyeCos[eyeV])
b_mouth = add_block(PV, {PART['mouth']: PF}, np.full(len(PV), PART['mouth'], float), np.zeros(len(PV)))
b_teeth = add_block(TV, {PART['teeth']: TF}, np.full(len(TV), PART['teeth'], float), np.zeros(len(TV)))
V = np.concatenate(V_all); vpart = np.concatenate(vpart); veye = np.concatenate(veye)
NV = len(V)
def delta(n):
    return np.concatenate([rig['dS_' + n][skinV], rig['dS_' + n][eyeV], rig['dP_' + n], rig['dT_' + n]])

# ---- normalisation: origin = midpoint between the pupils, W = 2 x IPD (pupil, default) or 2 x eyeball-centre distance
pupL, pupR = eyes[0][7:10], eyes[1][7:10]
pupx = 0.5 * (abs(pupL[0]) + abs(pupR[0]))
pupL = np.array([pupx, 0.5 * (pupL[1] + pupR[1]), 0.5 * (pupL[2] + pupR[2])]); pupR = pupL * [-1, 1, 1]
O = 0.5 * (pupL + pupR)
Wu = 2 * (np.linalg.norm(eyes[0][:3] - eyes[1][:3]) if WMODE == 'centre' else np.linalg.norm(pupL - pupR))
S = 1.0 / Wu
nrm = lambda p: ((np.asarray(p) - O) * S)
log('W = %.4f sculpt units (%s), origin %s' % (Wu, WMODE, O.round(4)))

# ---- landmarks: fitted-ICT Multi-PIE 68 snapped onto the sculpt, with sculpt-native overrides
bvh = make_bvh(SV, SF[np.isin(Sp[SF[:, 0]], [0])])
Xfit = fit['Xfit']
lm = np.array([np.array(bvh.find_nearest(Vector(Xfit[v]))[0]) for v in ICT_LM68])
cr = f['S_crease']
crX = lambda x: np.array([np.interp(x, cr[:, 0], cr[:, k]) for k in range(3)])
xc = abs(cr[-1, 0])
lm[48] = cr[0]; lm[54] = cr[-1]; lm[60] = cr[0]; lm[64] = cr[-1]
for k, t in zip((61, 62, 63), (-0.5, 0.0, 0.5)): lm[k] = crX(t * xc)
for k, t in zip((65, 66, 67), (0.5, 0.0, -0.5)): lm[k] = crX(t * xc)
for sd, (ic, oc, u1, u2, l1, l2) in (('R', (39, 36, 37, 38, 41, 40)), ('L', (42, 45, 43, 44, 47, 46))):
    a, b, up, lo = split_outline(f['S_lidOutline_' + sd])       # a = min x, b = max x
    inner, outer = (b, a) if sd == 'R' else (a, b)
    lm[ic] = inner; lm[oc] = outer
    # upper/lower lid points at 1/3 and 2/3 from the outer corner (Multi-PIE order runs outer -> inner on the right eye)
    xs3 = [outer[0] + (inner[0] - outer[0]) * t for t in (1 / 3, 2 / 3)]
    for kk, x in zip((u1, u2), xs3): lm[kk] = np.array([np.interp(x, up[:, 0], up[:, j]) for j in range(3)])
    for kk, x in zip((l1, l2), xs3): lm[kk] = np.array([np.interp(x, lo[:, 0], lo[:, j]) for j in range(3)])
lm[30] = f['S_noseTip']; lm[33] = f['S_subnasale']; lm[27] = f['S_nasion']
lm[51] = np.array(bvh.find_nearest(Vector(Xfit[0]))[0]); lm[57] = np.array(bvh.find_nearest(Vector(Xfit[5518]))[0])
# lower vermilion border: the fitted ICT points (55-59) sit ~0.02-0.03 W up on this sculpt's fuller lower lip, so the
# look's lip masks (feat: vermilion / lip side) covered only its upper part. Walk down the front profile at each
# point's x, past the lip's most forward point, to the first place where the (smoothed) surface normal turns as far
# down as it does at ICT's own landmark (n_y measured on the ICT lab mesh f5s: -0.105 at 55/59, -0.49 at 56/58, -0.62 at 57)
from mathutils.bvhtree import BVHTree as _BVH
headF_ = SF[Sp[SF[:, 0]] == 0]; VNh_ = vertex_normals(SV, headF_)
bvhH_ = _BVH.FromPolygons([tuple(p) for p in SV], [tuple(int(i) for i in t) for t in headF_], all_triangles=True)
def front_profile(x, y0, y1, n):
    out = []
    for y in np.linspace(y0, y1, n):
        loc, nrm_, k, dd = bvhH_.ray_cast(Vector((x, y, 5.0)), Vector((0, 0, -1)))
        if loc is None: out.append((y, np.nan, np.nan, np.nan)); continue
        t = headF_[k]; b = np.clip(bary_pt(np.array(loc), SV[t]), 0, 1); b /= b.sum()
        nn = b @ VNh_[t]; nn /= np.linalg.norm(nn)
        out.append((y, loc[2], nn[1], loc[1]))
    return np.array(out)
def bary_pt(p, tri):
    A_, B_, C_ = tri; v0, v1, v2 = B_ - A_, C_ - A_, p - A_
    d00, d01, d11, d20, d21 = v0 @ v0, v0 @ v1, v1 @ v1, v2 @ v0, v2 @ v1; den = d00 * d11 - d01 * d01 + 1e-18
    b1 = (d11 * d20 - d01 * d21) / den; b2 = (d00 * d21 - d01 * d20) / den
    return np.array([1 - b1 - b2, b1, b2])
NY_ICT = {55: -0.105, 56: -0.489, 57: -0.621, 58: -0.489, 59: -0.105}
for k, thr in NY_ICT.items():
    x = lm[k][0]; ry = np.interp(x, cr[:, 0], cr[:, 1])
    pr = front_profile(x, ry - 0.006, ry - 0.2, 200)
    ny = np.convolve(np.nan_to_num(pr[:, 2], nan=1.0), np.ones(5) / 5, 'same')
    jf = int(np.nanargmax(np.where(pr[:, 0] > ry - 0.12, pr[:, 1], -np.inf)))
    js = np.nonzero((np.arange(len(pr)) > jf) & (ny < thr))[0]
    if len(js) and np.isfinite(pr[js[0], 1]):
        new_ = np.array([x, pr[js[0], 0], pr[js[0], 1]])
        log('   lower lip landmark %d: y %.4f -> %.4f (%.4f W lower)' % (k, lm[k][1], new_[1], (lm[k][1] - new_[1]) / Wu))
        lm[k] = new_
mouthC = np.array([0.0, cr[len(cr) // 2, 1], cr[len(cr) // 2, 2]])
chin = np.array(bvh.find_nearest(Vector(Xfit[966]))[0])
r5 = lambda p: [round(float(x), 5) for x in nrm(p)]
landmarks = dict(
    pupilL=r5(pupL), pupilR=r5(pupR), eyeCentreL=r5(eyes[0][:3]), eyeCentreR=r5(eyes[1][:3]),
    mouthCentre=r5(mouthC), mouthCornerL=r5(cr[-1]), mouthCornerR=r5(cr[0]),
    upperLip=r5(lm[51]), lowerLip=r5(lm[57]), innerUpperLip=r5(mouthC + [0, 0.0005, 0]), innerLowerLip=r5(mouthC - [0, 0.0005, 0]),
    noseTip=r5(f['S_noseTip']), chin=r5(chin), multiPie68=[r5(p) for p in lm],
    eyeAxisL=[round(float(x), 5) for x in eyes[0][4:7]], eyeAxisR=[round(float(x), 5) for x in eyes[1][4:7]],
    eyeRadius=round(float(eyes[0][3] * S), 5), irisCos=round(float(cosIris), 5),
)
# crown sphere of the skull (head skin above y = 0.3 W, least squares), for the head / hair volume placement
Hn_ = nrm(SV[Sp == 0]); C_ = Hn_[Hn_[:, 1] > 0.3]
x_ = np.linalg.lstsq(np.c_[2 * C_, np.ones(len(C_))], (C_ ** 2).sum(1), rcond=None)[0]
landmarks['crownSphere'] = [round(float(v), 5) for v in (*x_[:3], np.sqrt(x_[3] + x_[:3] @ x_[:3]))]
log('crown sphere (W): centre', landmarks['crownSphere'][:3], 'r', landmarks['crownSphere'][3])
log('landmarks: pupils', landmarks['pupilL'], 'mouth', landmarks['mouthCentre'], 'nose', landmarks['noseTip'], 'chin', landmarks['chin'])

# ---- write intermediate
order = [PART['skin'], PART['lacrimal'], PART['mouth'], PART['teeth'], PART['sclera'], PART['iris']]
tris = []; parts = []
inv = {v: k for k, v in PART.items()}
for p in order:
    T = np.concatenate(parts_tris[p]) if p in parts_tris else np.zeros((0, 3), np.int64)
    parts.append(dict(name=inv[p], id=p, start=len(tris) * 3 if False else int(sum(len(t) for t in tris) * 3), count=int(len(T) * 3)))
    tris.append(T)
tris = np.concatenate(tris).astype(np.uint32)
chunks, layout, off = [], {}, 0
def add(key, arr, typ, size):
    global off
    b = np.ascontiguousarray(arr).tobytes()
    layout[key] = dict(offset=off, type=typ, size=size, count=int(arr.size // size))
    chunks.append(b); off += len(b)
add('position', (V - O) * S, 'f32', 3) if False else add('position', ((V - O) * S).astype(np.float32), 'f32', 3)
add('part', vpart.astype(np.float32), 'f32', 1)
add('eye', veye.astype(np.float32), 'f32', 1)
add('index', tris, 'u32', 1)
for n in names:
    add('morph:' + n, (delta(n) * S).astype(np.float32), 'f32', 3)
hdr = dict(format='hero-face-sf-src', names=names, vertexCount=NV, parts=parts, partIds=PART, layout=layout, landmarks=landmarks,
           W_sculpt=float(Wu), origin_sculpt=O.tolist(), wmode=WMODE,
           blocks=dict(skin=[b_skin, len(skinV)], eyes=[b_eye, len(eyeV)], mouth=[b_mouth, len(PV)], teeth=[b_teeth, len(TV)]))
open(WORK + '/sf-src.bin', 'wb').write(b''.join(chunks))
json.dump(hdr, open(WORK + '/sf-src.json', 'w'), indent=1)
log('wrote sf-src: %d verts, %d tris, %d morphs, %.1f MB' % (NV, len(tris), len(names), off / 1e6))
log('parts', [(p['name'], p['count'] // 3) for p in parts])
