// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/backup.service.ts       ║
// ║  Stenbrary v3.4.1 — Backup & Restore FIXED           ║
// ║                                                      ║
// ║  FIX v3.4.1:                                         ║
// ║  - Motivos: verifica duplicados por nombre antes     ║
// ║    de importar (evita duplicación)                   ║
// ║  - Nuevo: limpiarMotivosDuplicados() para arreglar   ║
// ║    datos ya duplicados                               ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { ConfigService } from './config.service';
import { BitacoraService, idsBorrados } from './bitacora.service';
import { Alumno, Registro, Motivo, EventoBitacora } from '../models';
import { fechaLocalISO } from '../utils/tiempo.utils';

export interface BackupData {
  meta: {
    version: string;
    fecha: string;
    app: string;
    totalAlumnos: number;
    totalRegistros: number;
    totalMotivos: number;
    /** Equipo que generó el respaldo (v3.52.0). Opcional: los viejos no lo traen. */
    equipo?: string;
  };
  alumnos: Alumno[];
  registros: Registro[];
  motivos: Motivo[];
  /** Bitácora del equipo (v3.52.0). Opcional por retrocompatibilidad. */
  bitacora?: EventoBitacora[];
}

export interface ValidacionBackup {
  valido: boolean;
  errores: string[];
  datos?: BackupData;
}

