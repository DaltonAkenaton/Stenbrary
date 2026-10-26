// ╔══════════════════════════════════════════════════════╗
// ║  pin-hash.utils.ts                                   ║
// ║  Stenbrary v3.62.0 — El PIN ya no se guarda tal cual ║
// ║                                                      ║
// ║  Hasta v3.61 el PIN del coordinador y su código de   ║
// ║  recuperación vivían en texto plano en localStorage. ║
// ║  Ahora se guarda PBKDF2-HMAC-SHA256 con sal          ║
// ║  aleatoria de 16 bytes y 600 000 iteraciones         ║
// ║  (recomendación de OWASP), en el formato             ║
// ║  "pbkdf2-sha256$iteraciones$sal$hash" (base64).      ║
// ║                                                      ║
// ║  LÍMITE (documentado en docs/SEGURIDAD.md): un PIN   ║
// ║  de 4–6 dígitos tiene a lo más un millón de valores. ║
// ║  Quien copie el hash puede probarlos todos fuera del ║
// ║  navegador; el hash lo encarece y evita que el PIN   ║
// ║  se lea a simple vista, pero NO protege frente a     ║
// ║  alguien con control del equipo y sus herramientas.  ║
// ║  Una app local, sin servidor, no puede impedirlo.    ║
// ╚══════════════════════════════════════════════════════╝

export const PIN_HASH_PREFIJO = 'pbkdf2-sha256';
export const PIN_ITERACIONES = 600_000;
const BYTES_SAL = 16;
const BYTES_HASH = 32;

/** ¿Es un valor guardado con hash (y no un PIN viejo en texto plano)? */
export function esHashPin(guardado: string | null | undefined): boolean {
  return typeof guardado === 'string' && guardado.startsWith(`${PIN_HASH_PREFIJO}$`);
}

const aBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), c => c.charCodeAt(0));

/** Hash del secreto en el formato guardado. `sal` e `iteraciones` solo los fijan las pruebas. */
export async function hashSecreto(
  secreto: string,
  sal: Uint8Array = crypto.getRandomValues(new Uint8Array(BYTES_SAL)),
  iteraciones = PIN_ITERACIONES,
): Promise<string> {
  const hash = await pbkdf2Sha256(new TextEncoder().encode(secreto), sal, iteraciones, BYTES_HASH);
  return `${PIN_HASH_PREFIJO}$${iteraciones}$${aBase64(sal)}$${aBase64(hash)}`;
}

/**
 * ¿`intento` corresponde a lo guardado? Lo guardado puede ser un hash o, en
 * una instalación de antes de v3.62.0 que aún no migró, el valor en texto
 * plano (la migración lo convierte en cuanto puede: `PinService.migrar`).
 * Un valor guardado malformado nunca coincide.
 */
export async function secretoCoincide(intento: string, guardado: string): Promise<boolean> {
  if (!guardado) return false;
  if (!esHashPin(guardado)) return comparacionConstante(new TextEncoder().encode(intento), new TextEncoder().encode(guardado));
  const partes = guardado.split('$');
  if (partes.length !== 4) return false;
  const iteraciones = Number(partes[1]);
  if (!Number.isInteger(iteraciones) || iteraciones < 1 || iteraciones > 10_000_000) return false;
  let sal: Uint8Array, esperado: Uint8Array;
  try {
    sal = deBase64(partes[2]);
    esperado = deBase64(partes[3]);
  } catch {
    return false;
  }
  const calculado = await pbkdf2Sha256(new TextEncoder().encode(intento), sal, iteraciones, esperado.length);
  return comparacionConstante(calculado, esperado);
}

/** Compara sin salir antes al primer byte distinto. */
function comparacionConstante(a: Uint8Array, b: Uint8Array): boolean {
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return dif === 0;
}

/**
 * PBKDF2-HMAC-SHA256 con WebCrypto. WebCrypto solo existe en contextos
 * seguros (https o localhost); si la app se abriera por http en una red
 * local, se usa la implementación propia de abajo, más lenta pero idéntica.
 */
export async function pbkdf2Sha256(
  secreto: Uint8Array, sal: Uint8Array, iteraciones: number, largo: number,
): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const clave = await subtle.importKey('raw', secreto as BufferSource, 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones }, clave, largo * 8);
    return new Uint8Array(bits);
  }
  return pbkdf2Sha256Js(secreto, sal, iteraciones, largo);
}

// ── Implementación propia (solo si no hay WebCrypto) ────────────────────
// FIPS 180-4 (SHA-256), RFC 2104 (HMAC) y RFC 8018 (PBKDF2). Las pruebas la
// comparan con WebCrypto y con los vectores de la RFC 7914 §11.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256(datos: Uint8Array): Uint8Array {
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const largoBits = datos.length * 8;
  const bloques = Math.ceil((datos.length + 9) / 64);
  const m = new Uint8Array(bloques * 64);
  m.set(datos);
  m[datos.length] = 0x80;
  const vista = new DataView(m.buffer);
  vista.setUint32(m.length - 8, Math.floor(largoBits / 2 ** 32));
  vista.setUint32(m.length - 4, largoBits >>> 0);
  const w = new Uint32Array(64);
  const rot = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let b = 0; b < bloques; b++) {
    for (let i = 0; i < 16; i++) w[i] = vista.getUint32(b * 64 + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += bb; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const salida = new Uint8Array(32);
  const sv = new DataView(salida.buffer);
  h.forEach((x, i) => sv.setUint32(i * 4, x));
  return salida;
}

function hmacSha256(clave: Uint8Array, mensaje: Uint8Array): Uint8Array {
  const k = new Uint8Array(64);
  k.set(clave.length > 64 ? sha256(clave) : clave);
  const interno = new Uint8Array(64 + mensaje.length);
  const externo = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) { interno[i] = k[i] ^ 0x36; externo[i] = k[i] ^ 0x5c; }
  interno.set(mensaje, 64);
  externo.set(sha256(interno), 64);
  return sha256(externo);
}

/** Exportada solo para las pruebas. */
export function pbkdf2Sha256Js(secreto: Uint8Array, sal: Uint8Array, iteraciones: number, largo: number): Uint8Array {
  const salida = new Uint8Array(largo);
  for (let bloque = 1, pos = 0; pos < largo; bloque++) {
    const s = new Uint8Array(sal.length + 4);
    s.set(sal);
    new DataView(s.buffer).setUint32(sal.length, bloque);
    let u = hmacSha256(secreto, s);
    const t = u.slice();
    for (let i = 1; i < iteraciones; i++) {
      u = hmacSha256(secreto, u);
      for (let j = 0; j < t.length; j++) t[j] ^= u[j];
    }
    salida.set(t.subarray(0, largo - pos), pos);
    pos += t.length;
  }
  return salida;
}
