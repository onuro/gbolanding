// Loader for the lab mesh format written by scripts/hero-face/lab-mesh.mjs (json header + bin), and for its compact
// production form written by scripts/hero-face/compact-mesh.mjs (format 'hero-face-mesh-compact', version 2: one
// deflate-raw stream, quantized attributes, sparse predicted morphs), expanded here to the same FaceMeshData.
// The shipping GLB loader replaces this in a later milestone; the engine only needs FaceMeshData.

export interface FaceLandmarks {
  pupilL: number[];
  pupilR: number[];
  eyeCentreL: number[];
  eyeCentreR: number[];
  eyeAxisL?: number[];
  eyeAxisR?: number[];
  mouthCentre: number[];
  chin: number[];
  noseTip: number[];
  [k: string]: unknown;
}

export interface FaceMorph {
  name: string;
  position: Float32Array;
  normal: Float32Array;
}

export interface FaceMeshData {
  name: string;
  vertexCount: number;
  position: Float32Array;
  normal: Float32Array;
  bake: Float32Array; // vec4: key-light visibility, AO, mouth weight, part id
  eye: Float32Array; // cos(angle from the eye's optical axis), eyes only
  curv: Float32Array; // convexity (sculpt term), skin only, -1..1
  feat: Float32Array; // vec4 feature masks (skin): lip vermilion, lip side (+1 upper / -1 lower), upper-lip border, upper-lid line
  index: Uint32Array;
  parts: { name: string; id: number; start: number; count: number }[];
  morphs: FaceMorph[];
  landmarks: FaceLandmarks;
}

interface Layout {
  offset: number;
  type: 'f32' | 'u32' | 'u16' | 'i16';
  size: number;
  count: number;
  scale?: number | number[]; // compact: value = int * scale (one per component when an array)
  mask?: number; // compact morphs: offset of the vertex bitmask
}

export async function loadLabMesh(jsonUrl: string, fetchImpl: typeof fetch = fetch): Promise<FaceMeshData> {
  const get = async (url: string) => {
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res;
  };
  const header = await (await get(jsonUrl)).json();
  const compact = header.format === 'hero-face-mesh-compact' && header.version === 2;
  if (!compact && header.format !== 'hero-face-lab-mesh') throw new Error('not a hero-face lab mesh');
  const binUrl = new URL(header.bin, new URL(jsonUrl, location.href)).toString();
  const buf = await (await get(binUrl)).arrayBuffer();
  if (compact) {
    const raw = await inflateRaw(buf);
    if (raw.byteLength !== header.rawBytes) throw new Error(`${binUrl}: inflated ${raw.byteLength} B, expected ${header.rawBytes}`);
    return expandCompact(header, raw);
  }
  const view = (l: Layout) =>
    l.type === 'u32' ? new Uint32Array(buf, l.offset, l.count * l.size) : new Float32Array(buf, l.offset, l.count * l.size);
  const L: Record<string, Layout> = header.layout;
  const morphs: FaceMorph[] = (header.morphs as { name: string }[]).map((m) => ({
    name: m.name,
    position: view(L[`morph:${m.name}:position`]) as Float32Array,
    normal: view(L[`morph:${m.name}:normal`]) as Float32Array,
  }));
  return {
    name: header.name,
    vertexCount: header.vertexCount,
    position: view(L.position) as Float32Array,
    normal: view(L.normal) as Float32Array,
    bake: view(L.bake) as Float32Array,
    eye: view(L.eye) as Float32Array,
    curv: L.curv ? (view(L.curv) as Float32Array) : new Float32Array(header.vertexCount),
    feat: L.feat ? (view(L.feat) as Float32Array) : new Float32Array(header.vertexCount * 4),
    index: view(L.index) as Uint32Array,
    parts: header.parts,
    morphs,
    landmarks: header.landmarks,
  };
}

// the .bin is deflated in the file itself (a CDN need not compress binaries); inflated with the browser's own codec
async function inflateRaw(buf: ArrayBuffer): Promise<ArrayBuffer> {
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
}

const TYPED = { f32: Float32Array, u32: Uint32Array, u16: Uint16Array, i16: Int16Array };

// compact v2 -> the dense Float32 / Uint32 arrays of v1 (format: header comment of scripts/hero-face/compact-mesh.mjs)
function expandCompact(header: any, buf: ArrayBuffer): FaceMeshData {
  const V: number = header.vertexCount;
  const L: Record<string, Layout> = header.layout;
  const ints = (l: Layout) => new TYPED[l.type](buf, l.offset, l.count * l.size);
  const attr = (l: Layout) => {
    const q = ints(l), s = ([] as number[]).concat(l.scale ?? 1), out = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) out[i] = q[i]! * s[i % s.length]!;
    return out;
  };
  const index = Uint32Array.from(ints(L.index!));
  // neighbour lists (CSR) for the morph predictor: each triangle corner lists the other two (shared edges twice)
  const start = new Uint32Array(V + 1);
  for (const i of index) start[i + 1] += 2;
  for (let v = 0; v < V; v++) start[v + 1] += start[v]!;
  const nb = new Uint32Array(start[V]!), fill = start.slice(0, V);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t]!, b = index[t + 1]!, c = index[t + 2]!;
    nb[fill[a]++] = b; nb[fill[a]++] = c; nb[fill[b]++] = c; nb[fill[b]++] = a; nb[fill[c]++] = a; nb[fill[c]++] = b;
  }
  // sparse morph: masked vertices carry q - round(mean q of the neighbours already known: earlier ones, or unmasked = 0)
  const morph = (l: Layout) => {
    const mask = new Uint8Array(buf, l.mask!, (V + 7) >> 3), r = ints(l), s = l.scale as number;
    const q = new Int32Array(3 * V), out = new Float32Array(3 * V);
    const on = (v: number) => (mask[v >> 3]! >> (v & 7)) & 1;
    for (let v = 0, j = 0; v < V; v++) {
      if (!on(v)) continue;
      let n = 0, x = 0, y = 0, z = 0;
      for (let k = start[v]!; k < start[v + 1]!; k++) {
        const u = nb[k]!;
        if (u < v || !on(u)) { n++; x += q[3 * u]!; y += q[3 * u + 1]!; z += q[3 * u + 2]!; }
      }
      q[3 * v] = r[j++]! + (n ? Math.round(x / n) : 0);
      q[3 * v + 1] = r[j++]! + (n ? Math.round(y / n) : 0);
      q[3 * v + 2] = r[j++]! + (n ? Math.round(z / n) : 0);
      out[3 * v] = q[3 * v]! * s; out[3 * v + 1] = q[3 * v + 1]! * s; out[3 * v + 2] = q[3 * v + 2]! * s;
    }
    return out;
  };
  return {
    name: header.name,
    vertexCount: V,
    position: attr(L.position!),
    normal: attr(L.normal!),
    bake: attr(L.bake!),
    eye: attr(L.eye!),
    curv: attr(L.curv!),
    feat: attr(L.feat!),
    index,
    parts: header.parts,
    morphs: (header.morphs as { name: string }[]).map((m) => ({
      name: m.name,
      position: morph(L[`morph:${m.name}:position`]!),
      normal: morph(L[`morph:${m.name}:normal`]!),
    })),
    landmarks: header.landmarks,
  };
}
