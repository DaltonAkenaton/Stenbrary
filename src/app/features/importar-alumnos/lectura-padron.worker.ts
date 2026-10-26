/// <reference lib="webworker" />
// ╔══════════════════════════════════════════════════════╗
// ║  lectura-padron.worker.ts — Stenbrary v3.62.0        ║
// ║                                                      ║
// ║  Lee el padrón fuera del hilo principal: la pantalla ║
// ║  sigue respondiendo y, si un archivo tarda más de lo ║
// ║  permitido, el componente termina el Worker.         ║
// ╚══════════════════════════════════════════════════════╝

import { leerPadron } from '../../core/utils/lectura-padron.utils';

addEventListener('message', ({ data }: MessageEvent<ArrayBuffer>) => {
  postMessage(leerPadron(data));
});
