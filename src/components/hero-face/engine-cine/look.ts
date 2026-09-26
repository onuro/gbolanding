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
  // ---- a5 study-dots PROTOTYPE (non-uniform dots). All off = the v002 path.
  dotSoft: number; // 0 = flat superellipse disc (v002), 1 = generalized-Gaussian point (half-max radius = r)
  dotBeta: number; // profile exponent (2 = Gaussian)
  dotCap: number; // per-dot HDR soft cap (v002: 3.2)
  dotHot: [number, number, number]; // top-end expansion: I *= 1 + [2] smoothstep([0], [1], L)
  dotLogSigma: [number, number]; // per-dot log-normal brightness spread: face core, face edge / band
  dotSizeFromBright: number; // share of the log spread also applied to the radius (ln r += k ln I)
  faceJitter: [number, number]; // per-axis Gaussian jitter of face dots (p): core, face edge (0 = v002 +-0.03 p)
  dust: [number, number, number, number]; // off-lattice specks: per cell, gain, r min, r max (p)
  streakShare: number; // share of bright face dots drawn as short horizontal streaks
  streakLen: number; // streak half-length (p)
  irrTail: number; // outline wobble distribution exponent (0 = v002)
  starHot?: number; // a5: brightness multiplier of the saturated star class only (0 / absent = v002)

  // ---- a5 cinematic layer (study prototype; cine = 0: off, the approved-v002 path)
  cine: number; // master (0 off)
  bloomSrc: [number, number, number, number]; // per-fragment bright pass into HDR alpha (before the mips): threshold (HDR), knee, hair-dot weight, scatter / survivor weight
  bloomSrc2: [number, number, number]; // star weight, catchlight weight, face-dot weight
  dodge: number; // colour dodge: x /= 1 - clamp(dodge * bloom, 0, 0.8)
  gradeHi: Vec3; // display multiplier blended in from mid-tones to highlights
  vignette: [number, number, number]; // amount, inner radius (0 centre .. 1 corner), exponent
  grain: [number, number]; // amount (x sqrt(level)), refresh rate (Hz)
  breath: [number, number, number, number]; // bloom amplitude, exposure amplitude, frequency (Hz), phase (rad)
  voiceGlow: [number, number, number, number]; // bloom gain / level, exposure / level, attack (s), release (s)
  glint: [number, number, number, number]; // mean events per 10 s, e-fold length (W), amplitude (x star), lifetime (s)
  starParallax: [number, number]; // star screen motion vs the head: far, near (1 = pinned to the head as before)
  starTwinkle: [number, number, number]; // amplitude, frequency lo, hi (Hz)
  fieldDrift: [number, number, number]; // free-scatter drift amplitude (W), period lo, hi (s)
  fieldLife: [number, number, number, number]; // share of scatter / stars that fade out and back, cycle lo, hi (s), fade (s)
  depthSize: [number, number, number]; // scatter depth cue: near (z > 0.1 W) size gain, near softness (p), far (z < -0.35) dim factor

  // ---- a5 harmony: the whole scene is one living particle system (harmony = 0 / absent: off, the approved path).
  // A shared slow curl flow moves every particle (field, hair, scatter, stars clearly; face dots sub-cell, never on
  // the eyes / mouth), coherent dot-size waves breathe through field and face together, the face's own motion
  // (mouth while talking, blinks, smiles / brows) sends soft ripples into the field, and the free scatter follows the
  // head with a soft lag. Everything is derived inside the engine from the pose / morphs it already receives.
  harmony?: number; // master (0 / absent off)
  // live color dodge (absent = static): light-play amount (+-), speech gain, spatial frequency (cycles per card height), tempo
  dodgeLive?: [number, number, number, number];
  // 1: head rotation moves the dots with the skin (lattice laid out on the unrotated head), a real 3D turn
  rigidFlow?: number;
  // portrait luminance projected onto the rest face (object xy): the dots take a real face's brightness
  // affine: explicit uv map; or px: the portrait's pupils (viewer-left, viewer-right) and mouth centre in image px + its size,
  // fitted per mesh to its landmarks (pupils, mouth centre) so any head can carry the same portrait
  portrait?: { url: string; affine?: [number, number, number, number]; px?: { eyeL: [number, number]; eyeR: [number, number]; mouth: [number, number]; size: [number, number] }; mix: number; gain: number; gamma: number; ellipse?: [number, number, number, number] };
  // face protection for the cinematic layer: dodge share, bloom share inside the face ellipse (absent = 1, 1)
  faceCine?: [number, number];
  // speaking lips (absent = off): upper-lip light at rest, upper-lip light added at full opening, lower-lip light
  // added at full opening, teeth ghost (default 0.06), mouth-socket ghost (default 0.004)
  lipTalk?: [number, number, number, number, number] | [number, number, number, number, number, number, number]; // + seal lip light, seal seam lift (0..1)
  // the mouth interior (teeth / cavity ghost) as dots on the lattice pitch: dot gain, dot sigma (pitch units), smooth floor share
  mouthDots?: [number, number, number];
  /** speaking lips: brightness floor of the pouted upper lip (0..1 per unit of pout), so the everted lip reads as one lip, not two lit rows with a dark seam */
  poutFill?: number;
  /** speaking lips: share of the lip-seam shadow restored on the inner lips as the mouth opens (0..1), so an open mouth reads darker inside while a closure still reads as two lips pressed together */
  mouthInnerDim?: number;
  /** speaking lips: the speaking light fades from the lips' middle to the corners over this share of the corner distance
   * (start, end); absent = even to the corners */
  lipTalkShape?: [number, number];
  /** field particles thin out and dim toward the card's edges: band width (share of the card's short side), density
   * left at the edge (0..1), brightness left at the edge (0..1), noise on the band's inner edge (0 = a clean line) */
  edgeFade?: [number, number, number, number];
  /** the edge fade's shape: 0 = a band along the card's edges, 1 = radial (an ellipse on the card, the corners fade most) */
  edgeFadeShape?: number;
  /** ears fade out (a head-space ellipsoid around each ear, so they never show as she turns): centre x (|x|), y, z,
   * radius x, y, z (W), fade from ellipse radius e0 (gone) to e1 (kept) */
  earMask?: [number, number, number, number, number, number, number, number];
  /** the neck behind and below the jaw fades out: y from y0 (kept) to y1 (faded), times z from z0 (kept) to z1 (faded) */
  neckMask?: [number, number, number, number];
  /** darkstar HUD look (Top Gun: Maverick's Darkstar screens): amber accent colour (linear), heat rim on the face's
   * outline, speech heat (rings + field while she talks), share of amber sparks in the field, unlit LED cell level */
  hudAmber?: Vec3;
  /** the dot core tint goes from tintMid (dim) to tintPeak (bright) over this HDR range; absent = tintMid for all */
  tintRamp?: [number, number];
  /** the smooth face shading (ghost / mist) tint; absent = tintHalo */
  tintMist?: Vec3;
  /** darkstar: the corona / field's own core tint and halo tint (the face keeps tintMid / tintHalo); absent = off */
  tintField?: Vec3;
  tintFieldHalo?: Vec3;
  /** darkstar: how far each corona particle strays from tintField toward mint / white (0 = all the same green) */
  tintFieldVar?: number;
  /** a human iris texture instead of a flat disc: amount (0 = off), fibre contrast, limbal ring darkening, brightness */
  irisDetail?: [number, number, number, number];
  /** the eye zones read the ghost sharper: radius around each pupil (W), ghost mip there (absent = the ghostLod blur) */
  eyeSharp?: [number, number];
  hudRim?: number;
  hudVoice?: number;
  hudSparks?: number;
  hudOffDot?: number;
  /** a vignette after the tone curve (same radius / exponent as vignette): the pre-tone one barely touches bright dots */
  vignettePost?: number;
  /** the intro (engine.playIntro()): she assembles out of the dark from a spark between her eyes, the nose ridge first,
   *  then a ragged front outward, the corona last. Length (s), ragged front (s), bright-first lead (s: the dimmest dots
   *  arrive this much after the brightest), the front's flash (x brightness); absent = no intro */
  intro?: [number, number, number, number];
  /** intro shape: corona delay (s), smooth-shading lag behind the dots (s), front block size (lattice pitches), spark */
  introShape?: [number, number, number, number];
  harmFlow?: [number, number, number, number]; // shared curl flow: field amplitude (W), face amplitude (p), spatial frequency (1/W), tempo (1 = base)
  harmSize?: [number, number, number, number]; // dot-size breathing waves: field amplitude, face amplitude, brightness share, spatial frequency (1/W)
  harmWave?: [number, number, number, number]; // face-activity ripples: displacement (W), speed (W/s), ring width (W), decay (s)
  harmLag?: [number, number, number]; // sympathetic lag: far-scatter share, spring time (s), star share
  harmVoice?: [number, number, number]; // speech energy: field brightness gain, wave swell gain, release (s)
  harmRippleLight?: [number, number]; // ripple size gain, ripple brightness gain (default 0.25, 0.3)
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
  dotSoft: 0, dotBeta: 2.3, dotCap: 3.2, dotHot: [0.5, 1.1, 0], dotLogSigma: [0, 0], dotSizeFromBright: 0, faceJitter: [0, 0], dust: [0, 0, 0.05, 0.09], streakShare: 0, streakLen: 0.8, irrTail: 0,
  cine: 0,
  bloomSrc: [1.0, 0.5, 0.3, 0.8],
  bloomSrc2: [1.0, 0.4, 1.0],
  dodge: 0,
  gradeHi: [1, 1, 1],
  vignette: [0, 0.55, 1.6],
  grain: [0, 24],
  breath: [0, 0, 0.22, 0],
  voiceGlow: [0, 0, 0.06, 0.25],
  glint: [0, 0.19, 0.5, 2.5],
  starParallax: [1, 1],
  starTwinkle: [0, 0.15, 0.6],
  fieldDrift: [0, 9, 20],
  fieldLife: [0, 8, 16, 1.6],
  depthSize: [0, 0, 1],
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
  dotSoft: 0, dotBeta: 2.3, dotCap: 3.2, dotHot: [0.5, 1.1, 0], dotLogSigma: [0, 0], dotSizeFromBright: 0, faceJitter: [0, 0], dust: [0, 0, 0.05, 0.09], streakShare: 0, streakLen: 0.8, irrTail: 0,
  cine: 0,
  bloomSrc: [1.0, 0.5, 0.3, 0.8],
  bloomSrc2: [1.0, 0.4, 1.0],
  dodge: 0,
  gradeHi: [1, 1, 1],
  vignette: [0, 0.55, 1.6],
  grain: [0, 24],
  breath: [0, 0, 0.22, 0],
  voiceGlow: [0, 0, 0.06, 0.25],
  glint: [0, 0.19, 0.5, 2.5],
  starParallax: [1, 1],
  starTwinkle: [0, 0.15, 0.6],
  fieldDrift: [0, 9, 20],
  fieldLife: [0, 8, 16, 1.6],
  depthSize: [0, 0, 1],
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

