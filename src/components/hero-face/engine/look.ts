// Look parameters for the particle face (PLAN.md §4). All lengths are in W (face width = 2 x IPD)
// unless the name says p (grid pitch) or px. The 'ref2' preset is the master look (10.webp).

export type Vec3 = [number, number, number];

/** Fitted light map (object space, W, y up): multiplies the lit luminance; row-major, row 0 = y0. */
export interface SculptMap {
  rect: [number, number, number, number]; // x0, y0, x1, y1
  nx: number;
  ny: number;
  data: number[];
}

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
  lipFloor: number; // lip vermilion albedo multiplier
  lipSeam: [number, number, number]; // closed-mouth seam shadow: half-height (W), half-width (W), depth
  convexity: number; // lit *= 1 + convexity * curv (baked sculpt term)
  sculptBase: number; // art-directed sculpt map: multiplier between highlight zones
  sculpt: [number, number, number, number, number][]; // [x, y, rx, ry, gain] object space (W, y up), max 10
  sculptMap: SculptMap | null; // fitted cell-scale light map (x the blobs), see scripts/hero-face/qa/fit-sculpt.py
  kd: number;
  ks: number; // broad skin sheen
  specExp: number;
  keyWrap: number; // wrapped diffuse: 0 = Lambert, 0.3-0.5 = soft skin terminator
  keyPow: number; // exponent on the wrapped term (> 1 tightens the falloff again)
  ks2: number; // tight glint lobe (nose ridge, forehead, lower lip)
  specExp2: number;
  socketSoft: [number, number]; // socket falloff (ellipse units): fully dark inside [0], open skin beyond [1]
  socketSquash: [number, number]; // socket ellipse squash below the eye, toward the nose (> 1 = ends sooner)
  lipGloss: [number, number]; // lower-lip gloss: gain, exponent
  lipBorder: number; // upper-lip vermilion border (Cupid's bow) brightness gain
  lipCorner: [number, number]; // mouth-corner shadow: depth, radius (W)
  lidLine: [number, number]; // upper-lid lash-line dots: gain, extra lift inside the socket
  crownMottle: number; // mottle amplitude toward the crown / hairline (face uses mottleAmp)
  highlightKnee: number; // lit level above which highlights compress softly (0 = off)
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
  rimLod: number; // mip of the half-res silhouette mask used for the rim dissolve (larger = wider rim)

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
  ringiness: number; // share of ring / arc glyphs among survivors and scatter
  ringShare: [number, number, number]; // face dots: share of ring / donut / arc / fragment glyphs at dim, mid, bright
  fragmentShare: number; // share of broken fragments among the non-disc glyphs (more in dim areas)
  ringMinR: number; // ring outer radius floor, p
  dimShrink: number; // radius factor of the dimmest dots (tiny specks)
  brightSquare: number; // superellipse n of the brightest dots (2 = round, 3 = LED-like)
  ringStroke: number; // ring stroke width, p
  edgeSoft: number; // disc edge softness, p
  irregularity: number; // blob outline wobble (0 = perfect discs)

  // ---- sprite halo + tone
  haloAmp: number;
  haloSigma: number; // p
  tailAmp: number;
  tailLen: number; // p
  haloBright: number; // extra halo for I > 1 (bright dots grow a wider glow)
  haloCap: number; // halo energy is min(I, haloCap) x halo: hot dots stay discrete (no merged bars)
  toneK: number; // output pass, per channel: t = toneMax (1 - exp(-toneK x)) of the summed HDR energy
  toneMax: number;
  outExposure: number; // HDR multiplier before the tone curve
  bloom: [number, number, number, number, number, number]; // weights of tent-filtered mips 1..6
  bloomThreshold: number; // HDR level above which energy blooms (soft knee)
  bloomKnee: number;
  bloomTint: Vec3;
  tintMid: Vec3;
  tintPeak: Vec3;
  tintHalo: Vec3;
  dither: number; // +- LSB
  debugScale: number; // t0 / t1 debug views: value multiplier

  // ---- skin haze (inter-dot floor: the lit face under the dots, blurred and clouded)
  hazeAmp: number;
  hazeGamma: number; // > 1: only the hot areas carry a visible floor
  hazeFacing: [number, number]; // N.V range over which the haze fades toward the silhouette (no outline)
  hazeLod: number; // mip of the half-res ghost target (2 = 4x4 half-res px)
  hazeCloud: number; // 0 = smooth, 1 = fully clouded
  hazeScale: number; // cloud frequency, 1/W
  hazeGlow: number; // share of the wide glow (haze lod + 2) in the floor

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
  hotBright: [number, number]; // hot survivor / scatter intensity range (HDR)
  survivorSize: [number, number]; // glyph radius base (p): normal, hot
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

  // ---- seamless face -> particle field (ref 2 periphery: no boundary between the face and the scatter).
  // tau = 0 in the face core (the approved dots, untouched) and rises to 1 through the dissolve band and
  // beyond the silhouette. Lattice cells convert with probability tau into 'field' particles whose
  // occupancy, brightness, size, glyph and position blend from the face dot to the free-field statistics.
  // seam = 0 switches everything off (the approved v001 frame, byte-identical).
  seam: number; // master amount (0 off, 1 on)
  seamCore: [number, number]; // silhouette-mask level (mean of mips 4 + 5) below which the face core ends / is untouched above
  seamLit: [number, number]; // wide lit-skin level (mean of mips 5 + 6): dark / fading skin below [0] dissolves, lit face above [1] stays
  seamFeature: [number, number, number]; // protected feature ellipse (eyes, nose, mouth, cheeks): rx, ry, centre v (W, v down)
  seamNoise: [number, number]; // boundary noise: amplitude (mask units), frequency (1/W)
  seamPromote: number; // invisible face cells (dark flanks, dissolved dots) convert at tau x seamPromote
  seamNear: [number, number, number, number]; // near-field density at the face, wide-mask level of full density, falloff exponent, lit share
  seamJitter: number; // p: positional jitter of field particles at the face edge (x tau x near)
  seamSize: number; // radius variation of field particles (x tau)
  seamBright: [number, number, number]; // near-field statistics share (face transfer on the nearby lit level), per-dot log spread, hot-share boost near the face
  seamMist: [number, number, number, number]; // inter-dot floor around the face edge: amp, cloud, lit share, wide-mask level of full strength
  seamScatter: number; // free 3D scatter: near-field density boost (x the lattice near field)
  seamDebug: number; // 1 tau, 2 near field, 3 field density (lattice debug dots); 0 off

  // ---- a3 'volume': head / hair volume (nested lit shells around the skull, drawn into a lattice-res
  // target the lattice samples like the lit face) + face edge lift + band material blend. vol = 0: off.
  vol: number; // master (0 off = approved path, byte-identical)
  hairLayers: number[]; // shell offsets (W) outside the skull
  hairLayerDensity: number[]; // opacity per shell
  volFlare: number; // hair curtain radius growth per W downward
  volBottom: number; // hair curtain bottom y (W, up positive)
  volOpenE: [number, number]; // face opening (frontal ellipse e): no hair inside [0], full beyond [1]
  volCurtainOpen: [number, number, number]; // curtain front gap half-angle (deg): eye line, jaw, below the chin
  hairLight: [number, number, number, number]; // kd, wrap, wrap pow, ambient
  hairSheen: [number, number]; // broad sheen ks, exponent
  hairTone: [number, number]; // exposure, contrast (L = pow(lit x exposure, contrast), as the face)
  hairStrand: [number, number]; // strand noise frequency across, along (1/W)
  hairClump: [number, number]; // clump noise frequency (1/W), density amplitude
  hairDens: [number, number, number, number]; // density gain, N.V of full density, outer-layer darkening, strand contrast
  hairMottle: [number, number, number, number]; // lit mottle amp, freq (1/W), opening-edge noise amp, facing floor
  hairCrown: [number, number, number]; // y (W) above which the hair brightens, gain, side darkening
  volDot: [number, number, number, number]; // rho -> hair-dot probability gain, rho of full envelope suppression, fade width, brightness gain
  volStat: [number, number, number, number]; // hot share, jitter (p), log brightness sigma, size variation
  volGlyph: [number, number]; // extra ring share, dim-dot alpha floor (x alphaLo)
  volHaze: [number, number, number, number]; // inter-dot floor from the volume: amp, gamma, lod (TV mips), cloud
  volBand: [number, number, number, number]; // face edge material blend: amount, e0, e1 (screen e), dropout
  volBandSigma: number; // log brightness sigma of face dots in the band (x amount)
  edgeLift: [number, number, number, number]; // face edge lift: amount, e0, e1 (object e), N.V below which it acts
  edgeLevel: [number, number]; // lifted lit floor, grazing-dissolve reduction (keep)
  volCurtainFade: [number, number]; // hair curtain density: full above y [0], zero below y [1] (W, head space, up +); off when [0] <= [1]
  volHazeKnee: [number, number]; // volume haze: lit level (sum L rho) above [0] compresses softly toward [1] (crown pole glow); off when [0] >= 1e3
  volReuse: [number, number]; // volume pass reuse: redraw once the head moved [0] volume texels, and at least every ([1] + 1)-th frame while it moves ([0] = 0: every frame)

  // ---- dot life: every change in a dot's presence fades in time instead of popping. Each dot keeps a presence
  // state on the GPU that moves toward this frame's on/off decision at 1 / (its fade time) per second and shows
  // through the fade curve; hair-dot weights move at the same rate. At rest the state equals the decision, so a
  // still is unchanged. Hooks for the cinematic pass (bloom, blur / depth of field, dots fading in and out).
  dotFade: number; // 0 = off (instant decisions: the approved-v001 path), 1 = on
  dotFadeTime: [number, number]; // per-dot fade duration range (s): each dot draws its own time in [lo, hi]
  dotFadeCurve: number; // 0 = linear ramp, 1 = smoothstep ease in / out
  scatterEyeClear: [number, number, number]; // free scatter fades out inside the eye openings: ellipse rx, ry (W) around each projected pupil, outer edge (x ellipse); off when rx = 0

  // ---- wide cards: the canvas is wider than the ref-2 frame (lg cards up to ~1.7 : 1), so the face and its
  // near field (hair, curtains, seam) stay as framed and the FAR field (envelope survivors, free scatter, eye-level
  // row) stretches laterally beyond the knee until each canvas side edge lands where ref 2's frame edge is: the
  // side thirds carry the owner-picked field instead of stars on black. No effect on canvases no wider than ref 2.
  fieldStretch: [number, number, number, number]; // amount (0 = off, 1 = side edges map onto ref 2's), knee |u| (W) where the stretch starts, max stretch, viewer-right balance: on cards much wider than ref 2 the right far field takes on the viewer-left profile (ramping in with the width; 0 = ref 2's sparse right side)
}

