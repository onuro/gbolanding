import * as THREE from 'three';
import { createHeadGeometry, poseMatrix, REST_POSE, type HeadPose } from './head';
import type { FaceMeshData } from './lab-mesh';
import { resolveLook, type LookParams } from './look';
import { buildParticleGeometry, latticeLayout, REF_LAYOUT, SCATTER_DOMAIN, type LatticeRange } from './particles';
import { createFlowPass } from './passes/flow-pass';
import { createGhostPass } from './passes/ghost-pass';
import { createVolumePass, type VolumePass } from './passes/volume-pass';
import { buildHairVolume, HAIR_DEFAULTS } from './volume';
import { OUTPUT_FRAG, OUTPUT_VERT } from './shaders/output.glsl';
import { DEBUG_T0_FRAG, GHOST_QUAD_FRAG, GHOST_QUAD_VERT, LIFE_FRAG, POINTS_FRAG, POINTS_VERT } from './shaders/points.glsl';
import { GHOST_QUAD_FRAG as V2_GHOST_QUAD_FRAG, POINTS_FRAG as V2_POINTS_FRAG, POINTS_VERT as V2_POINTS_VERT } from './shaders/points-v002.glsl';
import { OUTPUT_FRAG as V2_OUTPUT_FRAG } from './shaders/output-v002.glsl';

// Framework-free particle-face engine (PLAN.md §3–§4). The React island wraps this later:
//   const engine = createFaceEngine(canvas, { mesh, preset: 'ref2' });
//   engine.resize(cssW, cssH, dpr); engine.setPose({...}); engine.setMorphs({...}); engine.render(t);

export type FaceView = 'final' | 't0' | 't1' | 'ghost' | 'mask' | 'dots' | 'vol' | 'volL';

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
  /**
   * Lowest device-pixel ratio the engine renders at. Default (undefined): automatic. A screen below DPR 2 renders
   * the DPR-2 image at the lowest backing store that carries its lattice: the smallest whole-device-px pitch at or
   * above the screen's DPR (never below minPitchDevPx: at DPR 1 the floor would otherwise leave ~45 instead of
   * ~57 dots across), i.e. the same pitch in CSS px, dots across and dot pattern as at 2x, with the ghost blur
   * levels following the resolution. The hero card: DPR 1 and 1.25 -> 1.27x (0.40x the pixels of 2x), DPR 1.5 ->
   * 1.64x (0.67x). Never above 2; DPR >= 2 is native. A number restores a fixed floor (2 = at least 2x, a4 fix-r1).
   */
  minPixelRatio?: number;
  preserveDrawingBuffer?: boolean;
  view?: FaceView;
  /** framing override; default: defaultFraming (portrait: W = min(0.41 H, 0.66 w), eye line at 39 %) */
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
  /**
   * render(t) advances the dot life (look.dotFade) by t - (previous t): dots fade in and out over their fade
   * time instead of popping. The first frame after a layout, a render without t, or a t that does not advance (a
   * still, a static pose sweep) shows every dot's decision at once, exactly as without the dot life; snapDots()
   * does the same for the next render (after a cut / seek / big pose jump).
   */
  render(timeSec?: number): void;
  snapDots(): void;
  info(): Record<string, unknown>;
  dispose(): void;
}

