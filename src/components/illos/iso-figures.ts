// The platform figures: each card's idea drawn as a small isometric scene.
// Structure is dim, the object is ink, and exactly one part is lit in the
// accent: the thing the card is about. Each scene loops one small story while
// it is on screen (IsoFigure.astro plays them): the component is placed,
// packets travel, a proposal goes into the key, releases rise. Scenes are
// marks that IsoFigure.astro draws as hairlines, with dots kept for what is
// alive. The first figure, the scope, is drawn by hand in ScopeFigure.astro:
// its light and its path need more than marks can say.
import type { Point, Tone } from "./dot-matrix";
import {
  box,
  distanceToPolyline,
  dt,
  fc,
  flatCircle,
  ln,
  project,
  segs,
  type Box,
  type Figure,
  type Group,
  type Led,
  type Mark,
  type V3,
} from "./iso";

// The dots that stay: halftones on lit faces, packets, loaders.
export const PITCH = 4.5;
/** Dot diameter, drawn as the stroke width. */
export const DOT = PITCH * 0.46;
/** Hairline weight in viewBox units: about 0.8 CSS px at a card's width. */
export const LINE = 1.1;

// World to screen. Every scene is centred when drawn, so only the scale matters.
const K = 1.3;
const view = () => project({ ox: 240, oy: 180, k: K });

const minus = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];

interface SolidStyle {
  edge?: Tone;
  top?: Tone;
  right?: Tone;
  left?: Tone;
  topKeep?: (u: number, v: number) => boolean;
}

/** A box: lit faces first so they win, then its outline and inner edges, then shading. */
const solid = (b: Box, { edge = "ink", top, right, left, topKeep }: SolidStyle = {}): Mark[] => [
  ...(top ? [fc(b.top, top, topKeep)] : []),
  ln(b.silhouette, edge, { closed: true }),
  ...segs(b.inner, edge, { inner: true }),
  ...(right ? [fc(b.right, right)] : []),
  ...(left ? [fc(b.left, left)] : []),
];

/** A flat rectangle at height z, x0..x1 by y0..y1, corners in drawing order. */
const flatRect = (P: (v: V3) => Point, x0: number, y0: number, x1: number, y1: number, z: number) => [
  P([x0, y0, z]),
  P([x1, y0, z]),
  P([x1, y1, z]),
  P([x0, y1, z]),
];

/** Packets evenly spaced in time, sliding from a to b, each a head and a tail. */
const packets = (a: Point, b: Point, count: number, duration: number, offset = 0): Group[] =>
  Array.from({ length: count }).flatMap((_, n) =>
    [1, 0.45].map((fade, k) => ({
      motion: {
        name: "travel" as const,
        vars: { tx: b[0] - a[0], ty: b[1] - a[1] },
        duration,
        delay: -offset - (n * duration) / count + k * 90,
      },
      fade: fade < 1 ? fade : undefined,
      marks: [dt([a], "accent")],
    })),
  );

// Design: a screen laid out on its canvas, and the one component being
// shaped: it lifts off its place, is considered, and is set back down.
function design(): Figure {
  const P = view();
  const canvas = box(P, [-76, -54, 0], [152, 108, 8]);
  const Z = 8;

  const rects = [
    flatRect(P, -68, -46, 68, -36, Z), // header
    flatRect(P, -68, -30, -44, 46, Z), // sidebar
    flatRect(P, 18, -30, 68, 6, Z), // card
    flatRect(P, -38, 12, 68, 46, Z), // wide card
  ];
  // Text lines and menu items.
  const lines = [
    [-62, -24, -50],
    [-62, -16, -54],
    [-62, -8, -52],
    [24, -22, 52],
    [24, -14, 44],
    [-32, 20, 30],
    [-32, 28, 50],
    [-32, 36, 18],
  ].map(([x0, y, x1]): [Point, Point] => [P([x0, y, Z]), P([x1, y, Z])]);

  const [x0, y0, x1, y1] = [-38, -30, 12, 6];
  const LIFT = 40;
  const part = box(P, [x0, y0, Z + LIFT], [x1 - x0, y1 - y0, 7]);
  const guides = (
    [
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ] as const
  ).map(([x, y]): [Point, Point] => [P([x, y, Z + 3]), P([x, y, Z + LIFT - 2])]);

  const PLACE = 6400;
  return {
    groups: [
      {
        occluders: [canvas.silhouette],
        marks: [
          ...solid(canvas),
          ln([P([-64, -41, Z]), P([-56, -41, Z])], "ink"),
          ln(flatRect(P, x0, y0, x1, y1, Z), "dim", { closed: true, dash: true }),
          ...rects.map((r) => ln(r, "dim", { closed: true })),
          ...segs(lines, "dim"),
        ],
      },
      {
        motion: { name: "guide", duration: PLACE },
        marks: segs(guides, "dim", { dash: true }),
      },
      {
        motion: { name: "place", vars: { drop: LIFT * K }, duration: PLACE },
        occluders: [part.silhouette],
        marks: solid(part, { top: "accent", right: "dim" }),
      },
    ],
  };
}

