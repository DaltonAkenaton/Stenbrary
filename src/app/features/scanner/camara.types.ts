// ╔══════════════════════════════════════════════════════╗
// ║  camara.types.ts — Stenbrary v3.62.0                 ║
// ║                                                      ║
// ║  Capacidades y restricciones de cámara del estándar  ║
// ║  Media Capture "Image Capture" (zoom, linterna,      ║
// ║  enfoque, exposición) que lib.dom de TypeScript aún  ║
// ║  no declara. Antes el escáner las usaba como `any`.  ║
// ╚══════════════════════════════════════════════════════╝

interface Rango { min?: number; max?: number; step?: number }

export interface CapacidadesCamara extends MediaTrackCapabilities {
  zoom?: Rango;
  torch?: boolean;
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
  exposureCompensation?: Rango;
}

export interface RestriccionCamara extends MediaTrackConstraintSet {
  zoom?: number;
  torch?: boolean;
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
  exposureCompensation?: number;
}

/** Restricciones de video con `advanced` de Image Capture. */
export interface RestriccionesVideo extends MediaTrackConstraints {
  advanced?: RestriccionCamara[];
}

export function capacidades(track: MediaStreamTrack): CapacidadesCamara | undefined {
  return track.getCapabilities?.() as CapacidadesCamara | undefined;
}

export function aplicar(track: MediaStreamTrack, ...advanced: RestriccionCamara[]): Promise<void> {
  return track.applyConstraints({ advanced } as RestriccionesVideo);
}

/** `name` y `message` de un error desconocido (DOMException, Error o lo que sea). */
export function datosError(err: unknown): { name: string; message: string } {
  const e = err as { name?: unknown; message?: unknown } | null;
  return {
    name: typeof e?.name === 'string' ? e.name : '',
    message: typeof e?.message === 'string' ? e.message : '',
  };
}