export const PROTO_DOTS: LookParams = {
  ...APPROVED_V002,
  dotSoft: 1, dotBeta: 2.3, dotCap: 8, dotHot: [0.5, 1.1, 0.7], dotLogSigma: [0.55, 0.85], dotSizeFromBright: 0.3,
  faceJitter: [0.055, 0.18], haloCap: 2.5, haloBright: 0.12, dust: [0.45, 1.5, 0.045, 0.085], streakShare: 0.04, streakLen: 0.42, irrTail: 3,
  rBase: 0.11, rMid: 0.05, rTop: 0.05, rMax: 0.24, dimShrink: 0.6, irregularity: 1.5,
  ringShare: [0.14, 0.1, 0.03], fragmentShare: 0.5,
  toneMax: 1.04,
  survivorJitter: 0.3, volStat: [0.12, 0.28, 1.0, 0.3], survivorSize: [0.1, 0.17], survivorBright: [0.15, 1.6],
};


// a5 study prototype: approved-v002 + the cinematic layer (bloom from a per-fragment bright pass, colour dodge,
// cool highlight grade, white point 1.0, vignette, fine grain, breathing, voice glow, glints, star parallax /
// twinkle, field drift + life, depth cue)
export const CINE_A5: LookParams = {
  ...APPROVED_V002,
  cine: 1,
  toneMax: 1.0,
  bloom: [0.1, 0.3, 0.32, 0.26, 0.2, 0.1],
  bloomThreshold: 0,
  bloomKnee: 0.3,
  bloomTint: [0.72, 1.0, 1.1],
  tintHalo: [0.82, 1.0, 1.06],
  bloomSrc: [0.85, 0.5, 0.25, 0.7],
  bloomSrc2: [1.0, 0.3, 1.0],
  dodge: 0.25,
  gradeHi: [1, 1, 1],
  vignette: [0.55, 0.45, 1.6],
  grain: [0.012, 24],
  breath: [0.06, 0.015, 0.22, 0],
  voiceGlow: [0.4, 0.05, 0.06, 0.25],
  glint: [1.2, 0.17, 0.8, 2.6],
  starParallax: [0.15, 0.45],
  starTwinkle: [0.18, 0.12, 0.5],
  fieldDrift: [0.012, 11, 23],
  fieldLife: [0.25, 9, 17, 1.8],
  depthSize: [0.6, 0.12, 0.7],
};

