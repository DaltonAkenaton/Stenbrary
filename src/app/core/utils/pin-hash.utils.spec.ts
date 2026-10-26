// ╔══════════════════════════════════════════════════════╗
// ║  pin-hash.utils.spec.ts — Stenbrary v3.62.0          ║
// ║  Vectores oficiales de PBKDF2-HMAC-SHA256 (RFC 7914  ║
// ║  §11) para WebCrypto y para la implementación propia ║
// ║  de respaldo; formato guardado y compatibilidad con  ║
// ║  el PIN viejo en texto plano.                        ║
// ╚══════════════════════════════════════════════════════╝

import { PIN_ITERACIONES, esHashPin, hashSecreto, pbkdf2Sha256, pbkdf2Sha256Js, secretoCoincide } from './pin-hash.utils';

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const bytes = (s: string) => new TextEncoder().encode(s);

const RFC_1 = '55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc'
  + '49ca9cccf179b645991664b39d77ef317c71b845b1e30bd509112041d3a19783';
const RFC_80000 = '4ddcd8f60b98be21830cee5ef22701f9641a4418d04c0414aeff08876b34ab56'
  + 'a1d425a1225833549adb841b51c9b3176a272bdebba1d078478f62b397f33c8d';

describe('pin-hash.utils', () => {
  describe('PBKDF2-HMAC-SHA256 (RFC 7914 §11)', () => {
    it('WebCrypto: "passwd"/"salt", 1 iteración', async () => {
      expect(hex(await pbkdf2Sha256(bytes('passwd'), bytes('salt'), 1, 64))).toBe(RFC_1);
    });

    it('WebCrypto: "Password"/"NaCl", 80 000 iteraciones', async () => {
      expect(hex(await pbkdf2Sha256(bytes('Password'), bytes('NaCl'), 80_000, 64))).toBe(RFC_80000);
    });

    it('implementación propia (sin WebCrypto): mismo vector', () => {
      expect(hex(pbkdf2Sha256Js(bytes('passwd'), bytes('salt'), 1, 64))).toBe(RFC_1);
    });

    it('implementación propia = WebCrypto con varias iteraciones y una clave de más de 64 bytes', async () => {
      const larga = bytes('x'.repeat(100));
      const sal = crypto.getRandomValues(new Uint8Array(16));
      expect(hex(pbkdf2Sha256Js(larga, sal, 1000, 32))).toBe(hex(await pbkdf2Sha256(larga, sal, 1000, 32)));
    });
  });

  describe('formato guardado', () => {
    it('hashSecreto produce "pbkdf2-sha256$iteraciones$sal$hash" y no contiene el secreto', async () => {
      const h = await hashSecreto('2468');
      expect(esHashPin(h)).toBeTrue();
      const [alg, it, sal, hash] = h.split('$');
      expect(alg).toBe('pbkdf2-sha256');
      expect(Number(it)).toBe(PIN_ITERACIONES);
      expect(atob(sal).length).toBe(16);
      expect(atob(hash).length).toBe(32);
      expect(h).not.toContain('2468');
    });

    it('la misma clave con dos sales da hashes distintos', async () => {
      expect(await hashSecreto('1234', undefined, 1000)).not.toBe(await hashSecreto('1234', undefined, 1000));
    });

    it('secretoCoincide: el correcto sí, otro no', async () => {
      const h = await hashSecreto('482916', undefined, 1000);
      expect(await secretoCoincide('482916', h)).toBeTrue();
      expect(await secretoCoincide('482917', h)).toBeFalse();
      expect(await secretoCoincide('', h)).toBeFalse();
    });

    it('acepta el PIN viejo en texto plano (instalación sin migrar)', async () => {
      expect(await secretoCoincide('1234', '1234')).toBeTrue();
      expect(await secretoCoincide('1235', '1234')).toBeFalse();
      expect(esHashPin('1234')).toBeFalse();
    });

    it('un valor guardado malformado nunca coincide', async () => {
      for (const roto of ['', 'pbkdf2-sha256$', 'pbkdf2-sha256$abc$AA==$AA==', 'pbkdf2-sha256$0$AA==$AA==',
        'pbkdf2-sha256$99999999$AA==$AA==', 'pbkdf2-sha256$1000$%%%$AA==']) {
        expect(await secretoCoincide('1234', roto)).withContext(roto).toBeFalse();
      }
    });
  });
});
