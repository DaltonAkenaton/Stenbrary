// ╔══════════════════════════════════════════════════════╗
// ║  pin.service.spec.ts — Stenbrary v3.62.0             ║
// ║  El PIN y el código se guardan con hash; las         ║
// ║  instalaciones viejas (texto plano) migran sin       ║
// ║  quedarse fuera; el límite de intentos se conserva;  ║
// ║  el PIN no aparece en el almacenamiento ni en logs.  ║
// ╚══════════════════════════════════════════════════════╝

import { Injector, runInInjectionContext } from '@angular/core';
import { ConfigService } from './config.service';
import { BitacoraService } from './bitacora.service';
import { PinService } from './pin.service';
import { esHashPin } from '../utils/pin-hash.utils';

const CLAVE_CONFIG = 'stenbrary-config';

function crear(configGuardada?: Record<string, unknown>) {
  localStorage.removeItem('stenbrary-pin-intentos');
  if (configGuardada) localStorage.setItem(CLAVE_CONFIG, JSON.stringify(configGuardada));
  else localStorage.removeItem(CLAVE_CONFIG);
  const anotado: string[] = [];
  const bitacora = { registrar: (accion: string, detalle: string) => { anotado.push(`${accion} ${detalle}`); } };
  const injector = Injector.create({
    providers: [
      { provide: ConfigService, useFactory: () => new ConfigService(), deps: [] },
      { provide: BitacoraService, useValue: bitacora },
    ],
  });
  const config = injector.get(ConfigService);
  const pin = runInInjectionContext(injector, () => new PinService());
  return { pin, config, anotado };
}

const guardado = () => localStorage.getItem(CLAVE_CONFIG) ?? '';

describe('PinService (v3.62.0: PIN con hash)', () => {
  let respaldoConfig: string | null;
  beforeAll(() => { respaldoConfig = localStorage.getItem(CLAVE_CONFIG); });
  afterAll(() => {
    if (respaldoConfig === null) localStorage.removeItem(CLAVE_CONFIG);
    else localStorage.setItem(CLAVE_CONFIG, respaldoConfig);
    localStorage.removeItem('stenbrary-pin-intentos');
  });

  it('instalación nueva: el PIN de fábrica 0000 funciona y nunca está en texto plano', async () => {
    const { pin, config } = crear();
    expect(config.quioscoPinDeFabrica).toBeTrue();
    expect(config.quioscoPinLargo).toBe(4);
    expect(esHashPin(config.pinGuardado.pin)).toBeTrue();
    expect(await pin.verificarPin('0000')).toBe('ok');
    expect(await pin.verificarPin('1111')).toBe('fallo');
  });

  it('cambiar el PIN guarda solo hashes, quita la marca de fábrica y devuelve un código que funciona', async () => {
    const { pin, config } = crear();
    const codigo = await pin.establecerPin('482916');
    expect(config.quioscoPinDeFabrica).toBeFalse();
    expect(config.quioscoPinLargo).toBe(6);
    expect(guardado()).not.toContain('482916');
    expect(guardado()).not.toContain(codigo.replace(/-/g, ''));
    expect(guardado()).not.toContain(codigo);
    expect(await pin.verificarPin('0000')).toBe('fallo');
    expect(await pin.verificarPin('482916')).toBe('ok');
    expect(await pin.verificarCodigo(codigo.toLowerCase().replace(/-/g, ' '))).toBe('ok');
  });

  it('un PIN inválido no se guarda', async () => {
    const { pin, config } = crear();
    const antes = config.pinGuardado.pin;
    await expectAsync(pin.establecerPin('12')).toBeRejected();
    await expectAsync(pin.establecerPin('12ab')).toBeRejected();
    expect(config.pinGuardado.pin).toBe(antes);
  });

  it('migración: el PIN y el código viejos en texto plano pasan a hash y siguen funcionando', async () => {
    const { pin, config } = crear({ quioscoPin: '2468', quioscoCodigoRecuperacion: 'ABCD-EFGH-JKLM', modoQuiosco: true });
    expect(config.quioscoPinLargo).toBe(4);          // deducido sin esperar la migración
    expect(config.quioscoPinDeFabrica).toBeFalse();
    await pin.migrar();
    expect(esHashPin(config.pinGuardado.pin)).toBeTrue();
    expect(esHashPin(config.pinGuardado.codigo)).toBeTrue();
    expect(guardado()).not.toContain('2468');
    expect(guardado()).not.toContain('ABCD');
    expect(JSON.parse(guardado()).modoQuiosco).toBeTrue();   // el resto de la configuración intacta
    expect(await pin.verificarPin('2468')).toBe('ok');
    expect(await pin.verificarCodigo('abcd-efgh-jklm')).toBe('ok');
  });

  it('migración: un 0000 viejo queda marcado como de fábrica', async () => {
    const { pin, config } = crear({ quioscoPin: '0000' });
    await pin.migrar();
    expect(config.quioscoPinDeFabrica).toBeTrue();
    expect(await pin.verificarPin('0000')).toBe('ok');
  });

  it('sin migrar todavía, el PIN viejo correcto entra y en ese momento se guarda con hash', async () => {
    const { pin, config } = crear({ quioscoPin: '1357' });
    expect(await pin.verificarPin('1357')).toBe('ok');
    expect(esHashPin(config.pinGuardado.pin)).toBeTrue();
    expect(guardado()).not.toContain('1357');
  });

  it('migrar dos veces no cambia nada (ya es hash)', async () => {
    const { pin, config } = crear({ quioscoPin: '1357' });
    await pin.migrar();
    const hash = config.pinGuardado.pin;
    await pin.migrar();
    expect(config.pinGuardado.pin).toBe(hash);
  });

  it('sin PIN configurado cualquiera pasa (los diálogos lo advierten)', async () => {
    const { pin } = crear({ quioscoPin: '' });
    expect(pin.hayPin).toBeFalse();
    expect(await pin.verificarPin('9999')).toBe('ok');
  });

  it('5 fallos bloquean, también con el PIN correcto después', async () => {
    const { pin } = crear();
    for (let i = 0; i < 5; i++) expect(await pin.verificarPin('9999')).toBe('fallo');
    expect(await pin.verificarPin('0000')).toBe('bloqueado');
  });

  it('una verificación lanzada mientras se guarda el PIN nuevo compara contra el nuevo', async () => {
    const { pin } = crear();
    const guardando = pin.establecerPin('7531');
    const verificacion = pin.verificarPin('7531');   // sin esperar el guardado
    await guardando;
    expect(await verificacion).toBe('ok');
  });

  it('el PIN no aparece en la bitácora ni en la consola', async () => {
    const consola: string[] = [];
    for (const m of ['log', 'warn', 'error', 'info'] as const) {
      spyOn(console, m).and.callFake((...a: unknown[]) => { consola.push(a.map(String).join(' ')); });
    }
    const { pin, anotado } = crear();
    await pin.establecerPin('864209');
    await pin.verificarPin('864208');
    await pin.verificarPin('864209');
    expect(anotado.join('\n')).not.toContain('864209');
    expect(anotado.join('\n')).not.toContain('864208');
    expect(consola.join('\n')).not.toContain('86420');
  });
});