// ---- a5 cinematic build (v003): approved-v002 + the dots layer (soft HDR points, per-dot spread, jitter, dust,
// streak glyphs, fewer rings) + the cinema layer (bright-pass bloom into HDR alpha, colour dodge, white point 1.0,
// cool glow tint, vignette, fine grain, breathing, voice glow, glints, star parallax / twinkle, field drift + life).
// Identity, shape, features, framing and the one-object construction are approved-v002's; only the rendering
// treatment changes. 'm' is the best match to refs 1 / 3; 's' and 'l' scale it.
export const HARMONY: Pick<LookParams, 'harmony' | 'harmFlow' | 'harmSize' | 'harmWave' | 'harmLag' | 'harmVoice'> = {
  harmony: 1,
  harmFlow: [0.013, 0.12, 2.6, 1],
  harmSize: [0.32, 0.07, 0.35, 2.2],
  harmWave: [0.018, 0.55, 0.09, 1.6],
  harmLag: [0.7, 0.55, 0.35],
  harmVoice: [0.12, 0.6, 0.6],
};
export const CINE_V003_M: LookParams = {
  ...APPROVED_V002,
  ...HARMONY,
  // dots
  dotSoft: 1, dotBeta: 2.3, dotCap: 3.6, dotHot: [0.55, 1.15, 0.3], dotLogSigma: [0.3, 0.8], dotSizeFromBright: 0.25,
  faceJitter: [0.05, 0.18], haloCap: 1.1, haloBright: 0.04, dust: [0.3, 1.5, 0.045, 0.085], streakShare: 0.04, streakLen: 0.42, irrTail: 3,
  rBase: 0.11, rMid: 0.05, rTop: 0.03, rMax: 0.23, dimShrink: 0.6, irregularity: 1.5,
  ringShare: [0.14, 0.1, 0.03], fragmentShare: 0.5,
  survivorJitter: 0.3, volStat: [0.08, 0.28, 1.0, 0.3], volDot: [1.1, 0.8, 0.06, 0.85], survivorSize: [0.1, 0.17], survivorBright: [0.15, 1.6],
  starHot: 0.72,
  // cinema
  cine: 1,
  toneMax: 1.0,
  bloom: [0.28, 0.4, 0.3, 0.25, 0.2, 0.1],
  bloomThreshold: 0,
  bloomKnee: 0.3,
  bloomTint: [0.72, 1.0, 1.1],
  tintHalo: [0.82, 1.0, 1.06],
  bloomSrc: [0.8, 0.5, 0.25, 0.7],
  bloomSrc2: [1.0, 0.3, 1.0],
  dodge: 0.35,
  gradeHi: [1, 1, 1],
  vignette: [0.55, 0.45, 1.6],
  grain: [0.012, 24],
  breath: [0.06, 0.015, 0.22, 0],
  voiceGlow: [0.4, 0.05, 0.06, 0.25],
  glint: [1.2, 0.17, 0.8, 2.6],
  starParallax: [0.15, 0.45],
  starTwinkle: [0.18, 0.12, 0.5],
  fieldDrift: [0, 11, 23], // harmony: the shared coherent flow replaces the per-particle drift
  fieldLife: [0.25, 9, 17, 1.8],
  depthSize: [0.6, 0.12, 0.7],
};
export const CINE_V003_S: LookParams = {
  ...CINE_V003_M,
  dotHot: [0.6, 1.2, 0.15], dotLogSigma: [0.2, 0.55], faceJitter: [0.035, 0.12], haloCap: 1.1, haloBright: 0.04, dotCap: 3.3,
  dust: [0.18, 1.2, 0.045, 0.08], streakShare: 0.02, irregularity: 1.25, rTop: 0.06, rMax: 0.28, starHot: 0.8,
  toneMax: 0.95,
  bloom: [0.06, 0.18, 0.2, 0.16, 0.12, 0.06],
  dodge: 0.15,
  vignette: [0.4, 0.45, 1.6],
  grain: [0.008, 24],
  breath: [0.04, 0.01, 0.22, 0],
  glint: [0.8, 0.15, 0.6, 2.6],
  starTwinkle: [0.12, 0.12, 0.5],
  fieldLife: [0.15, 9, 17, 1.8],
};
export const CINE_V003_L: LookParams = {
  ...CINE_V003_M,
  dotHot: [0.5, 1.1, 0.45], dotLogSigma: [0.4, 0.95], faceJitter: [0.06, 0.2], haloCap: 1.3, haloBright: 0.06, dotCap: 4.2,
  dust: [0.45, 1.7, 0.045, 0.09], streakShare: 0.06, starHot: 0.7,
  toneMax: 1.0,
  bloom: [0.16, 0.42, 0.42, 0.34, 0.26, 0.13],
  dodge: 0.35,
  bloomTint: [0.68, 1.0, 1.12],
  tintHalo: [0.78, 1.0, 1.08],
  vignette: [0.65, 0.42, 1.5],
  breath: [0.07, 0.018, 0.22, 0],
  glint: [1.8, 0.19, 0.9, 2.6],
  starTwinkle: [0.22, 0.12, 0.5],
  fieldLife: [0.3, 9, 17, 1.8],
};

// ---- v004: the owner rejected the harmony distortion (flow currents, ripples, lag warp the face and field) but
// liked 'm' for cinematicness and 'l' for the dodge. v004 = the cine looks with every positional harmony effect off.
const NO_WARP: Pick<LookParams, 'harmony'> = { harmony: 0 };
// only the dot-size breathing survives here (no flow, no ripple displacement, no lag), to test whether it reads well
const BREATHE_ONLY: Pick<LookParams, 'harmony' | 'harmFlow' | 'harmSize' | 'harmWave' | 'harmLag' | 'harmVoice'> = {
  harmony: 1,
  harmFlow: [0, 0, 2.6, 1],
  harmSize: [0.32, 0.07, 0.35, 2.2],
  harmWave: [0, 0.55, 0.09, 1.6],
  harmLag: [0, 0.55, 0],
  harmVoice: [0.12, 0, 0.6],
};
// the owner: the color dodge must be dynamic, not a static painting: drifting light play + a swell while she speaks
const DODGE_LIVE: Pick<LookParams, 'dodgeLive'> = { dodgeLive: [0.55, 0.6, 3.0, 0.55] };
export const CINE_V004_M: LookParams = { ...CINE_V003_M, ...NO_WARP, ...DODGE_LIVE };
export const CINE_V004_L: LookParams = { ...CINE_V003_L, ...NO_WARP, ...DODGE_LIVE };
// m's cinematic balance with l's dodge / bloom / hot highlights
export const CINE_V004_ML: LookParams = {
  ...CINE_V003_M,
  ...NO_WARP,
  ...DODGE_LIVE,
  dotHot: CINE_V003_L.dotHot, haloCap: CINE_V003_L.haloCap, haloBright: CINE_V003_L.haloBright, dotCap: CINE_V003_L.dotCap,
  bloom: CINE_V003_L.bloom, dodge: CINE_V003_L.dodge, bloomTint: CINE_V003_L.bloomTint, tintHalo: CINE_V003_L.tintHalo,
  glint: CINE_V003_L.glint,
};
export const CINE_V004_ML_BREATHE: LookParams = { ...CINE_V004_ML, ...BREATHE_ONLY };
// the owner: while she talks the field must not look like static stars, but nothing may bend or warp: the field
// answers her speech with light only: rings of brighter, slightly larger dots travelling out from the mouth,
// speech-driven brightness and size swell, gentle size breathing. Zero displacement anywhere (flow, ripple push, lag).
export const CINE_V004_ML_LIVE: LookParams = {
  ...CINE_V004_ML,
  harmony: 1,
  harmFlow: [0, 0, 2.6, 1],
  harmSize: [0.28, 0.03, 0.4, 2.2],
  harmWave: [0, 0.6, 0.12, 1.4],
  harmLag: [0, 0.55, 0],
  harmVoice: [0.35, 1.0, 0.5],
  harmRippleLight: [0.7, 1.4],
};

