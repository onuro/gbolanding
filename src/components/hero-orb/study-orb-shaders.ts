export const STUDY_ORB_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;

void main() {
  v_uv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Reference-calibrated idle orb remap. The expensive colour reconstruction
 * and dithering are baked offline into a full-colour theme poster.
 */
export const STUDY_ORB_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 v_uv;
uniform float u_time;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_textureResolution;
uniform vec3 u_paletteDark;
uniform vec3 u_paletteMid;
uniform vec3 u_paletteCool;
uniform vec3 u_paletteLight;
// 0 = idle, 1 = loud. Drives the rim wave + halo lift.
uniform float u_level;
// 0 = no call, 1 = call in progress. Sustained glow + travelling rays.
uniform float u_active;
// Brand accent tinting the drifting cloud layer over the disc.
uniform vec3 u_paletteAccent;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float simplexNoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)
  ) + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n = 1.0 / 7.0;
  vec3 ns = n * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(
    dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
  ));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(
    dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)
  ), 0.0);
  m *= m;
  return 42.0 * dot(m * m, vec4(
    dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)
  ));
}

float random2d(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 local = fract(p);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  float a = random2d(cell);
  float b = random2d(cell + vec2(1.0, 0.0));
  float c = random2d(cell + vec2(0.0, 1.0));
  float d = random2d(cell + vec2(1.0, 1.0));
  return mix(a, b, curve.x)
    + (c - a) * curve.y * (1.0 - curve.x)
    + (d - b) * curve.x * curve.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(
    cos(0.5), sin(0.5),
    -sin(0.5), cos(0.5)
  );
  for (int index = 0; index < 4; index += 1) {
    value += amplitude * valueNoise(p);
    p = rotation * p * 2.0 + vec2(100.0);
    amplitude *= 0.5;
  }
  return value;
}

vec2 coverUv(vec2 uv, vec2 containerResolution, vec2 textureResolution) {
  float containerAspect = containerResolution.x / containerResolution.y;
  float textureAspect = textureResolution.x / textureResolution.y;
  vec2 scale = vec2(1.0);
  if (containerAspect > textureAspect) {
    scale.y = textureAspect / containerAspect;
  } else {
    scale.x = containerAspect / textureAspect;
  }
  return (uv - 0.5) * scale + 0.5;
}

vec3 remapToPalette(vec3 sampleColor) {
  // Posters are blue-biased; drive energy from the bright channel mix.
  float energy = max(sampleColor.b, max(sampleColor.g, sampleColor.r));
  energy = pow(clamp(energy, 0.0, 1.0), 1.05);
  float coolBias = smoothstep(
    0.02,
    0.45,
    sampleColor.b - sampleColor.g * 0.25
  );

  vec3 mapped = mix(u_paletteDark, u_paletteMid, smoothstep(0.0, 0.55, energy));
  mapped = mix(mapped, u_paletteCool, coolBias * 0.55 * (1.0 - energy * 0.35));
  return mix(mapped, u_paletteLight, smoothstep(0.62, 1.0, energy) * 0.85);
}

float filmGrain(vec2 fragCoord, float time) {
  // Fine animated grain; kept subtle so it reads as texture, not static.
  float n = random2d(fragCoord + fract(time * 0.37) * 64.0);
  float n2 = random2d(fragCoord * 1.9 - fract(time * 0.21) * 48.0);
  float n3 = random2d(floor(fragCoord * 0.5) + fract(time * 0.11) * 32.0);
  return ((n + n2 + n3) / 3.0 - 0.5) * 0.14;
}