export const REF2: LookParams = {
  fovDeg: 20,
  gridDiv: 59,
  minPitchDevPx: 7,
  snapPitch: true,
  pitchWarp: 0.12,
  gridPhase: [0, 0],

  // beauty key: a large soft box high above the camera (mesh baked with --light -0.12,0.72,0.68 --cone 18)
  lightDir: [-0.12, 0.72, 0.68],
  fillDir: [0.0, 0.1, 1.0],
  kdFill: 0.16,
  fillRight: 0.0,
  fillShadow: 0.3,
  lipFloor: 0.82,
  lipSeam: [0.012, 0.19, 0.8],
  convexity: 0.2,
  sculptBase: 1.0,
  sculpt: [
    [0, 0.47, 0.17, 0.13, 0], // forehead highlight (ref: -0.47 W, r 0.15)
    [-0.285, -0.175, 0.1, 0.09, 0], // cheekbone, viewer-left
    [0.285, -0.175, 0.1, 0.09, 0], // cheekbone, viewer-right
    [0, -0.13, 0.035, 0.17, 0], // nose ridge
    [-0.24, 0.16, 0.1, 0.045, 0], // brow L
    [0.24, 0.16, 0.1, 0.045, 0], // brow R
    [0, -0.25, 0.045, 0.04, 0], // nose tip
    [-0.02, -0.73, 0.1, 0.06, 0], // chin highlight
    [-0.02, -0.585, 0.1, 0.025, 0], // lower-lip cluster
    [0, 0, 0.01, 0.01, 0],
  ],
  sculptMap: null,
  kd: 0.85,
  ks: 0.18,
  specExp: 10,
  keyWrap: 0.35,
  keyPow: 1.5,
  ks2: 0.35,
  specExp2: 55,
  ambTop: 0.02,
  ambBottom: 0.005,
  aoStrength: 0.7,
  contrast: 1.4,
  exposure: 1.0,
  mottleAmp: 0.06,
  mottleScale: 6.5,
  crownMottle: 0.22,
  highlightKnee: 0.9,
  lacrimalGain: 2.0,
  facingPow: 0.9,
  socket: [0.19, 0.12, 0.12, 0.012],
  socketSoft: [0.45, 1.25],
  socketSquash: [1.7, 1.25],
  lipGloss: [0.5, 30],
  lipBorder: 0.5,
  lipCorner: [0.5, 0.025],
  lidLine: [0.12, 1.0],
  sideFade: [0.55, 0.75],
  crownFade: [0.55, 0.9],
  neckFade: [-0.98, -0.84],
  keepFacing: [0.0, 0.3],
  keepPow: 0.8,
  rimLod: 3.0,

  alphaLo: 0.05,
  alphaHi: 0.12,
  gain: 2.0,
  gamma: 1.1,
  rBase: 0.15,
  rMid: 0.08,
  rTop: 0.12,
  rMax: 0.38,
  jitterSize: 0.08,
  jitterBright: 0.25,
  superN: 2.2,
  ringiness: 0.5,
  ringShare: [0.3, 0.32, 0.08],
  fragmentShare: 0.25,
  ringMinR: 0.17,
  dimShrink: 0.55,
  brightSquare: 2.6,
  ringStroke: 0.13,
  edgeSoft: 0.07,
  irregularity: 1.0,

  haloAmp: 0.16,
  haloSigma: 0.28,
  tailAmp: 0.04,
  tailLen: 0.5,
  haloBright: 0.05,
  haloCap: 1.1,
  toneK: 1.15,
  toneMax: 0.88,
  outExposure: 1.0,
  bloom: [0, 0, 0, 0, 0, 0],
  bloomThreshold: 0.4,
  bloomKnee: 0.3,
  bloomTint: [0.85, 1.0, 0.98],
  tintMid: [0.91, 0.99, 1.0],
  tintPeak: [0.98, 1.0, 1.0],
  tintHalo: [0.85, 1.0, 0.98],
  dither: 0.5,
  debugScale: 1,

  hazeAmp: 0.0,
  hazeGamma: 1.3,
  hazeFacing: [0.15, 0.6],
  hazeLod: 2.0,
  hazeCloud: 0.7,
  hazeScale: 7.0,
  hazeGlow: 0.35,

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
  hotBright: [2.0, 3.6],
  survivorSize: [0.15, 0.24],
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

  seam: 0,
  seamCore: [0.7, 0.97],
  seamLit: [0.15, 0.55],
  seamFeature: [0.44, 0.62, 0.2],
  seamNoise: [0.0, 5.0],
  seamPromote: 1,
  seamNear: [0, 0.5, 1, 0],
  seamJitter: 0,
  seamSize: 0,
  seamBright: [0, 0.6, 0],
  seamMist: [0, 0, 0, 0.5],
  seamScatter: 0,
  seamDebug: 0,
  vol: 0,
  hairLayers: [0.03, 0.08, 0.14, 0.21],
  hairLayerDensity: [0.42, 0.3, 0.18, 0.1],
  volFlare: 0.1,
  volBottom: -1.45,
  volOpenE: [0.88, 1.02],
  volCurtainOpen: [36, 60, 76],
  hairLight: [0.6, 0.6, 1.4, 0.03],
  hairSheen: [0.4, 12],
  hairTone: [1.4, 1.35],
  hairStrand: [60, 5],
  hairClump: [6, 0.6],
  hairDens: [1, 0.35, 0.3, 0.6],
  hairMottle: [0.3, 5, 0.4, 0.5],
  hairCrown: [0.45, 0.4, 0.2],
  volDot: [1.1, 0.8, 0.06, 1],
  volStat: [0.1, 0.06, 0.5, 0.2],
  volGlyph: [0.1, 0.5],
  volHaze: [0, 1.3, 2, 0.7],
  volBand: [0, 0.62, 0.95, 0.06],
  volBandSigma: 0.35,
  edgeLift: [0, 0.66, 0.95, 0.55],
  edgeLevel: [0.12, 0.6],
  volCurtainFade: [0, 0],
  volHazeKnee: [1e9, 1e9],
  volReuse: [0, 0],
  dotFade: 0,
  dotFadeTime: [0.25, 0.8],
  dotFadeCurve: 1,
  scatterEyeClear: [0, 0.075, 1.4],
  fieldStretch: [0, 0.75, 4, 0],
};

