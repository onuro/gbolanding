// a5: verbatim copy of the approved-v002 shaders; the engine compiles these while every a5 look parameter is neutral (byte-exact v001 / v002)
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
varying vec2 vUv;

vec3 tent(float lod) {
  vec2 ts = exp2(lod) / uHdrSize;
  vec3 c = textureLod(uHdr, vUv, lod).rgb * 0.25;
  c += (textureLod(uHdr, vUv + vec2(ts.x, 0.0), lod).rgb + textureLod(uHdr, vUv - vec2(ts.x, 0.0), lod).rgb
      + textureLod(uHdr, vUv + vec2(0.0, ts.y), lod).rgb + textureLod(uHdr, vUv - vec2(0.0, ts.y), lod).rgb) * 0.125;
  c += (textureLod(uHdr, vUv + ts, lod).rgb + textureLod(uHdr, vUv - ts, lod).rgb
      + textureLod(uHdr, vUv + vec2(ts.x, -ts.y), lod).rgb + textureLod(uHdr, vUv + vec2(-ts.x, ts.y), lod).rgb) * 0.0625;
  return c;
}

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
