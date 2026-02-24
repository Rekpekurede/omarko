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
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

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

/** Create a solid-color PNG (gray #4b5563) */
function createPng(size) {
  const ihdr = Buffer.alloc(13);
  writeU32(ihdr, 0, size);
  writeU32(ihdr, 4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // compression, filter, interlace

  const raw = Buffer.alloc(size * (size * 3 + 1));
  let off = 0;
  for (let y = 0; y < size; y++) {
    raw[off++] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      raw[off++] = 75;   // R (#4b5563)
      raw[off++] = 85;   // G
      raw[off++] = 99;   // B
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
  const sizes = [192, 512];
  for (const size of sizes) {
    const png = createPng(size);
    await writeFile(join(OUT_DIR, `icon-${size}.png`), png);
    await writeFile(join(OUT_DIR, `maskable-${size}.png`), png);
  }
  console.log('Icons generated in public/icons/');
}

main().catch(console.error);
