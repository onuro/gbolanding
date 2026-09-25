import { NOISE_GLSL } from './common.glsl';

// Output pass (look report finding 17, P4 + output): everything that glows (haze, mist, ghost, points)
// is accumulated additively as linear HDR energy in one RGBA16F target with a mip chain. This pass
//   1. adds a tight multi-mip bloom (tent-filtered mips; bloomFactors ~[1, .5, .18, .05]) so hot
//      clusters (nose bridge, cheekbones, forehead) merge into glowing bars and bright stars get halos,
//   2. tone-maps once, per channel: t = toneMax (1 - exp(-k x)). Per-channel saturation turns the mint
//      mid-tones neutral white at clipped cores, and the curve's shoulder gives soft (not flat) tops,
//   3. dithers (+- LSB) and keeps the background exactly 0.

export const OUTPUT_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const OUTPUT_FRAG = /* glsl */ `
precision highp float;
${NOISE_GLSL}
uniform sampler2D uHdr;
uniform vec2 uHdrSize;      // device px
uniform vec4 uBloomW;       // weights for mips 1..4
uniform vec4 uBloomW2;      // weights for mips 5..6, bloom threshold, knee
uniform vec3 uBloomTint;
uniform vec4 uOutTone;      // k, toneMax, dither (LSB), exposure
// a5 cinematic layer
uniform vec4 uCineA;        // on (bloom from HDR alpha = per-fragment bright pass), dodge, vignette amount, vignette r0
uniform vec4 uCineB;        // vignette exponent, grain amount, grain frame index, bloom multiplier (breath x voice)
uniform vec3 uGradeHi;
uniform vec4 uDodgeLive;    // light-play amount, speech gain, spatial frequency (cycles / card height), tempo
uniform vec2 uDodgeT;       // time (s), smoothed speech energy 0..1
uniform vec2 uFaceCine;     // face protection: dodge share, bloom share inside the face ellipse (1, 1 = no protection)
uniform vec4 uGlint[4];     // x, y (device px, gl_FragCoord), 1 / e-fold length (px), amplitude (HDR)
uniform vec4 uGlintK;       // vertical sigma (px), face ellipse centre x, y (gl px), face radius (px)
varying vec2 vUv;

vec4 tent4(float lod) {
  vec2 ts = exp2(lod) / uHdrSize;
  vec4 c = textureLod(uHdr, vUv, lod) * 0.25;
  c += (textureLod(uHdr, vUv + vec2(ts.x, 0.0), lod) + textureLod(uHdr, vUv - vec2(ts.x, 0.0), lod)
      + textureLod(uHdr, vUv + vec2(0.0, ts.y), lod) + textureLod(uHdr, vUv - vec2(0.0, ts.y), lod)) * 0.125;
  c += (textureLod(uHdr, vUv + ts, lod) + textureLod(uHdr, vUv - ts, lod)
      + textureLod(uHdr, vUv + vec2(ts.x, -ts.y), lod) + textureLod(uHdr, vUv + vec2(-ts.x, ts.y), lod)) * 0.0625;
  return c;
}
vec3 tent(float lod) { return tent4(lod).rgb; }

// soft threshold: only energy above the knee blooms (dim dots stay crisp)
vec3 thr(vec3 c) {
  float l = max(c.r, max(c.g, c.b));
  float k = uBloomW2.z, knee = max(uBloomW2.w, 1e-4);
  float s = clamp(l - k + knee, 0.0, 2.0 * knee);
  s = s * s / (4.0 * knee);
  float w = max(s, l - k) / max(l, 1e-4);
  return c * w;
}

void main() {
  vec3 x = textureLod(uHdr, vUv, 0.0).rgb;
  vec3 b = vec3(0.0);
  if (uCineA.x > 0.5) {
    // bloom source = HDR alpha: each sprite wrote its own soft-thresholded luminance (a bright pass before the mips),
    // so isolated stars keep wide halos and dense mid-level areas (hair crown) do not wash out
    float a = 0.0;
    if (uBloomW.x > 0.0) a += uBloomW.x * tent4(1.0).a;
    if (uBloomW.y > 0.0) a += uBloomW.y * tent4(2.0).a;
    if (uBloomW.z > 0.0) a += uBloomW.z * tent4(3.0).a;
    if (uBloomW.w > 0.0) a += uBloomW.w * tent4(4.0).a;
    if (uBloomW2.x > 0.0) a += uBloomW2.x * tent4(5.0).a;
    if (uBloomW2.y > 0.0) a += uBloomW2.y * tent4(6.0).a;
    a *= uCineB.w;
    // anamorphic glints: thin horizontal streaks on chosen stars, kept off the face
    vec3 g = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      vec4 G = uGlint[i];
      if (G.w <= 0.0) continue;
      vec2 d = gl_FragCoord.xy - G.xy;
      float gv = exp(-0.5 * d.y * d.y / (uGlintK.x * uGlintK.x));
      g += G.w * gv * exp(-abs(d.x) * G.z) * vec3(0.85, 1.0, 1.03);
    }
    vec2 fe = (gl_FragCoord.xy - uGlintK.yz) / uGlintK.w;
    g *= smoothstep(0.9, 1.3, length(fe * vec2(1.0, 0.72)));
    // face protection: the cinematic dodge / bloom stay on the field and ease off on her face (soft ellipse)
    float fmask = 1.0 - smoothstep(0.7, 1.15, length(fe * vec2(1.0, 0.72)));
    a *= mix(1.0, uFaceCine.y, fmask);
    vec3 bl = a * uBloomTint;
    // live color dodge: broad light patches drift slowly across the frame and the dodge swells while she speaks
    float dodge = uCineA.y;
    if (uDodgeLive.x > 0.0 || uDodgeLive.y > 0.0) {
      vec2 q = gl_FragCoord.xy / max(uHdrSize.y, 1.0) * uDodgeLive.z * 6.2831853;
      float tt = uDodgeT.x * uDodgeLive.w;
      float n = 0.5 + 0.25 * sin(1.7 * q.x + 0.6 * q.y + 0.9 * tt) + 0.25 * sin(-0.8 * q.x + 1.9 * q.y - 0.7 * tt + 1.3 * sin(0.23 * tt));
      dodge *= max(0.0, 1.0 + uDodgeLive.x * (2.0 * n - 1.0) + uDodgeLive.y * uDodgeT.y);
    }
    dodge *= mix(1.0, uFaceCine.x, fmask);
    x = (x + bl + g) / (1.0 - clamp(dodge * a, 0.0, 0.85));
    // vignette (card space, 0 centre .. 1 corner), before the tone curve
    float dv = length(vUv - 0.5) * 1.41421;
    x *= 1.0 - uCineA.z * pow(smoothstep(uCineA.w, 1.0, dv), uCineB.x);
    x *= uOutTone.w;
    vec3 t = uOutTone.y * (1.0 - exp(-uOutTone.x * max(x, vec3(0.0))));
    float lum = dot(t, vec3(0.2126, 0.7152, 0.0722));
    t *= mix(vec3(1.0), uGradeHi, smoothstep(0.2, 0.8, lum));
    // fine grain: luminance-weighted (zero on black), refreshed at a film rate
    float gr = (hf_hash12(gl_FragCoord.xy + vec2(uCineB.z * 17.13, uCineB.z * 7.77)) - 0.5) * 2.0;
    t += uCineB.y * gr * sqrt(max(lum, 0.0)) * smoothstep(0.004, 0.03, lum);
    float d0 = (hf_hash12(gl_FragCoord.xy) - 0.5) * uOutTone.z / 255.0;
    t = lum > 0.5 / 255.0 ? max(vec3(0.0), t + d0 * (1.0 - smoothstep(0.08, 0.16, lum))) : vec3(0.0);
    gl_FragColor = vec4(t, 1.0);
    return;
  }
  if (uBloomW.x > 0.0) b += uBloomW.x * thr(tent(1.0));
  if (uBloomW.y > 0.0) b += uBloomW.y * thr(tent(2.0));
  if (uBloomW.z > 0.0) b += uBloomW.z * thr(tent(3.0));
  if (uBloomW.w > 0.0) b += uBloomW.w * thr(tent(4.0));
  if (uBloomW2.x > 0.0) b += uBloomW2.x * thr(tent(5.0));
  if (uBloomW2.y > 0.0) b += uBloomW2.y * thr(tent(6.0));
  x = (x + b * uBloomTint) * uOutTone.w;
  vec3 t = uOutTone.y * (1.0 - exp(-uOutTone.x * max(x, vec3(0.0))));
  float lum = dot(t, vec3(0.2126, 0.7152, 0.0722));
  float d = (hf_hash12(gl_FragCoord.xy) - 0.5) * uOutTone.z / 255.0;
  t = lum > 0.5 / 255.0 ? max(vec3(0.0), t + d * (1.0 - smoothstep(0.08, 0.16, lum))) : vec3(0.0);
  gl_FragColor = vec4(t, 1.0);
}
`;
