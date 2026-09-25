# Plan C step 20: sculpt landmarks (render mesh, sculpt units).
#  - eye openings: exact intersection of the skin with each eyeball sphere -> contour, gaze axis, corners
#  - lip seam: per sagittal column, the notch between the upper- and lower-lip bulges -> seam curve, corners
#  - midline profile: nasion, nose tip, subnasale, lip peaks, chin
#  - alar base: from horizontal slices through the nose base
# out: WORK/landmarks.json, OUT/inspect/lm_*.png
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

d = np.load(WORK + '/dec.npz')
V, F, C = d['V'], d['F'], d['comp']
head = C[F[:, 0]] == 0
Fh = F[head]
EYE_C = np.array([[-0.4018, -0.1881, 0.5437], [0.4018, -0.1881, 0.5437]])
EYE_R = 0.1755
LM = {}

# ---------------------------------------------------------------- eyes
eyes = []
for e, c in enumerate(EYE_C):
    dist = np.linalg.norm(V - c, axis=1) - EYE_R
    near = np.linalg.norm(V - c, axis=1) < EYE_R * 1.6
    # edges of head triangles crossing the sphere, front hemisphere only
    E = np.concatenate([Fh[:, [0, 1]], Fh[:, [1, 2]], Fh[:, [2, 0]]])
    E = np.unique(np.sort(E, axis=1), axis=0)
    a, b = E[:, 0], E[:, 1]
    m = (dist[a] * dist[b] < 0) & near[a] & near[b] & (V[a, 2] > c[2]) & (V[b, 2] > c[2])
    a, b = a[m], b[m]
    # exact crossing with the sphere along the edge (quadratic)
    pa, pb = V[a] - c, V[b] - c
    u = pb - pa
    A = (u * u).sum(1); B = 2 * (pa * u).sum(1); Cq = (pa * pa).sum(1) - EYE_R ** 2
    t = (-B + np.sqrt(np.maximum(B * B - 4 * A * Cq, 0))) / (2 * A)
    t = np.where((t < 0) | (t > 1), (-B - np.sqrt(np.maximum(B * B - 4 * A * Cq, 0))) / (2 * A), t)
    P = pa + t[:, None] * u + c
    # gaze axis: centre -> contour centroid (on the sphere)
    ax = P.mean(0) - c; ax /= np.linalg.norm(ax)
    # local frame: x toward the subject's side (sign of c.x), y up
    ey = np.array([0, 1, 0.]) - ax[1] * ax; ey /= np.linalg.norm(ey)
    ex = np.cross(ey, ax)
    q = np.c_[(P - c) @ ex, (P - c) @ ey]
    ang = np.arctan2(q[:, 1], q[:, 0])
    o = np.argsort(ang)
    P, q, ang = P[o], q[o], ang[o]
    # corners: extreme x in world (inner = closest to the midline)
    inner = np.argmin(np.abs(P[:, 0])); outer = np.argmax(np.abs(P[:, 0]))
    cy = 0.5 * (P[inner, 1] + P[outer, 1])
    xi, xo = P[inner, 0], P[outer, 0]
    # upper / lower lid: split by the corner-to-corner line
    lin = P[inner, 1] + (P[:, 0] - xi) / (xo - xi) * (P[outer, 1] - P[inner, 1])
    up = P[:, 1] > lin
    def at_frac(sel, f):
        x = xi + f * (xo - xi)
        S = P[sel]
        j = np.argmin(np.abs(S[:, 0] - x))
        return S[j]
    ev = dict(centre=c.tolist(), axis=ax.tolist(), inner=P[inner].tolist(), outer=P[outer].tolist(),
              up13=at_frac(up, 1 / 3).tolist(), up23=at_frac(up, 2 / 3).tolist(), lo13=at_frac(~up, 1 / 3).tolist(), lo23=at_frac(~up, 2 / 3).tolist(),
              upTop=P[up][np.argmax(P[up][:, 1])].tolist(), loBot=P[~up][np.argmin(P[~up][:, 1])].tolist(),
              contour=P.tolist(), contourUp=up.tolist())
    pupil = c + EYE_R * ax
    ev['pupil'] = pupil.tolist()
    eyes.append(ev)
    log('eye', e, 'axis', ax.round(3), 'inner', P[inner].round(3), 'outer', P[outer].round(3), 'upTop', np.round(ev['upTop'], 3), 'loBot', np.round(ev['loBot'], 3),
        'open h', round(ev['upTop'][1] - ev['loBot'][1], 4), 'w', round(abs(xo - xi), 4), 'n', len(P))
LM['eyes'] = eyes

