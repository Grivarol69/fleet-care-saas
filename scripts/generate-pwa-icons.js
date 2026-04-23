#!/usr/bin/env node
// Generates driver-192.png and driver-512.png from driver-icon.svg using sharp.
// Run once: node scripts/generate-pwa-icons.js

// pnpm hoisting workaround — sharp lives in the pnpm virtual store
let sharp;
try {
  sharp = require('sharp');
} catch {
  const pnpmPath = require('path').join(
    __dirname,
    '../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp'
  );
  sharp = require(pnpmPath);
}
const path = require('path');

const src = path.join(__dirname, '../public/icons/driver-icon.svg');
const outDir = path.join(__dirname, '../public/icons');

const sizes = [192, 512];

async function run() {
  for (const size of sizes) {
    const out = path.join(outDir, `driver-${size}.png`);
    await sharp(src).resize(size, size).png().toFile(out);
    console.log(`✓ driver-${size}.png`);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
