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
// Beauty lighting (ref 2): a large soft key high above the camera (wrapped diffuse, soft baked penumbrae,
// a broad skin sheen plus a tight glint lobe), a gentle frontal fill, AO, and a facing-ratio falloff so the
// head rounds off like skin instead of plateauing. Art direction on top: soft eye sockets (shadowed lids,
// not hard ellipses), lip vermilion + gloss + upper-lip border, a soft lip seam and mouth corners.
// feat (per-vertex, rest pose): x lip vermilion, y lip side (+1 upper, -1 lower), z upper-lip border band,
// w upper-lid (lash line) band.
export const LIGHT_GLSL = /* glsl */ `
uniform vec3 uLightDir;      // key: view space, normalised (toward the light)
uniform vec3 uFillDir;       // near-frontal fill (diffuse only)
uniform vec4 uFillK;         // kdFill, fill shadow share, lip albedo, convexity gain
uniform float uFillR;        // mirrored (viewer-right) fill share
uniform vec4 uLightK;        // kd, ks (broad sheen), specExp, aoStrength
uniform vec4 uLightK2;       // key wrap, key pow, ks2 (tight glint), specExp2
uniform vec4 uLightAmb;      // ambTop, ambBottom, exposure, contrast
uniform vec4 uLightMottle;   // face mottle amp, scale, lacrimalGain, facingPow
uniform vec4 uLightFade;     // sideFade0, sideFade1, crownFade0, crownFade1
uniform vec4 uLightFade2;    // neckFade0, neckFade1, keepFacing0, keepFacing1
uniform vec4 uSideAx;        // turned head: far-side view-lateral axis, object space (xyz, w offset); 0 at yaw 0
uniform vec4 uSocket;        // radius x, radius y, floor, y offset (W, object space)
uniform vec4 uSocket2;       // soft inner, soft outer (ellipse units), below-eye squash, nose-side squash
uniform vec4 uLipK;          // gloss gain, gloss exponent, upper-lip border gain, mouth-corner shadow
uniform vec4 uLidK;          // lid-line gain, lid-line socket lift, crown mottle amp, highlight knee
uniform vec3 uLipCorner;     // |x| of the mouth corners, y, radius (W, rest pose)
uniform vec4 uEarA;          // ear fade: centre |x|, y, z (W), inner edge (ellipse radius); off when the outer edge is 0
uniform vec4 uEarB;          // ear fade: radius x, y, z (W), outer edge
uniform vec4 uNeckM;         // neck fade: y kept, y faded, z kept, z faded (W); off when y kept == y faded
uniform vec4 uLipTalkShape;  // speaking lips: the light fades toward the corners from x (share of the corner distance) to y
uniform vec4 uLipTalk;       // speaking lips: upper-lip light, lower-lip light (both scale with mouth opening), pout amount, pout fill floor
uniform vec3 uPupilObjL;
uniform vec3 uPupilObjR;
uniform vec4 uBlob[10];      // sculpt highlight blobs: centre xy, radius xy (object space, W)
uniform float uBlobG[10];    // blob gains
uniform float uSculptBase;   // sculpt multiplier outside the blobs
uniform sampler2D uSculptTex; // fitted light map (x ref 2), object xy; border texels are 1
uniform sampler2D uPortTex;   // portrait luminance (projected onto the rest face, object xy)
uniform vec4 uPortA;          // u = x + y * obj.x, v = z + w * obj.y
uniform vec4 uPortK;          // mix, gain, gamma, on
uniform vec4 uPortE;          // face ellipse for the blend: centre y, radius x, radius y, edge softness
uniform vec4 uSculptRect;    // x0, y0, 1/(x1-x0), 1/(y1-y0) in object W (y up); zw = 0 -> off
uniform vec3 uMouthObj;      // mouth centre (object space, rest pose)
uniform vec3 uLipSeam;       // half-height, half-width, depth
uniform vec4 uEdgeK;         // a3 face edge lift: amount (0 off), e0, e1 (object-space face ellipse e), N.V below which it acts
uniform vec4 uEdgeK2;        // lifted lit floor, grazing-dissolve reduction

// a3: weight of the face edge band (0 in the face core e < e0; object space, rest pose)
float hf_edgeW(vec3 obj) {
  if (uEdgeK.x <= 0.0) return 0.0;
  float e = length(vec2(obj.x / 0.49, (-obj.y - 0.07) / 0.71));
  return uEdgeK.x * smoothstep(uEdgeK.y, uEdgeK.z, e);
}

float hf_seam(vec3 obj) {
  float dy = (obj.y - uMouthObj.y) / uLipSeam.x;
  float dx = abs(obj.x - uMouthObj.x) / uLipSeam.y;
  return 1.0 - uLipSeam.z * exp(-dy * dy) * (1.0 - smoothstep(0.55, 1.05, dx));
}

// soft dark pits at the mouth corners (the lips tuck in; no hard slit ends)
float hf_corner(vec3 obj) {
  vec2 d = vec2(abs(obj.x) - uLipCorner.x, obj.y - uLipCorner.y) / uLipCorner.z;
  return 1.0 - uLipK.w * exp(-dot(d, d));
}

// Art-directed sculpt (optional): gaussian highlight blobs + a coarse fitted light map.
float hf_sculpt(vec3 obj) {
  float s = uSculptBase;
  for (int i = 0; i < 10; i++) {
    vec2 d = (obj.xy - uBlob[i].xy) / max(uBlob[i].zw, vec2(1e-3));
    s += uBlobG[i] * exp(-dot(d, d));
  }
  if (uSculptRect.z > 0.0) s *= texture(uSculptTex, clamp((obj.xy - uSculptRect.xy) * uSculptRect.zw, 0.0, 1.0)).r;
  return s;
}

float hf_litRaw(vec3 N, vec3 V, vec4 bake, vec3 obj, float curv, vec4 feat) {
  vec3 L = uLightDir;
  float ndl = dot(N, L);
  float vis = bake.x;
  // wrapped diffuse: the terminator rolls off over ~70 deg instead of cutting at 90 (soft skin)
  float w = uLightK2.x;
  float diff = uLightK.x * pow(clamp((ndl + w) / (1.0 + w), 0.0, 1.0), uLightK2.y) * vis;
  vec3 H = normalize(L + V);
  float ndh = max(dot(N, H), 0.0);
  float lip = feat.x;
  float spec = uLightK.y * pow(ndh, uLightK.z) + uLightK2.z * pow(ndh, uLightK2.w);
  spec += lip * max(0.0, -feat.y * 0.5 + 0.5) * uLipK.x * pow(ndh, uLipK.y); // moist lower-lip gloss
  spec *= smoothstep(-0.05, 0.35, ndl) * vis;
  float fl = max(dot(N, uFillDir), 0.0) + uFillR * max(dot(N, uFillDir * vec3(-1.0, 1.0, 1.0)), 0.0);
  diff += uFillK.x * fl * mix(1.0, vis, uFillK.y);
  float amb = mix(uLightAmb.y, uLightAmb.x, N.y * 0.5 + 0.5);
  float facing = pow(clamp(dot(N, V), 0.0, 1.0), uLightMottle.w);
  float lit = (diff + spec) * facing * max(0.0, 1.0 + uFillK.w * curv) + amb;
  if (uEdgeK.x > 0.0) {
    // a3 edge lift: the rounded-off cheek / jaw / temple edge keeps a soft lit floor (ref 2: lit edges that
    // thin out, no dark outline); strongest at grazing, top-lit a little more than the underside
    float we = hf_edgeW(obj) * (1.0 - smoothstep(uEdgeK.w, uEdgeK.w + 0.3, dot(N, V)));
    float lift = uEdgeK2.x * (0.6 + 0.4 * clamp(N.y * 0.5 + 0.5, 0.0, 1.0)) * mix(1.0, vis, 0.3);
    lit = mix(lit, max(lit, lift), we);
  }
  lit *= mix(1.0, bake.y, uLightK.w);
  lit *= hf_sculpt(obj);
  lit *= mix(1.0, uFillK.z, lip);        // vermilion slightly darker than skin
  lit *= 1.0 + uLipK.z * feat.z;         // upper-lip border ridge (Cupid's bow) catches the key
  // speaking lips: the upper lip faces down and away from the key, so an open mouth read as a void under the
  // nose; a soft light on both lips keeps the mouth outline (and its shape per sound) readable
  float lipF = 0.35 + 0.65 * clamp(dot(N, V), 0.0, 1.0);
  // puckered lips: the everted upper lip's lower edge turns down and went dark between two lit rows (a ribbed
  // 'duck lip'); its fill stops depending on the view angle as the pout grows (uLipTalk.z = pout amount)
  float lipFU = mix(lipF, 0.85, uLipTalk.z);
  // (full over the middle of the lips, fading to the corners: an even fill end to end read as two sausages)
  float lipMid = 1.0 - smoothstep(uLipTalkShape.x, uLipTalkShape.y, abs(obj.x - uMouthObj.x) / uLipCorner.x);
  lit += lip * lipMid * (uLipTalk.x * max(feat.y, 0.0) * lipFU + uLipTalk.y * max(-feat.y, 0.0) * mix(lipF, 0.75, 0.5 * uLipTalk.z));
  // and the dark seam row between the vermilion and the everted band fills in: the pouted upper lip reads as one
  // rounded lip (judges, rounds 14-15: 'two stacked rows with a dark line', 'a thin striped upper lip')
  lit = max(lit, lip * max(feat.y, 0.0) * uLipTalk.z * uLipTalk.w);
  // mottling: smooth young skin on the face, broken up toward the crown / hairline (as in the refs)
  float crown = smoothstep(0.3, 0.62, obj.y);
  float m = hf_fbm(obj * uLightMottle.y + vec3(3.7, 1.3, 5.1));
  lit *= 1.0 + mix(uLightMottle.x, uLidK.z, crown) * (2.0 * m - 1.0);
  return lit;
}

float hf_socket1(vec3 obj, vec3 pup) {
  vec2 d = obj.xy - (pup.xy + vec2(0.0, uSocket.w));
  if (pup.x * d.x < 0.0) d.x *= uSocket2.w;   // toward the nose: the socket ends at the bridge
  if (d.y < 0.0) d.y *= uSocket2.z;           // below the eye: ends at the lower lid / cheek
  return length(d / uSocket.xy);
}
// soft eye-socket shading (lid + lash shadow): no hard edge, deepest at the upper lid
float hf_socket(vec3 obj) {
  float e = min(hf_socket1(obj, uPupilObjL), hf_socket1(obj, uPupilObjR));
  float s = smoothstep(uSocket2.x, uSocket2.y, e);
  return mix(uSocket.z, 1.0, s * s * (3.0 - 2.0 * s));
}

// dissolve keep factor: ears / head sides, skull top, neck and grazing surfaces break up into the scatter
float hf_keep(vec3 N, vec3 V, vec3 obj) {
  float side = 1.0 - smoothstep(uLightFade.x, uLightFade.y, abs(obj.x));
  if (uSideAx.z != 0.0) {
    // turned head: the far outline is the cheek (|x| ~0.42, inside this fade; the side fade and the hair overlap that
    // make the rest pose seamless sit behind it), so the dots ran undissolved up to it, a mask edge. The side fade is
    // also measured across the view on the far side (a band that follows the outline in), never over the far eye.
    // (yaw 0: skipped, the approved path bit for bit)
    float sv = 1.0 - smoothstep(uLightFade.x, uLightFade.y, dot(uSideAx.xyz, obj) + uSideAx.w);
    // guard: the far eye's socket ellipse (lids, lashes and brow), so no field particles land on the eye or brow
    vec3 pe = obj.x > 0.0 ? uPupilObjL : uPupilObjR;
    sv = mix(1.0, sv, smoothstep(0.9, 1.3, hf_socket1(obj, pe)));
    side = min(side, sv);
  }
  float top = 1.0 - smoothstep(uLightFade.z, uLightFade.w, obj.y);
  float neck = smoothstep(uLightFade2.x, uLightFade2.y, obj.y);
  float graze = smoothstep(uLightFade2.z, uLightFade2.w, dot(N, V));
  graze = mix(graze, 1.0, uEdgeK2.y * hf_edgeW(obj));
  // the ears and the neck behind / below the jaw fade out: they showed as a dim ear and a neck column when she turned
  if (uEarB.w > 0.0) {
    float e = length((vec3(abs(obj.x), obj.y, obj.z) - uEarA.xyz) / uEarB.xyz);
    side *= smoothstep(uEarA.w, uEarB.w, e);
  }
  if (uNeckM.x != uNeckM.y) neck *= 1.0 - smoothstep(uNeckM.x, uNeckM.y, obj.y) * smoothstep(uNeckM.z, uNeckM.w, obj.z);
  return side * top * neck * graze;
}

// soft highlight knee: keeps gradation in the hot zones (cheekbones, forehead) instead of flat plateaus
float hf_knee(float x) {
  float k = uLidK.w;
  return k > 0.0 ? x / (1.0 + max(x - k, 0.0) / (1.0 + k)) : x;
}

// portrait brightness at a rest-pose object point: (luminance, blend weight)
vec2 hf_port(vec3 obj) {
  if (uPortK.w < 0.5) return vec2(0.0);
  vec2 uv = vec2(uPortA.x + uPortA.y * obj.x, uPortA.z + uPortA.w * obj.y);
  float p = uPortK.y * pow(max(texture(uPortTex, clamp(uv, 0.0, 1.0)).r, 0.0), uPortK.z);
  float e = length(vec2(obj.x / uPortE.y, (obj.y - uPortE.x) / uPortE.z));
  float w = uPortK.x * (1.0 - smoothstep(1.0 - uPortE.w, 1.0, e));
  // keep the mesh's own eyes, lids and sockets (the portrait's deep socket shadow reads as no eyes at dot scale)
  vec2 dl = (obj.xy - uPupilObjL.xy) / vec2(0.15, 0.1), dr = (obj.xy - uPupilObjR.xy) / vec2(0.15, 0.1);
  w *= smoothstep(0.8, 1.35, min(length(dl), length(dr)));
  return vec2(p, w);
}
float hf_lum(vec3 N, vec3 V, vec4 bake, vec3 obj, float curv, vec4 feat) {
  float part = bake.w;
  if (part > 0.5 && part < 4.5) return 0.0; // mouth socket, teeth, eyeballs carry no dots
  float lit = hf_litRaw(N, V, bake, obj, curv, feat);
  float sock = hf_socket(obj);
  if (part > 4.5) lit *= uLightMottle.z; else lit *= sock;
  // upper-lid margin: a fine row of dim dots along the lash line, inside the dark socket
  lit += uLidK.x * feat.w * mix(1.0, uLidK.y, 1.0 - sock) * clamp(dot(N, V), 0.0, 1.0);
  lit *= hf_seam(obj) * hf_corner(obj);
  return pow(hf_knee(max(lit * uLightAmb.z, 0.0)), uLightAmb.w);
}
`;
