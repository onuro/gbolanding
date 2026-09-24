// Shared GLSL helpers (hash, value noise, fbm) and the head lighting model used by both the
// flow pass (dots) and the ghost pass (dim continuous face), so the two always agree.

export const NOISE_GLSL = /* glsl */ `
float hf_hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float hf_hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float hf_vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hf_hash13(i), hf_hash13(i + vec3(1, 0, 0)), f.x), mix(hf_hash13(i + vec3(0, 1, 0)), hf_hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hf_hash13(i + vec3(0, 0, 1)), hf_hash13(i + vec3(1, 0, 1)), f.x), mix(hf_hash13(i + vec3(0, 1, 1)), hf_hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float hf_fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * hf_vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}
`;

// Lit luminance of the head. Parts: 0 skin, 1 mouth socket, 2 teeth, 3 sclera, 4 iris, 5 lacrimal.
// Near-frontal key (above-left) with a facing-ratio falloff: bright ridge, nose tip, cheeks, brows and
// upper forehead; dim temples, jaw sides and crown; black eye sockets (photographic lid/lash shadow).
export const LIGHT_GLSL = /* glsl */ `
uniform vec3 uLightDir;      // key: view space, normalised (specular + some diffuse; baked visibility)
uniform vec3 uFillDir;       // near-frontal fill (diffuse: cheeks, nose tip)
uniform vec4 uFillK;         // kdFill, fill shadow share, lipFloor, convexity gain
uniform float uFillR;        // mirrored (viewer-right) fill share
uniform vec4 uLightK;        // kd, ks, specExp, aoStrength
uniform vec4 uLightAmb;      // ambTop, ambBottom, exposure, contrast
uniform vec4 uLightMottle;   // amp, scale, lacrimalGain, facingPow
uniform vec4 uLightFade;     // sideFade0, sideFade1, crownFade0, crownFade1
uniform vec4 uLightFade2;    // neckFade0, neckFade1, keepFacing0, keepFacing1
uniform vec4 uSocket;        // radius x, radius y, floor, y offset (W, object space)
uniform vec3 uPupilObjL;
uniform vec3 uPupilObjR;
uniform vec4 uBlob[10];      // sculpt highlight blobs: centre xy, radius xy (object space, W)
uniform float uBlobG[10];    // blob gains
uniform float uSculptBase;   // sculpt multiplier outside the blobs
uniform vec3 uMouthObj;      // mouth centre (object space, rest pose)
uniform vec3 uLipSeam;       // half-height, half-width, depth

float hf_seam(vec3 obj) {
  float dy = (obj.y - uMouthObj.y) / uLipSeam.x;
  float dx = abs(obj.x - uMouthObj.x) / uLipSeam.y;
  return 1.0 - uLipSeam.z * exp(-dy * dy) * (1.0 - smoothstep(0.7, 1.0, dx));
}

// Art-directed sculpt map (look report finding 7 landmark table): forehead highlight, cheekbones,
// ridge, brows, nose tip, chin and lower lip carry more light than the planes between them.
float hf_sculpt(vec3 obj) {
  float s = uSculptBase;
  for (int i = 0; i < 10; i++) {
    vec2 d = (obj.xy - uBlob[i].xy) / max(uBlob[i].zw, vec2(1e-3));
    s += uBlobG[i] * exp(-dot(d, d));
  }
  return s;
}

float hf_litRaw(vec3 N, vec3 V, vec4 bake, vec3 obj, float curv) {
  vec3 L = uLightDir;
  vec3 H = normalize(L + V);
  float ndl = dot(N, L);
  float vis = bake.x;
  float diff = uLightK.x * max(ndl, 0.0) * vis;
  float spec = uLightK.y * pow(max(dot(N, H), 0.0), uLightK.z) * vis * smoothstep(0.0, 0.15, ndl);
  float fl = max(dot(N, uFillDir), 0.0) + uFillR * max(dot(N, uFillDir * vec3(-1.0, 1.0, 1.0)), 0.0);
  diff += uFillK.x * fl * mix(1.0, vis, uFillK.y);
  float amb = mix(uLightAmb.y, uLightAmb.x, N.y * 0.5 + 0.5);
  float facing = pow(clamp(dot(N, V), 0.0, 1.0), uLightMottle.w);
  float lit = (diff + spec) * facing * max(0.0, 1.0 + uFillK.w * curv) + amb;
  lit *= mix(1.0, bake.y, uLightK.w);
  lit *= hf_sculpt(obj);
  // albedo mottling (forehead + crown strongest, as in the refs)
  float crown = smoothstep(0.05, 0.45, obj.y);
  float m = hf_fbm(obj * uLightMottle.y + vec3(3.7, 1.3, 5.1));
  lit *= 1.0 + uLightMottle.x * (2.0 * m - 1.0) * mix(0.6, 1.0, crown);
  return lit;
}

float hf_socket(vec3 obj) {
  vec2 dl = (obj.xy - (uPupilObjL.xy + vec2(0.0, uSocket.w))) / uSocket.xy;
  vec2 dr = (obj.xy - (uPupilObjR.xy + vec2(0.0, uSocket.w))) / uSocket.xy;
  float e = min(length(dl), length(dr));
  return mix(uSocket.z, 1.0, smoothstep(0.75, 1.15, e));
}

// dissolve keep factor: ears / head sides, skull top, neck and grazing surfaces break up into the scatter
float hf_keep(vec3 N, vec3 V, vec3 obj) {
  float side = 1.0 - smoothstep(uLightFade.x, uLightFade.y, abs(obj.x));
  float top = 1.0 - smoothstep(uLightFade.z, uLightFade.w, obj.y);
  float neck = smoothstep(uLightFade2.x, uLightFade2.y, obj.y);
  float graze = smoothstep(uLightFade2.z, uLightFade2.w, dot(N, V));
  return side * top * neck * graze;
}

float hf_lum(vec3 N, vec3 V, vec4 bake, vec3 obj, float curv) {
  float part = bake.w;
  if (part > 0.5 && part < 4.5) return 0.0; // mouth socket, teeth, eyeballs carry no dots
  float lit = hf_litRaw(N, V, bake, obj, curv);
  if (part > 4.5) lit *= uLightMottle.z; else lit *= hf_socket(obj);
  lit *= mix(1.0, uFillK.z, smoothstep(0.45, 0.9, bake.z));   // lip albedo (darker than skin)
  lit *= hf_seam(obj);                                          // closed-mouth seam shadow
  return pow(max(lit * uLightAmb.z, 0.0), uLightAmb.w);
}
`;
