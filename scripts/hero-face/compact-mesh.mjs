#!/usr/bin/env node
// hero-face lab mesh (format 'hero-face-lab-mesh' v1, 26 MB of dense f32) -> compact production mesh
// (format 'hero-face-mesh-compact' v2) that engine-cine/lab-mesh.ts expands back to the same FaceMeshData.
// Plain Node, no dependencies (node:zlib).
//
// usage: node scripts/hero-face/compact-mesh.mjs [--in <v1 mesh json>] [--out public/hero-face/face.json]
//                                                [--pos-step 2e-5] [--nrm-step 1e-3]
//
// Source: the v1 'planb' mesh (scripts/hero-face/lab-mesh.mjs). The working copy is public/dev-hero-face/mesh-planb.*
// (git-ignored, local only); --in defaults to it, else to public/hero-face/mesh-planb.*, the byte-identical copy
// committed in cc8714b. If both are gone, restore it from git first:
//   git show cc8714b:public/hero-face/mesh-planb.json > public/dev-hero-face/mesh-planb.json   (same for .bin)
// Either input writes byte-identical face.* (only the basename lands in the header's "compactFrom").
//
// Format v2
//   <name>.json  the v1 header verbatim (source / copyright / parts / landmarks / morphs / lookData / ...) except:
//                format 'hero-face-mesh-compact', version 2, "bin" -> the new .bin, "compression": "deflate-raw",
//                "rawBytes" (size after inflating), "morphCoding" (below) and a new "layout".
//   <name>.bin   ONE deflate-raw stream (browser: DecompressionStream('deflate-raw')). Inflated, it is a
//                little-endian buffer of sections, each starting on a 4-byte boundary (typed-array views):
//     layout[k] = { offset, type: 'f32' | 'u16' | 'i16', size, count, scale? }   value = int * scale
//                 (scale: one number, or one per component)
//     position  f32 x3        exact (not quantized)
//     normal    i16 x3        scale 1/32767                    (|err| <= 1.6e-5)
//     bake      u16 x4        scale [1/65535 x3, 1]            (x, y, z |err| <= 7.7e-6; w = part id, exact)
//     eye       i16           scale 1/32767                    (0 stays 0, +-1 exact)
//     curv      i16           scale 1/32767
//     feat      i16 x4        scale 1/32767                    (masks: 0 stays 0, +-1 exact, signs kept)
//     index     u16           exact (vertexCount < 65536; expanded to Uint32Array)
//     morph:<name>:position / morph:<name>:normal (every v1 morph, both kinds)
//               { mask, offset, type: 'i16', size: 3, count, scale: step }
//               mask   = ceil(V / 8) bytes at `mask`: bit (v & 7) of byte (v >> 3) set = vertex v has a delta
//                        (a vertex is left out iff all three components quantize to 0, so the error stays <= step / 2)
//               values = `count` i16 triples at `offset`, one per set bit in vertex order: the residual
//                        q[v] - round(mean of q[u] over v's known neighbours), q = round(delta / step).
//                        Neighbours: for every triangle (a, b, c) of `index`, a lists b and c, b lists c and a,
//                        c lists a and b (edges shared by two triangles count twice). Known: u < v (already
//                        decoded) or u not in the mask (q = 0). No known neighbour: prediction 0.
//                        Rounding is Math.round on the integer sum / count (identical in Node and browsers).
//               steps: position 2e-5 W (|err| <= 1e-5 W, ~0.005 px on the hero), normal 1e-3 (|err| <= 5e-4)
//   Nothing is dropped: all 30 morphs are kept (eyeWide* has no named caller but expressions are free-form maps).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync, inflateRawSync, brotliCompressSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const DEV_SRC = 'public/dev-hero-face/mesh-planb.json';
const IN = resolve(REPO, arg('in', existsSync(resolve(REPO, DEV_SRC)) ? DEV_SRC : 'public/hero-face/mesh-planb.json'));
const OUT = resolve(REPO, arg('out', 'public/hero-face/face.json'));
const POS_STEP = Number(arg('pos-step', '2e-5'));
const NRM_STEP = Number(arg('nrm-step', '1e-3'));

// ---------------------------------------------------------------- read v1
const header = JSON.parse(readFileSync(IN, 'utf8'));
if (header.format !== 'hero-face-lab-mesh' || header.version !== 1) throw new Error(`${IN}: not a v1 hero-face lab mesh`);
const binFile = readFileSync(join(dirname(IN), header.bin));
const src = binFile.buffer.slice(binFile.byteOffset, binFile.byteOffset + binFile.byteLength);
const V = header.vertexCount;
if (V >= 65536) throw new Error('u16 indices need < 65536 vertices');
const view = (l) => (l.type === 'u32' ? new Uint32Array(src, l.offset, l.count * l.size) : new Float32Array(src, l.offset, l.count * l.size));
const L1 = header.layout;
const orig = Object.fromEntries(Object.entries(L1).map(([k, l]) => [k, view(l)]));

