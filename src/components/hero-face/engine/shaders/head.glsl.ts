import { LIGHT_GLSL, NOISE_GLSL } from './common.glsl';

// Head shaders for the offscreen passes.
//  - FLOW_LUM: rest-pose raster, lit luminance from the morphed normal -> T0 (L, coverage, mouth, keep)
//  - FLOW_VEC: rest-pose raster, (current - rest) screen offset in grid units, view depth, eye -> T1
//  - GHOST: current-pose raster, dim continuous face + silhouette mask -> ghost target

const HEAD_VERT = /* glsl */ `
#include <common>
#include <morphtarget_pars_vertex>
attribute vec4 aBake;
attribute float aEye;
attribute float aCurv;
uniform vec2 uGridCells;   // lattice cells covered by the flow targets (cols, rows)
varying vec3 vN;
varying vec3 vViewPos;
varying vec4 vBake;
varying vec3 vObj;
varying float vEye;
varying float vCurv;
varying vec3 vFlow;        // xy: grid units, z: view depth
void main() {
  vec3 objectNormal = vec3(normal);
  #include <morphnormal_vertex>
  vec3 transformed = vec3(position);
  #include <morphtarget_vertex>
  vec4 mvRest = modelViewMatrix * vec4(position, 1.0);
  vec4 mvCur = modelViewMatrix * vec4(transformed, 1.0);
  vec4 cRest = projectionMatrix * mvRest;
  vec4 cCur = projectionMatrix * mvCur;
#ifdef CURRENT_POSE
  gl_Position = cCur;
  vViewPos = mvCur.xyz;
  vObj = transformed;
#else
  gl_Position = cRest;
  vViewPos = mvRest.xyz;
  vObj = position;
#endif
  vN = normalize(normalMatrix * objectNormal);
  vBake = aBake;
  vEye = aEye;
  vCurv = aCurv;
  vec2 d = cCur.xy / cCur.w - cRest.xy / cRest.w;
  vFlow = vec3(d.x * 0.5 * uGridCells.x, -d.y * 0.5 * uGridCells.y, -mvRest.z);
}
`;

const HEAD_FRAG_COMMON = /* glsl */ `
${NOISE_GLSL}
${LIGHT_GLSL}
varying vec3 vN;
varying vec3 vViewPos;
varying vec4 vBake;
varying vec3 vObj;
varying float vEye;
varying float vCurv;
varying vec3 vFlow;
`;

export const FLOW_LUM = {
  vertexShader: HEAD_VERT,
  fragmentShader: /* glsl */ `
${HEAD_FRAG_COMMON}
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vViewPos);
  float L = hf_lum(N, V, vBake, vObj, vCurv);
  float keep = hf_keep(N, V, vObj);
  gl_FragColor = vec4(L, 1.0, vBake.z, keep);
}
`,
};

export const FLOW_VEC = {
  vertexShader: HEAD_VERT,
  fragmentShader: /* glsl */ `
${HEAD_FRAG_COMMON}
void main() {
  float part = vBake.w;
  float eye = (part > 2.5 && part < 4.5) ? 1.0 : 0.0;
  gl_FragColor = vec4(vFlow.xy, vFlow.z, eye);
}
`,
};

export const GHOST = {
  vertexShader: '#define CURRENT_POSE\n' + HEAD_VERT,
  fragmentShader: /* glsl */ `
${HEAD_FRAG_COMMON}
uniform vec4 uGhostK;     // ghost, fill, irisGhost, pupilGhost
uniform vec4 uGhostK2;    // scleraGhost, teethGhost, mouthGhost, ghostGamma
uniform vec4 uGhostK3;    // hazeAmp, hazeGamma, haze facing lo, haze facing hi
// R = skin haze (lit face under the dots; blurred + clouded in the quad, fades before the silhouette so
//     the face has no outline), G = silhouette mask, B = eye-zone / mouth ghost (lids, iris, pupil, teeth)
void main() {
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vViewPos);
  float part = vBake.w;
  float ndv = max(dot(N, V), 0.0);
  float g;
  float haze = 0.0;
  if (part < 0.5 || part > 4.5) {
    float lit = hf_litRaw(N, V, vBake, vObj, vCurv);
    float sock = hf_socket(vObj);
    if (part > 4.5) lit *= uLightMottle.z; else lit *= sock;
    lit *= mix(1.0, uFillK.z, smoothstep(0.45, 0.9, vBake.z)) * hf_seam(vObj);
    float Lc = pow(max(lit * uLightAmb.z, 0.0), uLightAmb.w);
    float fill = uGhostK.y * ndv * ndv * mix(1.0, vBake.y, 0.7) * mix(0.35, 1.0, sock);
    float keep = hf_keep(N, V, vObj);
    // socket zone weight: 1 inside the eye-socket ellipse, 0 on open skin
    float sw = part > 4.5 ? 1.0 : clamp((1.0 - sock) / max(1.0 - uSocket.z, 1e-3), 0.0, 1.0);
    g = uGhostK.x * (pow(Lc, uGhostK2.w) + fill) * mix(0.1, 1.0, keep) * sw;
    haze = uGhostK3.x * pow(Lc, uGhostK3.y) * keep * keep * smoothstep(uGhostK3.z, uGhostK3.w, ndv) * (1.0 - sw);
  } else if (part < 1.5) {
    g = uGhostK2.z * ndv;                          // mouth socket
  } else if (part < 2.5) {
    g = uGhostK2.y * (0.4 + 0.6 * ndv);            // teeth
  } else {
    // eyeball: sclera / iris disc / pupil by angle from the optical axis (rides eyeLook morphs)
    float c = vEye;
    float iris = smoothstep(0.855, 0.875, c);
    float pupil = smoothstep(0.978, 0.985, c);
    float limbus = iris * (1.0 - smoothstep(0.875, 0.91, c));
    g = mix(uGhostK2.x * ndv, uGhostK.z * (1.0 - 0.45 * limbus), iris);
    g = mix(g, uGhostK.w, pupil);
  }
  gl_FragColor = vec4(haze, 1.0, g, 1.0);
}
`,
};
