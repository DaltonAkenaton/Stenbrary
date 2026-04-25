// ╔══════════════════════════════════════════════════════╗
// ║  scripts/generate-icons.mjs                          ║
// ║  Stenbrary — Generador de iconos PWA                 ║
// ║                                                      ║
// ║  Lee public/branding/stenbrary-icon.svg y produce    ║
// ║  todos los PNGs requeridos por manifest.webmanifest. ║
// ║  También genera un favicon.ico de 32×32.             ║
// ║                                                      ║
// ║  Uso:                                                ║
// ║    npm install --save-dev sharp                      ║
// ║    node scripts/generate-icons.mjs                   ║
// ╚══════════════════════════════════════════════════════╝

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SVG_PATH = resolve(ROOT, 'public/branding/stenbrary-icon.svg');
const ICONS_DIR = resolve(ROOT, 'public/icons');
const FAVICON_PATH = resolve(ROOT, 'public/favicon.ico');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const FAVICON_SIZE = 32;

async function main() {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.error('❌ Falta dependencia "sharp".');
    console.error('   Instala con: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!existsSync(SVG_PATH)) {
    console.error(`❌ No encontré el SVG fuente: ${SVG_PATH}`);
    process.exit(1);
  }

  await mkdir(ICONS_DIR, { recursive: true });
  const svg = await readFile(SVG_PATH);

  console.log('🎨 Generando iconos PWA desde stenbrary-icon.svg...');

  for (const size of SIZES) {
    const out = resolve(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain' })
      .png({ quality: 92, compressionLevel: 9 })
      .toFile(out);
    console.log(`   ✓ icon-${size}x${size}.png`);
  }

  // favicon.ico (PNG con extensión .ico — los browsers modernos lo aceptan)
  await sharp(svg, { density: 384 })
    .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'contain' })
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(FAVICON_PATH);
  console.log(`   ✓ favicon.ico (${FAVICON_SIZE}×${FAVICON_SIZE})`);

  console.log('✅ Iconos generados. Recarga la PWA para ver el cambio.');
}

main().catch(err => {
  console.error('❌ Error generando iconos:', err);
  process.exit(1);
});