# ---------------------------------------------------------------- midline profile + lip seam per column
def front_profile(x0, y0, y1, dy=0.002):
    P, t = slice_points(V, Fh, 0, x0)
    P = P[(P[:, 1] > y0) & (P[:, 1] < y1) & (P[:, 2] > 0.2)]
    ys = np.arange(y0, y1, dy)
    zs = np.full(len(ys), np.nan)
    for i, y in enumerate(ys):
        m = np.abs(P[:, 1] - y) < dy * 0.75
        if m.any(): zs[i] = P[m, 2].max()
    ok = ~np.isnan(zs)
    return ys[ok], zs[ok]

ys, zs = front_profile(0.0, -1.6, 0.6)
np.save(WORK + '/midline.npy', np.c_[ys, zs])
def argmax_in(y0, y1, sign=1):
    m = (ys > y0) & (ys < y1)
    i = np.argmax(sign * zs[m]); return float(ys[m][i]), float(zs[m][i])
nose = argmax_in(-0.8, -0.4)
nasion = argmax_in(-0.35, 0.0, -1)
sub = argmax_in(nose[0] - 0.2, nose[0] - 0.05, -1)
ulip = argmax_in(-0.95, sub[0] - 0.03)
llip = argmax_in(-1.15, -0.99)
seam0 = argmax_in(llip[0], ulip[0], -1)
labial = argmax_in(-1.3, llip[0] - 0.03, -1)
chinf = argmax_in(-1.5, labial[0] - 0.02)
log('midline: nasion', np.round(nasion, 4), 'nose tip', np.round(nose, 4), 'subnasale', np.round(sub, 4), 'upper lip', np.round(ulip, 4), 'seam', np.round(seam0, 4),
    'lower lip', np.round(llip, 4), 'mentolabial', np.round(labial, 4), 'chin front', np.round(chinf, 4))
# menton: lowest point of the chin on the midline slice (front half)
Pm, _ = slice_points(V, Fh, 0, 0.0)
chinb = Pm[(Pm[:, 2] > 0.2)][np.argmin(Pm[(Pm[:, 2] > 0.2)][:, 1])]
# chin '8' (ICT menton-ish): midline point where the chin normal is ~45 deg down-forward
cand = Pm[(Pm[:, 1] < chinf[0]) & (Pm[:, 2] > 0.2)]
# pick the point maximising z - y (45 deg support point)
ch45 = cand[np.argmax(cand[:, 2] - cand[:, 1])]
log('menton (lowest)', chinb.round(4), 'chin 45deg', ch45.round(4))
LM['mid'] = dict(nasion=[0, *nasion[::-1][::-1]], noseTip=[0, *nose], subnasale=[0, *sub], upperLip=[0, *ulip], seam=[0, *seam0], lowerLip=[0, *llip],
                 mentolabial=[0, *labial], chinFront=[0, *chinf], chin45=ch45.tolist(), menton=chinb.tolist())

seam = []
def fine_profile(x0, y0, y1, dy=0.001):
    """z(y) of the front-most surface in the slice x = x0, resampled on a fine y grid"""
    ys_, zs_ = front_profile(x0, y0, y1, 0.003)
    yy = np.arange(ys_[0], ys_[-1], dy)
    return yy, np.interp(yy, ys_, zs_)
for x0 in np.arange(0.0, 0.26, 0.005):
    yy, zz = fine_profile(x0, -1.12, -0.86)
    band = (yy > -1.07) & (yy < -0.93)
    j = np.where(band)[0][np.argmin(zz[band])]
    up = zz[(yy > yy[j]) & (yy < yy[j] + 0.03)].max() - zz[j]
    dn = zz[(yy < yy[j]) & (yy > yy[j] - 0.03)].max() - zz[j]
    depth = min(up, dn)
    seam.append([float(x0), float(yy[j]), float(zz[j]), float(depth)])
    log('  seam x %.3f y %.4f z %.4f depth %.4f (up %.4f dn %.4f)' % (x0, yy[j], zz[j], depth, up, dn))
seam = np.array(seam)
ok = seam[:, 3] > 0.004
end = np.argmin(ok) if not ok.all() else len(ok)
corner = seam[end - 1]
log('mouth corner (last notch column)', corner.round(4))
LM['mouthCorner'] = [float(corner[0]), float(corner[1]), float(corner[2])]
LM['seamColumns'] = seam[:end].tolist()

# ---------------------------------------------------------------- horizontal slices through the nose base
for yy in (sub[0] + 0.01, sub[0] + 0.04, sub[0] + 0.07):
    P, t = slice_points(V, Fh, 1, yy)
    P = P[(P[:, 2] > 0.5) & (np.abs(P[:, 0]) < 0.4)]
    o = np.argsort(P[:, 0]); P = P[o]
    xs = np.arange(0, 0.35, 0.005)
    row = []
    for x in xs:
        m = np.abs(P[:, 0] - x) < 0.004
        row.append(P[m, 2].max() if m.any() else np.nan)
    log('  nose slice y %.3f  z(x):' % yy, ' '.join('%.3f' % z for z in row[::2]))
json.dump(LM, open(WORK + '/landmarks.json', 'w'), indent=1)
log('done')
