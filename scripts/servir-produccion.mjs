// ╔══════════════════════════════════════════════════════╗
// ║  scripts/servir-produccion.mjs — Stenbrary v3.62.0   ║
// ║                                                      ║
// ║  Sirve el build de producción con las cabeceras de   ║
// ║  public/_headers aplicadas como Cloudflare Pages:    ║
// ║  todas las reglas cuya ruta coincide se combinan;    ║
// ║  "*" coincide con cualquier texto; una ruta sin      ║
// ║  archivo devuelve index.html (fallback de la SPA).   ║
// ║  Lo usa `npm run e2e:produccion` para comprobar la   ║
// ║  CSP y el service worker antes de publicar.          ║
// ║                                                      ║
// ║  Uso: node scripts/servir-produccion.mjs [puerto]    ║
// ╚══════════════════════════════════════════════════════╝

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const RAIZ = resolve(process.env.DIST ?? 'dist/stenbrary/browser');
const PUERTO = Number(process.argv[2] ?? process.env.PORT ?? 4400);

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.webp': 'image/webp',
};

/** Reglas de _headers: [{ patron: RegExp, cabeceras: [nombre, valor][] }]. */
function leerReglas(texto) {
  const reglas = [];
  let actual = null;
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || linea.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(linea)) {
      const fuente = '^' + linea.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
      actual = { patron: new RegExp(fuente), cabeceras: [] };
      reglas.push(actual);
    } else if (actual) {
      const i = linea.indexOf(':');
      actual.cabeceras.push([linea.slice(0, i).trim(), linea.slice(i + 1).trim()]);
    }
  }
  return reglas;
}

const reglas = leerReglas(await readFile(join(RAIZ, '_headers'), 'utf8'));

async function archivo(ruta) {
  const destino = normalize(join(RAIZ, decodeURIComponent(ruta)));
  if (!destino.startsWith(RAIZ + sep) && destino !== RAIZ) return null;   // sin salir de la carpeta
  try {
    return (await stat(destino)).isFile() ? destino : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const ruta = new URL(req.url ?? '/', 'http://x').pathname;
  // Igual que Cloudflare: "/" sirve index.html y una ruta de la app sin archivo, también.
  let destino = await archivo(ruta === '/' ? '/index.html' : ruta);
  let rutaReglas = ruta;
  if (!destino) {
    destino = join(RAIZ, 'index.html');
    rutaReglas = ruta;
  }
  for (const regla of reglas) {
    if (!regla.patron.test(rutaReglas)) continue;
    for (const [nombre, valor] of regla.cabeceras) {
      const previo = res.getHeader(nombre);
      res.setHeader(nombre, previo ? `${previo}, ${valor}` : valor);
    }
  }
  res.setHeader('Content-Type', TIPOS[extname(destino)] ?? 'application/octet-stream');
  try {
    const cuerpo = await readFile(destino);
    res.writeHead(200);
    res.end(req.method === 'HEAD' ? undefined : cuerpo);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PUERTO, () => console.log(`Stenbrary (build de producción) en http://localhost:${PUERTO}`));