// ---------------------------------------------------------------- writer
const chunks = [];
let size = 0;
const layout = {};
function put(bytes) {
  const pad = (4 - (size % 4)) % 4;
  if (pad) chunks.push(new Uint8Array(pad)), (size += pad);
  const offset = size;
  chunks.push(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  size += bytes.byteLength;
  return offset;
}
function quant(name, type, scale, lo, hi) {
  const a = orig[name], n = L1[name].size, s = [].concat(scale);
  const q = type === 'u16' ? new Uint16Array(a.length) : new Int16Array(a.length);
  for (let i = 0; i < a.length; i++) {
    const v = Math.round(a[i] / s[i % s.length]);
    if (v < lo || v > hi) throw new Error(`${name}[${i}] = ${a[i]} out of range for ${type} * ${s[i % s.length]}`);
    q[i] = v;
  }
  layout[name] = { offset: put(q), type, size: n, count: V, scale };
}

layout.position = { offset: put(orig.position), type: 'f32', size: 3, count: V };
quant('normal', 'i16', 1 / 32767, -32767, 32767);
quant('bake', 'u16', [1 / 65535, 1 / 65535, 1 / 65535, 1], 0, 65535);
quant('eye', 'i16', 1 / 32767, -32767, 32767);
quant('curv', 'i16', 1 / 32767, -32767, 32767);
quant('feat', 'i16', 1 / 32767, -32767, 32767);
layout.index = { offset: put(Uint16Array.from(orig.index)), type: 'u16', size: 1, count: orig.index.length };

// neighbour lists (CSR), exactly as lab-mesh.ts builds them
const index = orig.index;
const start = new Uint32Array(V + 1);
for (const i of index) start[i + 1] += 2;
for (let v = 0; v < V; v++) start[v + 1] += start[v];
const nb = new Uint32Array(start[V]), fill = start.slice(0, V);
for (let t = 0; t < index.length; t += 3) {
  const a = index[t], b = index[t + 1], c = index[t + 2];
  nb[fill[a]++] = b, nb[fill[a]++] = c, nb[fill[b]++] = c, nb[fill[b]++] = a, nb[fill[c]++] = a, nb[fill[c]++] = b;
}

function morph(key, step) {
  const d = orig[key], q = new Int32Array(3 * V), mask = new Uint8Array((V + 7) >> 3);
  for (let v = 0; v < V; v++) {
    for (let c = 0; c < 3; c++) q[3 * v + c] = Math.round(d[3 * v + c] / step);
    if (q[3 * v] || q[3 * v + 1] || q[3 * v + 2]) mask[v >> 3] |= 1 << (v & 7);
  }
  const on = (v) => (mask[v >> 3] >> (v & 7)) & 1;
  const res = [];
  for (let v = 0; v < V; v++) {
    if (!on(v)) continue;
    let n = 0, x = 0, y = 0, z = 0;
    for (let k = start[v]; k < start[v + 1]; k++) {
      const u = nb[k];
      if (u < v || !on(u)) n++, (x += q[3 * u]), (y += q[3 * u + 1]), (z += q[3 * u + 2]);
    }
    const p = n ? [Math.round(x / n), Math.round(y / n), Math.round(z / n)] : [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const r = q[3 * v + c] - p[c];
      if (r < -32768 || r > 32767) throw new Error(`${key}: residual ${r} does not fit i16 (raise the step)`);
      res.push(r);
    }
  }
  const maskOffset = put(mask);
  layout[key] = { mask: maskOffset, offset: put(Int16Array.from(res)), type: 'i16', size: 3, count: res.length / 3, scale: step };
}
for (const m of header.morphs) {
  morph(`morph:${m.name}:position`, POS_STEP);
  morph(`morph:${m.name}:normal`, NRM_STEP);
}

// ---------------------------------------------------------------- write
const raw = new Uint8Array(size);
let o = 0;
for (const c of chunks) raw.set(c, o), (o += c.byteLength);
const bin = deflateRawSync(raw, { level: 9, memLevel: 9 });
if (!inflateRawSync(bin).equals(Buffer.from(raw))) throw new Error('deflate round trip failed');

const binName = basename(OUT).replace(/\.json$/, '') + '.bin';
const out = {
  ...header,
  format: 'hero-face-mesh-compact',
  version: 2,
  bin: binName,
  compression: 'deflate-raw',
  rawBytes: size,
  morphCoding: {
    positionStep: POS_STEP,
    normalStep: NRM_STEP,
    predictor: 'mean of known triangle neighbours (see scripts/hero-face/compact-mesh.mjs)',
  },
  compactFrom: basename(IN),
  layout,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
writeFileSync(join(dirname(OUT), binName), bin);

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`${basename(IN)} (${kb(binFile.byteLength)}) -> ${basename(OUT)} + ${binName}`);
console.log(`  bin ${kb(bin.byteLength)} (inflated ${kb(size)}), brotli of bin ${kb(brotliCompressSync(bin).byteLength)}`);
