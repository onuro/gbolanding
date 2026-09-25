# Re-import OUT/mesh-sfp.glb (or mesh-sf.glb for a centre-W export), list meshes/shape keys, render front at rest + jawOpen .5 + blink (checks axes & keys).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy
reset_scene(); setup_render((700, 800))
GLB = OUT + '/mesh-%s.glb' % ('sfp' if json.load(open(WORK + '/sf-src.json')).get('wmode') == 'pupil' else 'sf')
bpy.ops.import_scene.gltf(filepath=GLB)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes:
    ks = o.data.shape_keys.key_blocks if o.data.shape_keys else []
    log(o.name, len(o.data.vertices), 'verts', len(ks) - 1 if ks else 0, 'keys', [k.name for k in ks][1:6], '...')
# camera: glTF +Y up / +Z front -> Blender +Z up / -Y front
from mathutils import Vector
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 1.4
co = bpy.data.objects.new('c', cam); bpy.context.scene.collection.objects.link(co)
co.location = (0, -10, -0.35); co.rotation_euler = (1.5708, 0, 0)
bpy.context.scene.camera = co
def setk(vals):
    for o in meshes:
        if not o.data.shape_keys: continue
        for k in o.data.shape_keys.key_blocks[1:]: k.value = vals.get(k.name, 0.0)
os.makedirs(OUT + '/rig-checks', exist_ok=True)
for tag, vals in (('rest', {}), ('jaw050', {'jawOpen': 0.5}), ('blink', {'eyeBlinkLeft': 1, 'eyeBlinkRight': 1}), ('lookup', {'eyeLookUpLeft': 0.5, 'eyeLookUpRight': 0.5})):
    setk(vals)
    bpy.context.scene.render.filepath = OUT + '/rig-checks/glb_%s.png' % tag
    bpy.ops.render.render(write_still=True)
log('asset copyright check:', open(GLB, 'rb').read(4000).find(b'Rodesqa') > 0)