export interface ResultadoImportacion {
  exitoso: boolean;
  alumnosImportados: number;
  registrosImportados: number;
  motivosImportados: number;
  alumnosOmitidos: number;
  motivosOmitidos: number;
  eventosBitacora: number;
  /** De los importados, cuántos no existían aquí (v3.53.0): lo que trajo el día. */
  alumnosNuevos: number;
  registrosNuevos: number;
  /** Visitas borradas aquí porque se borraron en el otro equipo (v3.53.0). */
  borradosAplicados: number;
  errores: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
    private bitacora: BitacoraService,
  ) {}

  // ═══════════════════════════════════════════════
  // EXPORTAR
  // ═══════════════════════════════════════════════

  async exportarBackup(): Promise<BackupData> {
    const [alumnos, registros, motivos, bitacora] = await Promise.all([
      this.databaseService.obtenerTodosLosAlumnos(),
      this.databaseService.obtenerTodosLosRegistros(),
      this.databaseService.obtenerTodosLosMotivos(),
      this.databaseService.obtenerBitacora(),
    ]);

    return {
      meta: {
        version: '3.4',
        fecha: new Date().toISOString(),
        app: 'Stenbrary',
        totalAlumnos: alumnos.length,
        totalRegistros: registros.length,
        totalMotivos: motivos.length,
        equipo: this.configService.nombreEquipo || undefined,
      },
      alumnos,
      registros,
      motivos,
      bitacora,
    };
  }

  async descargarBackup(): Promise<{ exito: boolean; nombreArchivo: string }> {
    try {
      const backup = await this.exportarBackup();
      const fecha = fechaLocalISO();
      // HHmm en 24 h a mano: toLocaleTimeString('es-MX') da "09:37 p.m." y el
      // archivo salía como "..._0937 p.m..json" (espacio y doble punto).
      const ahora = new Date();
      const hora = String(ahora.getHours()).padStart(2, '0') + String(ahora.getMinutes()).padStart(2, '0');
      const nombreArchivo = `stenbrary_backup_${fecha}_${hora}.json`;

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      link.click();
      URL.revokeObjectURL(url);

      console.log('✅ Backup exportado:', nombreArchivo);
      // Registrar el timestamp para el recordatorio de respaldo.
      // Se hace después de disparar la descarga para no marcar como "hecho"
      // si la construcción del blob falló.
      this.configService.registrarRespaldoHecho();
      this.bitacora.registrar(
        'respaldo-exportado',
        `${nombreArchivo} — ${backup.meta.totalAlumnos} alumnos, ${backup.meta.totalRegistros} visitas`,
      );
      return { exito: true, nombreArchivo };
    } catch (error) {
      console.error('❌ Error al exportar backup:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════
  // VALIDAR
  // ═══════════════════════════════════════════════

  validarArchivo(contenido: string): ValidacionBackup {
    const errores: string[] = [];
    let datos: any;

    try {
      datos = JSON.parse(contenido);
    } catch {
      return { valido: false, errores: ['El archivo no es un JSON válido'] };
    }

    if (!datos.meta) {
      errores.push('Falta el campo "meta" — no parece ser un respaldo de Stenbrary');
    } else if (datos.meta.app !== 'Stenbrary') {
      errores.push(`Programa desconocido: "${datos.meta.app}" (se esperaba "Stenbrary")`);
    }

    if (!Array.isArray(datos.alumnos)) errores.push('Falta el array "alumnos"');
    if (!Array.isArray(datos.registros)) errores.push('Falta el array "registros"');
    if (!Array.isArray(datos.motivos)) errores.push('Falta el array "motivos"');
    if (datos.bitacora !== undefined && !Array.isArray(datos.bitacora)) {
      errores.push('El campo "bitacora" no es una lista');
    }

    if (errores.length > 0) return { valido: false, errores };

    if (datos.alumnos.length > 0) {
      const sample = datos.alumnos[0];
      if (!sample.matricula || !sample.nombre) {
        errores.push('Los datos de alumnos no tienen la estructura esperada');
      }
    }

    if (errores.length > 0) return { valido: false, errores };

    return { valido: true, errores: [], datos: datos as BackupData };
  }

  // ═══════════════════════════════════════════════
  // IMPORTAR (FIX v3.4.1 — deduplicación)
  // ═══════════════════════════════════════════════

  async importarBackup(
    datos: BackupData,
    modo: 'merge' | 'replace' = 'merge'
  ): Promise<ResultadoImportacion> {
    const resultado: ResultadoImportacion = {
      exitoso: false,
      alumnosImportados: 0,
      registrosImportados: 0,
      motivosImportados: 0,
      alumnosOmitidos: 0,
      motivosOmitidos: 0,
      eventosBitacora: 0,
      alumnosNuevos: 0,
      registrosNuevos: 0,
      borradosAplicados: 0,
      errores: [],
    };

    try {
      if (modo === 'replace') {
        await this.databaseService.limpiarTodosDatos();
        // limpiarTodosDatos() recrea los motivos default con ids nuevos. Si el
        // respaldo trae su catálogo, ese manda: se restaura tal cual (ids,
        // colores, orden, activos) en vez de mezclarse con los default.
        if (datos.motivos.length > 0) {
          for (const m of await this.databaseService.obtenerTodosLosMotivos()) {
            if (m.id) await this.databaseService.eliminarMotivo(m.id);
          }
        }
        console.log('🗑️ Datos anteriores eliminados (modo replace)');
      }

      // ── Importar Motivos (deduplicar por nombre, v3.4.1) ──
      // Cada instalación crea sus motivos default con ids propios, así que
      // "Estudiar" del respaldo y "Estudiar" de esta base son el mismo motivo
      // con ids distintos. Antes se omitía el del respaldo sin más y sus
      // registros quedaban apuntando a un id inexistente: las estadísticas
      // partían "Estudiar" en dos filas y editar el registro fallaba (v3.50.0).
      // Ahora se arma un mapa id-del-respaldo → id-local y se aplica a los
      // registros. Los motivos nuevos conservan su id.
      const motivosExistentes = await this.databaseService.obtenerTodosLosMotivos();
      const idPorNombre = new Map(
        motivosExistentes.filter(m => m.id).map(m => [normalizarNombre(m.nombre), m.id as string]),
      );
      const idsLocales = new Set(motivosExistentes.map(m => m.id));
      const mapaMotivos = new Map<string, string>();

      for (const motivo of datos.motivos) {
        const nombreNorm = normalizarNombre(motivo.nombre);
        const local = motivo.id && idsLocales.has(motivo.id) ? motivo.id : idPorNombre.get(nombreNorm);

        if (local) {
          if (motivo.id) mapaMotivos.set(motivo.id, local);
          resultado.motivosOmitidos++;
          continue;
        }

        try {
          const nuevo = motivo.id
            ? await this.databaseService.restaurarMotivo(motivo)
            : await this.databaseService.crearMotivo({
                nombre: motivo.nombre,
                descripcion: motivo.descripcion,
                icono: motivo.icono,
                color: motivo.color,
                orden: motivo.orden,
                activo: motivo.activo,
              });
          if (nuevo.id) idPorNombre.set(nombreNorm, nuevo.id);
          resultado.motivosImportados++;
        } catch {
          resultado.motivosOmitidos++;
        }
      }

      // ── Borrados del otro equipo (v3.53.0, solo al combinar) ──
      // El import combina y nunca quita, así que una visita basura borrada en
      // la puerta seguía para siempre en la oficina. Los borrados viajan en
      // la bitácora (`refId`):
      //  - los que llegan NUEVOS en este respaldo se aplican aquí;
      //  - todos los conocidos (de aquí o de allá) evitan revivir lo borrado.
      // "Reemplazar todo" no los aplica: es restaurar, y tiene que devolver
      // exactamente lo que trae el archivo (p. ej. tras un borrado por error).
      const eventosEntrantes = datos.bitacora ?? [];
      let omitirAlumno: (id: string) => boolean = () => false;
      let omitirRegistro: (r: Registro) => boolean = () => false;
      if (modo === 'merge') {
        const locales = await this.databaseService.obtenerBitacora();
        const conocidos = new Set(locales.map(e => e.id));
        const nuevos = idsBorrados(eventosEntrantes.filter(e => !conocidos.has(e.id)));
        for (const id of nuevos.alumnos) {
          resultado.borradosAplicados += await this.databaseService.eliminarAlumno(id, { porMatricula: false });
        }
        resultado.borradosAplicados += await this.databaseService.eliminarRegistrosPorIds(nuevos.registros);

        const todos = idsBorrados([...locales, ...eventosEntrantes]);
        omitirAlumno = id => todos.alumnos.has(id);
        omitirRegistro = r => todos.registros.has(r.id) || todos.alumnos.has(r.alumnoId);
      }

      // ── Importar Alumnos (deduplicar por matrícula) ──
      // Se restauran TAL CUAL: conservan su `id` original, y con él los
      // `alumnoId` de los registros que los referencian. Reconstruirlos con
      // `crearAlumno()` generaba ids nuevos y rompía esa relación.
      // v3.53.0: en lote (una transacción), no fila por fila.
      const alumnosOmitibles = new Set(datos.alumnos.filter(a => a?.id && omitirAlumno(a.id)).map(a => a.id!));
      const resAlumnos = await this.databaseService.restaurarAlumnosLote(datos.alumnos, alumnosOmitibles);
      resultado.alumnosImportados = resAlumnos.nuevos + resAlumnos.actualizados + resAlumnos.iguales;
      resultado.alumnosNuevos = resAlumnos.nuevos;
      resultado.alumnosOmitidos = resAlumnos.omitidos;

      // ── Importar Registros ──
      // Un backup es la única red de seguridad del coordinador: tiene que
      // devolver el historial EXACTO. Antes se recreaban con `crearRegistro()`,
      // que estampa `fechaHora: new Date()` — cada restauración aplastaba
      // meses de historial contra el día de la importación, y descartaba
      // horaSalida, duracionMinutos, motivoIds/motivoNombres y turno.
      // v3.53.0: en lote. Un año (50 000 visitas) pasaba de 70–120 s.
      const resRegistros = await this.databaseService.restaurarRegistrosLote(
        datos.registros.map(r => remapearMotivos(r, mapaMotivos)),
        omitirRegistro,
      );
      resultado.registrosImportados = resRegistros.nuevos + resRegistros.actualizados + resRegistros.iguales;
      resultado.registrosNuevos = resRegistros.nuevos;
      resultado.errores.push(...resRegistros.errores);

      // ── Bitácora (v3.52.0) ──
      // Se combina siempre, también en 'replace': la bitácora no se borra
      // nunca, y la del equipo de origen es lo que la oficina quiere ver.
      resultado.eventosBitacora = await this.databaseService.restaurarBitacoraLote(eventosEntrantes);

      resultado.exitoso = true;
      const origen = datos.meta?.equipo ? ` de "${datos.meta.equipo}"` : '';
      const borrados = resultado.borradosAplicados ? `, ${resultado.borradosAplicados} borradas allá` : '';
      this.bitacora.registrar(
        'respaldo-importado',
        `Respaldo${origen} del ${fechaRespaldo(datos.meta?.fecha)} ` +
        `(${modo === 'replace' ? 'reemplazar' : 'combinar'}): ` +
        `${resultado.registrosNuevos} visitas nuevas, ${resultado.alumnosNuevos} alumnos nuevos${borrados}`,
      );
      console.log('✅ Importación completada:', resultado);
      return resultado;
    } catch (error: any) {
      resultado.errores.push(`Error general: ${error.message}`);
      console.error('❌ Error durante importación:', error);
      return resultado;
    }
  }

  // ═══════════════════════════════════════════════
  // LIMPIAR DUPLICADOS (NUEVO v3.4.1)
  // ═══════════════════════════════════════════════

  /**
   * Encuentra y elimina motivos duplicados por nombre.
   * Conserva el que tiene menor orden (el original).
   * Reasigna órdenes consecutivos después de limpiar.
   */
  async limpiarMotivosDuplicados(): Promise<number> {
    const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();

    // Agrupar por nombre normalizado
    const grupos = new Map<string, Motivo[]>();
    todosMotivos.forEach(m => {
      const key = m.nombre.toLowerCase().trim();
      const grupo = grupos.get(key) || [];
      grupo.push(m);
      grupos.set(key, grupo);
    });

    let eliminados = 0;

    for (const [, grupo] of grupos) {
      if (grupo.length <= 1) continue;

      // Mantener el de menor orden (el original)
      grupo.sort((a, b) => a.orden - b.orden);

      for (let i = 1; i < grupo.length; i++) {
        if (grupo[i].id) {
          await this.databaseService.eliminarMotivo(grupo[i].id!);
          eliminados++;
          console.log(`🗑️ Duplicado eliminado: "${grupo[i].nombre}" (orden ${grupo[i].orden})`);
        }
      }
    }

    // Reasignar órdenes consecutivos
    if (eliminados > 0) {
      const motivosLimpios = await this.databaseService.obtenerTodosLosMotivos();
      for (let i = 0; i < motivosLimpios.length; i++) {
        if (motivosLimpios[i].orden !== i + 1) {
          await this.databaseService.actualizarMotivo(motivosLimpios[i].id!, {
            ...motivosLimpios[i],
            orden: i + 1,
          });
        }
      }
    }

    return eliminados;
  }

  /**
   * Cuenta cuántos motivos duplicados existen actualmente.
   */
  async contarMotivosDuplicados(): Promise<number> {
    const todosMotivos = await this.databaseService.obtenerTodosLosMotivos();
    const grupos = new Map<string, number>();

    todosMotivos.forEach(m => {
      const key = m.nombre.toLowerCase().trim();
      grupos.set(key, (grupos.get(key) || 0) + 1);
    });

    let duplicados = 0;
    grupos.forEach(count => {
      if (count > 1) duplicados += count - 1;
    });

    return duplicados;
  }
}

function fechaRespaldo(iso: string | undefined): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '?';
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function normalizarNombre(nombre: string): string {
  return (nombre || '').toLowerCase().trim();
}

/**
 * Traduce los ids de motivo de un registro del respaldo a los de esta base.
 * Los ids que no están en el mapa (motivos nuevos o ya borrados) se quedan
 * igual: el registro conserva sus nombres guardados de todos modos.
 */
export function remapearMotivos(registro: Registro, mapa: Map<string, string>): Registro {
  if (mapa.size === 0) return registro;
  const t = (id: string) => mapa.get(id) ?? id;
  return {
    ...registro,
    motivoId: registro.motivoId ? t(registro.motivoId) : registro.motivoId,
    ...(registro.motivoIds ? { motivoIds: registro.motivoIds.map(t) } : {}),
  };
}
