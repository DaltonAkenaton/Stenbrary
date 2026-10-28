// ╔══════════════════════════════════════════════════════╗
// ║  supabase.client.spec.ts                             ║
// ║  Stenbrary v3.41.0                                    ║
// ║                                                      ║
// ║  El interruptor de la nube decide si `roleGuard`     ║
// ║  exige sesión. Si `isSupabaseConfigured()` devuelve  ║
// ║  `true` de más, una instalación que nunca pidió la   ║
// ║  nube se queda sin administración; si devuelve       ║
// ║  `false` de más, los roles dejan de aplicarse. Por   ║
// ║  eso se prueba, aunque el módulo sean cuatro         ║
// ║  funciones.                                          ║
// ╚══════════════════════════════════════════════════════╝

import {
  getSupabaseClient,
  hayCredencialesNube,
  isNubeActiva,
  isSupabaseConfigured,
  setNubeActiva,
} from './supabase.client';
import { environment } from '../../../environments/environment';

const NUBE_ACTIVA_KEY = 'stenbrary-nube-activa';

describe('supabase.client — interruptor de la nube', () => {
  // Las pruebas fijan sus propias credenciales (de mentira) en vez de
  // depender de lo que traiga environment.ts, que hoy va vacío.
  const original = { ...environment.supabase };

  beforeEach(() => {
    localStorage.removeItem(NUBE_ACTIVA_KEY);
    environment.supabase.url = 'http://127.0.0.1:55321';
    environment.supabase.anonKey = 'sb_publishable_de_prueba';
  });
  afterEach(() => {
    localStorage.removeItem(NUBE_ACTIVA_KEY);
    environment.supabase.url = original.url;
    environment.supabase.anonKey = original.anonKey;
  });

  it('arranca apagada: sin la clave en localStorage, la nube está inactiva', () => {
    expect(isNubeActiva()).toBeFalse();
  });

  it('una instalación con credenciales pero sin encender sigue en solo-local', () => {
    // El caso peligroso: build con claves + usuario que nunca pidió la
    // nube. Debe comportarse como antes de Fase 2.
    expect(hayCredencialesNube()).toBeTrue();
    expect(isSupabaseConfigured()).toBeFalse();
    expect(getSupabaseClient()).toBeNull();
  });

  it('encender persiste la preferencia y habilita el backend', () => {
    setNubeActiva(true);
    expect(localStorage.getItem(NUBE_ACTIVA_KEY)).toBe('true');
    expect(isNubeActiva()).toBeTrue();
    expect(isSupabaseConfigured()).toBeTrue();
  });

  it('un build sin credenciales no se conecta aunque se encienda', () => {
    // Así se distribuye hoy: environment sin URL ni llave.
    environment.supabase.url = '';
    environment.supabase.anonKey = '';
    setNubeActiva(true);
    expect(hayCredencialesNube()).toBeFalse();
    expect(isSupabaseConfigured()).toBeFalse();
    expect(getSupabaseClient()).toBeNull();
  });

  it('apagar vuelve a solo-local', () => {
    setNubeActiva(true);
    setNubeActiva(false);
    expect(isNubeActiva()).toBeFalse();
    expect(isSupabaseConfigured()).toBeFalse();
  });

  it('solo el string "true" cuenta como encendida', () => {
    // Defensivo: un valor corrupto o de otra versión no debe encender la
    // nube por accidente. Cualquier cosa que no sea 'true' es apagado.
    for (const basura of ['1', 'sí', 'TRUE', '', 'false']) {
      localStorage.setItem(NUBE_ACTIVA_KEY, basura);
      expect(isNubeActiva()).withContext(`valor "${basura}"`).toBeFalse();
    }
  });

  it('si localStorage lanza, degrada a solo-local en vez de reventar', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('bloqueado');
    expect(isNubeActiva()).toBeFalse();
    expect(isSupabaseConfigured()).toBeFalse();
  });
});
