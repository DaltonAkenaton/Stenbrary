// ╔══════════════════════════════════════════════════════╗
// ║  datos-prueba.utils.ts                                ║
// ║  Stenbrary v3.44.0 — Reconocer datos de prueba         ║
// ║                                                       ║
// ║  Las marcas que deja el generador de Configuración →  ║
// ║  Datos → Datos de prueba. Viven aquí (y no en el      ║
// ║  servicio) para que estadísticas y Resumen puedan      ║
// ║  avisar de datos de prueba mezclados sin importar el  ║
// ║  servicio, que depende de la BD (dependencia circular).║
// ╚══════════════════════════════════════════════════════╝

import { Registro } from '../models';

/** Primera matrícula sintética. Las de prueba van de 9000001 a 9100000. */
export const PRUEBA_MATRICULA_BASE = 9000001;
export const PRUEBA_DISPOSITIVO = 'SEED-TEST';

export function esMatriculaPrueba(matricula: string): boolean {
  const n = Number(matricula);
  return Number.isFinite(n) && n >= PRUEBA_MATRICULA_BASE && n < PRUEBA_MATRICULA_BASE + 100_000;
}

export function esRegistroDePrueba(r: Pick<Registro, 'dispositivo' | 'matricula'>): boolean {
  return r.dispositivo === PRUEBA_DISPOSITIVO || esMatriculaPrueba(r.matricula);
}
