import { NOISE_GLSL } from './common.glsl';

// One THREE.Points draw for everything that glows (PLAN.md §3, P3 ②):
//   kind 0  screen-aligned lattice point; samples T0 (4x4 box = one cell) + T1 (flow, exact)
//   kind 1  free 3D scatter particle in head space (hair-shaped envelope, filaments)
//   kind 2  background star (head-relative screen position)
//   kind 3  catchlight (projected pupil + eye-space offset)
// Every sprite draws its own glyph (irregular superellipse disc, donut, ring, arc, fragment/squiggle,
// filament) plus a windowed analytic halo, tone-maps itself and is blended additively (ONE, ONE).
//
// Glyph ids: 0 disc, 1 donut (ring with a dim filled centre), 2 ring, 3 arc, 4 squiggle, 5 filament.
//
// Dot life (look.dotFade): each particle keeps a small state (uLife, one texel per particle, RGBA16F) of
// presences / weights that move toward this frame's on/off decisions at 1 / (its fade time) per second, so dots
// fade in and out instead of popping. The same vertex shader compiled with HF_LIFE (the life pass) writes the
// next state; the draw pass reads the previous state and applies the identical step, so both agree. Snap (first
// frame, resize, time going back) or dotFade = 0 uses the decisions directly: stills are unchanged.

