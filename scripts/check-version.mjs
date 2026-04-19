// ╔══════════════════════════════════════════════════════╗
// ║  scripts/check-version.mjs                           ║
// ║  Stenbrary v3.12.1 — Guardrail de versión             ║
// ║                                                      ║
// ║  Verifica que package.json.version coincida con el   ║
// ║  primer elemento de CHANGELOG en                     ║
// ║  src/app/core/data/changelog.data.ts.                ║
// ║                                                      ║
// ║  Corre en CI. Exit 1 si hay mismatch.                ║
// ╚══════════════════════════════════════════════════════╝

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function main() {
  const pkgRaw = await readFile(resolve(ROOT, 'package.json'), 'utf8');
  const pkgVersion = JSON.parse(pkgRaw).version;

  const changelogRaw = await readFile(
    resolve(ROOT, 'src/app/core/data/changelog.data.ts'),
    'utf8',
  );

  // Extrae el primer `version: '...'` después de `export const CHANGELOG`.
  const anchorIdx = changelogRaw.indexOf('export const CHANGELOG');
  if (anchorIdx === -1) {
    console.error('✘ No se encontró `export const CHANGELOG` en changelog.data.ts');
    process.exit(1);
  }
  const tail = changelogRaw.slice(anchorIdx);
  const match = tail.match(/version:\s*['"]([^'"]+)['"]/);
  if (!match) {
    console.error('✘ No se pudo extraer la primera `version` del CHANGELOG');
    process.exit(1);
  }
  const changelogVersion = match[1];

  if (pkgVersion !== changelogVersion) {
    console.error(
      `✘ Mismatch de versión:\n` +
      `   package.json.version    = ${pkgVersion}\n` +
      `   CHANGELOG[0].version    = ${changelogVersion}\n\n` +
      `Al liberar, ambas deben coincidir (ver CLAUDE.md → release workflow).`,
    );
    process.exit(1);
  }

  console.log(`✓ Versión consistente: ${pkgVersion}`);
}

main().catch((err) => {
  console.error('✘ Error ejecutando check-version:', err);
  process.exit(1);
});
