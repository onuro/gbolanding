// Shrinks a Chrome screenshot (8-bit RGB or RGBA PNG) with Node's zlib only.
//
// 1. Lossless: every row gets the PNG filter that suits it best (Chrome uses
//    one filter for speed) and the data is deflated at level 9. Saves ~5 %.
// 2. Only if the file is still over budget: drop the lowest bit of each
//    channel (7 bits, an invisible change of at most one level in 255), then,
//    as a last resort, two. No dither: the cards' film grain already breaks up
//    the coarser steps, so the gradients do not band. Photos and grain are
//    what push a card over; this takes ~30 % off them per step.

import { readFileSync, writeFileSync } from "node:fs";
import zlib from "node:zlib";

const CRC_TABLE = Int32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

function decode(png) {
  let offset = 8, width = 0, height = 0, colorType = 0, bitDepth = 0, interlace = 0;
  const idat = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    offset += 12 + length;
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) return null;
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const up = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? row[x - bpp] : 0;
      const b = up ? up[x] : 0;
      const c = up && x >= bpp ? up[x - bpp] : 0;
      const predicted = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0;
      row[x] = (src[x] + predicted) & 255;
    }
  }
  return { width, height, bpp, pixels };
}

function encode({ width, height, bpp, pixels }) {
  const stride = width * bpp;
  const out = Buffer.alloc(height * (stride + 1));
  const candidates = Array.from({ length: 5 }, () => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const up = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    let best = 0, bestScore = Infinity;
    for (let filter = 0; filter < 5; filter++) {
      const dst = candidates[filter];
      let score = 0;
      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? row[x - bpp] : 0;
        const b = up ? up[x] : 0;
        const c = up && x >= bpp ? up[x - bpp] : 0;
        const predicted = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0;
        const v = (row[x] - predicted) & 255;
        dst[x] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) (bestScore = score), (best = filter);
    }
    out[y * (stride + 1)] = best;
    candidates[best].copy(out, y * (stride + 1) + 1);
  }
  const chunk = (type, data) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = bpp === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(out, { level: 9, memLevel: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function reduceBits(image, bits) {
  const step = 1 << (8 - bits);
  const pixels = Buffer.from(image.pixels);
  const { width, height, bpp } = image;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let k = 0; k < Math.min(bpp, 3); k++) {
        const i = (y * width + x) * bpp + k;
        pixels[i] = Math.min(255, Math.round(pixels[i] / step) * step);
      }
    }
  }
  return { ...image, pixels };
}

/** Rewrites `file` smaller. Returns { bytes, bits } (bits per channel kept). */
export function slimPng(file, budgetBytes) {
  const original = readFileSync(file);
  const image = decode(original);
  if (!image) return { bytes: original.length, bits: 8 };
  let best = encode(image);
  let bits = 8;
  for (const b of [7, 6]) {
    if (best.length <= budgetBytes) break;
    best = encode(reduceBits(image, b));
    bits = b;
  }
  if (best.length < original.length) writeFileSync(file, best);
  return { bytes: Math.min(best.length, original.length), bits };
}
