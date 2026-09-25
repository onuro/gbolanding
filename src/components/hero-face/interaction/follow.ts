// Cursor follow for the hero face, framework-free and deterministic (the lab replays it frame by frame).
//
// The pointer is a point on a plane `depth` in front of her eyes (the DOM layer, pointer-follow.ts, measures it in
// canvas heights from the face's eye point), so the gaze direction is a real 3D look-at: yaw = atan(dx / D), pitch =
// atan(dy / D). Her eyes lead: a fast critically damped spring carries the gaze, a slower one the head, which only
// takes a share of the angle (soft-limited, asymmetric in pitch); the eyes cover the rest (eye-in-head = gaze - head,
// soft-limited), so they arrive first, turn a bit further and settle back as the head catches up. The head turn is
// added on top of the performer's idle sway / talk nods; the eyes also counter the performer's head motion (VOR),
// so her gaze stays on the cursor while the head breathes. Released (pointer gone or idle), both return softly to
// the centre: looking at the viewer.
//
// Output: an additive head pose (radians, HeadPose conventions: + yaw turns the face to the viewer's right, + pitch
// nods down) and the eight eyeLook morphs of mesh-f5s (lab-mesh.mjs --targets gaze bakes a rigid eyeball turn of
// EYE_ROT_DEG at weight 1 into each). Vertical gaze hands over to blinks (x (1 - blink)), so a blink closes exactly
// as without the follow.

export interface FollowTuning {
  /** share of the gaze angle the head takes: [yaw, pitch] */
  headShare: [number, number];
  /** vertical pointer offsets count this much (the page mostly lies below her eye line; a strong downward gaze
   *  lowers the lids and reads as downcast) */
  vScale: number;
  /** head yaw soft limit, rad (tanh asymptote) */
  yawMax: number;
  /** head pitch soft limits, rad: [up (negative pitch), down] */
  pitchMax: [number, number];
  /** eye-in-head soft limits, rad: [sideways, up, down] */
  eyeMax: [number, number, number];
  /** spring rates (critically damped omega, 1/s) while following: [eyes, head] */
  omega: [number, number];
  /** spring rates on the way back to the centre: [eyes, head] */
  omegaReturn: [number, number];
  /** seconds without pointer activity before she looks back at the viewer */
  idleSec: number;
  /** share of the performer's head motion the eyes counter (vestibulo-ocular reflex), 0..1 */
  vor: number;
}

export const FOLLOW_DEFAULTS: FollowTuning = {
  headShare: [0.9, 0.75], // owner: the head must really turn in 3D (0.42 read flat / 2D); the eyes still lead (faster spring)
  vScale: 0.75,
  yawMax: 0.45,
  pitchMax: [0.18, 0.12],
  eyeMax: [0.4, 0.2, 0.13],
  omega: [22, 7.5],
  omegaReturn: [5, 2.8],
  idleSec: 3.5,
  vor: 1,
};

/** Eyeball turn (deg) the mesh bakes into each eyeLook target at weight 1: lab-mesh.mjs --eye-rot in,out,up,down. */
export const EYE_ROT_DEG = { in: 30, out: 30, up: 25, down: 30 } as const;

/** Every morph the follow drives, at 0 (samples are absolute; engine.setMorphs merges). */
export const GAZE_MORPHS = [
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight',
] as const;

export interface FollowBase {
  /** the performer's head pose this frame (rad), for the eyes' VOR */
  yaw: number;
  pitch: number;
  /** max(eyeBlinkLeft, eyeBlinkRight) this frame */
  blink: number;
}

export interface FollowSample {
  /** additive head pose, rad */
  yaw: number;
  pitch: number;
  /** absolute eyeLook weights (all eight, every frame) */
  morphs: Record<string, number>;
  /** eye-in-head angles, rad (+ = viewer's right / down), for the lab */
  eyeYaw: number;
  eyePitch: number;
}

export interface Follow {
  /** where the pointer is: offset from the face's eye point over the pointer-plane depth (+x right, +y down) */
  setTarget(x: number, y: number): void;
  /** pointer activity at time `now` (s): engages the follow and restarts the idle timer */
  poke(now: number): void;
  /** the pointer is gone: look back at the viewer */
  release(): void;
  step(dt: number, now: number, base: FollowBase): FollowSample;
  readonly engaged: boolean;
  /** released and every spring at rest in the centre (with a zero base the sample is then all zero) */
  readonly settled: boolean;
}