// Framing by aspect a = w / h. Portrait cards (a <= 0.8, the hero card is ~0.69) keep PLAN §4 exactly:
// W = min(0.41 h, 0.66 w), eye line at 39 %. Square to wide cards (iPad / small laptop widths, where the orb well
// is square or wider) blend by smoothstep(0.8, 1.15, a) to ref 2's own proportions (W = 818 / 1580 h, eye line
// at 703.5 / 1580 h), so the face, hair and field fill the card like the owner-approved ref-2 frame instead of
// a small blob in the middle. Wider cards (lg, up to ~1.7 : 1) keep ref 2's face size and eye line (the height
// bounds the face, crown to chin as picked) and look.fieldStretch carries the far field out to the side edges.
const REF2_W_H = 818 / 1580;
const REF2_EYE_H = 703.5 / 1580;
// wide cards: the viewer-right far field moves toward the viewer-left profile across this ramp (u, W): past the
// face and the hair curtains, before the right-side profile falls off (no dark moat between object and field)
const FIELD_BAL_RAMP = [0.55, 0.85] as const;
export const defaultFraming = (w: number, h: number): FaceFraming => {
  const x = Math.min(1, Math.max(0, (w / h - 0.8) / (1.15 - 0.8)));
  const t = x * x * (3 - 2 * x);
  const W = Math.min((0.41 + (REF2_W_H - 0.41) * t) * h, 0.66 * w);
  return { faceWidth: W, origin: [w / 2, (0.39 + (REF2_EYE_H - 0.39) * t) * h] };
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
    uLightK2: { value: v4() },
    uLightAmb: { value: v4() },
    uLightMottle: { value: v4() },
    uLightFade: { value: v4() },
    uLightFade2: { value: v4() },
    uSocket: { value: v4() },
    uSocket2: { value: v4() },
    uLipK: { value: v4() },
    uLidK: { value: v4() },
    uLipTalk: { value: v4() },
    uLipCorner: { value: new THREE.Vector3(Math.abs((lm.mouthCornerL as number[] | undefined)?.[0] ?? 0.195), (lm.mouthCornerL as number[] | undefined)?.[1] ?? lm.mouthCentre[1], 0.03) },
    uPupilObjL: { value: v3(lm.pupilL) },
    uPupilObjR: { value: v3(lm.pupilR) },
    uBlob: { value: Array.from({ length: 10 }, () => v4()) },
    uBlobG: { value: new Array(10).fill(0) },
    uSculptBase: { value: 1 },
    uMouthObj: { value: v3(lm.mouthCentre) },
    uLipSeam: { value: new THREE.Vector3() },
    uSculptTex: { value: null as THREE.Texture | null },
    uSculptRect: { value: v4() },
    uEdgeK: { value: v4() },
    uEdgeK2: { value: v4() },
    uPortTex: { value: null as THREE.Texture | null },
    uPortA: { value: v4() },
    uPortK: { value: v4() },
    uPortE: { value: v4(-0.13, 0.5, 0.78, 0.2) },
    uRefMV: { value: new THREE.Matrix4() },
    uRigid: { value: 0 },
  };
  const sculptWhite = new THREE.DataTexture(new Uint16Array([THREE.DataUtils.toHalfFloat(1)]), 1, 1, THREE.RedFormat, THREE.HalfFloatType);
  sculptWhite.needsUpdate = true;
  let sculptTex: THREE.DataTexture | null = null;
  let sculptSrc: LookParams['sculptMap'] = null;
  light.uSculptTex.value = sculptWhite;
  light.uPortTex.value = sculptWhite;
  // portrait luminance map (look.portrait): loaded once per url, off until it arrives
  let portUrl: string | null = null;
  let portTex: THREE.Texture | null = null;
  function applyPortrait(L: LookParams) {
    const P = L.portrait;
    if (!P) { light.uPortK.value.set(0, 0, 1, 0); return; }
    const pl = lm.pupilL, pr = lm.pupilR, mc = lm.mouthCentre;
    const ipd = Math.abs(pl[0] - pr[0]) || 0.5, eyeY = (pl[1] + pr[1]) / 2;
    if (P.px) {
      // fit: the portrait's pupils onto this mesh's pupils, its mouth onto this mesh's mouth (per-axis scale)
      const { eyeL, eyeR, mouth, size } = P.px;
      const sx = (eyeR[0] - eyeL[0]) / (pl[0] - pr[0]);
      const cx = (eyeL[0] + eyeR[0]) / 2, xm = (pl[0] + pr[0]) / 2;
      const ey = (eyeL[1] + eyeR[1]) / 2;
      const sy = (mouth[1] - ey) / Math.max(eyeY - mc[1], 1e-3);
      light.uPortA.value.set((cx - xm * sx) / size[0], sx / size[0], 1 - (ey + eyeY * sy) / size[1], sy / size[1]);
    } else if (P.affine) light.uPortA.value.set(...P.affine);
    light.uPortE.value.set(...(P.ellipse ?? [eyeY - 0.26 * ipd, 1.0 * ipd, 1.56 * ipd, 0.2]));
    const on = portTex && portUrl === P.url ? 1 : 0;
    light.uPortK.value.set(P.mix, P.gain, P.gamma, on);
    if (portUrl !== P.url) {
      portUrl = P.url;
      new THREE.TextureLoader().load(P.url, (t) => {
        if (portUrl !== P.url) { t.dispose(); return; }
        t.colorSpace = THREE.NoColorSpace;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
        portTex?.dispose();
        portTex = t;
        light.uPortTex.value = t;
        light.uPortK.value.w = 1;
      });
    }
  }
  const flow = createFlowPass(headGeo, light);
  const ghost = createGhostPass(headGeo, light);
  const headMeshes = [...flow.meshes, ghost.mesh];
  // a3 volume (lazily built when look.vol > 0)
  let volume: VolumePass | null = null;
  let volKey = '';
  // the volume depends only on the pose (rest morphs, no time term): it is redrawn when the head has moved more
  // than look.volReuse volume texels relative to the lattice anchor since the last draw, and always after a
  // layout, a look change or a rebuild (volFresh = false)
  let volFresh = false;
  let volSkipped = 0;
  let volDraws = 0;
  // reference points on the outer hair shell (head space W): crown, front top, sides, curtain ends, back
  const volRef = [[0, 1.22, -0.62], [0, 0.62, 0.2], [-1.05, 0.1, -0.6], [1.05, 0.1, -0.6], [-0.95, -1.45, -0.6], [0.95, -1.45, -0.6], [0, 0.1, -1.45]].map((a) => new THREE.Vector3(a[0], a[1], a[2]));
  const volAt = volRef.map(() => new THREE.Vector2());
  const volCur = volRef.map(() => new THREE.Vector2());
  const volP = new THREE.Vector3();
  const volBlack = new THREE.DataTexture(new Uint16Array(4), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  volBlack.needsUpdate = true;
  function ensureVolume() {
    if (!(look.vol > 0)) return;
    const key = JSON.stringify([look.hairLayers, look.hairLayerDensity, look.volFlare, look.volBottom, look.volOpenE, look.volCurtainOpen]);
    if (volume && key === volKey) return;
    volume?.dispose();
    const hair = buildHairVolume(opts.mesh, { ...HAIR_DEFAULTS, layers: look.hairLayers, layerDensity: look.hairLayerDensity, flare: look.volFlare, bottom: look.volBottom, openE: look.volOpenE, curtainOpen: look.volCurtainOpen });
    volume = createVolumePass(headGeo, hair, light);
    volKey = key;
    volFresh = false;
    dirty = true;
  }

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
    uHazeK: { value: v4() },
    uSeamQ: { value: v4() },
    uSeamQ2: { value: v4() },
    uSeamE: { value: v4() },
    uSeamF: { value: v4() },
    uVolQ: { value: volBlack as THREE.Texture },
    uVolQK: { value: v4() },
    uVolQK2: { value: v4() },
    uT0OriginQ: { value: v2() },
    uT0TexelQ: { value: 1 },
    uT0SizeQ: { value: v2(1, 1) },
    uLodOffQ: { value: 0 },
  };
  const quadMat = new THREE.ShaderMaterial({ vertexShader: GHOST_QUAD_VERT, fragmentShader: GHOST_QUAD_FRAG, uniforms: quadU, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(quadGeo, quadMat);
  quad.frustumCulled = false;
  quad.renderOrder = 0;
  // HDR accumulation target: haze/ghost quad + all points (additive, linear energy) -> output pass. Its mip chain
  // only feeds the bloom, so it is built (and regenerated every frame) only while a bloom weight is > 0.
  const makeHdr = (mips: boolean) => new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: mips,
  });
  let hdrMips = look.bloom.some((b) => b > 0);
  let hdr = makeHdr(hdrMips);
  const outU = {
    uHdr: { value: hdr.texture as THREE.Texture },
    uHdrSize: { value: v2(4, 4) },
    uBloomW: { value: v4() },
    uBloomW2: { value: v4() },
    uBloomTint: { value: new THREE.Vector3(1, 1, 1) },
    uOutTone: { value: v4(1.15, 1, 0.5, 1) },
    // a5 cinematic layer
    uCineA: { value: v4() },
    uCineB: { value: v4(1, 0, 0, 1) },
    uGradeHi: { value: new THREE.Vector3(1, 1, 1) },
    uDodgeLive: { value: v4() },
    uDodgeT: { value: v2() },
    uFaceCine: { value: v2(1, 1) },
    uGlint: { value: [v4(), v4(), v4(), v4()] },
    uGlintK: { value: v4(1, 0, 0, 1) },
  };
  const outMat = new THREE.ShaderMaterial({ vertexShader: OUTPUT_VERT, fragmentShader: OUTPUT_FRAG, uniforms: outU, depthTest: false, depthWrite: false });
  const outQuad = new THREE.Mesh(quadGeo, outMat);
  outQuad.frustumCulled = false;
  const outScene = new THREE.Scene();
  outScene.add(outQuad);
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
    uGlyph: { value: v4() },
    uGlyph2: { value: v4() },
    uGlyphF: { value: v4() },
    uEnvA: { value: v4() },
    uEnvB: { value: v4() },
    uEnvC: { value: v4() },
    uEnvD: { value: v4() },
    uEnvE: { value: v4() },
    uEnvF: { value: v4() },
    uRow: { value: v4() },
    uHot: { value: v4() },
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
    uSeamA: { value: v4() },
    uSeamB: { value: v4() },
    uSeamC: { value: v4() },
    uSeamD: { value: v4() },
    uSeamE: { value: v4() },
    uSeamF: { value: v4() },
    uVol: { value: volBlack as THREE.Texture },
    uVolA: { value: v4() },
    uVolB: { value: v4() },
    uVolC: { value: v4() },
    uVolD: { value: v4() },
    uLife: { value: null as THREE.Texture | null },
    uLifeK: { value: v4() },
    uLifeT: { value: v4() },
    uEyeClr: { value: v4() },
    uFieldX: { value: v4() },
    uFieldY: { value: v4() },
    uLodOff: { value: 0 },
    uDotA: { value: v4(0, 2.3, 3.2, 0) },
    uDotB: { value: v4(0.5, 1.1, 0, 0) },
    uDotC: { value: v4() },
    uDotD: { value: v4() },
    uCineW: { value: v4(1, 1, 1, 1) },
    uCineW2: { value: v4(1, 0, 0, 0) },
    uStarO: { value: v2() },
    uStarK2: { value: v4(1, 1, 0, 0) },
    uStarK3: { value: v4(0.15, 0.6, 0, 0) },
    uDrift: { value: v4() },
    uFLife: { value: v4() },
    uDepthK: { value: v4(0, 0, 1, 0) },
    uBright: { value: v4(1, 0.5, 0, 0) },
    // a5 harmony (uHarmD.x = 0: off)
    uHarmA: { value: v4() },
    uHarmB: { value: v4() },
    uHarmC: { value: v4(0, 0.5, 0.1, 1) },
    uHarmD: { value: v4() },
    uHarmE: { value: v4() },
    uHarmF: { value: v4(0.25, 0.3, 0, 0) },
    uPulse: { value: [v4(), v4(), v4(), v4(), v4(), v4()] },
  };
  // dot life state (look.dotFade > 0): ping-pong RGBA16F targets, one texel per particle (LIFE_W per row)
  const LIFE_W = 256;
  const lifeBlack = new THREE.DataTexture(new Uint16Array(4), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  lifeBlack.needsUpdate = true;
  pu.uLife.value = lifeBlack;
  let life: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null;
  let lifeValid = false; // the life state was written by the previous frame (else the next life frame snaps)
  // a frame is a 'still' (every dot shows its decision, the volume is redrawn: exactly the pre-life / pre-reuse
  // image) after a layout, snapDots() or a dot-life toggle, without a clock, or when time does not advance
  let resetFrame = true;
  let frameClock = -Infinity;
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
  // life pass: the same vertex shader (HF_LIFE) writes each particle's next state as a 1 px point
  const lifeMat = new THREE.ShaderMaterial({
    vertexShader: POINTS_VERT,
    fragmentShader: LIFE_FRAG,
    uniforms: pu,
    defines: { HF_LIFE: '' },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });
  let lifePoints: THREE.Points | null = null;
  const lifeScene = new THREE.Scene();
  let points: THREE.Points | null = null;
  const mainScene = new THREE.Scene();
  mainScene.add(quad);
  const dbgScene = new THREE.Scene();
  dbgScene.add(dbgQuad);

  // ---- state
  let pose: HeadPose = { ...REST_POSE };
  const refM = new THREE.Matrix4();
  const poseM = new THREE.Matrix4();
  const morphs: Record<string, number> = {};
  let voice: FaceVoice = { level: 0 };
  // requested DPR (the screen's) and the effective one the engine renders at (layout(): effectiveDpr)
  let reqDpr = opts.pixelRatio ?? (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
  let cssW = 1, cssH = 1, dpr = reqDpr;
  let devW = 1, devH = 1, Wdev = 1, pitch = 1;
  let originDev = new THREE.Vector2();
  let latRange: LatticeRange = { i0: 0, i1: 0, j0: 0, j1: 0 };
  let particleCounts: Record<string, number> = {};
  let dirty = true;
  let lastTime = 0;
  // a5 cinematic state
  let glintStars: [number, number, number][] = [];
  let voiceS = 0;
  // a5 harmony state: facial activity from the morph weights the engine receives (no new API)
  const harm = {
    prev: null as null | { mouth: number; blink: number; smile: number; brow: number },
    E: 0, mouthAcc: 0, exAcc: 0, lastMouth: -1e9, lastEx: -1e9, blinkUp: false,
    pulses: [] as { x: number; y: number; t0: number; a: number }[],
    lag1: new THREE.Vector2(), lag2: new THREE.Vector2(), lagInit: false,
  };
  const harmV = new THREE.Vector3();
  function projDev(p: number[], dy = 0): [number, number] {
    harmV.set(p[0], p[1] + dy, p[2]).applyMatrix4(poseM).project(mainCam);
    return [(harmV.x * 0.5 + 0.5) * devW, (0.5 - harmV.y * 0.5) * devH];
  }
  function harmFrame(t: number, dt: number) {
    const L = look;
    const on = (L.harmony ?? 0) > 0;
    pu.uHarmD.value.x = on ? 1 : 0;
    if (!on) return;
    const m = morphs;
    const g = (k: string) => m[k] ?? 0;
    const cur = {
      mouth: g('jawOpen') + 0.5 * (g('mouthLowerDownLeft') + g('mouthLowerDownRight')) * 0.5 + 0.3 * g('mouthFunnel') + 0.3 * g('mouthPucker'),
      blink: Math.max(g('eyeBlinkLeft'), g('eyeBlinkRight')),
      smile: 0.5 * (g('mouthSmileLeft') + g('mouthSmileRight')),
      brow: 0.5 * (g('browInnerUpLeft') + g('browInnerUpRight') + g('browDownLeft') + g('browDownRight')),
    };
    const o = pu.uOrigin.value;
    if (dt <= 0 || !harm.prev || !harm.lagInit) {
      // a still (or the first frame): no history, no ripples, no lag
      harm.prev = cur;
      harm.lag1.copy(o); harm.lag2.copy(o); harm.lagInit = true;
      if (dt <= 0) { harm.pulses = []; harm.E = 0; }
    } else {
      const p = harm.prev;
      const rate = Math.abs(cur.mouth - p.mouth) / dt;
      const exRate = (Math.abs(cur.smile - p.smile) + Math.abs(cur.brow - p.brow)) / dt;
      // speech energy: openness + movement, fast attack, slow release
      const [, , rel] = L.harmVoice ?? [0, 0, 0.6];
      const target = Math.min(1, cur.mouth * 2.2 + rate * 0.12);
      const tau = target > harm.E ? 0.12 : Math.max(rel, 0.05);
      harm.E += (target - harm.E) * (1 - Math.exp(-dt / tau));
      // mouth ripples: every ~0.25 of accumulated jaw travel (at most every 0.45 s)
      harm.mouthAcc = harm.mouthAcc * Math.exp(-dt / 1.5) + rate * dt;
      if (harm.mouthAcc > 0.25 && t - harm.lastMouth > 0.45) {
        const [x, y] = projDev(lm.mouthCentre);
        harm.pulses.push({ x, y, t0: t, a: Math.min(1, 0.45 + harm.mouthAcc) });
        harm.mouthAcc = 0; harm.lastMouth = t;
      }
      // blinks: a softer echo from each eye at the onset
      if (!harm.blinkUp && cur.blink > 0.5) {
        harm.blinkUp = true;
        for (const pp of [lm.pupilL, lm.pupilR]) { const [x, y] = projDev(pp); harm.pulses.push({ x, y, t0: t, a: 0.4 }); }
      } else if (harm.blinkUp && cur.blink < 0.2) harm.blinkUp = false;
      // expressions (smile, brows): a soft echo from the mouth / between the brows
      harm.exAcc = harm.exAcc * Math.exp(-dt / 2) + exRate * dt;
      if (harm.exAcc > 0.12 && t - harm.lastEx > 1.2) {
        const smileLed = Math.abs(cur.smile - p.smile) >= Math.abs(cur.brow - p.brow);
        const [x, y] = smileLed ? projDev(lm.mouthCentre) : projDev([0.5 * (lm.pupilL[0] + lm.pupilR[0]), 0.5 * (lm.pupilL[1] + lm.pupilR[1]), 0.5 * (lm.pupilL[2] + lm.pupilR[2])], 0.06);
        harm.pulses.push({ x, y, t0: t, a: 0.5 });
        harm.exAcc = 0; harm.lastEx = t;
      }
      harm.prev = cur;
      // sympathetic lag: two-stage exponential spring on the projected head origin
      const [, lagT] = L.harmLag ?? [0, 0.5, 0];
      const k = 1 - Math.exp(-dt / Math.max(lagT * 0.5, 1e-3));
      harm.lag1.lerp(o, k); harm.lag2.lerp(harm.lag1, k);
    }
    const [, , , decay] = L.harmWave ?? [0, 0.5, 0.1, 1.6];
    harm.pulses = harm.pulses.filter((q) => t - q.t0 < decay * 4 && t >= q.t0).slice(-6);
    const P = pu.uPulse.value;
    for (let i = 0; i < 6; i++) {
      const q = harm.pulses[i];
      if (q) P[i].set(q.x, q.y, t - q.t0, q.a); else P[i].set(0, 0, 0, 0);
    }
    pu.uHarmD.value.set(1, o.x - harm.lag2.x, o.y - harm.lag2.y, harm.E);
  }
  const hashN = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  let dodgeSpeech = 0;
  function cineFrame(t: number, dt: number) {
    const L = look;
    if (!(L.cine > 0)) return;
    // live color dodge: speech energy from the mouth morphs the engine already receives (attack 60 ms, release 350 ms)
    const dl = L.dodgeLive ?? [0, 0, 3, 0.5];
    const sp = Math.min(1, 5 * (morphs.jawOpen ?? 0) + 0.75 * ((morphs.mouthLowerDownLeft ?? 0) + (morphs.mouthLowerDownRight ?? 0)) + (morphs.mouthFunnel ?? 0) + (morphs.mouthPucker ?? 0));
    const tauS = sp > dodgeSpeech ? 0.06 : 0.35;
    dodgeSpeech += (sp - dodgeSpeech) * (dt > 0 ? 1 - Math.exp(-dt / tauS) : 1);
    outU.uDodgeLive.value.set(dl[0], dl[1], dl[2], dl[3]);
    outU.uDodgeT.value.set(t, dodgeSpeech);
    // voice level: attack / release smoothing
    const tau = voice.level > voiceS ? L.voiceGlow[2] : L.voiceGlow[3];
    voiceS += (voice.level - voiceS) * (dt > 0 ? 1 - Math.exp(-dt / Math.max(tau, 1e-3)) : 1);
    const ph = 2 * Math.PI * L.breath[2] * t + L.breath[3];
    const bloomMul = (1 + L.breath[0] * Math.sin(ph)) * (1 + L.voiceGlow[0] * voiceS);
    const expMul = (1 + L.breath[1] * Math.sin(ph)) * (1 + L.voiceGlow[1] * voiceS);
    outU.uOutTone.value.w = L.outExposure * expMul;
    outU.uCineB.value.set(L.vignette[2], L.grain[0], Math.floor(t * L.grain[1]), bloomMul);
    // glints: slot k of length 10 / rate s may fire once (70 %), on a hashed candidate star
    const G = outU.uGlint.value;
    G.forEach((g) => g.set(0, 0, 1, 0));
    const [rate, lenW, amp, life] = L.glint;
    const o = pu.uOrigin.value, so = pu.uStarO.value;
    outU.uGlintK.value.set(Math.max(0.8, 0.1 * pitch), o.x, devH - o.y, 0.62 * Wdev);
    if (rate > 0 && glintStars.length) {
      const slot = 10 / rate;
      const k0 = Math.floor((t - life) / slot), k1 = Math.floor(t / slot);
      let gi = 0;
      for (let k = k0; k <= k1 && gi < 4; k++) {
        if (hashN(k * 3.1) > 0.7) continue;
        const t0 = k * slot + hashN(k * 5.7) * (slot - life * 0.5);
        const tau2 = t - t0;
        if (tau2 < 0 || tau2 > life) continue;
        const st = glintStars[Math.floor(hashN(k * 9.3) * glintStars.length)];
        const kp = L.starParallax[0] + (L.starParallax[1] - L.starParallax[0]) * Math.min(1, Math.max(0, st[2] - 0.5));
        const sx = so.x + kp * (o.x - so.x) + st[0] * Wdev, sy = so.y + kp * (o.y - so.y) + st[1] * Wdev;
        const x = tau2 / life;
        const env = Math.min(1, x / 0.15) ** 2 * (1 - Math.min(1, Math.max(0, (x - 0.3) / 0.7))) ** 2;
        G[gi++].set(sx, devH - sy, 1 / (lenW * Wdev), amp * env);
      }
    }
  }

  // a5: while every a5 look parameter is neutral the engine compiles the verbatim approved-v002 shaders, so
  // approved-v001 / v002 render byte for byte as before (fast-math reordering in the extended shaders moves ~45 px by
  // 1-2 LSB otherwise)
  let a5Mode: boolean | null = null;
  const a5Active = (L: LookParams) =>
    L.cine > 0 || (L.dotSoft ?? 0) > 0 || (L.dotHot?.[2] ?? 0) > 0 || (L.dotLogSigma?.[0] ?? 0) > 0 || (L.dotLogSigma?.[1] ?? 0) > 0 ||
    (L.faceJitter?.[0] ?? 0) > 0 || (L.faceJitter?.[1] ?? 0) > 0 || (L.dust?.[0] ?? 0) > 0 || (L.streakShare ?? 0) > 0 ||
    (L.irrTail ?? 0) > 0 || (L.starHot ?? 0) > 0 || (L.dotCap ?? 3.2) !== 3.2 || (L.harmony ?? 0) > 0;
  function applyShaderMode(L: LookParams) {
    const on = a5Active(L);
    if (on === a5Mode) return;
    a5Mode = on;
    pointsMat.vertexShader = on ? POINTS_VERT : V2_POINTS_VERT;
    pointsMat.fragmentShader = on ? POINTS_FRAG : V2_POINTS_FRAG;
    lifeMat.vertexShader = on ? POINTS_VERT : V2_POINTS_VERT;
    quadMat.fragmentShader = on ? GHOST_QUAD_FRAG : V2_GHOST_QUAD_FRAG;
    outMat.fragmentShader = on ? OUTPUT_FRAG : V2_OUTPUT_FRAG;
    pointsMat.needsUpdate = lifeMat.needsUpdate = quadMat.needsUpdate = outMat.needsUpdate = true;
  }
  function applyLook() {
    const L = look;
    applyShaderMode(L);
    const ld = v3(L.lightDir).normalize();
    light.uLightDir.value.copy(ld);
    light.uFillDir.value.copy(v3(L.fillDir).normalize());
    light.uFillK.value.set(L.kdFill, L.fillShadow, L.lipFloor, L.convexity);
    light.uFillR.value = L.fillRight;
    light.uLightK.value.set(L.kd, L.ks, L.specExp, L.aoStrength);
    light.uLightK2.value.set(L.keyWrap, L.keyPow, L.ks2, L.specExp2);
    light.uSocket2.value.set(L.socketSoft[0], L.socketSoft[1], L.socketSquash[0], L.socketSquash[1]);
    light.uLipK.value.set(L.lipGloss[0], L.lipGloss[1], L.lipBorder, L.lipCorner[0]);
    light.uLipCorner.value.z = L.lipCorner[1];
    light.uLidK.value.set(L.lidLine[0], L.lidLine[1], L.crownMottle, L.highlightKnee);
    light.uLightAmb.value.set(L.ambTop, L.ambBottom, L.exposure, L.contrast);
    light.uLightMottle.value.set(L.mottleAmp, L.mottleScale, L.lacrimalGain, L.facingPow);
    light.uLightFade.value.set(L.sideFade[0], L.sideFade[1], L.crownFade[0], L.crownFade[1]);
    light.uLightFade2.value.set(L.neckFade[0], L.neckFade[1], L.keepFacing[0], L.keepFacing[1]);
    light.uSocket.value.set(...L.socket);
    light.uSculptBase.value = L.sculptBase;
    if (L.sculptMap !== sculptSrc) {
      sculptSrc = L.sculptMap;
      sculptTex?.dispose();
      sculptTex = null;
      const M = L.sculptMap;
      if (M && M.data.length === M.nx * M.ny) {
        const d = new Uint16Array(M.nx * M.ny);
        for (let i = 0; i < d.length; i++) d[i] = THREE.DataUtils.toHalfFloat(M.data[i]);
        sculptTex = new THREE.DataTexture(d, M.nx, M.ny, THREE.RedFormat, THREE.HalfFloatType);
        sculptTex.minFilter = sculptTex.magFilter = THREE.LinearFilter;
        sculptTex.needsUpdate = true;
        // texel centres span the rect: uv = (p - x0) / (x1 - x0) maps onto [0.5/n, 1 - 0.5/n]
        const [x0, y0, x1, y1] = M.rect;
        const hx = (x1 - x0) / (M.nx - 1) / 2, hy = (y1 - y0) / (M.ny - 1) / 2;
        light.uSculptRect.value.set(x0 - hx, y0 - hy, 1 / (x1 - x0 + 2 * hx), 1 / (y1 - y0 + 2 * hy));
      } else light.uSculptRect.value.set(0, 0, 0, 0);
      light.uSculptTex.value = sculptTex ?? sculptWhite;
    }
    light.uLipSeam.value.set(...L.lipSeam);
    applyPortrait(L);
    for (let i = 0; i < 10; i++) {
      const b = L.sculpt[i];
      light.uBlob.value[i].set(b ? b[0] : 0, b ? b[1] : 0, b ? b[2] : 1, b ? b[3] : 1);
      light.uBlobG.value[i] = b ? b[4] : 0;
    }
    ghost.uniforms.uGhostK.value.set(L.ghost, L.ghostFill, L.irisGhost, L.pupilGhost);
    ghost.uniforms.uGhostK2.value.set(L.scleraGhost, L.lipTalk?.[3] ?? 0.06, L.lipTalk?.[4] ?? 0.004, L.ghostGamma);
    ghost.uniforms.uGhostK3.value.set(L.hazeAmp, L.hazeGamma, L.hazeFacing[0], L.hazeFacing[1]);
    quadU.uHazeK.value.set(L.hazeLod, L.hazeCloud, L.hazeScale, L.hazeGlow);
    const mips = L.bloom.some((b) => b > 0);
    if (mips !== hdrMips) {
      hdrMips = mips;
      hdr.dispose();
      hdr = makeHdr(mips);
      hdr.setSize(devW, devH);
      outU.uHdr.value = hdr.texture;
    }
    outU.uBloomW.value.set(L.bloom[0], L.bloom[1], L.bloom[2], L.bloom[3]);
    outU.uBloomW2.value.set(L.bloom[4], L.bloom[5], L.bloomThreshold, L.bloomKnee);
    outU.uBloomTint.value.set(...L.bloomTint);
    outU.uOutTone.value.set(L.toneK, L.toneMax, L.dither, L.outExposure);
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
    pu.uGlyph.value.set(L.ringShare[0], L.ringShare[1], L.ringShare[2], L.haloCap);
    pu.uGlyph2.value.set(L.brightSquare, 0, L.dimShrink, L.fragmentShare);
    pu.uGlyphF.value.set(L.haloCap, L.ringMinR, 0, 0);
    pu.uEnvA.value.set(L.plateau[0], L.plateau[1], L.efold[0], L.efold[1]);
    pu.uEnvB.value.set(L.topV, L.topEfold, L.chinV, L.chinEfold);
    pu.uEnvC.value.set(L.hardFade[0], L.hardFade[1], L.hairBottom, L.hairWidth);
    pu.uEnvD.value.set(L.hairFlare, L.hairDensity, L.strayIn, (1 - L.gridShare) / Math.max(0.05, L.gridShare));
    pu.uEnvF.value.set(L.sideDensity[0], L.sideDensity[1], L.survivorBright[0], L.survivorBright[1]);
    pu.uRow.value.set(L.eyeRow, L.eyeRowDy, L.keepPow, L.rimLod);
    pu.uHot.value.set(L.hotBright[0], L.hotBright[1], L.survivorSize[0], L.survivorSize[1]);
    pu.uStarK.value.set(L.starSaturated, L.starGain, L.starHot ?? 0, 0);
    pu.uCatch.value.set(L.catchR, L.catchHdr, L.catchSecondary, 1);
    pu.uCatchOff.value.set(L.catchOffset[0], L.catchOffset[1], L.catchSecondaryOffset[0], L.catchSecondaryOffset[1]);
    pu.uToneK.value.set(L.toneK, L.edgeSoft, L.ringStroke, L.haloSigma);
    pu.uTailLen.value = L.tailLen;
    pu.uToneMax.value = L.toneMax;
    pu.uTintMid.value.set(...L.tintMid);
    pu.uTintPeak.value.set(...L.tintPeak);
    pu.uTintHalo.value.set(...L.tintHalo);
    // seamless face -> particle field (0 = off, the approved v001 path)
    pu.uSeamA.value.set(L.seam, L.seamJitter, L.seamSize, L.seamPromote);
    pu.uSeamB.value.set(L.seamCore[0], L.seamCore[1], L.seamNoise[0], L.seamNoise[1]);
    pu.uSeamC.value.set(L.seamNear[0], L.seamNear[1], L.seamNear[2], L.seamNear[3]);
    pu.uSeamD.value.set(L.seamBright[0], L.seamBright[1], L.seamBright[2], L.seam > 0 ? L.seamDebug : 0);
    quadU.uSeamQ.value.set(L.seam > 0 ? L.seamMist[0] : 0, L.seamMist[1], L.seamMist[2], L.seamMist[3]);
    quadU.uSeamQ2.value.set(L.seamCore[0], L.seamCore[1], L.seamNoise[0], L.seamNoise[1]);
    pu.uSeamE.value.set(L.seam > 0 ? L.seamScatter : 0, L.seamFeature[2], 0, 0);
    pu.uSeamF.value.set(L.seamLit[0], L.seamLit[1], L.seamFeature[0], L.seamFeature[1]);
    quadU.uSeamF.value.copy(pu.uSeamF.value);
    quadU.uSeamE.value.copy(pu.uSeamE.value);
    // a3 volume
    const von = L.vol > 0;
    light.uEdgeK.value.set(von ? L.edgeLift[0] : 0, L.edgeLift[1], L.edgeLift[2], L.edgeLift[3]);
    light.uEdgeK2.value.set(L.edgeLevel[0], L.edgeLevel[1], 0, 0);
    pu.uVolA.value.set(von ? 1 : 0, L.volDot[0], L.volDot[1], L.volDot[2]);
    pu.uVolB.value.set(L.volStat[0], L.volStat[1], L.volStat[2], L.volStat[3]);
    pu.uVolC.value.set(von ? L.volBand[0] : 0, L.volBand[1], L.volBand[2], L.volBand[3]);
    pu.uVolD.value.set(L.volGlyph[0], L.volDot[3], L.volBandSigma, L.volGlyph[1]);
    quadU.uVolQK.value.set(von ? L.volHaze[0] : 0, L.volHaze[1], L.volHaze[2], L.volHaze[3]);
    quadU.uVolQK2.value.set(L.volHazeKnee[0], L.volHazeKnee[1], 0, 0);
    pu.uEyeClr.value.set(L.scatterEyeClear[0], L.scatterEyeClear[1], L.scatterEyeClear[2], 0);
    pu.uDotA.value.set(L.dotSoft ?? 0, L.dotBeta ?? 2.3, L.dotCap ?? 3.2, L.dotLogSigma?.[0] ?? 0);
    pu.uDotB.value.set(L.dotHot?.[0] ?? 0.5, L.dotHot?.[1] ?? 1.1, L.dotHot?.[2] ?? 0, L.faceJitter?.[0] ?? 0);
    pu.uDotC.value.set(L.dust?.[1] ?? 0, L.dust?.[2] ?? 0.05, L.dust?.[3] ?? 0.09, L.streakShare ?? 0);
    pu.uDotD.value.set(L.streakLen ?? 0.8, L.irrTail ?? 0, L.faceJitter?.[1] ?? 0, L.dotLogSigma?.[1] ?? 0);
    // a5 cinematic layer (cine = 0: every term neutral)
    const cn = L.cine > 0;
    pu.uCineW.value.set(L.bloomSrc2[2], L.bloomSrc[2], L.bloomSrc[3], L.bloomSrc2[0]);
    pu.uCineW2.value.set(L.bloomSrc2[1], cn ? 1 : 0, 0, 0);
    pu.uBright.value.set(L.bloomSrc[0], L.bloomSrc[1], cn ? 1 : 0, 0);
    pu.uStarK2.value.set(cn ? L.starParallax[0] : 1, cn ? L.starParallax[1] : 1, cn ? L.starTwinkle[0] : 0, 0);
    pu.uStarK3.value.set(L.starTwinkle[1], L.starTwinkle[2], 0, 0);
    pu.uDrift.value.set(cn ? L.fieldDrift[0] : 0, L.fieldDrift[1], L.fieldDrift[2], 0);
    pu.uFLife.value.set(cn ? L.fieldLife[0] : 0, L.fieldLife[1], L.fieldLife[2], L.fieldLife[3]);
    pu.uDepthK.value.set(L.depthSize[0], L.depthSize[1], L.depthSize[2], 0);
    outU.uCineA.value.set(cn ? 1 : 0, L.dodge, L.vignette[0], L.vignette[1]);
    const fc = L.faceCine ?? [1, 1];
    outU.uFaceCine.value.set(fc[0], fc[1]);
    outU.uGradeHi.value.set(...L.gradeHi);
    // a5 harmony constants (harmFrame sets the per-frame state; harmony 0: uHarmD.x = 0, the block is skipped)
    const hF = L.harmFlow ?? [0, 0, 2.6, 1], hS = L.harmSize ?? [0, 0, 0, 2.2], hW = L.harmWave ?? [0, 0.5, 0.1, 1.6];
    const hL = L.harmLag ?? [0, 0.5, 0], hV = L.harmVoice ?? [0, 0, 0.6];
    pu.uHarmA.value.set(...hF);
    pu.uHarmB.value.set(...hS);
    pu.uHarmC.value.set(hW[0], hW[1], Math.max(hW[2], 1e-3), Math.max(hW[3], 1e-3));
    pu.uHarmE.value.set(hV[0], hV[1], hL[0], hL[2]);
    const hR = L.harmRippleLight ?? [0.25, 0.3];
    pu.uHarmF.value.set(hR[0], hR[1], 0, 0);
    pu.uHarmD.value.x = (L.harmony ?? 0) > 0 ? 1 : 0;
    pu.uLifeT.value.x = L.dotFadeTime[0];
    pu.uLifeT.value.y = L.dotFadeTime[1];
    volFresh = false;
    ensureVolume();
    if (volume) {
      const U = volume.uniforms;
      U.uHairK.value.set(...L.hairLight);
      U.uHairK2.value.set(L.hairSheen[0], L.hairSheen[1], L.hairTone[0], L.hairTone[1]);
      U.uHairN.value.set(L.hairStrand[0], L.hairStrand[1], L.hairClump[0], L.hairClump[1]);
      U.uHairD.value.set(...L.hairDens);
      U.uHairM.value.set(...L.hairMottle);
      U.uHairE.value.set(L.hairCrown[0], L.hairCrown[1], L.hairCrown[2], 0);
      U.uHairF.value.set(L.volCurtainFade[0], L.volCurtainFade[1], 0, 0);
    }
    pu.uVol.value = von && volume ? volume.target.texture : volBlack;
    quadU.uVolQ.value = pu.uVol.value;
    dbgU.uScale.value = L.debugScale;
    mainCam.fov = flowCam.fov = L.fovDeg;
  }

  // the lattice pitch (device px) for a face Wd device px wide (latticeLayout's rule)
  const pitchFor = (Wd: number) => {
    const p = Math.max(look.minPitchDevPx, Wd / look.gridDiv);
    return look.snapPitch ? Math.max(look.minPitchDevPx, Math.round(p)) : p;
  };
  // see FaceEngineOptions.minPixelRatio
  function effectiveDpr(faceWidthCss: number): number {
    if (opts.minPixelRatio !== undefined) return Math.max(opts.minPixelRatio, reqDpr);
    if (reqDpr >= 2) return reqDpr;
    const p2 = pitchFor(2 * faceWidthCss) / 2;   // the DPR-2 lattice pitch in CSS px
    const P = look.snapPitch ? Math.max(look.minPitchDevPx, Math.ceil(reqDpr * p2 - 1e-6)) : Math.max(look.minPitchDevPx, reqDpr * p2);
    return Math.max(reqDpr, Math.min(2, P / p2));
  }

  function layout() {
    const fr = framingFn(cssW, cssH);
    dpr = effectiveDpr(fr.faceWidth);
    devW = Math.max(1, Math.round(cssW * dpr));
    devH = Math.max(1, Math.round(cssH * dpr));
    // the backing store is exactly devW x devH (the page's CSS sizes the canvas)
    renderer.setPixelRatio(1);
    renderer.setSize(devW, devH, false);
    // blur levels of the half-res ghost / mask chain are device-px mips: below 2x they shift so that they cover
    // the same CSS extent as at 2x (0 at >= 2x: every 2x image is unchanged)
    const lodOff = dpr < 2 ? Math.log2(dpr / 2) : 0;
    pu.uLodOff.value = lodOff;
    quadU.uLodOffQ.value = lodOff;
    Wdev = fr.faceWidth * dpr;
    originDev.set(fr.origin[0] * dpr, fr.origin[1] * dpr);
    const lay = latticeLayout(look, devW, devH, Wdev, originDev.x, originDev.y);
    pitch = lay.pitch;
    // camera: W at the origin depth spans Wdev device px
    const f = devH / 2 / Math.tan(THREE.MathUtils.degToRad(look.fovDeg / 2));
    const D = f / Wdev;
    // wide cards (look.fieldStretch): per side, the far field beyond the knee stretches so that this canvas edge
    // shows what ref 2's frame edge shows; the free-scatter box widens to cover the stretched field
    // (ref 2's frame edges: u = -1.21 viewer-left, +1.03 viewer-right). On a card much wider than ref 2 the
    // viewer-right field also moves toward the viewer-left profile (share fieldStretch[3], ramping in with the
    // width; ref 2's sparse right side ends a little past its frame) and its edge then maps toward ref 2's left edge.
    const [fsAmt, fsKnee, fsMax, fsBal] = look.fieldStretch;
    const R = REF_LAYOUT;
    const refL = R.origin[0] / R.faceWidthDev, refR = (R.devW - R.origin[0]) / R.faceWidthDev;
    const ratio = (uEdge: number, uRef: number) => (uEdge - fsKnee) / Math.max(1e-3, uRef - fsKnee);
    const stretch = (x: number) => (fsAmt > 0 && x > 1 + 1e-6 ? Math.min(fsMax, 1 + fsAmt * (x - 1)) : 1);
    const sxL = stretch(ratio(-lay.frame.u0, refL));
    const xR = ratio(lay.frame.u1, refR);
    const fieldOn = sxL > 1 || xR > 1 + 1e-6;
    const bx = Math.min(1, Math.max(0, (xR - 1) / 2));
    const bal = fieldOn && fsBal > 0 ? fsBal * bx * bx * (3 - 2 * bx) : 0;
    const sxR = stretch(ratio(lay.frame.u1, refR + (refL - refR) * bal));
    pu.uFieldX.value.set(fsKnee, sxL, sxR, fieldOn ? 1 : 0);
    pu.uFieldY.value.set(bal, 0, FIELD_BAL_RAMP[0], FIELD_BAL_RAMP[1]);
    // the farthest scatter depth (z0) projects narrowest: cover the farther side edge there, plus a sprite of margin
    const scatterHalfX = fieldOn ? Math.max(-lay.frame.u0, lay.frame.u1) * (D - SCATTER_DOMAIN.z[0]) / D + 0.05 : 0;
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
    latRange = lay.range;
    const cols = latRange.i1 - latRange.i0 + 1, rows = latRange.j1 - latRange.j0 + 1;
    flow.setSize(cols, rows);
    volume?.setSize(cols, rows);
    ghost.setSize(devW, devH);
    hdr.setSize(devW, devH);
    outU.uHdrSize.value.set(devW, devH);
    pu.uT0Size.value.set(cols * 4, rows * 4);
    pu.uT0Texel.value = pitch / 4;
    pu.uViewport.value.set(devW, devH);
    pu.uWpx.value = Wdev;
    pu.uPitch.value = pitch;
    // particles
    const built = buildParticleGeometry(look, latRange, lay.frame, seed, scatterHalfX);
    if (points) { points.geometry.dispose(); mainScene.remove(points); }
    points = new THREE.Points(built.geometry, pointsMat);
    points.frustumCulled = false;
    points.matrixAutoUpdate = false;
    points.renderOrder = 1;
    mainScene.add(points);
    // dot life: one state texel per particle; a new layout starts from this frame's decisions
    if (lifePoints) lifeScene.remove(lifePoints);
    lifePoints = new THREE.Points(built.geometry, lifeMat);
    lifePoints.frustumCulled = false;
    lifePoints.matrixAutoUpdate = false;
    lifeScene.add(lifePoints);
    const nP = built.geometry.getAttribute('position').count;
    const lifeH = Math.max(1, Math.ceil(nP / LIFE_W));
    if (!life || life[0].height !== lifeH) {
      life?.forEach((t) => t.dispose());
      const lo = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false } as const;
      life = [new THREE.WebGLRenderTarget(LIFE_W, lifeH, lo), new THREE.WebGLRenderTarget(LIFE_W, lifeH, lo)];
    }
    pu.uLifeT.value.z = LIFE_W;
    pu.uLifeT.value.w = lifeH;
    resetFrame = true;
    volFresh = false;
    pu.uEnvE.value.set(look.survivorJitter, look.hotShare, look.filamentShare, built.scatterNorm);
    pu.uStarO.value.set(originDev.x, originDev.y);
    // a5 glint candidates: saturated stars well outside the face
    glintStars = [];
    {
      const P = built.geometry.getAttribute('position'), K = built.geometry.getAttribute('aKind'), R2 = built.geometry.getAttribute('aRand2');
      for (let i = 0; i < K.count; i++) {
        if (K.getX(i) !== 2 || R2.getX(i) >= look.starSaturated) continue;
        const u = P.getX(i), v = P.getY(i);
        if (Math.hypot(u / 0.62, (v - 0.1) / 0.9) < 1.25) continue;
        glintStars.push([u, v, P.getZ(i)]);
      }
    }
    particleCounts = built.counts;
    dirty = false;
  }

  function updatePose() {
    poseMatrix(pose, poseM);
    for (const m of headMeshes) { m.matrix.copy(poseM); m.matrixWorld.copy(poseM); }
    // rigid flow (look.rigidFlow): the lattice is laid out on the head WITHOUT its rotation and the rotation goes into
    // the per-dot flow, so turning the head moves every dot with its patch of skin (a real 3D turn, not a sliding grid)
    const rigid = (look.rigidFlow ?? 0) > 0.5 && (look.rigidFlow ?? 0) < 1.5;
    const anchorOnly = (look.rigidFlow ?? 0) > 1.5;
    light.uRigid.value = rigid ? 1 : 0;
    let anchorM = poseM;
    if (rigid) {
      poseMatrix({ ...pose, yaw: 0, pitch: 0, roll: 0 }, refM);
      flowCam.updateMatrixWorld();
      light.uRefMV.value.multiplyMatrices(flowCam.matrixWorldInverse, refM);
      anchorM = refM;
    }
    if (anchorOnly) { poseMatrix({ ...pose, yaw: 0, pitch: 0, roll: 0 }, refM); anchorM = refM; }
    if (volume) for (const m of volume.meshes) { m.matrix.copy(poseM); m.matrixWorld.copy(poseM); }
    if (points) { points.matrix.copy(poseM); points.matrixWorld.copy(poseM); }
    if (lifePoints) { lifePoints.matrix.copy(poseM); lifePoints.matrixWorld.copy(poseM); }
    // anchor = projected head origin (current pose), so breathing / sway move the grid with the head
    const o = new THREE.Vector3(0, 0, 0).applyMatrix4(anchorM).project(mainCam);
    const ox = (o.x * 0.5 + 0.5) * devW, oy = (0.5 - o.y * 0.5) * devH;
    const ax = ox + look.gridPhase[0] * pitch, ay = oy + look.gridPhase[1] * pitch;
    pu.uOrigin.value.set(ox, oy);
    quadU.uOriginQ.value.set(ox, oy);
    quadU.uViewportQ.value.set(devW, devH);
    quadU.uWpxQ.value = Wdev;
    pu.uAnchor.value.set(ax, ay);
    const t0x = ax + (latRange.i0 - 0.5) * pitch, t0y = ay + (latRange.j0 - 0.5) * pitch;
    pu.uT0Origin.value.set(t0x, t0y);
    quadU.uT0OriginQ.value.set(t0x, t0y);
    quadU.uT0TexelQ.value = pu.uT0Texel.value;
    quadU.uT0SizeQ.value.copy(pu.uT0Size.value);
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
    // speaking lips: light both lips with the mouth opening (look.lipTalk)
    const lt = look.lipTalk;
    if (lt) {
      const g = (k: string) => morphs[k] ?? 0;
      const o = Math.min(1, 2.5 * g('jawOpen') + 0.6 * (g('mouthLowerDownLeft') + g('mouthLowerDownRight')) + 0.8 * (g('mouthUpperUpLeft') + g('mouthUpperUpRight')) + 0.8 * g('mouthFunnel'));
      light.uLipTalk.value.set(lt[0] + lt[1] * o, lt[2] * o, 0, 0);
    } else light.uLipTalk.value.set(0, 0, 0, 0);
    const blink = Math.max(morphs.eyeBlinkLeft ?? 0, morphs.eyeBlinkRight ?? 0);
    pu.uCatch.value.w = 1 - Math.min(1, blink * 1.4);
  }

  function render(timeSec?: number) {
    if (dirty) layout();
    if (timeSec !== undefined) lastTime = timeSec;
    const still = resetFrame || timeSec === undefined || timeSec <= frameClock;
    const dt = still ? 0 : timeSec! - frameClock;
    if (timeSec !== undefined) frameClock = timeSec;
    resetFrame = false;
    if (still) volFresh = false;
    pu.uTime.value = lastTime;
    updatePose();
    cineFrame(lastTime, dt);
    harmFrame(lastTime, dt);
    applyMorphs();
    flow.render(renderer, flowCam);
    if (volume && look.vol > 0 && volumeStale()) { volume.render(renderer, flowCam); volDraws++; }
    ghost.render(renderer, mainCam);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, true);
    if ((view === 'vol' || view === 'volL') && volume) {
      dbgU.uTex.value = volume.target.texture;
      dbgU.uChan.value.set(view === 'volL' ? 1 : 0, view === 'vol' ? 1 : 0, 0, 0);
      renderer.render(dbgScene, flowCam);
      return;
    }
    if (view === 't0' || view === 't1') {
      dbgU.uTex.value = view === 't0' ? flow.T0.texture : flow.T1.texture;
      dbgU.uChan.value.set(view === 't0' ? 1 : 0, 0, view === 't1' ? 0.1 : 0, 0);
      renderer.render(dbgScene, mainCam);
      return;
    }
    quadU.uView.value = view === 'mask' ? 2 : 0;
    quad.visible = view !== 'dots';
    if (points) points.visible = view !== 'ghost' && view !== 'mask';
    // dot life: advance every particle's state by dt (the draw below reads the previous state and applies the
    // same step); a still snaps every state to this frame's decisions
    const lifeOn = look.dotFade > 0 && !!life && !!lifePoints;
    if (lifeOn) {
      pu.uLifeK.value.set(1, dt, still || !lifeValid ? 1 : 0, look.dotFadeCurve);
      pu.uLife.value = life![0].texture;
      renderer.setRenderTarget(life![1]);
      renderer.render(lifeScene, mainCam);
      lifeValid = true;
    } else {
      pu.uLifeK.value.set(0, 0, 1, look.dotFadeCurve);
      pu.uLife.value = lifeBlack;
      lifeValid = false;
    }
    renderer.setRenderTarget(hdr);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(mainScene, mainCam);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 1);
    renderer.render(outScene, mainCam);
    if (lifeOn) life!.reverse();
  }

  // true when the volume must be redrawn (see volFresh); records the pose it is drawn at
  function volumeStale(): boolean {
    volP.set(0, 0, 0).applyMatrix4(poseM).project(mainCam);
    const ox = (volP.x * 0.5 + 0.5) * devW, oy = (0.5 - volP.y * 0.5) * devH;
    let moved = 0;
    volRef.forEach((r, k) => {
      volP.copy(r).applyMatrix4(poseM).project(mainCam);
      volCur[k].set((volP.x * 0.5 + 0.5) * devW - ox, (0.5 - volP.y * 0.5) * devH - oy);
      moved = Math.max(moved, volCur[k].distanceTo(volAt[k]));
    });
    // reuse while the head is still (lip-sync, blinks) or has moved less than volReuse[0] texels, skipping at most
    // volReuse[1] frames in a row while it moves (a stale volume steps the hair-dot brightness)
    const [maxMove, maxSkip] = look.volReuse;
    const texel = pitch / 4;
    if (volFresh && maxMove > 0 && moved <= maxMove * texel && (moved < 1e-3 * texel || volSkipped < maxSkip)) {
      volSkipped++;
      return false;
    }
    volCur.forEach((c, k) => volAt[k].copy(c));
    volFresh = true;
    volSkipped = 0;
    return true;
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
      const rebuild = ['gridDiv', 'scatterCount', 'starsPerW2', 'fovDeg', 'snapPitch', 'minPitchDevPx', 'gridPhase', 'fieldStretch'].some((k) => k in l);
      look = { ...look, ...l };
      applyLook();
      if (rebuild) dirty = true;
      if ('dotFade' in l || 'dotFadeTime' in l) resetFrame = true;
    },
    setView(v) { view = v; volFresh = false; },
    resize(w, h, pr) {
      cssW = Math.max(1, w); cssH = Math.max(1, h);
      if (pr) reqDpr = pr;
      dirty = true;
    },
    render,
    snapDots() { resetFrame = true; },
    info() {
      const gl = renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        device: [devW, devH], dpr, requestedDpr: reqDpr, faceWidthDev: Wdev, pitchDev: pitch, originDev: [originDev.x, originDev.y],
        lattice: latRange, particles: particleCounts, morphTargets: Object.keys(morphIndex),
        volumeDraws: volDraws, dotFade: look.dotFade > 0,
      };
    },
    dispose() {
      flow.dispose();
      ghost.dispose();
      headGeo.dispose();
      points?.geometry.dispose();
      pointsMat.dispose();
      lifeMat.dispose();
      life?.forEach((t) => t.dispose());
      lifeBlack.dispose();
      quadMat.dispose();
      outMat.dispose();
      hdr.dispose();
      dbgMat.dispose();
      sculptTex?.dispose();
      sculptWhite.dispose();
      volume?.dispose();
      volBlack.dispose();
      quadGeo.dispose();
      renderer.dispose();
    },
  };
}
