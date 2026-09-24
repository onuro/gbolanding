import * as THREE from 'three';
import { createHeadGeometry, poseMatrix, REST_POSE, type HeadPose } from './head';
import type { FaceMeshData } from './lab-mesh';
import { resolveLook, type LookParams } from './look';
import { buildParticleGeometry, type FrameW, type LatticeRange } from './particles';
import { createFlowPass } from './passes/flow-pass';
import { createGhostPass } from './passes/ghost-pass';
import { DEBUG_T0_FRAG, GHOST_QUAD_FRAG, GHOST_QUAD_VERT, POINTS_FRAG, POINTS_VERT } from './shaders/points.glsl';

// Framework-free particle-face engine (PLAN.md §3–§4). The React island wraps this later:
//   const engine = createFaceEngine(canvas, { mesh, preset: 'ref2' });
//   engine.resize(cssW, cssH, dpr); engine.setPose({...}); engine.setMorphs({...}); engine.render(t);

export type FaceView = 'final' | 't0' | 't1' | 'ghost' | 'mask' | 'dots';

export interface FaceFraming {
  /** face width W in CSS px */
  faceWidth: number;
  /** projected head origin (midpoint between the pupils) in CSS px from the canvas top-left */
  origin: [number, number];
}

export interface FaceEngineOptions {
  mesh: FaceMeshData;
  preset?: string;
  look?: Partial<LookParams>;
  seed?: number;
  pixelRatio?: number;
  preserveDrawingBuffer?: boolean;
  view?: FaceView;
  /** framing override; default: PLAN §4 (W = min(0.41 H, 0.66 w), eye line at 39 %) */
  framing?: (cssW: number, cssH: number) => FaceFraming;
}

export interface FaceVoice {
  level: number;
  bands?: [number, number, number];
}

export interface FaceEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly look: LookParams;
  setPose(pose: Partial<HeadPose>): void;
  setMorphs(weights: Record<string, number>): void;
  setVoice(voice: FaceVoice): void;
  setLook(look: Partial<LookParams>): void;
  setView(view: FaceView): void;
  resize(cssW: number, cssH: number, pixelRatio?: number): void;
  render(timeSec?: number): void;
  info(): Record<string, unknown>;
  dispose(): void;
}

export const defaultFraming = (w: number, h: number): FaceFraming => {
  const W = Math.min(0.41 * h, 0.66 * w);
  return { faceWidth: W, origin: [w / 2, 0.39 * h] };
};

const v2 = (x = 0, y = 0) => new THREE.Vector2(x, y);
const v3 = (a: number[]) => new THREE.Vector3(a[0], a[1], a[2]);
const v4 = (x = 0, y = 0, z = 0, w = 0) => new THREE.Vector4(x, y, z, w);

