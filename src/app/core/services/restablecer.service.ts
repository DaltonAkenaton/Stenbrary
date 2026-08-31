// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/restablecer.service.ts  ║
// ║  Stenbrary — Volver a estado de fábrica              ║
// ║                                                      ║
// ║  Deja el sistema como recién instalado: sin alumnos, ║
// ║  sin visitas, con los motivos por defecto y toda la  ║
// ║  configuración en sus valores iniciales.             ║
// ║                                                      ║
// ║  IRREVERSIBLE. Es la operación más destructiva del    ║
// ║  sistema, así que:                                    ║
// ║  - solo la ejecuta el rol máximo,                     ║
// ║  - exige escribir una frase, no un clic,              ║
// ║  - y OBLIGA a descargar un respaldo antes.            ║
// ║                                                      ║
// ║  Lo del respaldo no es cortesía: quien pulsa esto     ║
// ║  suele estar convencido de que no le hace falta, y    ║
// ║  es exactamente quien más lo va a necesitar.          ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { ConfigService } from './config.service';
import { DiagnosticoService } from './diagnostico.service';
import { BackupService } from './backup.service';

/** Frase que hay que escribir. En mayúsculas y sin ambigüedad. */
export const FRASE_CONFIRMACION = 'BORRAR TODO';

/** Marca de que el asistente inicial ya se completó. */
export const CLAVE_SETUP = 'stenbrary-setup-completado';

/**
 * Claves de localStorage que se borran.
 *
 * Lista explícita y no `localStorage.clear()`: un `clear()` arrasaría también
 * con lo que otras herramientas del navegador guarden en el mismo origen, y
 * con claves futuras que nadie recordaría revisar aquí.
 */
const CLAVES_A_BORRAR = [
  'stenbrary-config',
  'stenbrary-changelog-vista',
  'stenbrary-diagnostico',
  'stenbrary-error-queue',
  'stenbrary-sonido-activo',
  CLAVE_SETUP,
];

export interface ResultadoRestablecer {
  alumnosBorrados: number;
  registrosBorrados: number;
}

@Injectable({ providedIn: 'root' })
export class RestablecerService {
  private readonly db = inject(DatabaseService);
  private readonly config = inject(ConfigService);
  private readonly diagnostico = inject(DiagnosticoService);
  private readonly backup = inject(BackupService);

  /** ¿Ya pasó el asistente de configuración inicial? */
  setupCompletado(): boolean {
    try {
      return localStorage.getItem(CLAVE_SETUP) === '1';
    } catch {
      // Sin localStorage no se puede saber; asumir que sí evita empujar el
      // asistente en la cara del usuario una y otra vez.
      return true;
    }
  }

  marcarSetupCompletado(): void {
    try {
      localStorage.setItem(CLAVE_SETUP, '1');
    } catch {
      /* noop */
    }
  }

  /** Descarga un respaldo completo. Se exige antes de restablecer. */
  async descargarRespaldoPrevio(): Promise<boolean> {
    const { exito } = await this.backup.descargarBackup();
    return exito;
  }

  /**
   * Borra todo y devuelve el sistema a estado inicial.
   *
   * Orden deliberado: primero los datos, después la configuración. Si algo
   * falla a mitad, es preferible quedar con la base vacía y la configuración
   * vieja (recuperable a mano) que con datos intactos y la configuración
   * perdida, que deja el sistema operando con ajustes que nadie eligió.
   */
  async restablecer(): Promise<ResultadoRestablecer> {
    const conteo = await this.db.obtenerConteoTotal();

    await this.db.limpiarTodosDatos();

    for (const clave of CLAVES_A_BORRAR) {
      try {
        localStorage.removeItem(clave);
      } catch {
        /* seguir con las demás */
      }
    }

    try {
      sessionStorage.clear();
    } catch {
      /* noop */
    }

    // Devolver los servicios en memoria a sus valores por defecto: sin esto
    // la app sigue operando con la configuración vieja hasta recargar.
    this.config.restablecerTodo();
    this.diagnostico.limpiar();

    return {
      alumnosBorrados: conteo.alumnos ?? 0,
      registrosBorrados: conteo.registros ?? 0,
    };
  }
}
