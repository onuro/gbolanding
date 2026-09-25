# Step 8b: grey shaded check renders straight from an exported hero-face lab mesh (json + bin, W units), i.e. exactly
# the geometry + morphs the engine reads. Parts get their own grey: skin, mouth (near black), teeth, sclera, iris.
#   Blender -b --python s85_lab_renders.py -- [--mesh OUT/lab/mesh-sfp.json] [--prefix final] [--only rest,AA]
#                                              [--cams front,q34,mouth,eyes] [--rc OUT/rig-checks]
# out: <rc>/<prefix>-<pose>_<cam>.png (contact sheets: final-sheets.sh, montage.mjs)
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy

args = argv_after_dashes()
opt = lambda k, d: args[args.index('--' + k) + 1] if '--' + k in args else d
MESH = opt('mesh', OUT + '/lab/mesh-sfp.json')
PREFIX = opt('prefix', 'final')
RC = opt('rc', OUT + '/rig-checks')
ONLY = opt('only', '')
CAMS = opt('cams', 'front,q34,mouth,eyes').split(',')
os.makedirs(RC, exist_ok=True)

h = json.load(open(MESH)); raw = open(os.path.join(os.path.dirname(MESH), h['bin']), 'rb').read()
def view(k):
    l = h['layout'][k]; dt = np.uint32 if l['type'] == 'u32' else np.float32
    a = np.frombuffer(raw, dt, l['count'] * l['size'], l['offset'])
    return a.reshape(-1, l['size']) if l['size'] > 1 else a
P = view('position').astype(np.float64); T = view('index').astype(np.int64).reshape(-1, 3)
vpart = view('bake')[:, 3].round().astype(np.int64)
tv = vpart[T]; tpart = np.where((tv == 4).any(1), 4, tv.max(1))      # part from the vertices (robust to index order)
names = [m['name'] for m in h['morphs']]
D = {n: view('morph:%s:position' % n).astype(np.float64) for n in names}
lm = h['landmarks']
mc = np.array(lm['mouthCentre'])

# lip-sync poses: PLAN.md section 5 mapping (jaw cap 0.55; lowerDown 0.6 jaw, upperUp 0.2 jaw; round -> funnel / pucker,
# wide -> stretch / smile; mouthClose only on top of a little jaw) plus the classic viseme shapes
POSES = {
    'rest': {},
    'jaw020': {'jawOpen': 0.2},
    'jaw035': {'jawOpen': 0.35},
    'jaw050': {'jawOpen': 0.5},
    'AA': {'jawOpen': 0.5, 'mouthLowerDownLeft': 0.3, 'mouthLowerDownRight': 0.3, 'mouthUpperUpLeft': 0.1, 'mouthUpperUpRight': 0.1,
           'mouthStretchLeft': 0.1, 'mouthStretchRight': 0.1, 'mouthSmileLeft': 0.06, 'mouthSmileRight': 0.06},
    'EE': {'jawOpen': 0.18, 'mouthStretchLeft': 0.45, 'mouthStretchRight': 0.45, 'mouthSmileLeft': 0.3, 'mouthSmileRight': 0.3,
           'mouthLowerDownLeft': 0.2, 'mouthLowerDownRight': 0.2, 'mouthUpperUpLeft': 0.15, 'mouthUpperUpRight': 0.15},
    'OO': {'jawOpen': 0.22, 'mouthFunnel': 0.55, 'mouthPucker': 0.45},
    'OH': {'jawOpen': 0.38, 'mouthFunnel': 0.5, 'mouthLowerDownLeft': 0.15, 'mouthLowerDownRight': 0.15},
    'MBP': {'jawOpen': 0.1, 'mouthClose': 0.1, 'mouthPucker': 0.1},
    # FV from the lip-sync targets only (mouthRollLower, in the -all export, crumples the lower lip: not for driving)
    'FV': {'jawOpen': 0.1, 'mouthUpperUpLeft': 0.25, 'mouthUpperUpRight': 0.25, 'mouthClose': 0.05},
    'talk': {'jawOpen': 0.35, 'mouthLowerDownLeft': 0.21, 'mouthLowerDownRight': 0.21, 'mouthUpperUpLeft': 0.07, 'mouthUpperUpRight': 0.07,
             'mouthSmileLeft': 0.12, 'mouthSmileRight': 0.12},
    # PLAN.md section 5 at s = 1 with round = 1 (the driver's strongest rounded vowel)
    'roundMax': {'jawOpen': 0.5, 'mouthLowerDownLeft': 0.3, 'mouthLowerDownRight': 0.3, 'mouthUpperUpLeft': 0.1, 'mouthUpperUpRight': 0.1,
                 'mouthFunnel': 0.35, 'mouthPucker': 0.2, 'mouthSmileLeft': 0.06, 'mouthSmileRight': 0.06},
    'blink050': {'eyeBlinkLeft': 0.5, 'eyeBlinkRight': 0.5},
    'blink100': {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1},
    'smile': {'mouthSmileLeft': 0.6, 'mouthSmileRight': 0.6},
}
missing = sorted({n for w in POSES.values() for n in w if n not in D})
if missing: log('note: morphs not in this mesh (ignored in poses):', missing)
only = ONLY.split(',') if ONLY else None

reset_scene()
setup_render((1000, 1000))
sc = bpy.context.scene
mats = [material(k, c) for k, c in (('skin', (0.62, 0.62, 0.64)), ('mouth', (0.015, 0.012, 0.012)), ('teeth', (0.33, 0.33, 0.31)),
                                     ('sclera', (0.8, 0.8, 0.82)), ('iris', (0.3, 0.28, 0.27)), ('lacrimal', (0.62, 0.5, 0.5)))]
cams = {
    'front': (camera('front', (0, -0.3, 10), (0, -0.3, 0), ortho=1.5), (1000, 1000)),
    'q34': (camera('q34', (3.35, 0.05, 6.6), (0.03, -0.3, 0.05), lens=120), (1000, 1000)),
    'mouth': (camera('mouth', (0, mc[1] - 0.02, 10), (0, mc[1] - 0.02, 0), ortho=0.5), (1000, 1000)),
    'eyes': (camera('eyes', (0, 0.0, 10), (0, 0.0, 0), ortho=0.86), (1200, 480)),
}
objs = []
def build(w):
    for o in objs: bpy.data.objects.remove(o)
    objs.clear()
    X = P.copy()
    for n, x in w.items():
        if x and n in D: X += x * D[n]
    ob = make_mesh('lab', X, T); set_smooth(ob)
    for m in mats: ob.data.materials.append(m)
    ob.data.polygons.foreach_set('material_index', tpart.astype(np.int32)); ob.data.update()
    objs.append(ob)

done = {}
for pn, w in POSES.items():
    if only and pn not in only: continue
    build(w)
    for cn in CAMS:
        cam, res = cams[cn]
        sc.render.resolution_x, sc.render.resolution_y = res
        path = RC + '/%s-%s_%s.png' % (PREFIX, pn, cn)
        render_to(path, cam); done[(pn, cn)] = path
    log('rendered', pn)

log('done')
