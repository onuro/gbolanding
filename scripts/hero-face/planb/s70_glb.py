# Step 5b: GLB for later (shipping pipeline): same W-normalised geometry as the lab mesh, one mesh per engine part,
# all 34 ICT-derived expressions as shape keys (ARKit names), credits in asset.copyright, landmarks in extras.
#   Blender -b --python s70_glb.py
# out: OUT/mesh-sfp.glb (pupil W, the default) or OUT/mesh-sf.glb (centre W)
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy

hdr = json.load(open(WORK + '/sf-src.json'))
raw = open(WORK + '/sf-src.bin', 'rb').read()
def view(k):
    l = hdr['layout'][k]
    dt = np.uint32 if l['type'] == 'u32' else np.float32
    return np.frombuffer(raw, dt, l['count'] * l['size'], l['offset']).reshape(-1, l['size']) if l['size'] > 1 else np.frombuffer(raw, dt, l['count'], l['offset'])
P = view('position').astype(np.float64); idx = view('index').astype(np.int64).reshape(-1, 3); part = view('part')
names = hdr['names']
arkit = lambda n: n.replace('_L', 'Left') if n.endswith('_L') else (n.replace('_R', 'Right') if n.endswith('_R') else n)
D = {n: view('morph:' + n).astype(np.float64) for n in names}
to_b = lambda X: np.c_[X[:, 0], -X[:, 2], X[:, 1]]      # OBJ/glTF space (Y up, +Z front) -> Blender (Z up)

reset_scene()
mats = {k: material(k, c) for k, c in (('skin', (0.62, 0.62, 0.64)), ('mouth', (0.02, 0.015, 0.015)), ('teeth', (0.35, 0.35, 0.33)),
                                          ('sclera', (0.8, 0.8, 0.82)), ('iris', (0.25, 0.22, 0.2)))}
groups = {'skin': ['skin'], 'mouth': ['mouth'], 'teeth': ['teeth'], 'eyes': ['sclera', 'iris']}
pinfo = {p['name']: p for p in hdr['parts']}
for gname, plist in groups.items():
    tri_sets = []; mat_ids = []
    for mi, pn in enumerate(plist):
        p = pinfo[pn]; T = idx[p['start'] // 3:(p['start'] + p['count']) // 3]
        tri_sets.append(T); mat_ids.append(np.full(len(T), mi))
    T = np.concatenate(tri_sets); M = np.concatenate(mat_ids)
    used = np.unique(T); remap = -np.ones(len(P), np.int64); remap[used] = np.arange(len(used))
    ob = make_mesh(gname, to_b(P[used]), remap[T])
    set_smooth(ob)
    for pn in plist: ob.data.materials.append(mats[pn])
    ob.data.polygons.foreach_set('material_index', M.astype(np.int32)); ob.data.update()
    ob.shape_key_add(name='Basis', from_mix=False)
    nk = 0
    for n in names:
        d = D[n][used]
        if np.abs(d).max() < 1e-7 and gname != 'skin': continue
        k = ob.shape_key_add(name=arkit(n), from_mix=False)
        k.data.foreach_set('co', to_b(P[used] + d).astype(np.float32).ravel())
        nk += 1
    log(gname, len(used), 'verts', len(T), 'tris', nk, 'shape keys')
root = bpy.data.objects.new('HeroFaceSF', None); bpy.context.scene.collection.objects.link(root)
for o in list(bpy.context.scene.objects):
    if o is not root: o.parent = root
root['landmarks'] = json.dumps(hdr['landmarks'])
root['units'] = 'W = 2 x %s (%.4f sculpt units); origin = midpoint between pupils; +Y up, +Z toward camera' % ('interpupillary distance' if hdr.get('wmode') == 'pupil' else 'inter-eyeball-centre distance', hdr['W_sculpt'])
root['credits'] = open(REPO + '/.cache/hero-face/sketchfab/CREDITS.txt').read()
copyright = ('"Stylized Anime Female Head" by Rodesqa (https://sketchfab.com/Rodesqa), CC BY 4.0 '
             '(http://creativecommons.org/licenses/by/4.0/), modified: decimated, lips split, mouth interior added, rigged. '
             'Expression shapes and teeth derived from ICT-FaceKit (c) 2020 USC Institute for Creative Technologies, MIT License.')
out = OUT + '/mesh-%s.glb' % ('sfp' if hdr.get('wmode') == 'pupil' else 'sf')
kw = dict(filepath=out, export_format='GLB', use_selection=False, export_extras=True, export_morph=True,
          export_morph_normal=False, export_apply=False, export_copyright=copyright, export_yup=True)
try:
    bpy.ops.export_scene.gltf(**kw)
except TypeError as e:
    log('exporter option mismatch, retrying minimal:', e)
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_extras=True, export_morph=True, export_copyright=copyright)
log('wrote', out, '%.1f MB' % (os.path.getsize(out) / 1e6))
