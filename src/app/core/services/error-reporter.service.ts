// ╔══════════════════════════════════════════════════════╗
// ║  error-reporter.service.ts                           ║
// ║  Stenbrary v3.12.1 — Reporte de errores              ║
// ║                                                      ║
// ║  Envía errores no manejados a un endpoint HTTP       ║
// ║  (Sentry tunnel, Netlify Function, backend propio).  ║
// ║                                                      ║
// ║  Si el endpoint está vacío en environment.ts, es     ║
// ║  no-op total: cero costo de red/bundle.              ║
// ║                                                      ║
// ║  Offline-first: si el POST falla, se encola en       ║
// ║  localStorage y se reintenta al volver online.       ║
// ╚══════════════════════════════════════════════════════╝

import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { leerError } from '../utils/errores.utils';

interface ErrorPayload {
  timestamp: string;
  version: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  dispositivo?: string;
}

const QUEUE_KEY = 'stenbrary-error-queue';
const MAX_QUEUE = 50;

@Injectable({ providedIn: 'root' })
export class ErrorReporterService {
  private get endpoint(): string {
    return environment.errorReporting?.endpoint ?? '';
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.drenarCola());
      // Intento inicial al cargar (en caso de errores encolados entre sesiones).
      if (navigator.onLine) {
        setTimeout(() => this.drenarCola(), 3000);
      }
    }
  }

  report(error: unknown): void {
    if (!this.endpoint) return;

    const payload = this.construirPayload(error);
    this.enviar(payload).catch(() => this.encolar(payload));
  }

  private async enviar(payload: ErrorPayload): Promise<void> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!res.ok) throw new Error(`Reporter HTTP ${res.status}`);
  }

  private encolar(payload: ErrorPayload): void {
    try {
      const cola = this.leerCola();
      cola.push(payload);
      // Cap para no inflar localStorage en fallos sostenidos.
      while (cola.length > MAX_QUEUE) cola.shift();
      localStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
    } catch {
      // localStorage lleno o deshabilitado → ignorar.
    }
  }

  private async drenarCola(): Promise<void> {
    if (!this.endpoint || !navigator.onLine) return;
    const cola = this.leerCola();
    if (cola.length === 0) return;

    const pendientes: ErrorPayload[] = [];
    for (const item of cola) {
      try {
        await this.enviar(item);
      } catch {
        pendientes.push(item);
      }
    }

    try {
      if (pendientes.length === 0) localStorage.removeItem(QUEUE_KEY);
      else localStorage.setItem(QUEUE_KEY, JSON.stringify(pendientes));
    } catch {
      /* noop */
    }
  }

  private leerCola(): ErrorPayload[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as ErrorPayload[]) : [];
    } catch {
      return [];
    }
  }

  private construirPayload(error: unknown): ErrorPayload {
    const { message, stack } = leerError(error);
    return {
      timestamp: new Date().toISOString(),
      version: environment.production ? 'prod' : 'dev',
      message: message || 'Error desconocido',
      stack,
      url: typeof location !== 'undefined' ? location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  }
}