/**
 * 'approved-v001': the owner-approved frame, frozen (scratchpad hero-face/APPROVED-baseline-f5b-v001.png,
 * captures/f5b-v001.png, rendered 2026-09-24 20:21: face #5 "Youthful round", identity r6fem2s4 from
 * identity/top6.json with its ORIGINAL weights, lab mesh 'f5s' = that identity re-baked with
 * --light -0.12,0.72,0.68 --cone 18, no rest expression, no f5-fit / f5-rest).
 * = REF2 as it was at that render + the 'lit3' lighting overrides, written out in full so later REF2 edits
 * cannot drift it. hazeGlow = 0 restores the single-scale haze floor of that engine (the two-scale haze
 * mix(lod, lod + 2, hazeGlow) landed at 20:24, after the approval; at 0 the output is byte-identical).
 * Kept by the owner: dotted (not solid) nose bridge, soft cheek gradients, natural soft eyes with
 * catchlights, lip shape with the upper-lip highlight, overall tonality.
 * RULE: a new LookParams field must be added here with the value that reproduces this frame (normally
 * its off / neutral value), then re-run the regression render below and expect "identical": true.
 *   a2/render-a2.sh a2/baseline.png "mesh=f5s&frame=ref2&preset=approved-v001"   (scratchpad hero-face)
 *   node scripts/hero-face/qa/imgdiff.mjs <hero-face>/APPROVED-baseline-f5b-v001.png <hero-face>/a2/baseline.png
 */