const DEG = Math.PI / 180;
const softClamp = (x: number, m: number) => (m > 0 ? m * Math.tanh(x / m) : 0);
const softClamp2 = (x: number, lo: number, hi: number) => (x < 0 ? -softClamp(-x, lo) : softClamp(x, hi));

interface Spring { x: number; v: number }
// exact critically damped step toward `target` (stable for any dt)
function spring(s: Spring, target: number, omega: number, dt: number) {
  const d = s.x - target;
  const e = Math.exp(-omega * dt);
  const k = s.v + omega * d;
  s.x = target + (d + k * dt) * e;
  s.v = (s.v - omega * k * dt) * e;
}

export function createFollow(tuning: Partial<FollowTuning> = {}): Follow {
  const T: FollowTuning = { ...FOLLOW_DEFAULTS, ...tuning };
  let tx = 0, ty = 0;
  let engaged = false;
  let lastPoke = -Infinity;
  const gy: Spring = { x: 0, v: 0 }, gp: Spring = { x: 0, v: 0 };
  const hy: Spring = { x: 0, v: 0 }, hp: Spring = { x: 0, v: 0 };
  const rest = (s: Spring) => Math.abs(s.x) < 1e-5 && Math.abs(s.v) < 1e-4;
  const zero = (s: Spring) => { s.x = 0; s.v = 0; };

  return {
    setTarget(x, y) { tx = x; ty = y; },
    poke(now) { engaged = true; lastPoke = now; },
    release() { engaged = false; },
    get engaged() { return engaged; },
    get settled() { return !engaged && rest(gy) && rest(gp) && rest(hy) && rest(hp); },
    step(dt, now, base) {
      if (engaged && now - lastPoke > T.idleSec) engaged = false;
      const h = Math.min(Math.max(dt, 0), 0.1);
      // gaze target: a real look-at toward the pointer plane; the centre (the viewer) when released
      const gYaw = engaged ? Math.atan(tx) : 0, gPitch = engaged ? Math.atan(T.vScale * ty) : 0;
      const hYaw = softClamp(T.headShare[0] * gYaw, T.yawMax);
      const hPitch = softClamp2(T.headShare[1] * gPitch, T.pitchMax[0], T.pitchMax[1]);
      const [oe, oh] = engaged ? T.omega : T.omegaReturn;
      spring(gy, gYaw, oe, h); spring(gp, gPitch, oe, h);
      spring(hy, hYaw, oh, h); spring(hp, hPitch, oh, h);
      if (!engaged) for (const s of [gy, gp, hy, hp]) if (rest(s)) zero(s);
      // eye-in-head: gaze minus the whole head (follow + a share of the performer's sway / nods)
      const ey = softClamp(gy.x - hy.x - T.vor * base.yaw, T.eyeMax[0]);
      const ep = softClamp2(gp.x - hp.x - T.vor * base.pitch, T.eyeMax[1], T.eyeMax[2]);
      const side = ey / DEG, vert = (ep / DEG) * (1 - Math.min(1, Math.max(0, base.blink)));
      const w = (deg: number, full: number) => Math.min(1, Math.max(0, deg / full));
      const morphs: Record<string, number> = {
        // + = toward the viewer's right: the subject's left eye turns out, her right eye in
        eyeLookOutLeft: w(side, EYE_ROT_DEG.out),
        eyeLookInRight: w(side, EYE_ROT_DEG.in),
        eyeLookInLeft: w(-side, EYE_ROT_DEG.in),
        eyeLookOutRight: w(-side, EYE_ROT_DEG.out),
        eyeLookDownLeft: w(vert, EYE_ROT_DEG.down),
        eyeLookDownRight: w(vert, EYE_ROT_DEG.down),
        eyeLookUpLeft: w(-vert, EYE_ROT_DEG.up),
        eyeLookUpRight: w(-vert, EYE_ROT_DEG.up),
      };
      return { yaw: hy.x, pitch: hp.x, morphs, eyeYaw: ey, eyePitch: ep };
    },
  };
}