export function createFaceEngine(canvas: HTMLCanvasElement, opts: FaceEngineOptions): FaceEngine {
  let look = resolveLook(opts.preset, opts.look);
  const seed = opts.seed ?? 1;
  let view: FaceView = opts.view ?? 'final';
  const framingFn = opts.framing ?? defaultFraming;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    powerPreference: 'high-performance',
  });
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 1);

  const { geometry: headGeo, morphIndex } = createHeadGeometry(opts.mesh);
  const lm = opts.mesh.landmarks;

  // ---- shared lighting uniforms (flow + ghost)
  const light = {
    uLightDir: { value: new THREE.Vector3() },
    uFillDir: { value: new THREE.Vector3() },
    uFillK: { value: v4() },
    uFillR: { value: 0 },
    uLightK: { value: v4() },
    uLightAmb: { value: v4() },
    uLightMottle: { value: v4() },
    uLightFade: { value: v4() },
    uLightFade2: { value: v4() },
    uSocket: { value: v4() },
    uPupilObjL: { value: v3(lm.pupilL) },
    uPupilObjR: { value: v3(lm.pupilR) },
    uBlob: { value: Array.from({ length: 10 }, () => v4()) },
    uBlobG: { value: new Array(10).fill(0) },
    uSculptBase: { value: 1 },
    uMouthObj: { value: v3(lm.mouthCentre) },
    uLipSeam: { value: new THREE.Vector3() },
  };
  const flow = createFlowPass(headGeo, light);
  const ghost = createGhostPass(headGeo, light);
  const headMeshes = [...flow.meshes, ghost.mesh];

  // ---- cameras
  const mainCam = new THREE.PerspectiveCamera(look.fovDeg, 1, 0.05, 100);
  const flowCam = new THREE.PerspectiveCamera(look.fovDeg, 1, 0.05, 100);

  // ---- main scene: ghost quad + points
  const quadGeo = new THREE.BufferGeometry();
  quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quadU = {
    uGhost: { value: ghost.target.texture as THREE.Texture },
    uGhostLod: { value: 1 },
    uToneKq: { value: 1.15 },
    uTintMist: { value: new THREE.Vector3(0.91, 0.99, 1) },
    uDither: { value: 0.5 },
    uView: { value: 0 },
    uOriginQ: { value: v2() },
    uViewportQ: { value: v2() },
    uWpxQ: { value: 1 },
    uMistK: { value: v4() },
  };
  const quadMat = new THREE.ShaderMaterial({ vertexShader: GHOST_QUAD_VERT, fragmentShader: GHOST_QUAD_FRAG, uniforms: quadU, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(quadGeo, quadMat);
  quad.frustumCulled = false;
  quad.renderOrder = 0;
  const dbgU = { uTex: { value: flow.T0.texture as THREE.Texture }, uChan: { value: v4(1, 0, 0, 0) }, uScale: { value: 1 } };
  const dbgMat = new THREE.ShaderMaterial({ vertexShader: GHOST_QUAD_VERT, fragmentShader: DEBUG_T0_FRAG, uniforms: dbgU, depthTest: false, depthWrite: false });
  const dbgQuad = new THREE.Mesh(quadGeo, dbgMat);
  dbgQuad.frustumCulled = false;

  const pu = {
    uT0: { value: flow.T0.texture as THREE.Texture },
    uT1: { value: flow.T1.texture as THREE.Texture },
    uMask: { value: ghost.target.texture as THREE.Texture },
    uT0Size: { value: v2() },
    uT0Origin: { value: v2() },
    uT0Texel: { value: 1 },
    uViewport: { value: v2() },
    uOrigin: { value: v2() },
    uWpx: { value: 1 },
    uPitch: { value: 1 },
    uAnchor: { value: v2() },
    uPitchWarp: { value: 0 },
    uTime: { value: 0 },
    uFlicker: { value: 0 },
    uXfer: { value: v4() },
    uRad: { value: v4() },
    uJit: { value: v4() },
    uHaloK: { value: v4() },
    uEnvA: { value: v4() },
    uEnvB: { value: v4() },
    uEnvC: { value: v4() },
    uEnvD: { value: v4() },
    uEnvE: { value: v4() },
    uEnvF: { value: v4() },
    uRow: { value: v4() },
    uStarK: { value: v4() },
    uPupilL: { value: v3(lm.pupilL) },
    uPupilR: { value: v3(lm.pupilR) },
    uCatch: { value: v4() },
    uCatchOff: { value: v4() },
    uToneK: { value: v4() },
    uTailLen: { value: 1 },
    uToneMax: { value: 1 },
    uTintMid: { value: new THREE.Vector3() },
    uTintPeak: { value: new THREE.Vector3() },
    uTintHalo: { value: new THREE.Vector3() },
  };
  const pointsMat = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERT,
    fragmentShader: POINTS_FRAG,
    uniforms: pu,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });
  let points: THREE.Points | null = null;
  const mainScene = new THREE.Scene();
  mainScene.add(quad);
  const dbgScene = new THREE.Scene();
  dbgScene.add(dbgQuad);

  // ---- state
  let pose: HeadPose = { ...REST_POSE };
  const poseM = new THREE.Matrix4();
  const morphs: Record<string, number> = {};
  let voice: FaceVoice = { level: 0 };
  let cssW = 1, cssH = 1, dpr = opts.pixelRatio ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  let devW = 1, devH = 1, Wdev = 1, pitch = 1;
  let originDev = new THREE.Vector2();
  let latRange: LatticeRange = { i0: 0, i1: 0, j0: 0, j1: 0 };
  let particleCounts: Record<string, number> = {};
  let dirty = true;
  let lastTime = 0;

  function applyLook() {
    const L = look;
    const ld = v3(L.lightDir).normalize();
    light.uLightDir.value.copy(ld);
    light.uFillDir.value.copy(v3(L.fillDir).normalize());
    light.uFillK.value.set(L.kdFill, L.fillShadow, L.lipFloor, L.convexity);
    light.uFillR.value = L.fillRight;
    light.uLightK.value.set(L.kd, L.ks, L.specExp, L.aoStrength);
    light.uLightAmb.value.set(L.ambTop, L.ambBottom, L.exposure, L.contrast);
    light.uLightMottle.value.set(L.mottleAmp, L.mottleScale, L.lacrimalGain, L.facingPow);
    light.uLightFade.value.set(L.sideFade[0], L.sideFade[1], L.crownFade[0], L.crownFade[1]);
    light.uLightFade2.value.set(L.neckFade[0], L.neckFade[1], L.keepFacing[0], L.keepFacing[1]);
    light.uSocket.value.set(...L.socket);
    light.uSculptBase.value = L.sculptBase;
    light.uLipSeam.value.set(...L.lipSeam);
    for (let i = 0; i < 10; i++) {
      const b = L.sculpt[i];
      light.uBlob.value[i].set(b ? b[0] : 0, b ? b[1] : 0, b ? b[2] : 1, b ? b[3] : 1);
      light.uBlobG.value[i] = b ? b[4] : 0;
    }
    ghost.uniforms.uGhostK.value.set(L.ghost, L.ghostFill, L.irisGhost, L.pupilGhost);
    ghost.uniforms.uGhostK2.value.set(L.scleraGhost, 0.06, 0.004, L.ghostGamma);
    quadU.uGhostLod.value = L.ghostLod;
    quadU.uToneKq.value = L.toneK;
    quadU.uTintMist.value.set(...L.tintHalo);
    quadU.uDither.value = L.dither;
    quadU.uMistK.value.set(L.mist, L.mistRadius[0], L.mistRadius[1], L.mistBalance);
    pu.uPitchWarp.value = L.pitchWarp;
    pu.uXfer.value.set(L.alphaLo, L.alphaHi, L.gain, L.gamma);
    pu.uRad.value.set(L.rBase, L.rMid, L.rTop, L.rMax);
    pu.uJit.value.set(L.jitterSize, L.jitterBright, L.superN, L.ringiness);
    pu.uHaloK.value.set(L.haloAmp, L.haloBright, L.tailAmp, L.irregularity);
    pu.uEnvA.value.set(L.plateau[0], L.plateau[1], L.efold[0], L.efold[1]);
    pu.uEnvB.value.set(L.topV, L.topEfold, L.chinV, L.chinEfold);
    pu.uEnvC.value.set(L.hardFade[0], L.hardFade[1], L.hairBottom, L.hairWidth);
    pu.uEnvD.value.set(L.hairFlare, L.hairDensity, L.strayIn, (1 - L.gridShare) / Math.max(0.05, L.gridShare));
    pu.uEnvF.value.set(L.sideDensity[0], L.sideDensity[1], L.survivorBright[0], L.survivorBright[1]);
    pu.uRow.value.set(L.eyeRow, L.eyeRowDy, L.keepPow, 0);
    pu.uStarK.value.set(L.starSaturated, L.starGain, 0, 0);
    pu.uCatch.value.set(L.catchR, L.catchHdr, L.catchSecondary, 1);
    pu.uCatchOff.value.set(L.catchOffset[0], L.catchOffset[1], L.catchSecondaryOffset[0], L.catchSecondaryOffset[1]);
    pu.uToneK.value.set(L.toneK, L.edgeSoft, L.ringStroke, L.haloSigma);
    pu.uTailLen.value = L.tailLen;
    pu.uToneMax.value = L.toneMax;
    pu.uTintMid.value.set(...L.tintMid);
    pu.uTintPeak.value.set(...L.tintPeak);
    pu.uTintHalo.value.set(...L.tintHalo);
    mainCam.fov = flowCam.fov = L.fovDeg;
  }

  function layout() {
    devW = Math.max(1, Math.round(cssW * dpr));
    devH = Math.max(1, Math.round(cssH * dpr));
    renderer.setPixelRatio(dpr);
    renderer.setSize(cssW, cssH, false);
    const fr = framingFn(cssW, cssH);
    Wdev = fr.faceWidth * dpr;
    originDev.set(fr.origin[0] * dpr, fr.origin[1] * dpr);
    pitch = Math.max(look.minPitchDevPx, Wdev / look.gridDiv);
    if (look.snapPitch) pitch = Math.max(look.minPitchDevPx, Math.round(pitch));
    // camera: W at the origin depth spans Wdev device px
    const f = devH / 2 / Math.tan(THREE.MathUtils.degToRad(look.fovDeg / 2));
    const D = f / Wdev;
    for (const c of [mainCam, flowCam]) {
      c.aspect = devW / devH;
      c.near = Math.max(0.05, D - 4);
      c.far = D + 6;
      c.position.set(0, 0, D);
      c.lookAt(0, 0, 0);
      c.updateMatrixWorld(true);
    }
    mainCam.setViewOffset(devW, devH, devW / 2 - originDev.x, devH / 2 - originDev.y, devW, devH);
    // lattice covering the viewport (+ margin) around the anchor
    const ax = originDev.x + look.gridPhase[0] * pitch, ay = originDev.y + look.gridPhase[1] * pitch;
    latRange = {
      i0: Math.floor(-ax / pitch) - 2,
      i1: Math.ceil((devW - ax) / pitch) + 2,
      j0: Math.floor(-ay / pitch) - 2,
      j1: Math.ceil((devH - ay) / pitch) + 2,
    };
    const cols = latRange.i1 - latRange.i0 + 1, rows = latRange.j1 - latRange.j0 + 1;
    flow.setSize(cols, rows);
    ghost.setSize(devW, devH);
    pu.uT0Size.value.set(cols * 4, rows * 4);
    pu.uT0Texel.value = pitch / 4;
    pu.uViewport.value.set(devW, devH);
    pu.uWpx.value = Wdev;
    pu.uPitch.value = pitch;
    // particles
    const frame: FrameW = { u0: -originDev.x / Wdev, u1: (devW - originDev.x) / Wdev, v0: -originDev.y / Wdev, v1: (devH - originDev.y) / Wdev };
    const built = buildParticleGeometry(look, latRange, frame, seed);
    if (points) { points.geometry.dispose(); mainScene.remove(points); }
    points = new THREE.Points(built.geometry, pointsMat);
    points.frustumCulled = false;
    points.matrixAutoUpdate = false;
    points.renderOrder = 1;
    mainScene.add(points);
    pu.uEnvE.value.set(look.survivorJitter, look.hotShare, look.filamentShare, built.scatterNorm);
    particleCounts = built.counts;
    dirty = false;
  }

  function updatePose() {
    poseMatrix(pose, poseM);
    for (const m of headMeshes) { m.matrix.copy(poseM); m.matrixWorld.copy(poseM); }
    if (points) { points.matrix.copy(poseM); points.matrixWorld.copy(poseM); }
    // anchor = projected head origin (current pose), so breathing / sway move the grid with the head
    const o = new THREE.Vector3(0, 0, 0).applyMatrix4(poseM).project(mainCam);
    const ox = (o.x * 0.5 + 0.5) * devW, oy = (0.5 - o.y * 0.5) * devH;
    const ax = ox + look.gridPhase[0] * pitch, ay = oy + look.gridPhase[1] * pitch;
    pu.uOrigin.value.set(ox, oy);
    quadU.uOriginQ.value.set(ox, oy);
    quadU.uViewportQ.value.set(devW, devH);
    quadU.uWpxQ.value = Wdev;
    pu.uAnchor.value.set(ax, ay);
    const t0x = ax + (latRange.i0 - 0.5) * pitch, t0y = ay + (latRange.j0 - 0.5) * pitch;
    pu.uT0Origin.value.set(t0x, t0y);
    const cols = latRange.i1 - latRange.i0 + 1, rows = latRange.j1 - latRange.j0 + 1;
    flowCam.setViewOffset(devW, devH, devW / 2 - originDev.x + t0x, devH / 2 - originDev.y + t0y, cols * pitch, rows * pitch);
    flowCam.updateProjectionMatrix();
    mainCam.updateProjectionMatrix();
  }

  function applyMorphs() {
    for (const m of headMeshes) {
      const inf = m.morphTargetInfluences;
      if (!inf) continue;
      inf.fill(0);
      for (const [k, w] of Object.entries(morphs)) {
        const i = morphIndex[k];
        if (i !== undefined) inf[i] = w;
      }
    }
    const blink = Math.max(morphs.eyeBlinkLeft ?? 0, morphs.eyeBlinkRight ?? 0);
    pu.uCatch.value.w = 1 - Math.min(1, blink * 1.4);
  }

  function render(timeSec?: number) {
    if (dirty) layout();
    if (timeSec !== undefined) lastTime = timeSec;
    pu.uTime.value = lastTime;
    updatePose();
    applyMorphs();
    flow.render(renderer, flowCam);
    ghost.render(renderer, mainCam);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, true);
    if (view === 't0' || view === 't1') {
      dbgU.uTex.value = view === 't0' ? flow.T0.texture : flow.T1.texture;
      dbgU.uChan.value.set(view === 't0' ? 1 : 0, 0, view === 't1' ? 0.1 : 0, 0);
      renderer.render(dbgScene, mainCam);
      return;
    }
    quadU.uView.value = view === 'mask' ? 2 : 0;
    quad.visible = view !== 'dots';
    if (points) points.visible = view !== 'ghost' && view !== 'mask';
    renderer.render(mainScene, mainCam);
  }

  applyLook();

  return {
    renderer,
    get look() { return look; },
    setPose(p) { pose = { ...pose, ...p }; },
    setMorphs(w) { Object.assign(morphs, w); },
    setVoice(v) {
      // Minimal PLAN §5 mapping (full lip-sync lands in M3): agent level -> jaw + lips.
      voice = v;
      const s = Math.pow(Math.min(1, Math.max(0, (voice.level - 0.06) / 0.6)), 0.8);
      const jaw = Math.min(0.55, 0.5 * s);
      Object.assign(morphs, {
        jawOpen: jaw,
        mouthLowerDownLeft: 0.6 * jaw, mouthLowerDownRight: 0.6 * jaw,
        mouthUpperUpLeft: 0.2 * jaw, mouthUpperUpRight: 0.2 * jaw,
      });
    },
    setLook(l) {
      const rebuild = ['gridDiv', 'scatterCount', 'starsPerW2', 'fovDeg', 'snapPitch', 'minPitchDevPx', 'gridPhase'].some((k) => k in l);
      look = { ...look, ...l };
      applyLook();
      if (rebuild) dirty = true;
    },
    setView(v) { view = v; },
    resize(w, h, pr) {
      cssW = Math.max(1, w); cssH = Math.max(1, h);
      if (pr) dpr = pr;
      dirty = true;
    },
    render,
    info() {
      const gl = renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        device: [devW, devH], dpr, faceWidthDev: Wdev, pitchDev: pitch, originDev: [originDev.x, originDev.y],
        lattice: latRange, particles: particleCounts, morphTargets: Object.keys(morphIndex),
      };
    },
    dispose() {
      flow.dispose();
      ghost.dispose();
      headGeo.dispose();
      points?.geometry.dispose();
      pointsMat.dispose();
      quadMat.dispose();
      dbgMat.dispose();
      quadGeo.dispose();
      renderer.dispose();
    },
  };
}
