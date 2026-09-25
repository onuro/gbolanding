// Geometry for dot-matrix drawings, in the manner of an LED panel: every mark is
// a round dot of one size, spaced on a steady pitch, so curves and straights
// share a rhythm. Runs at build time; the page only ships the finished dots.
//
// Coordinates live in a 480×360 box. Angles are degrees with 0 at 3 o'clock,
// growing clockwise on screen (y points down).

export type Point = readonly [number, number];

/** ink is the drawing, dim is structure behind it, accent is the one lit part. */
export type Tone = "ink" | "dim" | "accent";

export interface Dot {
  x: number;
  y: number;
  tone: Tone;
  /** Boot step for an ink dot, 0..1, when the drawing wants its own order. */
  order?: number;
}

export const dot = ([x, y]: Point, tone: Tone, order?: number): Dot => ({ x, y, tone, order });

export const dots = (points: Point[], tone: Tone): Dot[] =>
  points.map((point) => dot(point, tone));

export const polar = ([cx, cy]: Point, r: number, deg: number): Point => {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
};

/** `count` evenly spaced angles; a full turn leaves out the duplicate end. */
export const angles = (count: number, from = 0, to = from + 360): number[] => {
  const closed = Math.abs(to - from) >= 360;
  const gaps = closed ? count : count - 1;
  return Array.from({ length: count }, (_, i) => from + ((to - from) * i) / gaps);
};

/**
 * How many dots go round a circle of radius r to sit about `pitch` apart,
 * rounded to a multiple of `multiple`; 4 puts a dot on each axis.
 */
export const ringCount = (r: number, pitch: number, multiple = 4): number =>
  Math.max(1, Math.round((2 * Math.PI * r) / (pitch * multiple))) * multiple;

/** Dots round a circle about `pitch` apart, the first at `from` degrees. */
export const ring = (center: Point, r: number, pitch: number, from = 0): Point[] =>
  angles(ringCount(r, pitch), from).map((deg) => polar(center, r, deg));

/** Both ends included, gaps as close to `pitch` as a whole count allows. */
export function line(a: Point, b: Point, pitch: number): Point[] {
  const gaps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / pitch));
  return Array.from({ length: gaps + 1 }, (_, i) => {
    const t = i / gaps;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as const;
  });
}

/** Each segment is spaced on its own, so every corner lands on a dot. */
export function polyline(points: Point[], pitch: number, closed = false): Point[] {
  const path = closed ? [...points, points[0]] : points;
  const out: Point[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    out.push(...line(path[i], path[i + 1], pitch).slice(i === 0 ? 0 : 1));
  }
  if (closed) out.pop();
  return out;
}

/**
 * Dots at equal arc length along any parametric curve, t running 0..1. Closed
 * curves share their first and last dot.
 */
export function trace(at: (t: number) => Point, pitch: number, closed = false): Point[] {
  const STEPS = 1440;
  const samples: Point[] = [at(0)];
  const lengths = [0];
  for (let i = 1; i <= STEPS; i++) {
    const p = at(i / STEPS);
    const q = samples[i - 1];
    samples.push(p);
    lengths.push(lengths[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]));
  }

  const total = lengths[STEPS];
  const gaps = Math.max(1, Math.round(total / pitch));
  const out: Point[] = [];
  let seg = 0;
  for (let k = 0; k < (closed ? gaps : gaps + 1); k++) {
    const target = (total * k) / gaps;
    while (seg < STEPS - 1 && lengths[seg + 1] < target) seg++;
    const span = lengths[seg + 1] - lengths[seg] || 1;
    const f = Math.min(1, Math.max(0, (target - lengths[seg]) / span));
    const [ax, ay] = samples[seg];
    const [bx, by] = samples[seg + 1];
    out.push([ax + (bx - ax) * f, ay + (by - ay) * f]);
  }
  return out;
}

