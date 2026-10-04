// Isometric scenes for the platform figures. Objects are drawn in world space
// (x runs down-right, y down-left, z up, in the 2:1 projection of a pixel-art
// isometric) and described as marks: lines, faces and loose dots, which
// IsoFigure.astro draws as hairlines in the manner of Linear's figure plates.
// A solid object carries its silhouette as an occluder filled with the card
// colour, so whatever it stands in front of is hidden, and stays hidden while
// it moves.
import type { Point, Tone } from "./dot-matrix";

export type V3 = readonly [number, number, number];

export interface View {
  ox: number;
  oy: number;
  /** World units per screen unit. */
  k?: number;
}

export const project =
  ({ ox, oy, k = 1 }: View) =>
  ([x, y, z]: V3): Point => [ox + (x - y) * k, oy + ((x + y) / 2 - z) * k];

export interface Box {
  top: Point[];
  /** The face looking down-right (+x). */
  right: Point[];
  /** The face looking down-left (+y). */
  left: Point[];
  silhouette: Point[];
  /** The three edges inside the silhouette, meeting at the near corner. */
  inner: [Point, Point][];
}

export function box(P: (v: V3) => Point, [x, y, z]: V3, [w, d, h]: V3): Box {
  const at = (dx: number, dy: number, dz: number) => P([x + dx, y + dy, z + dz]);
  const t0 = at(0, 0, h);
  const t1 = at(w, 0, h);
  const t2 = at(w, d, h);
  const t3 = at(0, d, h);
  const b1 = at(w, 0, 0);
  const b2 = at(w, d, 0);
  const b3 = at(0, d, 0);
  return {
    top: [t0, t1, t2, t3],
    right: [b1, b2, t2, t1],
    left: [b3, b2, t2, t3],
    silhouette: [t0, t1, b1, b2, b3, t3],
    inner: [
      [t1, t2],
      [t3, t2],
      [b2, t2],
    ],
  };
}

const dist = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

const inside = (u: number, v: number) => u > 0 && v > 0 && u < 1 && v < 1;

/**
 * A halftone across a parallelogram face (corners a, b, c, d in order), on a
 * grid that runs with its edges. `keep` sees each dot's place as fractions
 * along the two sides.
 */
