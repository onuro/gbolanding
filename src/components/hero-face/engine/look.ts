// Look parameters for the particle face (PLAN.md §4). All lengths are in W (face width = 2 x IPD)
// unless the name says p (grid pitch) or px. The 'ref2' preset is the master look (10.webp).

export type Vec3 = [number, number, number];

export interface LookParams {
  // ---- framing / grid
  fovDeg: number; // perspective camera vertical FOV
  gridDiv: number; // pitch = W / gridDiv
  minPitchDevPx: number; // pitch floor in device px
  snapPitch: boolean; // snap pitch to whole device px
  pitchWarp: number; // local pitch = p (1 + pitchWarp u^2) horizontally (ref 2 periphery grows ~20% at 0.9 W)
  gridPhase: [number, number]; // lattice phase relative to the projected head origin, in p

  // ---- lighting (flow pass)
  lightDir: Vec3; // key light, view space, toward the light (specular + diffuse, baked visibility)
  fillDir: Vec3; // near-frontal fill (diffuse only)
  kdFill: number;
  fillRight: number; // mirrored fill from the viewer's right (share of kdFill)
  fillShadow: number; // share of the key's baked shadow applied to the fill
  lipFloor: number; // lip albedo multiplier
  lipSeam: [number, number, number]; // closed-mouth seam shadow: half-height (W), half-width (W), depth
  convexity: number; // lit *= 1 + convexity * curv (baked sculpt term)
  sculptBase: number; // art-directed sculpt map: multiplier between highlight zones
  sculpt: [number, number, number, number, number][]; // [x, y, rx, ry, gain] object space (W, y up), max 10
  kd: number;
  ks: number;
  specExp: number;
  ambTop: number;
  ambBottom: number;
  aoStrength: number; // lit *= mix(1, ao, aoStrength)
  contrast: number; // L = pow(lit * exposure, contrast)
  exposure: number;
  mottleAmp: number; // albedo x (1 +- amp * fbm)
  mottleScale: number; // noise frequency in 1/W
  lacrimalGain: number; // tear-line (lower lid rim) brightness
  facingPow: number; // lit *= (N.V)^facingPow (temples, jaw sides and crown fall off)
  socket: [number, number, number, number]; // eye-socket shadow ellipse: rx, ry (W), floor, y offset
  sideFade: [number, number]; // |x| (mesh space, W) where face dots dissolve (ears, head sides)
  crownFade: [number, number]; // y above the eye line (W) where the skull top dissolves
  neckFade: [number, number]; // y (W, negative = below the eyes) where the neck dissolves
  keepFacing: [number, number]; // N.V range over which grazing surfaces dissolve
  keepPow: number; // dissolve probability curve

  // ---- dot transfer (PLAN §4 / look report finding 3)
  alphaLo: number;
  alphaHi: number;
  gain: number; // I = gain * L^gamma
  gamma: number;
  rBase: number; // r/p = rBase + rMid*ss(.08,.65,L) + rTop*ss(.65,1.2,L)
  rMid: number;
  rTop: number;
  rMax: number;
  jitterSize: number;
  jitterBright: number;
  superN: number; // superellipse exponent for discs
  ringiness: number; // share of ring / arc / filament glyphs
  ringStroke: number; // ring stroke width, p
  edgeSoft: number; // disc edge softness, p
  irregularity: number; // blob outline wobble (0 = perfect discs)

  // ---- sprite halo + tone
  haloAmp: number;
  haloSigma: number; // p
  tailAmp: number;
  tailLen: number; // p
  haloBright: number; // extra halo for I > 1 (bright dots grow a wider glow)
  toneK: number; // t = toneMax (1 - exp(-toneK x))
  toneMax: number;
  tintMid: Vec3;
  tintPeak: Vec3;
  tintHalo: Vec3;
  dither: number; // +- LSB

  // ---- ghost / mist layer
  ghost: number; // dim continuous face (x lit^ghostGamma)
  ghostGamma: number;
  ghostFill: number; // frontal fill so the shadowed sockets show lids/iris
  ghostLod: number; // blur of the ghost (mip of the half-res target)
  irisGhost: number;
  pupilGhost: number;
  scleraGhost: number;
  mist: number; // fbm mist behind the scatter (inside the head+hair envelope)
  mistRadius: [number, number]; // W: full strength inside r0, zero beyond r1
  mistBalance: number; // viewer-right side factor

  // ---- edges, scatter, stars
  plateau: [number, number]; // lateral half-width of the dense envelope (viewer-left, viewer-right)
  efold: [number, number]; // lateral e-fold (left, right)
  hardFade: [number, number]; // radial hard fade (W)
  topV: number; // top of the envelope (v, down positive)
  topEfold: number;
  chinV: number; // below this the centre (neck) falls fast
  chinEfold: number;
  hairBottom: number; // long-hair curtains reach this v
  hairWidth: number; // curtain outer half-width at the eye line
  hairFlare: number; // outer half-width growth per W downward
  hairDensity: number; // survivor probability inside the hair envelope
  strayIn: number; // stray survivors over dark face areas (not mouth)
  gridShare: number; // share of the dissolve kept on the grid (rest is free 3D scatter)
  sideDensity: [number, number]; // survivor probability at the envelope edge (viewer-left, right)
  survivorBright: [number, number]; // survivor / scatter intensity range (HDR)
  starGain: number;
  scatterCount: number; // free scatter particles
  filamentShare: number;
  survivorJitter: number; // p, times (1 - coverage)
  hotShare: number; // share of hot survivors / scatter
  starsPerW2: number;
  starSaturated: number;

