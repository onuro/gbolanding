#!/usr/bin/env node
// Plan C copy: bundles a FROZEN SNAPSHOT of the hero-face engine (planc/lab/engine) + the lab entry with esbuild.
// Does not touch the site build (.vite / dist): esbuild only writes --out.
//   node build-lab.mjs [--entry <lab-main.ts>] [--out <lab.js>] [--engine <engine dir>] [--watch]
// 'three' is pinned to scripts/hero-face/node_modules/three (0.185.1); 'hero-face-engine'
// resolves to <engine dir>/index.ts (plan C default: the snapshot in planc/lab/engine), so a lab can
// bundle a scratch copy of the engine without touching the site's.
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');
const LAB = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc/lab';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const entry = resolve(arg('entry', join(LAB, 'lab-main.ts')));
const out = resolve(arg('out', join(LAB, 'lab.js')));
const THREE_DIR = join(HERE, '../node_modules/three');
const ENGINE_DIR = resolve(arg('engine', join(LAB, 'engine')));  // plan C: frozen snapshot

const pin = {
  name: 'pin-three',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: join(THREE_DIR, 'build/three.module.js') }));
    b.onResolve({ filter: /^three\/(addons|examples\/jsm)\// }, (a) => ({ path: join(THREE_DIR, 'examples/jsm', a.path.replace(/^three\/(addons|examples\/jsm)\//, '')) + (a.path.endsWith('.js') ? '' : '.js') }));
    b.onResolve({ filter: /^hero-face-engine$/ }, () => ({ path: join(ENGINE_DIR, 'index.ts') }));
  },
};

const opts = {
  entryPoints: [entry],
  outfile: out,
  bundle: true,
  format: 'iife',
  target: 'es2022',
  sourcemap: 'inline',
  minify: argv.includes('--minify'),
  logLevel: 'info',
  plugins: [pin],
  define: { 'import.meta.env.DEV': 'true' },
};
if (argv.includes('--watch')) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
} else {
  const r = await esbuild.build({ ...opts, metafile: true });
  const bytes = Object.values(r.metafile.outputs).reduce((a, o) => a + o.bytes, 0);
  console.log(`bundled ${entry} -> ${out} (${(bytes / 1024).toFixed(0)} kB incl. inline sourcemap)`);
}
