#!/usr/bin/env node
/**
 * Generate PWA placeholder icons using Node.js built-ins only.
 * Run: node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateRawSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
const OUT_DIR = join(PUBLIC, 'icons');
const SCREENSHOTS_DIR = join(PUBLIC, 'screenshots');

function crc32(data) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU32(buf, offset, val) {
  buf[offset] = (val >>> 24) & 0xff;
  buf[offset + 1] = (val >>> 16) & 0xff;
  buf[offset + 2] = (val >>> 8) & 0xff;
  buf[offset + 3] = val & 0xff;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  writeU32(chunk, 0, len);
  chunk[4] = type.charCodeAt(0);
  chunk[5] = type.charCodeAt(1);
  chunk[6] = type.charCodeAt(2);
  chunk[7] = type.charCodeAt(3);
  data.copy(chunk, 8);
  writeU32(chunk, 8 + len, crc32(chunk.slice(4, 8 + len)));
  return chunk;
}

/** Create a solid-color PNG (gray #4b5563), square */
function createPng(size) {
  return createPngRect(size, size);
}

/** Create a solid-color rectangular PNG (RGB #12121A - dark bg) */
function createPngRect(width, height) {
  const ihdr = Buffer.alloc(13);
  writeU32(ihdr, 0, width);
  writeU32(ihdr, 4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // compression, filter, interlace

  const rowBytes = width * 3 + 1;
  const raw = Buffer.alloc(height * rowBytes);
  let off = 0;
  const r = 0x12, g = 0x12, b = 0x1a; // #12121A
  for (let y = 0; y < height; y++) {
    raw[off++] = 0; // filter byte
    for (let x = 0; x < width; x++) {
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
    }
  }
  const idat = deflateRawSync(raw, { level: 9 });

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idat);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const sizes = [144, 192, 512];
  for (const size of sizes) {
    const png = createPng(size);
    await writeFile(join(OUT_DIR, `icon-${size}.png`), png);
    await writeFile(join(OUT_DIR, `maskable-${size}.png`), png);
  }

  // PWA screenshots: wide (desktop) and narrow (mobile) for richer install UI
  await writeFile(join(SCREENSHOTS_DIR, 'wide.png'), createPngRect(1280, 720));
  await writeFile(join(SCREENSHOTS_DIR, 'narrow.png'), createPngRect(750, 1334));

  console.log('Icons generated in public/icons/');
  console.log('Screenshots generated in public/screenshots/');
}

main().catch(console.error);
