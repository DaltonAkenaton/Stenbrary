// ╔══════════════════════════════════════════════════════╗
// ║  database.service.ts                                  ║
// ║  Stenbrary v3.19.0 — Tx atómicas + persist + bdError  ║
// ║                                                       ║
// ║  CAMBIOS v3.19.0:                                     ║
// ║  - Signal `bdError` para mostrar banner si falla init ║
// ║  - navigator.storage.persist() solicitado al abrir    ║
// ║  - Transacciones atómicas en read+write compuestos:   ║
// ║    crearMotivosDefault, registrarSalida,              ║
// ║    confirmarCierreAutomatico, desactivar/reactivar,   ║
// ║    actualizarRegistroManual                           ║
// ║  - actualizar* clonan el parámetro (no mutan caller)  ║
// ║  - logs PII migrados a logger dev-guarded             ║
// ║  - obtenerRegistrosAbiertoHoy: fallback solo si el    ║
// ║    índice falla, no si está vacío                     ║
// ║                                                       ║
// ║  Base v3.6.2:                                         ║
// ║  - Índices by-fecha, by-matricula, by-alumno          ║
// ║  - Fallback getAll+filter para fechas string viejas   ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable, signal } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { calcularInactividad, duracionReal } from '../utils/estadisticas.utils';
import { Alumno, Registro, Motivo, EventoBitacora } from '../models';
import { log, logError } from '../utils/logger';
import { invariante } from '../utils/invariante.utils';

/**
 * Huella de una fila para saber si cambió, sin los metadatos de sync (que el
 * import siempre reescribe). Las fechas salen como ISO en ambos lados.
 */
/** `editadoEn` en ms; sin ella (datos de antes de v3.57.2), 0 = la más vieja. */
function msEditado(fila: { editadoEn?: Date | string }): number {
  const t = fila.editadoEn ? new Date(fila.editadoEn).getTime() : 0;
  return Number.isNaN(t) ? 0 : t;
}

function huella(fila: object): string {
  const { _syncStatus, _lastSyncedAt, ...resto } = fila as Record<string, unknown>;
  void _syncStatus; void _lastSyncedAt;
  return JSON.stringify(resto);
}

