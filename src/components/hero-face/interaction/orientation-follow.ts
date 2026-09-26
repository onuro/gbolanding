import type { Follow } from './follow';

// Phones and tablets: the device's tilt aims the face the way the cursor does on desktop (touch devices have no
// hover pointer, so pointer-follow.ts leaves them alone). She keeps eye contact: tilting the phone moves the viewer
// relative to the screen, and she turns after them. Only changes of tilt count: a baseline follows the way the phone
// is held over a few seconds, so any holding angle is neutral and she settles back to the viewer when it is still.
// It listens at once: Android's readings just arrive. iOS sends none until motion access is granted, which Safari only
// asks from a tap, so the first tap on the face card itself (never on its buttons: it cannot stack with the call's
// microphone prompt) asks, if no reading has arrived by then (newer Chrome also has requestPermission; readings
// already arriving there, it is never called). prefers-reduced-motion keeps the idle life alone.

export interface OrientationFollowOptions {
  /** the face card: on iOS the first tap on it (outside buttons / links) asks for motion access */
  card: Element;
}

export interface OrientationFollow {
  /** true while tilt readings arrive and the motion setting allows following */
  readonly enabled: boolean;
  /** call once per frame before follow.step(): aims from the latest (smoothed) tilt */
  update(dt: number): void;
  detach(): void;
}

type IOSOrientationEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

export const TILT = {
  /** tilt (deg) for a full 45 deg look (the follow's pointer-plane x / y = 1) */
  degFull: [22, 18] as [number, number],
  /** baseline time constant (s): how quickly a new holding angle becomes neutral */
  baselineSec: 3.5,
  /** reading smoothing (s): sensor noise */
  smoothSec: 0.08,
  /** tilt change (deg) that counts as activity (keeps her engaged) */
  pokeDeg: 1.2,
  /** 1 = eye contact (she turns after the viewer), -1 = she looks the way the phone tilts */
  sign: 1,
};

const now = () => performance.now() / 1000;
const clamp = (x: number, m: number) => Math.max(-m, Math.min(m, x));

export function attachOrientationFollow(follow: Follow, opts: OrientationFollowOptions): OrientationFollow {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)');
  const DOE = (typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined) as IOSOrientationEvent | undefined;
  let listening = false, reading = false;
  // latest raw reading (screen frame: x = the screen's left-right tilt, y = its top-bottom tilt), smoothed, baseline
  let rx = 0, ry = 0, sx = 0, sy = 0, bx = 0, by = 0, init = false, lastPokeX = 0, lastPokeY = 0;

  const onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    // beta: front-back (the top edge toward the viewer = +), gamma: left-right (the right edge away = +), in the
    // device's portrait frame; rotated into the screen's current frame (landscape swaps the axes)
    const a = ((screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0) + 360) % 360;
    const [x, y] = a === 90 ? [e.beta, -e.gamma] : a === 270 ? [-e.beta, e.gamma] : a === 180 ? [-e.gamma, -e.beta] : [e.gamma, e.beta];
    rx = x; ry = y;
    if (!init) { sx = bx = x; sy = by = y; lastPokeX = x; lastPokeY = y; init = true; }
    reading = true;
  };
  const listen = () => {
    if (listening) return;
    listening = true;
    window.addEventListener('deviceorientation', onOrient);
  };
  const enabledNow = () => !!DOE && coarse.matches && !reduce.matches;
  // iOS: ask on the first plain tap on the card while no reading has come
  const onTap = (e: Event) => {
    const t = e.target as Element | null;
    if (t?.closest('button, a, input, [role="button"]')) return;
    opts.card.removeEventListener('click', onTap);
    if (!reading) DOE?.requestPermission?.().catch(() => { /* denied / not allowed */ });
  };
  if (enabledNow()) {
    listen();
    if (typeof DOE?.requestPermission === 'function') opts.card.addEventListener('click', onTap);
  }
  const onMedia = () => { if (!enabledNow()) { follow.release(); init = false; } };
  reduce.addEventListener('change', onMedia);
  const onHide = () => { if (document.hidden) { follow.release(); init = false; } };
  document.addEventListener('visibilitychange', onHide);

  return {
    get enabled() { return reading && enabledNow(); },
    update(dt) {
      if (!init || !enabledNow()) return;
      const h = Math.min(Math.max(dt, 0), 0.1);
      sx += (rx - sx) * (1 - Math.exp(-h / TILT.smoothSec));
      sy += (ry - sy) * (1 - Math.exp(-h / TILT.smoothSec));
      bx += (sx - bx) * (1 - Math.exp(-h / TILT.baselineSec));
      by += (sy - by) * (1 - Math.exp(-h / TILT.baselineSec));
      // eye contact: the screen's right edge moving away (x +) puts the viewer to the screen's left, so she turns left
      // (target x < 0); its top edge moving away (y -) puts the viewer lower, so she looks down (target y > 0)
      follow.setTarget(clamp((-TILT.sign * (sx - bx)) / TILT.degFull[0], 1.5), clamp((-TILT.sign * (sy - by)) / TILT.degFull[1], 1.5));
      if (Math.abs(sx - lastPokeX) > TILT.pokeDeg || Math.abs(sy - lastPokeY) > TILT.pokeDeg) {
        lastPokeX = sx; lastPokeY = sy;
        follow.poke(now());
      }
    },
    detach() {
      window.removeEventListener('deviceorientation', onOrient);
      opts.card.removeEventListener('click', onTap);
      reduce.removeEventListener('change', onMedia);
      document.removeEventListener('visibilitychange', onHide);
    },
  };
}
