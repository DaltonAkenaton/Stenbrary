// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/backup.service.ts       ║
// ║  Stenbrary v3.4.1 — Backup & Restore FIXED           ║
// ║                                                      ║
// ║  FIX v3.4.1:                                         ║
// ║  - Motivos: verifica duplicados por nombre antes     ║
// ║    de importar (evita duplicación)                   ║
// ║  (limpiarMotivosDuplicados se quitó en v3.59.0: desde ║
// ║   v3.50.0 los motivos se emparejan por nombre)       ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, inject } from '@angular/core';
import { DatabaseService } from './database.service';
import { ConfigService } from './config.service';
import { BitacoraService, idsBorrados, renombresCarrera, traducirCarrera } from './bitacora.service';
import { CatalogoEscolar, aplicarRenombre, combinarCatalogos, normalizarCatalogo } from '../utils/catalogos.utils';
import { Alumno, Registro, Motivo, EventoBitacora } from '../models';
import { fechaLocalISO } from '../utils/tiempo.utils';
import { MAX_BYTES_RESPALDO, validarRespaldo } from '../utils/validacion-respaldo.utils';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger';

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
  /**
   * Catálogo de carreras, grupos y grados (v3.57.0). Opcional: los viejos no
   * lo traen. Viaja para que la puerta y la oficina ofrezcan la misma lista.
   */
  catalogoEscolar?: CatalogoEscolar;
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
  /** Carreras y grupos que el respaldo agregó al catálogo de aquí (v3.57.0). */
  catalogoNuevos: number;
  /** Alumnos y visitas que se quedaron como estaban: aquí se editaron después (v3.57.2). */
  conservados: number;
  errores: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private databaseService = inject(DatabaseService);
  private configService = inject(ConfigService);
  private bitacora = inject(BitacoraService);


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
      catalogoEscolar: this.configService.catalogoEscolar,
    };
  }

  /**
   * `etiqueta` va en el nombre del archivo (v3.62.0: "antes-de-reemplazar"
   * para la copia automática previa a "Reemplazar todo").
   */
  async descargarBackup(etiqueta?: string): Promise<{ exito: boolean; nombreArchivo: string }> {
    try {
      const backup = await this.exportarBackup();
      const fecha = fechaLocalISO();
      // HHmm en 24 h a mano: toLocaleTimeString('es-MX') da "09:37 p.m." y el
      // archivo salía como "..._0937 p.m..json" (espacio y doble punto).
      const ahora = new Date();
      const hora = String(ahora.getHours()).padStart(2, '0') + String(ahora.getMinutes()).padStart(2, '0');
      const nombreArchivo = `stenbrary_backup_${etiqueta ? etiqueta + '_' : ''}${fecha}_${hora}.json`;

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      link.click();
      // Revocar en el mismo instante puede cancelar la descarga en algunos
      // navegadores: el archivo de respaldo saldría vacío o no saldría.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      log('✅ Backup exportado:', nombreArchivo);
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

  /**
   * v3.62.0: valida el archivo COMPLETO (cada alumno, visita, actividad y
   * evento) con `validarRespaldo`. Antes solo se revisaba el primer alumno.
   */
  validarArchivo(contenido: string): ValidacionBackup {
    if (contenido.length > MAX_BYTES_RESPALDO) {
      return { valido: false, errores: ['El archivo es demasiado grande para ser un respaldo de Stenbrary.'] };
    }
    let datos: unknown;
    try {
      datos = JSON.parse(contenido);
    } catch {
      return { valido: false, errores: ['El archivo no es un JSON válido'] };
    }
    const r = validarRespaldo(datos);
    return r.valido ? { valido: true, errores: [], datos: r.datos } : { valido: false, errores: r.errores };
  }

  // ═══════════════════════════════════════════════
  // IMPORTAR (FIX v3.4.1 — deduplicación)
  // ═══════════════════════════════════════════════

  async importarBackup(
    datos: BackupData,
    modo: 'merge' | 'replace' = 'merge',
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
      catalogoNuevos: 0,
      conservados: 0,
      errores: [],
    };

    // v3.62.0: se valida aquí también (no solo al elegir el archivo): un
    // respaldo inválido no toca la base, lo llame quien lo llame.
    const validacion = validarRespaldo(datos);
    if (!validacion.valido) {
      resultado.errores.push(...validacion.errores);
      return resultado;
    }

    try {
      if (modo === 'replace') return await this.reemplazar(datos, resultado);

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
      let traducir = (carrera: string) => carrera;
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

        // ── Correcciones de nombre de carrera (v3.57.2) ──
        // Igual que los borrados: las nuevas se repiten aquí, y todas
        // traducen lo que llegue con el nombre viejo.
        const renNuevos = renombresCarrera(eventosEntrantes.filter(e => !conocidos.has(e.id)));
        const catalogoAntes = this.configService.catalogoEscolar;
        let catalogo = catalogoAntes;
        for (const r of renNuevos) {
          await this.databaseService.renombrarCarreraEnDatos(r.de, r.a);
          if (catalogo) catalogo = aplicarRenombre(catalogo, r.de, r.a);
        }
        if (catalogo && catalogo !== catalogoAntes) this.configService.setCatalogoEscolar(catalogo);
        const renTodos = renombresCarrera([...locales, ...eventosEntrantes]);
        if (renTodos.length > 0) traducir = carrera => traducirCarrera(carrera, renTodos);
      }
      const conCarreraDeHoy = <T extends { carrera?: string }>(x: T): T => {
        if (!x?.carrera) return x;
        const c = traducir(x.carrera);
        return c === x.carrera ? x : { ...x, carrera: c };
      };

      // ── Importar Alumnos (deduplicar por matrícula) ──
      // Se restauran TAL CUAL: conservan su `id` original, y con él los
      // `alumnoId` de los registros que los referencian. Reconstruirlos con
      // `crearAlumno()` generaba ids nuevos y rompía esa relación.
      // v3.53.0: en lote (una transacción), no fila por fila.
      const alumnosOmitibles = new Set(datos.alumnos.filter(a => a?.id && omitirAlumno(a.id)).map(a => a.id!));
      const resAlumnos = await this.databaseService.restaurarAlumnosLote(
        datos.alumnos.map(conCarreraDeHoy), alumnosOmitibles, modo === 'merge');
      resultado.alumnosImportados = resAlumnos.nuevos + resAlumnos.actualizados + resAlumnos.iguales + resAlumnos.conservados;
      resultado.conservados += resAlumnos.conservados;
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
        datos.registros.map(r => conCarreraDeHoy(remapearMotivos(r, mapaMotivos))),
        omitirRegistro,
        modo === 'merge',
      );
      resultado.registrosImportados = resRegistros.nuevos + resRegistros.actualizados + resRegistros.iguales + resRegistros.conservados;
      resultado.conservados += resRegistros.conservados;
      resultado.registrosNuevos = resRegistros.nuevos;
      resultado.errores.push(...resRegistros.errores);

      // ── Bitácora (v3.52.0) ──
      // La del equipo de origen es lo que la oficina quiere ver.
      resultado.eventosBitacora = await this.databaseService.restaurarBitacoraLote(eventosEntrantes);

      // ── Catálogo (v3.57.0) ──
      // Combinar: el de aquí manda y solo se suman las carreras y grupos que falten.
      if (datos.catalogoEscolar) {
        const leido = normalizarCatalogo(datos.catalogoEscolar);
        const remoto = { ...leido, carreras: leido.carreras.map(c => ({ ...c, nombre: traducir(c.nombre) })) };
        const { catalogo, nuevos } = combinarCatalogos(this.configService.catalogoEscolar, remoto);
        if (nuevos > 0) this.configService.setCatalogoEscolar(catalogo);
        resultado.catalogoNuevos = nuevos;
      }

      resultado.exitoso = true;
      this.anotarImportacion(datos, modo, resultado);
      return resultado;
    } catch (error: unknown) {
      const mensaje = error instanceof Error ? error.message : String(error);
      resultado.errores.push(`Error general: ${mensaje}`);
      if (modo === 'replace') {
        // La transacción de `reemplazarTodo` se deshizo completa.
        resultado.errores.push('No se cambió nada: los datos de este equipo quedaron como estaban.');
        this.bitacora.registrar('respaldo-importado', `Falló "reemplazar" (${mensaje}); los datos quedaron como estaban`);
      }
      console.error('❌ Error durante importación:', error);
      return resultado;
    }
  }

  /**
   * "Reemplazar todo" (v3.62.0): una sola transacción en `reemplazarTodo`.
   * Si falla, la base queda exactamente como estaba; ya no hace falta la
   * copia en memoria para volver atrás.
   *
   * El catálogo de actividades del respaldo manda tal cual (ids, colores,
   * orden, activos). Dos actividades con el mismo nombre se funden en la
   * primera y sus visitas apuntan a ella, como al combinar.
   */
  private async reemplazar(datos: BackupData, resultado: ResultadoImportacion): Promise<ResultadoImportacion> {
    const mapaMotivos = new Map<string, string>();
    const idPorNombre = new Map<string, string>();
    const motivos: Motivo[] = [];
    for (const motivo of datos.motivos) {
      const nombre = normalizarNombre(motivo.nombre);
      const primero = idPorNombre.get(nombre);
      if (primero) {
        if (motivo.id) mapaMotivos.set(motivo.id, primero);
        resultado.motivosOmitidos++;
        continue;
      }
      const id = motivo.id || uuidv4();
      idPorNombre.set(nombre, id);
      motivos.push({ ...motivo, id });
    }

    const res = await this.databaseService.reemplazarTodo({
      motivos,
      alumnos: datos.alumnos,
      registros: datos.registros.map(r => remapearMotivos(r, mapaMotivos)),
      bitacora: datos.bitacora ?? [],
    });
    resultado.motivosImportados = motivos.length;
    resultado.alumnosImportados = resultado.alumnosNuevos = res.alumnos;
    resultado.registrosImportados = resultado.registrosNuevos = res.registros;
    resultado.eventosBitacora = res.eventosNuevos;

    // Catálogo de carreras: el del archivo tal cual.
    if (datos.catalogoEscolar) this.configService.setCatalogoEscolar(normalizarCatalogo(datos.catalogoEscolar));

    resultado.exitoso = true;
    this.anotarImportacion(datos, 'replace', resultado);
    return resultado;
  }

  private anotarImportacion(datos: BackupData, modo: 'merge' | 'replace', resultado: ResultadoImportacion): void {
    const origen = datos.meta?.equipo ? ` de "${datos.meta.equipo}"` : '';
    const borrados = resultado.borradosAplicados ? `, ${resultado.borradosAplicados} borradas allá` : '';
    this.bitacora.registrar(
      'respaldo-importado',
      `Respaldo${origen} del ${fechaRespaldo(datos.meta?.fecha)} ` +
      `(${modo === 'replace' ? 'reemplazar' : 'combinar'}): ` +
      `${resultado.registrosNuevos} visitas nuevas, ${resultado.alumnosNuevos} alumnos nuevos${borrados}`,
    );
    log('✅ Importación completada:', resultado);
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