// ---- a5 harmony-v1: approved-v002 + the living harmony only (no look change), so the owner can judge the motion
// alone. At harmony 0 (every approved preset) the engine runs the verbatim approved shaders.
export const HARMONY_V1: LookParams = { ...APPROVED_V002, ...HARMONY };

// the owner on ml-live: "very close to what I want, but the particles outside the face (and maybe in the face too)
// are too static". More life with no warp: the free scatter and stars drift on their own slow paths (dust in light,
// not a shared current), more of them fade in and out, stars twinkle more, the field's size breathing is stronger,
// and the face's dot sizes breathe a little (no displacement on the face lattice or the hair).
export const CINE_V004_ML_LIVE2: LookParams = {
  ...CINE_V004_ML_LIVE,
  fieldDrift: [0.022, 7, 16],
  fieldLife: [0.45, 6, 12, 1.4],
  starTwinkle: [0.35, 0.15, 0.7],
  harmSize: [0.42, 0.06, 0.5, 2.2],
};

// the owner on live2: "ok good. the only thing remains ... we lost the elegant woman face" / "this looks genderless".
// The cinematic treatment hit her face as hard as the field (hot-dot patches, harder contrast, white point 1.0, tiny
// irregular dots, full dodge / bloom). v005 keeps live2's field, motion and live dodge and gives her face back.
// a: only protect the face from dodge / bloom (the dots keep the cinematic style)
export const CINE_V005_A: LookParams = { ...CINE_V004_ML_LIVE2, faceCine: [0.2, 0.35] };
// b: a + the approved face dot rendering (sizes, rings, no hot patches, no jitter, approved white point)
export const CINE_V005_B: LookParams = {
  ...CINE_V005_A,
  dotHot: APPROVED_V002.dotHot, dotCap: APPROVED_V002.dotCap, dotSizeFromBright: APPROVED_V002.dotSizeFromBright,
  faceJitter: APPROVED_V002.faceJitter, irregularity: APPROVED_V002.irregularity, irrTail: APPROVED_V002.irrTail,
  rBase: APPROVED_V002.rBase, rMid: APPROVED_V002.rMid, rTop: APPROVED_V002.rTop, rMax: APPROVED_V002.rMax,
  dimShrink: APPROVED_V002.dimShrink, ringShare: APPROVED_V002.ringShare, fragmentShare: APPROVED_V002.fragmentShare,
  toneMax: APPROVED_V002.toneMax,
};
// c: b but keeping the soft glowing dot profile and the size variety (cinematic dot feel, approved face tones)
export const CINE_V005_C: LookParams = { ...CINE_V005_B, dotSoft: CINE_V004_ML_LIVE2.dotSoft, dotLogSigma: [0.15, 0.4] };

// d: the approved face exactly (its dot style too) with the cinematic field / motion / live dodge around it
export const CINE_V005_D: LookParams = { ...CINE_V005_B, dotSoft: APPROVED_V002.dotSoft, dotLogSigma: APPROVED_V002.dotLogSigma, faceCine: [0.1, 0.2] };
// e: cinematic dot style, but no hot patches, the approved contrast / white point and stronger face protection
export const CINE_V005_E: LookParams = { ...CINE_V004_ML_LIVE2, dotHot: APPROVED_V002.dotHot, toneMax: APPROVED_V002.toneMax, faceCine: [0.05, 0.15] };

// TEST ONLY: the owner's reference 26 (1722 x 1502) as a brightness source; landmarks marked by hand
const REF26_PX = { eyeL: [578, 701] as [number, number], eyeR: [1021, 701] as [number, number], mouth: [800, 1125] as [number, number], size: [1722, 1502] as [number, number] };