// A small task grid with a band of light moving across it.
function led(P: (v: V3) => Point, [x, y, z]: V3, size: number, pattern: (i: number, j: number) => number): Led {
  const pad = size * 0.16;
  const n = Math.max(4, Math.round((size - pad * 2) / (PITCH * 0.95)) + 1);
  const s = (size - pad * 2) / (n - 1);
  const points: Point[] = [];
  const order: number[] = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      points.push(P([x + pad + i * s, y + pad + j * s, z]));
      order.push(pattern(i / (n - 1), j / (n - 1)));
    }
  }
  return { points, order, step: 900, cycle: 1800 };
}

// Automation: the AI at the centre, routine work running on the tiles around
// it, and the work itself travelling round one loop.
function automation(): Figure {
  const P = view();
  const R = 86;
  // Clockwise on screen; an arrowhead on each open stretch of the loop.
  const arrows = [0, 180].flatMap((deg): [Point, Point][] => {
    const a = (deg * Math.PI) / 180;
    const tip = P([R * Math.cos(a), R * Math.sin(a), 0]);
    const ahead = P([R * Math.cos(a + 0.05), R * Math.sin(a + 0.05), 0]);
    const len = Math.hypot(ahead[0] - tip[0], ahead[1] - tip[1]);
    const back: Point = [(tip[0] - ahead[0]) / len, (tip[1] - ahead[1]) / len];
    return [-1, 1].map((side) => {
      const c = Math.cos((side * 38 * Math.PI) / 180);
      const s = Math.sin((side * 38 * Math.PI) / 180);
      return [tip, [tip[0] + (back[0] * c - back[1] * s) * 15, tip[1] + (back[0] * s + back[1] * c) * 15]];
    });
  });

  // Three pieces of work on the loop, each a head and a fading tail. A flat
  // circle of radius R projects to an ellipse √2·R wide and half as tall.
  const ORBIT = 6000;
  const riders: Group[] = [0, 1, 2].flatMap((p) =>
    [1, 0.5, 0.22].map((strength, k) => ({
      orbit: {
        center: P([0, 0, 0]),
        rx: Math.SQRT2 * R * K,
        duration: ORBIT,
        delay: -((p * ORBIT) / 3 + k * 70),
        strength,
      },
      marks: [dt([[0, 0]], "ink")],
    })),
  );

  const T = 34;
  const tile = (deg: number, pattern: (u: number, v: number) => number): Group => {
    const a = (deg * Math.PI) / 180;
    const x = R * Math.cos(a) - T / 2;
    const y = R * Math.sin(a) - T / 2;
    const b = box(P, [x, y, 0], [T, T, 8]);
    return {
      occluders: [b.silhouette],
      marks: solid(b),
      leds: [led(P, [x, y, 8], T, pattern)],
    };
  };

  const core = box(P, [-23, -23, 0], [46, 46, 46]);

  return {
    groups: [
      {
        marks: [
          ...segs(arrows, "ink"),
          ln(flatCircle(P, [0, 0, 0], R), "dim", { closed: true, dash: true }),
        ],
      },
      ...riders,
      { occluders: [core.silhouette], marks: solid(core, { top: "accent", right: "dim" }) },
      // A diagonal sweep, rows climbing, and a ring opening from the centre.
      tile(135, (u, v) => (u + v) / 2),
      tile(315, (u, v) => 1 - v + u * 0.08),
      tile(45, (u, v) => Math.hypot(u - 0.5, v - 0.5) * 1.4),
    ],
  };
}

