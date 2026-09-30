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
const PANEL = [0x2a, 0x24, 0x20];
const TOMATO = [0xc8, 0x45, 0x2c];
const TOMATO_DARK = [0x7d, 0x2a, 0x1a];
const CREAM = [0xf3, 0xe6, 0xd0];
const MUSTARD = [0xe8, 0xb4, 0x4a];

const GW = 150;
const GH = 50;
const CELL = 10;
const SCALE = 4;
const WORD_W = 23 * SCALE;
const WORD_H = 7 * SCALE;
const W = GW * CELL;
const H = GH * CELL;

const grid = Array.from({ length: GH }, () =>
  Array.from({ length: GW }, () => INK)
);

function set(x, y, color) {
  if (y < 0 || y >= GH || x < 0 || x >= GW) return;
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

for (let y = 5; y < 46; y += 4) fill(0, y, GW, y + 1, PANEL);

fill(0, 0, GW, 3, TOMATO);
fill(0, 3, GW, 4, TOMATO_DARK);
fill(0, 46, GW, 47, TOMATO_DARK);
fill(0, 47, GW, GH, TOMATO);

const x0 = (GW - WORD_W) / 2;
const y0 = 9;
paintKrel(x0 + 2, y0 + 2, TOMATO_DARK);
paintKrel(x0 + 1, y0 + 1, TOMATO);
paintKrel(x0, y0, CREAM);
fill(x0 + 12, y0 + WORD_H + 3, x0 + WORD_W - 12, y0 + WORD_H + 5, MUSTARD);

const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const gy = Math.floor(y / CELL);
  const row = y * (1 + W * 3);
  raw[row] = 0;
  for (let x = 0; x < W; x++) {
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
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

const pngPath = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "krel-banner.png");
writeFileSync(pngPath, png);
console.log(pngPath, W, H, png.length);
