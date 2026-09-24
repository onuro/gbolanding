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
  trace,
  type Dot,
  type Point,
} from "./dot-matrix";

const O: Point = [240, 180];
const PITCH = 9;
// Closest two dots may sit; where strokes cross, the later one gives way.
const GAP = 5.4;

// Discovery: a scope that has found one thing worth fixing.
function analysis(): Dot[] {
  const BEARING = 324;
  const lit = (deg: number) => Math.abs(deg - BEARING) <= 12;

  const target = polar(O, 62, BEARING);
  const blip = dots(
    [...hexDisc(target, 5.6, 5.4), ...angles(12).map((deg) => polar(target, 15, deg))],
    "accent",
  );

  const bezel = angles(60).map((deg) =>
    dot(polar(O, 108, deg), lit(deg) ? "accent" : deg % 30 === 0 ? "ink" : "dim"),
  );
  const majors = angles(12).map((deg) => dot(polar(O, 100, deg), lit(deg) ? "accent" : "ink"));
  const scope = dots(angles(60).map((deg) => polar(O, 86, deg)), "ink");
  const inner = dots(angles(36).map((deg) => polar(O, 43, deg)), "dim");
  // On an 8.6 pitch so both rings fall on the axis rhythm.
  const axes = [0, 90, 180, 270].flatMap((deg) =>
    [8.6, 17.2, 25.8, 34.4, 51.6, 60.2, 68.8, 77.4].map((r) => dot(polar(O, r, deg), "dim")),
  );
  const brackets = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].flatMap(([sx, sy]) => {
    const corner: Point = [240 + sx * 124, 180 + sy * 118];
    return dots(
      polyline([[corner[0] - sx * 22, corner[1]], corner, [corner[0], corner[1] - sy * 22]], 7.4),
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

  const step = (from: Point, to: Point): Point => [(to[0] - from[0]) / 8, (to[1] - from[1]) / 8];
  const interior = (i: number, j: number) => i > 0 && j > 0 && i < 8 && j < 8;

  const top = dots(lattice(T, step(T, UR), step(T, UL), 8, 8, interior), "accent");
  const side = dots(lattice(UL, step(UL, C), step(UL, LL), 8, 8, interior), "dim");
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
    trace((t) => edge(-90 + 90 * (q + t)), 6.4).slice(1),
  );

  const orbits = dots([45, -45].flatMap((tilt) => oval(O, 118, 46, PITCH, tilt)), "ink");
  const rays = [0, 90, 180, 270].flatMap((deg) =>
    [72, 81, 90, 99].map((r) => dot(polar(O, r, deg), "dim")),
  );

  return compose(GAP, dots([...spark, ...hexDisc(O, 12, 5.6)], "accent"), orbits, rays);
}

// Integration: every system on a spoke, meeting at one hub.
function integration(): Dot[] {
  const spokes = [-90, -30, 30, 90, 150, 210];
  const hub = dots(hexDisc(O, 17, 5.6), "accent");
  const nodes = spokes.flatMap((deg) =>
    [48, 96].flatMap((r) => {
      const center = polar(O, r, deg);
      return dots(angles(12, deg).map((a) => polar(center, 14, a)), "ink");
    }),
  );
  const links = spokes.flatMap((deg) =>
    [21.5, 28, 68.5, 75.5].map((r) => dot(polar(O, r, deg), "dim")),
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

  const pupil = dots(hexDisc(O, 17, 5.6), "accent");
  const iris = dots(angles(36).map((deg) => polar(O, 48, deg)), "ink");
  const lids = dots([...lid(270, -1), ...lid(90, 1)], "ink");
  const fibres = angles(24, 7.5).flatMap((deg) =>
    [26, 33, 40].map((r) => dot(polar(O, r, deg), "dim")),
  );
  const sight = dots(
    [
      line([78, 180], [108, 180], 7.5),
      line([372, 180], [402, 180], 7.5),
      line([240, 90], [240, 106], 8),
      line([240, 254], [240, 270], 8),
    ].flat(),
    "dim",
  );

  return compose(GAP, pupil, iris, lids, sight, fibres);
}

// Improvement: an LED level meter. Every cell is drawn so the unlit headroom
// shows; each release sits a little higher than the last, with the dips that
// come from learning, and the newest is lit. It fills from the bottom row up.
function improvement(): Dot[] {
  const LEVELS = [4, 6, 5, 8, 10, 9, 12, 14, 13, 16, 18, 17, 21];
  const ROWS = 21;
  const DX = 15;
  const DY = 8.4;
  const left = 240 - ((LEVELS.length - 1) * DX) / 2;
  const bottom = 180 + ((ROWS - 1) * DY) / 2;

  return LEVELS.flatMap((level, col) =>
    Array.from({ length: ROWS }, (_, row) =>
      dot(
        [left + col * DX, bottom - row * DY],
        row >= level ? "dim" : col === LEVELS.length - 1 ? "accent" : "ink",
        row / ROWS,
      ),
    ),
  );
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
