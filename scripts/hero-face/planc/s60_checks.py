# Plan C step 60: grey rig-check renders of the rigged mesh (normalised W units, shape keys).
#   rest, jawOpen 0.2 / 0.35 / 0.5, eyeBlink 1 (both), front + 3/4, plus mouth / eye close-ups and a contact sheet.
#   Blender -b --factory-startup --python s60_checks.py -- [--set name] [--extra "jawOpen=0.3,mouthSmileLeft=0.2"]
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy

args = argv_after_dashes()
def arg(k, d):
    return type(d)(args[args.index('--' + k) + 1]) if '--' + k in args else d
OUTD = OUT + '/rig-checks'
os.makedirs(OUTD, exist_ok=True)
r = np.load(WORK + '/rig.npz', allow_pickle=True)
P, index, part, morphs, names = r['P'], r['index'].reshape(-1, 3), r['part'], r['morphs'], [str(n) for n in r['names']]
ark = {n: (n[:-2] + ('Left' if n.endswith('_L') else 'Right')) if n[-2:] in ('_L', '_R') else n for n in names}

reset_scene()
sc = setup_render((900, 900))
sc.display.shading.show_cavity = False
w_ = bpy.data.worlds.new('bg'); w_.color = (0.02, 0.02, 0.025); sc.world = w_
try:
    sc.display.shading.background_type = 'WORLD'
except Exception:
    pass
ob = make_mesh('face', P, index)
set_smooth(ob)
mats = {0: material('skin', (0.62, 0.62, 0.64)), 1: material('mouth', (0.06, 0.02, 0.02)), 2: material('teeth', (0.92, 0.9, 0.84)),
        3: material('sclera', (0.9, 0.9, 0.92)), 4: material('iris', (0.16, 0.2, 0.26))}
for k in range(5): ob.data.materials.append(mats[k])
tri_part = part[index[:, 0]].astype(int)
# iris triangles: any iris vertex
tri_part[(part[index] == 4).any(1)] = 4
ob.data.polygons.foreach_set('material_index', tri_part.astype(np.int32))
ob.data.update()
ob.shape_key_add(name='Basis')
for n, D in zip(names, morphs):
    k = ob.shape_key_add(name=ark[n])
    co = (P + D).astype(np.float32).ravel()
    k.data.foreach_set('co', co)
keys = ob.data.shape_keys.key_blocks
if '--wire' in args:
    wf = ob.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.0006; wf.use_replace = False; wf.material_offset = 5
    ob.data.materials.append(material('wire', (0.02, 0.02, 0.02)))
TAG = arg('tag', '')
def pose(w):
    for kb in keys[1:]: kb.value = 0.0
    for n, v in w.items(): keys[n].value = v
cams = {
    'front': camera('front', (0, -0.05, 12), (0, -0.05, 0), ortho=1.75),
    'q34': camera('q34', (5.6, 0.6, 10.5), (0, -0.08, -0.05), lens=150),
    'mouth': camera('mouth', (0, -0.47, 12), (0, -0.47, 0), ortho=0.42),
    'mouth34': camera('mouth34', (4.8, -1.2, 10.5), (0, -0.47, 0.05), lens=420),
    'lipzoom': camera('lipzoom', (0.04, -0.49, 12), (0.04, -0.49, 0), ortho=0.14),
    'lipzoomtop': camera('lipzoomtop', (0.04, 4.0, 11), (0.04, -0.49, 0.08), lens=900),
    'eye': camera('eye', (0.25, -0.01, 12), (0.25, -0.01, 0), ortho=0.32),
    'eyeside': camera('eyeside', (9.5, 0.5, 6.0), (0.25, -0.01, -0.06), lens=520),
}
SETS = {
    'rest': {},
    'jaw020': {'jawOpen': 0.2},
    'jaw035': {'jawOpen': 0.35},
    'jaw050': {'jawOpen': 0.5},
    'blink100': {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1},
    'blink050': {'eyeBlinkLeft': 0.5, 'eyeBlinkRight': 0.5},
    'talk_a': {'jawOpen': 0.35, 'mouthLowerDownLeft': 0.2, 'mouthLowerDownRight': 0.2, 'mouthUpperUpLeft': 0.07, 'mouthUpperUpRight': 0.07, 'mouthSmileLeft': 0.1, 'mouthSmileRight': 0.1},
    'talk_o': {'jawOpen': 0.25, 'mouthFunnel': 0.35, 'mouthPucker': 0.2},
    'smile': {'mouthSmileLeft': 0.6, 'mouthSmileRight': 0.6},
    'wide_brow': {'eyeWideLeft': 1, 'eyeWideRight': 1, 'browInnerUpLeft': 1, 'browInnerUpRight': 1},
    'squint': {'eyeSquintLeft': 1, 'eyeSquintRight': 1},
}
if '--extra' in args:
    SETS = {'extra': {kv.split('=')[0]: float(kv.split('=')[1]) for kv in arg('extra', '').split(',') if kv}}
only = arg('set', '')
views = {'rest': ['front', 'q34', 'mouth', 'eye', 'eyeside', 'mouth34'], 'jaw020': ['front', 'q34', 'mouth', 'mouth34'], 'jaw035': ['front', 'q34', 'mouth', 'mouth34', 'lipzoom', 'lipzoomtop'],
         'jaw050': ['front', 'q34', 'mouth', 'mouth34'], 'blink100': ['front', 'q34', 'eye', 'eyeside'], 'blink050': ['eye', 'eyeside'],
         'talk_a': ['front', 'mouth'], 'talk_o': ['front', 'mouth'], 'smile': ['front', 'mouth'], 'wide_brow': ['front', 'eye'], 'squint': ['front', 'eye'], 'extra': ['front', 'q34', 'mouth', 'eye']}
for sname, w in SETS.items():
    if only and sname != only: continue
    pose(w)
    for v in views[sname]:
        render_to('%s/%s%s_%s.png' % (OUTD, TAG, sname, v), cams[v])
log('done')
