import * as THREE from "three";
import {
  STUDY_ORB_FRAGMENT_SHADER,
  STUDY_ORB_VERTEX_SHADER,
} from "./study-orb-shaders";

const MAX_DPR = 2;
const MAX_BUFFER_DIMENSION = 1024;
const POSTER_SIZE = 512;
const TIME_SCALE = 1.4;
/** How much orange the folds are allowed. Past ~0.6 the disc stops reading green. */
const DEFAULT_WARMTH = 0.45;
/** Cells across the canvas, and how far the gutters between them drop. */
const MATRIX_CELLS = 214;
const MATRIX_DEPTH = 0.3;

export const STUDY_ORB_POSTER_PATHS = {
  light: "/brand/study-orb-poster-light.png",
  dark: "/brand/study-orb-poster-dark.png",
} as const;

type ThemeMode = keyof typeof STUDY_ORB_POSTER_PATHS;

/**
 * GBO darker green / cool blue / soft white remaps over the study posters, plus
 * a desaturated orange for the folds — the green-and-burnt-amber pairing that
 * cockpit displays run on.
 */
export const STUDY_ORB_PALETTES = {
  dark: {
    dark: [0.01, 0.055, 0.048] as [number, number, number],
    mid: [0.03, 0.55, 0.34] as [number, number, number],
    cool: [0.05, 0.28, 0.42] as [number, number, number],
    light: [0.55, 0.88, 0.78] as [number, number, number],
    warm: [0.62, 0.29, 0.11] as [number, number, number],
  },
  light: {
    dark: [0.06, 0.26, 0.22] as [number, number, number],
    mid: [0.05, 0.58, 0.42] as [number, number, number],
    cool: [0.14, 0.38, 0.52] as [number, number, number],
    light: [0.82, 0.96, 0.92] as [number, number, number],
    warm: [0.72, 0.4, 0.18] as [number, number, number],
  },
} as const;

export interface StudyOrbGradientHandle {
  destroy(): void;
  setPlaying(value: boolean): void;
  setClearColor(rgb: [number, number, number], alpha?: number): void;
  setTheme(mode: ThemeMode): void;
  setTime(ms: number): void;
  /** Voice amplitude 0..1; the orb rim waves with it. Fast attack, slow decay. */
  setLevel(value: number): void;
  /** Call in progress: sustained glow + rim rays. */
  setActive(value: boolean): void;
}

type CreateStudyOrbGradientOptions = {
  onError?: (error: Error) => void;
  onReady?: () => void;
};

/**
 * Route-only Study 03 renderer. Its full-colour posters are reconstructed and
 * dithered offline, leaving the animated shader with one texture lookup and no
 * runtime colour-remapping pass.
 */
