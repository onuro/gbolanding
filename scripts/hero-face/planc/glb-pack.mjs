// Plan C: inspect the Blender GLB and write a compressed copy (prune, quantize, sparse morphs, meshopt).
//   node glb-pack.mjs [in.glb] [out.glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize, sparse, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
const HF = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc';
const src = process.argv[2] || `${HF}/mesh-cute.glb`, dst = process.argv[3] || `${HF}/mesh-cute.min.glb`;
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
const root = doc.getRoot();
for (const m of root.listMeshes()) {
  const prims = m.listPrimitives();
  console.log('mesh', m.getName(), 'primitives', prims.length, 'targets', prims[0].listTargets().length, 'target names', (m.getExtras().targetNames || []).slice(0, 4));
  for (const p of prims) console.log('  prim material', p.getMaterial()?.getName(), 'verts', p.getAttribute('POSITION').getCount(), 'tris', (p.getIndices()?.getCount() || 0) / 3);
}
console.log('node extras keys', root.listNodes().map((n) => Object.keys(n.getExtras())));
await doc.transform(prune(), dedup(), sparse({ ratio: 0.2 }), quantize({ quantizePosition: 14, quantizeNormal: 8 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(dst, doc);
const { statSync } = await import('node:fs');
console.log('wrote', dst, (statSync(dst).size / 1e6).toFixed(2), 'MB (from', (statSync(src).size / 1e6).toFixed(2), 'MB)');