export const POINTS_VERT = /* glsl */ `
precision highp float;
precision highp int;
${NOISE_GLSL}
attribute vec4 aRand;
attribute vec4 aRand2;
attribute float aKind;

uniform sampler2D uT0;
uniform sampler2D uT1;
uniform sampler2D uMask;
uniform float uLodOff;   // added to every ghost / mask blur level (below 2x: the same CSS extent as at 2x; 0 at >= 2x)
uniform vec2 uT0Size;
uniform vec2 uT0Origin;
uniform float uT0Texel;
uniform vec2 uViewport;
uniform vec2 uOrigin;
uniform float uWpx;
uniform float uPitch;
uniform vec2 uAnchor;
uniform float uPitchWarp;
uniform float uTime;
uniform float uFlicker;

uniform vec4 uXfer;      // alphaLo, alphaHi, gain, gamma
uniform vec4 uRad;       // rBase, rMid, rTop, rMax
uniform vec4 uJit;       // jitterSize, jitterBright, superN, ringiness
uniform vec4 uHaloK;     // haloAmp, haloBright, tailAmp, irregularity
uniform vec4 uGlyph;     // ring share dim, ring share mid, ring share bright, halo cap (HDR)
uniform vec4 uGlyph2;    // superellipse n of bright dots (squarer), unused, dim-dot shrink, fragment share

uniform vec4 uEnvA;      // plateauL, plateauR, efoldL, efoldR
uniform vec4 uEnvB;      // topV, topEfold, chinV, chinEfold
uniform vec4 uEnvC;      // hardFade0, hardFade1, hairBottom, hairWidth
uniform vec4 uEnvD;      // hairFlare, hairDensity, strayIn, scatterShare
uniform vec4 uEnvE;      // survivorJitter, hotShare, filamentShare, scatterNorm
uniform vec4 uEnvF;      // densL, densR, survivor brightness lo, hi
uniform vec4 uRow;       // eyeRow strength, eyeRowDy, keepPow, rim mask lod
uniform vec4 uHot;       // hot survivor brightness lo, hi; survivor size base, hot size base (p)
uniform vec4 uStarK;     // saturated share, star gain, unused, unused
uniform vec4 uSeamA;     // seamless transition: amount, jitter (p), size variation, promote
uniform vec4 uSeamB;     // core mask lo, hi (mean of mips 4 + 5), boundary noise amp, noise freq (1/W)
uniform vec4 uSeamC;     // near-field density, wide-mask level of full density, falloff exponent, lit share
uniform vec4 uSeamD;     // near-statistics share, per-dot brightness spread (log sigma), hot boost near the face, debug view
uniform vec4 uSeamE;     // free-scatter near-field boost, feature ellipse centre v, unused x2
uniform vec4 uSeamF;     // lit field lo, hi (mean of mips 5 + 6), feature ellipse rx, ry
uniform sampler2D uVol;  // a3 volume target (same raster as T0): sum L rho, sum rho, sum strand rho, sum layer rho
uniform vec4 uVolA;      // on, rho -> hair-dot probability gain, rho of full envelope suppression, fade width
uniform vec4 uVolB;      // hot share, jitter (p), log brightness sigma, size variation
uniform vec4 uVolC;      // face edge band: amount, e0, e1 (screen e), dropout
uniform vec4 uVolD;      // extra ring share, brightness gain, band log sigma, dim alpha floor (x alphaLo)

uniform vec3 uPupilL;
uniform vec3 uPupilR;
uniform vec4 uCatch;     // radius (p), hdr, secondary factor, visible (blink)
uniform vec4 uCatchOff;  // primary offset xy (W, y up), secondary offset xy
uniform sampler2D uLife; // dot life state of the previous frame (lattice: face dot, survivor, face-owns-cell, hair weight; scatter: presence)
uniform vec4 uLifeK;     // on, dt (s), snap (1 = jump to this frame's decisions), curve (0 linear .. 1 smoothstep)
uniform vec4 uLifeT;     // fade time lo, hi (s; per dot), state texture width, height
uniform vec4 uEyeClr;    // free scatter kept out of the eyes: ellipse rx, ry (W) around each projected pupil, outer edge (x ellipse), unused
uniform vec4 uFieldX;    // wide cards: far-field lateral stretch: knee |u| (W), stretch viewer-left, viewer-right, on
uniform vec4 uFieldY;    // wide cards: viewer-right field balance toward the viewer-left profile (share), unused, ramp u0, u1 (W)
uniform vec4 uDotA;      // a5 proto: dotSoft, dotBeta, dotCap, logSigma core
uniform vec4 uDotB;      // hot L0, L1, gain, face jitter core (p)
uniform vec4 uDotC;      // dust gain, r min, r max, streak share
uniform vec4 uDotD;      // streak half-length, irregularity tail, face jitter edge, logSigma edge
// a5 cinematic layer
uniform vec4 uCineW;     // bloom-source weights: face dot, hair dot, scatter / survivor, star
uniform vec4 uCineW2;    // catchlight weight, cine on, unused x2
uniform vec2 uStarO;     // projected head origin at the rest pose (device px): stars move k x (uOrigin - uStarO)
uniform vec4 uStarK2;    // star parallax far, near; twinkle amplitude; unused
uniform vec4 uStarK3;    // twinkle frequency lo, hi (Hz); unused x2
uniform vec4 uDrift;     // free-scatter drift amplitude (W), period lo, hi (s), unused
uniform vec4 uFLife;     // share of scatter / stars that fade out and back, cycle lo, hi (s), fade (s)
uniform vec4 uDepthK;    // near size gain, near softness (p), far dim factor, unused
uniform vec4 uHarmA;     // a5 harmony flow: field amplitude (W), face amplitude (p), spatial frequency (1/W), tempo
uniform vec4 uHarmB;     // size waves: field amplitude, face amplitude, brightness share, spatial frequency (1/W)
uniform vec4 uHarmC;     // ripples: displacement (W), speed (W/s), ring width (W), decay (s)
uniform vec4 uHarmD;     // on, sympathetic lag xy (device px, y down), speech energy 0..1
uniform vec4 uHarmE;     // speech brightness gain, speech swell gain, lag share of the far scatter, lag share of the stars
uniform vec4 uPulse[6];  // ripple sources: device px xy (y down), age (s), amplitude
uniform vec4 uHarmF;     // ripple size gain, ripple brightness gain (defaults 0.25, 0.3)
varying float vBloomW;
varying float vSoft;
#ifdef HF_LIFE
varying vec4 vLife;
#endif

varying float vI;
varying vec4 vShape;     // glyph, radius (p), sprite half-size (p), superN | stroke half-length
varying vec4 vArc;       // glyph params
varying vec4 vHalo;      // halo amp, tail amp, distortion amp2, distortion amp3

const float TAU = 6.2831853;

vec2 toNdc(vec2 s) { return vec2(s.x / uViewport.x * 2.0 - 1.0, 1.0 - s.y / uViewport.y * 2.0); }

// a5: slow cycling presence (1 = shown): a share of the particles fades out and back once per cycle
float cycleEnv(float seed) {
  if (uFLife.x <= 0.0 || hf_hash12(vec2(seed, 3.17)) >= uFLife.x) return 1.0;
  float P = mix(uFLife.y, uFLife.z, hf_hash12(vec2(seed, 5.3)));
  float ph = fract(uTime / P + hf_hash12(vec2(seed, 9.1)));
  float fp = uFLife.w / P;
  float q = max(2.2 * fp, 0.3);
  float dip = smoothstep(0.0, fp, ph) * (1.0 - smoothstep(q - fp, q, ph));
  return 1.0 - dip;
}

// dot life: move a presence / weight toward this frame's value by at most lifeStep (= dt / the dot's fade time);
// within one half-float quantum of the target it is the target (the state is stored as RGBA16F), so a dot at
// rest shows exactly its decision
bool lifeSnap = true;
float lifeStep = 1.0;
float lifeTo(float p, float target) {
  if (lifeSnap) return target;
  float d = target - p;
  return abs(d) <= max(lifeStep, 1.0 / 1024.0) ? target : p + sign(d) * lifeStep;
}
float lifeW(float p) { return mix(p, p * p * (3.0 - 2.0 * p), uLifeK.w); }

ivec2 t0Texel(vec2 s) {
  vec2 tc = (s - uT0Origin) / uT0Texel;
  return ivec2(floor(tc.x), int(uT0Size.y) - 1 - int(floor(tc.y)));
}
bool inT0(ivec2 t) { return t.x >= 0 && t.y >= 0 && t.x < int(uT0Size.x) && t.y < int(uT0Size.y); }

vec4 sampleCell(vec2 s) {
  vec2 tc = (s - uT0Origin) / uT0Texel;
  ivec2 b0 = ivec2(floor(tc - 1.5));
  vec4 acc = vec4(0.0);
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      ivec2 t = ivec2(b0.x + x, int(uT0Size.y) - 1 - (b0.y + y));
      if (inT0(t)) acc += texelFetch(uT0, t, 0);
    }
  }
  return acc / 16.0;
}

vec4 sampleVol(vec2 s) {
  vec2 tc = (s - uT0Origin) / uT0Texel;
  ivec2 b0 = ivec2(floor(tc - 1.5));
  vec4 acc = vec4(0.0);
  for (int y = 0; y < 4; y++) {
    for (int x = 0; x < 4; x++) {
      ivec2 t = ivec2(b0.x + x, int(uT0Size.y) - 1 - (b0.y + y));
      if (inT0(t)) acc += texelFetch(uVol, t, 0);
    }
  }
  return acc / 16.0;
}

float maskAt(vec2 s, float lod) {
  vec2 uv = vec2(s.x / uViewport.x, 1.0 - s.y / uViewport.y);
  return textureLod(uMask, uv, lod + uLodOff).g;
}
vec4 ghostAt(vec2 s, float lod) {
  vec2 uv = vec2(s.x / uViewport.x, 1.0 - s.y / uViewport.y);
  return textureLod(uMask, uv, lod + uLodOff);
}


// free sparkles (scatter, stars, dust, survivors) never sit on the face's own dark areas (nostrils, under-nose shadow,
// eye sockets, mouth) in the CURRENT pose; the ghost target follows the head (pose, talk, blink)
float hf_darkFace(vec2 s) {
  vec4 gq = ghostAt(s, 0.0);
  vec2 hq = (s - uOrigin) / uWpx;
  float faceZone = 1.0 - smoothstep(0.85, 1.05, length((hq - vec2(0.0, 0.42)) / vec2(0.46, 0.56)));
  return faceZone * smoothstep(0.3, 0.7, gq.g) * (1.0 - smoothstep(0.04, 0.22, gq.a));
}
// Seamless transition: wide near field around the head silhouette (1 at / inside the head, decaying over
// ~0.3 W outside it) and the mean lit level of the nearby skin (ghost A = unfaded lit skin), so the
// field is densest and brightest right next to the lit face and continuous with it.
float seamNear(vec2 s, out float litN) {
  vec4 g6 = ghostAt(s, 6.0);
  vec4 g7 = ghostAt(s, 7.0);
  float mw = 0.5 * (g6.g + g7.g);
  litN = clamp((g6.a + g7.a) / max(g6.g + g7.g, 0.1), 0.0, 1.5);
  return pow(smoothstep(0.0, uSeamC.y, mw), uSeamC.z);
}
// face core weight (1 = untouched approved face): inside the silhouette (mask), on lit skin (wide lit field)
// or inside the protected feature ellipse (eyes / nose / mouth / cheeks never dissolve); fbm-broken edge
// kc = keep x coverage of the cell (the approved dissolve weight); returns tau / uSeamA.x
float seamTau(vec2 s, vec2 h, float kc) {
  float nz = hf_fbm(vec3(h * uSeamB.w, 6.1)) - 0.5;
  float mc = 0.5 * (maskAt(s, 4.0) + maskAt(s, 5.0)) + uSeamB.z * nz;
  float lw = 0.5 * (ghostAt(s, 5.0).a + ghostAt(s, 6.0).a) * (1.0 + 2.0 * uSeamB.z * nz);
  float ef = length(vec2(h.x / uSeamF.z, (h.y - uSeamE.y) / uSeamF.w));
  float prot = (1.0 - smoothstep(0.9, 1.1, ef)) * step(0.5, maskAt(s, 2.0));
  float core = smoothstep(uSeamB.x, uSeamB.y, mc) * mix(smoothstep(uSeamF.x, uSeamF.y, lw), 1.0, prot);
  return 1.0 - max(clamp(kc, 0.0, 1.0), prot) * core;
}

// Wide cards (look.fieldStretch): the far field beyond the knee is stretched laterally, i.e. its density profile
// is read at a position pulled back toward the knee, so the canvas side edges show ref 2's frame-edge field.
// Off (canvas no wider than ref 2): h itself, bit for bit.
vec2 fieldH(vec2 h) {
  if (uFieldX.w < 0.5) return h;
  float ex = abs(h.x) - uFieldX.x;
  if (ex <= 0.0) return h;
  return vec2(sign(h.x) * (uFieldX.x + ex / (h.x < 0.0 ? uFieldX.y : uFieldX.z)), h.y);
}

// Expected survivors per lattice cell for the head + long-hair envelope; h = head-relative W, y down.
// envProf: the density profile (before clumping) and its hard radial fade; bal > 0 (wide cards) moves the
// viewer-right parameters toward the viewer-left ones across the ramp uFieldY.zw.
float envProf(vec2 h, float bal, out float fade) {
  // viewer-left / right parameters blend across the centre (no seam at x = 0)
  float tr = smoothstep(-0.3, 0.3, h.x);
  if (bal > 0.0) tr *= 1.0 - bal * smoothstep(uFieldY.z, uFieldY.w, h.x);
  float plateau = mix(uEnvA.x, uEnvA.y, tr);
  float efold = mix(uEnvA.z, uEnvA.w, tr);
  float base = mix(uEnvF.x, uEnvF.y, tr);
  float ax = abs(h.x);
  // head oval (crown -> chin) united with the hair curtains that fall past the jaw
  vec2 c = vec2(0.0, 0.0);
  float ry = h.y < c.y ? (c.y - uEnvB.x) : 0.95;
  vec2 e = vec2((ax) / plateau, (h.y - c.y) / ry);
  float dOval = (length(e) - 1.0) * min(plateau, ry);
  float outer = uEnvC.w * plateau / 0.62 + uEnvD.x * max(0.0, h.y);
  float dHair = max(max(ax - outer, -0.15 - h.y), h.y - uEnvC.z);
  float d = min(dOval, dHair);
  float dens = base * exp(-max(0.0, d) / (h.y < -0.3 ? uEnvB.y : efold));
  // neck gap between the curtains below the chin
  float neck = (1.0 - smoothstep(0.22, 0.44, ax)) * (1.0 - exp(-max(0.0, h.y - uEnvB.z) / uEnvB.w));
  dens *= 1.0 - 0.92 * neck;
  float r = length(h - vec2(-0.04, 0.1));
  fade = 1.0 - smoothstep(uEnvC.x, uEnvC.y, r);
  return dens;
}
// The profile follows the far-field stretch (fieldH); the clumping noise stays at the true position (round clumps).
// envKeep = the envelope without the wide-card right-side balance (the face dissolve uses it, so the face edge
// never changes with the card width); off (not a wide card) both are the approved envelope, bit for bit.
float envelope(vec2 hTrue, out float envKeep) {
  vec2 h = fieldH(hTrue);
  float fade;
  float dens = envProf(h, 0.0, fade);
  // clumping + hard radial fade
  float clump = 0.45 + 1.1 * hf_fbm(vec3(hTrue * 6.0, 2.3));
  dens *= clump;
  envKeep = dens * fade;
  if (uFieldY.x > 0.0 && hTrue.x > uFieldY.z) {
    float fb;
    return envProf(h, uFieldY.x, fb) * clump * fb;
  }
  return envKeep;
}
float envelope(vec2 h) { float k; return envelope(h, k); }

// glyph choice: ringP = share of non-disc glyphs (ring / donut / arc / fragment). As in ref 2: bright dots
// are filled, slightly square discs; mid-tones mix discs with rings, donuts and 'c' arcs; dim dots are
// small discs and broken fragments (never a uniform ring texture).
void pickGlyph(float ringP, float Lb) {
  float gsel = aRand.x;
  float g = 0.0;
  if (gsel < ringP) {
    float k = gsel / ringP;
    // dim: mostly arcs + fragments; mid: donuts + rings; bright: donuts
    float dim = 1.0 - smoothstep(0.12, 0.4, Lb);
    float fr = uGlyph2.w * (0.4 + 0.6 * dim);
    g = k < fr ? 4.0 : (k < fr + (1.0 - fr) * mix(0.45, 0.2, dim) ? 1.0 : (k < fr + (1.0 - fr) * mix(0.72, 0.45, dim) ? 2.0 : 3.0));
  }
  vShape.x = g;
  vShape.w = mix(uJit.z, uGlyph2.x, smoothstep(0.5, 1.1, Lb));
  if (g > 3.5) {
    // squiggle fragment inside the cell
    vArc = vec4(0.05 + 0.06 * aRand2.x, 7.0 + 6.0 * aRand2.y, aRand.w * TAU, aRand2.z * TAU);
    vShape.w = 0.18 + 0.14 * aRand.z;
  } else {
    // arc start / span; donut fill level
    vArc = vec4(aRand.w * TAU, (0.36 + 0.46 * aRand2.x) * TAU, 0.35 + 0.3 * aRand2.y, 0.0);
  }
  // blob irregularity (2nd / 3rd harmonic of the outline)
  float irr = uHaloK.w;
  vHalo.z = irr * (0.35 + 0.65 * aRand2.w) * 0.16;
  vHalo.w = irr * aRand.y * 0.1;
  if (uDotD.y > 0.0) {
    // a5 proto: heavy-tailed wobble (most dots regular, a few strongly irregular / broken)
    float t2 = pow(hf_hash12(vec2(aRand2.w, aRand.y) * 91.7 + 3.1), uDotD.y);
    vHalo.z = irr * (0.08 + 0.92 * t2) * 0.16;
    vHalo.w = irr * t2 * aRand.y * 0.12;
  }
}

float ringShare(float Lb) {
  return mix(mix(uGlyph.x, uGlyph.y, smoothstep(0.1, 0.4, Lb)), uGlyph.z, smoothstep(0.55, 1.0, Lb));
}

void main() {
  float kind = aKind;
  vI = 0.0;
  vShape = vec4(0.0, 0.2, 0.5, uJit.z);
  vArc = vec4(0.0);
  vHalo = vec4(uHaloK.x, uHaloK.z, 0.0, 0.0);
  vBloomW = uCineW.x;
  vSoft = 0.0;
  // a5 harmony weights: hmW 0 = face core (sub-cell motion) .. 1 = field; hmG gates the face features (eyes, mouth);
  // hmLag = share of the sympathetic lag (free scatter / stars only: the lattice is resampled from the head itself)
  float hmW = 1.0, hmG = 1.0, hmLag = 0.0;
  vec2 s = vec2(-1e4);
  bool on = false;
  vec4 lifeP = vec4(0.0);
  vec4 lifeOut = vec4(0.0);
  if (uLifeK.x > 0.0) {
    int lw = int(uLifeT.z);
    lifeP = texelFetch(uLife, ivec2(gl_VertexID % lw, gl_VertexID / lw), 0);
    lifeSnap = uLifeK.z > 0.5;
    lifeStep = uLifeK.y / max(mix(uLifeT.x, uLifeT.y, hf_hash12(vec2(float(gl_VertexID) * 0.0137, 7.31))), 1e-3);
  }

  if (kind < 0.5) {
    // ---------------------------------------------------------------- lattice
    vec2 ij = position.xy;
    float xl = ij.x * uPitch;
    float uL = xl / uWpx;
    vec2 sl = uAnchor + vec2(xl * (1.0 + uPitchWarp * uL * uL / 3.0), ij.y * uPitch);
    vec4 cell = sampleCell(sl);
    float L = cell.r;
    float cov = cell.g;
    float mouth = cell.b;
    float keep = cov > 0.001 ? cell.a / cov : 0.0;
    ivec2 tcc = t0Texel(sl);
    vec4 t1 = inT0(tcc) ? texelFetch(uT1, tcc, 0) : vec4(0.0);
    float eye = t1.w;
    s = sl + t1.xy * uPitch;
    vec2 h = (sl - uOrigin) / uWpx;

    // probabilistic dissolve of the face dots toward the head outline (ears, crown, neck, grazing);
    // within ~2 cells of the silhouette the face density converges to the envelope's, so the head
    // has no outline: face dots thin out and the grid-aligned survivors continue at the same density
    float cm = maskAt(sl, uRow.w);
    float rim = smoothstep(0.35, 0.95, cm);
    float envK;
    float envH = envelope(h, envK);   // once per cell (fbm): dissolve (envK), survivors and the seam field all use it
    float keepP = pow(clamp(keep * cov, 0.0, 1.0), uRow.z) * mix(min(1.0, envK), 1.0, rim);
    bool faceKeep = aRand2.x < keepP;
    L *= mix(0.55, 1.0, keep);
    float a = smoothstep(uXfer.x, uXfer.y, L);
    float I = uXfer.z * pow(max(L, 0.0), uXfer.w) * a;
    I *= 1.0 + uDotB.z * smoothstep(uDotB.x, uDotB.y, L);   // a5 proto: top-end expansion (0 = v002)
    I = uDotA.x > 0.0 ? uDotA.z * (1.0 - exp(-I / uDotA.z)) : 3.2 * (1.0 - exp(-I / 3.2));
    float r = min(uRad.x + uRad.y * smoothstep(0.08, 0.65, L) + uRad.z * smoothstep(0.65, 1.4, L), uRad.w);
    r *= mix(uGlyph2.z, 1.0, smoothstep(0.03, 0.3, L));   // the dimmest dots shrink (tiny specks, not rings)
    I *= 1.0 + uJit.y * (2.0 * aRand.y - 1.0);
    r *= 1.0 + uJit.x * (2.0 * aRand.z - 1.0);
    float eS0 = length(vec2(h.x / 0.49, (h.y - 0.07) / 0.71));
    float edgeW = smoothstep(0.6, 1.1, eS0);
    hmW = smoothstep(0.72, 1.25, eS0);
    hmG = (1.0 - eye) * (1.0 - smoothstep(0.04, 0.2, mouth));
    if (uDotA.w > 0.0 || uDotD.w > 0.0) {
      // a5 proto: per-dot log-normal brightness spread (median-preserving), part of it also on the radius
      float lsig = mix(uDotA.w, uDotD.w, edgeW);
      float gzB = (hf_hash12(ij * 3.17 + 0.3) + hf_hash12(ij * 5.71 + 1.9) + hf_hash12(ij * 2.33 + 7.7) - 1.5) * 2.0;
      I *= exp(lsig * gzB);
      r *= exp(0.3 * lsig * gzB);
    }
    float flick = 1.0 + uFlicker * sin(uTime * (3.0 + 3.0 * aRand2.w) + aRand2.z * TAU);
    I *= flick;

    // ---- seamless face -> particle field (look.seam > 0). tau = 0 in the face core, where the approved
    // path below runs unchanged; it rises through the dissolve band (keep) and the silhouette rim to 1
    // outside the head. Cells convert with probability tau (dark / dissolved face cells faster) into field
    // particles whose occupancy, brightness, size, glyph and position blend from the face dot to the free
    // field, so the lit face grid loosens, jitters, thins and fades until it IS the scatter (no moat).
    float tau = 0.0, nearF = 0.0, litN = 0.0;
    if (uSeamA.x > 0.0) {
      tau = uSeamA.x * seamTau(sl, h, keep * cov);
      nearF = seamNear(sl, litN);
    }
    // ---- a3 volume: hair / head mass sampled like the lit face (same lattice, same transfer), and the face
    // edge band taking on the field's stochastic texture (brightness spread, dropped cells)
    float volW = 0.0, envSup = 0.0;
    vec4 vcell = vec4(0.0);
    if (uVolA.x > 0.0) {
      vcell = sampleVol(sl);
      envSup = smoothstep(0.0, uVolA.z, vcell.g);
      float pH = clamp(vcell.g * uVolA.y, 0.0, 1.0);
      float uH = hf_hash12(ij * 0.731 + 11.3);
      volW = smoothstep(uH - uVolA.w, uH + uVolA.w, pH);
      float eS = length(vec2(h.x / 0.49, (h.y - 0.07) / 0.71));
      float bw = uVolC.x * smoothstep(uVolC.y, uVolC.z, eS);
      float gzb = (aRand2.z + aRand.y + aRand2.w - 1.5) * 2.0;
      I *= exp(uVolD.z * bw * gzb);
      if (hf_hash12(ij * 1.913 + 2.7) < uVolC.w * bw) I = 0.0;
    }
    // ---- decisions of this cell + dot life. Survivors of the dissolve (grid-aligned, ref 2 style) + the lit
    // eye-level row: where the face owns the cell (lit skin that was not dissolved) only strays survive; where
    // the face dissolved (keep low) or outside the head, the envelope continues the lattice (no gutter / outline);
    // interior dark features (sockets, nose flanks, mouth) stay dark: only sparse dim strays there.
    // Life: the face dot (x), the survivor (y), the face-owns-cell weight (z) and the hair-dot weight (w) move
    // toward these decisions; a cell shows one dot at a time (a survivor fades in once the face dot has faded out
    // and vice versa). Only the probabilistic keep decision fades: a face dot that appears or goes because its lit
    // level crosses the visibility floor (blinks, the jaw, lighting) follows the face instantly, as its intensity
    // is already ~0 there. Snap / dotFade = 0: exactly the decisions.
    bool wantFace = a > 0.02 && faceKeep;
    float pk = lifeTo(lifeP.z, faceKeep ? 1.0 : 0.0);
    float own = smoothstep(0.45, 0.85, keep * cov) * pk;
    float sDens = mix(envH, uEnvD.z, own) * (1.0 - envSup);
    sDens *= 1.0 - smoothstep(0.08, 0.3, mouth);
    sDens *= 1.0 - 0.8 * eye;
    // no bright strays in the face's own dark areas (nostrils, under-nose shadow, sockets): at fine lattices they
    // read as glints in the nostrils ('about to sneeze'); the lit skin keeps its sparse strays
    sDens *= 1.0 - own * (1.0 - smoothstep(0.04, 0.22, L));
    // the nostril openings are holes in the mesh (low coverage = 'outside the head'): keep the nose base clear
    float noseBase = 1.0 - smoothstep(0.7, 1.0, length((h - vec2(0.0, 0.5)) / vec2(0.23, 0.16)));
    sDens *= 1.0 - noseBase;
    float sRowD = abs(h.y - uRow.y) * uWpx / uPitch;
    float axF = abs(fieldH(h).x);   // the eye-level row reaches the side edges as in ref 2 (wide cards: stretched)
    float sRow = uRow.x * (1.0 - smoothstep(0.45, 0.55, sRowD)) * (1.0 - smoothstep(1.05, 1.3, axF)) * (1.0 - step(0.3, cov));
    float sPRow = sRow * 0.8;
    float sPSurv = max(sDens, sPRow);
    float sU2 = hf_hash12(ij * 1.37 + 5.1);
    bool wantSurv = !wantFace && sU2 < sPSurv;
    float pf = lifeTo(lifeP.x, faceKeep && (lifeSnap || a <= 0.02 || lifeP.y <= 0.0) ? 1.0 : 0.0);
    float ps = lifeTo(lifeP.y, wantSurv && (lifeSnap || !(a > 0.02 && pf > 0.0)) ? 1.0 : 0.0);
    volW = lifeTo(lifeP.w, volW);
    lifeOut = vec4(pf, ps, pk, volW);
    bool faceVis = a > 0.02 && pf > 0.0;
    bool field = false;
    if (tau > 0.0) field = hf_hash12(ij * 0.917 + 23.7) < (faceVis ? tau : min(1.0, tau * uSeamA.w));

    if (field) {
      float w = tau;
      // far field = the approved envelope survivors; near field hugs the head, seeded by the nearby lit skin
      float dens = max(envH, uSeamC.x * nearF * mix(1.0, min(litN, 1.0), uSeamC.w));
      dens *= 1.0 - smoothstep(0.08, 0.3, mouth);
      dens *= 1.0 - 0.8 * eye;
      // same for dissolved dark interior cells (nostrils, under-nose shadow): no glints inside the face's own shadows
      dens *= 1.0 - smoothstep(0.45, 0.85, cov) * (1.0 - smoothstep(0.04, 0.22, L));
      dens *= 1.0 - (1.0 - smoothstep(0.7, 1.0, length((h - vec2(0.0, 0.5)) / vec2(0.23, 0.16))));
      if (faceVis) dens = mix(1.0, dens, w);
      float rowD = abs(h.y - uRow.y) * uWpx / uPitch;
      float row = uRow.x * (1.0 - smoothstep(0.45, 0.55, rowD)) * (1.0 - smoothstep(1.05, 1.3, axF)) * (1.0 - step(0.3, cov));
      float pRow = row * 0.8;
      float pSurv = max(dens, pRow);
      float u2 = hf_hash12(ij * 1.37 + 5.1);
      if (u2 < pSurv) {
        on = true;
        float hot = step(aRand2.y, uEnvE.y * (1.0 + uSeamD.z * nearF));
        // far statistics: the approved survivors
        float Is = mix(uEnvF.z, uEnvF.w, aRand2.z * aRand2.z);
        Is = mix(Is, mix(uHot.x, uHot.y, aRand2.w), hot);
        bool isRow = u2 < pRow && pRow > dens;
        if (isRow) Is = 0.5 + 0.9 * aRand2.z;
        float rs = mix(uHot.z + 0.06 * aRand.z, uHot.w + 0.06 * aRand.z, max(hot, isRow ? 0.6 : 0.0));
        float gs = uJit.w * (isRow ? 0.4 : (hot > 0.5 ? 0.3 : 1.2));
        // near statistics: the face dot transfer applied to a virtual lit level that continues the nearby
        // skin's brightness past its edge (litN), fading outward, with a broad per-dot spread
        float gz = (aRand2.z + aRand.y - 1.0) * 2.45;
        float Ld = litN * (0.35 + 0.65 * nearF) * exp(uSeamD.y * gz);
        float Iv = uXfer.z * pow(max(Ld, 0.0), uXfer.w) * smoothstep(uXfer.x * 0.5, uXfer.y, Ld);
        Iv = 3.2 * (1.0 - exp(-Iv / 3.2));
        float rv = min(uRad.x + uRad.y * smoothstep(0.08, 0.65, Ld) + uRad.z * smoothstep(0.65, 1.4, Ld), uRad.w);
        rv *= mix(uGlyph2.z, 1.0, smoothstep(0.03, 0.3, Ld));
        float nv = uSeamD.x * nearF * (1.0 - hot) * (isRow ? 0.0 : 1.0);
        Is = mix(Is, Iv, nv);
        rs = mix(rs, rv, nv);
        float Lg = mix(0.3, Ld, nv);
        gs = mix(gs, ringShare(Ld), nv);
        vI = faceVis ? mix(I, Is * flick, w) : Is * flick;
        vShape.y = (faceVis ? mix(r, rs, w) : rs) * (1.0 + uSeamA.z * w * (2.0 * aRand2.w - 1.0));
        float c = maskAt(sl, 3.5);
        vec2 jd = vec2(hf_hash12(ij + 7.1), hf_hash12(ij + 3.3)) * 2.0 - 1.0;
        s = sl + t1.xy * uPitch + jd * (uEnvE.x * (1.0 - c) + uSeamA.y * w * nearF) * uPitch;
        pickGlyph(faceVis ? mix(ringShare(L), gs, w) : gs, faceVis ? mix(L, Lg, w) : Lg);
      }
    } else if (faceVis) {
      on = true;
      vI = I * lifeW(pf);
      vShape.y = r;
      pickGlyph(ringShare(L), L);
      if (uDotB.w > 0.0) {
        // a5 proto: Gaussian positional jitter of face dots, per axis sigma (p), core -> face edge
        vec2 jg = vec2(hf_hash12(ij + 1.7) + hf_hash12(ij * 1.31 + 4.4) + hf_hash12(ij * 0.77 + 8.1) - 1.5,
                       hf_hash12(ij + 9.2) + hf_hash12(ij * 1.53 + 2.2) + hf_hash12(ij * 0.61 + 5.9) - 1.5) * 2.0;
        s += jg * mix(uDotB.w, uDotD.z, edgeW) * uPitch;
      } else {
        s += (vec2(hf_hash12(ij + 1.7), hf_hash12(ij + 9.2)) - 0.5) * 0.06 * uPitch;
      }
      if (uDotC.w > 0.0 && L > 0.45 && hf_hash12(ij * 0.53 + 17.3) < uDotC.w) {
        // a5 proto: short horizontal streak (anamorphic smear) on a bright dot
        vShape.x = 6.0;
        vShape.w = uDotD.x * (0.6 + 0.8 * hf_hash12(ij * 0.29 + 1.1));
      }
    } else if (ps > 0.0) {
      // survivor / stray (decided above)
      on = true;
      float hot = step(aRand2.y, uEnvE.y);
      float Is = mix(uEnvF.z, uEnvF.w, aRand2.z * aRand2.z);
      Is = mix(Is, mix(uHot.x, uHot.y, aRand2.w), hot);
      bool isRow = sU2 < sPRow && sPRow > sDens;
      if (isRow) Is = 0.5 + 0.9 * aRand2.z;
      Is *= mix(1.0, 0.3, own);   // strays over the face are dim specks, not glitter
      vI = Is * flick * lifeW(ps);
      vI *= 1.0 - smoothstep(0.3, 0.5, mouth);   // an opening mouth clears at once (at rest nothing survives there)
      vShape.y = mix(uHot.z + 0.06 * aRand.z, uHot.w + 0.06 * aRand.z, max(hot, isRow ? 0.6 : 0.0));
      float c = maskAt(sl, 3.5);
      vec2 jit = (vec2(hf_hash12(ij + 7.1), hf_hash12(ij + 3.3)) * 2.0 - 1.0) * uEnvE.x * (1.0 - c) * uPitch;
      s = sl + jit;
      pickGlyph(uJit.w * (isRow ? 0.4 : (hot > 0.5 ? 0.3 : 1.2)), 0.3);
    }
    vBloomW = (field || !faceVis) ? uCineW.z : uCineW.x;
    if (volW > 0.001) {
      // hair dot: the face's own transfer on the volume's lit level with a log-normal spread + sparkles
      float Lv = vcell.r / max(vcell.g, 1e-4) * uVolD.y;
      float gz = (aRand2.z + aRand.y + aRand2.w - 1.5) * 2.0;
      float Ld = Lv * exp(uVolB.z * gz);
      float ah = smoothstep(uXfer.x * uVolD.w, uXfer.y, Ld);
      float Ih = uXfer.z * pow(max(Ld, 0.0), uXfer.w) * ah;
      Ih = 3.2 * (1.0 - exp(-Ih / 3.2));
      float rh = min(uRad.x + uRad.y * smoothstep(0.08, 0.65, Ld) + uRad.z * smoothstep(0.65, 1.4, Ld), uRad.w);
      rh *= mix(uGlyph2.z, 1.0, smoothstep(0.03, 0.3, Ld));
      rh *= 1.0 + uVolB.w * (2.0 * aRand.z - 1.0);
      float hot = step(aRand2.y, uVolB.x);
      Ih = mix(Ih, mix(uHot.x, uHot.y, aRand2.w) * mix(0.45, 1.0, smoothstep(0.05, 0.45, Lv)), hot);
      rh = mix(rh, uHot.w + 0.06 * aRand.z, hot);
      Ih *= flick;
      float Ib = on ? vI : 0.0;
      float rb = on ? vShape.y : rh;
      bool hairGlyph = volW > 0.5 || !on;
      vI = mix(Ib, Ih, volW);
      vShape.y = mix(rb, rh, volW);
      if (hairGlyph) {
        vHalo = vec4(uHaloK.x, uHaloK.z, 0.0, 0.0);
        pickGlyph(min(1.0, ringShare(Ld) + uVolD.x), Ld);
        vec2 jd = vec2(hf_hash12(ij + 7.1), hf_hash12(ij + 3.3)) * 2.0 - 1.0;
        s = sl + jd * uVolB.y * uPitch;
      }
      on = true;
      vBloomW = mix(vBloomW, uCineW.y, volW);
    }
    if (uSeamD.w > 0.5) {
      // debug: every lattice cell shows tau (1), the near field (2) or the field density (3)
      on = true;
      float dv = uSeamD.w < 1.5 ? tau : (uSeamD.w < 2.5 ? nearF : max(envelope(h), uSeamC.x * nearF * mix(1.0, min(litN, 1.0), uSeamC.w)));
      if (uSeamD.w > 3.5) dv = ghostAt(sl, uSeamD.w).a;   // 4..7: lit skin field at that mip
      vI = 1.6 * dv;
      vShape = vec4(0.0, 0.32, 0.5, 2.0);
      vHalo = vec4(0.0);
      s = sl;
    }
  } else if (kind < 1.5) {
    // ---------------------------------------------------------------- free scatter (head space)
    vec3 p3 = position;
    float sid = float(gl_VertexID) * 0.0173;
    if (uDrift.x > 0.0) {
      // slow drift in head space: two incommensurate sines per particle (no shared direction: it breathes, not scrolls)
      vec3 hp = vec3(hf_hash12(vec2(sid, 1.1)), hf_hash12(vec2(sid, 2.2)), hf_hash12(vec2(sid, 4.4)));
      float P1 = mix(uDrift.y, uDrift.z, hp.x), P2 = mix(uDrift.y, uDrift.z, hp.y);
      p3 += uDrift.x * vec3(sin(TAU * (uTime / P1 + hp.z)), sin(TAU * (uTime / P2 + hp.x)), 0.5 * sin(TAU * (uTime / (P1 + P2) + hp.y)));
    }
    vec4 world = modelMatrix * vec4(p3, 1.0);
    vec4 mv = viewMatrix * world;
    vec4 clip = projectionMatrix * mv;
    s = (clip.xy / clip.w * vec2(0.5, -0.5) + 0.5) * uViewport;
    vec2 h = (s - uOrigin) / uWpx;
    float envS = envelope(h);
    {
      float eSh = length(vec2(h.x / 0.49, (h.y - 0.07) / 0.71));
      hmW = smoothstep(0.72, 1.25, eSh);
      hmLag = smoothstep(0.9, 1.8, eSh);
    }
    ivec2 t = t0Texel(s);
    vec4 t1 = inT0(t) ? texelFetch(uT1, t, 0) : vec4(0.0);
    vec4 t0 = inT0(t) ? texelFetch(uT0, t, 0) : vec4(0.0);
    if (uSeamE.x > 0.0) {
      // seamless transition: the free scatter is densest right next to the head (never over the face core)
      float ln;
      float nf = seamNear(s, ln);
      float ts = seamTau(s, h, t0.a);
      envS = max(envS, uSeamE.x * uSeamC.x * nf * ts * mix(1.0, min(ln, 1.0), uSeamC.w));
    }
    float dens = envS * uEnvD.w * uEnvE.w;
    if (uVolA.x > 0.0 && inT0(t)) dens *= 1.0 - smoothstep(0.0, uVolA.z, texelFetch(uVol, t, 0).g);
    if (t0.g > 0.5 && -mv.z > t1.z + 0.01) dens = 0.0;   // behind the head
    if (t0.b > 0.15) dens = 0.0;                          // keep the mouth clear
    float pc = lifeTo(lifeP.x, aRand2.x < dens ? 1.0 : 0.0);
    lifeOut.x = pc;
    if (pc > 0.0) {
      on = true;
      float hot = step(aRand2.y, uEnvE.y * 0.8);
      vI = mix(mix(uEnvF.z, uEnvF.w, aRand2.z), mix(uHot.x, uHot.y, aRand2.w), hot) * lifeW(pc);
      vI *= 1.0 - smoothstep(0.15, 0.3, t0.b);   // an opening mouth clears at once (at rest nothing is there)
      vShape.y = mix(uHot.z + 0.01 + 0.05 * aRand.z, uHot.w + 0.01 + 0.05 * aRand.z, hot);
      vBloomW = uCineW.z;
      if (uCineW2.y > 0.5) {
        // depth cue: near particles grow + soften (bokeh-like, same energy), far ones dim; slow presence cycle
        float nz = smoothstep(0.08, 0.22, position.z);
        float g = 1.0 + uDepthK.x * nz;
        vShape.y *= g;
        vI /= pow(g, 1.4);
        vSoft = uDepthK.y * nz;
        vI *= mix(1.0, uDepthK.z, smoothstep(-0.35, -0.55, position.z));
        vI *= cycleEnv(sid);
      }
      if (aRand.x < uEnvE.z) {
        // hair filament along the flow: mostly vertical, curling outward lower down
        vShape.x = 5.0;
        vShape.w = 0.6 + 0.9 * aRand.z;
        float flowAng = 1.5708 + sign(h.x) * 0.35 * smoothstep(0.1, 1.0, h.y) + (aRand.w - 0.5) * 0.7;
        vArc = vec4(0.08 + 0.08 * aRand2.w, 2.0 + 2.5 * aRand.y, flowAng, aRand2.z * TAU);
        vI *= 0.85;
      } else {
        pickGlyph(uJit.w * 1.0, 0.3);
      }
      if (uEyeClr.x > 0.0) {
        // never over the eyes (no extra sparkles by the catchlights, no squiggle across an iris): fade out
        // inside the projected eye openings; the ellipse grows by the sprite's own reach (filament length)
        vec4 cpl = projectionMatrix * viewMatrix * modelMatrix * vec4(uPupilL, 1.0);
        vec4 cpr = projectionMatrix * viewMatrix * modelMatrix * vec4(uPupilR, 1.0);
        vec2 pl = (cpl.xy / cpl.w * vec2(0.5, -0.5) + 0.5) * uViewport;
        vec2 pr = (cpr.xy / cpr.w * vec2(0.5, -0.5) + 0.5) * uViewport;
        vec2 rr = uEyeClr.xy * uWpx + (vShape.x > 4.5 ? vShape.w : vShape.y) * uPitch;
        vI *= smoothstep(1.0, uEyeClr.z, min(length((s - pl) / rr), length((s - pr) / rr)));
        // and out of the nose base (nostril openings) and the lips: free sparkles there read as nostril glints
        vec2 hN = (s - uOrigin) / uWpx;
        vI *= smoothstep(0.7, 1.0, length((hN - vec2(0.0, 0.5)) / vec2(0.23, 0.16)));
        vI *= smoothstep(0.7, 1.0, length((hN - vec2(0.0, 0.72)) / vec2(0.24, 0.1)));
        // robust: no loose sparkle over a dark part of her own face (nostrils, under-nose shadow), whatever its coords
        vec4 fc = sampleCell(s);
        vI *= 1.0 - smoothstep(0.2, 0.55, fc.g) * (1.0 - smoothstep(0.08, 0.35, fc.r));
        vI *= 1.0 - hf_darkFace(s);
      }
    }
  } else if (kind < 2.5) {
    // ---------------------------------------------------------------- stars
    float kpar = mix(uStarK2.x, uStarK2.y, clamp(position.z - 0.5, 0.0, 1.0));
    s = mix(uStarO, uOrigin, kpar) + position.xy * uWpx;
    on = true;
    hmLag = -1.0;   // stars: their own lag share (uHarmE.w)
    vBloomW = uCineW.w;
    float cls = aRand2.x;
    if (cls < uStarK.x) { vI = (3.4 + 2.4 * aRand2.y) * (uStarK.z > 0.0 ? uStarK.z : 1.0); vShape.y = 0.26 + 0.1 * aRand.z; vHalo.xy = vec2(uHaloK.x * 1.5, uHaloK.z * 2.0); }
    else if (cls < uStarK.x + 0.33) { vI = 0.9 + 0.8 * aRand2.y; vShape.y = 0.2 + 0.04 * aRand.z; }
    else { vI = 0.25 + 0.5 * aRand2.y; vShape.y = 0.16 + 0.03 * aRand.z; vHalo.xy = vec2(uHaloK.x * 0.3, 0.0); }
    vI *= uStarK.y;
    vShape.x = 0.0;
    vShape.w = 2.0;
    vHalo.z = 0.03 * aRand2.w;
    vI *= 1.0 + 0.2 * sin(uTime * (0.9 + 2.2 * aRand.w) + aRand.y * TAU) * step(0.01, uFlicker);
    if (uCineW2.y > 0.5) {
      float sid2 = float(gl_VertexID) * 0.0173;
      float f = mix(uStarK3.x, uStarK3.y, hf_hash12(vec2(sid2, 6.6)));
      // two-tone twinkle (a slow swell + a faint faster shimmer), never below 1 - amplitude
      float tw = 0.7 * sin(TAU * (f * uTime + hf_hash12(vec2(sid2, 7.7)))) + 0.3 * sin(TAU * (2.7 * f * uTime + hf_hash12(vec2(sid2, 8.8))));
      vI *= 1.0 + uStarK2.z * tw;
      vI *= cycleEnv(sid2 + 0.5);
    }
    // stars never sparkle over a dark part of her face (nostril glints)
    { vec4 fcs = sampleCell(s); vI *= 1.0 - smoothstep(0.2, 0.55, fcs.g) * (1.0 - smoothstep(0.08, 0.35, fcs.r)); }
    vI *= 1.0 - hf_darkFace(s);
  } else if (kind > 3.5) {
    // ---------------------------------------------------------------- a5 proto: off-lattice dust specks
    vec2 ij = position.xy;
    float xl = ij.x * uPitch;
    float uL = xl / uWpx;
    vec2 sl = uAnchor + vec2(xl * (1.0 + uPitchWarp * uL * uL / 3.0), ij.y * uPitch);
    ivec2 tcc = t0Texel(sl);
    vec4 c0 = inT0(tcc) ? texelFetch(uT0, tcc, 0) : vec4(0.0);
    vec4 t1 = inT0(tcc) ? texelFetch(uT1, tcc, 0) : vec4(0.0);
    s = sl + t1.xy * uPitch;
    float keep = c0.g > 0.001 ? c0.a / c0.g : 0.0;
    float lit = c0.r * c0.g * keep;
    if (uVolA.x > 0.0 && inT0(tcc)) { vec4 vc = texelFetch(uVol, tcc, 0); lit = max(lit, vc.r / max(vc.g, 1e-4) * uVolD.y * min(1.0, vc.g * 1.5)); }
    float pres = smoothstep(0.02, 0.12, lit) * (1.0 - smoothstep(0.08, 0.3, c0.b)) * (1.0 - t1.w);
    {
      vec2 hd = (sl - uOrigin) / uWpx;
      hmW = smoothstep(0.72, 1.25, length(vec2(hd.x / 0.49, (hd.y - 0.07) / 0.71)));
      hmG = (1.0 - t1.w) * (1.0 - smoothstep(0.04, 0.2, c0.b));
    }
    float pd = lifeTo(lifeP.x, aRand2.x < pres ? 1.0 : 0.0);
    lifeOut.x = pd;
    if (pd > 0.0 && uDotC.x > 0.0) {
      on = true;
      vI = uDotC.x * pow(max(lit, 0.0), 0.8) * (0.15 + 0.85 * aRand2.y * aRand2.y) * lifeW(pd);
      // no dust sparkle over a dark part of her own face (nostrils, under-nose shadow)
      vI *= 1.0 - smoothstep(0.2, 0.55, c0.g) * (1.0 - smoothstep(0.08, 0.35, c0.r));
      vI *= 1.0 - hf_darkFace(s);
      vShape = vec4(0.0, mix(uDotC.y, uDotC.z, aRand.z), 0.0, 2.0);
      vHalo = vec4(uHaloK.x * 0.5, 0.0, 0.0, 0.0);
      if (aRand.x < 0.3) { vShape.x = 4.0; vArc = vec4(0.04 + 0.04 * aRand2.z, 8.0 + 6.0 * aRand2.w, aRand.w * TAU, aRand2.z * TAU); vShape.w = 0.1 + 0.08 * aRand.y; }
    }
  } else {
    // ---------------------------------------------------------------- catchlights
    bool secondary = position.y > 0.5;
    hmW = 0.0; hmG = 0.0;   // catchlights stay in the pupils
    vec3 pup = position.x < 0.5 ? uPupilL : uPupilR;
    vec4 clip = projectionMatrix * viewMatrix * modelMatrix * vec4(pup, 1.0);
    s = (clip.xy / clip.w * vec2(0.5, -0.5) + 0.5) * uViewport;
    vec2 off = secondary ? uCatchOff.zw : uCatchOff.xy;
    s += vec2(off.x, -off.y) * uWpx;
    float f = secondary ? uCatch.z : 1.0;
    on = uCatch.w > 0.001 && f > 0.001;
    vI = uCatch.y * f * uCatch.w;
    vShape = vec4(0.0, uCatch.x * mix(1.0, f, 0.8), 0.0, 2.0);
    vHalo.xy = vec2(uHaloK.x * 1.3, uHaloK.z * 1.5);
    vBloomW = uCineW2.x;
  }

#ifdef HF_LIFE
  // life pass: write this particle's new state into its texel (a 1 px point) instead of drawing the sprite
  int lw2 = int(uLifeT.z);
  vLife = lifeOut;
  gl_Position = vec4((vec2(float(gl_VertexID % lw2), float(gl_VertexID / lw2)) + 0.5) / uLifeT.zw * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
  return;
#endif
  if (uHarmD.x > 0.5 && on) {
    // ---- a5 harmony: one medium. (1) shared slow curl flow: the curl of a stream function made of four slow
    // travelling waves (divergence free: neighbours move together, nothing bunches or tears); the face core moves
    // sub-cell and never on the eyes / mouth. (2) coherent dot-size / brightness waves through field and face.
    // (3) ripples from the face's own motion. (4) sympathetic lag of the free scatter / stars.
    vec2 hh = (s - uOrigin) / uWpx;
    float T = uTime * uHarmA.w;
    vec2 q = hh * uHarmA.z;
    vec2 fl = vec2(0.0);
    { vec2 k = vec2(0.93, 0.37);  fl += 0.52 * cos(dot(k, q) + 0.41 * T + 0.3) * vec2(k.y, -k.x); }
    { vec2 k = vec2(-0.45, 1.05); fl += 0.46 * cos(dot(k, q) - 0.53 * T + 2.1) * vec2(k.y, -k.x); }
    { vec2 k = vec2(1.31, -0.72); fl += 0.30 * cos(dot(k, q) + 0.67 * T + 4.0) * vec2(k.y, -k.x); }
    { vec2 k = vec2(-1.62, -1.1); fl += 0.18 * cos(dot(k, q) - 0.83 * T + 5.3) * vec2(k.y, -k.x); }
    float faceAmp = uHarmA.y * uPitch * hmG;
    vec2 disp = fl * mix(faceAmp, uHarmA.x * uWpx, hmW);
    // size / brightness waves (periods ~4-7 s, wavelength ~ the head), speech swells them a little
    vec2 q2 = hh * uHarmB.w;
    float bw = (sin(dot(vec2(0.82, 0.57), q2) - 1.05 * uTime + 0.7)
              + sin(dot(vec2(-0.64, 0.77), q2) - 1.37 * uTime + 2.9)
              + 0.7 * sin(dot(vec2(0.2, -0.98), q2 * 1.6) - 1.63 * uTime + 4.6)) / 2.7;
    float E = uHarmD.w;
    float sA = mix(uHarmB.y * (0.4 + 0.6 * hmG), uHarmB.x, hmW) * (1.0 + uHarmE.y * E);
    // ripples: a soft outward push (and a brief swell) travelling out from the mouth / eyes / brows
    float rip = 0.0;
    vec2 rd = vec2(0.0);
    for (int i = 0; i < 6; i++) {
      vec4 P = uPulse[i];
      if (P.w <= 0.0) continue;
      vec2 d = s - P.xy;
      float dist = length(d) + 1e-3;
      float x = (dist - P.z * uHarmC.y * uWpx) / (uHarmC.z * uWpx);
      float g = P.w * exp(-x * x) * exp(-P.z / uHarmC.w) * smoothstep(0.0, 0.25, P.z);
      rd += d / dist * g;
      rip += g;
    }
    disp += rd * uHarmC.x * uWpx * mix(0.08 * hmG, 1.0, hmW);
    // sympathetic lag: the free scatter trails the head on a soft spring (stars: their own share)
    float lagK = hmLag < 0.0 ? uHarmE.w : hmLag * uHarmE.z;
    disp -= uHarmD.yz * lagK;
    s += disp;
    float sz = 1.0 + sA * bw + uHarmF.x * rip * mix(0.2 * hmG, 1.0, hmW);
    vShape.y *= max(sz, 0.3);
    vI *= max(1.0 + sA * uHarmB.z * bw + uHarmF.y * rip * hmW, 0.2) * (1.0 + uHarmE.x * E * hmW);
  }
  if (!on || vI < 0.004) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  // sprite extent: glyph + halo reach (bright dots carry a wider glow)
  vHalo.x += uHaloK.y * smoothstep(1.0, 2.2, vI) * step(0.001, vHalo.x);
  float hv = min(vI, uGlyph.w) * (vHalo.x + 2.0 * vHalo.y);
  float reach = 0.2 + 1.1 * smoothstep(0.02, 0.9, hv);
  float hs = max(vShape.y * (vShape.x < 0.5 ? mix(1.2, 2.3, uDotA.x) : 1.2), vShape.x > 5.5 ? 2.0 * vShape.w : (vShape.x > 4.5 ? vShape.w + 0.12 : 0.0)) + reach;
  vShape.z = hs;
  gl_Position = vec4(toNdc(s), 0.0, 1.0);
  gl_PointSize = 2.0 * hs * uPitch;
}
`;

