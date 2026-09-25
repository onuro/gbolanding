# Cross-sections of the sculpt through the eye and the mouth; eyeball sphere fits.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
V, F = load_sculpt()
comp = np.load(WORK + '/sculpt_comp.npy')
cols = np.array([[200, 200, 200], [255, 80, 80], [80, 255, 80], [255, 0, 255], [255, 255, 0], [0, 255, 255], [255, 128, 0], [128, 0, 255], [0, 128, 255], [255, 255, 255], [0, 255, 128], [255, 0, 128], [128, 255, 0]])
def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]
    b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]
    c = x[:3]; r = np.sqrt(x[3] + c @ c)
    return c, r
for k in [3, 4, 5, 6]:
    c, r = fit_sphere(V[comp == k])
    res = np.abs(np.linalg.norm(V[comp == k] - c, axis=1) - r)
    log('comp', k, 'sphere c', c.round(4), 'r', round(r, 4), 'resid max', res.max().round(4), 'mean', res.mean().round(5))
os.makedirs(OUT + '/inspect', exist_ok=True)
for xs in [0.36, 0.25, 0.46]:
    m = np.abs(V[:, 0] - xs) < 0.003
    scatter_plot(OUT + '/inspect/slice_eye_x%.2f.png' % xs, V[m][:, [2, 1]], cols[comp[m] % len(cols)], (0.35, -0.45, 0.95, 0.15), (800, 800), r=2)
for xs in [0.0, 0.05, 0.1]:
    m = np.abs(V[:, 0] - xs) < 0.002
    scatter_plot(OUT + '/inspect/slice_mouth_x%.2f.png' % xs, V[m][:, [2, 1]], cols[comp[m] % len(cols)], (0.55, -1.25, 1.15, -0.65), (800, 800), r=2)
# horizontal slice through the eye centre
m = np.abs(V[:, 1] + 0.153) < 0.003
scatter_plot(OUT + '/inspect/slice_eye_y.png', V[m][:, [0, 2]], cols[comp[m] % len(cols)], (0.05, 0.3, 0.75, 1.0), (800, 800), r=2)
log('done')