  // ---- eyes
  catchR: number; // p
  catchHdr: number;
  catchOffset: [number, number]; // W, (+x right, +y up) from the pupil
  catchSecondary: number; // size/intensity factor, 0 = off
  catchSecondaryOffset: [number, number];

  // ---- row effects
  eyeRow: number; // lit eye-level row strength (0 = off)
  eyeRowDy: number; // W below the pupils
  streaks: number; // 0 = off (ref 3 preset only)
  parallaxBend: number; // p per 0.12 W depth (ref 3)
}

export const REF2: LookParams = {
  fovDeg: 20,
  gridDiv: 59,
  minPitchDevPx: 7,
  snapPitch: true,
  pitchWarp: 0.12,
  gridPhase: [0, 0],

  lightDir: [-0.16, 0.85, 0.5],
  fillDir: [-0.35, 0.25, 0.9],
  kdFill: 0.95,
  fillRight: 0.6,
  fillShadow: 0.3,
  lipFloor: 0.3,
  lipSeam: [0.02, 0.2, 0.95],
  convexity: 0.25,
  sculptBase: 0.78,
  sculpt: [
    [0, 0.47, 0.17, 0.13, 0.5], // forehead highlight (ref: -0.47 W, r 0.15)
    [-0.285, -0.175, 0.1, 0.09, 0.6], // cheekbone, viewer-left (brighter side)
    [0.285, -0.175, 0.1, 0.09, 0.45], // cheekbone, viewer-right
    [0, -0.13, 0.035, 0.17, 0.45], // nose ridge (-0.04 .. +0.29)
    [-0.24, 0.16, 0.1, 0.045, 0.35], // brow L
    [0.24, 0.16, 0.1, 0.045, 0.28], // brow R
    [0, -0.25, 0.045, 0.04, 0.35], // nose tip
    [-0.02, -0.73, 0.1, 0.06, 0.25], // chin highlight (+0.73)
    [-0.02, -0.585, 0.1, 0.025, 0.3], // lower-lip cluster (+0.58)
    [0, 0, 0.01, 0.01, 0],
  ],
  kd: 0.25,
  ks: 0.9,
  specExp: 40,
  ambTop: 0.02,
  ambBottom: 0.005,
  aoStrength: 0.6,
  contrast: 1.5,
  exposure: 0.9,
  mottleAmp: 0.22,
  mottleScale: 6.5,
  lacrimalGain: 2.0,
  facingPow: 0.7,
  socket: [0.16, 0.095, 0.05, -0.01],
  sideFade: [0.55, 0.75],
  crownFade: [0.55, 0.9],
  neckFade: [-0.98, -0.84],
  keepFacing: [0.0, 0.3],
  keepPow: 0.8,

  alphaLo: 0.05,
  alphaHi: 0.12,
  gain: 2.0,
  gamma: 1.1,
  rBase: 0.11,
  rMid: 0.07,
  rTop: 0.03,
  rMax: 0.4,
  jitterSize: 0.08,
  jitterBright: 0.25,
  superN: 2.2,
  ringiness: 0.5,
  ringStroke: 0.13,
  edgeSoft: 0.07,
  irregularity: 1.0,

  haloAmp: 0.16,
  haloSigma: 0.28,
  tailAmp: 0.04,
  tailLen: 0.5,
  haloBright: 0.05,
  toneK: 1.15,
  toneMax: 0.88,
  tintMid: [0.91, 0.99, 1.0],
  tintPeak: [0.98, 1.0, 1.0],
  tintHalo: [0.85, 1.0, 0.98],
  dither: 0.5,

  ghost: 0.12,
  ghostGamma: 0.45,
  ghostFill: 0.04,
  ghostLod: 1.0,
  irisGhost: 0.07,
  pupilGhost: 0.015,
  scleraGhost: 0.025,
  mist: 0.009,
  mistRadius: [0.55, 1.15],
  mistBalance: 0.6,

  plateau: [0.62, 0.56],
  efold: [0.26, 0.07],
  hardFade: [1.15, 1.45],
  topV: -0.92,
  topEfold: 0.1,
  chinV: 0.86,
  chinEfold: 0.08,
  hairBottom: 1.1,
  hairWidth: 0.7,
  hairFlare: 0.08,
  hairDensity: 0.55,
  strayIn: 0.12,
  gridShare: 0.9,
  sideDensity: [0.6, 0.35],
  survivorBright: [0.3, 1.5],
  starGain: 1.0,
  scatterCount: 3000,
  filamentShare: 0.07,
  survivorJitter: 0.07,
  hotShare: 0.12,
  starsPerW2: 28,
  starSaturated: 0.24,

  catchR: 0.4,
  catchHdr: 2.0,
  catchOffset: [-0.015, 0.015],
  catchSecondary: 0.6,
  catchSecondaryOffset: [0.03, -0.004],

  eyeRow: 1,
  eyeRowDy: 0.035,
  streaks: 0,
  parallaxBend: 0,
};

export const PRESETS: Record<string, LookParams> = {
  ref2: REF2,
  // Refs 1 and 3 are switchable presets; they share the renderer and differ in dot style only.
  ref1: { ...REF2, superN: 2.8, ringiness: 0.05, gridShare: 0.3, tintMid: [0.87, 1.0, 1.0], tintHalo: [0.78, 1.0, 0.96], eyeRow: 0 },
  ref3: { ...REF2, gridDiv: 64, ringiness: 0.12, gridShare: 0.3, filamentShare: 0.1, tintMid: [0.97, 0.99, 1.0], eyeRow: 0, streaks: 1, parallaxBend: 0.9 },
};

export function resolveLook(preset: string | undefined, overrides?: Partial<LookParams>): LookParams {
  const base = PRESETS[preset || 'ref2'] || REF2;
  return { ...base, ...(overrides || {}) } as LookParams;
}