export const POINTS_FRAG = /* glsl */ `
precision highp float;
uniform float uPitch;
uniform vec4 uToneK;     // toneK, edgeSoft, ringStroke, haloSigma
uniform float uTailLen;
uniform float uToneMax;
uniform vec3 uTintMid;
uniform vec3 uTintPeak;
uniform vec3 uTintHalo;
uniform vec4 uGlyphF;    // halo cap (HDR), ring min radius (p), unused, unused
uniform vec4 uDotA;
uniform vec4 uBright;    // a5 bright pass into HDR alpha: threshold (HDR), knee, on, unused
varying float vBloomW;
varying float vSoft;
varying float vI;
varying vec4 vShape;
varying vec4 vArc;
varying vec4 vHalo;

float stroke(float d, float aa) { return 1.0 - smoothstep(-aa, aa, d); }

void main() {
  float hs = vShape.z;
  vec2 q = (gl_PointCoord - 0.5) * 2.0 * hs;
  float rho = length(q);
  float g = vShape.x;
  float ang = atan(q.y, q.x);
  // irregular outline: radius modulated by 2nd + 3rd harmonics (per-dot phases from the arc params)
  float wob = 1.0 + vHalo.z * cos(2.0 * ang - vArc.x * 1.7) + vHalo.w * cos(3.0 * ang + vArc.y * 2.3);
  float r = vShape.y * wob;
  float aa = uToneK.y + 0.5 / uPitch + vSoft;
  float w = uToneK.z;
  float core;
  if (g < 0.5) {
    float n = vShape.w;
    vec2 aq = abs(q) + 1e-5;
    float se = pow(pow(aq.x, n) + pow(aq.y, n), 1.0 / n) / wob;
    float x2 = se / max(vShape.y, 1e-3);
    core = (1.0 - smoothstep(vShape.y - aa, vShape.y + aa, se)) * (1.0 - 0.3 * x2 * x2);
    if (uDotA.x > 0.0) {
      // a5 proto: generalized-Gaussian point; vShape.y = its half-max radius
      float sg = max(vShape.y, 0.02) / pow(0.6931, 1.0 / uDotA.y);
      core = mix(core, exp(-pow(se / sg, uDotA.y)), uDotA.x);
    }
  } else if (g > 5.5) {
    // a5 proto: streak = soft point + a thin horizontal smear with exponential falloff
    // anisotropic generalized Gaussian: half-max half-length vShape.w along x, half-max radius vShape.y across
    float k0 = pow(0.6931, 1.0 / uDotA.y);
    vec2 aq2 = vec2(q.x / max(vShape.w, 0.05), q.y / max(vShape.y * 0.8, 0.02)) * k0;
    core = exp(-pow(length(aq2), uDotA.y));
  } else if (g < 3.5) {
    r = max(r * 1.12, uGlyphF.y * wob);
    float rc = max(r - 0.5 * w, 0.5 * w + 0.03);
    core = stroke(abs(rho - rc) - 0.5 * w, aa);
    if (g < 1.5) core = max(core, vArc.z * (1.0 - smoothstep(rc - 0.5 * w - aa, rc - 0.5 * w + aa, rho)));
    if (g > 2.5) {
      float da = mod(ang - vArc.x + 12.566370, 6.2831853);
      float span = vArc.y;
      core *= smoothstep(-0.05, 0.3, min(da, span - da)) * step(da, span + 0.25);
    }
  } else {
    float c = cos(vArc.z), sn = sin(vArc.z);
    vec2 lq = vec2(c * q.x + sn * q.y, -sn * q.x + c * q.y);
    float halfLen = vShape.w;
    float yc = vArc.x * sin(vArc.y * lq.x + vArc.w);
    float slope = vArc.x * vArc.y * cos(vArc.y * lq.x + vArc.w);
    float d = abs(lq.y - yc) / sqrt(1.0 + slope * slope) - 0.5 * w * (g > 4.5 ? 1.2 : 1.0);
    float endF = 1.0 - smoothstep(halfLen - 0.1, halfLen + 0.02, abs(lq.x));
    core = stroke(d, aa) * endF;
  }
  float sig = uToneK.w;
  float win = 1.0 - smoothstep(0.7 * hs, hs, rho);
  float halo = (vHalo.x * exp(-rho * rho / (2.0 * sig * sig)) + vHalo.y * exp(-rho / uTailLen)) * win;
  // linear HDR energy; the output pass blooms + tone-maps the sum once (per channel, so the mint
  // mid-tone tint saturates to neutral white in clipped cores)
  // the halo is capped: a hot dot glows like a warm one, so a bright ridge stays discrete dots, not a bar
  vec3 e = vI * core * uTintMid + min(vI, uGlyphF.x) * halo * uTintHalo;
  if (e.g < 0.0015) discard;
  float bsrc = 1.0;
  if (uBright.z > 0.5) {
    // a5: soft-knee bright pass of this fragment's own energy (before the mip chain)
    float l = dot(e, vec3(0.2126, 0.7152, 0.0722));
    float kn = max(uBright.y, 1e-4);
    float sk = clamp(l - uBright.x + kn, 0.0, 2.0 * kn);
    bsrc = vBloomW * max(sk * sk / (4.0 * kn), l - uBright.x);
  }
  gl_FragColor = vec4(e, bsrc);
}
`;

