import type { Follow } from './follow';

// DOM side of the cursor follow: the pointer anywhere over the page (not only over the card) aims the face.
// Mouse and pen with hover only: touch devices (no hover / coarse pointer) and prefers-reduced-motion keep the idle
// life alone. The pointer plane sits `depth` canvas heights in front of her eyes; the eye point is the engine's
// framing origin (the projected midpoint between the pupils at rest), re-measured every frame so scrolling the card
// under a still cursor also turns her. Leaving the window, hiding the tab or reduced motion releases her to the centre.

export interface PointerFollowOptions {
  canvas: HTMLCanvasElement;
  /** the engine's framing origin for a cssW x cssH canvas, CSS px from its top-left (defaultFraming(w, h).origin) */
  origin: (cssW: number, cssH: number) => [number, number];
  /** pointer-plane distance in canvas heights (default 1) */
  depth?: number;
}

export interface PointerFollow {
  /** true while the device and the user's motion setting allow following */
  readonly enabled: boolean;
  /** call once per frame before follow.step(): re-aims from the last pointer position and the canvas' current place */
  update(): void;
  detach(): void;
}

const now = () => performance.now() / 1000;

export function attachPointerFollow(follow: Follow, opts: PointerFollowOptions): PointerFollow {
  const depth = opts.depth ?? 1;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = fine.matches && !reduce.matches;
  let px = 0, py = 0, has = false;

  const onMedia = () => {
    enabled = fine.matches && !reduce.matches;
    if (!enabled) { follow.release(); has = false; }
  };
  const onMove = (e: PointerEvent) => {
    if (!enabled || e.pointerType === 'touch') return;
    px = e.clientX; py = e.clientY; has = true;
    follow.poke(now());
  };
  // the page moved under a still cursor: she keeps tracking (and it counts as activity)
  const onScroll = () => { if (enabled && has) follow.poke(now()); };
  const onOut = (e: PointerEvent) => { if (!e.relatedTarget) { follow.release(); has = false; } };
  const onHide = () => { if (document.hidden) { follow.release(); has = false; } };
  const onBlur = () => { follow.release(); has = false; };

  fine.addEventListener('change', onMedia);
  reduce.addEventListener('change', onMedia);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.documentElement.addEventListener('pointerleave', onBlur);
  window.addEventListener('pointerout', onOut);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onHide);

  return {
    get enabled() { return enabled; },
    update() {
      if (!has) return;
      const r = opts.canvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const [ox, oy] = opts.origin(r.width, r.height);
      const D = depth * r.height;
      follow.setTarget((px - r.left - ox) / D, (py - r.top - oy) / D);
    },
    detach() {
      fine.removeEventListener('change', onMedia);
      reduce.removeEventListener('change', onMedia);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeEventListener('pointerleave', onBlur);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHide);
    },
  };
}