export function face(
  [a, b, , d]: Point[],
  pitch: number,
  keep: (u: number, v: number) => boolean = inside,
): Point[] {
  const n = Math.max(1, Math.round(dist(a, b) / pitch));
  const m = Math.max(1, Math.round(dist(a, d) / pitch));
  const out: Point[] = [];
  for (let j = 0; j <= m; j++) {
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const v = j / m;
      if (keep(u, v)) {
        out.push([a[0] + (b[0] - a[0]) * u + (d[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (d[1] - a[1]) * v]);
      }
    }
  }
  return out;
}

/** A circle, or an arc of one (in turns), lying flat at height z. */
export const flatCircle = (
  P: (v: V3) => Point,
  [cx, cy, z]: V3,
  r: number,
  from = 0,
  to = 1,
  steps = 96,
): Point[] => {
  const closed = to - from >= 1;
  const count = closed ? steps : steps + 1;
  return Array.from({ length: count }, (_, i) => {
    const a = (from + ((to - from) * i) / steps) * Math.PI * 2;
    return P([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
  });
};

/** Shortest distance from p to a polyline. */
export function distanceToPolyline(p: Point, points: Point[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(p[0] - (ax + dx * t), p[1] - (ay + dy * t)));
  }
  return best;
}

/** A polyline or a sampled curve. */
export interface LineMark {
  kind: "line";
  points: Point[];
  tone: Tone;
  closed?: boolean;
  /** An edge inside an object's outline: drawn softer. */
  inner?: boolean;
  /** A guide or a path: drawn as a row of dots. */
  dash?: boolean;
  /** Line weight, as a multiple of the hairline. */
  weight?: number;
}

/**
 * A flat parallelogram face, corners in order: shaded when dim, and when lit
 * an accent wash under a halftone of dots.
 */
export interface FaceMark {
  kind: "face";
  corners: Point[];
  tone: Tone;
  /** Which of the halftone's dots to keep, by their place along its two sides. */
  keep?: (u: number, v: number) => boolean;
}

/** Loose dots: packets, a rider on an orbit. */
export interface DotsMark {
  kind: "dots";
  points: Point[];
  tone: Tone;
}

export type Mark = LineMark | FaceMark | DotsMark;

type LineOptions = Omit<LineMark, "kind" | "points" | "tone">;

export const ln = (points: Point[], tone: Tone, options: LineOptions = {}): LineMark => ({
  kind: "line",
  points,
  tone,
  ...options,
});

/** Several separate segments of one tone. */
export const segs = (segments: [Point, Point][], tone: Tone, options: LineOptions = {}): LineMark[] =>
  segments.map((s) => ln(s, tone, options));

export const fc = (corners: Point[], tone: Tone, keep?: FaceMark["keep"]): FaceMark => ({
  kind: "face",
  corners,
  tone,
  keep,
});

export const dt = (points: Point[], tone: Tone): DotsMark => ({ kind: "dots", points, tone });

/**
 * An LED pattern on a small grid of dots: each lights to full ink in its slot
 * and fades back, so a band of light moves across the grid.
 */
export interface Led {
  points: Point[];
  /** Delay slot per dot. */
  order: number[];
  /** Milliseconds between neighbouring slots. */
  step: number;
  /** One full cycle, in milliseconds. */
  cycle: number;
}

/**
 * A looping move, played by a keyframe set in IsoFigure.astro. `vars` become
 * custom properties in screen units (px), so one keyframe set serves any
 * geometry: a component's drop, a packet's run, a slab's depth.
 */
export interface Motion {
  name: "place" | "guide" | "travel" | "deliver" | "press" | "rise";
  vars?: Record<string, number>;
  duration: number;
  /** Negative to start part-way through, which is how packets are spaced. */
  delay?: number;
}

/** A dot riding a flat circle on the floor, as seen in the projection. */
export interface Orbit {
  center: Point;
  /** Half the projected ellipse's width; its height is half that. */
  rx: number;
  duration: number;
  delay: number;
  /** Trailing dots fade: 1 for the head. */
  strength: number;
}

export interface Group {
  motion?: Motion;
  /** Draws the group at this strength: a packet's fading tail. */
  fade?: number;
  /** Content outside this polygon is cut away: the floor a slab rises from. */
  clip?: Point[];
  occluders?: Point[][];
  marks: Mark[];
  leds?: Led[];
  /** The group is one dot at the origin, carried round an orbit. */
  orbit?: Orbit;
}

export interface Figure {
  groups: Group[];
}

// SVG path text in whole tenths of a unit.
const tenths = (v: number) => Math.round(v * 10);
const fmt = (t: number) => String(t / 10).replace(/^(-?)0\./, "$1.");
const pair = (a: number, b: number) => {
  const second = fmt(b);
  return `${fmt(a)}${second.startsWith("-") ? "" : " "}${second}`;
};

/** A coordinate as path text, to a tenth. */
export const num = (v: number) => fmt(tenths(v));

/**
 * Dots as zero-length subpaths, which a round cap draws as circles. After the
 * first, each is a relative move, so a few hundred dots stay a short string.
 */
export function dotsPath(points: Point[]): string {
  let out = "";
  let px = 0;
  let py = 0;
  points.forEach(([x, y], i) => {
    const tx = tenths(x);
    const ty = tenths(y);
    out += i === 0 ? `M${pair(tx, ty)}h0` : `m${pair(tx - px, ty - py)}h0`;
    px = tx;
    py = ty;
  });
  return out;
}

export const polyPath = (points: Point[], closed = false) =>
  `M${points.map(([x, y]) => pair(tenths(x), tenths(y))).join("L")}${closed ? "Z" : ""}`;
