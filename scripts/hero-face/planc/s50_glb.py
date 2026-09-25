# Plan C step 50: GLB of the rigged head (W units, +Y up, +Z toward the viewer; no axis conversion).
# One primitive per part (skin / mouth / teeth / sclera / iris), ARKit-named morph targets with normals,
# landmarks + credits in the node extras.
#   Blender -b --factory-startup --python s50_glb.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy
r = np.load(WORK + '/rig.npz', allow_pickle=True)
P, index, part, morphs, names = r['P'], r['index'].reshape(-1, 3), r['part'], r['morphs'], [str(n) for n in r['names']]
hdr = json.load(open(OUT + '/mesh-cute.json'))
ark = {n: (n[:-2] + ('Left' if n.endswith('_L') else 'Right')) if n[-2:] in ('_L', '_R') else n for n in names}
reset_scene()
ob = make_mesh('cute_head', P, index)
set_smooth(ob)
cols = {0: ('skin', (0.62, 0.62, 0.64)), 1: ('mouth', (0.06, 0.02, 0.02)), 2: ('teeth', (0.92, 0.9, 0.84)), 3: ('sclera', (0.9, 0.9, 0.92)), 4: ('iris', (0.16, 0.2, 0.26))}
for k in range(5): ob.data.materials.append(material(*cols[k]))
tri_part = part[index[:, 0]].astype(int); tri_part[(part[index] == 4).any(1)] = 4
ob.data.polygons.foreach_set('material_index', tri_part.astype(np.int32)); ob.data.update()
ob.shape_key_add(name='Basis')
for n, D in zip(names, morphs):
    k = ob.shape_key_add(name=ark[n]); k.data.foreach_set('co', (P + D).astype(np.float32).ravel())
ob['landmarks'] = json.dumps(hdr['landmarks'])
ob['credits'] = hdr['copyright']
ob['units'] = hdr['units']
path = OUT + '/mesh-cute.glb'
kw = dict(filepath=path, export_format='GLB', use_selection=False, export_yup=False, export_apply=False,
          export_morph=True, export_morph_normal=True, export_extras=True, export_materials='EXPORT', export_texcoords=False)
try:
    bpy.ops.export_scene.gltf(**kw)
except TypeError:
    kw.pop('export_texcoords'); bpy.ops.export_scene.gltf(**kw)
log('wrote', path, '%.2f MB' % (os.path.getsize(path) / 1e6), 'morphs', len(names))