// Definir esquema de la base de datos
interface StenbraryDB extends DBSchema {
  alumnos: {
    key: string;
    value: Alumno;
    indexes: {
      'by-matricula': string;
      'by-carrera': string;
      // Fase 2.2 — query rápida de pendientes para la bandeja de sync.
      // Sparse: filas sin _syncStatus (datos pre-2.2) no aparecen.
      'by-sync-status': string;
    };
  };
  registros: {
    key: string;
    value: Registro;
    indexes: {
      'by-fecha': Date;
      'by-alumno': string;
      'by-matricula': string;
      'by-sync-status': string;
    };
  };
  motivos: {
    key: string;
    value: Motivo;
    indexes: {
      'by-orden': number;
      'by-sync-status': string;
    };
  };
  // v3 (v3.52.0): bitácora local. Sin by-sync-status: en la Fase 2 se sube
  // tal cual a una tabla de auditoría, no pasa por la bandeja supervisada.
  bitacora: {
    key: string;
    value: EventoBitacora;
    indexes: {
      'by-fecha': string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: IDBPDatabase<StenbraryDB> | null = null;
  private readonly DB_NAME = 'stenbrary-db';
  // v2 (Fase 2.2): índice by-sync-status en alumnos, registros, motivos.
  // v3 (v3.52.0): store `bitacora`.
  private readonly DB_VERSION = 3;
  private initializationPromise: Promise<void> | null = null;

  // Signal de error de BD: si openDB falla irrecoverablemente, este signal
  // tiene el mensaje. AppComponent muestra un banner cuando no es null.
  private _bdError = signal<string | null>(null);
  readonly bdError = this._bdError.asReadonly();

  constructor() {
    this.inicializar();
  }

  // ==================== INICIALIZACIÓN ====================

  async inicializar(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.db) {
      return Promise.resolve();
    }

    this.initializationPromise = this.initDatabase();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async initDatabase(): Promise<void> {
    try {
      this.db = await openDB<StenbraryDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, _newVersion, tx) {
          // ── v1: schema inicial ────────────────────────────────
          if (!db.objectStoreNames.contains('alumnos')) {
            const alumnosStore = db.createObjectStore('alumnos', {
              keyPath: 'id'
            });
            alumnosStore.createIndex('by-matricula', 'matricula', { unique: true });
            alumnosStore.createIndex('by-carrera', 'carrera');
          }

          if (!db.objectStoreNames.contains('registros')) {
            const registrosStore = db.createObjectStore('registros', {
              keyPath: 'id'
            });
            registrosStore.createIndex('by-fecha', 'fechaHora');
            registrosStore.createIndex('by-alumno', 'alumnoId');
            registrosStore.createIndex('by-matricula', 'matricula');
          }

          if (!db.objectStoreNames.contains('motivos')) {
            const motivosStore = db.createObjectStore('motivos', {
              keyPath: 'id'
            });
            motivosStore.createIndex('by-orden', 'orden');
          }

          // ── v2 (Fase 2.2): índice by-sync-status ──────────────
          // Sparse — filas sin `_syncStatus` (datos pre-2.2) NO aparecen
          // en el índice. Esto es intencional: el coordinador ya las
          // subió con el importador one-shot, no queremos re-marcarlas
          // como pendientes. Solo nuevas mutaciones generan entradas.
          if (oldVersion < 2) {
            const alumnosStore = tx.objectStore('alumnos');
            if (!alumnosStore.indexNames.contains('by-sync-status')) {
              alumnosStore.createIndex('by-sync-status', '_syncStatus');
            }
            const registrosStore = tx.objectStore('registros');
            if (!registrosStore.indexNames.contains('by-sync-status')) {
              registrosStore.createIndex('by-sync-status', '_syncStatus');
            }
            const motivosStore = tx.objectStore('motivos');
            if (!motivosStore.indexNames.contains('by-sync-status')) {
              motivosStore.createIndex('by-sync-status', '_syncStatus');
            }
          }

          // ── v3 (v3.52.0): bitácora local ──────────────────────
          if (!db.objectStoreNames.contains('bitacora')) {
            const bitacoraStore = db.createObjectStore('bitacora', { keyPath: 'id' });
            bitacoraStore.createIndex('by-fecha', 'fechaHora');
          }
        },
        // ── Dos pestañas y un cambio de esquema (v3.54.0) ──
        // Una pestaña abierta con la versión anterior bloquea la subida de
        // DB_VERSION: la nueva se quedaba esperando sin decir nada.
        // La pestaña nueva avisa…
        blocked: () => {
          this._bdError.set(
            'Hay otra ventana o pestaña de Stenbrary abierta con la versión anterior. ' +
            'Ciérrala o recárgala para continuar.',
          );
        },
        // …y la vieja suelta la base y se recarga sola con la versión nueva.
        // Solo funciona de esta versión en adelante: la que ya está abierta en
        // un equipo no tiene este código.
        blocking: () => {
          this.db?.close();
          this.db = null;
          window.location.reload();
        },
      });

      this._bdError.set(null);
      log('✅ Base de datos inicializada correctamente');

      // Solicitar storage persistente — evita que el browser desaloje la BD
      // bajo presión de almacenamiento. Crítico en una PWA offline-first
      // donde la única fuente de verdad es IndexedDB.
      this.solicitarStoragePersistente();

      // Crear motivos por defecto si no existen
      await this.crearMotivosDefault();
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      const msg = err?.name === 'SecurityError' || err?.name === 'InvalidStateError'
        ? 'No se pudo abrir la base de datos local. Esto suele pasar en modo incógnito o cuando el navegador bloquea el almacenamiento. Salí del modo privado o liberá espacio.'
        : 'No se pudo abrir la base de datos local. Recargá la página. Si el problema persiste, verificá el espacio disponible.';
      this._bdError.set(msg);
      logError('❌ Error al inicializar base de datos:', error);
      throw error;
    }
  }

  /** Solicita persistencia al navegador (best-effort, sin esperar). */
  private solicitarStoragePersistente(): void {
    if (typeof navigator === 'undefined') return;
    const storage = navigator.storage;
    if (!storage?.persist) return;
    storage.persist().then(persistido => {
      log('💾 Storage persistente:', persistido ? 'concedido' : 'denegado');
    }).catch(() => { /* silenciar */ });
  }

  private async crearMotivosDefault(): Promise<void> {
    if (!this.db) return;

    // Transacción atómica: count + adds. Si dos pestañas inicializan en
    // paralelo, la segunda ve el count actualizado dentro de su propia tx
    // y no duplica los motivos.
    const tx = this.db.transaction('motivos', 'readwrite');
    const store = tx.store;
    const count = await store.count();

    if (count > 0) {
      await tx.done;
      return;
    }

    const motivosDefault: Motivo[] = [
      { id: uuidv4(), nombre: 'Estudiar',        icono: 'menu_book',  orden: 1, activo: true, fechaCreacion: new Date() },
      { id: uuidv4(), nombre: 'Pedir libro',     icono: 'book',       orden: 2, activo: true, fechaCreacion: new Date() },
      { id: uuidv4(), nombre: 'Trabajo escolar', icono: 'assignment', orden: 3, activo: true, fechaCreacion: new Date() },
      { id: uuidv4(), nombre: 'Investigación',   icono: 'search',     orden: 4, activo: true, fechaCreacion: new Date() },
      { id: uuidv4(), nombre: 'Otro',            icono: 'more_horiz', orden: 5, activo: true, fechaCreacion: new Date() },
    ];

    await Promise.all(motivosDefault.map(m => store.add(m)));
    await tx.done;
    log('✅ Motivos por defecto creados');
  }

  // ==================== ALUMNOS ====================

  // ── Sync helpers (Fase 2.2) ───────────────────────────────────
  // Cada mutación local pasa por aquí para marcarse como pending —
  // la bandeja `/sincronizacion` lo consume después para subir el
  // batch supervisado. No tocamos los timestamps de negocio
  // (fechaRegistro / fechaHora), solo metadata interna.
  //
  // v3.57.2: `editado` estampa `editadoEn` (ver el modelo): lo hizo una
  // persona. Restaurar y los cierres automáticos pasan `false`.
  private markPending<T extends { _syncStatus?: string; _lastSyncedAt?: Date }>(row: T, editado = true): T {
    this.notificarCambioSync();
    return { ...row, _syncStatus: 'pending', _lastSyncedAt: undefined, ...(editado ? { editadoEn: new Date() } : {}) };
  }

  /**
   * Igual que `markPending`, pero sobre una fila ya leída dentro de una
   * transacción (las que se modifican campo a campo antes del `put`).
   * Sin esto, desactivar un alumno, editar un registro o cerrarlo por
   * tiempo cambiaba la fila local y la bandeja nunca la volvía a ofrecer:
   * la nube se quedaba con la versión vieja (auditoría 2026-10).
   */
  private marcarPendienteEnSitio(
    row: { _syncStatus?: string; _lastSyncedAt?: Date; editadoEn?: Date },
    editado = true,
  ): void {
    row._syncStatus = 'pending';
    row._lastSyncedAt = undefined;
    if (editado) row.editadoEn = new Date();
    this.notificarCambioSync();
  }

  /**
   * Marca una fila como ya sincronizada al escribirla.
   *
   * Solo tiene sentido para filas que ACABAN de llegar de la nube: si se
   * guardaran como `pending`, la bandeja de subida las ofrecería de vuelta al
   * servidor de donde vinieron. Con volumen real eso son miles de filas de
   * ruido, y una bandeja ruidosa se deja de leer.
   *
   * No confundir con `marcarComoSincronizado()`, que actualiza una fila ya
   * guardada tras subirla. Esta versión evita la segunda escritura.
   */
  private markSynced<T extends { _syncStatus?: string; _lastSyncedAt?: Date }>(row: T): T {
    this.notificarCambioSync();
    return { ...row, _syncStatus: 'synced', _lastSyncedAt: new Date() };
  }

  // ── Notificador de cambios de sync (badge en tiempo real) ─────
  // Se incrementa en cada mutación que afecta el conteo de pendientes.
  // AppComponent escucha esta señal con un effect y refresca el badge
  // del sidebar sin esperar a re-login ni a entrar a /sincronizacion.
  private readonly cambiosSyncSignal = signal(0);
  readonly cambiosSync = this.cambiosSyncSignal.asReadonly();

  private notificarCambioSync(): void {
    this.cambiosSyncSignal.update(n => n + 1);
  }

  // ── Versión de los datos (cachés de estadísticas) ─────────────
  // Distinta de `cambiosSync`: aquella se dispara al MARCAR una fila
  // pendiente, antes de que la escritura termine. Esta se incrementa
  // DESPUÉS de que la escritura se confirmó, así que quien relea al verla
  // cambiar ya encuentra el dato nuevo. Cubre también los borrados y los
  // cierres automáticos, que no pasan por `markPending`.
  //
  // Solo ve las escrituras de esta pestaña: otra pestaña sobre la misma
  // base (quiosco abierto aparte) no la mueve. Por eso las vistas de
  // estadísticas además releen al entrar y al volver a la pestaña.
  private readonly versionDatosSignal = signal(0);
  readonly versionDatos = this.versionDatosSignal.asReadonly();

  private notificarCambioDatos(): void {
    this.versionDatosSignal.update(n => n + 1);
  }

  async crearAlumno(alumno: Omit<Alumno, 'id' | 'fechaRegistro'>): Promise<Alumno> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoAlumno: Alumno = this.markPending({
      ...alumno,
      id: uuidv4(),
      activo: true,
      fechaRegistro: new Date()
    });

    await this.db.add('alumnos', nuevoAlumno);
    this.notificarCambioDatos();
    log('✅ Alumno creado:', nuevoAlumno.matricula);
    return nuevoAlumno;
  }

  /**
   * Alta de un padrón completo en UNA transacción (v3.62.0): o se guardan
   * todos los alumnos nuevos o ninguno. Antes era un alumno por transacción
   * y un fallo a la mitad dejaba la importación partida.
   *
   * Las matrículas que ya existen se omiten y se cuentan (`duplicados`), así
   * que volver a cargar el mismo archivo sigue siendo seguro. Cualquier otro
   * error aborta la transacción completa y se propaga.
   */
  async crearAlumnosLote(
    lista: Omit<Alumno, 'id' | 'fechaRegistro'>[],
  ): Promise<{ creados: number; duplicados: number }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const tx = this.db.transaction('alumnos', 'readwrite');
    const porMatricula = tx.store.index('by-matricula');
    const vistas = new Set<string>();
    let creados = 0, duplicados = 0;
    try {
      for (const alumno of lista) {
        if (vistas.has(alumno.matricula) || await porMatricula.getKey(alumno.matricula)) {
          duplicados++;
          continue;
        }
        vistas.add(alumno.matricula);
        await tx.store.add(this.markPending({ ...alumno, id: uuidv4(), activo: true, fechaRegistro: new Date() }));
        creados++;
      }
      await tx.done;
    } catch (error) {
      // Deshace lo escrito en esta transacción; si ya se abortó sola, no pasa nada.
      try { tx.abort(); } catch { /* la transacción ya había terminado */ }
      await tx.done.catch(() => undefined);
      throw error;
    }
    if (creados > 0) this.notificarCambioDatos();
    log('✅ Padrón importado:', creados, 'nuevos,', duplicados, 'ya existían');
    return { creados, duplicados };
  }

  async obtenerAlumnoPorId(id: string): Promise<Alumno | undefined> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    return await this.db.get('alumnos', id);
  }

  async obtenerTodosLosAlumnos(): Promise<Alumno[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    return await this.db.getAll('alumnos');
  }

  /**
   * Elimina al alumno **y sus visitas**, en una sola transacción. Devuelve
   * cuántas visitas se borraron.
   *
   * v3.53.0: antes solo borraba el perfil, aunque el diálogo prometía borrar
   * también los registros; las visitas quedaban huérfanas y seguían contando
   * en las estadísticas.
   *
   * `porMatricula` también borra visitas con su matrícula y otro `alumnoId`
   * (llegadas de un respaldo donde la matrícula ya existía). El borrado que
   * llega por la bitácora de otro equipo lo apaga: si el alumno volvió a
   * registrarse después, con id nuevo, sus visitas nuevas no se tocan.
   */
  async eliminarAlumno(id: string, { porMatricula = true } = {}): Promise<number> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const tx = this.db.transaction(['alumnos', 'registros'], 'readwrite');
    const alumnos = tx.objectStore('alumnos');
    const registros = tx.objectStore('registros');
    const alumno = await alumnos.get(id);

    let borrados = 0;
    let cursor = await registros.index('by-alumno').openCursor(id);
    while (cursor) {
      await cursor.delete();
      borrados++;
      cursor = await cursor.continue();
    }
    if (porMatricula && alumno?.matricula) {
      let porMat = await registros.index('by-matricula').openCursor(alumno.matricula);
      while (porMat) {
        await porMat.delete();
        borrados++;
        porMat = await porMat.continue();
      }
    }
    await alumnos.delete(id);
    await tx.done;

    this.notificarCambioDatos();
    log('✅ Alumno eliminado:', id, `(${borrados} visitas)`);
    return borrados;
  }

  // ==================== RESTAURAR POR LOTES (v3.53.0) ====================
  // El import diario en la oficina restauraba fila por fila: un año de datos
  // (50 000 visitas) tardaba 70–120 s en una PC rápida. Aquí todo va en una
  // transacción por store y las escrituras se encadenan sin esperar cada una.

  /**
   * Alumnos: conserva ids; omite matrículas que ya son de OTRO alumno.
   * `combinar` (v3.57.2): si el de aquí se editó después que el del archivo,
   * se queda el de aquí (`conservados`). Reemplazar escribe siempre.
   */
  async restaurarAlumnosLote(
    lista: Alumno[],
    omitirIds: ReadonlySet<string> = new Set(),
    combinar = false,
  ): Promise<{ nuevos: number; actualizados: number; iguales: number; omitidos: number; conservados: number }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const tx = this.db.transaction('alumnos', 'readwrite');
    const existentes = await tx.store.getAll();
    const idPorMatricula = new Map(existentes.map(a => [a.matricula, a.id]));
    const actuales = new Map(existentes.map(a => [a.id, huella(a)]));
    const editadoAqui = new Map(existentes.map(a => [a.id, msEditado(a)]));
    const escrituras: Promise<unknown>[] = [];
    let nuevos = 0, actualizados = 0, iguales = 0, omitidos = 0, conservados = 0;

    for (const alumno of lista) {
      if (!alumno?.id || !alumno.matricula || omitirIds.has(alumno.id)) { omitidos++; continue; }
      const dueno = idPorMatricula.get(alumno.matricula);
      if (dueno && dueno !== alumno.id) { omitidos++; continue; }
      const editadoEn = this.aFecha(alumno.editadoEn);
      const fila: Alumno = {
        ...alumno,
        fechaRegistro: this.aFecha(alumno.fechaRegistro) ?? new Date(),
        ...(editadoEn ? { editadoEn } : {}),
        _syncStatus: 'pending',
        _lastSyncedAt: undefined,
      };
      const previa = actuales.get(alumno.id);
      const h = huella(fila);
      if (previa === h) { iguales++; continue; } // igual que el que ya está: no se reescribe
      if (combinar && previa !== undefined && (editadoAqui.get(alumno.id) ?? 0) > msEditado(fila)) {
        conservados++;
        continue;
      }
      escrituras.push(tx.store.put(fila));
      if (previa === undefined) nuevos++; else actualizados++;
      actuales.set(alumno.id, h);
      idPorMatricula.set(alumno.matricula, alumno.id);
    }

    await Promise.all(escrituras);
    await tx.done;
    if (escrituras.length > 0) {
      this.notificarCambioSync();
      this.notificarCambioDatos();
    }
    return { nuevos, actualizados, iguales, omitidos, conservados };
  }

  /**
   * Registros: conserva id, fechas, salida y motivos. `omitir` filtra los
   * borrados. `combinar`: como en alumnos, gana la edición más reciente.
   */
  async restaurarRegistrosLote(
    lista: Registro[],
    omitir: (r: Registro) => boolean = () => false,
    combinar = false,
  ): Promise<{ nuevos: number; actualizados: number; iguales: number; omitidos: number; conservados: number; errores: string[] }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    // Solo se escribe lo nuevo o lo que cambió: escribir es lo caro (~1 000
    // filas/s con 4 índices) y de un día a otro casi todo llega igual. Un
    // año (50 000 visitas) pasaba de 45–65 s a lo que tarde leerlo.
    const tx = this.db.transaction('registros', 'readwrite');
    const existentes = await tx.store.getAll();
    const actuales = new Map(existentes.map(r => [r.id, huella(r)]));
    const editadoAqui = new Map(existentes.map(r => [r.id, msEditado(r)]));
    const escrituras: Promise<unknown>[] = [];
    const errores: string[] = [];
    let nuevos = 0, actualizados = 0, iguales = 0, omitidos = 0, conservados = 0;

    for (const registro of lista) {
      if (!registro?.id) { errores.push('Registro sin id'); continue; }
      if (omitir(registro)) { omitidos++; continue; }
      const fechaHora = this.aFecha(registro.fechaHora);
      if (!fechaHora) { errores.push(`Registro omitido: ${registro.matricula} (sin fechaHora válida)`); continue; }
      const horaSalida = this.aFecha(registro.horaSalida);
      const editadoEn = this.aFecha(registro.editadoEn);
      const fila: Registro = {
        ...registro,
        fechaHora,
        ...(horaSalida ? { horaSalida } : {}),
        ...(editadoEn ? { editadoEn } : {}),
        _syncStatus: 'pending',
        _lastSyncedAt: undefined,
      };
      const previa = actuales.get(registro.id);
      const h = huella(fila);
      if (previa === h) { iguales++; continue; }
      if (combinar && previa !== undefined && (editadoAqui.get(registro.id) ?? 0) > msEditado(fila)) {
        conservados++;
        continue;
      }
      escrituras.push(tx.store.put(fila));
      if (previa === undefined) nuevos++; else actualizados++;
      actuales.set(registro.id, h);
    }

    await Promise.all(escrituras);
    await tx.done;
    if (escrituras.length > 0) {
      this.notificarCambioSync();
      this.notificarCambioDatos();
    }
    return { nuevos, actualizados, iguales, omitidos, conservados, errores };
  }

  /** Borra visitas por id (borrados que llegan en la bitácora de otro equipo). */
  async eliminarRegistrosPorIds(ids: Iterable<string>): Promise<number> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    const tx = this.db.transaction('registros', 'readwrite');
    let borrados = 0;
    for (const id of ids) {
      if (await tx.store.getKey(id)) {
        await tx.store.delete(id);
        borrados++;
      }
    }
    await tx.done;
    if (borrados > 0) this.notificarCambioDatos();
    return borrados;
  }

  // ==================== REGISTROS ====================

  async crearRegistro(registro: Omit<Registro, 'id' | 'fechaHora' | 'sincronizado'>): Promise<Registro> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoRegistro: Registro = this.markPending({
      ...registro,
      id: uuidv4(),
      fechaHora: new Date(),
      sincronizado: false
    });

    await this.db.add('registros', nuevoRegistro);
    this.notificarCambioDatos();
    log('✅ Registro creado para:', nuevoRegistro.matricula);
    return nuevoRegistro;
  }

  /**
   * v3.59.0: visita anotada en papel y capturada después (Registros →
   * "Agregar visitas a mano"). Como `crearRegistro`, pero con la fecha y la
   * salida que se escribieron, y marcada `capturaManual`.
   */
  async crearRegistroManual(
    registro: Omit<Registro, 'id' | 'sincronizado' | 'capturaManual' | 'duracionMinutos'>,
  ): Promise<Registro> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const salida = registro.horaSalida ? new Date(registro.horaSalida) : undefined;
    const nuevo: Registro = this.markPending({
      ...registro,
      id: uuidv4(),
      fechaHora: new Date(registro.fechaHora),
      ...(salida ? {
        horaSalida: salida,
        duracionMinutos: Math.max(0, Math.round((salida.getTime() - new Date(registro.fechaHora).getTime()) / 60000)),
        salidaEstimada: false,
      } : {}),
      sincronizado: false,
      capturaManual: true,
    });

    await this.db.add('registros', nuevo);
    this.notificarCambioDatos();
    return nuevo;
  }

  // ═══════════════════════════════════════════════
  // RESTAURACIÓN DESDE BACKUP
  // ═══════════════════════════════════════════════
  // `crearAlumno` / `crearRegistro` son para el flujo OPERATIVO: asignan un
  // id nuevo y estampan la fecha actual. Usarlos para restaurar un backup
  // reescribe el historial completo con la fecha de la importación.
  //
  // Estos dos métodos preservan `id` y las fechas originales. Usan `put`
  // (no `add`) a propósito: reimportar el mismo backup sobrescribe en lugar
  // de duplicar. Esa idempotencia es además lo que el sync de Fase 2
  // necesitará de cualquier ruta de escritura.

  /**
   * Convierte a Date lo que venga del JSON de un backup.
   *
   * `JSON.parse` devuelve las fechas como string ISO. Si se guardaran así,
   * se estarían fabricando justo los registros con `fechaHora` string que
   * obligan a `obtenerRegistrosDeHoy()` a mantener el fallback
   * `getAll() + filter` (ver nota en ese método).
   */
  private aFecha(valor: unknown): Date | undefined {
    if (valor == null) return undefined;
    if (valor instanceof Date) return isNaN(valor.getTime()) ? undefined : valor;
    const d = new Date(valor as string);
    return isNaN(d.getTime()) ? undefined : d;
  }

  /**
   * Estado de sync con el que se guarda una fila restaurada.
   *
   * El origen determina el estado correcto y NO es un detalle:
   * - `'backup'` (JSON local) → `pending`: ese dato nunca estuvo en la nube.
   * - `'nube'` (descarga) → `synced`: ya está allá arriba; marcarlo pendiente
   *   haría que la bandeja de subida lo ofreciera de vuelta al servidor del
   *   que acaba de venir.
   */
  private marcarSegunOrigen<T extends { _syncStatus?: string; _lastSyncedAt?: Date }>(
    row: T,
    origen: 'backup' | 'nube',
  ): T {
    return origen === 'nube' ? this.markSynced(row) : this.markPending(row, false);
  }

  /**
   * Restaura un alumno conservando su `id` y su `fechaRegistro`.
   * Devuelve `null` si la matrícula ya pertenece a OTRO alumno — el índice
   * `by-matricula` es único y sobrescribirlo mezclaría dos personas.
   */
  async restaurarAlumno(
    alumno: Alumno,
    origen: 'backup' | 'nube' = 'backup',
  ): Promise<Alumno | null> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const existente = await this.obtenerAlumnoPorMatricula(alumno.matricula);
    if (existente && existente.id !== alumno.id) return null;

    const restaurado: Alumno = this.marcarSegunOrigen({
      ...alumno,
      fechaRegistro: this.aFecha(alumno.fechaRegistro) ?? new Date(),
    }, origen);

    await this.db.put('alumnos', restaurado);
    this.notificarCambioDatos();
    return restaurado;
  }

  /**
   * Restaura un motivo conservando su `id` y su `fechaCreacion`.
   *
   * El `id` importa más aquí que en los otros stores: los registros guardan
   * `motivoId`, así que reasignarlo dejaría huérfano el motivo de cada
   * registro que lo usaba.
   */
  async restaurarMotivo(
    motivo: Motivo,
    origen: 'backup' | 'nube' = 'backup',
  ): Promise<Motivo> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    if (!motivo.id) throw new Error('Motivo sin id: no se puede restaurar');

    const restaurado: Motivo = this.marcarSegunOrigen({
      ...motivo,
      fechaCreacion: this.aFecha(motivo.fechaCreacion) ?? new Date(),
    }, origen);

    await this.db.put('motivos', restaurado);
    this.notificarCambioDatos();
    return restaurado;
  }

  /** Restaura un registro conservando `id`, `fechaHora`, salida y motivos. */
  async restaurarRegistro(
    registro: Registro,
    origen: 'backup' | 'nube' = 'backup',
  ): Promise<Registro> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const fechaHora = this.aFecha(registro.fechaHora);
    if (!fechaHora) throw new Error('Registro sin fechaHora válida');

    const horaSalida = this.aFecha(registro.horaSalida);
    const restaurado: Registro = this.marcarSegunOrigen({
      ...registro,
      fechaHora,
      ...(horaSalida ? { horaSalida } : {}),
    }, origen);

    await this.db.put('registros', restaurado);
    this.notificarCambioDatos();
    return restaurado;
  }

  /**
   * Obtener registros de hoy.
   *
   * NOTA SOBRE ÍNDICES: Usamos getAll + filter como fallback porque IndexedDB
   * almacena las fechas como objetos Date serializados. Para que IDBKeyRange
   * funcione correctamente con fechas, se necesita que TODOS los registros
   * existentes tengan fechaHora como Date nativo (no como string ISO).
   *
   * Si tu base de datos tiene registros antiguos con fechas como string,
   * el IDBKeyRange no los encontrará. Por seguridad, mantenemos getAll +
   * filter que funciona con ambos formatos.
   */
  async obtenerRegistrosDeHoy(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Intentar usar índice primero (más rápido con datos limpios)
    try {
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      const rango = IDBKeyRange.bound(hoy, manana, false, true);
      const registrosIndexados = await this.db.getAllFromIndex('registros', 'by-fecha', rango);

      // Si encontramos resultados con índice, usarlos
      if (registrosIndexados.length > 0) {
        return registrosIndexados;
      }
    } catch {
      // Si falla el índice, continuar con fallback
    }

    // Fallback: getAll + filter (funciona con fechas string e Date)
    const todosLosRegistros = await this.db.getAll('registros');

    return todosLosRegistros.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      fechaRegistro.setHours(0, 0, 0, 0);
      return fechaRegistro.getTime() === hoy.getTime();
    });
  }

  async obtenerTodosLosRegistros(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const registros = await this.db.getAll('registros');
    // Timestamp calculado una vez por registro, no dos Date por comparación:
    // con 120 000 registros el sort bajó de ~370 ms a ~170 ms.
    return registros
      .map(r => ({ t: new Date(r.fechaHora).getTime(), r }))
      .sort((a, b) => b.t - a.t)
      .map(p => p.r);
  }

  async obtenerRegistrosPorFecha(fecha: Date): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const inicio = new Date(fecha);
    inicio.setHours(0, 0, 0, 0);

    const fin = new Date(fecha);
    fin.setHours(23, 59, 59, 999);

    // Intentar usar índice primero
    try {
      const rango = IDBKeyRange.bound(inicio, fin);
      const registrosIndexados = await this.db.getAllFromIndex('registros', 'by-fecha', rango);
      if (registrosIndexados.length > 0) {
        return registrosIndexados;
      }
    } catch {
      // Fallback si el índice falla
    }

    // Fallback: getAll + filter
    const todosLosRegistros = await this.db.getAll('registros');

    return todosLosRegistros.filter(registro => {
      const fechaRegistro = new Date(registro.fechaHora);
      return fechaRegistro >= inicio && fechaRegistro <= fin;
    });
  }

  // ==================== MOTIVOS ====================

  async obtenerMotivosActivos(): Promise<Motivo[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const motivos = await this.db.getAll('motivos');
    return motivos
      .filter(m => m.activo)
      .sort((a, b) => a.orden - b.orden);
  }

  async obtenerMotivoPorId(id: string): Promise<Motivo | undefined> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    return await this.db.get('motivos', id);
  }

  // ==================== ESTADÍSTICAS ====================

  async obtenerEstadisticasHoy(): Promise<{
    totalRegistros: number;
    porCarrera: Map<string, number>;
    porMotivo: Map<string, number>;
  }> {
    const registrosHoy = await this.obtenerRegistrosDeHoy();

    const porCarrera = new Map<string, number>();
    const porMotivo = new Map<string, number>();

    registrosHoy.forEach(registro => {
      const countCarrera = porCarrera.get(registro.carrera) || 0;
      porCarrera.set(registro.carrera, countCarrera + 1);

      const countMotivo = porMotivo.get(registro.motivoNombre) || 0;
      porMotivo.set(registro.motivoNombre, countMotivo + 1);
    });

    return {
      totalRegistros: registrosHoy.length,
      porCarrera,
      porMotivo
    };
  }

  // ==================== UTILIDADES ====================

  /**
   * Borra alumnos, registros y motivos. La bitácora NO se borra a propósito:
   * es justo lo que tiene que sobrevivir a un "borrar todo" para que el
   * coordinador vea que ocurrió.
   */
  async limpiarTodosDatos(): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    await this.db.clear('alumnos');
    await this.db.clear('registros');
    await this.db.clear('motivos');
    this.notificarCambioDatos();

    // Recrear motivos por defecto
    await this.crearMotivosDefault();

    log('✅ Todos los datos han sido limpiados');
  }

  // ==================== BITÁCORA (v3.52.0) ====================
  // Solo agregar y leer: no hay método para borrar eventos sueltos.

  /** Hasta cuántos días atrás busca el cierre automático entradas sin salida. */
  private static readonly VENTANA_CIERRE_DIAS = 7;

  /** Tope de eventos guardados; al pasarlo se descartan los más viejos. */
  private static readonly BITACORA_MAX = 5000;

  async agregarEventoBitacora(evento: EventoBitacora): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    await this.db.put('bitacora', evento);
    await this.recortarBitacora();
  }

  /** Eventos del más reciente al más viejo. */
  async obtenerBitacora(): Promise<EventoBitacora[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    const eventos = await this.db.getAllFromIndex('bitacora', 'by-fecha');
    return eventos.reverse();
  }

  /** Para el respaldo: `put` por id, así que combinar dos veces no duplica. */
  async restaurarEventoBitacora(evento: EventoBitacora): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    if (!evento?.id || !evento.fechaHora || !evento.accion) {
      throw new Error('Evento de bitácora incompleto');
    }
    await this.db.put('bitacora', evento);
  }

  /** Lote del respaldo en una transacción. Devuelve cuántos eventos eran nuevos. */
  async restaurarBitacoraLote(eventos: EventoBitacora[]): Promise<number> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    const tx = this.db.transaction('bitacora', 'readwrite');
    const ids = new Set(await tx.store.getAllKeys());
    const escrituras: Promise<unknown>[] = [];
    let nuevos = 0;
    for (const e of eventos) {
      // Un evento incompleto no invalida el respaldo: se omite.
      if (!e?.id || !e.fechaHora || !e.accion) continue;
      escrituras.push(tx.store.put(e));
      if (!ids.has(e.id)) nuevos++;
      ids.add(e.id);
    }
    await Promise.all(escrituras);
    await tx.done;
    await this.recortarBitacora();
    return nuevos;
  }

  async recortarBitacora(max = DatabaseService.BITACORA_MAX): Promise<void> {
    await this.inicializar();
    if (!this.db) return;
    const total = await this.db.count('bitacora');
    if (total <= max) return;
    const tx = this.db.transaction('bitacora', 'readwrite');
    let cursor = await tx.store.index('by-fecha').openCursor();
    let sobran = total - max;
    while (cursor && sobran > 0) {
      await cursor.delete();
      sobran--;
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  async obtenerConteoTotal(): Promise<{
    alumnos: number;
    registros: number;
    motivos: number;
  }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const [alumnos, registros, motivos] = await Promise.all([
      this.db.count('alumnos'),
      this.db.count('registros'),
      this.db.count('motivos')
    ]);

    return { alumnos, registros, motivos };
  }

  // ==================== GESTIÓN DE ALUMNOS ====================

  /**
   * Obtener registros de un alumno específico por matrícula.
   * Usa el índice by-matricula para búsqueda eficiente.
   */
  async obtenerRegistrosPorAlumno(matricula: string): Promise<Registro[]> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      // Usar índice by-matricula (más eficiente que getAll + filter)
      let registrosDelAlumno: Registro[];

      try {
        registrosDelAlumno = await this.db.getAllFromIndex('registros', 'by-matricula', matricula);
      } catch {
        // Fallback si el índice falla
        const todosRegistros = await this.db.getAll('registros');
        registrosDelAlumno = todosRegistros.filter(r => r.matricula === matricula);
      }

      // Ordenar por fecha descendente
      registrosDelAlumno.sort((a, b) =>
        new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
      );

      log(`📋 Registros del alumno ${matricula}:`, registrosDelAlumno.length);
      return registrosDelAlumno;
    } catch (error) {
      logError('❌ Error al obtener registros del alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener un alumno por su matrícula.
   * Usa el índice by-matricula.
   */
  async obtenerAlumnoPorMatricula(matricula: string): Promise<Alumno | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const alumno = await this.db.getFromIndex('alumnos', 'by-matricula', matricula);

      if (alumno) {
        log('✅ Alumno encontrado:', alumno.matricula);
        return alumno;
      }

      log('⚠️ Alumno no encontrado con matrícula:', matricula);
      return null;
    } catch (error) {
      logError('❌ Error al obtener alumno por matrícula:', error);
      throw error;
    }
  }

  /**
   * Actualizar información de un alumno.
   * Clona el objeto recibido para no mutar el del caller.
   */
  async actualizarAlumno(id: string, alumnoActualizado: Alumno): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const aGuardar: Alumno = this.markPending({ ...alumnoActualizado, id });
      await this.db.put('alumnos', aGuardar);
      this.notificarCambioDatos();

      log('✅ Alumno actualizado exitosamente:', aGuardar.matricula);
    } catch (error) {
      logError('❌ Error al actualizar alumno:', error);
      throw new Error('No se pudo actualizar el alumno');
    }
  }

  /**
   * Desactivar un alumno (soft delete) — atómico vía transacción.
   */
  async desactivarAlumno(id: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const tx = this.db.transaction('alumnos', 'readwrite');
      const store = tx.store;
      const alumno = await store.get(id);

      if (!alumno) {
        await tx.done;
        throw new Error('Alumno no encontrado');
      }

      alumno.activo = false;
      this.marcarPendienteEnSitio(alumno);
      await store.put(alumno);
      await tx.done;
      this.notificarCambioDatos();

      log('✅ Alumno desactivado:', alumno.matricula);
    } catch (error) {
      logError('❌ Error al desactivar alumno:', error);
      throw error;
    }
  }

  /**
   * Reactivar un alumno — atómico vía transacción.
   */
  async reactivarAlumno(id: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const tx = this.db.transaction('alumnos', 'readwrite');
      const store = tx.store;
      const alumno = await store.get(id);

      if (!alumno) {
        await tx.done;
        throw new Error('Alumno no encontrado');
      }

      alumno.activo = true;
      this.marcarPendienteEnSitio(alumno);
      await store.put(alumno);
      await tx.done;
      this.notificarCambioDatos();

      log('✅ Alumno reactivado:', alumno.matricula);
    } catch (error) {
      logError('❌ Error al reactivar alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de un alumno
   */
  async obtenerEstadisticasAlumno(matricula: string): Promise<{
    totalVisitas: number;
    ultimaVisita: Date | null;
    primeraVisita: Date | null;
    motivoMasFrecuente: string;
    visitasPorMotivo: Map<string, number>;
  }> {
    try {
      const registros = await this.obtenerRegistrosPorAlumno(matricula);

      if (registros.length === 0) {
        return {
          totalVisitas: 0,
          ultimaVisita: null,
          primeraVisita: null,
          motivoMasFrecuente: 'N/A',
          visitasPorMotivo: new Map()
        };
      }

      const totalVisitas = registros.length;
      const ultimaVisita = new Date(registros[0].fechaHora);
      const primeraVisita = new Date(registros[registros.length - 1].fechaHora);

      const visitasPorMotivo = new Map<string, number>();
      registros.forEach((registro: Registro) => {
        if (registro.motivoNombre) {
          const count = visitasPorMotivo.get(registro.motivoNombre) || 0;
          visitasPorMotivo.set(registro.motivoNombre, count + 1);
        }
      });

      let motivoMasFrecuente = 'N/A';
      let maxCount = 0;
      visitasPorMotivo.forEach((count, motivo) => {
        if (count > maxCount) {
          maxCount = count;
          motivoMasFrecuente = motivo;
        }
      });

      return {
        totalVisitas,
        ultimaVisita,
        primeraVisita,
        motivoMasFrecuente,
        visitasPorMotivo
      };
    } catch (error) {
      logError('❌ Error al obtener estadísticas del alumno:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los motivos (activos e inactivos)
   */
  async obtenerTodosLosMotivos(): Promise<Motivo[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const motivos = await this.db.getAll('motivos');
    return motivos.sort((a: Motivo, b: Motivo) => a.orden - b.orden);
  }

  /**
   * Crear un nuevo motivo
   */
  async crearMotivo(motivo: Omit<Motivo, 'id'>): Promise<Motivo> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const nuevoMotivo: Motivo = this.markPending({
      ...motivo,
      id: uuidv4(),
      fechaCreacion: new Date()
    });

    await this.db.add('motivos', nuevoMotivo);
    this.notificarCambioDatos();
    log('✅ Motivo creado:', nuevoMotivo.nombre);
    return nuevoMotivo;
  }

  /**
   * Actualizar un motivo existente.
   * Clona el objeto recibido para no mutar el del caller.
   */
  async actualizarMotivo(id: string, motivo: Motivo): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const aGuardar: Motivo = this.markPending({ ...motivo, id });
    await this.db.put('motivos', aGuardar);
    this.notificarCambioDatos();
    log('✅ Motivo actualizado:', aGuardar.nombre);
  }

  /**
   * Eliminar un motivo
   */
  async eliminarMotivo(id: string): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    await this.db.delete('motivos', id);
    this.notificarCambioDatos();
    log('✅ Motivo eliminado:', id);
  }

  // ==================== SYNC METADATA (Fase 2.2) ====================
  //
  // Acceso a las filas según su `_syncStatus`. Usa el índice
  // `by-sync-status` creado en DB_VERSION = 2. Las filas pre-2.2 sin el
  // campo NO aparecen en el índice (intencional: el coordinador ya las
  // subió con el importador one-shot).

  /** Cuenta filas con cada estado de sync por store. */
  async obtenerConteoPendientes(): Promise<{
    alumnos: number;
    registros: number;
    motivos: number;
  }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const range = IDBKeyRange.only('pending');
    const [alumnos, registros, motivos] = await Promise.all([
      this.db.countFromIndex('alumnos', 'by-sync-status', range),
      this.db.countFromIndex('registros', 'by-sync-status', range),
      this.db.countFromIndex('motivos', 'by-sync-status', range),
    ]);
    return { alumnos, registros, motivos };
  }

  /** Lee todas las filas pendientes de un store. */
  async obtenerAlumnosPendientes(): Promise<Alumno[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db.getAllFromIndex('alumnos', 'by-sync-status', IDBKeyRange.only('pending'));
  }

  async obtenerRegistrosPendientes(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db.getAllFromIndex('registros', 'by-sync-status', IDBKeyRange.only('pending'));
  }

  async obtenerMotivosPendientes(): Promise<Motivo[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db.getAllFromIndex('motivos', 'by-sync-status', IDBKeyRange.only('pending'));
  }

  /** Lee las filas descartadas (`rejected`) de un store — para la bandeja
   *  de "descartados" donde el coordinador puede deshacer el descarte. */
  async obtenerAlumnosRechazados(): Promise<Alumno[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db.getAllFromIndex('alumnos', 'by-sync-status', IDBKeyRange.only('rejected'));
  }

  async obtenerRegistrosRechazados(): Promise<Registro[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db.getAllFromIndex('registros', 'by-sync-status', IDBKeyRange.only('rejected'));
  }

  async obtenerMotivosRechazados(): Promise<Motivo[]> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db.getAllFromIndex('motivos', 'by-sync-status', IDBKeyRange.only('rejected'));
  }

  /**
   * Marca una fila como `synced` tras subirla correctamente al backend.
   * El SyncService llama esto en batch después de cada upload exitoso.
   */
  async marcarComoSincronizado(
    store: 'alumnos' | 'registros' | 'motivos',
    id: string,
  ): Promise<void> {
    await this.actualizarEstadoSync(store, id, 'synced');
  }

  /**
   * Marca una fila como `rejected` — el coordinador la excluye del próximo
   * batch de subida. No elimina la fila local (la bandeja decide qué subir,
   * no qué borrar). Si después se vuelve a editar, `markPending` la regresa
   * al estado pendiente.
   */
  async marcarComoRechazado(
    store: 'alumnos' | 'registros' | 'motivos',
    id: string,
  ): Promise<void> {
    await this.actualizarEstadoSync(store, id, 'rejected');
  }

  /**
   * Deshace un descarte: regresa la fila a `pending` para que vuelva a la
   * bandeja de subida. Es la operación inversa de `marcarComoRechazado` —
   * permite al coordinador recuperarse de un clic equivocado.
   */
  async restaurarPendiente(
    store: 'alumnos' | 'registros' | 'motivos',
    id: string,
  ): Promise<void> {
    await this.actualizarEstadoSync(store, id, 'pending');
  }

  /** Helper interno: actualiza `_syncStatus` (+ timestamp si aplica) atómicamente. */
  private async actualizarEstadoSync(
    store: 'alumnos' | 'registros' | 'motivos',
    id: string,
    estado: 'synced' | 'rejected' | 'pending',
  ): Promise<void> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');

    const tx = this.db.transaction(store, 'readwrite');
    const row = await tx.store.get(id);
    if (!row) {
      await tx.done;
      return;
    }
    row._syncStatus = estado;
    if (estado === 'synced') {
      row._lastSyncedAt = new Date();
    }
    await tx.store.put(row);
    await tx.done;
    this.notificarCambioSync();
  }


  // ==================== DETECCIÓN DE DUPLICADOS ====================

  /**
   * Verifica si un alumno tiene un registro reciente (últimos N minutos)
   * que NO tenga hora de salida registrada (sesión abierta).
   *
   * @param matricula - Matrícula del alumno
   * @param minutosUmbral - Minutos hacia atrás para buscar (default: 30)
   * @returns El registro abierto más reciente, o null
   */
  async verificarRegistroReciente(
    matricula: string,
    minutosUmbral = 30
  ): Promise<Registro | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const ahora = new Date();
      const limite = new Date(ahora.getTime() - (minutosUmbral * 60 * 1000));

      // Obtener registros del alumno
      let registrosAlumno: Registro[];

      try {
        registrosAlumno = await this.db.getAllFromIndex('registros', 'by-matricula', matricula);
      } catch {
        const todosRegistros = await this.db.getAll('registros');
        registrosAlumno = todosRegistros.filter(r => r.matricula === matricula);
      }

      // Buscar el registro más reciente dentro del umbral
      let registroMasReciente: Registro | null = null;
      let fechaMasReciente = 0;

      for (const registro of registrosAlumno) {
        const fechaRegistro = new Date(registro.fechaHora);

        if (fechaRegistro >= limite) {
          const timestamp = fechaRegistro.getTime();
          if (timestamp > fechaMasReciente) {
            fechaMasReciente = timestamp;
            registroMasReciente = registro;
          }
        }
      }

      if (registroMasReciente) {
        const minutosTranscurridos = Math.round(
          (ahora.getTime() - fechaMasReciente) / (1000 * 60)
        );
        log(
          `⚠️ Registro reciente para ${matricula}: ` +
          `hace ${minutosTranscurridos} min — ${registroMasReciente.motivoNombre}` +
          (registroMasReciente.horaSalida ? ' (salida ya registrada)' : ' (sin salida)')
        );
      }

      return registroMasReciente;
    } catch (error) {
      logError('❌ Error al verificar registro reciente:', error);
      // No bloquear el flujo — permitir el registro
      return null;
    }
  }

  /**
   * Elimina un registro por id. Usado por el "Deshacer" del scanner.
   */
  async eliminarRegistro(registroId: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');
      await this.db.delete('registros', registroId);
      this.notificarCambioDatos();
    } catch (error) {
      logError('❌ Error al eliminar registro:', error);
      throw error;
    }
  }

  // ==================== EDICIÓN MANUAL ====================

  /**
   * Edita manualmente un registro existente (hora entrada, salida, motivos).
   * Recalcula duracionMinutos si ambas fechas están presentes. Limpia
   * cierreAutomatico al confirmarse manualmente.
   *
   * Atómico: lectura y escritura ocurren en una transacción readwrite.
   */
  async actualizarRegistroManual(
    registroId: string,
    cambios: {
      fechaHora?: Date;
      horaSalida?: Date | null;
      motivoIds?: string[];
      motivoNombres?: string[];
      motivoId?: string;
      motivoNombre?: string;
    }
  ): Promise<Registro> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const tx = this.db.transaction('registros', 'readwrite');
      const store = tx.store;
      const registro = await store.get(registroId);
      if (!registro) {
        await tx.done;
        throw new Error('Registro no encontrado');
      }

      if (cambios.fechaHora) registro.fechaHora = new Date(cambios.fechaHora);

      if (cambios.horaSalida === null) {
        registro.horaSalida = undefined;
        registro.duracionMinutos = undefined;
        registro.salidaEstimada = undefined;
      } else if (cambios.horaSalida) {
        // Alguien escribió la hora de salida a mano: deja de ser estimada.
        registro.horaSalida = new Date(cambios.horaSalida);
        registro.salidaEstimada = false;
      }

      if (registro.horaSalida) {
        const ms = new Date(registro.horaSalida).getTime() - new Date(registro.fechaHora).getTime();
        registro.duracionMinutos = Math.max(0, Math.round(ms / 60000));
        registro.cierreAutomatico = false;
      }

      if (cambios.motivoIds) registro.motivoIds = cambios.motivoIds;
      if (cambios.motivoNombres) registro.motivoNombres = cambios.motivoNombres;
      if (cambios.motivoId) registro.motivoId = cambios.motivoId;
      if (cambios.motivoNombre) registro.motivoNombre = cambios.motivoNombre;

      this.marcarPendienteEnSitio(registro);
      await store.put(registro);
      await tx.done;
      this.notificarCambioDatos();
      return registro;
    } catch (error) {
      logError('❌ Error al actualizar registro:', error);
      throw error;
    }
  }

  // ==================== REGISTRO DE SALIDA ====================

  /**
   * Registra la hora de salida en un registro existente.
   * Calcula automáticamente la duración en minutos.
   *
   * Atómico: lectura y escritura ocurren en una transacción readwrite.
   * Esto previene que dos llamadas concurrentes (p.ej. "Cerrar todas" +
   * scan rápido) sobreescriban la salida.
   *
   * @param registroId - ID del registro a actualizar
   * @returns El registro actualizado con horaSalida y duracionMinutos
   */
  async registrarSalida(registroId: string): Promise<Registro> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const tx = this.db.transaction('registros', 'readwrite');
      const store = tx.store;
      const registro = await store.get(registroId);

      if (!registro) {
        await tx.done;
        throw new Error('Registro no encontrado');
      }

      if (registro.horaSalida) {
        await tx.done;
        throw new Error('Este registro ya tiene hora de salida');
      }

      // Calcular hora de salida y duración
      const ahora = new Date();
      const entrada = new Date(registro.fechaHora);
      const duracionMs = ahora.getTime() - entrada.getTime();
      const duracionMinutos = Math.round(duracionMs / (1000 * 60));

      // Una duración negativa significa que la entrada quedó en el futuro
      // (reloj del equipo mal ajustado, o dato importado de otra máquina).
      // No lanza ni corrige: el registro se guarda tal cual para no perder
      // el dato, pero queda anotado — sin esto, el promedio de permanencia
      // de /estadisticas sale mal y nadie tiene forma de notarlo.
      invariante(
        duracionMinutos >= 0,
        'registros',
        'Duración de visita negativa: la entrada quedó en el futuro',
        { matricula: registro.matricula, duracionMinutos },
      );

      // Actualizar registro + marcar como pending para sync (Fase 2.2)
      registro.horaSalida = ahora;
      registro.duracionMinutos = duracionMinutos;
      registro.salidaEstimada = false;
      this.marcarPendienteEnSitio(registro);

      await store.put(registro);
      await tx.done;
      this.notificarCambioDatos();

      log(
        `✅ Salida registrada para ${registro.matricula}: ` +
        `${duracionMinutos} min de estancia`
      );

      return registro;
    } catch (error) {
      logError('❌ Error al registrar salida:', error);
      throw error;
    }
  }


  // ==================== PRESENCIA EN BIBLIOTECA ====================

  /**
   * Devuelve el registro abierto más reciente del día para un alumno.
   * "Abierto" = sin horaSalida. Usado por el scanner cuando
   * registroSalidaActivo está habilitado.
   */
  async obtenerEntradaAbiertaHoy(matricula: string): Promise<Registro | null> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const inicioHoy = new Date();
      inicioHoy.setHours(0, 0, 0, 0);

      const registros = await this.db.getAllFromIndex('registros', 'by-matricula', matricula);

      const abiertos = registros
        .filter(r => !r.horaSalida && new Date(r.fechaHora) >= inicioHoy)
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());

      return abiertos[0] ?? null;
    } catch (error) {
      logError('❌ Error al buscar entrada abierta:', error);
      return null;
    }
  }

  /**
   * Devuelve todos los registros del día sin hora de salida
   * (excluyendo invitados). Usado por el módulo de Presencia.
   *
   * Estrategia: si el índice by-fecha lanza (datos viejos en string), se
   * cae al fallback de getAll. Si el índice retorna [] sin lanzar, confiamos
   * en el resultado (es genuinamente un día sin actividad) — antes esto
   * disparaba un escaneo completo de la BD.
   */
  async obtenerRegistrosAbiertoHoy(): Promise<Registro[]> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      let registrosHoy: Registro[];
      try {
        const rango = IDBKeyRange.bound(hoy, manana, false, true);
        registrosHoy = await this.db.getAllFromIndex('registros', 'by-fecha', rango);
      } catch {
        // El índice falló (probable: fechas string en datos viejos) → fallback
        const todos = await this.db.getAll('registros');
        registrosHoy = todos.filter(r => new Date(r.fechaHora) >= hoy);
      }

      // Incluye entradas sin salida Y entradas cerradas automáticamente
      // (cierreAutomatico = true) que aún requieren confirmación del personal.
      // Incluye visitantes (INVITADO) para que aparezcan en presencia.
      return registrosHoy
        .filter(r => !r.horaSalida || r.cierreAutomatico === true)
        .sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
    } catch (error) {
      logError('❌ Error al obtener registros abiertos:', error);
      return [];
    }
  }

  /**
   * Cierra automáticamente entradas abiertas más antiguas que `horasUmbral`.
   * Marca cierreAutomatico = true (a menos que `autoConfirmar` sea true) y
   * estima horaSalida como fechaHora + umbral.
   * Retorna la cantidad de entradas cerradas.
   * Si horasUmbral <= 0, no hace nada (feature desactivado).
   *
   * Atómico: el batch ocurre dentro de una sola transacción readwrite.
   *
   * v3.53.0: mira los últimos 7 días, no solo hoy. Antes una entrada de las
   * 21:30 con umbral de 3 h vencía a las 00:30 — ya "mañana" — y quedaba
   * abierta para siempre. Las de días anteriores se cierran ya confirmadas:
   * Presencia solo muestra el día, así que nadie podría revisarlas.
   *
   * @param horasUmbral umbral en horas; si <=0 retorna 0
   * @param autoConfirmar si true, NO marca cierreAutomatico (no requiere revisión)
   */
  async cerrarEntradasAntiguas(horasUmbral: number, autoConfirmar = false): Promise<number> {
    if (horasUmbral <= 0) return 0;
    try {
      await this.inicializar();
      if (!this.db) return 0;

      const limiteMs = horasUmbral * 60 * 60 * 1000;
      const ahora = Date.now();
      const desde = new Date(ahora - DatabaseService.VENTANA_CIERRE_DIAS * 86_400_000);
      const hasta = new Date(ahora - limiteMs);
      if (hasta <= desde) return 0;

      let recientes: Registro[];
      try {
        recientes = await this.db.getAllFromIndex('registros', 'by-fecha', IDBKeyRange.bound(desde, hasta));
      } catch {
        // Índice inservible (fechas string en datos viejos) → fallback.
        const todos = await this.db.getAll('registros');
        recientes = todos.filter(r => {
          const t = new Date(r.fechaHora);
          return t >= desde && t <= hasta;
        });
      }

      const candidatos = recientes.filter(r => !r.horaSalida);
      const inicioHoy = new Date(ahora);
      inicioHoy.setHours(0, 0, 0, 0);

      if (candidatos.length === 0) return 0;

      const tx = this.db.transaction('registros', 'readwrite');
      const store = tx.store;
      let cerrados = 0;

      for (const r of candidatos) {
        const actual = await store.get(r.id);
        if (!actual || actual.horaSalida) continue;
        actual.horaSalida = new Date(new Date(actual.fechaHora).getTime() + limiteMs);
        actual.duracionMinutos = horasUmbral * 60;
        actual.cierreAutomatico = !autoConfirmar && new Date(actual.fechaHora) >= inicioHoy;
        // La salida la inventó el sistema: queda marcada aunque se confirme.
        actual.salidaEstimada = true;
        this.marcarPendienteEnSitio(actual, false);   // automático: no es una edición
        await store.put(actual);
        cerrados++;
      }

      await tx.done;
      this.notificarCambioDatos();

      if (cerrados > 0) {
        log(`🔒 Cierre automático: ${cerrados} entrada(s) cerrada(s) tras ${horasUmbral}h${autoConfirmar ? ' (auto-confirmadas)' : ''}`);
      }
      return cerrados;
    } catch (error) {
      logError('❌ Error en cierre automático:', error);
      return 0;
    }
  }

  /**
   * "Cerrar al final del horario": a cada entrada abierta de los últimos 7
   * días le pone como salida el momento que le tocaba según el horario
   * (`calcularSalida`, normalmente `salidaAlCierre` de horarios.utils), si ya
   * pasó. Recibe la función y no el horario para no acoplar la BD a la
   * configuración.
   *
   * v3.57.0 — antes: solo entradas de HOY (con la PC apagada a la hora de
   * cierre quedaban abiertas para siempre) y salida = el instante de la
   * revisión, no la hora de cierre. Como el cierre por horas, las de días
   * anteriores se cierran ya confirmadas (Presencia solo muestra hoy).
   *
   * @param autoConfirmar si true, NO marca cierreAutomatico
   */
  async cerrarAlFinDelHorario(
    calcularSalida: (entrada: Date) => Date | null,
    autoConfirmar = false,
  ): Promise<number> {
    try {
      await this.inicializar();
      if (!this.db) return 0;

      const ahora = Date.now();
      const desde = new Date(ahora - DatabaseService.VENTANA_CIERRE_DIAS * 86_400_000);
      let recientes: Registro[];
      try {
        recientes = await this.db.getAllFromIndex('registros', 'by-fecha', IDBKeyRange.lowerBound(desde));
      } catch {
        const todos = await this.db.getAll('registros');
        recientes = todos.filter(r => new Date(r.fechaHora) >= desde);
      }
      // Invitados incluidos: también cuentan en el aforo.
      const candidatos = recientes.filter(r => !r.horaSalida);
      if (candidatos.length === 0) return 0;

      const inicioHoy = new Date(ahora);
      inicioHoy.setHours(0, 0, 0, 0);
      const tx = this.db.transaction('registros', 'readwrite');
      const store = tx.store;
      let cerrados = 0;

      for (const r of candidatos) {
        const actual = await store.get(r.id);
        if (!actual || actual.horaSalida) continue;
        const entrada = new Date(actual.fechaHora);
        const salida = calcularSalida(entrada);
        if (!salida) continue;
        actual.horaSalida = salida;
        actual.duracionMinutos = Math.max(0, Math.round((salida.getTime() - entrada.getTime()) / 60000));
        actual.cierreAutomatico = !autoConfirmar && entrada >= inicioHoy;
        actual.salidaEstimada = true;
        this.marcarPendienteEnSitio(actual, false);   // automático: no es una edición
        await store.put(actual);
        cerrados++;
      }

      await tx.done;
      if (cerrados > 0) {
        this.notificarCambioDatos();
        log(`🔒 Cierre por horario: ${cerrados} entrada(s) cerrada(s)${autoConfirmar ? ' (auto-confirmadas)' : ''}`);
      }
      return cerrados;
    } catch (error) {
      logError('❌ Error en cierre por horario:', error);
      return 0;
    }
  }

  /**
   * Confirma un cierre automático: el personal revisó y acepta la salida estimada.
   * Quita el flag cierreAutomatico para que desaparezca de la vista de Presencia.
   *
   * Atómico vía transacción.
   */
  async confirmarCierreAutomatico(registroId: string): Promise<void> {
    try {
      await this.inicializar();
      if (!this.db) return;

      const tx = this.db.transaction('registros', 'readwrite');
      const store = tx.store;
      const r = await store.get(registroId);
      if (r) {
        // Confirmar = "visto". `salidaEstimada` se conserva a propósito.
        r.cierreAutomatico = false;
        this.marcarPendienteEnSitio(r);
        await store.put(r);
      }
      await tx.done;
      this.notificarCambioDatos();
    } catch (error) {
      logError('❌ Error al confirmar cierre automático:', error);
      throw error;
    }
  }

  // ==================== CATÁLOGOS (v3.57.0) ====================

  /**
   * Cuántos alumnos y visitas hay por nombre de carrera, tal como está
   * guardado. La pantalla de Catálogos lo usa para decir qué afecta un cambio.
   */
  async contarPorCarrera(): Promise<Map<string, { alumnos: number; visitas: number }>> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    const conteo = new Map<string, { alumnos: number; visitas: number }>();
    const sumar = (carrera: string | undefined, campo: 'alumnos' | 'visitas') => {
      if (!carrera) return;
      const c = conteo.get(carrera) ?? { alumnos: 0, visitas: 0 };
      c[campo]++;
      conteo.set(carrera, c);
    };
    for (const a of await this.db.getAll('alumnos')) sumar(a.carrera, 'alumnos');
    for (const r of await this.db.getAll('registros')) if (r.matricula !== 'INVITADO') sumar(r.carrera, 'visitas');
    return conteo;
  }

  /**
   * "Corregir el nombre" de una carrera: cambia el texto guardado en los
   * alumnos y en las visitas, en una transacción. Las visitas guardan la
   * carrera como texto (foto del momento), así que sin esto Estadísticas
   * mostraría la carrera vieja y la nueva como dos filas.
   *
   * No estampa `editadoEn` (v3.57.2): la corrección viaja aparte, en la
   * bitácora, y el otro equipo la repite. Si contara como edición, una
   * salida real registrada en la puerta antes de la corrección perdería
   * contra esta versión al combinar.
   */
  async renombrarCarreraEnDatos(viejo: string, nuevo: string): Promise<{ alumnos: number; registros: number }> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    if (!viejo || !nuevo || viejo === nuevo) return { alumnos: 0, registros: 0 };
    const tx = this.db.transaction(['alumnos', 'registros'], 'readwrite');
    const escrituras: Promise<unknown>[] = [];
    let alumnos = 0, registros = 0;
    for (const a of await tx.objectStore('alumnos').getAll()) {
      if (a.carrera !== viejo) continue;
      a.carrera = nuevo;
      this.marcarPendienteEnSitio(a, false);
      escrituras.push(tx.objectStore('alumnos').put(a));
      alumnos++;
    }
    for (const r of await tx.objectStore('registros').getAll()) {
      if (r.carrera !== viejo) continue;
      r.carrera = nuevo;
      this.marcarPendienteEnSitio(r, false);
      escrituras.push(tx.objectStore('registros').put(r));
      registros++;
    }
    await Promise.all(escrituras);
    await tx.done;
    if (alumnos || registros) this.notificarCambioDatos();
    return { alumnos, registros };
  }

  // ==================== ELIMINACIÓN MASIVA ====================

  /**
   * Elimina registros dentro de un rango de fechas.
   * Retorna la cantidad de registros eliminados.
   *
   * @param fechaInicio - Inicio del rango (inclusive)
   * @param fechaFin - Fin del rango (inclusive)
   * @returns Número de registros eliminados
   */
  async eliminarRegistrosPorRango(fechaInicio: Date, fechaFin: Date): Promise<number> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      // Normalizar fechas
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);

      // Obtener todos los registros
      const todosRegistros = await this.db.getAll('registros');

      // Filtrar los que caen dentro del rango
      const registrosAEliminar = todosRegistros.filter(registro => {
        const fecha = new Date(registro.fechaHora);
        return fecha >= inicio && fecha <= fin;
      });

      // Eliminar uno por uno (IndexedDB no tiene DELETE WHERE).
      //
      // Los deletes se lanzan TODOS y se esperan juntos, no en serie. Con
      // `await` dentro del for, cada iteración cede el hilo y la transacción
      // puede auto-cerrarse entre requests (IndexedDB commitea cuando no
      // quedan peticiones pendientes) — además de tardar una eternidad con
      // miles de filas. Encolarlos primero mantiene la transacción viva y
      // convierte N viajes secuenciales en uno solo.
      const tx = this.db.transaction('registros', 'readwrite');
      await Promise.all([
        ...registrosAEliminar.map(registro => tx.store.delete(registro.id)),
        tx.done,
      ]);
      this.notificarCambioDatos();

      log(`🗑️ ${registrosAEliminar.length} registros eliminados (${inicio.toLocaleDateString()} — ${fin.toLocaleDateString()})`);

      return registrosAEliminar.length;
    } catch (error) {
      logError('❌ Error al eliminar registros por rango:', error);
      throw error;
    }
  }

  /**
   * Cuenta registros dentro de un rango de fechas (sin eliminar).
   * Útil para preview antes de eliminar.
   */
  /**
   * Total de registros en la base, sin filtrar.
   *
   * Usa `count()` nativo: no materializa las filas en memoria como
   * `getAll().length`. Sirve para contrastar contra un conteo por rango y
   * explicar la diferencia ("hay 54 en la base, 0 en este rango").
   */
  async contarRegistros(): Promise<number> {
    await this.inicializar();
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db.count('registros');
  }

  async contarRegistrosPorRango(fechaInicio: Date, fechaFin: Date): Promise<number> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);

      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);

      const todosRegistros = await this.db.getAll('registros');

      return todosRegistros.filter(registro => {
        const fecha = new Date(registro.fechaHora);
        return fecha >= inicio && fecha <= fin;
      }).length;
    } catch (error) {
      logError('❌ Error al contar registros:', error);
      return 0;
    }
  }

  /**
   * Suma horas acumuladas de un alumno a partir de `duracionMinutos`.
   * Ignora registros sin duración (entradas sin salida).
   * Si se pasan `desde`/`hasta` filtra por rango (inclusive).
   */
  async obtenerHorasAcumuladas(
    matricula: string,
    desde?: Date,
    hasta?: Date
  ): Promise<{
    totalMinutos: number;
    totalHoras: number;
    visitasConDuracion: number;
    duracionPromedio: number;
  }> {
    try {
      const registros = await this.obtenerRegistrosPorAlumno(matricula);

      const inicio = desde ? new Date(desde) : null;
      if (inicio) inicio.setHours(0, 0, 0, 0);
      const fin = hasta ? new Date(hasta) : null;
      if (fin) fin.setHours(23, 59, 59, 999);

      const conDuracion = registros.filter(r => {
        // Solo salidas reales (P3): las estimadas por el sistema no cuentan.
        if (duracionReal(r) === null) return false;
        const fecha = new Date(r.fechaHora);
        if (inicio && fecha < inicio) return false;
        if (fin && fecha > fin) return false;
        return true;
      });

      const totalMinutos = conDuracion.reduce((acc, r) => acc + (r.duracionMinutos || 0), 0);
      const visitasConDuracion = conDuracion.length;
      const duracionPromedio = visitasConDuracion > 0 ? totalMinutos / visitasConDuracion : 0;

      return {
        totalMinutos,
        totalHoras: totalMinutos / 60,
        visitasConDuracion,
        duracionPromedio,
      };
    } catch (error) {
      logError('❌ Error al calcular horas acumuladas:', error);
      return { totalMinutos: 0, totalHoras: 0, visitasConDuracion: 0, duracionPromedio: 0 };
    }
  }

  /**
   * Devuelve alumnos activos cuya última visita supera `diasUmbral` días
   * (o que nunca han visitado, en cuyo caso `ultimaVisita` es null y
   * `diasSinVenir` es Infinity → ordenados al final como "nunca").
   * Ordenado por `diasSinVenir` descendente.
   */
  async obtenerAlumnosInactivos(diasUmbral: number): Promise<{
    alumno: Alumno;
    ultimaVisita: Date | null;
    diasSinVenir: number;
  }[]> {
    try {
      await this.inicializar();
      if (!this.db) throw new Error('Base de datos no inicializada');

      const alumnos = await this.db.getAll('alumnos');
      const todosRegistros = await this.db.getAll('registros');

      // Definición única del sistema (P1, `estadisticas.utils`): la misma
      // que usa el KPI de Estadísticas. Los que nunca vinieron van al final.
      const { inactivos, nuncaVinieron } = calcularInactividad(alumnos, todosRegistros, diasUmbral);
      const resultado = [...inactivos, ...nuncaVinieron];

      log(`😴 Alumnos inactivos (≥${diasUmbral}d):`, resultado.length);
      return resultado;
    } catch (error) {
      logError('❌ Error al obtener alumnos inactivos:', error);
      return [];
    }
  }
}
