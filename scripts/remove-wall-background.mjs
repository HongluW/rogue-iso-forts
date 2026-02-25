#!/usr/bin/env node
/**
 * Remove background from wall sprites: make near-white / light gray pixels transparent.
 * Outputs PNG with alpha so walls composite cleanly on the game canvas.
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FORTS_DIR = path.join(__dirname, '..', 'public', 'forts');

// Pixels with luminance above this and low saturation are treated as background
const LUMINANCE_THRESHOLD = 0.92;
const SATURATION_THRESHOLD = 0.08;

function isBackground(r, g, b) {
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const s = max === 0 ? 0 : (max - min) / max;
  return l >= LUMINANCE_THRESHOLD && s <= SATURATION_THRESHOLD;
}

async function removeBackground(inputPath, outputPath) {
  const buf = readFileSync(inputPath);
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackground(r, g, b)) {
      data[i + 3] = 0;
    }
  }
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outputPath);
  console.log('Written:', outputPath);
}

async function main() {
  for (const name of ['wall_left', 'wall_right']) {
    const input = path.join(FORTS_DIR, `${name}.png`);
    await removeBackground(input, input);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