// Integration: the systems a company already runs, piped into one hub, with
// data flowing in from each.
function integration(): Figure {
  const P = view();
  const D = 104;
  const H = 24;
  const hub = box(P, [-H, -H, 0], [H * 2, H * 2, 16]);

  // Conduits on the floor, from under each system to under the hub.
  const S = 17;
  const ends: [V3, V3][] = [
    [
      [D - S, 0, 0],
      [H, 0, 0],
    ],
    [
      [-D + S, 0, 0],
      [-H, 0, 0],
    ],
    [
      [0, D - S, 0],
      [0, H, 0],
    ],
    [
      [0, -D + S, 0],
      [0, -H, 0],
    ],
  ];
  // Packets start under the system and end under the hub, so they appear
  // out of one and vanish into the other.
  const FLOW = 2600;
  const flow = ends.flatMap(([a, b], c) =>
    packets(P([a[0] * 1.08, a[1] * 1.08, 0]), P([b[0] * 0.5, b[1] * 0.5, 0]), 3, FLOW, c * 310),
  );

  const server = box(P, [-D - S, -S, 0], [S * 2, S * 2, 40]);
  // A rack's lights, in rows on the face that looks at the hub.
  const lights = [10, 20, 30].map((z): [Point, Point] => [P([-D + S, -S + 7, z]), P([-D + S, S - 7, z])]);
  const sheet = box(P, [-S, D - S, 0], [S * 2, S * 2, 20]);
  // A spreadsheet's grid on its top: two lines each way.
  const grid = [1 / 3, 2 / 3].flatMap((f): [Point, Point][] => [
    [P([-S + S * 2 * f, D - S, 20]), P([-S + S * 2 * f, D + S, 20])],
    [P([-S, D - S + S * 2 * f, 20]), P([S, D - S + S * 2 * f, 20])],
  ]);
  const app = box(P, [D - S, -S, 0], [S * 2, S * 2, 26]);

  // A database: a short cylinder with two disk lines.
  const db: V3 = [0, -D, 0];
  const DB_R = 18;
  const DB_H = 30;
  const rim = (z: number, from = 0, to = 1) => flatCircle(P, [db[0], db[1], z], DB_R, from, to, 48);
  const upright = (deg: number): [Point, Point] => {
    const a = (deg * Math.PI) / 180;
    const x = db[0] + DB_R * Math.cos(a);
    const y = db[1] + DB_R * Math.sin(a);
    return [P([x, y, 0]), P([x, y, DB_H])];
  };
  // Silhouette: the top's back half, then the floor's front half.
  const dbSilhouette = [...rim(DB_H, 0.375, 0.875), ...rim(0, 0.875, 1.375)];

  return {
    groups: [
      { marks: segs(ends.map(([a, b]): [Point, Point] => [P(a), P(b)]), "dim") },
      ...flow,
      {
        occluders: [server.silhouette],
        marks: [...segs(lights, "ink"), ...solid(server)],
      },
      {
        occluders: [dbSilhouette],
        marks: [
          ln(rim(DB_H), "ink", { closed: true }),
          ln(rim(0, -0.125, 0.375), "ink"),
          ...segs([upright(-45), upright(135)], "ink"),
          ln(rim(DB_H / 3, -0.125, 0.375), "dim"),
          ln(rim((DB_H * 2) / 3, -0.125, 0.375), "dim"),
        ],
      },
      { occluders: [hub.silhouette], marks: solid(hub, { top: "accent", right: "dim" }) },
      {
        occluders: [app.silhouette],
        marks: [...solid(app), ln(flatRect(P, D - S + 7, -S + 7, D + S - 7, S - 7, 26), "dim", { closed: true })],
      },
      { occluders: [sheet.silhouette], marks: [...solid(sheet), ...segs(grid, "dim")] },
    ],
  };
}