export function createStudyOrbGradient(
  canvas: HTMLCanvasElement,
  clearColor: [number, number, number] = [1, 1, 1],
  { onError, onReady }: CreateStudyOrbGradientOptions = {}
): StudyOrbGradientHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(new THREE.Color(...clearColor), 0);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;
  const geometry = new THREE.PlaneGeometry(2, 2);

  const palette = STUDY_ORB_PALETTES.dark;
  const finalUniforms: Record<string, THREE.IUniform> = {
    u_time: { value: 0 },
    u_texture: { value: null },
    u_resolution: { value: new THREE.Vector2(1, 1) },
    u_textureResolution: {
      value: new THREE.Vector2(POSTER_SIZE, POSTER_SIZE),
    },
    u_paletteDark: { value: new THREE.Color(...palette.dark) },
    u_paletteMid: { value: new THREE.Color(...palette.mid) },
    u_paletteCool: { value: new THREE.Color(...palette.cool) },
    u_paletteLight: { value: new THREE.Color(...palette.light) },
    u_paletteWarm: { value: new THREE.Color(...palette.warm) },
    u_warmth: { value: DEFAULT_WARMTH },
    u_matrixCells: { value: MATRIX_CELLS },
    u_matrix: { value: MATRIX_DEPTH },
    u_level: { value: 0 },
    // GBO brand green tinting the cloud layer.
    u_paletteAccent: { value: new THREE.Color(0.02, 0.867, 0.529) },
    u_active: { value: 0 },
  };
  const finalMaterial = new THREE.ShaderMaterial({
    uniforms: finalUniforms,
    vertexShader: STUDY_ORB_VERTEX_SHADER,
    fragmentShader: STUDY_ORB_FRAGMENT_SHADER,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const finalScene = new THREE.Scene();
  const finalMesh = new THREE.Mesh(geometry, finalMaterial);
  finalMesh.frustumCulled = false;
  finalScene.add(finalMesh);

  let destroyed = false;
  let playing = true;
  let raf = 0;
  let previousFrameTime = 0;
  let elapsedSeconds = 0;
  let readyNotified = false;
  let activeMode: ThemeMode = "light";
  let targetLevel = 0;
  let targetActive = 0;
  const loaded: Record<ThemeMode, boolean> = { light: false, dark: false };
  const loader = new THREE.TextureLoader();
  let lightTexture: THREE.Texture;
  let darkTexture: THREE.Texture;

  const activeTexture = () =>
    activeMode === "dark" ? darkTexture : lightTexture;

  const renderFinal = () => {
    if (destroyed || !loaded[activeMode]) return;
    renderer.setRenderTarget(null);
    renderer.render(finalScene, camera);
  };

  const frame = (now: number) => {
    raf = 0;
    if (!playing || destroyed || !loaded[activeMode]) return;

    const delta = previousFrameTime
      ? Math.min((now - previousFrameTime) * 0.001, 0.05)
      : 1 / 60;
    previousFrameTime = now;
    const current = finalUniforms.u_level.value as number;
    // The decay has to outrun the gaps between syllables, or the level sits
    // near its peak and the swell never visibly returns.
    const rate = targetLevel > current ? 18 : 8;
    const level = current + (targetLevel - current) * Math.min(1, delta * rate);
    finalUniforms.u_level.value = level;

    const active = finalUniforms.u_active.value as number;
    const activeEase =
      active + (targetActive - active) * Math.min(1, delta * 2.5);
    finalUniforms.u_active.value = activeEase;

    // Loud speech runs the clock faster, so the liquid churns instead of just
    // wobbling harder.
    elapsedSeconds += delta * (1 + level * activeEase * 2.4);
    finalUniforms.u_time.value = elapsedSeconds * TIME_SCALE;

    renderFinal();
    raf = requestAnimationFrame(frame);
  };

  const ensureLoop = () => {
    if (playing && !destroyed && loaded[activeMode] && !raf) {
      raf = requestAnimationFrame(frame);
    }
  };

  const configureTexture = (texture: THREE.Texture) => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = Math.min(
      4,
      renderer.capabilities.getMaxAnisotropy()
    );
  };

  const applyPalette = (mode: ThemeMode) => {
    const next = STUDY_ORB_PALETTES[mode];
    (finalUniforms.u_paletteDark.value as THREE.Color).setRGB(...next.dark);
    (finalUniforms.u_paletteMid.value as THREE.Color).setRGB(...next.mid);
    (finalUniforms.u_paletteCool.value as THREE.Color).setRGB(...next.cool);
    (finalUniforms.u_paletteLight.value as THREE.Color).setRGB(...next.light);
    (finalUniforms.u_paletteWarm.value as THREE.Color).setRGB(...next.warm);
  };

  const activateTexture = () => {
    if (!loaded[activeMode]) return;
    finalUniforms.u_texture.value = activeTexture();
    applyPalette(activeMode);
  };

  const markTextureLoaded = (mode: ThemeMode) => {
    if (destroyed) return;
    loaded[mode] = true;
    if (mode !== activeMode) return;

    activateTexture();
    renderFinal();
    if (!readyNotified) {
      readyNotified = true;
      onReady?.();
    }
    ensureLoop();
  };

  const markTextureFailed = (mode: ThemeMode) => {
    if (destroyed) return;
    onError?.(
      new Error(`Unable to load ${STUDY_ORB_POSTER_PATHS[mode]}`)
    );
  };

  lightTexture = loader.load(
    STUDY_ORB_POSTER_PATHS.light,
    () => markTextureLoaded("light"),
    undefined,
    () => markTextureFailed("light")
  );
  darkTexture = loader.load(
    STUDY_ORB_POSTER_PATHS.dark,
    () => markTextureLoaded("dark"),
    undefined,
    () => markTextureFailed("dark")
  );
  configureTexture(lightTexture);
  configureTexture(darkTexture);

  const drawingBufferSize = new THREE.Vector2();
  const resize = () => {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width || canvas.clientWidth || 256);
    const cssHeight = Math.max(1, rect.height || canvas.clientHeight || 256);
    const largestCssDimension = Math.max(cssWidth, cssHeight);
    const deviceDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const cappedDpr = Math.min(
      deviceDpr,
      MAX_BUFFER_DIMENSION / largestCssDimension
    );

    renderer.setPixelRatio(cappedDpr);
    renderer.setSize(cssWidth, cssHeight, false);
    renderer.getDrawingBufferSize(drawingBufferSize);
    (finalUniforms.u_resolution.value as THREE.Vector2).copy(
      drawingBufferSize
    );
    renderFinal();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  return {
    setPlaying(value: boolean) {
      if (playing === value) return;
      playing = value;
      previousFrameTime = 0;
      if (value) {
        renderFinal();
        ensureLoop();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    setClearColor(rgb: [number, number, number], alpha = 0) {
      renderer.setClearColor(new THREE.Color(...rgb), alpha);
      renderFinal();
    },
    setTheme(mode: ThemeMode) {
      activeMode = mode;
      previousFrameTime = 0;
      applyPalette(mode);
      if (loaded[mode]) {
        activateTexture();
        renderFinal();
        if (!readyNotified) {
          readyNotified = true;
          onReady?.();
        }
        ensureLoop();
      }
    },
    setLevel(value: number) {
      targetLevel = Math.min(1, Math.max(0, value));
    },
    setActive(value: boolean) {
      targetActive = value ? 1 : 0;
    },
    setTime(ms: number) {
      elapsedSeconds = Math.max(0, ms) * 0.001;
      finalUniforms.u_time.value = elapsedSeconds * TIME_SCALE;
      renderFinal();
    },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      finalScene.remove(finalMesh);
      geometry.dispose();
      finalMaterial.dispose();
      lightTexture.dispose();
      darkTexture.dispose();
      renderer.dispose();
    },
  };
}
