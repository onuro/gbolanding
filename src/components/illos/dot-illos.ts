// The platform drawings as dot-matrix art. Each keeps one idea, draws its
// structure in dim dots behind the ink, and lights exactly one part in the
// accent: the thing the card is about.
import {
  angles,
  compose,
  dot,
  dots,
  hexDisc,
  lattice,
  line,
  oval,
  polar,
  polyline,
  ring,
  ringCount,
  trace,
  type Dot,
  type Point,
} from "./dot-matrix";

// The panel's resolution. Every spacing below is a multiple of it, so a finer
// pitch means more dots in the same drawings, not smaller drawings.
export const PITCH = 6;
/** Dot diameter, drawn as the stroke width. */
export const DOT = PITCH * 0.42;

const O: Point = [240, 180];
// Halftone fills pack tighter than strokes.
const FILL = PITCH * 0.62;
// Closest two dots may sit; where strokes cross, the later one gives way.
const GAP = PITCH * 0.6;

// Discovery: a scope that has found one thing worth fixing.
function analysis(): Dot[] {
  const BEARING = 324;
  const lit = (deg: number) => Math.abs(deg - BEARING) <= 12;

  const target = polar(O, 62, BEARING);
  const blip = dots([...hexDisc(target, 7.5, FILL), ...ring(target, 15, PITCH * 0.87)], "accent");

  // Divisible by 12, so every 30° lands on a dot.
  const bezel = angles(ringCount(108, PITCH * 1.25, 12)).map((deg) =>
    dot(polar(O, 108, deg), lit(deg) ? "accent" : deg % 30 === 0 ? "ink" : "dim"),
  );
  const majors = angles(12).map((deg) => dot(polar(O, 100, deg), lit(deg) ? "accent" : "ink"));
  const scope = dots(ring(O, 86, PITCH), "ink");
  const inner = dots(ring(O, 43, PITCH * 0.84), "dim");
  // On a pitch that divides 43, so both rings fall on the axis rhythm.
  const axisPitch = 43 / Math.ceil(43 / PITCH);
  const axes = [0, 90, 180, 270].flatMap((deg) =>
    dots(line(O, polar(O, 86, deg), axisPitch), "dim"),
  );
  const brackets = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].flatMap(([sx, sy]) => {
    const corner: Point = [240 + sx * 124, 180 + sy * 118];
    return dots(
      polyline(
        [[corner[0] - sx * 22, corner[1]], corner, [corner[0], corner[1] - sy * 22]],
        PITCH * 0.82,
      ),
      "ink",
    );
  });

  return compose(GAP, blip, bezel, majors, scope, [dot(O, "ink")], brackets, inner, axes);
}

// Design: an isometric product inside the brief's triangle; its top face is
// the part being designed.
function design(): Dot[] {
  const apex: Point = [240, 76];
  const left: Point = [120, 284];
  const right: Point = [360, 284];
  // Isometric cube with 69.28 edges, resting on the triangle's base.
  const T: Point = [240, 145.36];
  const UL: Point = [180, 180];
  const UR: Point = [300, 180];
  const C: Point = [240, 214.64];
  const LL: Point = [180, 249.28];
  const LR: Point = [300, 249.28];
  const B: Point = [240, 284];

  // As many steps across a face as there are gaps along an edge, so the
  // faces' dots line up with the edges'.
  const N = Math.round(Math.hypot(UL[0] - T[0], UL[1] - T[1]) / PITCH);
  const step = (from: Point, to: Point): Point => [(to[0] - from[0]) / N, (to[1] - from[1]) / N];
  const interior = (i: number, j: number) => i > 0 && j > 0 && i < N && j < N;

  const top = dots(lattice(T, step(T, UR), step(T, UL), N, N, interior), "accent");
  const side = dots(lattice(UL, step(UL, C), step(UL, LL), N, N, interior), "dim");
  const edges = dots(
    [
      [T, UL],
      [T, UR],
      [UL, C],
      [UR, C],
      [UL, LL],
      [C, B],
      [UR, LR],
      [LL, B],
      [LR, B],
    ].flatMap(([a, b]) => line(a, b, PITCH)),
    "ink",
  );
  // Through the edge midpoints, so the cube's three touching corners land on dots.
  const frame = dots(polyline([apex, UL, left, B, right, UR], PITCH, true), "ink");
  const struts = dots(
    [line(apex, T, PITCH), line(LL, left, PITCH), line(LR, right, PITCH)].flat(),
    "dim",
  );

  return compose(GAP, top, edges, frame, side, struts);
}