// Oversight: the AI's proposals pile up on the left. The top one slides off,
// along the floor and into the key, and the key, lit and ticked, goes down:
// the decision is yours.
function oversight(): Figure {
  const P = view();
  const CARD: V3 = [50, 40, 3];

  const pile = [
    [-128, 14, 0],
    [-124, 19, 6],
  ].map(([x, y, z]) => box(P, [x, y, z], CARD));

  const top: V3 = [-130, 12, 12];
  const card = box(P, top, CARD);
  const text = [10, 18, 26].map((d, r): [Point, Point] => [
    P([top[0] + 8, top[1] + d, top[2] + 3]),
    P([top[0] + (r === 2 ? 26 : 40), top[1] + d, top[2] + 3]),
  ]);
  // Off the pile onto the floor, then along it under the key.
  const [ax, ay] = minus(P([-80, 12, 0]), P(top));
  const [bx, by] = minus(P([-4, 12, 0]), P(top));

  const base = box(P, [-6, -6, 0], [92, 92, 8]);
  const cap = box(P, [4, 4, 8], [72, 72, 22]);
  const TOP = 30;

  // The tick lies on the cap, drawn in the face's own frame: p to the right
  // on screen, q away from the viewer.
  const L = 36;
  const ep = [Math.SQRT1_2, -Math.SQRT1_2];
  const eq = [-Math.SQRT1_2, -Math.SQRT1_2];
  const onCap = ([p, q]: [number, number]): Point =>
    P([40 + L * (p * ep[0] + q * eq[0]), 40 + L * (p * ep[1] + q * eq[1]), TOP]);
  const tick = (
    [
      [-0.56, 0.06],
      [-0.16, -0.34],
      [0.62, 0.46],
    ] as [number, number][]
  ).map(onCap);
  const keep = (u: number, v: number) =>
    u > 0 && v > 0 && u < 1 && v < 1 && distanceToPolyline(P([4 + 72 * u, 4 + 72 * v, TOP]), tick) > PITCH * 1.7;

  const DECIDE = 5600;

  return {
    groups: [
      ...pile.map((b) => ({ occluders: [b.silhouette], marks: solid(b, { edge: "dim" }) })),
      { marks: [ln([P([-74, 32, 0]), P([-8, 32, 0])], "dim", { dash: true })] },
      {
        motion: { name: "deliver", vars: { ax, ay, bx, by }, duration: DECIDE },
        occluders: [card.silhouette],
        marks: [...segs(text, "dim"), ...solid(card)],
      },
      { occluders: [base.silhouette], marks: solid(base, { edge: "dim" }) },
      {
        motion: { name: "press", vars: { press: 5 }, duration: DECIDE },
        occluders: [cap.silhouette],
        marks: [ln(tick, "ink", { weight: 2 }), ...solid(cap, { top: "accent", right: "dim", topKeep: keep })],
      },
    ],
  };
}

// Improvement: releases as slabs that climb in threes, with a dip that comes
// from learning, rising away from you. They rise out of the floor one after
// another; the newest, at the back, stands tallest and lit.
function improvement(): Figure {
  const P = view();
  const heights = [14, 19, 25, 22, 30, 38, 35, 47, 68];
  const L = 92;
  const T = 5;
  const STEP = 13;
  const y0 = ((heights.length - 1) * STEP) / 2;
  const last = heights.length - 1;
  const GROW = 6600;
  // The floor line runs along a slab's bottom edges; the edges on it, and a
  // halftone dot's round, stay whole.
  const under = DOT / 2 + 0.6;

  // Painted back to front: the newest, at the back, first.
  return {
    groups: heights
      .map((h, i): Group => {
        const b = box(P, [-L / 2, y0 - i * STEP - T / 2, 0], [L, T, h]);
        // The silhouette runs t0, t1, then the floor corners b1, b2, b3.
        const [, , b1, b2, b3] = b.silhouette;
        return {
          clip: [
            [b3[0] - 4, b3[1] + under],
            [b2[0], b2[1] + under],
            [b1[0] + 4, b1[1] + under],
            [b1[0] + 4, b1[1] - 400],
            [b3[0] - 4, b3[1] - 400],
          ],
          // Down to a stub, never out of sight: the floor keeps its rhythm.
          motion: { name: "rise", vars: { sink: h * K * 0.72 }, duration: GROW, delay: i * 150 },
          occluders: [b.silhouette],
          marks: i === last ? solid(b, { left: "accent" }) : solid(b, { edge: i < 3 ? "dim" : "ink" }),
        };
      })
      .reverse(),
  };
}

export const isoFigures = {
  design,
  automation,
  integration,
  oversight,
  improvement,
};

export type IsoFigureName = keyof typeof isoFigures;