export const PRESETS: Record<string, LookParams> = {
  'harmony-v1': HARMONY_V1,
  'cine-v003-s': CINE_V003_S,
  'cine-v003-m': CINE_V003_M,
  'cine-v003-l': CINE_V003_L,
  'cine-v004-m': CINE_V004_M,
  'cine-v004-l': CINE_V004_L,
  'cine-v004-ml': CINE_V004_ML,
  'cine-v004-ml-breathe': CINE_V004_ML_BREATHE,
  'cine-v004-ml-live': CINE_V004_ML_LIVE,
  'cine-v004-ml-live2': CINE_V004_ML_LIVE2,
  // owner: the upper face must form an UPWARD V (brows / lit forehead lifting toward the temples), not a downward one:
  // broad key, fill into the sockets, outer-brow + temple light zones on (90 dots)
  // the owner: more dots is not the fix; the lifted-brow lighting at the standard 59 dots
  // more lift (owner: "lift is working ... more lift needed")
  'cine-v004-ml-live2-lift2': {
    ...CINE_V004_ML_LIVE2, keyWrap: 0.7, keyPow: 1.0, ks: 0.8, kdFill: 0.35, fillShadow: 0.1,
    sculpt: [[0, 0.47, 0.17, 0.13, 0], [-0.285, -0.175, 0.1, 0.09, 0], [0.285, -0.175, 0.1, 0.09, 0], [0, -0.13, 0.035, 0.17, 0], [0, -0.25, 0.045, 0.04, 0], [-0.02, -0.73, 0.1, 0.06, 0], [-0.26, 0.18, 0.12, 0.055, 1.2], [0.26, 0.18, 0.12, 0.055, 1.2], [-0.34, 0.36, 0.15, 0.12, 0.9], [0.34, 0.36, 0.15, 0.12, 0.9]],
  },
  'cine-portrait': {
    ...CINE_V004_ML_LIVE2, keyWrap: 0.7, keyPow: 1.0, ks: 0.8, kdFill: 0.35, fillShadow: 0.1,
    sculpt: [[0, 0.47, 0.17, 0.13, 0], [-0.285, -0.175, 0.1, 0.09, 0], [0.285, -0.175, 0.1, 0.09, 0], [0, -0.13, 0.035, 0.17, 0], [0, -0.25, 0.045, 0.04, 0], [-0.02, -0.73, 0.1, 0.06, 0], [-0.26, 0.18, 0.12, 0.055, 1.2], [0.26, 0.18, 0.12, 0.055, 1.2], [-0.34, 0.36, 0.15, 0.12, 0.9], [0.34, 0.36, 0.15, 0.12, 0.9]],
    // TEST ONLY (owner's reference 26 as the brightness source; a licensed portrait replaces it before shipping)
    portrait: { url: '/dev-hero-face/portrait-ref26.png', px: REF26_PX, mix: 1, gain: 1.2, gamma: 1.0 },
  },
  'cine-v004-ml-live2-lift3': {
    ...CINE_V004_ML_LIVE2, keyWrap: 0.7, keyPow: 1.0, ks: 0.8, kdFill: 0.35, fillShadow: 0.1,
    sculpt: [[0, 0.47, 0.17, 0.13, 0], [0, -0.13, 0.035, 0.17, 0], [0, -0.25, 0.045, 0.04, 0], [-0.02, -0.73, 0.1, 0.06, 0], [-0.26, 0.18, 0.12, 0.055, 1.3], [0.26, 0.18, 0.12, 0.055, 1.3], [-0.34, 0.36, 0.15, 0.12, 1.0], [0.34, 0.36, 0.15, 0.12, 1.0], [-0.27, 0.07, 0.08, 0.035, 0.8], [0.27, 0.07, 0.08, 0.035, 0.8]],
  },
  'cine-v004-ml-live2-lift': {
    ...CINE_V004_ML_LIVE2,
    keyWrap: 0.7, keyPow: 1.0, ks: 0.8, kdFill: 0.35, fillShadow: 0.1,
    sculpt: [[0, 0.47, 0.17, 0.13, 0], [-0.285, -0.175, 0.1, 0.09, 0], [0.285, -0.175, 0.1, 0.09, 0], [0, -0.13, 0.035, 0.17, 0], [-0.24, 0.16, 0.1, 0.045, 0.55], [0.24, 0.16, 0.1, 0.045, 0.55], [0, -0.25, 0.045, 0.04, 0], [-0.02, -0.73, 0.1, 0.06, 0], [-0.3, 0.3, 0.13, 0.11, 0.45], [0.3, 0.3, 0.13, 0.11, 0.45]],
  },
  'cine-v004-ml-live2-d90-lift': {
    ...CINE_V004_ML_LIVE2, gridDiv: 90, minPitchDevPx: 3,
    keyWrap: 0.7, keyPow: 1.0, ks: 0.8, kdFill: 0.35, fillShadow: 0.1,
    sculpt: [[0, 0.47, 0.17, 0.13, 0], [-0.285, -0.175, 0.1, 0.09, 0], [0.285, -0.175, 0.1, 0.09, 0], [0, -0.13, 0.035, 0.17, 0], [-0.24, 0.16, 0.1, 0.045, 0.55], [0.24, 0.16, 0.1, 0.045, 0.55], [0, -0.25, 0.045, 0.04, 0], [-0.02, -0.73, 0.1, 0.06, 0], [-0.3, 0.3, 0.13, 0.11, 0.45], [0.3, 0.3, 0.13, 0.11, 0.45]],
  },
  // owner's new reference (fine dense dots read as an elegant woman): live2 at ~110 / ~90 dots across the face
  'cine-v004-ml-live2-d110': { ...CINE_V004_ML_LIVE2, gridDiv: 110, minPitchDevPx: 3 },
  'cine-v004-ml-live2-d90': { ...CINE_V004_ML_LIVE2, gridDiv: 90, minPitchDevPx: 3 },
  'cine-v005-a': CINE_V005_A,
  'cine-v005-b': CINE_V005_B,
  'cine-v005-c': CINE_V005_C,
  'cine-v005-d': CINE_V005_D,
  'cine-v005-e': CINE_V005_E,
  'proto-dots': PROTO_DOTS,
  'cine-a5': CINE_A5,
  'cine-a5-nobloom': { ...CINE_A5, bloom: [0, 0, 0, 0, 0, 0] },
  'cine-a5-4mip': { ...CINE_A5, bloom: [0.4, 0.4, 0.3, 0.25, 0, 0] },
  'v002-legacybloom': { ...APPROVED_V002, bloom: [0.4, 0.4, 0.3, 0.25, 0.2, 0.1], bloomThreshold: 0.25, bloomKnee: 0.25 },
  ref2: REF2,
  'approved-v001': APPROVED_V001,
  'approved-v002': APPROVED_V002,
  'a3-volume': APPROVED_V002,
  // Refs 1 and 3 are switchable presets; they share the renderer and differ in dot style only.
  ref1: { ...REF2, superN: 2.8, ringiness: 0.05, gridShare: 0.3, tintMid: [0.87, 1.0, 1.0], tintHalo: [0.78, 1.0, 0.96], eyeRow: 0 },
  ref3: { ...REF2, gridDiv: 64, ringiness: 0.12, gridShare: 0.3, filamentShare: 0.1, tintMid: [0.97, 0.99, 1.0], eyeRow: 0, streaks: 1, parallaxBend: 0.9 },
};