// Automation: the AI spark, with the loops it runs.
function automation(): Dot[] {
  // The spark is the superellipse |x|^0.62 + |y|^0.62 = 58^0.62, drawn as an
  // outline so its concave sides stay crisp. Traced a quarter at a time so
  // every tip lands on a dot.
  const REACH = 58;
  const E = 2 / 0.62;
  const edge = (deg: number): Point => {
    const cos = Math.cos((deg * Math.PI) / 180);
    const sin = Math.sin((deg * Math.PI) / 180);
    return [
      240 + REACH * Math.sign(cos) * Math.abs(cos) ** E,
      180 + REACH * Math.sign(sin) * Math.abs(sin) ** E,
    ];
  };
  const spark = [0, 1, 2, 3].flatMap((q) =>
    trace((t) => edge(-90 + 90 * (q + t)), PITCH * 0.71).slice(1),
  );

  const orbits = dots([45, -45].flatMap((tilt) => oval(O, 118, 46, PITCH, tilt)), "ink");
  const rays = [0, 90, 180, 270].flatMap((deg) =>
    dots(line(polar(O, 72, deg), polar(O, 99, deg), PITCH), "dim"),
  );

  return compose(GAP, dots([...spark, ...hexDisc(O, 12, FILL)], "accent"), orbits, rays);
}

// Integration: every system on a spoke, meeting at one hub.
function integration(): Dot[] {
  const spokes = [-90, -30, 30, 90, 150, 210];
  const hub = dots(hexDisc(O, 17, FILL), "accent");
  const nodes = spokes.flatMap((deg) =>
    [48, 96].flatMap((r) => dots(ring(polar(O, r, deg), 14, PITCH * 0.8, deg), "ink")),
  );
  // Dotted links across the gaps: hub to inner ring, inner ring to outer.
  const links = spokes.flatMap((deg) =>
    [
      [17, 34],
      [62, 82],
    ].flatMap(([from, to]) =>
      dots(line(polar(O, from, deg), polar(O, to, deg), PITCH * 0.72).slice(1, -1), "dim"),
    ),
  );

  return compose(GAP, hub, nodes, links);
}

// Oversight: a person's eye on the system, pupil lit.
function oversight(): Dot[] {
  // Each lid is an arc of r=150 meeting the other at the eye's corners.
  const lid = (cy: number, sign: number) =>
    trace((t) => {
      const x = 120 + 240 * t;
      return [x, cy + sign * Math.sqrt(150 ** 2 - (x - 240) ** 2)];
    }, PITCH);

  const pupil = dots(hexDisc(O, 17, FILL), "accent");
  const iris = dots(ring(O, 48, PITCH * 0.93), "ink");
  const lids = dots([...lid(270, -1), ...lid(90, 1)], "ink");
  // Half a step round, so no fibre runs into a sight line on the axes.
  const fibreCount = ringCount(26, PITCH * 0.76);
  const fibres = angles(fibreCount, 180 / fibreCount).flatMap((deg) =>
    dots(line(polar(O, 26, deg), polar(O, 40, deg), PITCH * 0.78), "dim"),
  );
  const sight = dots(
    [
      line([78, 180], [108, 180], PITCH * 0.85),
      line([372, 180], [402, 180], PITCH * 0.85),
      line([240, 90], [240, 106], PITCH * 0.85),
      line([240, 254], [240, 270], PITCH * 0.85),
    ].flat(),
    "dim",
  );

  return compose(GAP, pupil, iris, lids, sight, fibres);
}

// Improvement: an LED level meter. Every cell is drawn so the unlit headroom
// shows. Releases climb in threes, a step, a jump and a dip that comes from
// learning, and the newest fills the meter. It fills from the bottom row up.
function improvement(): Dot[] {
  const WIDTH = 180;
  const HEIGHT = 168;
  const cols = Math.round(WIDTH / (PITCH * 1.67)) + 1;
  const rows = Math.round(HEIGHT / (PITCH * 0.93)) + 1;
  const dx = WIDTH / (cols - 1);
  const dy = HEIGHT / (rows - 1);
  const left = 240 - WIDTH / 2;
  const bottom = 180 + HEIGHT / 2;

  const perThree = 0.76 / ((cols - 1) / 3);
  const level = (col: number) =>
    col === cols - 1
      ? rows
      : Math.round(rows * (0.19 + perThree * (Math.floor(col / 3) + [0, 0.5, 0.25][col % 3])));

  return Array.from({ length: cols }, (_, col) =>
    Array.from({ length: rows }, (_, row) =>
      dot(
        [left + col * dx, bottom - row * dy],
        row >= level(col) ? "dim" : col === cols - 1 ? "accent" : "ink",
        row / rows,
      ),
    ),
  ).flat();
}

export const dotIllos = {
  analysis,
  design,
  automation,
  integration,
  oversight,
  improvement,
};

export type DotIlloName = keyof typeof dotIllos;
