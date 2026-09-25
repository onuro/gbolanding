# Plan C debug render of rig.npz: any pose, any camera, parts hidden / wireframe.
#   Blender -b --factory-startup --python dbg_render.py -- --pose "jawOpen=0.5" --hide 1,2 --cam mouth --out x.png [--wire] [--rig path.npz]
#   cameras: front q34 mouth mouth34 mouthside eye eyeside eyetop lipzoom
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy

args = argv_after_dashes()
def arg(k, d):
    return type(d)(args[args.index('--' + k) + 1]) if '--' + k in args else d
r = np.load(arg('rig', WORK + '/rig.npz'), allow_pickle=True)
P, index, part, morphs, names = r['P'], r['index'].reshape(-1, 3), r['part'], r['morphs'], [str(n) for n in r['names']]
ark = {n: (n[:-2] + ('Left' if n.endswith('_L') else 'Right')) if n[-2:] in ('_L', '_R') else n for n in names}
w = {kv.split('=')[0]: float(kv.split('=')[1]) for kv in arg('pose', '').split(',') if kv}
X = P.copy()
for n, D in zip(names, morphs):
    X += w.get(ark[n], w.get(n, 0.0)) * D
hide = [int(h) for h in arg('hide', '').split(',') if h != '']
tri_part = part[index[:, 0]].astype(int)
tri_part[(part[index] == 4).any(1)] = 4
keep = ~np.isin(tri_part, hide)
reset_scene()
sc = setup_render((arg('res', 900), arg('res', 900)))
ob = make_mesh('face', X, index[keep]); set_smooth(ob)
mats = {0: material('skin', (0.62, 0.62, 0.64)), 1: material('mouth', (0.5, 0.05, 0.05)), 2: material('teeth', (0.92, 0.9, 0.84)),
        3: material('sclera', (0.9, 0.9, 0.92)), 4: material('iris', (0.16, 0.2, 0.26))}
for k in range(5): ob.data.materials.append(mats[k])
ob.data.polygons.foreach_set('material_index', tri_part[keep].astype(np.int32)); ob.data.update()
if '--wire' in args:
    wf = ob.modifiers.new('wf', 'WIREFRAME'); wf.thickness = arg('wt', 0.0006); wf.use_replace = False; wf.material_offset = 5
    ob.data.materials.append(material('wire', (0.02, 0.02, 0.02)))
cx, cy = arg('cx', 0.0), arg('cy', 0.0)
cams = {
    'front': lambda: camera('front', (0, -0.05, 12), (0, -0.05, 0), ortho=1.75),
    'q34': lambda: camera('q34', (5.6, 0.6, 10.5), (0, -0.08, -0.05), lens=150),
    'mouth': lambda: camera('mouth', (0, -0.47, 12), (0, -0.47, 0), ortho=arg('ortho', 0.42)),
    'mouth34': lambda: camera('mouth34', (4.8, -1.2, 10.5), (0, -0.47, 0.05), lens=420),
    'mouthside': lambda: camera('mouthside', (12, -0.47, 0.1), (0, -0.47, 0.1), ortho=arg('ortho', 0.42)),
    'mouthlow': lambda: camera('mouthlow', (0, -6, 10), (0, -0.47, 0.08), lens=500),
    'eye': lambda: camera('eye', (0.25, -0.01, 12), (0.25, -0.01, 0), ortho=arg('ortho', 0.32)),
    'eyeside': lambda: camera('eyeside', (9.5, 0.5, 6.0), (0.25, -0.01, -0.06), lens=520),
    'eyeprofile': lambda: camera('eyeprofile', (12, -0.01, -0.05), (0.25, -0.01, -0.05), ortho=arg('ortho', 0.32)),
    'eyetop': lambda: camera('eyetop', (0.25, 12, 1.0), (0.25, -0.01, -0.05), lens=arg('lens', 700)),
    'lipzoom': lambda: camera('lipzoom', (0.04, -0.49, 12), (0.04, -0.49, 0), ortho=0.14),
    'custom': lambda: camera('custom', tuple(map(float, arg('loc', '0,0,12').split(','))), tuple(map(float, arg('at', '0,0,0').split(','))), ortho=arg('ortho', 0.5)),
}
out = arg('out', OUT + '/dbg/dbg.png')
os.makedirs(os.path.dirname(out), exist_ok=True)
render_to(out, cams[arg('cam', 'front')]())
log('wrote', out)
