# Plan C step 2: cross-sections of the sculpt through the eye and the mouth (head = white, eyeball = red).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
V, F, FG, gnames = load_sculpt()
comp = np.load(WORK + '/sculpt_comp.npy')
fcomp = comp[F[:, 0]]
keep = FG[:] != gnames['Group40947']
cols = np.array([[230, 230, 230], [255, 70, 70], [255, 70, 70], [80, 160, 255], [80, 160, 255], [90, 255, 90]])
def plot(name, axis, value, dims, rect, size=(900, 900)):
    P, t = slice_points(V, F[keep], axis, value)
    c = cols[fcomp[keep][t]]
    scatter_plot(OUT + '/inspect/' + name, P[:, dims], c, rect, size, r=2)
# eye: sagittal slices through the eye centre (x = 0.40) and a bit to the sides; horizontal slice at eye centre
for xs in (0.30, 0.40, 0.50):
    plot('slice_eye_x%.2f.png' % xs, 0, xs, [2, 1], (0.2, -0.5, 1.0, 0.3))
plot('slice_eye_y.png', 1, -0.19, [0, 2], (0.0, 0.2, 0.8, 1.0))
# mouth: midline and off-centre sagittal slices, horizontal through the lip seam
for xs in (0.0, 0.06, 0.12, 0.18):
    plot('slice_mouth_x%.2f.png' % xs, 0, xs, [2, 1], (0.4, -1.3, 1.2, -0.5))
plot('slice_face_x0.png', 0, 0.0, [2, 1], (-1.5, -1.6, 1.3, 1.2))
log('done')
