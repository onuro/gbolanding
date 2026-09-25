# Step 6: grey shaded rig checks (front + 3/4) at rest, jawOpen 0.2/0.35/0.5, blink, speech mix, etc.
#   Blender -b --python s50_checks.py -- [--only rest,jaw050] [--sheet]
# out: OUT/rig-checks/*.png + OUT/rig-checks/sheet-*.png
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy

args = argv_after_dashes()
RIGN = args[args.index('--rig') + 1] if '--rig' in args else 'rig'
RC = args[args.index('--rc') + 1] if '--rc' in args else OUT + '/rig-checks'
os.makedirs(RC, exist_ok=True)
rig = dict(np.load(WORK + '/%s.npz' % RIGN))
names = list(rig['names'])

def pose(w):
    SV = rig['SV'].copy(); TV = rig['TV'].copy(); PV = rig['POS'].copy()
    for n, x in w.items():
        if not x: continue
        SV += x * rig['dS_' + n]; TV += x * rig['dT_' + n]; PV += x * rig['dP_' + n]
    return SV, TV, PV

POSES = {
    'rest': {},
    'jaw020': {'jawOpen': 0.2},
    'jaw035': {'jawOpen': 0.35},
    'jaw050': {'jawOpen': 0.5},
    'speech': {'jawOpen': 0.5, 'mouthLowerDown_L': 0.3, 'mouthLowerDown_R': 0.3, 'mouthUpperUp_L': 0.1, 'mouthUpperUp_R': 0.1, 'mouthSmile_L': 0.18, 'mouthSmile_R': 0.18},
    'blink100': {'eyeBlink_L': 1, 'eyeBlink_R': 1},
    'blink050': {'eyeBlink_L': 0.5, 'eyeBlink_R': 0.5},
    'smile': {'mouthSmile_L': 0.7, 'mouthSmile_R': 0.7},
    'funnel': {'mouthFunnel': 0.6, 'jawOpen': 0.15},
    'pucker': {'mouthPucker': 0.7},
    'stretch': {'mouthStretch_L': 0.5, 'mouthStretch_R': 0.5, 'jawOpen': 0.2},
    'brows': {'browInnerUp_L': 1, 'browInnerUp_R': 1, 'eyeWide_L': 0.6, 'eyeWide_R': 0.6},
    'squint': {'eyeSquint_L': 1, 'eyeSquint_R': 1, 'browDown_L': 0.6, 'browDown_R': 0.6},
    'look': {'eyeLookUp_L': 0.6, 'eyeLookUp_R': 0.6, 'eyeLookOut_L': 0.5, 'eyeLookIn_R': 0.5},
    # lipsync-range combos (PLAN.md section 5 caps)
    'lsOpen': {'jawOpen': 0.55, 'mouthLowerDown_L': 0.33, 'mouthLowerDown_R': 0.33, 'mouthUpperUp_L': 0.11, 'mouthUpperUp_R': 0.11,
               'mouthStretch_L': 0.25, 'mouthStretch_R': 0.25, 'mouthSmile_L': 0.18, 'mouthSmile_R': 0.18},
    'lsRound': {'jawOpen': 0.35, 'mouthFunnel': 0.35, 'mouthPucker': 0.2, 'mouthLowerDown_L': 0.21, 'mouthLowerDown_R': 0.21},
    'lsClose': {'jawOpen': 0.3, 'mouthClose': 0.3},
    'lsCloseNoJaw': {'mouthClose': 0.3},
    'idleSmile': {'mouthSmile_L': 0.06, 'mouthSmile_R': 0.06},
}
only = None
if '--only' in args: only = args[args.index('--only') + 1].split(',')

reset_scene()
setup_render((900, 900))
sc = bpy.context.scene
sc.display.shading.show_cavity = False
mats = {k: material(k, c) for k, c in (('skin', (0.62, 0.62, 0.64)), ('eye', (0.78, 0.78, 0.8)), ('trim', (0.45, 0.45, 0.47)),
                                          ('mouth', (0.015, 0.012, 0.012)), ('teeth', (0.3, 0.3, 0.28)))}
Spart = rig['Spart']
partmat = np.array([0, 0, 1, 2, 2, 2])  # head, ear, eyeball, brow, lash, lashlow
cams = {
    'front': camera('front', (0, -0.5, 14), (0, -0.5, 0), ortho=1.75),
    'q34': camera('q34', (5.0, -0.25, 9.8), (0.05, -0.5, 0.45), lens=120),
    'mouth': camera('mouth', (0, -0.9, 14), (0, -0.9, 0), ortho=0.75),
    'eye': camera('eye', (0.38, -0.16, 14), (0.38, -0.16, 0), ortho=0.5),
}
objs = []
def build(w):
    for o in objs: bpy.data.objects.remove(o)
    objs.clear()
    SV, TV, PV = pose(w)
    SF = rig['SF']
    fm = partmat[Spart[SF[:, 0]]]
    ob = make_mesh('skin', SV, SF); set_smooth(ob)
    for k in ('skin', 'eye', 'trim'): ob.data.materials.append(mats[k])
    ob.data.polygons.foreach_set('material_index', fm.astype(np.int32)); ob.data.update()
    objs.append(ob)
    ob = make_mesh('mouth', PV, rig['PF']); set_smooth(ob); ob.data.materials.append(mats['mouth']); objs.append(ob)
    ob = make_mesh('teeth', TV, rig['TF']); set_smooth(ob); ob.data.materials.append(mats['teeth']); objs.append(ob)

def load_png(path):
    im = bpy.data.images.load(path)
    w, h = im.size
    px = np.array(im.pixels[:]).reshape(h, w, 4)[::-1, :, :3]
    bpy.data.images.remove(im)
    return (px * 255).round()

done = {}
for pn, w in POSES.items():
    if only and pn not in only: continue
    build(w)
    for cn, cam in cams.items():
        if pn not in ('rest', 'jaw020', 'jaw035', 'jaw050', 'speech', 'blink100', 'blink050') and cn in ('eye',): continue
        path = RC + '/%s_%s.png' % (pn, cn)
        render_to(path, cam)
        done[(pn, cn)] = path
    log('rendered', pn)

if '--sheet' in args or not only:
    # contact sheets: required poses front / 3/4 / mouth, then extras
    def sheet(rows, cols_, name, scale=2):
        tiles = []
        for r in rows:
            line = []
            for c in cols_:
                p = done.get((r, c))
                img = load_png(p)[::scale, ::scale] if p else np.zeros((900 // scale, 900 // scale, 3))
                # label bar
                img[:22] = 20
                line.append(img)
            tiles.append(np.concatenate(line, 1))
        save_png(RC + '/sheet-%s.png' % name, np.concatenate(tiles, 0))
    sheet(['rest', 'jaw020', 'jaw035', 'jaw050', 'blink100'], ['front', 'q34', 'mouth'], 'required')
    sheet(['speech', 'blink050', 'smile', 'funnel', 'pucker', 'stretch', 'brows', 'squint', 'look'], ['front', 'q34', 'mouth'], 'extras')
    sheet(['rest', 'blink050', 'blink100', 'jaw050'], ['eye'], 'eyes', scale=1)
    sheet(['idleSmile', 'lsOpen', 'lsRound', 'lsClose', 'lsCloseNoJaw'], ['front', 'q34', 'mouth'], 'lipsync')
log('done')