// ---- plan B (the rigged Rodesqa sculpt, /?face=1&mesh=planb): 'cine-planb' = 'cine-v004-ml-live2-lift2' + the per-mesh
// fit for this head (scripts/hero-face/planb: mesh-planb = the r1 look mesh + the rig's browDown / eyeLook targets).
// Only per-mesh terms differ from lift2: hair opening / curtains / crown for this skull, eye socket + lid lines for its
// deeper, larger eyes, lips / seam for its smaller mouth, face-vs-hair tonality, and the art-directed light blobs
// (lift2's brow / temple lift kept, plus lips, chin, nose ridge, nasolabial fill for this long midface).
// Not carried by a preset: the hair volume centre (plan B's skull is 0.1 W shallower; its fit is [0, 0.14, -0.62] vs
// HAIR_DEFAULTS.centre [0, 0.12, -0.67]); this engine builds the volume at HAIR_DEFAULTS.centre for every mesh.
PRESETS['cine-planb'] = {
  ...PRESETS['cine-v004-ml-live2-lift2'],
  streakShare: 0,
  volOpenE: [0.66, 0.86],
  volCurtainOpen: [22, 40, 60],
  crownFade: [0.4, 0.62],
  exposure: 1.5,
  hairTone: [1.12, 1.35],
  hairCrown: [0.45, 0.25, 0.2],
  lidLine: [0.35, 1.0],
  socket: [0.21, 0.095, 0.42, 0.005],
  socketSquash: [2.2, 1.25],
  scleraGhost: 0.09,
  irisGhost: 0.055,
  lacrimalGain: 2.5,
  catchOffset: [-0.015, 0.008],
  lipFloor: 1.0,
  lipBorder: 0.9,
  lipSeam: [0.012, 0.17, 0.8],
  sculpt: [
    [-0.26, 0.18, 0.12, 0.055, 1.2], // lift2: brow lift, viewer-left
    [0.26, 0.18, 0.12, 0.055, 1.2], // lift2: brow lift, viewer-right
    [-0.34, 0.36, 0.15, 0.12, 0.9], // lift2: temple / outer forehead, viewer-left
    [0.34, 0.36, 0.15, 0.12, 0.9], // lift2: temple / outer forehead, viewer-right
    [0, -0.54, 0.1, 0.028, 1.3], // lower lip body
    [0, -0.448, 0.085, 0.018, 0.8], // upper lip
    [0, -0.8, 0.16, 0.06, -0.35], // lower chin dimmed (the chin reads shorter, rounder)
    [0, -0.13, 0.03, 0.07, -0.5], // mid-nose falls to mid-grey (bridge and tip keep their light)
    [-0.13, -0.28, 0.06, 0.13, 0.65], // nasolabial fill, viewer-left: the cheek joins the nose
    [0.13, -0.28, 0.06, 0.13, 0.65], // nasolabial fill, viewer-right
  ],
};

// plan B + the portrait brightness (TEST ONLY source, see REF26_PX): full and a 70% blend with B's own sculpt light
PRESETS['cine-planb-portrait'] = { ...PRESETS['cine-planb'], portrait: { url: '/dev-hero-face/portrait-ref26.png', px: REF26_PX, mix: 1, gain: 1.45, gamma: 0.85 } };
PRESETS['cine-planb-portrait70'] = { ...PRESETS['cine-planb'], portrait: { url: '/dev-hero-face/portrait-ref26.png', px: REF26_PX, mix: 0.6, gain: 1.45, gamma: 0.85 } };

export function resolveLook(preset: string | undefined, overrides?: Partial<LookParams>): LookParams {
  const base = PRESETS[preset || 'ref2'] || REF2;
  return { ...base, ...(overrides || {}) } as LookParams;
}

// ---- the calmer plan-B look the owner liked in img1 ('planb-r1' from plan B's r1 sheet), ported from the planb engine
// snapshot so it runs live: /?face=1&talk=1&mesh=planb&look=planb-r1
const PLANB_V002_FB: LookParams = {
  ...APPROVED_V002,
  // volume fit for this skull (crown sphere (0, 0.226, -0.595) r 0.659 vs ICT (0, 0.173, -0.681) r 0.689): cap pole /
  // curtain start a little higher and the skull mid depth 0.05 W forward (the sculpt's head is 0.1 W shallower);
  // halfway to the crown-sphere offset (0, 0.173, -0.584), which made the cap a tall dome
  // hairline: the sculpt's face is shorter below the nose, so the ICT opening left a tall bald dome; the hair
  // starts ~0.05 W lower and wraps the temples a little more (face dots fade from 0.5 instead of 0.55 W)
  volOpenE: [0.8, 0.95],
  crownFade: [0.5, 0.85],
  // lips: the sculpt's mouth is 0.32 W wide (ICT 0.39) with 26% thinner lips; a lighter vermilion, a brighter
  // Cupid's bow and a seam shadow that ends at its corners, so they read as a real mouth
  lipFloor: 1.0,
  lipBorder: 0.9,
  lipSeam: [0.012, 0.16, 0.8],
  // art-directed light (approved-v002 has every blob at gain 0): lower-lip body, upper lip, chin, a softer long nose
  // ridge, the under-eye cheek (the sculpt's deep lower lid) and a calmer forehead dome
  sculpt: [
    [0, -0.535, 0.1, 0.03, 1.4], // lower lip
    [0, -0.445, 0.08, 0.02, 0.5], // upper lip
    [0, -0.7, 0.1, 0.05, 0.6], // chin
    [0, -0.1, 0.03, 0.12, -0.4], // nose ridge (long, narrow: tone it down)
    [-0.13, -0.28, 0.06, 0.13, 0.65], // nasolabial fill, viewer-left: the cheek joins the nose (no long dark band beside it)
    [-0.25, -0.075, 0.1, 0.035, 0.8], // under-eye cheek, viewer-left (the sculpt's deep lower-lid recess)
    [0.25, -0.075, 0.1, 0.035, 0.8], // under-eye cheek, viewer-right
    [-0.3, 0.15, 0.12, 0.05, 0.5], // brow band, viewer-left: the low, sloping brows made a dark 'V' with the sockets
    [0.3, 0.15, 0.12, 0.05, 0.5], // brow band, viewer-right
    [0, -0.255, 0.045, 0.035, 0.7], // nose tip: a tip highlight ends the long ridge (reads shorter, like #5's)
  ],
  // eyes: the socket ends sooner below the eye (the cheek comes up to the lower lid) and the tagged lid rims
  // (sfp-look-mesh.mjs --rim-mode skin) glow a little more, as ICT's lacrimal line does on #5
  socketSquash: [2.2, 1.25],
  lacrimalGain: 3,
  // softly lit eyes, not dark pits: the sculpt's relaxed lids (baked 0.1 blink + 0.2 squint) cover more of the
  // eyeball than ICT's, so the sclera / iris ghost and the socket floor come up a little
  socket: [0.21, 0.105, 0.12, 0], // ry x0.8: the sculpt's brows sit 0.04-0.06 W lower (0.13-0.18 vs 0.19-0.22 W)
  scleraGhost: 0.05,
  irisGhost: 0.09,
};

/**
 * 'planb-r1' (plan B round 1, engine-v003 snapshot only): planb-v002 re-fitted for the r1 look mesh 'sfr'
 * (scripts/hero-face/planb/mesh-r1.sh: lids open, lash visor removed, brows flat + lifted, rebaked light, lid margin
 * bands, faint warm mouth) and the judges' r1 fixes: face (not crown) is the brightest mass, softly lit eyes with a
 * lash line, a lit upper lip, broad soft cheek light, a tapered nose ridge, a shorter-reading chin, hair framing.
 */
