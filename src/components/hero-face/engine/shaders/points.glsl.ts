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

uniform vec4 uEnvA;      // plateauL, plateauR, efoldL, efoldR
uniform vec4 uEnvB;      // topV, topEfold, chinV, chinEfold
uniform vec4 uEnvC;      // hardFade0, hardFade1, hairBottom, hairWidth
uniform vec4 uEnvD;      // hairFlare, hairDensity, strayIn, scatterShare
uniform vec4 uEnvE;      // survivorJitter, hotShare, filamentShare, scatterNorm
uniform vec4 uEnvF;      // densL, densR, survivor brightness lo, hi
uniform vec4 uRow;       // eyeRow strength, eyeRowDy, keepPow, unused
uniform vec4 uStarK;     // saturated share, star gain, unused, unused

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

float maskAt(vec2 s, float lod) {
  vec2 uv = vec2(s.x / uViewport.x, 1.0 - s.y / uViewport.y);
  return textureLod(uMask, uv, lod).g;
}

// Expected survivors per lattice cell for the head + long-hair envelope; h = head-relative W, y down.
float envelope(vec2 h) {
  bool left = h.x < 0.0;
  float plateau = left ? uEnvA.x : uEnvA.y;
  float efold = left ? uEnvA.z : uEnvA.w;
  float base = left ? uEnvF.x : uEnvF.y;
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

// glyph choice: ringP = share of non-disc glyphs; bright dots stay mostly filled discs
void pickGlyph(float ringP) {
  float gsel = aRand.x;
  float g = 0.0;
  if (gsel < ringP) {
    float k = gsel / ringP;
    g = k < 0.45 ? 1.0 : (k < 0.68 ? 2.0 : (k < 0.9 ? 3.0 : 4.0));
  }
  vShape.x = g;
  vShape.w = uJit.z;
  if (g > 3.5) {
    // squiggle fragment inside the cell
    vArc = vec4(0.05 + 0.06 * aRand2.x, 7.0 + 6.0 * aRand2.y, aRand.w * TAU, aRand2.z * TAU);
    vShape.w = 0.22 + 0.14 * aRand.z;
  } else {
    // arc start / span; donut fill level
    vArc = vec4(aRand.w * TAU, (0.36 + 0.46 * aRand2.x) * TAU, 0.35 + 0.3 * aRand2.y, 0.0);
  }
  // blob irregularity (2nd / 3rd harmonic of the outline)
  float irr = uHaloK.w;
  vHalo.z = irr * (0.35 + 0.65 * aRand2.w) * 0.16;
  vHalo.w = irr * aRand.y * 0.1;
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

    // probabilistic dissolve of the face dots toward the head outline (ears, crown, neck, grazing)
    float keepP = pow(clamp(keep * cov, 0.0, 1.0), uRow.z);
    bool faceKeep = aRand2.x < keepP;
    L *= mix(0.55, 1.0, keep);
    float a = smoothstep(uXfer.x, uXfer.y, L);
    float I = uXfer.z * pow(max(L, 0.0), uXfer.w) * a;
    I = 3.2 * (1.0 - exp(-I / 3.2));
    float r = min(uRad.x + uRad.y * smoothstep(0.08, 0.65, L) + uRad.z * smoothstep(0.65, 1.2, L), uRad.w);
    I *= 1.0 + uJit.y * (2.0 * aRand.y - 1.0);
    r *= 1.0 + uJit.x * (2.0 * aRand.z - 1.0);
    float flick = 1.0 + uFlicker * sin(uTime * (3.0 + 3.0 * aRand2.w) + aRand2.z * TAU);
    I *= flick;

    if (a > 0.02 && faceKeep) {
      on = true;
      vI = I;
      vShape.y = r;
      pickGlyph(uJit.w * mix(1.5, 0.35, smoothstep(0.45, 1.05, L)));
      s += (vec2(hf_hash12(ij + 1.7), hf_hash12(ij + 9.2)) - 0.5) * 0.06 * uPitch;
    } else {
      // survivors of the dissolve (grid-aligned, ref 2 style) + the lit eye-level row
      // where the face owns the cell (lit skin that was not dissolved) only strays survive;
      // where the face dissolved (keep low) or outside the head, the envelope continues the lattice
      float own = clamp(keep * cov * 1.6, 0.0, 1.0);
      float dens = mix(envelope(h), uEnvD.z, own);
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
        Is = mix(Is, 2.0 + 1.6 * aRand2.w, hot);
        bool isRow = u2 < pRow && pRow > dens;
        if (isRow) Is = 0.5 + 0.9 * aRand2.z;
        vI = Is * flick;
        vShape.y = mix(0.15 + 0.06 * aRand.z, 0.24 + 0.06 * aRand.z, max(hot, isRow ? 0.6 : 0.0));
        float c = maskAt(sl, 3.5);
        vec2 jit = (vec2(hf_hash12(ij + 7.1), hf_hash12(ij + 3.3)) * 2.0 - 1.0) * uEnvE.x * (1.0 - c) * uPitch;
        s = sl + jit;
        pickGlyph(uJit.w * (isRow ? 0.4 : (hot > 0.5 ? 0.3 : 1.2)));
      }
    }
  } else if (kind < 1.5) {
    // ---------------------------------------------------------------- free scatter (head space)
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vec4 clip = projectionMatrix * mv;
    s = (clip.xy / clip.w * vec2(0.5, -0.5) + 0.5) * uViewport;
    vec2 h = (s - uOrigin) / uWpx;
    float dens = envelope(h) * uEnvD.w * uEnvE.w;
    ivec2 t = t0Texel(s);
    vec4 t1 = inT0(t) ? texelFetch(uT1, t, 0) : vec4(0.0);
    vec4 t0 = inT0(t) ? texelFetch(uT0, t, 0) : vec4(0.0);
    if (t0.g > 0.5 && -mv.z > t1.z + 0.01) dens = 0.0;   // behind the head
    if (t0.b > 0.15) dens = 0.0;                          // keep the mouth clear
    if (aRand2.x < dens) {
      on = true;
      float hot = step(aRand2.y, uEnvE.y * 0.8);
      vI = mix(mix(uEnvF.z, uEnvF.w, aRand2.z), 1.2 + 0.8 * aRand2.w, hot);
      vShape.y = mix(0.16 + 0.05 * aRand.z, 0.25 + 0.05 * aRand.z, hot);
      if (aRand.x < uEnvE.z) {
        // hair filament along the flow: mostly vertical, curling outward lower down
        vShape.x = 5.0;
        vShape.w = 0.6 + 0.9 * aRand.z;
        float flowAng = 1.5708 + sign(h.x) * 0.35 * smoothstep(0.1, 1.0, h.y) + (aRand.w - 0.5) * 0.7;
        vArc = vec4(0.08 + 0.08 * aRand2.w, 2.0 + 2.5 * aRand.y, flowAng, aRand2.z * TAU);
        vI *= 0.85;
      } else {
        pickGlyph(uJit.w * 1.0);
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
  float hv = vI * (vHalo.x + 2.0 * vHalo.y);
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
    r = max(r * 1.1, 0.19 * wob);
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
  vec3 e = vI * (core * uTintMid + halo * uTintHalo);
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
uniform vec4 uHazeK;     // haze lod, cloud amount, cloud scale (1/W), unused
varying vec2 vUv;
void main() {
  if (uView == 2) { gl_FragColor = vec4(vec3(textureLod(uGhost, vUv, uGhostLod).g), 1.0); return; }
  vec2 sp = vec2(gl_FragCoord.x, uViewportQ.y - gl_FragCoord.y);
  vec2 h = (sp - uOriginQ) / uWpxQ;
  // R: skin haze (the lit face under the dots, proportional to brightness) blurred to cell scale and
  //    broken into clouds, like the mottled floor between ref 2's dots; B: sharp eye / lid / mouth ghost
  float haze = textureLod(uGhost, vUv, uHazeK.x).r;
  float cloud = mix(1.0, 0.25 + 1.5 * hf_fbm(vec3(h * uHazeK.z, 4.1)), uHazeK.y);
  float x = haze * cloud + textureLod(uGhost, vUv, uGhostLod).b;
  // faint fbm mist inside the head + hair envelope (zero beyond ~1.15 W)
  float rr = length((h - vec2(-0.05, 0.08)) * vec2(1.0, 0.82));
  float side = h.x < 0.0 ? 1.0 : uMistK.w;
  x += uMistK.x * side * (1.0 - smoothstep(uMistK.y, uMistK.z, rr)) * (0.2 + 1.6 * hf_fbm(vec3(h * 3.5, 1.7)));
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
