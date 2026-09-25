#!/usr/bin/env node
// Plan B lab bundle: esbuild the FROZEN engine snapshot (planb/lab/engine, copied from
// src/components/hero-face/engine) + planb/lab/lab-main.ts into planb/lab/lab.js. Touches nothing else.
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
const HERE = dirname(fileURLToPath(import.meta.url));
const LAB = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planb/lab';
const THREE_DIR = join(HERE, '../node_modules/three');
const pin = {
  name: 'pin',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: join(THREE_DIR, 'build/three.module.js') }));
    b.onResolve({ filter: /^three\/(addons|examples\/jsm)\// }, (a) => ({ path: join(THREE_DIR, 'examples/jsm', a.path.replace(/^three\/(addons|examples\/jsm)\//, '')) + (a.path.endsWith('.js') ? '' : '.js') }));
    b.onResolve({ filter: /^hero-face-engine$/ }, () => ({ path: join(LAB, 'engine/index.ts') }));
  },
};
const r = await esbuild.build({
  entryPoints: [join(LAB, 'lab-main.ts')], outfile: join(LAB, 'lab.js'), bundle: true, format: 'iife', target: 'es2022',
  sourcemap: 'inline', logLevel: 'warning', plugins: [pin], define: { 'import.meta.env.DEV': 'true' }, metafile: true,
});
console.log('bundled', Object.values(r.metafile.outputs).reduce((a, o) => a + o.bytes, 0), 'bytes');