/** Ellipse, turned `tilt` degrees about its centre. */
export function oval(center: Point, rx: number, ry: number, pitch: number, tilt = 0): Point[] {
  const cos = Math.cos((tilt * Math.PI) / 180);
  const sin = Math.sin((tilt * Math.PI) / 180);
  return trace(
    (t) => {
      const a = t * Math.PI * 2;
      const x = rx * Math.cos(a);
      const y = ry * Math.sin(a);
      return [center[0] + x * cos - y * sin, center[1] + x * sin + y * cos];
    },
    pitch,
    true,
  );
}

/**
 * Solid round halftone: a hex-packed field clipped to a circle. Reads as one
 * disc where a square grid turns blocky and concentric rings read as a target.
 */
export function hexDisc(center: Point, r: number, pitch: number): Point[] {
  const out: Point[] = [];
  const rowStep = (pitch * Math.sqrt(3)) / 2;
  const rows = Math.floor(r / rowStep);
  for (let j = -rows; j <= rows; j++) {
    const y = j * rowStep;
    const shift = Math.abs(j) % 2 ? pitch / 2 : 0;
    const cols = Math.ceil(r / pitch) + 1;
    for (let i = -cols; i <= cols; i++) {
      const x = i * pitch + shift;
      if (Math.hypot(x, y) <= r) out.push([center[0] + x, center[1] + y]);
    }
  }
  return out;
}

/** Points o + i·u + j·v for i in 0..n, j in 0..m, kept where `keep` says. */
export function lattice(
  o: Point,
  u: Point,
  v: Point,
  n: number,
  m: number,
  keep: (i: number, j: number) => boolean = () => true,
): Point[] {
  const out: Point[] = [];
  for (let j = 0; j <= m; j++) {
    for (let i = 0; i <= n; i++) {
      if (keep(i, j)) out.push([o[0] + i * u[0] + j * v[0], o[1] + i * u[1] + j * v[1]]);
    }
  }
  return out;
}

/**
 * Flattens layers into one drawing, dropping any dot that would crowd one
 * already placed. Earlier layers win, so list the accent first and the dim
 * structure last.
 */
export function compose(gap: number, ...layers: Dot[][]): Dot[] {
  const kept: Dot[] = [];
  const limit = gap * gap;
  for (const layer of layers) {
    for (const d of layer) {
      if (kept.some((k) => (k.x - d.x) ** 2 + (k.y - d.y) ** 2 < limit)) continue;
      kept.push(d);
    }
  }
  return kept;
}

export interface Mark {
  tone: Tone;
  /**
   * Boot order, like a panel powering on: the dim structure first (0), ink in
   * scattered steps (1..INK_STEPS), the accent last (INK_STEPS + 1).
   */
  step: number;
  d: string;
}

// Hashed from position so the server render always scatters the same way.
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const num = (v: number) => String(Math.round(v * 10) / 10).replace(/^(-?)0\./, "$1.");

export const INK_STEPS = 7;

/**
 * One path per tone and boot step. Each dot is a zero-length subpath, which a
 * round cap draws as a circle, so a dot costs a dozen bytes of markup. Ink
 * lights outward from `center` with some scatter, so it reads as a panel
 * finding power rather than a wipe, unless a dot carries its own order.
 */
export function render(drawing: Dot[], center: Point = [240, 180]): Mark[] {
  const reach = Math.max(
    1,
    ...drawing.map((d) => Math.hypot(d.x - center[0], d.y - center[1])),
  );
  const groups = new Map<string, Mark>();
  for (const d of drawing) {
    const spread = Math.hypot(d.x - center[0], d.y - center[1]) / reach;
    const order = d.order ?? spread * 0.6 + hash(d.x, d.y) * 0.4;
    const step =
      d.tone === "dim"
        ? 0
        : d.tone === "accent"
          ? INK_STEPS + 1
          : 1 + Math.min(INK_STEPS - 1, Math.floor(order * INK_STEPS));
    const key = `${d.tone}:${step}`;
    const mark = groups.get(key) ?? { tone: d.tone, step, d: "" };
    mark.d += `M${num(d.x)} ${num(d.y)}h0`;
    groups.set(key, mark);
  }
  return [...groups.values()].sort((a, b) => a.step - b.step);
}
