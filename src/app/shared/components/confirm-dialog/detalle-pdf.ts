// ╔══════════════════════════════════════════════════════╗
// ║  shared/components/confirm-dialog/detalle-pdf.ts     ║
// ║  Stenbrary v3.55.0 — PDF con miles de visitas        ║
// ║                                                      ║
// ║  Un PDF con la tabla de cada visita de un año son    ║
// ║  ~1 500 páginas y casi un minuto con la pantalla     ║
// ║  congelada (prueba de volumen, 2026-10). Por encima  ║
// ║  del umbral se pregunta; nunca se recorta en         ║
// ║  silencio: quien decide es la coordinadora.          ║
// ╚══════════════════════════════════════════════════════╝

import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

/** A partir de cuántas visitas se pregunta antes de meter la tabla de detalle. */
export const UMBRAL_DETALLE_PDF = 3000;

/** Filas por página que caben, aprox., en la tabla de detalle (carta, 8 pt). */
const FILAS_POR_PAGINA = 40;

/**
 * `'detalle'` = PDF completo, `'resumen'` = sin la tabla de cada visita,
 * `null` = canceló (Esc o clic fuera). Con pocas visitas no pregunta.
 */
export async function elegirDetallePdf(
  dialog: MatDialog,
  visitas: number,
): Promise<'detalle' | 'resumen' | null> {
  if (visitas <= UMBRAL_DETALLE_PDF) return 'detalle';
  const paginas = Math.ceil(visitas / FILAS_POR_PAGINA);
  const ref = dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
    data: {
      titulo: '¿Incluir el detalle de cada visita?',
      mensaje:
        `El periodo tiene ${visitas.toLocaleString('es-MX')} visitas. Con la tabla de detalle el PDF ` +
        `tendrá unas ${paginas.toLocaleString('es-MX')} páginas y puede tardar varios minutos en ` +
        `generarse. El resumen (totales, carreras, actividades, turnos y alumnos frecuentes) cabe en ` +
        `pocas páginas; el detalle completo también se puede sacar en Excel.`,
      variante: 'info',
      icono: 'picture_as_pdf',
      textoConfirmar: 'Incluir detalle',
      textoCancelar: 'Solo resumen',
    },
  });
  const r = await firstValueFrom(ref.afterClosed());
  if (r === true) return 'detalle';
  if (r === false) return 'resumen';
  return null;
}

/**
 * Deja que el navegador pinte el aviso de "Generando…" antes del trabajo
 * síncrono de jsPDF / SheetJS, que bloquea el hilo hasta terminar.
 */
export function cederPintado(): Promise<void> {
  return new Promise(ok => setTimeout(ok, 50));
}