vec3 sampleOrbColor(vec2 baseUv) {
  vec2 uv = baseUv;

  // Spherical projection. These are the measured idle values: scale .9,
  // power 1.1.
  vec2 uvDot = (uv - 0.5) * 2.0;
  float depth = sqrt(1.0 - clamp(dot(uvDot, uvDot), 0.0, 1.0));
  depth = pow(depth, 1.1);
  vec3 normals = vec3(uvDot, depth);
  uvDot /= (vec2(depth) + vec2(1.0)) * (1.0 / vec2(0.9));
  uv = (uvDot + 1.0) * 0.5;

  // Four-octave domain warp.
  vec2 fbmUv = uv * 3.25;
  float nestedTime = u_time * (4.5 * 0.5);
  vec2 q = vec2(
    fbm(fbmUv),
    fbm(fbmUv + vec2(1.0))
  );
  vec2 r = vec2(
    fbm(fbmUv + q + vec2(91.3, 0.55) + 0.15 * nestedTime),
    fbm(fbmUv + q - vec2(45.33, 1.2) + 0.126 * nestedTime)
  );
  float field = fbm(fbmUv + r);
  float remap = mix(
    0.8,
    0.66,
    clamp((field * field) * 2.75, 0.0, 1.0)
  );
  remap = mix(remap, 0.0, clamp(length(q), 0.0, 1.0));
  remap = mix(remap, 1.0, clamp(abs(r.x), 0.0, 1.0));

  vec2 simplexUv = vec2(1.0 - baseUv.x, baseUv.y);
  float simplexTimeX = u_time * 0.25 * 0.5;
  float simplexTimeY = u_time * 0.25;
  vec2 simplexDisplacement = vec2(
    simplexNoise(vec3(simplexUv * 0.65, simplexTimeX)),
    simplexNoise(vec3(simplexUv * 0.65 + vec2(54.0), simplexTimeY))
  );

  // Voice pushes the internal flow, so the pattern churns while the agent talks.
  float voice = u_level * u_active;
  uv += normals.xy * (remap - 0.5) * (0.65 + voice * 1.1);
  uv += simplexDisplacement * (0.15 + voice * 0.3);

  vec3 sampleColor = texture2D(
    u_texture,
    coverUv(uv, u_resolution, u_textureResolution)
  ).rgb;
  vec3 color = remapToPalette(sampleColor);
  color += filmGrain(gl_FragCoord.xy, u_time);
  return clamp(color, 0.0, 1.0);
}

void main() {
  // 2.9 (not 2.0) shrinks the disc to ~69% of the quad so the halo has room
  // to fade before the canvas edge instead of being cut into a square.
  vec2 centered = (v_uv - 0.5) * 2.9;
  float radial = length(centered);

  // Voice wave: two out-of-phase ripples travelling around the rim. Idle keeps
  // a little breathing so the orb never looks frozen.
  // Idle breathing only while a call is up; a dormant orb stays perfectly still.
  float level = max(u_level, 0.09 * u_active);
  float angle = atan(centered.y, centered.x);
  float wave =
    sin(angle * 5.0 - u_time * 2.6) * 0.6 +
    sin(angle * 9.0 + u_time * 1.7) * 0.4;
  float edge = 1.0 + level * wave * 0.1;

  // Hard disc + soft outer halo that inherits the rim colour.
  float circle = 1.0 - smoothstep(0.978 * edge, edge, radial);
  float halo = exp(-1.7 * max(radial - 0.94 * edge, 0.0));
  halo *= 1.0 - smoothstep(edge, 1.44, radial);
  halo *= 1.0 + level * 1.8;
  // Off-call there is no exterior glow at all; the disc's own edge smoothstep
  // is what keeps the silhouette soft.
  halo *= u_active;
  // While a call is live: steady lift plus rays sweeping around the rim.
  float rays = 0.5 + 0.5 * sin(angle * 6.0 + u_time * 1.3);
  halo *= 1.0 + u_active * (0.55 + rays * 0.75);

  if (circle <= 0.001 && halo <= 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // For exterior glow pixels, pull colour from the rim so the bloom
  // matches the edge instead of a flat fill.
  // Keep the interior pattern at its original scale despite the smaller disc.
  vec2 colourUv = 0.5 + centered * 0.5;
  if (radial > 0.999) {
    colourUv = 0.5 + normalize(centered) * 0.492;
  }

  vec3 color = sampleOrbColor(colourUv);

  // Cloud layer: two noise octaves drifting across the disc, tinted with the
  // brand accent so the orb reads as weather rather than flat gradient.
  vec2 cloudUv = colourUv * 2.4;
  float clouds =
    simplexNoise(vec3(cloudUv + vec2(u_time * 0.045, u_time * -0.03), u_time * 0.05)) * 0.65 +
    simplexNoise(vec3(cloudUv * 2.1 + vec2(u_time * -0.02, u_time * 0.035), u_time * 0.07)) * 0.35;
  clouds = smoothstep(0.05, 0.7, clouds * 0.5 + 0.5);
  color = mix(color, u_paletteAccent, clouds * 0.24 * circle);

  float alpha = clamp(max(circle, halo * 0.45), 0.0, 1.0);
  // Premultiplied; brighten the halo slightly so rays read as light.
  vec3 lit = color * (1.0 + halo * (1.0 - circle) * 0.35);
  gl_FragColor = vec4(lit * alpha, alpha);
}
`;
