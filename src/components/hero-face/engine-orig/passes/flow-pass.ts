import * as THREE from 'three';
import { FLOW_LUM, FLOW_VEC } from '../shaders/head.glsl';

// P1 (PLAN.md §3): two draws of the head in its rest raster into render targets at 4x the lattice
// resolution. T0 = (lit L, coverage, mouth weight, eye), T1 = (flow x, flow y in grid units, view depth).

export interface FlowPass {
  T0: THREE.WebGLRenderTarget;
  T1: THREE.WebGLRenderTarget;
  meshes: THREE.Mesh[];
  setSize(cols: number, rows: number): void;
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  dispose(): void;
}

export function createFlowPass(geometry: THREE.BufferGeometry, light: Record<string, THREE.IUniform>): FlowPass {
  const gridCells = { value: new THREE.Vector2(1, 1) };
  const mk = (src: { vertexShader: string; fragmentShader: string }) =>
    new THREE.ShaderMaterial({
      vertexShader: src.vertexShader,
      fragmentShader: src.fragmentShader,
      uniforms: { ...light, uGridCells: gridCells },
      side: THREE.FrontSide,
    });
  const lumMat = mk(FLOW_LUM);
  const vecMat = mk(FLOW_VEC);
  const lumMesh = new THREE.Mesh(geometry, lumMat);
  const vecMesh = new THREE.Mesh(geometry, vecMat);
  const sLum = new THREE.Scene();
  const sVec = new THREE.Scene();
  for (const [m, s] of [[lumMesh, sLum], [vecMesh, sVec]] as const) {
    m.frustumCulled = false;
    m.matrixAutoUpdate = false;
    s.add(m);
  }
  const opts = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    generateMipmaps: false,
  } as const;
  const T0 = new THREE.WebGLRenderTarget(4, 4, opts);
  const T1 = new THREE.WebGLRenderTarget(4, 4, opts);
  const clear = new THREE.Color(0, 0, 0);
  return {
    T0,
    T1,
    meshes: [lumMesh, vecMesh],
    setSize(cols, rows) {
      gridCells.value.set(cols, rows);
      T0.setSize(cols * 4, rows * 4);
      T1.setSize(cols * 4, rows * 4);
    },
    render(renderer, camera) {
      renderer.setClearColor(clear, 0);
      renderer.setRenderTarget(T0);
      renderer.clear(true, true, false);
      renderer.render(sLum, camera);
      renderer.setRenderTarget(T1);
      renderer.clear(true, true, false);
      renderer.render(sVec, camera);
    },
    dispose() {
      T0.dispose();
      T1.dispose();
      lumMat.dispose();
      vecMat.dispose();
    },
  };
}
