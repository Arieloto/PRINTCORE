/**
 * Generates the PrintCore app icon (no binary assets in version control).
 *
 * Produces:
 *   build/icon.png    256x256 RGBA, used by electron-builder (auto -> .ico)
 *   build/icon.ico    Windows icon (PNG-compressed entry, Vista+ format)
 *   public/icon.png   served by Vite and rendered in the custom title bar
 *
 * Run with: node build/generate-icon.mjs
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 256;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)));
const REPO = join(OUT_DIR, '..');

/* ── geometry helpers ─────────────────────────────────────────────────────── */

const insidePolygon = (px, py, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

/** Signed distance to a rounded rectangle, negative inside. */
const roundedRectDistance = (px, py, size, radius) => {
  const half = size / 2;
  const qx = Math.abs(px - half) - (half - radius);
  const qy = Math.abs(py - half) - (half - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
};

/* ── the mark: isometric cube on a dark rounded tile ───────────────────────── */

// 2:1 isometric projection: the top face is a diamond of width 2w and height w,
// and the vertical edges drop by the same w.
const W = 62;      // half width of the cube's footprint
const SIDE = 62;   // length of the vertical edges
const CX = 128;
const Y0 = 64;     // top vertex

const TOP_FACE = [
  [CX, Y0],                    // top vertex
  [CX + W, Y0 + W / 2],        // right vertex
  [CX, Y0 + W],                // front vertex
  [CX - W, Y0 + W / 2]         // left vertex
];

const LEFT_FACE = [
  [CX - W, Y0 + W / 2],
  [CX, Y0 + W],
  [CX, Y0 + W + SIDE],
  [CX - W, Y0 + W / 2 + SIDE]
];

const RIGHT_FACE = [
  [CX + W, Y0 + W / 2],
  [CX, Y0 + W],
  [CX, Y0 + W + SIDE],
  [CX + W, Y0 + W / 2 + SIDE]
];

const cubeFaces = [
  [TOP_FACE, [167, 243, 208]],   // lit top face
  [LEFT_FACE, [16, 185, 129]],   // left face
  [RIGHT_FACE, [5, 150, 105]]    // right face
];

function sampleColor(px, py) {
  // Tile with rounded corners.
  const tile = roundedRectDistance(px, py, SIZE, 58);
  if (tile > 0) return null;

  // Tile gradient: slate-950 -> slate-900.
  const t = py / SIZE;
  const bg = [
    Math.round(2 + t * 6),
    Math.round(6 + t * 10),
    Math.round(23 + t * 16)
  ];

  // Emerald ring.
  if (tile > -4) {
    return [16, 185, 129, Math.round(255 * Math.min(1, -tile / 4))];
  }

  for (const [poly, [r, g, b]] of cubeFaces) {
    if (insidePolygon(px, py, poly)) return [r, g, b];
  }

  return [bg[0], bg[1], bg[2]];
}

/* ── rasterize with 2x2 supersampling ─────────────────────────────────────── */

function renderPixels() {
  const data = Buffer.alloc(SIZE * SIZE * 4);
  const samples = 2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = sampleColor(x + (sx + 0.5) / samples, y + (sy + 0.5) / samples);
          if (!color) continue;
          r += color[0];
          g += color[1];
          b += color[2];
          a += color.length > 3 && color[3] < 255 ? color[3] / 255 : 1;
        }
      }
      const total = samples * samples;
      const offset = (y * SIZE + x) * 4;
      if (a > 0) {
        data[offset] = Math.round(r / a);
        data[offset + 1] = Math.round(g / a);
        data[offset + 2] = Math.round(b / a);
        data[offset + 3] = Math.round((a / total) * 255);
      }
    }
  }
  return data;
}

/* ── PNG encoding ─────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, payload) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(pixels) {
  const stride = SIZE * 4;
  const raw = Buffer.alloc((stride + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ── ICO wrapping (single PNG entry, supported since Windows Vista) ────────── */

function encodeIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry[0] = 0; // width  (0 = 256)
  entry[1] = 0; // height
  entry[2] = 0; // palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const png = encodePng(renderPixels());
const ico = encodeIco(png);

mkdirSync(join(REPO, 'build'), { recursive: true });
mkdirSync(join(REPO, 'public'), { recursive: true });

writeFileSync(join(OUT_DIR, 'icon.png'), png);
writeFileSync(join(OUT_DIR, 'icon.ico'), ico);
writeFileSync(join(REPO, 'public', 'icon.png'), png);

console.log(`icon.png ${png.length} B · icon.ico ${ico.length} B`);
