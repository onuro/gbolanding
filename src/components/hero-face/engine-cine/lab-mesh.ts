// Loader for the lab mesh format written by scripts/hero-face/lab-mesh.mjs (json header + bin).
// The shipping GLB loader replaces this in a later milestone; the engine only needs FaceMeshData.

export interface FaceLandmarks {
  pupilL: number[];
  pupilR: number[];
  eyeCentreL: number[];
  eyeCentreR: number[];
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
  type: 'f32' | 'u32';
  size: number;
  count: number;
}

export async function loadLabMesh(jsonUrl: string, fetchImpl: typeof fetch = fetch): Promise<FaceMeshData> {
  const header = await (await fetchImpl(jsonUrl)).json();
  if (header.format !== 'hero-face-lab-mesh') throw new Error('not a hero-face lab mesh');
  const binUrl = new URL(header.bin, new URL(jsonUrl, location.href)).toString();
  const buf = await (await fetchImpl(binUrl)).arrayBuffer();
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
