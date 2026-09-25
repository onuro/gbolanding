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

varying float vI;
varying vec4 vShape;     // glyph, radius (p), sprite half-size (p), superN | stroke half-length
varying vec4 vArc;       // glyph params
varying vec4 vHalo;      // halo amp, tail amp, distortion amp2, distortion amp3

const float TAU = 6.2831853;

vec2 toNdc(vec2 s) { return vec2(s.x / uViewport.x * 2.0 - 1.0, 1.0 - s.y / uViewport.y * 2.0); }

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
  return textureLod(uMask, uv, lod).g;
}
vec4 ghostAt(vec2 s, float lod) {
  vec2 uv = vec2(s.x / uViewport.x, 1.0 - s.y / uViewport.y);
  return textureLod(uMask, uv, lod);
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

// Expected survivors per lattice cell for the head + long-hair envelope; h = head-relative W, y down.
float envelope(vec2 h) {
  // viewer-left / right parameters blend across the centre (no seam at x = 0)
  float tr = smoothstep(-0.3, 0.3, h.x);
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
  // clumping + hard radial fade
  dens *= 0.45 + 1.1 * hf_fbm(vec3(h * 6.0, 2.3));
  float r = length(h - vec2(-0.04, 0.1));
  return dens * (1.0 - smoothstep(uEnvC.x, uEnvC.y, r));
}

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
  vec2 s = vec2(-1e4);
  bool on = false;

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
    float keepP = pow(clamp(keep * cov, 0.0, 1.0), uRow.z) * mix(min(1.0, envelope(h)), 1.0, rim);
    bool faceKeep = aRand2.x < keepP;
    L *= mix(0.55, 1.0, keep);
    float a = smoothstep(uXfer.x, uXfer.y, L);
    float I = uXfer.z * pow(max(L, 0.0), uXfer.w) * a;
    I = 3.2 * (1.0 - exp(-I / 3.2));
    float r = min(uRad.x + uRad.y * smoothstep(0.08, 0.65, L) + uRad.z * smoothstep(0.65, 1.4, L), uRad.w);
    r *= mix(uGlyph2.z, 1.0, smoothstep(0.03, 0.3, L));   // the dimmest dots shrink (tiny specks, not rings)
    I *= 1.0 + uJit.y * (2.0 * aRand.y - 1.0);
    r *= 1.0 + uJit.x * (2.0 * aRand.z - 1.0);
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
    bool faceVis = a > 0.02 && faceKeep;
    bool field = false;
    if (tau > 0.0) field = hf_hash12(ij * 0.917 + 23.7) < (faceVis ? tau : min(1.0, tau * uSeamA.w));

    if (field) {
      float w = tau;
      // far field = the approved envelope survivors; near field hugs the head, seeded by the nearby lit skin
      float dens = max(envelope(h), uSeamC.x * nearF * mix(1.0, min(litN, 1.0), uSeamC.w));
      dens *= 1.0 - smoothstep(0.08, 0.3, mouth);
      dens *= 1.0 - 0.8 * eye;
      if (faceVis) dens = mix(1.0, dens, w);
      float rowD = abs(h.y - uRow.y) * uWpx / uPitch;
      float row = uRow.x * (1.0 - smoothstep(0.45, 0.55, rowD)) * (1.0 - smoothstep(1.05, 1.3, abs(h.x))) * (1.0 - step(0.3, cov));
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
      vI = I;
      vShape.y = r;
      pickGlyph(ringShare(L), L);
      s += (vec2(hf_hash12(ij + 1.7), hf_hash12(ij + 9.2)) - 0.5) * 0.06 * uPitch;
    } else {
      // survivors of the dissolve (grid-aligned, ref 2 style) + the lit eye-level row
      // where the face owns the cell (lit skin that was not dissolved) only strays survive;
      // where the face dissolved (keep low) or outside the head, the envelope continues the lattice
      // the face only owns cells where it would show a visible dot: on the dark flanks (temples, ears,
      // jaw sides) and wherever face dots dissolved, the envelope continues the lattice (no gutter/outline)
      // interior dark features (sockets, nose flanks, mouth) stay dark: only sparse dim strays there;
      // the envelope continues the lattice only where the face itself dissolves (flanks, crown, neck)
      float own = smoothstep(0.45, 0.85, keep * cov) * (faceKeep ? 1.0 : 0.0);
      float dens = mix(envelope(h), uEnvD.z, own) * (1.0 - envSup);
      dens *= 1.0 - smoothstep(0.08, 0.3, mouth);
      dens *= 1.0 - 0.8 * eye;
      float rowD = abs(h.y - uRow.y) * uWpx / uPitch;
      float row = uRow.x * (1.0 - smoothstep(0.45, 0.55, rowD)) * (1.0 - smoothstep(1.05, 1.3, abs(h.x))) * (1.0 - step(0.3, cov));
      float pRow = row * 0.8;
      float pSurv = max(dens, pRow);
      float u2 = hf_hash12(ij * 1.37 + 5.1);
      if (u2 < pSurv) {
        on = true;
        float hot = step(aRand2.y, uEnvE.y);
        float Is = mix(uEnvF.z, uEnvF.w, aRand2.z * aRand2.z);
        Is = mix(Is, mix(uHot.x, uHot.y, aRand2.w), hot);
        bool isRow = u2 < pRow && pRow > dens;
        if (isRow) Is = 0.5 + 0.9 * aRand2.z;
        Is *= mix(1.0, 0.3, own);   // strays over the face are dim specks, not glitter
        vI = Is * flick;
        vShape.y = mix(uHot.z + 0.06 * aRand.z, uHot.w + 0.06 * aRand.z, max(hot, isRow ? 0.6 : 0.0));
        float c = maskAt(sl, 3.5);
        vec2 jit = (vec2(hf_hash12(ij + 7.1), hf_hash12(ij + 3.3)) * 2.0 - 1.0) * uEnvE.x * (1.0 - c) * uPitch;
        s = sl + jit;
        pickGlyph(uJit.w * (isRow ? 0.4 : (hot > 0.5 ? 0.3 : 1.2)), 0.3);
      }
    }
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
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vec4 clip = projectionMatrix * mv;
    s = (clip.xy / clip.w * vec2(0.5, -0.5) + 0.5) * uViewport;
    vec2 h = (s - uOrigin) / uWpx;
    float envS = envelope(h);
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
    if (aRand2.x < dens) {
      on = true;
      float hot = step(aRand2.y, uEnvE.y * 0.8);
      vI = mix(mix(uEnvF.z, uEnvF.w, aRand2.z), mix(uHot.x, uHot.y, aRand2.w), hot);
      vShape.y = mix(uHot.z + 0.01 + 0.05 * aRand.z, uHot.w + 0.01 + 0.05 * aRand.z, hot);
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
    }
  } else if (kind < 2.5) {
    // ---------------------------------------------------------------- stars
    s = uOrigin + position.xy * uWpx;
    on = true;
    float cls = aRand2.x;
    if (cls < uStarK.x) { vI = 3.4 + 2.4 * aRand2.y; vShape.y = 0.26 + 0.1 * aRand.z; vHalo.xy = vec2(uHaloK.x * 1.5, uHaloK.z * 2.0); }
    else if (cls < uStarK.x + 0.33) { vI = 0.9 + 0.8 * aRand2.y; vShape.y = 0.2 + 0.04 * aRand.z; }
    else { vI = 0.25 + 0.5 * aRand2.y; vShape.y = 0.16 + 0.03 * aRand.z; vHalo.xy = vec2(uHaloK.x * 0.3, 0.0); }
    vI *= uStarK.y;
    vShape.x = 0.0;
    vShape.w = 2.0;
    vHalo.z = 0.03 * aRand2.w;
    vI *= 1.0 + 0.2 * sin(uTime * (0.9 + 2.2 * aRand.w) + aRand.y * TAU) * step(0.01, uFlicker);
  } else {
    // ---------------------------------------------------------------- catchlights
    bool secondary = position.y > 0.5;
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
  float hs = max(vShape.y * 1.2, vShape.x > 4.5 ? vShape.w + 0.12 : 0.0) + reach;
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
  float aa = uToneK.y + 0.5 / uPitch;
  float w = uToneK.z;
  float core;
  if (g < 0.5) {
    float n = vShape.w;
    vec2 aq = abs(q) + 1e-5;
    float se = pow(pow(aq.x, n) + pow(aq.y, n), 1.0 / n) / wob;
    float x2 = se / max(vShape.y, 1e-3);
    core = (1.0 - smoothstep(vShape.y - aa, vShape.y + aa, se)) * (1.0 - 0.3 * x2 * x2);
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
  gl_FragColor = vec4(e, 1.0);
}
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
uniform vec2 uT0OriginQ; // T0 / volume raster origin (device px, y down)
uniform float uT0TexelQ;
uniform vec2 uT0SizeQ;
varying vec2 vUv;
void main() {
  if (uView == 2) { gl_FragColor = vec4(vec3(textureLod(uGhost, vUv, uGhostLod).g), 1.0); return; }
  vec2 sp = vec2(gl_FragCoord.x, uViewportQ.y - gl_FragCoord.y);
  vec2 h = (sp - uOriginQ) / uWpxQ;
  // R: skin haze (the lit face under the dots, proportional to brightness) blurred to cell scale and
  //    broken into clouds, like the mottled floor between ref 2's dots; B: sharp eye / lid / mouth ghost
  // two scales: a lightly blurred photo floor (keeps the nose wing, lips, cheek shapes) + a wider glow
  float haze = mix(textureLod(uGhost, vUv, uHazeK.x).r, textureLod(uGhost, vUv, uHazeK.x + 2.0).r, uHazeK.w);
  float cloud = mix(1.0, 0.25 + 1.5 * hf_fbm(vec3(h * uHazeK.z, 4.1)), uHazeK.y);
  float x = haze * cloud + textureLod(uGhost, vUv, uGhostLod).b;
  // faint fbm mist inside the head + hair envelope (zero beyond ~1.15 W)
  float rr = length((h - vec2(-0.05, 0.08)) * vec2(1.0, 0.82));
  float side = mix(1.0, uMistK.w, smoothstep(-0.3, 0.3, h.x));
  x += uMistK.x * side * (1.0 - smoothstep(uMistK.y, uMistK.z, rr)) * (0.2 + 1.6 * hf_fbm(vec3(h * 3.5, 1.7)));
  if (uSeamQ.x > 0.0) {
    // seamless transition: the inter-dot floor continues past the face edge as a clouded mist that thins
    // outward with the particle field (zero in the face core: the approved face floor is untouched)
    vec4 g5 = textureLod(uGhost, vUv, 5.0), g6 = textureLod(uGhost, vUv, 6.0), g7 = textureLod(uGhost, vUv, 7.0);
    float nz = hf_fbm(vec3(h * uSeamQ2.w, 6.1)) - 0.5;
    float mc = 0.5 * (textureLod(uGhost, vUv, 4.0).g + g5.g) + uSeamQ2.z * nz;
    float lw = 0.5 * (g5.a + g6.a) * (1.0 + 2.0 * uSeamQ2.z * nz);
    float ef = length(vec2(h.x / uSeamF.z, (h.y - uSeamE.y) / uSeamF.w));
    float prot = (1.0 - smoothstep(0.9, 1.1, ef)) * step(0.5, textureLod(uGhost, vUv, 2.0).g);
    float core = smoothstep(uSeamQ2.x, uSeamQ2.y, mc) * mix(smoothstep(uSeamF.x, uSeamF.y, lw), 1.0, prot);
    float nearQ = smoothstep(0.0, uSeamQ.w, 0.5 * (g6.g + g7.g));
    float litQ = clamp((g6.a + g7.a) / max(g6.g + g7.g, 0.1), 0.0, 1.5);
    float cl = mix(1.0, 0.25 + 1.5 * hf_fbm(vec3(h * uHazeK.z, 4.1)), uSeamQ.y);
    x += uSeamQ.x * (1.0 - core) * nearQ * nearQ * mix(1.0, litQ, uSeamQ.z) * cl;
  }
  if (uVolQK.x > 0.0) {
    // a3: the volume's inter-dot floor (lit hair mass blurred to cell scale, clouded like the face haze)
    vec2 tc = (sp - uT0OriginQ) / uT0TexelQ;
    vec4 tv = textureLod(uVolQ, vec2(tc.x / uT0SizeQ.x, 1.0 - tc.y / uT0SizeQ.y), uVolQK.z);
    float cl = mix(1.0, 0.25 + 1.5 * hf_fbm(vec3(h * uHazeK.z, 4.1)), uVolQK.w);
    x += uVolQK.x * pow(max(tv.r, 0.0), uVolQK.y) * cl;
  }
  gl_FragColor = vec4(uTintMist * x, 1.0);
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