const PLANB_R1_FB: LookParams = {
  ...PLANB_V002_FB,
  // hair frames the face: hairline ~0.08 W lower with a darker transition (face dots end before the hair is full),
  // the opening narrower so the hair overlaps the temples / outer cheeks, curtains further forward beside the jaw
  volOpenE: [0.66, 0.86],
  volCurtainOpen: [22, 40, 60],
  crownFade: [0.4, 0.62],
  // tonality (judge style-motion: face -20 %, eye band -33 %, crown +16 % vs #5): face up, hair / crown down. r1 vs #5
  // (judge boxes, ref-2 frame): face +4 %, cheeks +8 %, forehead +5 %, eyes -18 %, crown -8 %
  exposure: 1.5,
  hairTone: [1.12, 1.35],
  hairCrown: [0.45, 0.25, 0.2],
  // eyes: the lid margins are tagged in the mesh (upper 0.012 W film at 0.8 light, lower 0.007 W tear line), the rig's
  // own lash-line band gets more gain; a much lighter socket floor (no black band from brow to cheek), whites brighter
  // than the iris (a dark human iris on a light eye, not a grey disc); catchlight a little lower on the iris
  lidLine: [0.35, 1.0],
  socket: [0.21, 0.095, 0.42, 0.005],
  scleraGhost: 0.09,
  irisGhost: 0.055,
  lacrimalGain: 2.5,
  catchOffset: [-0.015, 0.008],
  // lips: the r1 mouth is 0.335 W wide (rest smile / stretch; 0.343 W with the retouch) with rolled-out lips.
  // v002's forehead-dome and brow-band blobs are dropped: the hair now covers the upper forehead, the brows are flat
  lipSeam: [0.012, 0.17, 0.8],
  sculpt: [
    [0, -0.54, 0.1, 0.028, 1.3], // lower lip body
    [0, -0.448, 0.085, 0.018, 0.8], // upper lip (vermilion catches the key: a lit upper lip, not a dark band)
    [0, -0.68, 0.1, 0.04, 0.35], // chin: upper half only
    [0, -0.8, 0.16, 0.06, -0.35], // lower chin dimmed: the chin reads shorter and rounder
    [0, -0.13, 0.03, 0.07, -0.5], // nose ridge: mid-nose falls to mid-grey (bridge and tip keep their light)
    [-0.13, -0.28, 0.06, 0.13, 0.65], // nasolabial fill, viewer-left: the cheek joins the nose (no long dark band beside it)
    [-0.25, -0.1, 0.14, 0.07, 0.45], // cheek apple, viewer-left: broad, soft, joins the nose side and the lower lid
    [0.25, -0.1, 0.14, 0.07, 0.45], // cheek apple, viewer-right
    [0, -0.255, 0.045, 0.035, 0.6], // nose tip
    [0.13, -0.28, 0.06, 0.13, 0.65], // nasolabial fill, viewer-right
  ],
};

PRESETS['planb-r1'] = { ...PLANB_R1_FB, streakShare: 0 };

// ---- the approved woman (planb-r1) + the cinematic layer back (dodge, live dodge, glow, glints, stars, field life,
// light-only speech rings). Her face lighting, tone and dot shapes stay planb-r1's (the dark cinematic face treatment
// made the same head read 'undead'); faceCine softens dodge / bloom on the face only as much as each variant says.
const CINE_FX_KEYS = [
  'cine', 'bloom', 'bloomSrc', 'bloomSrc2', 'bloomThreshold', 'bloomKnee', 'bloomTint', 'tintHalo', 'dodge', 'dodgeLive',
  'vignette', 'grain', 'breath', 'voiceGlow', 'glint', 'starParallax', 'starTwinkle', 'starHot', 'fieldDrift', 'fieldLife',
  'dust', 'depthSize', 'haloCap', 'haloBright', 'harmony', 'harmFlow', 'harmSize', 'harmWave', 'harmLag', 'harmVoice',
  'harmRippleLight',
] as const;
const cineFx = (src: LookParams): Partial<LookParams> =>
  Object.fromEntries(CINE_FX_KEYS.filter((k) => src[k] !== undefined).map((k) => [k, src[k]])) as Partial<LookParams>;
PRESETS['planb-r1-cine'] = { ...PLANB_R1_FB, ...cineFx(CINE_V004_ML_LIVE2), streakShare: 0, faceCine: [0.75, 0.85] };
PRESETS['planb-r1-cine-full'] = { ...PLANB_R1_FB, ...cineFx(CINE_V004_ML_LIVE2), streakShare: 0 };
PRESETS['planb-r1-cine-soft'] = { ...PLANB_R1_FB, ...cineFx(CINE_V004_ML_LIVE2), streakShare: 0, faceCine: [0.5, 0.6] };

// the pulse / life of the field and hair from live2 (hot glowing hair / field dots, sparkling hair dots, drifting
// survivors) on top of planb-r1-cine-full; the face keeps planb-r1's dots and light
const FIELD_LIFE_KEYS = ['volStat', 'volDot', 'survivorBright', 'survivorJitter', 'survivorSize', 'fragmentShare', 'starHot'] as const;
const fieldLife = (src: LookParams): Partial<LookParams> =>
  Object.fromEntries(FIELD_LIFE_KEYS.filter((k) => src[k] !== undefined).map((k) => [k, src[k]])) as Partial<LookParams>;
PRESETS['planb-r1-cine-live'] = { ...PRESETS['planb-r1-cine-full'], ...fieldLife(CINE_V004_ML_LIVE2) };
// + the glowing soft dots with size variety and the hot dots everywhere (closest to live2's pulse; watch the face)
PRESETS['planb-r1-cine-live-glow'] = {
  ...PRESETS['planb-r1-cine-live'],
  dotSoft: CINE_V004_ML_LIVE2.dotSoft, dotLogSigma: [0.15, 0.45], dotHot: CINE_V004_ML_LIVE2.dotHot, dotCap: CINE_V004_ML_LIVE2.dotCap,
};

// the owner: mouse follow read as a sliding picture, not a turning head -> the dots ride the face surface when she turns
PRESETS['planb-r1-cine-live-glow-3d'] = { ...PRESETS['planb-r1-cine-live-glow'], rigidFlow: 1 };
PRESETS['planb-r1-cine-live-glow-turn'] = { ...PRESETS['planb-r1-cine-live-glow'], rigidFlow: 2 };

