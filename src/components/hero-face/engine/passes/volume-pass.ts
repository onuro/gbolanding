import * as THREE from 'three';
import { OCCLUDER, VOLUME } from '../shaders/volume.glsl';

// a3 'volume' pass: the head/hair volume rendered from the flow camera (current pose, rest morphs) into TV,
// a target the same size as T0 (4 x 4 texels per lattice cell), so the lattice samples it exactly like the
// lit face. Draw 1: the head as a depth-only occluder (the hair never shows through the face). Draw 2: the
// hair shells, additive (ONE, ONE), depth-tested, front faces only:
//   TV = (sum L rho, sum rho, sum strand rho, sum rho x layer) -> per cell: opacity, lit level, strand noise.
// Mipmapped so the ghost quad can read a cell-scale blur of it as the inter-dot haze of the volume.

export interface VolumePass {
  target: THREE.WebGLRenderTarget;
  meshes: THREE.Mesh[];
  uniforms: Record<string, THREE.IUniform>;
  setSize(cols: number, rows: number): void;
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  dispose(): void;
}

export function createVolumePass(head: THREE.BufferGeometry, hair: THREE.BufferGeometry, light: Record<string, THREE.IUniform>): VolumePass {
  const uniforms = {
    uHairK: { value: new THREE.Vector4() },
    uHairK2: { value: new THREE.Vector4() },
    uHairN: { value: new THREE.Vector4() },
    uHairD: { value: new THREE.Vector4() },
    uHairM: { value: new THREE.Vector4() },
    uHairE: { value: new THREE.Vector4() },
    uHairF: { value: new THREE.Vector4() },
  };
  const occMat = new THREE.ShaderMaterial({
    vertexShader: OCCLUDER.vertexShader,
    fragmentShader: OCCLUDER.fragmentShader,
    uniforms: { ...light, uGridCells: { value: new THREE.Vector2(1, 1) } },
    side: THREE.FrontSide,
    colorWrite: false,
  });
  const volMat = new THREE.ShaderMaterial({
    vertexShader: VOLUME.vertexShader,
    fragmentShader: VOLUME.fragmentShader,
    uniforms: { ...light, ...uniforms },
    side: THREE.FrontSide,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  const occ = new THREE.Mesh(head, occMat);
  const vol = new THREE.Mesh(hair, volMat);
  occ.renderOrder = 0;
  vol.renderOrder = 1;
  const scene = new THREE.Scene();
  for (const m of [occ, vol]) { m.frustumCulled = false; m.matrixAutoUpdate = false; scene.add(m); }
  const target = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    generateMipmaps: true,
  });
  const clear = new THREE.Color(0, 0, 0);
  return {
    target,
    meshes: [occ, vol],
    uniforms,
    setSize(cols, rows) { target.setSize(cols * 4, rows * 4); },
    render(renderer, camera) {
      renderer.setClearColor(clear, 0);
      renderer.setRenderTarget(target);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);
    },
    dispose() { target.dispose(); occMat.dispose(); volMat.dispose(); hair.dispose(); },
  };
}