export const APPROVED_V001: LookParams = {
  fovDeg: 20,
  gridDiv: 59,
  minPitchDevPx: 7,
  snapPitch: true,
  pitchWarp: 0.12,
  gridPhase: [0, 0],

  // beauty key: a large soft box high above the camera (mesh baked with --light -0.12,0.72,0.68 --cone 18)
  lightDir: [-0.12, 0.72, 0.68],
  fillDir: [0.0, 0.1, 1.0],
  kdFill: 0.1, // approved (REF2: 0.16)
  fillRight: 0.0,
  fillShadow: 0.3,
  lipFloor: 0.82,
  lipSeam: [0.012, 0.19, 0.8],
  convexity: 0.2,
  sculptBase: 1.0,
  sculpt: [
    [0, 0.47, 0.17, 0.13, 0], // forehead highlight (ref: -0.47 W, r 0.15)
    [-0.285, -0.175, 0.1, 0.09, 0], // cheekbone, viewer-left
    [0.285, -0.175, 0.1, 0.09, 0], // cheekbone, viewer-right
    [0, -0.13, 0.035, 0.17, 0], // nose ridge
    [-0.24, 0.16, 0.1, 0.045, 0], // brow L
    [0.24, 0.16, 0.1, 0.045, 0], // brow R
    [0, -0.25, 0.045, 0.04, 0], // nose tip
    [-0.02, -0.73, 0.1, 0.06, 0], // chin highlight
    [-0.02, -0.585, 0.1, 0.025, 0], // lower-lip cluster
    [0, 0, 0.01, 0.01, 0],
  ],
  sculptMap: null,
  kd: 0.4, // approved (REF2: 0.85)
  ks: 1.2, // approved (REF2: 0.18)
  specExp: 32, // approved (REF2: 10)
  keyWrap: 0.5, // approved (REF2: 0.35)
  keyPow: 1.6, // approved (REF2: 1.5)
  ks2: 0.6, // approved (REF2: 0.35)
  specExp2: 90, // approved (REF2: 55)
  ambTop: 0.02,
  ambBottom: 0.005,
  aoStrength: 0.7,
  contrast: 1.35, // approved (REF2: 1.4)
  exposure: 1.4, // approved (REF2: 1.0)
  mottleAmp: 0.06,
  mottleScale: 6.5,
  crownMottle: 0.22,
  highlightKnee: 0.9,
  lacrimalGain: 2.0,
  facingPow: 1.4, // approved (REF2: 0.9)
  socket: [0.21, 0.13, 0.08, 0.012], // approved (REF2: [0.19, 0.12, 0.12, 0.012])
  socketSoft: [0.55, 1.3], // approved (REF2: [0.45, 1.25])
  socketSquash: [1.7, 1.25],
  lipGloss: [0.5, 30],
  lipBorder: 0.5,
  lipCorner: [0.5, 0.025],
  lidLine: [0.12, 1.0],
  sideFade: [0.55, 0.75],
  crownFade: [0.55, 0.9],
  neckFade: [-0.98, -0.84],
  keepFacing: [0.0, 0.3],
  keepPow: 0.8,
  rimLod: 3.0,

  alphaLo: 0.05,
  alphaHi: 0.12,
  gain: 2.0,
  gamma: 1.1,
  rBase: 0.15,
  rMid: 0.08,
  rTop: 0.12,
  rMax: 0.38,
  jitterSize: 0.08,
  jitterBright: 0.25,
  superN: 2.2,
  ringiness: 0.5,
  ringShare: [0.3, 0.32, 0.08],
  fragmentShare: 0.25,
  ringMinR: 0.17,
  dimShrink: 0.55,
  brightSquare: 2.6,
  ringStroke: 0.13,
  edgeSoft: 0.07,
  irregularity: 1.0,

  haloAmp: 0.16,
  haloSigma: 0.28,
  tailAmp: 0.04,
  tailLen: 0.5,
  haloBright: 0.05,
  haloCap: 1.1,
  toneK: 1.15,
  toneMax: 0.88,
  outExposure: 1.0,
  bloom: [0, 0, 0, 0, 0, 0],
  bloomThreshold: 0.4,
  bloomKnee: 0.3,
  bloomTint: [0.85, 1.0, 0.98],
  tintMid: [0.91, 0.99, 1.0],
  tintPeak: [0.98, 1.0, 1.0],
  tintHalo: [0.85, 1.0, 0.98],
  dither: 0.5,
  debugScale: 1,

  hazeAmp: 0.18, // approved (REF2: 0.0)
  hazeGamma: 1.5, // approved (REF2: 1.3)
  hazeFacing: [0.15, 0.6],
  hazeLod: 2.0,
  hazeCloud: 0.7,
  hazeScale: 7.0,
  hazeGlow: 0, // approved: single-scale haze (field added after the approval; REF2: 0.35)

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
  strayIn: 0.04, // approved (REF2: 0.12)
  gridShare: 0.9,
  sideDensity: [0.6, 0.35],
  survivorBright: [0.3, 1.5],
  hotBright: [2.0, 3.6],
  survivorSize: [0.15, 0.24],
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

  seam: 0,
  seamCore: [0.7, 0.97],
  seamLit: [0.15, 0.55],
  seamFeature: [0.44, 0.62, 0.2],
  seamNoise: [0.0, 5.0],
  seamPromote: 1,
  seamNear: [0, 0.5, 1, 0],
  seamJitter: 0,
  seamSize: 0,
  seamBright: [0, 0.6, 0],
  seamMist: [0, 0, 0, 0.5],
  seamScatter: 0,
  seamDebug: 0,
  vol: 0,
  hairLayers: [0.03, 0.08, 0.14, 0.21],
  hairLayerDensity: [0.42, 0.3, 0.18, 0.1],
  volFlare: 0.1,
  volBottom: -1.45,
  volOpenE: [0.88, 1.02],
  volCurtainOpen: [36, 60, 76],
  hairLight: [0.6, 0.6, 1.4, 0.03],
  hairSheen: [0.4, 12],
  hairTone: [1.4, 1.35],
  hairStrand: [60, 5],
  hairClump: [6, 0.6],
  hairDens: [1, 0.35, 0.3, 0.6],
  hairMottle: [0.3, 5, 0.4, 0.5],
  hairCrown: [0.45, 0.4, 0.2],
  volDot: [1.1, 0.8, 0.06, 1],
  volStat: [0.1, 0.06, 0.5, 0.2],
  volGlyph: [0.1, 0.5],
  volHaze: [0, 1.3, 2, 0.7],
  volBand: [0, 0.62, 0.95, 0.06],
  volBandSigma: 0.35,
  edgeLift: [0, 0.66, 0.95, 0.55],
  edgeLevel: [0.12, 0.6],
  volCurtainFade: [0, 0],
  volHazeKnee: [1e9, 1e9],
  volReuse: [0, 0],
  dotFade: 0,
  dotFadeTime: [0.25, 0.8],
  dotFadeCurve: 1,
  scatterEyeClear: [0, 0.075, 1.4],
  fieldStretch: [0, 0.75, 4, 0],
};

