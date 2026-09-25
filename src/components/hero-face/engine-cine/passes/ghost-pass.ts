import * as THREE from 'three';
import { GHOST } from '../shaders/head.glsl';

// P2 (PLAN.md §3): current pose at half resolution, RGBA16F with mipmaps.
// R = skin haze (lit face, blurred into the inter-dot floor), G = silhouette mask (edge dissolution),
// B = eye-zone / mouth ghost (eyelids, iris disc, pupil, teeth).

export interface GhostPass {
  target: THREE.WebGLRenderTarget;
  mesh: THREE.Mesh;
  uniforms: { uGhostK: THREE.IUniform<THREE.Vector4>; uGhostK2: THREE.IUniform<THREE.Vector4>; uGhostK3: THREE.IUniform<THREE.Vector4> };
  setSize(w: number, h: number): void;
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  dispose(): void;
}

export function createGhostPass(geometry: THREE.BufferGeometry, light: Record<string, THREE.IUniform>): GhostPass {
  const uniforms = {
    uGhostK: { value: new THREE.Vector4() },
    uGhostK2: { value: new THREE.Vector4() },
    uGhostK3: { value: new THREE.Vector4() },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: GHOST.vertexShader,
    fragmentShader: GHOST.fragmentShader,
    uniforms: { ...light, ...uniforms, uGridCells: { value: new THREE.Vector2(1, 1) } },
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
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
    mesh,
    uniforms,
    setSize(w, h) {
      target.setSize(Math.max(4, Math.ceil(w / 2)), Math.max(4, Math.ceil(h / 2)));
    },
    render(renderer, camera) {
      renderer.setClearColor(clear, 0);
      renderer.setRenderTarget(target);
      renderer.clear(true, true, false);
      renderer.render(scene, camera);
    },
    dispose() {
      target.dispose();
      mat.dispose();
    },
  };
}
