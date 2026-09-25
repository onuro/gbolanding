// Seeded randomness so stills are reproducible (?face=ref2 freezes time + seed).

const MULBERRY_STEP = 0x6d2b79f5;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + MULBERRY_STEP) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * mulberry32 is a counter generator (call k of mulberry32(seed) returns f(seed + k * step)), so a stream can
 * start at any call index directly: mulberry32At(seed, k)() is exactly the (k + 1)-th number of mulberry32(seed).
 */
export function mulberry32At(seed: number, k: number): () => number {
  return mulberry32(((seed >>> 0) + Math.imul(k >>> 0, MULBERRY_STEP)) >>> 0);
}

export function gaussian(rnd: () => number): number {
  const u = Math.max(1e-9, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}