/**
 * 'approved-v002' (owner pick, 'head + hair volume' v1; lab alias 'a3-volume'): approved-v001 + the
 * head/hair volume, so the whole canvas reads as one particle object (ref 2). The face core (e < 0.6)
 * is the approved face; only the periphery (edge band, crown, temples, sides, hair) and the haze change.
 * Reproduces scratchpad/hero-face/a3/OWNER-PICK-volume-v1/v1.png (ref-2 framing) exactly with the a4
 * fix-r1 additions off (volHazeKnee [1e9, 1e9], scatterEyeClear rx 0); with them on, only the crown pole
 * haze (two glow lobes at the top edge) and the stray scatter sparkles inside the eye openings change.
 * a4 fix-r1: dot life (fades instead of pops; a still at rest is unchanged), curtain ends fade below the
 * ref-2 frame, the volume pass is reused while the head is (nearly) still.
 */
export const APPROVED_V002: LookParams = {
  ...APPROVED_V001,
  vol: 1,
  hairLayers: [0.02, 0.06, 0.11, 0.17, 0.25, 0.34],
  hairLayerDensity: [0.34, 0.26, 0.18, 0.12, 0.07, 0.04],
  hairClump: [6, 0.7],
  volStat: [0.12, 0.06, 0.65, 0.22],
  volHaze: [0.2, 1.3, 2, 0.7],
  volBand: [1, 0.62, 0.95, 0.06],
  edgeLift: [1, 0.62, 0.92, 0.6],
  edgeLevel: [0.32, 0.7],
  // a4 fix-r1 (see above; knee [1e9, 1e9] + eye clear rx 0 = the owner-pick still, byte for byte)
  volCurtainFade: [-1.3, -1.45],
  volHazeKnee: [0.9, 1.25],
  volReuse: [0.25, 1],
  dotFade: 1,
  scatterEyeClear: [0.14, 0.075, 1.4],
  // a4 fix-r2: wide (lg) cards carry the field to their side edges (no effect in the ref-2 frame or on portrait cards)
  fieldStretch: [1, 0.75, 4, 1],
};

export const PRESETS: Record<string, LookParams> = {
  ref2: REF2,
  'approved-v001': APPROVED_V001,
  'approved-v002': APPROVED_V002,
  'a3-volume': APPROVED_V002,
  // Refs 1 and 3 are switchable presets; they share the renderer and differ in dot style only.
  ref1: { ...REF2, superN: 2.8, ringiness: 0.05, gridShare: 0.3, tintMid: [0.87, 1.0, 1.0], tintHalo: [0.78, 1.0, 0.96], eyeRow: 0 },
  ref3: { ...REF2, gridDiv: 64, ringiness: 0.12, gridShare: 0.3, filamentShare: 0.1, tintMid: [0.97, 0.99, 1.0], eyeRow: 0, streaks: 1, parallaxBend: 0.9 },
};

export function resolveLook(preset: string | undefined, overrides?: Partial<LookParams>): LookParams {
  const base = PRESETS[preset || 'ref2'] || REF2;
  return { ...base, ...(overrides || {}) } as LookParams;
}
