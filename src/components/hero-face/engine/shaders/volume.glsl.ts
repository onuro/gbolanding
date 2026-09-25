import { NOISE_GLSL } from './common.glsl';

// a3 'volume' shaders: the head occluder (depth only, same raster as the flow pass) and the hair shells.

export const OCCLUDER = {
  vertexShader: /* glsl */ `
#include <common>
#include <morphtarget_pars_vertex>
void main() {
  vec3 transformed = vec3(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: /* glsl */ `
void main() { gl_FragColor = vec4(0.0); }
`,
};

export const VOLUME = {
  vertexShader: /* glsl */ `
attribute vec4 aHair;
attribute float aOpen;
varying vec3 vN;
varying vec3 vViewPos;
varying vec3 vObj;
varying vec4 vHair;
varying float vOpen;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vN = normalize(normalMatrix * normal);
  vObj = position;
  vHair = aHair;
  vOpen = aOpen;
  gl_Position = projectionMatrix * mv;
}
`,
  fragmentShader: /* glsl */ `
${NOISE_GLSL}
uniform vec3 uLightDir;
uniform vec4 uHairK;    // kd, wrap, wrap pow, ambient
uniform vec4 uHairK2;   // sheen ks, sheen exp, exposure, contrast
uniform vec4 uHairN;    // strand freq across (1/W), along (1/W), clump freq (1/W), clump amp
uniform vec4 uHairD;    // density gain, grazing thin (N.V of full density), outer-layer darkening, strand contrast
uniform vec4 uHairM;    // mottle amp, mottle freq, opening-edge noise amp, facing floor of the lit term
uniform vec4 uHairE;    // crown lift (y above which the hair brightens), crown gain, side darkening, unused
uniform vec4 uHairF;    // curtain bottom fade: density full above y .x, zero below y .y (head space W; off when .x <= .y), unused x2
varying vec3 vN;
varying vec3 vViewPos;
varying vec3 vObj;
varying vec4 vHair;
varying float vOpen;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(-vViewPos);
  float ndv = max(dot(N, V), 0.0);
  float ndl = dot(N, uLightDir);
  float w = uHairK.y;
  float diff = uHairK.x * pow(clamp((ndl + w) / (1.0 + w), 0.0, 1.0), uHairK.z);
  vec3 H = normalize(uLightDir + V);
  float sheen = uHairK2.x * pow(max(dot(N, H), 0.0), uHairK2.y);
  // strands run along s (down from the crown); clumps + 3D mottle break the mass into clouds
  float strand = hf_fbm(vec3(vHair.y * uHairN.x, vHair.x * uHairN.y, vHair.z * 2.7 + 1.3));
  float clump = hf_fbm(vec3(vHair.y * uHairN.z, vHair.x * uHairN.z * 0.6, vHair.z * 1.9 + 7.1));
  float mottle = hf_fbm(vObj * uHairM.y + vec3(2.1, 5.3, 1.7));
  float sc = 1.0 - uHairD.w + 2.0 * uHairD.w * strand;
  float lit = (diff * sc + sheen) * mix(uHairM.w, 1.0, ndv) * (1.0 + uHairM.x * (2.0 * mottle - 1.0)) + uHairK.w;
  lit *= 1.0 + uHairE.y * smoothstep(uHairE.x, uHairE.x + 0.35, vObj.y);
  lit *= 1.0 - uHairE.z * smoothstep(0.35, 0.8, abs(vObj.x));
  lit *= 1.0 - uHairD.z * vHair.z;
  float L = pow(max(lit * uHairK2.z, 0.0), uHairK2.w);
  float op = clamp(vOpen + uHairM.z * (hf_fbm(vObj * 9.0 + vec3(4.0)) - 0.5), 0.0, 1.0);
  op = op * op * (3.0 - 2.0 * op);
  float rho = vHair.w * op * uHairD.x * smoothstep(0.0, uHairD.y, ndv) * max(0.0, 1.0 + uHairN.w * (2.0 * clump - 1.0));
  // the curtains thin out and end below the frame instead of stopping in flat-bottomed pads
  if (uHairF.x > uHairF.y) rho *= smoothstep(uHairF.y, uHairF.x, vObj.y);
  gl_FragColor = vec4(L * rho, rho, strand * rho, vHair.z * rho);
}
`,
};