// life pass fragment: the particle's new state (see HF_LIFE in POINTS_VERT)
export const LIFE_FRAG = /* glsl */ `
precision highp float;
varying vec4 vLife;
void main() { gl_FragColor = vLife; }
`;

export const GHOST_QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const GHOST_QUAD_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
uniform sampler2D uGhost;
uniform float uGhostLod;
uniform float uLodOffQ;  // added to every ghost blur level (see uLodOff)
uniform float uToneKq;
uniform vec3 uTintMist;
uniform float uDither;
uniform int uView;       // 0 final, 2 mask
uniform vec2 uOriginQ;   // projected head origin, device px (y down)
uniform vec2 uViewportQ;
uniform float uWpxQ;
uniform vec4 uMistK;     // amp, r0, r1, left/right balance
uniform vec4 uHazeK;     // haze lod, cloud amount, cloud scale (1/W), glow share (lod + 2)
uniform vec4 uSeamQ;     // seamless transition floor: amp, cloud, lit share, wide-mask level of full strength
uniform vec4 uSeamQ2;    // core mask lo, hi, boundary noise amp, noise freq (same field as the lattice)
uniform vec4 uSeamE;     // .y feature ellipse centre v
uniform vec4 uSeamF;     // lit lo, hi, feature ellipse rx, ry
uniform sampler2D uVolQ; // a3 volume target
uniform vec4 uVolQK;     // volume haze: amp, gamma, lod, cloud
uniform vec4 uVolQK2;    // volume haze knee: lit level above .x compresses softly toward .y (off: .x huge), unused x2
uniform vec2 uT0OriginQ; // T0 / volume raster origin (device px, y down)
uniform float uT0TexelQ;
uniform vec2 uT0SizeQ;
varying vec2 vUv;
void main() {
  if (uView == 2) { gl_FragColor = vec4(vec3(textureLod(uGhost, vUv, uGhostLod + uLodOffQ).g), 1.0); return; }
  vec2 sp = vec2(gl_FragCoord.x, uViewportQ.y - gl_FragCoord.y);
  vec2 h = (sp - uOriginQ) / uWpxQ;
  // R: skin haze (the lit face under the dots, proportional to brightness) blurred to cell scale and
  //    broken into clouds, like the mottled floor between ref 2's dots; B: sharp eye / lid / mouth ghost
  // two scales: a lightly blurred photo floor (keeps the nose wing, lips, cheek shapes) + a wider glow
  float haze = mix(textureLod(uGhost, vUv, uHazeK.x + uLodOffQ).r, textureLod(uGhost, vUv, uHazeK.x + 2.0 + uLodOffQ).r, uHazeK.w);
  float cl0 = 0.25 + 1.5 * hf_fbm(vec3(h * uHazeK.z, 4.1));   // one cloud field for the face, seam and volume floors
  float cloud = mix(1.0, cl0, uHazeK.y);
  float x = haze * cloud + textureLod(uGhost, vUv, uGhostLod + uLodOffQ).b;
  // faint fbm mist inside the head + hair envelope (zero beyond ~1.15 W)
  float rr = length((h - vec2(-0.05, 0.08)) * vec2(1.0, 0.82));
  float side = mix(1.0, uMistK.w, smoothstep(-0.3, 0.3, h.x));
  x += uMistK.x * side * (1.0 - smoothstep(uMistK.y, uMistK.z, rr)) * (0.2 + 1.6 * hf_fbm(vec3(h * 3.5, 1.7)));
  if (uSeamQ.x > 0.0) {
    // seamless transition: the inter-dot floor continues past the face edge as a clouded mist that thins
    // outward with the particle field (zero in the face core: the approved face floor is untouched)
    vec4 g5 = textureLod(uGhost, vUv, 5.0 + uLodOffQ), g6 = textureLod(uGhost, vUv, 6.0 + uLodOffQ), g7 = textureLod(uGhost, vUv, 7.0 + uLodOffQ);
    float nz = hf_fbm(vec3(h * uSeamQ2.w, 6.1)) - 0.5;
    float mc = 0.5 * (textureLod(uGhost, vUv, 4.0 + uLodOffQ).g + g5.g) + uSeamQ2.z * nz;
    float lw = 0.5 * (g5.a + g6.a) * (1.0 + 2.0 * uSeamQ2.z * nz);
    float ef = length(vec2(h.x / uSeamF.z, (h.y - uSeamE.y) / uSeamF.w));
    float prot = (1.0 - smoothstep(0.9, 1.1, ef)) * step(0.5, textureLod(uGhost, vUv, 2.0 + uLodOffQ).g);
    float core = smoothstep(uSeamQ2.x, uSeamQ2.y, mc) * mix(smoothstep(uSeamF.x, uSeamF.y, lw), 1.0, prot);
    float nearQ = smoothstep(0.0, uSeamQ.w, 0.5 * (g6.g + g7.g));
    float litQ = clamp((g6.a + g7.a) / max(g6.g + g7.g, 0.1), 0.0, 1.5);
    float cl = mix(1.0, cl0, uSeamQ.y);
    x += uSeamQ.x * (1.0 - core) * nearQ * nearQ * mix(1.0, litQ, uSeamQ.z) * cl;
  }
  if (uVolQK.x > 0.0) {
    // a3: the volume's inter-dot floor (lit hair mass blurred to cell scale, clouded like the face haze)
    vec2 tc = (sp - uT0OriginQ) / uT0TexelQ;
    vec4 tv = textureLod(uVolQ, vec2(tc.x / uT0SizeQ.x, 1.0 - tc.y / uT0SizeQ.y), uVolQK.z);
    float cl = mix(1.0, cl0, uVolQK.w);
    float vr = max(tv.r, 0.0);
    // knee: the crown pole, where many shells overlap, glows like the rest of the hair mass (no hot lobes)
    if (vr > uVolQK2.x) vr = uVolQK2.x + (vr - uVolQK2.x) / (1.0 + (vr - uVolQK2.x) / max(uVolQK2.y - uVolQK2.x, 1e-4));
    x += uVolQK.x * pow(vr, uVolQK.y) * cl;
  }
  gl_FragColor = vec4(uTintMist * x, 0.0);
}
`;

export const DEBUG_T0_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform vec4 uChan;
uniform float uScale;
varying vec2 vUv;
void main() { vec4 c = texture(uTex, vUv); gl_FragColor = vec4(vec3(dot(c, uChan) * uScale), 1.0); }
`;
