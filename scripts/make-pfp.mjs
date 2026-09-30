import { writeFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GLYPHS = {
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"]
};

const INK = [0x1e, 0x1a, 0x17];
const TOMATO = [0xc8, 0x45, 0x2c];
const TOMATO_DARK = [0x7d, 0x2a, 0x1a];
const CREAM = [0xf3, 0xe6, 0xd0];
const MUSTARD = [0xe8, 0xb4, 0x4a];
const GRID = 60;
const CELL = 1080 / GRID;
const SCALE = 2;
const WORD_W = 23 * SCALE;
const WORD_H = 7 * SCALE;

const grid = Array.from({ length: GRID }, () =>
  Array.from({ length: GRID }, () => INK)
);

function set(x, y, color) {
  if (y < 0 || y >= GRID || x < 0 || x >= GRID) return;
  grid[y][x] = color;
}

function fill(x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) set(x, y, color);
  }
}

function paintKrel(x0, y0, color) {
  let x = x0;
  for (const ch of "KREL") {
    GLYPHS[ch].forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === "#") {
          fill(
            x + rx * SCALE,
            y0 + ry * SCALE,
            x + (rx + 1) * SCALE,
            y0 + (ry + 1) * SCALE,
            color
          );
        }
      });
    });
    x += 6 * SCALE;
  }
}

const cx = GRID / 2;
for (let y = 0; y < GRID; y++) {
  for (let x = 0; x < GRID; x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx);
    if (d >= 29.7) set(x, y, INK);
    else if (d >= 28) set(x, y, TOMATO_DARK);
    else if (d >= 26) set(x, y, TOMATO);
    else set(x, y, CREAM);
  }
}

const x0 = (GRID - WORD_W) / 2 + 1;
const y0 = 23;
paintKrel(x0 + 1, y0 + 1, TOMATO);
paintKrel(x0, y0, INK);
fill(x0 + 8, y0 + WORD_H + 3, x0 + WORD_W - 8, y0 + WORD_H + 5, MUSTARD);

const SIZE = 1080;
const raw = Buffer.alloc(SIZE * (1 + SIZE * 3));
for (let y = 0; y < SIZE; y++) {
  const gy = Math.floor(y / CELL);
  const row = y * (1 + SIZE * 3);
  raw[row] = 0;
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b] = grid[gy][Math.floor(x / CELL)];
    const i = row + 1 + x * 3;
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
  }
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

const pngPath = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "krel-pfp.png");
writeFileSync(pngPath, png);
console.log(pngPath, png.length);