// ---- THE APPROVED WOMAN, named explicitly. The owner approved mesh 'planb' + look approved-v002 ("NOW THATS A WOMAN");
// the 'planb-r1*' links silently fell back to approved-v002 then (the preview routed only cine-* / harmony-* here).
// speaking lips (lipTalk): both lips lit with the mouth opening, so she talks with lips instead of a dark void; a
// faint upper-teeth row (0.07: a hint behind the lips, as real mouths show on a / e / i; 0.16+ reads as a grey smear)
// (teeth hint .17 -> .09 and the mouth-interior dots at about half: the owner asked for the inside of the mouth darker,
// just a hint of the dots left; 2026-09-26)
const LIP_TALK: [number, number, number, number, number, number, number] = [0.12, 0.5, 0.22, 0.09, 0.035, 0.35, 0.75];
const MOUTH_DOTS: [number, number, number] = [1.2, 0.17, 0.15];
const POUT_FILL = 0.35;
// the speaking light is full over the middle of the lips and fades out toward the corners (an even fill end to end
// read as two sausages the moment she spoke; the owner, 2026-09-26)
const LIP_TALK_SHAPE: [number, number] = [0.3, 1.0];
// the eyes a little more visible (the owner, 2026-09-26): whites, iris, the frontal fill into the shadowed sockets, the
// lash-line dots and the socket's floor each up a notch over the approved look
const EYES_MORE = { scleraGhost: 0.055, irisGhost: 0.115, ghostFill: 0.07, lidLine: [0.18, 1] as [number, number], socket: [0.21, 0.13, 0.12, 0.012] as [number, number, number, number] };
PRESETS['woman'] = { ...APPROVED_V002, lipTalk: LIP_TALK, lipTalkShape: LIP_TALK_SHAPE, mouthDots: MOUTH_DOTS, poutFill: POUT_FILL, mouthInnerDim: 0.7, ...EYES_MORE };
// the woman + the cinematic layer (dodge, live dodge, bloom, glints, stars, field drift / life, light-only speech rings)
PRESETS['woman-cine'] = { ...APPROVED_V002, ...cineFx(CINE_V004_ML_LIVE2), streakShare: 0, lipTalk: LIP_TALK, lipTalkShape: LIP_TALK_SHAPE, mouthDots: MOUTH_DOTS, poutFill: POUT_FILL, mouthInnerDim: 0.7, ...EYES_MORE };
// + the field / hair pulse (hot glowing hair and field dots, sparkling hair dots, drifting survivors)
PRESETS['woman-cine-pulse'] = { ...PRESETS['woman-cine'], ...fieldLife(CINE_V004_ML_LIVE2) };
// + glowing soft dots with a little size variety and the hot dots (the strongest dodge on the face)
// the owner's tuned look (his tuning-panel link, 2026-09-26): finer grid (81) and smaller face dots, no free scatter,
// brighter / higher-contrast face, softer dots, the speaking lips' light low, the stronger vignette and edge fade
const OWNER_TUNE_0926: Partial<LookParams> = { lipTalkShape: [0.1, 0.85], lipTalk: [0.12, 0.04, 0, 0.09, 0.035, 0.35, 0.14], lipGloss: [0.43, 20], lipFloor: 0.74, rBase: 0.0615, rMid: 0.0328, rTop: 0.0492, rMax: 0.1558, exposure: 1.76, vignette: [1, 0.45, 1.6], scatterCount: 0, dimShrink: 0.05, breath: [0.1, 0.143, 0.24, 0], voiceGlow: [0.91, 0.05, 0.06, 0.25], harmRippleLight: [0.93, 1.4], ghost: 0.18, lipCorner: [0.08, 0.025], gamma: 1.23, edgeFade: [0.195, 0.42, 0.88, 0.72], gridDiv: 81, survivorSize: [0.093, 0.1581], harmSize: [0.71, 0.06, 0.5, 2.2], dodge: 0.43, gain: 2.65, minPitchDevPx: 5, vignettePost: 0.93, earMask: [0.6, -0.08, -0.75, 0.14, 0.26, 0.24, 0.95, 1.92], hairDensity: 0.67, dotSoft: 0.25 };
// the owner's second tuning-panel link (2026-09-26): back to a coarser grid (54: fewer, larger dots), a glossier lower
// lip with a tighter spot and no upper-lip border, no speaking-lip light at rest, less gain, a little more exposure
const OWNER_TUNE_0926B: Partial<LookParams> = { lipGloss: [1.5, 62], lipBorder: 0, lipTalk: [0, 0.04, 0, 0.09, 0.035, 0.35, 0.14], gain: 2, gamma: 1.24, dodge: 0.39, exposure: 1.89, gridDiv: 54, edgeFade: [0.195, 0.4, 0.88, 0.72] };
PRESETS['woman-cine-glow'] = {
  ...PRESETS['woman-cine-pulse'],
  dotSoft: CINE_V004_ML_LIVE2.dotSoft, dotLogSigma: [0.15, 0.45], dotHot: CINE_V004_ML_LIVE2.dotHot, dotCap: CINE_V004_ML_LIVE2.dotCap,
  // a stronger breathing pulse: glow +-15 %, exposure +-4 % every ~4.5 s (+-6 % / +-1.5 % barely read; the owner, 2026-09-26)
  breath: [0.15, 0.04, 0.22, 0],
  // the field thins and dims over the outer ~20 % toward the card's edges, radially (the corners most), and a vignette
  // after the tone curve dims the bright dots out there too (even density to the border read as a flat texture; the
  // owner picked radial + post-tone vignette 0.5, 2026-09-26)
  edgeFade: [0.2, 0.35, 0.5, 0.5], edgeFadeShape: 1, vignettePost: 0.5,
  // the ears and the neck fade out: as she turned to the cursor they showed as a dim ear and a neck column (the owner,
  // 2026-09-26); planb's ears sit at |x| ~.60, y ~-.08, z ~-.75, the neck behind the jaw below y ~-.45 and z ~-.3
  earMask: [0.6, -0.08, -0.75, 0.14, 0.26, 0.24, 0.75, 1.25], neckMask: [-0.4, -0.55, -0.3, -0.45],
  ...OWNER_TUNE_0926,
  ...OWNER_TUNE_0926B,
  // the intro (after the owner's stock reference, 2026-09-26; times on a 3.5 s timeline, scaled by the length)
  intro: [3.5, 0.35, 0.6, 1.2], introShape: [1.0, 0.35, 2, 1],
};
// the Darkstar HUD look (Top Gun: Maverick): the face keeps the default's own tones; the corona (hair, field) goes
// phosphor green (the site's brand green) with a radar sweep turning around the head and an LED panel's unlit cells;
// eyes with a human iris texture; amber only as a signal: her voice heating the field, a few sparks
PRESETS['woman-darkstar'] = {
  ...PRESETS['woman-cine-glow'],
  // (v4: the face keeps the default's own tones, green on it read as alien skin; the amber outline read as a weird halo)
  tintField: [0.12, 1.0, 0.5], tintFieldHalo: [0.05, 0.9, 0.4],
  hudAmber: [1.0, 0.26, 0.04], hudRim: 0, hudVoice: 0.7, hudSparks: 0.02, hudOffDot: 0.04,
  // (v6: no amber eyes, no reticle, no radar; the eyes a human iris texture in the face's own tones; the corona's green
  // scattered toward mint / white per particle)
  tintFieldVar: 0.75,
  // (the iris a little dimmer, 1.4 -> 1.15: the owner, 2026-09-26)
  irisDetail: [1, 0.9, 0.55, 1.15], eyeSharp: [0.1, 0],
};
