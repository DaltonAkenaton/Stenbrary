// ╔══════════════════════════════════════════════════════╗
// ║  RUTA: src/app/core/services/index.ts                ║
// ║  Barrel export — v3.6 completo                        ║
// ╚══════════════════════════════════════════════════════╝

export { DatabaseService } from './database.service';
export { ToastService } from './toast.service';
export { LoadingService } from './loading.service';
export { ExportService } from './export.service';
export { BackupService } from './backup.service';
export { PwaUpdateService } from './pwa-update.service';
export { GlobalErrorHandler } from './global-error.handler';
export { ReportService, type TipoReporte, type OpcionesReporte } from './report.service';
export {
  EstadisticasAvanzadasService,
  type TendenciaComparativa,
  type HeatmapData,
  type TopAlumno,
  type Insight,
  type DatosDiarios,
  type DistribucionMotivos,
  type DatosCarrera,
} from './estadisticas-avanzadas.service';