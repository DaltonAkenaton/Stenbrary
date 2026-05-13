// ╔══════════════════════════════════════════════════════╗
// ║  configuracion.component.ts                          ║
// ║  Stenbrary v3.9.0 — Configuración completa           ║
// ║                                                      ║
// ║  NUEVO v3.9.0:                                       ║
// ║  - Modo Quiosco (toggle + PIN configurable)          ║
// ║  - Horarios de Operación (editor por día + modo)     ║
// ║  - Animación Celebratoria (toggle + frecuencia)      ║
// ╚══════════════════════════════════════════════════════╝

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { LoadingService } from '../../core/services/loading.service';
import { SoundService } from '../../core/services/sound.service';
import { ConfigService, AforoModo, HorarioModo, HorarioDia, RecordatorioRespaldoModo, CamaraPreferida } from '../../core/services/config.service';
import { DIAS_SEMANA } from '../../core/utils/horarios.utils';
import { ChangelogService } from '../../core/services/changelog.service';
import { PwaUpdateService } from '../../core/services/pwa-update.service';
import {
  BackupService,
  BackupData,
  ResultadoImportacion,
} from '../../core/services/backup.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LimpiezaRegistrosComponent } from './limpieza-registros.component';
import { DatosPruebaComponent } from './datos-prueba.component';
import { SuccessAnimationComponent } from '../../shared/components/success-animation/success-animation.component';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule,
    LimpiezaRegistrosComponent,
    DatosPruebaComponent,
    SuccessAnimationComponent,
  ],
  template: `
    <div class="config-container">

      <!-- ═══ HEADER ═══ -->
      <div class="page-header">
        <div class="header-icon">
          <mat-icon>settings</mat-icon>
        </div>
        <div>
          <h1>Configuración</h1>
          <p class="subtitle">Opciones del sistema, respaldo de datos y herramientas de mantenimiento</p>
        </div>
      </div>

      <!-- ═══ INFO DEL SISTEMA ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>info</mat-icon>
          <h2>Información del Sistema</h2>
        </div>

        @if (!cargandoInfo) {
          <div class="info-grid">
            <div class="info-stat">
              <div class="stat-value cyan">{{ conteoAlumnos }}</div>
              <div class="stat-label">Alumnos registrados</div>
            </div>
            <div class="info-stat">
              <div class="stat-value teal">{{ conteoRegistros }}</div>
              <div class="stat-label">Registros de acceso</div>
            </div>
            <div class="info-stat">
              <div class="stat-value amber">{{ conteoMotivos }}</div>
              <div class="stat-label">Motivos / actividades</div>
            </div>
            <div class="info-stat">
              <div class="stat-value purple">{{ almacenamientoEstimado }}</div>
              <div class="stat-label">Almacenamiento usado</div>
            </div>
          </div>
        }

        @if (motivosDuplicados > 0) {
          <div class="alert-duplicates">
            <mat-icon>warning</mat-icon>
            <span>
              Se detectaron <strong>{{ motivosDuplicados }}</strong> motivos duplicados.
            </span>
            <button class="btn-inline" (click)="limpiarDuplicados()" [disabled]="procesando">
              Limpiar ahora
            </button>
          </div>
        }

        <div class="info-meta">
          <button class="meta-chip meta-chip-link"
                  type="button"
                  (click)="navegar('/novedades')"
                  matTooltip="Ver el historial de cambios y novedades">
            <mat-icon>code</mat-icon>
            Stenbrary v{{ changelogService.versionActualSignal().version }}
            @if (changelogService.hayNovedades()) {
              <span class="meta-chip-dot"></span>
            }
          </button>
          <span class="meta-chip" matTooltip="Los datos se guardan en este dispositivo, sin necesidad de internet">
            <mat-icon>storage</mat-icon>
            Datos guardados localmente
          </span>
          <span class="meta-chip" matTooltip="Funciona sin internet. Instálala en tu dispositivo para acceso rápido">
            <mat-icon>phone_android</mat-icon>
            Funciona sin internet
          </span>
        </div>

        <button class="btn-action btn-restore"
                style="margin-top: 18px;"
                (click)="buscarActualizacion()"
                [disabled]="buscandoActualizacion"
                matTooltip="Consulta al servidor si hay una versión nueva y la instala">
          @if (buscandoActualizacion) {
            <mat-spinner diameter="16"></mat-spinner>
            <span>Buscando...</span>
          } @else {
            <mat-icon>system_update</mat-icon>
            <span>Buscar actualizaciones</span>
          }
        </button>
      </mat-card>

      <!-- ═══ IDENTIDAD DE LA INSTITUCIÓN ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>apartment</mat-icon>
          <h2>Identidad de la Institución</h2>
        </div>
        <p class="section-desc">
          Nombre que aparecerá en los <strong style="color:#E8F4F8">documentos exportados</strong>
          (constancia en PDF, reportes). Déjalo vacío si no quieres mostrar una institución.
        </p>

        <div class="aforo-input-row" style="margin-top: 6px;">
          <label for="nombreInstitucion">Nombre de la institución</label>
          <div class="aforo-stepper" style="max-width: 420px;">
            <input id="nombreInstitucion"
                   type="text"
                   maxlength="80"
                   class="aforo-number-input"
                   style="text-align:left; padding-left: 12px;"
                   [ngModel]="nombreInstitucionBorrador"
                   (ngModelChange)="nombreInstitucionBorrador = $event"
                   (blur)="guardarNombreInstitucion()"
                   (keyup.enter)="guardarNombreInstitucion()"
                   placeholder="Ej: Universidad Autónoma de Tamaulipas">
            @if (nombreInstitucionBorrador) {
              <button type="button"
                      class="stepper-btn"
                      (click)="limpiarNombreInstitucion()"
                      matTooltip="Borrar nombre"
                      matTooltipPosition="above">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>
        </div>

        @if (!configService.nombreInstitucion) {
          <p class="section-hint">
            <mat-icon>info</mat-icon>
            Sin institución configurada — los documentos se generarán sin etiqueta institucional.
          </p>
        } @else {
          <p class="section-hint" style="color: rgba(0,200,215,0.5)">
            <mat-icon>check_circle</mat-icon>
            Actualmente: <strong>{{ configService.nombreInstitucion }}</strong>
          </p>
        }
      </mat-card>

      <!-- ═══ SONIDO DE CONFIRMACIÓN ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>volume_up</mat-icon>
          <h2>Sonido de Confirmación</h2>
        </div>
        <p class="section-desc">
          Reproduce un sonido al registrar accesos y salidas.
          Útil en ambientes ruidosos donde no siempre se ve la pantalla.
        </p>
        <div class="sound-toggle">
          <span class="sound-status">
            {{ soundService.habilitado ? 'Activado' : 'Desactivado' }}
          </span>
          <button class="btn-inline"
            [class.btn-inline-active]="soundService.habilitado"
            (click)="toggleSonido()">
            <mat-icon>{{ soundService.habilitado ? 'volume_up' : 'volume_off' }}</mat-icon>
            {{ soundService.habilitado ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
        <button class="btn-action btn-restore" (click)="probarSonido()">
          <mat-icon>play_arrow</mat-icon>
          <span>Probar sonido</span>
        </button>

        <!-- v3.21: volumen del beep -->
        <div style="margin-top: 16px;">
          <div class="aforo-input-row" style="flex-wrap: wrap;">
            <label for="volumenBeep">Volumen del beep</label>
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 200px;">
              <input id="volumenBeep" type="range" min="0" max="100" step="1"
                     style="flex: 1;"
                     [ngModel]="volumenBeepPct"
                     (ngModelChange)="setVolumenBeepPct($event)">
              <span class="mono" style="min-width: 48px; text-align: right; color: #E8F4F8;">
                {{ volumenBeepPct }}%
              </span>
            </div>
          </div>
        </div>
      </mat-card>

      <!-- ═══ ESCÁNER CUSTOMIZABLE (v3.21) ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>qr_code_scanner</mat-icon>
          <h2>Comportamiento del escáner</h2>
        </div>
        <p class="section-desc">
          Ajusta cómo responde el escáner al detectar credenciales: velocidad, tiempo entre
          escaneos, y si quieres saltar el diálogo de confirmación.
        </p>

        <!-- Velocidad de detección -->
        <div style="margin-top: 6px;">
          <strong style="font-size: .9rem; color:#E8F4F8;">Velocidad de detección</strong>
          <p style="font-size: .82rem; color: rgba(200,230,240,.6); margin: 4px 0 10px;">
            Por defecto está en <strong style="color:#E8F4F8">instantáneo</strong> — el escáner
            intenta detectar la credencial en cada frame de la cámara (lo más rápido posible).
            Solo súbelo si necesitas ahorrar batería en tablets.
          </p>
          <div class="auto-close-options">
            @for (op of opcionesEscanerVelocidad; track op.valor) {
              <button class="auto-close-btn"
                      [class.active]="configService.escanerVelocidadMs === op.valor"
                      (click)="onSetEscanerVelocidad(op.valor, op.etiqueta)">
                {{ op.etiqueta }}
              </button>
            }
          </div>
          <div class="aforo-input-row" style="margin-top: 12px;">
            <label for="velMsInput">Personalizado (ms)</label>
            <div class="aforo-stepper" style="max-width: 220px;">
              <button type="button" class="stepper-btn"
                      (click)="onChangeEscanerVelocidad(configService.escanerVelocidadMs - 10)"
                      matTooltip="Disminuir 10 ms">
                <mat-icon>remove</mat-icon>
              </button>
              <input id="velMsInput" type="number" min="0" step="10"
                     class="aforo-number-input"
                     [ngModel]="configService.escanerVelocidadMs"
                     (ngModelChange)="onChangeEscanerVelocidad($event)">
              <button type="button" class="stepper-btn"
                      (click)="onChangeEscanerVelocidad(configService.escanerVelocidadMs + 10)"
                      matTooltip="Aumentar 10 ms">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Cooldown post-detección -->
        <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(200,230,240,.08);">
          <strong style="font-size: .9rem; color:#E8F4F8;">Espera entre escaneos (cooldown)</strong>
          <p style="font-size: .82rem; color: rgba(200,230,240,.6); margin: 4px 0 10px;">
            Tiempo que el escáner espera tras cada detección antes de aceptar otra.
            Súbelo si los alumnos hacen doble escaneo accidental.
          </p>
          <div class="auto-close-options">
            @for (op of opcionesEscanerCooldown; track op.valor) {
              <button class="auto-close-btn"
                      [class.active]="configService.escanerCooldownMs === op.valor"
                      (click)="onSetEscanerCooldown(op.valor, op.etiqueta)">
                {{ op.etiqueta }}
              </button>
            }
          </div>
          <div class="aforo-input-row" style="margin-top: 12px;">
            <label for="cdMsInput">Personalizado (ms)</label>
            <div class="aforo-stepper" style="max-width: 220px;">
              <button type="button" class="stepper-btn"
                      (click)="onChangeEscanerCooldown(configService.escanerCooldownMs - 100)"
                      [disabled]="configService.escanerCooldownMs <= 0"
                      matTooltip="Disminuir 100 ms">
                <mat-icon>remove</mat-icon>
              </button>
              <input id="cdMsInput" type="number" min="0" step="100"
                     class="aforo-number-input"
                     [ngModel]="configService.escanerCooldownMs"
                     (ngModelChange)="onChangeEscanerCooldown($event)">
              <button type="button" class="stepper-btn"
                      (click)="onChangeEscanerCooldown(configService.escanerCooldownMs + 100)"
                      matTooltip="Aumentar 100 ms">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Saltar confirmación -->
        <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(200,230,240,.08);">
          <strong style="font-size: .9rem; color:#E8F4F8;">Saltar diálogo de confirmación</strong>
          <p style="font-size: .82rem; color: rgba(200,230,240,.6); margin: 4px 0 10px;">
            Si está activado, el escáner procesa la matrícula directamente sin pedirte que confirmes.
            Útil en modo quiosco para acelerar el flujo, pero pierdes el control de errores de lectura.
          </p>
          <div class="sound-toggle">
            <span class="sound-status">{{ configService.escanerSaltarConfirmacion ? 'Activado' : 'Desactivado' }}</span>
            <button class="btn-inline"
                    [class.btn-inline-active]="configService.escanerSaltarConfirmacion"
                    (click)="onToggleEscanerSaltarConfirmacion()">
              <mat-icon>{{ configService.escanerSaltarConfirmacion ? 'toggle_on' : 'toggle_off' }}</mat-icon>
              {{ configService.escanerSaltarConfirmacion ? 'Desactivar' : 'Activar' }}
            </button>
          </div>
        </div>

        <!-- Preferencia de cámara (v3.23) -->
        <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(200,230,240,.08);">
          <strong style="font-size: .9rem; color:#E8F4F8;">Cámara preferida</strong>
          <p style="font-size: .82rem; color: rgba(200,230,240,.6); margin: 4px 0 10px;">
            En móvil/tablet con varias cámaras, elige cuál usar al abrir el escáner.
            Si la cámara elegida no existe, el navegador usa la disponible automáticamente.
          </p>
          <div class="auto-close-options">
            @for (op of opcionesCamara; track op.valor) {
              <button class="auto-close-btn"
                      [class.active]="configService.camaraPreferida === op.valor"
                      (click)="onSetCamaraPreferida(op.valor, op.etiqueta)">
                <mat-icon style="vertical-align: middle; font-size: 18px; height: 18px; width: 18px;">{{ op.icono }}</mat-icon>
                {{ op.etiqueta }}
              </button>
            }
          </div>
        </div>

        <!-- Zoom inicial del scanner (v3.23) -->
        <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(200,230,240,.08);">
          <strong style="font-size: .9rem; color:#E8F4F8;">Zoom inicial del escáner</strong>
          <p style="font-size: .82rem; color: rgba(200,230,240,.6); margin: 4px 0 10px;">
            Nivel de zoom aplicado al abrir el scanner. Por defecto
            <strong style="color:#E8F4F8">100%</strong> (sin zoom). Súbelo si la cámara
            tiene foco fijo y necesitas acercar las credenciales. Se sigue pudiendo
            cambiar manualmente dentro del scanner.
          </p>
          <div class="auto-close-options">
            @for (op of opcionesZoomDefault; track op.valor) {
              <button class="auto-close-btn"
                      [class.active]="zoomDefaultPct === op.valor"
                      (click)="onSetZoomDefault(op.valor, op.etiqueta)">
                {{ op.etiqueta }}
              </button>
            }
          </div>
          <div class="aforo-input-row" style="margin-top: 12px;">
            <label for="zoomDefInput">Personalizado (%)</label>
            <div class="aforo-stepper" style="max-width: 220px;">
              <button type="button" class="stepper-btn"
                      (click)="onChangeZoomDefaultPct(zoomDefaultPct - 10)"
                      [disabled]="zoomDefaultPct <= 100"
                      matTooltip="Disminuir 10%">
                <mat-icon>remove</mat-icon>
              </button>
              <input id="zoomDefInput" type="number" min="100" max="300" step="10"
                     class="aforo-number-input"
                     [ngModel]="zoomDefaultPct"
                     (ngModelChange)="onChangeZoomDefaultPct($event)">
              <button type="button" class="stepper-btn"
                      (click)="onChangeZoomDefaultPct(zoomDefaultPct + 10)"
                      [disabled]="zoomDefaultPct >= 300"
                      matTooltip="Aumentar 10%">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </mat-card>

      <!-- ═══ REGISTRO DE SALIDA ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>sensor_door</mat-icon>
          <h2>Registro de Salida</h2>
        </div>
        <p class="section-desc">
          Activa el módulo <strong style="color:#E8F4F8">En Biblioteca</strong> para llevar un control
          de quién está en la biblioteca en este momento. Cuando está activo, el scanner detectará
          si un alumno ya tiene una entrada abierta y ofrecerá registrar su salida automáticamente.
        </p>
        <div class="sound-toggle">
          <span class="sound-status">
            {{ configService.registroSalidaActivo ? 'Activado' : 'Desactivado' }}
          </span>
          <button class="btn-inline"
            [class.btn-inline-active]="configService.registroSalidaActivo"
            (click)="toggleRegistroSalida()">
            <mat-icon>{{ configService.registroSalidaActivo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
            {{ configService.registroSalidaActivo ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
        @if (!configService.registroSalidaActivo) {
          <p class="section-hint">
            <mat-icon>info</mat-icon>
            Si los alumnos no registran salida con regularidad, desactiva esta opción para evitar datos incompletos.
          </p>
        } @else {
          <p class="section-hint" style="color: rgba(0,200,215,0.5)">
            <mat-icon>check_circle</mat-icon>
            Módulo activo — aparece como "En Biblioteca" en el menú de navegación.
          </p>

          <!-- Cierre automático (solo visible si el módulo está activo) -->
          <div style="margin-top: 20px;">
            <div class="section-header" style="margin-bottom: 10px;">
              <mat-icon>timer_off</mat-icon>
              <h2 style="font-size: 0.95rem;">Cierre automático de entradas</h2>
            </div>
            <p class="section-desc" style="margin-bottom: 12px;">
              Si un alumno no registra salida, el sistema la marcará automáticamente después de este tiempo.
            </p>
            <div class="auto-close-options">
              @for (op of opcionesAutoSalida; track op.valor) {
                <button class="auto-close-btn"
                  [class.active]="configService.horasAutoSalida === op.valor"
                  (click)="setHorasAutoSalida(op.valor)">
                  {{ op.etiqueta }}
                </button>
              }
            </div>
            @if (configService.horasAutoSalida === 0) {
              <p class="section-hint">
                <mat-icon>warning</mat-icon>
                Desactivado — las entradas sin salida permanecerán abiertas indefinidamente.
              </p>
            }

            <!-- v3.21: stepper personalizado para horas (libre) -->
            <div class="aforo-input-row" style="margin-top: 12px;">
              <label for="horasAutoSalidaInput">Horas personalizado</label>
              <div class="aforo-stepper" style="max-width: 260px;">
                <button type="button" class="stepper-btn"
                        (click)="setHorasAutoSalida(configService.horasAutoSalida - 1)"
                        [disabled]="configService.horasAutoSalida <= 0"
                        matTooltip="Disminuir 1 hora">
                  <mat-icon>remove</mat-icon>
                </button>
                <input id="horasAutoSalidaInput" type="number" min="0" step="1"
                       class="aforo-number-input"
                       [ngModel]="configService.horasAutoSalida"
                       (ngModelChange)="setHorasAutoSalida($event)">
                <span style="color: rgba(200,230,240,0.55); padding: 0 8px; font-weight: 600;">h</span>
                <button type="button" class="stepper-btn"
                        (click)="setHorasAutoSalida(configService.horasAutoSalida + 1)"
                        matTooltip="Aumentar 1 hora">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
            </div>

            <!-- v3.21: toggles extendidos -->
            <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: .9rem; color: #E8F4F8;">Confirmar automáticamente</strong>
              <p style="font-size: .82rem; color: rgba(200,230,240,.6); margin: 0;">
                Cuando el sistema cierre una entrada por timeout, no requiere que la revises manualmente en Biblioteca.
              </p>
              <div class="sound-toggle">
                <span class="sound-status">{{ configService.cierreAutoConfirmar ? 'Activado' : 'Desactivado' }}</span>
                <button class="btn-inline"
                        [class.btn-inline-active]="configService.cierreAutoConfirmar"
                        (click)="onToggleCierreAutoConfirmar()">
                  <mat-icon>{{ configService.cierreAutoConfirmar ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                  {{ configService.cierreAutoConfirmar ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </div>

            <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: .9rem; color: #E8F4F8;">Cerrar al final del horario</strong>
              <p style="font-size: .82rem; color: rgba(200,230,240,.6); margin: 0;">
                Al llegar la hora de cierre del horario operativo, cierra TODAS las entradas
                abiertas en lugar de esperar a que pasen las horas configuradas arriba.
                @if (!configService.horarioActivo) {
                  <br><em>Requiere que el "Horario de operación" esté activo.</em>
                }
              </p>
              <div class="sound-toggle">
                <span class="sound-status">{{ configService.cierreAlHorario ? 'Activado' : 'Desactivado' }}</span>
                <button class="btn-inline"
                        [class.btn-inline-active]="configService.cierreAlHorario"
                        [disabled]="!configService.horarioActivo"
                        (click)="onToggleCierreAlHorario()">
                  <mat-icon>{{ configService.cierreAlHorario ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                  {{ configService.cierreAlHorario ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </div>
          </div>
        }
      </mat-card>

      <!-- ═══ CONTROL DE AFORO ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>groups</mat-icon>
          <h2>Control de Aforo</h2>
        </div>
        <p class="section-desc">
          Define la <strong style="color:#E8F4F8">capacidad máxima</strong> del recinto y cómo
          debe reaccionar el sistema cuando se alcance. Útil para cumplir con normas de seguridad
          o aforo permitido.
        </p>

        @if (!configService.registroSalidaActivo) {
          <p class="section-hint">
            <mat-icon>warning</mat-icon>
            Activa primero el <strong>Registro de Salida</strong> arriba — sin él, el sistema
            no sabe quién sigue dentro y el aforo no puede calcularse correctamente.
          </p>
        }

        @if (configService.registroSalidaActivo) {
        <div>
          <!-- Capacidad máxima — stepper personalizado -->
          <div class="aforo-input-row">
            <label for="aforoMax">Capacidad máxima (personas)</label>
            <div class="aforo-stepper">
              <button type="button"
                      class="stepper-btn"
                      (click)="setAforoMaximo(configService.aforoMaximo - 1)"
                      [disabled]="configService.aforoMaximo <= 0"
                      matTooltip="Disminuir"
                      matTooltipPosition="above"
                      aria-label="Disminuir capacidad">
                <mat-icon>remove</mat-icon>
              </button>
              <input id="aforoMax"
                     type="number"
                     min="0"
                     step="1"
                     class="aforo-number-input"
                     [ngModel]="configService.aforoMaximo"
                     (ngModelChange)="setAforoMaximo($event)"
                     placeholder="0">
              <button type="button"
                      class="stepper-btn"
                      (click)="setAforoMaximo(configService.aforoMaximo + 1)"
                      matTooltip="Aumentar"
                      matTooltipPosition="above"
                      aria-label="Aumentar capacidad">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>

          @if (configService.aforoMaximo === 0) {
            <p class="section-hint">
              <mat-icon>info</mat-icon>
              Aforo desactivado — no se aplicará ningún límite.
            </p>
          } @else {
            <p class="section-hint" style="color: rgba(0,200,215,0.5)">
              <mat-icon>check_circle</mat-icon>
              Aforo configurado: <strong>{{ configService.aforoMaximo }}</strong> personas máximo.
            </p>

            <!-- Modo de comportamiento -->
            <div style="margin-top: 18px;">
              <div class="section-header" style="margin-bottom: 10px;">
                <mat-icon>policy</mat-icon>
                <h2 style="font-size: 0.95rem;">Al alcanzar el aforo máximo</h2>
              </div>
              <div class="auto-close-options">
                @for (op of opcionesAforoModo; track op.valor) {
                  <button class="auto-close-btn"
                    [class.active]="configService.aforoModo === op.valor"
                    (click)="setAforoModo(op.valor)"
                    [matTooltip]="op.descripcion"
                    matTooltipPosition="above">
                    {{ op.etiqueta }}
                  </button>
                }
              </div>
              <p class="section-hint">
                <mat-icon>info</mat-icon>
                {{ descripcionModoActual }}
              </p>
            </div>
          }
        </div>
        }
      </mat-card>

      <!-- ═══ MODO QUIOSCO ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>tablet_android</mat-icon>
          <h2>Modo Quiosco</h2>
        </div>
        <p class="section-desc">
          Pensado para una <strong style="color:#E8F4F8">tablet o computadora dedicada</strong> a la
          entrada de la biblioteca. Oculta el menú lateral, la barra superior y la barra inferior
          para dejar solo el scanner y el flujo de registro. El personal podrá salir del modo con
          una <strong>pulsación larga (3 s)</strong> en cualquier área del scanner y el PIN configurado.
        </p>
        <div class="sound-toggle">
          <span class="sound-status">
            {{ configService.modoQuiosco ? 'Activado' : 'Desactivado' }}
          </span>
          <button class="btn-inline"
            [class.btn-inline-active]="configService.modoQuiosco"
            (click)="toggleModoQuiosco()">
            <mat-icon>{{ configService.modoQuiosco ? 'toggle_on' : 'toggle_off' }}</mat-icon>
            {{ configService.modoQuiosco ? 'Desactivar' : 'Activar' }}
          </button>
        </div>

        @if (configService.modoQuiosco) {
          <div style="margin-top: 18px;">
            <div class="aforo-input-row">
              <label for="quioscoPin">PIN de salida (4–6 dígitos)</label>
              <div class="aforo-stepper" style="max-width: 220px;">
                <input id="quioscoPin"
                       type="text"
                       inputmode="numeric"
                       maxlength="6"
                       class="aforo-number-input"
                       [ngModel]="configService.quioscoPin"
                       (ngModelChange)="setQuioscoPin($event)"
                       placeholder="0000">
              </div>
            </div>
            @if (!configService.quioscoPin) {
              <p class="section-hint" style="color:#F5A623;">
                <mat-icon>warning</mat-icon>
                Sin PIN configurado — cualquiera podrá salir del modo quiosco.
              </p>
            } @else {
              <p class="section-hint" style="color: rgba(0,200,215,0.5)">
                <mat-icon>lock</mat-icon>
                PIN activo — pulsación larga + PIN para salir.
              </p>
            }
          </div>
        }
      </mat-card>

      <!-- ═══ HORARIOS DE OPERACIÓN ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>schedule</mat-icon>
          <h2>Horarios de Operación</h2>
        </div>
        <p class="section-desc">
          Define el <strong style="color:#E8F4F8">horario de apertura</strong> de la biblioteca por
          día. Fuera de horario, el scanner mostrará una advertencia o bloqueará el registro según
          el modo elegido. Útil para evitar registros accidentales antes de abrir o después de cerrar.
        </p>
        <div class="sound-toggle">
          <span class="sound-status">
            {{ configService.horarioActivo ? 'Activado' : 'Desactivado' }}
          </span>
          <button class="btn-inline"
            [class.btn-inline-active]="configService.horarioActivo"
            (click)="toggleHorarioActivo()">
            <mat-icon>{{ configService.horarioActivo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
            {{ configService.horarioActivo ? 'Desactivar' : 'Activar' }}
          </button>
        </div>

        @if (configService.horarioActivo) {
        <div style="margin-top: 18px;">
          <!-- Modo de comportamiento -->
          <div class="section-header" style="margin-bottom: 10px;">
            <mat-icon>policy</mat-icon>
            <h2 style="font-size: 0.95rem;">Fuera de horario</h2>
          </div>
          <div class="auto-close-options">
            @for (op of opcionesHorarioModo; track op.valor) {
              <button class="auto-close-btn"
                [class.active]="configService.horarioModo === op.valor"
                (click)="setHorarioModo(op.valor)"
                [matTooltip]="op.descripcion"
                matTooltipPosition="above">
                {{ op.etiqueta }}
              </button>
            }
          </div>

          <!-- Editor por día -->
          <div class="section-header" style="margin: 22px 0 10px;">
            <mat-icon>calendar_view_week</mat-icon>
            <h2 style="font-size: 0.95rem;">Horario semanal</h2>
          </div>
          <div class="horarios-grid">
            @for (dia of diasSemana; track dia.indice) {
              <div class="horario-row" [class.cerrado]="configService.horarios[dia.indice].cerrado">
                <div class="horario-dia">{{ dia.nombre }}</div>
                <div class="horario-controls">
                  <button class="btn-inline horario-toggle"
                    [class.btn-inline-active]="!configService.horarios[dia.indice].cerrado"
                    (click)="toggleDiaCerrado(dia.indice)">
                    {{ configService.horarios[dia.indice].cerrado ? 'Cerrado' : 'Abierto' }}
                  </button>
                  <input type="time"
                    class="horario-input"
                    [disabled]="configService.horarios[dia.indice].cerrado"
                    [ngModel]="configService.horarios[dia.indice].apertura"
                    (ngModelChange)="setHorarioCampo(dia.indice, 'apertura', $event)">
                  <span class="horario-sep">→</span>
                  <input type="time"
                    class="horario-input"
                    [disabled]="configService.horarios[dia.indice].cerrado"
                    [ngModel]="configService.horarios[dia.indice].cierre"
                    (ngModelChange)="setHorarioCampo(dia.indice, 'cierre', $event)">
                </div>
              </div>
            }
          </div>
        </div>
        }
      </mat-card>

      <!-- ═══ ANIMACIÓN CELEBRATORIA ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>celebration</mat-icon>
          <h2>Animación celebratoria</h2>
        </div>
        <p class="section-desc">
          Después de un registro exitoso, el sistema puede mostrar una <strong style="color:#E8F4F8">animación
          sorpresa</strong> con confeti — al estilo de los reconocimientos de Microsoft Teams.
          Es opcional y de baja probabilidad para que se sienta especial sin volverse molesta.
        </p>
        <div class="sound-toggle">
          <span class="sound-status">
            {{ configService.celebracionActiva ? 'Activada' : 'Desactivada' }}
          </span>
          <button class="btn-inline"
            [class.btn-inline-active]="configService.celebracionActiva"
            (click)="toggleCelebracion()">
            <mat-icon>{{ configService.celebracionActiva ? 'toggle_on' : 'toggle_off' }}</mat-icon>
            {{ configService.celebracionActiva ? 'Desactivar' : 'Activar' }}
          </button>
        </div>

        @if (configService.celebracionActiva) {
        <div style="margin-top: 18px;">
          <div class="section-header" style="margin-bottom: 10px;">
            <mat-icon>casino</mat-icon>
            <h2 style="font-size: 0.95rem;">Frecuencia</h2>
          </div>

          <!-- Atajos rápidos -->
          <div class="auto-close-options">
            @for (op of opcionesCelebracion; track op.valor) {
              <button class="auto-close-btn"
                [class.active]="celebracionMatch(op.valor)"
                (click)="setCelebracionPorcentaje(op.valor * 100)">
                {{ op.etiqueta }}
              </button>
            }
          </div>

          <!-- Input libre -->
          <div class="aforo-input-row" style="margin-top: 14px;">
            <label for="celebracionPct">Porcentaje personalizado</label>
            <div class="aforo-stepper" style="max-width: 260px;">
              <button type="button"
                      class="stepper-btn"
                      (click)="setCelebracionPorcentaje(porcentajeCelebracion - 1)"
                      [disabled]="porcentajeCelebracion <= 0"
                      matTooltip="Disminuir 1%"
                      matTooltipPosition="above">
                <mat-icon>remove</mat-icon>
              </button>
              <input id="celebracionPct"
                     type="number"
                     min="0"
                     max="100"
                     step="1"
                     class="aforo-number-input"
                     [ngModel]="porcentajeCelebracion"
                     (ngModelChange)="setCelebracionPorcentaje($event)"
                     placeholder="0">
              <span style="color: rgba(200,230,240,0.55); padding: 0 8px; font-weight: 600;">%</span>
              <button type="button"
                      class="stepper-btn"
                      (click)="setCelebracionPorcentaje(porcentajeCelebracion + 1)"
                      [disabled]="porcentajeCelebracion >= 100"
                      matTooltip="Aumentar 1%"
                      matTooltipPosition="above">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>

          <p class="section-hint">
            <mat-icon>info</mat-icon>
            Aproximadamente <strong>{{ porcentajeCelebracion }}%</strong> de los registros mostrarán animación.
            @if (porcentajeCelebracion === 0) {
              (0% = desactivada)
            } @else if (porcentajeCelebracion === 100) {
              (siempre se muestra)
            }
          </p>
        </div>
        }
      </mat-card>

      <!-- ═══ TIEMPO DE PANTALLA DE ÉXITO (v3.20) ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>timer</mat-icon>
          <h2>Tiempo de pantalla de éxito</h2>
        </div>
        <p class="section-desc">
          Cuántos segundos dura la animación de "¡Registro exitoso!" antes de
          volver al scanner. El alumno puede tocar la pantalla en cualquier
          momento para saltar y continuar. Los presets son atajos; el input
          admite cualquier valor.
        </p>

        <div class="auto-close-options">
          @for (op of opcionesTiempoExito; track op.valor) {
            <button class="auto-close-btn"
              [class.active]="configService.tiempoExitoMs === op.valor"
              (click)="setTiempoExito(op.valor)">
              {{ op.etiqueta }}
            </button>
          }
        </div>

        <div class="aforo-input-row" style="margin-top: 14px;">
          <label for="tiempoExito">Segundos personalizados</label>
          <div class="aforo-stepper" style="max-width: 260px;">
            <button type="button"
                    class="stepper-btn"
                    (click)="setTiempoExitoSegundos(tiempoExitoSegundos - 1)"
                    [disabled]="tiempoExitoSegundos <= 1"
                    matTooltip="Disminuir 1 s"
                    matTooltipPosition="above">
              <mat-icon>remove</mat-icon>
            </button>
            <input id="tiempoExito"
                   type="number"
                   min="1"
                   max="60"
                   step="1"
                   class="aforo-number-input"
                   [ngModel]="tiempoExitoSegundos"
                   (ngModelChange)="setTiempoExitoSegundos($event)"
                   placeholder="5">
            <span style="color: rgba(200,230,240,0.55); padding: 0 8px; font-weight: 600;">s</span>
            <button type="button"
                    class="stepper-btn"
                    (click)="setTiempoExitoSegundos(tiempoExitoSegundos + 1)"
                    matTooltip="Aumentar 1 s"
                    matTooltipPosition="above">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        </div>

        <p class="section-hint">
          <mat-icon>info</mat-icon>
          La pantalla durará <strong>{{ tiempoExitoSegundos }} s</strong>.
          @if (tiempoExitoSegundos < 2) {
            (muy corta — el alumno puede no alcanzar a leer)
          } @else if (tiempoExitoSegundos > 10) {
            (larga — útil para modo quiosco con cola de alumnos)
          }
        </p>

        <!-- Preview de animaciones — ver cada tema sin tener que registrar -->
        <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(0, 200, 215, 0.10);">
          <div class="section-header" style="margin-bottom: 10px;">
            <mat-icon>play_circle</mat-icon>
            <h3 style="margin: 0; font-size: 1rem; color: #E8F4F8;">Probar animaciones</h3>
          </div>
          <p class="section-desc" style="margin-bottom: 12px;">
            Hay 8 temas. Toca cualquiera para verlo a pantalla completa
            (igual que lo verá el alumno). Tap en la pantalla cierra el preview.
          </p>
          <div class="auto-close-options" style="flex-wrap: wrap;">
            <button class="auto-close-btn" (click)="abrirPreviewAnimacion()">
              <mat-icon>shuffle</mat-icon>
              Aleatorio
            </button>
            @for (t of temasPreview; track t.id) {
              <button class="auto-close-btn" (click)="abrirPreviewAnimacion(t.id)">
                <span style="font-size: 1.1rem; margin-right: 4px;">{{ t.emoji }}</span>
                {{ t.nombre }}
              </button>
            }
          </div>
        </div>
      </mat-card>

      <!-- Overlay de preview — fullscreen, mismo aspecto que el real -->
      @if (mostrarPreviewAnimacion) {
        <div class="preview-overlay" (click)="cerrarPreviewAnimacion()">
          <app-success-animation [temaForzado]="temaPreview" />
          <div class="preview-hint-tap">
            <mat-icon>touch_app</mat-icon>
            Toca para cerrar
          </div>
        </div>
      }

      <!-- ═══ ALERTAS DE INACTIVIDAD (v3.10.0) ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>notifications_paused</mat-icon>
          <h2>Alertas de inactividad</h2>
        </div>
        <p class="section-desc">
          Define a partir de cuántos días sin venir un alumno se considera
          <strong style="color:#E8F4F8">inactivo</strong>. La lista aparece en
          <a routerLink="/inactivos" style="color:#00C8D7;text-decoration:none;">Consulta → Inactivos</a>.
          Los presets son atajos; el input admite cualquier número.
        </p>

        <div class="auto-close-options">
          @for (op of opcionesUmbralInactividad; track op.valor) {
            <button class="auto-close-btn"
              [class.active]="configService.umbralInactividadDias === op.valor"
              (click)="setUmbralInactividad(op.valor)">
              {{ op.etiqueta }}
            </button>
          }
        </div>

        <div class="aforo-input-row" style="margin-top: 14px;">
          <label for="umbralInactividad">Días personalizados</label>
          <div class="aforo-stepper" style="max-width: 260px;">
            <button type="button"
                    class="stepper-btn"
                    (click)="setUmbralInactividad(configService.umbralInactividadDias - 1)"
                    [disabled]="configService.umbralInactividadDias <= 0"
                    matTooltip="Disminuir 1 día"
                    matTooltipPosition="above">
              <mat-icon>remove</mat-icon>
            </button>
            <input id="umbralInactividad"
                   type="number"
                   min="0"
                   max="3650"
                   step="1"
                   class="aforo-number-input"
                   [ngModel]="configService.umbralInactividadDias"
                   (ngModelChange)="setUmbralInactividad($event)"
                   placeholder="0">
            <span style="color: rgba(200,230,240,0.55); padding: 0 8px; font-weight: 600;">días</span>
            <button type="button"
                    class="stepper-btn"
                    (click)="setUmbralInactividad(configService.umbralInactividadDias + 1)"
                    matTooltip="Aumentar 1 día"
                    matTooltipPosition="above">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        </div>

        <p class="section-hint">
          <mat-icon>info</mat-icon>
          @if (configService.umbralInactividadDias === 0) {
            Las alertas están <strong>desactivadas</strong>. La vista de Inactivos seguirá disponible con umbral ajustable en vivo.
          } @else {
            Alumnos con más de <strong>{{ configService.umbralInactividadDias }} días</strong> sin venir aparecerán en la lista de Inactivos.
          }
        </p>
      </mat-card>

      <!-- ═══ DETECCIÓN DE DUPLICADOS ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>content_copy</mat-icon>
          <h2>
            Detección de duplicados
            <span style="display:inline-flex;align-items:center;vertical-align:middle;margin-left:6px;color:rgba(160,200,215,0.4);cursor:help;"
                  matTooltip="Cuando un alumno escanea su credencial, el sistema verifica si ya tiene un registro reciente. Si hay uno dentro de este tiempo, se pedirá confirmación para evitar entradas accidentales."
                  matTooltipPosition="above">
              <mat-icon style="font-size:15px;width:15px;height:15px;">help_outline</mat-icon>
            </span>
          </h2>
        </div>
        <p class="section-desc">
          Tiempo mínimo entre dos registros del mismo alumno. Si escanea antes de que pase este tiempo,
          el sistema pedirá confirmación para evitar registros accidentales.
        </p>
        <div class="auto-close-options">
          @for (op of opcionesUmbral; track op.valor) {
            <button class="auto-close-btn"
              [class.active]="configService.umbralDuplicadoMin === op.valor"
              (click)="setUmbralDuplicado(op.valor)">
              {{ op.etiqueta }}
            </button>
          }
        </div>
        <p class="section-hint">
          <mat-icon>info</mat-icon>
          Actualmente: {{ configService.umbralDuplicadoMin }} minutos entre registros del mismo alumno.
        </p>
      </mat-card>

      <!-- ═══ RECORDATORIO DE RESPALDO ═══ -->
      <mat-card class="section-card" id="respaldo">
        <div class="section-header">
          <mat-icon>event_repeat</mat-icon>
          <h2>Recordatorio de respaldo</h2>
        </div>
        <p class="section-desc">
          El aviso aparece como una alerta en el <strong style="color:#E8F4F8">Resumen</strong>
          (pantalla principal) con un botón para exportar el respaldo directamente.
          Ajusta cada cuánto quieres recibirlo.
        </p>
        <div class="auto-close-options">
          @for (op of recordatorioRespaldoOpciones; track op.valor) {
            <button class="auto-close-btn"
                    [class.active]="configService.umbralRecordatorioRespaldoDias === op.valor"
                    (click)="setUmbralRecordatorioRespaldo(op.valor)">
              {{ op.etiqueta }}
            </button>
          }
        </div>
        <div class="aforo-input-row" style="margin-top: 14px;">
          <label for="respaldoDias">Días personalizado</label>
          <div class="aforo-stepper" style="max-width: 260px;">
            <button type="button"
                    class="stepper-btn"
                    (click)="setUmbralRecordatorioRespaldo(configService.umbralRecordatorioRespaldoDias - 1)"
                    [disabled]="configService.umbralRecordatorioRespaldoDias <= 0"
                    matTooltip="Disminuir 1 día"
                    matTooltipPosition="above">
              <mat-icon>remove</mat-icon>
            </button>
            <input id="respaldoDias"
                   type="number"
                   min="0"
                   max="3650"
                   step="1"
                   class="aforo-number-input"
                   [ngModel]="configService.umbralRecordatorioRespaldoDias"
                   (ngModelChange)="setUmbralRecordatorioRespaldo($event)"
                   placeholder="0">
            <span style="color: rgba(200,230,240,0.55); padding: 0 8px; font-weight: 600;">días</span>
            <button type="button"
                    class="stepper-btn"
                    (click)="setUmbralRecordatorioRespaldo(configService.umbralRecordatorioRespaldoDias + 1)"
                    matTooltip="Aumentar 1 día"
                    matTooltipPosition="above">
              <mat-icon>add</mat-icon>
            </button>
          </div>
        </div>
        <p class="section-hint">
          <mat-icon>info</mat-icon>
          @if (configService.umbralRecordatorioRespaldoDias === 0) {
            Recordatorio desactivado.
          } @else {
            Si pasan más de
            <strong style="color:#E8F4F8">{{ configService.umbralRecordatorioRespaldoDias }} día(s)</strong>
            sin respaldar, aparecerá una alerta en el
            <strong style="color:#E8F4F8">Resumen</strong> con un botón para exportar.
            @if (diasSinRespaldoTexto()) {
              <br>{{ diasSinRespaldoTexto() }}
            }
          }
        </p>

        <!-- ── MODO PROGRAMADO (v3.21) ── -->
        <div style="margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(200,230,240,.08);">
          <div class="section-header" style="margin-bottom: 6px;">
            <mat-icon>schedule</mat-icon>
            <h2 style="font-size: 0.95rem;">¿Cuándo aparece el aviso?</h2>
          </div>
          <p class="section-desc" style="margin-bottom: 10px;">
            Por defecto el aviso aparece en el Resumen cuando han pasado los días configurados arriba.
            También puedes programarlo para días y hora específicos (ej. cada viernes a las 18:00).
          </p>
          <div class="auto-close-options" style="margin-bottom: 12px;">
            <button class="auto-close-btn"
                    [class.active]="configService.recordatorioRespaldoModo === 'intervalo'"
                    (click)="onSetModoRespaldo('intervalo')">
              Por intervalo (cada N días)
            </button>
            <button class="auto-close-btn"
                    [class.active]="configService.recordatorioRespaldoModo === 'programado'"
                    (click)="onSetModoRespaldo('programado')">
              Programado (día y hora)
            </button>
          </div>

          @if (configService.recordatorioRespaldoModo === 'programado') {
            <div class="aforo-input-row" style="flex-wrap: wrap;">
              <label>Días de la semana</label>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                @for (d of diasSemanaOpciones; track d.valor) {
                  <button class="auto-close-btn"
                          [class.active]="esDiaRespaldoActivo(d.valor)"
                          (click)="onToggleDiaRespaldo(d.valor)">
                    {{ d.etiqueta }}
                  </button>
                }
              </div>
            </div>
            <div style="margin-top: 12px;">
              <label style="font-size: .85rem; color: rgba(200,230,240,.7); display: block; margin-bottom: 6px;">
                Hora del aviso
              </label>
              <div class="auto-close-options" style="margin-bottom: 8px;">
                @for (h of horasRespaldoOpciones; track h) {
                  <button class="auto-close-btn"
                          [class.active]="configService.recordatorioRespaldoHora === h"
                          (click)="onSetHoraRespaldo(h)">
                    {{ h }}
                  </button>
                }
              </div>
              <div class="aforo-input-row">
                <label style="font-size: .78rem; color: rgba(200,230,240,.55);">Otra hora</label>
                <div class="time-picker">
                  <select class="time-select"
                          [ngModel]="respaldoHoraH"
                          (ngModelChange)="setRespaldoHoraH($event)"
                          aria-label="Hora">
                    @for (h of horasNumOpciones; track h) {
                      <option [value]="h">{{ pad2(h) }}</option>
                    }
                  </select>
                  <span class="time-separator">:</span>
                  <select class="time-select"
                          [ngModel]="respaldoHoraM"
                          (ngModelChange)="setRespaldoHoraM($event)"
                          aria-label="Minutos">
                    @for (m of minutosNumOpciones; track m) {
                      <option [value]="m">{{ pad2(m) }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>
            <p class="section-hint">
              <mat-icon>info</mat-icon>
              @if (configService.recordatorioRespaldoDiasSemana.length === 0) {
                Selecciona al menos un día para activar el aviso programado.
              } @else {
                Cada <strong style="color:#E8F4F8">{{ diasSemanaActivosTexto() }}</strong>
                a las <strong style="color:#E8F4F8">{{ configService.recordatorioRespaldoHora }}</strong>
                aparecerá una alerta en el <strong style="color:#E8F4F8">Resumen</strong> con un
                botón para exportar el respaldo. La alerta desaparece sola al exportar el respaldo del día.
              }
            </p>
          }
        </div>
      </mat-card>

      <!-- ═══ BACKUP ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>cloud_download</mat-icon>
          <h2>Guardar una copia de seguridad</h2>
        </div>
        <p class="section-desc">
          Descarga un archivo con <strong>todos los datos del sistema</strong>: alumnos,
          registros de acceso y tipos de actividades.
          Guárdalo en una USB, Google Drive o donde prefieras.
        </p>
        <div class="section-desc-list">
          <span><mat-icon>check_circle</mat-icon> Recomendado hacerlo periódicamente</span>
          <span><mat-icon>check_circle</mat-icon> Si cambias de computadora, usa este archivo para restaurar todo</span>
          <span><mat-icon>check_circle</mat-icon> El archivo se puede abrir con cualquier editor de texto</span>
        </div>
        <button class="btn-action btn-backup"
                (click)="exportarBackup()"
                [disabled]="procesando">
          <mat-icon>download</mat-icon>
          <span>{{ procesando ? 'Generando archivo...' : 'Descargar copia de seguridad' }}</span>
        </button>
        <p class="section-hint">
          <mat-icon>schedule</mat-icon>
          {{ ultimoBackup ? 'Última copia: ' + ultimoBackup : 'Aún no has descargado ninguna copia en esta sesión' }}
        </p>
      </mat-card>

      <!-- ═══ RESTORE ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>cloud_upload</mat-icon>
          <h2>Restaurar desde una copia de seguridad</h2>
        </div>
        <p class="section-desc">
          Si tienes un archivo de copia de seguridad (descargado previamente desde esta misma pantalla),
          puedes cargarlo aquí para recuperar tus datos.
          Los datos nuevos se agregarán <strong>sin borrar los existentes</strong>.
        </p>

        <input type="file" #fileInput accept=".json"
               (change)="onArchivoSeleccionado($event)" style="display: none">

        <div class="restore-actions">
          <button class="btn-action btn-restore"
                  (click)="fileInput.click()"
                  [disabled]="procesando">
            <mat-icon>upload_file</mat-icon>
            <span>Seleccionar archivo de copia de seguridad</span>
          </button>
        </div>

        @if (backupPreview) {
        <div class="restore-preview">
          <div class="preview-header">
            <mat-icon>description</mat-icon>
            <span>{{ nombreArchivoSeleccionado }}</span>
          </div>
          <div class="preview-stats">
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalAlumnos }}</strong> alumnos
            </span>
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalRegistros }}</strong> registros
            </span>
            <span class="preview-stat">
              <strong>{{ backupPreview.meta.totalMotivos }}</strong> motivos
            </span>
            <span class="preview-stat fecha">
              <mat-icon>event</mat-icon>
              {{ formatearFechaBackup(backupPreview.meta.fecha) }}
            </span>
          </div>
          <div class="preview-actions">
            <button class="btn-action btn-merge"
                    (click)="importarBackup('merge')"
                    [disabled]="procesando"
                    matTooltip="Recomendado: agrega los datos del archivo sin borrar lo que ya existe en el sistema">
              <mat-icon>merge_type</mat-icon>
              <span>Combinar (recomendado)</span>
            </button>
            <button class="btn-action btn-replace"
                    (click)="importarBackup('replace')"
                    [disabled]="procesando"
                    matTooltip="⚠️ CUIDADO: Borra TODOS los datos actuales y los reemplaza con los del archivo">
              <mat-icon>swap_horiz</mat-icon>
              <span>Reemplazar todo</span>
            </button>
            <button class="btn-action btn-cancel-preview"
                    (click)="cancelarImportacion()"
                    [disabled]="procesando">
              <mat-icon>close</mat-icon>
              <span>Cancelar</span>
            </button>
          </div>
        </div>
        }

        @if (resultadoImportacion) {
          <div class="import-result"
               [class.success]="resultadoImportacion.exitoso">
            <mat-icon>{{ resultadoImportacion.exitoso ? 'check_circle' : 'error' }}</mat-icon>
            <div class="result-text">
              <strong>{{ resultadoImportacion.exitoso ? 'Importación exitosa' : 'Error en importación' }}</strong>
              @if (resultadoImportacion.exitoso) {
                <span>
                  {{ resultadoImportacion.alumnosImportados }} alumnos,
                  {{ resultadoImportacion.registrosImportados }} registros,
                  {{ resultadoImportacion.motivosImportados }} motivos importados
                  @if (resultadoImportacion.alumnosOmitidos > 0) {
                    <span>· {{ resultadoImportacion.alumnosOmitidos }} alumnos omitidos</span>
                  }
                  @if (resultadoImportacion.motivosOmitidos > 0) {
                    <span>· {{ resultadoImportacion.motivosOmitidos }} motivos omitidos</span>
                  }
                </span>
              }
            </div>
          </div>
        }
      </mat-card>

      <!-- ═══ ELIMINACIÓN MASIVA DE REGISTROS ═══ -->
      <mat-card class="section-card">
        <app-limpieza-registros />
      </mat-card>

      <!-- ═══ DATOS DE PRUEBA ═══ -->
      <mat-card class="section-card">
        <app-datos-prueba (datosCambiaron)="cargarInfo()" />
      </mat-card>

      <!-- ═══ MANTENIMIENTO ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>build</mat-icon>
          <h2>Mantenimiento</h2>
        </div>
        <p class="section-desc">
          Si notas que algunas actividades aparecen repetidas al registrar accesos,
          usa esta herramienta para limpiar duplicados automáticamente.
        </p>
        <div class="maintenance-actions">
          <button class="btn-action btn-maintenance"
                  (click)="limpiarDuplicados()"
                  [disabled]="procesando"
                  matTooltip="Elimina actividades que estén duplicadas en la base de datos">
            <mat-icon>content_copy</mat-icon>
            <span>Limpiar actividades duplicadas</span>
          </button>
        </div>
      </mat-card>

      <!-- ═══ ACCESOS DIRECTOS ═══ -->
      <mat-card class="section-card">
        <div class="section-header">
          <mat-icon>apps</mat-icon>
          <h2>Accesos Directos</h2>
        </div>
        <p class="section-desc">
          Accede rápidamente a otras secciones del sistema desde aquí.
        </p>
        <div class="shortcuts-grid">
          <button class="shortcut-btn" (click)="navegar('/gestion-motivos')">
            <mat-icon>category</mat-icon>
            <div class="shortcut-info">
              <span class="shortcut-title">Gestión de Actividades</span>
              <span class="shortcut-desc">Agregar, editar o eliminar tipos de actividades</span>
            </div>
            <mat-icon class="shortcut-arrow">chevron_right</mat-icon>
          </button>
          <button class="shortcut-btn" (click)="navegar('/importar-alumnos')">
            <mat-icon>upload_file</mat-icon>
            <div class="shortcut-info">
              <span class="shortcut-title">Importar Alumnos</span>
              <span class="shortcut-desc">Cargar alumnos desde un archivo Excel (.xlsx)</span>
            </div>
            <mat-icon class="shortcut-arrow">chevron_right</mat-icon>
          </button>
          <button class="shortcut-btn" (click)="navegar('/estadisticas')">
            <mat-icon>bar_chart</mat-icon>
            <div class="shortcut-info">
              <span class="shortcut-title">Estadísticas Avanzadas</span>
              <span class="shortcut-desc">Gráficas, tendencias y análisis del sistema</span>
            </div>
            <mat-icon class="shortcut-arrow">chevron_right</mat-icon>
          </button>
        </div>
      </mat-card>

      <!-- ═══ ZONA PELIGROSA ═══ -->
      <mat-card class="section-card danger-zone">
        <div class="section-header danger">
          <mat-icon>warning</mat-icon>
          <h2>Zona Peligrosa — Lee antes de usar</h2>
        </div>
        <p class="section-desc">
          Las acciones de esta sección <strong>no se pueden deshacer</strong>.
          Antes de continuar, asegúrate de haber descargado una copia de seguridad arriba.
          Si tienes dudas, contacta al administrador del sistema.
        </p>
        <div class="danger-actions">
          <button class="btn-action btn-danger"
                  (click)="limpiarTodosDatos()"
                  [disabled]="procesando || !DESTRUCCION_HABILITADA"
                  matTooltip="Desactivado por seguridad. Solo el desarrollador puede activar esta función en el código fuente."
                  matTooltipPosition="above">
            <mat-icon>delete_forever</mat-icon>
            <span>Eliminar todos los datos</span>
          </button>
          <p class="danger-note">
            <mat-icon>lock</mat-icon>
            Esta acción está desactivada por seguridad. Para habilitarla, el desarrollador debe cambiar
            <code>DESTRUCCION_HABILITADA</code> a <code>true</code> en el código fuente.
          </p>
        </div>
      </mat-card>

    </div>
  `,
  styles: [`
    .config-container {
      display: flex; flex-direction: column; gap: 24px;
      max-width: 800px; margin: 0 auto; padding: 16px 16px 48px;
    }

    .page-header {
      display: flex; align-items: center; gap: 16px;
      margin-bottom: 12px; padding-top: 4px;
    }

    .header-icon {
      display: flex; align-items: center; justify-content: center;
      width: 52px; height: 52px;
      background: rgba(0, 200, 215, 0.10);
      border: 1px solid rgba(0, 200, 215, 0.25);
      border-radius: 16px; flex-shrink: 0;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #00C8D7; }
    }

    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #E8F4F8; }
    .subtitle { margin: 2px 0 0; font-size: 0.85rem; color: rgba(200, 230, 240, 0.5); }

    .section-card {
      background: #101c2c !important;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 16px; padding: 28px;
    }

    /* align-items:flex-start evita que el icono quede flotando en el centro
       vertical cuando el h2 wrappea a 2 líneas en pantallas chicas. */
    .section-header {
      display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px;
      mat-icon {
        color: #00C8D7; font-size: 22px; width: 22px; height: 22px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      h2 {
        margin: 0; font-size: 1.1rem; font-weight: 700; color: #E8F4F8;
        line-height: 1.3;
        min-width: 0;
      }
      &.danger mat-icon { color: #F05252; }
      &.danger h2 { color: #F05252; }
    }

    .section-desc {
      margin: 0 0 16px; font-size: 0.85rem;
      color: rgba(200, 230, 240, 0.55); line-height: 1.6;
    }

    .section-desc-list {
      display: flex; flex-direction: column; gap: 6px;
      margin: -6px 0 18px;
      /* align-items:flex-start evita que el icono ✓ quede flotando en el
         centro vertical entre líneas cuando el texto wrappea en pantallas
         chicas. flex-shrink:0 en el icono asegura que no se aplaste. */
      span {
        display: flex; align-items: flex-start; gap: 8px;
        font-size: 0.8rem; color: rgba(200, 230, 240, 0.45);
        line-height: 1.5;
        mat-icon {
          font-size: 14px; width: 14px; height: 14px; color: #0BC4B7;
          flex-shrink: 0;
          margin-top: 3px;
        }
      }
    }

    /* IMPORTANTE: NO usar display:flex aquí. Cada <strong> dentro del texto
       se vuelve un flex item separado y en 320px parte el párrafo en
       columnas estrechas. Mejor inline-block con vertical-align baseline. */
    .section-hint {
      margin: 14px 0 0; font-size: 0.78rem;
      color: rgba(200, 230, 240, 0.35); line-height: 1.5;
      mat-icon {
        font-size: 14px; width: 14px; height: 14px;
        vertical-align: middle;
        margin-right: 6px;
        position: relative;
        top: -1px;
      }
    }

    .info-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 20px;
    }

    .info-stat {
      background: #0a1420; border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 12px; padding: 18px 14px; text-align: center;
    }

    .stat-value {
      font-size: 1.8rem; font-weight: 800;
      font-family: 'Space Mono', monospace; line-height: 1; margin-bottom: 6px;
      &.cyan { color: #00C8D7; }
      &.teal { color: #0BC4B7; }
      &.amber { color: #F5A623; }
      &.purple { color: #8B5CF6; }
    }

    .stat-label {
      font-size: 0.72rem; color: rgba(200, 230, 240, 0.45);
      text-transform: uppercase; letter-spacing: 0.04em;
    }

    .alert-duplicates {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; margin-bottom: 16px;
      background: rgba(245, 166, 35, 0.08);
      border: 1px solid rgba(245, 166, 35, 0.2);
      border-radius: 12px; font-size: 0.85rem; color: #F5A623;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
      strong { font-weight: 700; }
    }

    .btn-inline {
      background: rgba(245, 166, 35, 0.15); color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.3); border-radius: 8px;
      padding: 4px 12px; font-size: 0.78rem; font-weight: 600;
      cursor: pointer; white-space: nowrap;
      font-family: 'DM Sans', sans-serif; transition: background 200ms;
      display: inline-flex; align-items: center; gap: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover:not(:disabled) { background: rgba(245, 166, 35, 0.25); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-inline-active {
      background: rgba(0, 200, 215, 0.15); color: #00C8D7;
      border-color: rgba(0, 200, 215, 0.3);
      &:hover:not(:disabled) { background: rgba(0, 200, 215, 0.25); }
    }

    .info-meta { display: flex; gap: 10px; flex-wrap: wrap; }

    .meta-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; background: rgba(0, 200, 215, 0.06);
      border: 1px solid rgba(0, 200, 215, 0.12); border-radius: 20px;
      font-size: 0.72rem; color: rgba(200, 230, 240, 0.6); font-weight: 500;
      mat-icon { font-size: 13px; width: 13px; height: 13px; color: #00C8D7; }
    }

    .meta-chip-link {
      cursor: pointer; font-family: inherit;
      transition: background .2s, border-color .2s, color .2s;
      position: relative;
      &:hover {
        background: rgba(0, 200, 215, 0.14);
        border-color: rgba(0, 200, 215, 0.30);
        color: #E8F4F8;
      }
    }

    .meta-chip-dot {
      width: 7px; height: 7px;
      background: #00C8D7;
      border-radius: 50%;
      margin-left: 4px;
      box-shadow: 0 0 6px rgba(0, 200, 215, 0.7);
      animation: pulse-meta 2s ease-in-out infinite;
    }

    @keyframes pulse-meta {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: .6; transform: scale(1.3); }
    }

    .sound-toggle {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 12px; margin-bottom: 14px;
    }

    .sound-status { font-size: 0.88rem; color: rgba(200, 230, 240, 0.65); }

    .btn-action {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 22px; border: none; border-radius: 12px;
      font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
      font-weight: 600; cursor: pointer; transition: all 200ms;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:disabled { opacity: 0.4; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
      &:hover:not(:disabled) { transform: translateY(-1px); }
    }

    .btn-backup {
      background: linear-gradient(135deg, #00C8D7, #0BC4B7); color: #04090F;
      box-shadow: 0 4px 16px rgba(0, 200, 215, 0.25);
      &:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(0, 200, 215, 0.35); }
    }

    .btn-restore {
      background: rgba(0, 200, 215, 0.10); color: #00C8D7;
      border: 1px solid rgba(0, 200, 215, 0.25);
      &:hover:not(:disabled) { background: rgba(0, 200, 215, 0.18); }
    }

    .btn-merge {
      background: linear-gradient(135deg, #0BC4B7, #0EB07B); color: #04090F;
      box-shadow: 0 4px 12px rgba(11, 196, 183, 0.2);
    }

    .btn-replace {
      background: rgba(245, 166, 35, 0.12); color: #F5A623;
      border: 1px solid rgba(245, 166, 35, 0.3);
    }

    .btn-cancel-preview {
      background: rgba(200, 230, 240, 0.06); color: rgba(200, 230, 240, 0.5);
      border: 1px solid rgba(200, 230, 240, 0.1);
    }

    .btn-maintenance {
      background: rgba(99, 102, 241, 0.10); color: #6366F1;
      border: 1px solid rgba(99, 102, 241, 0.25);
      &:hover:not(:disabled) { background: rgba(99, 102, 241, 0.18); }
    }

    .btn-danger {
      background: rgba(240, 82, 82, 0.10); color: #F05252;
      border: 1px solid rgba(240, 82, 82, 0.25);
      &:hover:not(:disabled) { background: rgba(240, 82, 82, 0.20); }
    }

    .restore-preview {
      margin-top: 20px; padding: 18px; background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.15); border-radius: 12px;
    }

    .preview-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 14px; font-weight: 600; color: #E8F4F8; font-size: 0.9rem;
      mat-icon { color: #00C8D7; }
    }

    .preview-stats {
      display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 18px;
    }

    .preview-stat {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 0.82rem; color: rgba(200, 230, 240, 0.55);
      strong { color: #E8F4F8; }
      &.fecha mat-icon { font-size: 14px; width: 14px; height: 14px; color: rgba(200, 230, 240, 0.35); }
    }

    .preview-actions, .restore-actions, .maintenance-actions, .danger-actions {
      display: flex; gap: 10px; flex-wrap: wrap;
    }

    /* ── Accesos directos ── */
    .shortcuts-grid {
      display: flex; flex-direction: column; gap: 8px;
    }
    .shortcut-btn {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 12px; cursor: pointer; text-align: left; width: 100%;
      transition: all 150ms; font-family: inherit;
      & > mat-icon:first-child { color: #00C8D7; font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; }
      &:hover { border-color: rgba(0, 200, 215, 0.25); background: rgba(0, 200, 215, 0.04); }
    }
    .shortcut-info {
      flex: 1; display: flex; flex-direction: column; gap: 2px;
    }
    .shortcut-title {
      font-size: 0.88rem; font-weight: 600; color: #E8F4F8;
    }
    .shortcut-desc {
      font-size: 0.75rem; color: rgba(160, 200, 215, 0.5);
    }
    .shortcut-arrow {
      color: rgba(160, 200, 215, 0.25) !important;
      font-size: 18px !important; width: 18px !important; height: 18px !important;
    }

    .danger-note {
      display: flex; align-items: flex-start; gap: 6px;
      font-size: 0.78rem; color: rgba(160, 200, 215, 0.45);
      line-height: 1.5; margin-top: 4px; width: 100%;
      mat-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; margin-top: 2px; }
      code { font-family: 'Space Mono', monospace; font-size: 0.72rem; color: rgba(0, 200, 215, 0.55); }
    }

    .import-result {
      display: flex; align-items: flex-start; gap: 10px;
      margin-top: 18px; padding: 14px 16px;
      background: rgba(240, 82, 82, 0.08);
      border: 1px solid rgba(240, 82, 82, 0.2);
      border-radius: 12px; color: #F05252;
      &.success { background: rgba(11, 196, 183, 0.08); border-color: rgba(11, 196, 183, 0.2); color: #0BC4B7; }
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
      .result-text { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; line-height: 1.4; }
    }

    .danger-zone { border-color: rgba(240, 82, 82, 0.15); }

    .auto-close-options {
      display: flex; gap: 8px; flex-wrap: wrap;
    }

    .auto-close-btn {
      padding: 7px 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      color: rgba(200,230,240,0.55);
      font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600;
      cursor: pointer; transition: all 150ms;
      &:hover { background: rgba(0,200,215,0.08); color: #00C8D7; border-color: rgba(0,200,215,0.2); }
      &.active {
        background: rgba(0,200,215,0.15); color: #00C8D7;
        border-color: rgba(0,200,215,0.35);
      }
    }

    @media (max-width: 768px) {
      .info-grid { grid-template-columns: repeat(2, 1fr); }
      .preview-actions { flex-direction: column; }
      .section-card { padding: 20px; }
    }

    @media (max-width: 480px) {
      .info-grid { grid-template-columns: 1fr 1fr; }
      .alert-duplicates { flex-wrap: wrap; }
    }

    /* En pantallas extra-chicas (≤360px, ej. iPhone 5/SE 1ra gen, Xiaomi
       Redmi en zoom): 1 columna y números más chicos para que "879.1 MB"
       no rompa en dos líneas dentro de la card. */
    @media (max-width: 360px) {
      .info-grid { grid-template-columns: 1fr; gap: 10px; }
      .info-stat { padding: 14px 12px; }
      .stat-value { font-size: 1.5rem; }
      .section-card { padding: 16px; }
    }

    /* ─── AFORO ─── */
    .aforo-input-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 14px; padding: 12px 16px; background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.08); border-radius: 10px;

      label {
        font-size: 0.9rem; color: #E8F4F8; font-weight: 500;
      }
    }

    /* Stepper personalizado: [−] [input] [+] */
    .aforo-stepper {
      display: inline-flex;
      align-items: stretch;
      background: #142033;
      border: 1px solid rgba(0, 200, 215, 0.22);
      border-radius: 10px;
      overflow: hidden;
      transition: border-color .2s, box-shadow .2s;

      &:focus-within {
        border-color: rgba(0, 200, 215, 0.55);
        box-shadow: 0 0 0 3px rgba(0, 200, 215, 0.10);
      }
    }

    .stepper-btn {
      display: flex; align-items: center; justify-content: center;
      width: 38px;
      background: rgba(0, 200, 215, 0.06);
      color: #00C8D7;
      border: none;
      cursor: pointer;
      transition: background .15s, color .15s;

      mat-icon {
        font-size: 18px; width: 18px; height: 18px;
      }

      &:hover:not(:disabled) {
        background: rgba(0, 200, 215, 0.18);
      }
      &:active:not(:disabled) {
        background: rgba(0, 200, 215, 0.28);
      }
      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      &:first-child {
        border-right: 1px solid rgba(0, 200, 215, 0.15);
      }
      &:last-child {
        border-left: 1px solid rgba(0, 200, 215, 0.15);
      }
    }

    .aforo-number-input {
      width: 80px;
      padding: 10px 8px;
      background: transparent;
      color: #E8F4F8;
      border: none;
      font-size: 1.05rem;
      font-weight: 700;
      text-align: center;
      font-family: inherit;
      -moz-appearance: textfield;

      &:focus { outline: none; }

      /* Ocultar flechas nativas — usamos los botones custom */
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
    }

    /* Selector de hora (HH : MM) consistente con el tema oscuro */
    .time-picker {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.18);
      border-radius: 10px;
      padding: 6px 10px;
    }

    .time-select {
      background: transparent;
      color: #E8F4F8;
      border: none;
      font-family: inherit;
      font-size: 1rem;
      font-weight: 700;
      padding: 6px 22px 6px 6px;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%23E8F4F8' d='M0 0l5 6 5-6z'/></svg>");
      background-repeat: no-repeat;
      background-position: right 6px center;
      background-size: 8px;

      &:focus {
        outline: none;
        background-color: rgba(0, 200, 215, 0.06);
      }

      option {
        background: #101c2c;
        color: #E8F4F8;
      }
    }

    .time-separator {
      color: rgba(200, 230, 240, 0.55);
      font-weight: 700;
      font-size: 1.05rem;
    }

    @media (max-width: 480px) {
      .aforo-input-row { flex-direction: column; align-items: stretch; }
      .aforo-stepper { width: 100%; }
      .aforo-number-input { flex: 1; width: auto; }
      .time-picker { align-self: flex-start; }
    }

    /* ── Horarios semanales ── */
    .horarios-grid { display: flex; flex-direction: column; gap: 8px; }
    .horario-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px;
      background: #0a1420;
      border: 1px solid rgba(0, 200, 215, 0.08);
      border-radius: 10px;
      &.cerrado { opacity: 0.55; }
    }
    .horario-dia {
      flex: 0 0 90px;
      font-size: 0.85rem; font-weight: 600; color: #E8F4F8;
    }
    .horario-controls {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1;
    }
    .horario-toggle { min-width: 78px; justify-content: center; }
    .horario-input {
      background: #06101c;
      border: 1px solid rgba(0, 200, 215, 0.18);
      border-radius: 8px;
      padding: 6px 10px;
      color: #E8F4F8;
      font-family: 'Space Mono', monospace;
      font-size: 0.85rem;
      &:disabled { opacity: 0.4; cursor: not-allowed; }
      &:focus { outline: none; border-color: rgba(0, 200, 215, 0.5); }
    }
    .horario-sep { color: rgba(200, 230, 240, 0.35); font-size: 0.85rem; }
    /* Subido de 480 a 768: entre esos rangos los dos time-inputs nativos
       (~110px cada uno) más label-día (90px) más separador no caben en una
       fila, y el resultado era un overflow horizontal apretado. */
    @media (max-width: 768px) {
      .horario-row { flex-direction: column; align-items: flex-start; gap: 8px; }
      .horario-dia { flex: none; }
      .horario-controls { width: 100%; }
    }

    /* ── Preview overlay de animaciones ── */
    .preview-overlay {
      position: fixed;
      inset: 0;
      z-index: 1500;
      display: grid;
      place-items: center;
      cursor: pointer;
      overflow: hidden;
      /* Mismo mesh radial del overlay real para fidelidad visual */
      background:
        radial-gradient(ellipse 60% 50% at 10% 15%,  rgba(0, 200, 215, 0.10) 0%, transparent 65%),
        radial-gradient(ellipse 40% 60% at 90% 80%,  rgba(0, 169, 158, 0.08) 0%, transparent 65%),
        radial-gradient(ellipse 30% 35% at 55% 50%,  rgba(0, 200, 215, 0.04) 0%, transparent 60%),
        #04090F;
      animation: previewFadeIn 200ms ease both;
    }
    .preview-hint-tap {
      position: absolute;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      display: flex; align-items: center; gap: 8px;
      padding: 10px 18px;
      background: rgba(4, 9, 15, 0.55);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 200, 215, 0.20);
      border-radius: 100px;
      color: rgba(200, 230, 240, 0.7);
      font-size: 0.85rem;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    @keyframes previewFadeIn { from { opacity: 0; } to { opacity: 1; } }
  `],
})
export class ConfiguracionComponent implements OnInit {

  // ─── DEVELOPER FLAG ──────────────────────────────────────
  // Para activar el botón "Eliminar todos los datos", cambia
  // el valor a `true` aquí y reconstruye la aplicación.
  readonly DESTRUCCION_HABILITADA = false;

  cargandoInfo = true;
  procesando = false;

  // Info
  conteoAlumnos = 0;
  conteoRegistros = 0;
  conteoMotivos = 0;
  almacenamientoEstimado = '—';
  motivosDuplicados = 0;

  // Backup
  ultimoBackup = '';

  // Restore
  backupPreview: BackupData | null = null;
  nombreArchivoSeleccionado = '';
  resultadoImportacion: ResultadoImportacion | null = null;

  // Identidad: borrador editable (se confirma al blur / Enter).
  nombreInstitucionBorrador = '';

  // Búsqueda manual de actualización PWA
  buscandoActualizacion = false;

  constructor(
    private databaseService: DatabaseService,
    private backupService: BackupService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    public soundService: SoundService,
    public configService: ConfigService,
    public changelogService: ChangelogService,
    private pwaUpdateService: PwaUpdateService,
    private dialog: MatDialog,
    private router: Router,
  ) {
    this.nombreInstitucionBorrador = this.configService.nombreInstitucion;
  }

  async ngOnInit(): Promise<void> {
    await this.cargarInfo();
  }

  // ═══════════════════════════════════════════════
  // IDENTIDAD DE LA INSTITUCIÓN
  // ═══════════════════════════════════════════════

  guardarNombreInstitucion(): void {
    const nuevo = (this.nombreInstitucionBorrador || '').trim();
    if (nuevo === this.configService.nombreInstitucion) return;
    this.configService.setNombreInstitucion(nuevo);
    this.nombreInstitucionBorrador = nuevo;
    this.toastService.success(
      nuevo
        ? 'Nombre de institución actualizado'
        : 'Nombre de institución eliminado',
    );
  }

  limpiarNombreInstitucion(): void {
    this.nombreInstitucionBorrador = '';
    this.guardarNombreInstitucion();
  }

  // ═══════════════════════════════════════════════
  // INFO
  // ═══════════════════════════════════════════════

  async cargarInfo(): Promise<void> {
    try {
      this.cargandoInfo = true;

      const [conteo, duplicados] = await Promise.all([
        this.databaseService.obtenerConteoTotal(),
        this.backupService.contarMotivosDuplicados(),
      ]);

      this.conteoAlumnos = conteo.alumnos;
      this.conteoRegistros = conteo.registros;
      this.conteoMotivos = conteo.motivos;
      this.motivosDuplicados = duplicados;

      await this.estimarAlmacenamiento();

      this.cargandoInfo = false;
    } catch (error) {
      console.error('Error al cargar info:', error);
      this.cargandoInfo = false;
    }
  }

  async buscarActualizacion(): Promise<void> {
    if (this.buscandoActualizacion) return;
    if (!this.pwaUpdateService.habilitado) {
      this.toastService.info('Búsqueda no disponible en modo desarrollo');
      return;
    }
    this.buscandoActualizacion = true;
    try {
      const hay = await this.pwaUpdateService.buscarActualizacionAhora();
      if (hay) {
        this.toastService.success('Nueva versión encontrada — actualizando...');
        setTimeout(() => this.pwaUpdateService.aplicarActualizacion(), 800);
      } else {
        this.toastService.info('Ya tienes la versión más reciente');
        this.buscandoActualizacion = false;
      }
    } catch {
      this.toastService.error('No se pudo verificar actualizaciones');
      this.buscandoActualizacion = false;
    }
  }

  private async estimarAlmacenamiento(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        if (usedMB < 1) {
          this.almacenamientoEstimado = `${Math.round((estimate.usage || 0) / 1024)} KB`;
        } else {
          this.almacenamientoEstimado = `${usedMB.toFixed(1)} MB`;
        }
      } else {
        this.almacenamientoEstimado = 'N/A';
      }
    } catch {
      this.almacenamientoEstimado = 'N/A';
    }
  }

  // ═══════════════════════════════════════════════
  // SONIDO
  // ═══════════════════════════════════════════════

  toggleSonido(): void {
    const nuevo = this.soundService.toggle();
    this.toastService.info(nuevo ? 'Sonido activado' : 'Sonido desactivado');
  }

  probarSonido(): void {
    this.soundService.beepExito();
  }

  // ═══════════════════════════════════════════════
  // REGISTRO DE SALIDA
  // ═══════════════════════════════════════════════

  readonly opcionesAutoSalida = [
    { valor: 0,  etiqueta: 'No cerrar' },
    { valor: 1,  etiqueta: '1 hora'    },
    { valor: 2,  etiqueta: '2 horas'   },
    { valor: 3,  etiqueta: '3 horas'   },
    { valor: 4,  etiqueta: '4 horas'   },
    { valor: 6,  etiqueta: '6 horas'   },
    { valor: 8,  etiqueta: '8 horas'   },
  ];

  setHorasAutoSalida(horas: number): void {
    this.configService.setHorasAutoSalida(horas);
    const etiqueta = this.opcionesAutoSalida.find(o => o.valor === horas)?.etiqueta ?? `${horas}h`;
    this.toastService.info(
      horas === 0
        ? 'Cierre automático desactivado'
        : `Cierre automático configurado a ${etiqueta}`
    );
  }

  toggleRegistroSalida(): void {
    const nuevo = !this.configService.registroSalidaActivo;
    this.configService.setRegistroSalidaActivo(nuevo);
    this.toastService.info(
      nuevo
        ? 'Registro de salida activado — aparece "En Biblioteca" en el menú'
        : 'Registro de salida desactivado'
    );
  }

  // ═══════════════════════════════════════════════
  // ESCÁNER
  // ═══════════════════════════════════════════════

  readonly opcionesUmbral = [
    { valor: 10, etiqueta: '10 min' },
    { valor: 20, etiqueta: '20 min' },
    { valor: 30, etiqueta: '30 min' },
    { valor: 45, etiqueta: '45 min' },
    { valor: 60, etiqueta: '1 hora' },
  ];

  setUmbralDuplicado(minutos: number): void {
    this.configService.setUmbralDuplicadoMin(minutos);
    this.toastService.info(`Umbral de duplicados: ${minutos} minutos`);
  }

  // ═══════════════════════════════════════════════
  // ALERTAS DE INACTIVIDAD (v3.10.0)
  // ═══════════════════════════════════════════════

  readonly opcionesUmbralInactividad = [
    { valor: 7,   etiqueta: '7 días' },
    { valor: 15,  etiqueta: '15 días' },
    { valor: 30,  etiqueta: '30 días' },
    { valor: 60,  etiqueta: '60 días' },
    { valor: 90,  etiqueta: '90 días' },
    { valor: 180, etiqueta: '6 meses' },
  ];

  setUmbralInactividad(dias: number): void {
    const n = Math.max(0, Math.min(3650, Math.floor(dias) || 0));
    this.configService.setUmbralInactividadDias(n);
    if (n === 0) {
      this.toastService.info('Alertas de inactividad desactivadas');
    } else {
      this.toastService.info(`Umbral de inactividad: ${n} días`);
    }
  }

  // ═══════════════════════════════════════════════
  // RECORDATORIO DE RESPALDO (v3.11.0)
  // ═══════════════════════════════════════════════

  readonly recordatorioRespaldoOpciones = [
    { valor: 0,  etiqueta: 'Desactivado' },
    { valor: 7,  etiqueta: '7 días' },
    { valor: 14, etiqueta: '14 días' },
    { valor: 30, etiqueta: '30 días' },
    { valor: 60, etiqueta: '60 días' },
  ];

  setUmbralRecordatorioRespaldo(dias: number): void {
    const n = Math.max(0, Math.min(3650, Math.floor(dias) || 0));
    this.configService.setUmbralRecordatorioRespaldoDias(n);
    if (n === 0) {
      this.toastService.info('Recordatorio de respaldo desactivado');
    } else {
      this.toastService.info(`Recordatorio cada ${n} día(s)`);
    }
  }

  diasSinRespaldoTexto(): string {
    const dias = this.configService.diasSinRespaldo();
    if (dias === null) return 'Aún no se ha hecho ningún respaldo.';
    if (dias === 0) return 'Último respaldo: hoy.';
    if (dias === 1) return 'Último respaldo: hace 1 día.';
    return `Último respaldo: hace ${dias} días.`;
  }

  // ═══════════════════════════════════════════════
  // RECORDATORIO PROGRAMADO (v3.21)
  // ═══════════════════════════════════════════════

  readonly diasSemanaOpciones = [
    { valor: 1, etiqueta: 'L' },
    { valor: 2, etiqueta: 'M' },
    { valor: 3, etiqueta: 'X' },
    { valor: 4, etiqueta: 'J' },
    { valor: 5, etiqueta: 'V' },
    { valor: 6, etiqueta: 'S' },
    { valor: 0, etiqueta: 'D' },
  ];

  readonly horasRespaldoOpciones = ['08:00', '12:00', '14:00', '18:00', '20:00'];

  /** 0..23 para el <select> de hora. */
  readonly horasNumOpciones = Array.from({ length: 24 }, (_, i) => i);
  /** 0..59 — granularidad de 1 minuto (regla de flexibilidad). */
  readonly minutosNumOpciones = Array.from({ length: 60 }, (_, i) => i);

  pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }

  private parseHoraActual(): { h: number; m: number } {
    const m = /^(\d{1,2}):(\d{2})$/.exec(this.configService.recordatorioRespaldoHora || '');
    if (!m) return { h: 9, m: 0 };
    return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  }

  get respaldoHoraH(): number {
    return this.parseHoraActual().h;
  }

  get respaldoHoraM(): number {
    return this.parseHoraActual().m;
  }

  setRespaldoHoraH(h: number | string): void {
    const hn = typeof h === 'string' ? parseInt(h, 10) : h;
    const { m } = this.parseHoraActual();
    this.configService.setRecordatorioRespaldoHora(`${this.pad2(hn)}:${this.pad2(m)}`);
    this.notificarCambioRespaldo();
  }

  setRespaldoHoraM(min: number | string): void {
    const mn = typeof min === 'string' ? parseInt(min, 10) : min;
    const { h } = this.parseHoraActual();
    this.configService.setRecordatorioRespaldoHora(`${this.pad2(h)}:${this.pad2(mn)}`);
    this.notificarCambioRespaldo();
  }

  // ─── Handlers con feedback al coordinador ──────────────

  onSetModoRespaldo(modo: RecordatorioRespaldoModo): void {
    this.configService.setRecordatorioRespaldoModo(modo);
    if (modo === 'programado') {
      const dias = this.configService.recordatorioRespaldoDiasSemana.length;
      if (dias === 0) {
        this.toastService.info('Modo programado activado — selecciona los días del aviso');
      } else {
        this.notificarCambioRespaldo();
      }
    } else {
      const n = this.configService.umbralRecordatorioRespaldoDias;
      this.toastService.success(
        n > 0
          ? `Aviso si pasan ${n} día(s) sin respaldar`
          : 'Modo por intervalo activado',
      );
    }
  }

  onSetHoraRespaldo(hhmm: string): void {
    this.configService.setRecordatorioRespaldoHora(hhmm);
    this.notificarCambioRespaldo();
  }

  onToggleDiaRespaldo(dia: number): void {
    this.configService.toggleRecordatorioRespaldoDia(dia);
    this.notificarCambioRespaldo();
  }

  /** Toast resumen del estado actual del recordatorio programado. */
  private notificarCambioRespaldo(): void {
    if (this.configService.recordatorioRespaldoModo !== 'programado') return;

    const dias = this.configService.recordatorioRespaldoDiasSemana.length;
    if (dias === 0) {
      this.toastService.warning('Aviso desactivado — selecciona al menos un día');
      return;
    }
    const hora = this.configService.recordatorioRespaldoHora;
    this.toastService.success(
      `Aviso programado: ${this.diasSemanaActivosTexto()} a las ${hora}`,
    );
  }

  esDiaRespaldoActivo(dia: number): boolean {
    return this.configService.recordatorioRespaldoDiasSemana.includes(dia);
  }

  diasSemanaActivosTexto(): string {
    const nombres = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
    const dias = [...this.configService.recordatorioRespaldoDiasSemana].sort();
    if (dias.length === 0) return 'ningún día';
    if (dias.length === 7) return 'todos los días';
    return dias.map(d => nombres[d]).join(', ');
  }

  // ═══════════════════════════════════════════════
  // ESCÁNER CUSTOMIZABLE (v3.21)
  // ═══════════════════════════════════════════════

  readonly opcionesEscanerVelocidad = [
    { valor: 0,   etiqueta: 'Instantáneo (recomendado)' },
    { valor: 100, etiqueta: 'Rápido (100 ms)' },
    { valor: 160, etiqueta: 'Normal (160 ms)' },
    { valor: 250, etiqueta: 'Ahorrador (250 ms)' },
  ];

  readonly opcionesEscanerCooldown = [
    { valor: 0,    etiqueta: 'Sin espera' },
    { valor: 800,  etiqueta: '0.8 s' },
    { valor: 1500, etiqueta: '1.5 s' },
    { valor: 3000, etiqueta: '3 s' },
  ];

  // ── Cámara y zoom (v3.23) ──
  readonly opcionesCamara: { valor: CamaraPreferida; etiqueta: string; icono: string }[] = [
    { valor: 'auto',        etiqueta: 'Automática',  icono: 'autorenew' },
    { valor: 'environment', etiqueta: 'Trasera',     icono: 'photo_camera_back' },
    { valor: 'user',        etiqueta: 'Frontal',     icono: 'photo_camera_front' },
  ];

  readonly opcionesZoomDefault = [
    { valor: 100, etiqueta: '100% (sin zoom)' },
    { valor: 150, etiqueta: '150%' },
    { valor: 200, etiqueta: '200%' },
    { valor: 250, etiqueta: '250%' },
    { valor: 300, etiqueta: '300%' },
  ];

  /** Zoom default expresado como porcentaje 100-300 para la UI. */
  get zoomDefaultPct(): number {
    return Math.round(this.configService.zoomScannerDefault * 100);
  }

  /** Volumen del beep como porcentaje 0-100 para el slider. */
  get volumenBeepPct(): number {
    return Math.round(this.configService.volumenBeep * 100);
  }

  setVolumenBeepPct(pct: number | string): void {
    const n = typeof pct === 'string' ? parseInt(pct, 10) : pct;
    const clamped = Math.max(0, Math.min(100, isNaN(n) ? 0 : n));
    this.configService.setVolumenBeep(clamped / 100);
    this.debouncedToast('volumen', `Volumen del beep: ${clamped}%`);
  }

  // ═══════════════════════════════════════════════
  // DEBOUNCE DE TOAST PARA INPUTS CONTINUOS (v3.21.6)
  // ═══════════════════════════════════════════════
  // Cuando el coordinador escribe en un input numérico o arrastra un slider,
  // disparar un toast por cada cambio sería spam. Este helper colapsa todos
  // los cambios consecutivos en un único toast tras `ms` de inactividad.

  private toastDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private debouncedToast(key: string, mensaje: string, ms = 700): void {
    const prev = this.toastDebounceTimers.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      this.toastService.success(mensaje);
      this.toastDebounceTimers.delete(key);
    }, ms);
    this.toastDebounceTimers.set(key, t);
  }

  // ─── Handlers de feedback para escáner (input/stepper libres) ───

  onChangeEscanerVelocidad(ms: number | string): void {
    const n = typeof ms === 'string' ? parseInt(ms, 10) : ms;
    this.configService.setEscanerVelocidadMs(isNaN(n) ? 0 : n);
    const v = this.configService.escanerVelocidadMs;
    this.debouncedToast(
      'escaner-vel',
      v === 0 ? 'Velocidad de detección: Instantáneo' : `Velocidad de detección: ${v} ms`,
    );
  }

  onChangeEscanerCooldown(ms: number | string): void {
    const n = typeof ms === 'string' ? parseInt(ms, 10) : ms;
    this.configService.setEscanerCooldownMs(isNaN(n) ? 0 : n);
    const v = this.configService.escanerCooldownMs;
    this.debouncedToast(
      'escaner-cd',
      v === 0 ? 'Sin espera entre escaneos' : `Espera entre escaneos: ${v} ms`,
    );
  }

  // ─── Feedback al cambiar settings con efecto diferido ───

  onSetEscanerVelocidad(ms: number, etiqueta: string): void {
    this.configService.setEscanerVelocidadMs(ms);
    this.toastService.success(`Velocidad de detección: ${etiqueta}`);
  }

  onSetEscanerCooldown(ms: number, etiqueta: string): void {
    this.configService.setEscanerCooldownMs(ms);
    this.toastService.success(`Espera entre escaneos: ${etiqueta}`);
  }

  onToggleEscanerSaltarConfirmacion(): void {
    const nuevo = !this.configService.escanerSaltarConfirmacion;
    this.configService.setEscanerSaltarConfirmacion(nuevo);
    this.toastService.success(
      nuevo
        ? 'El escáner ya no pedirá confirmación — procesará al instante'
        : 'El escáner pedirá confirmación antes de procesar',
    );
  }

  // ─── Handlers de cámara y zoom (v3.23) ───

  onSetCamaraPreferida(valor: CamaraPreferida, etiqueta: string): void {
    this.configService.setCamaraPreferida(valor);
    this.toastService.success(
      `Cámara preferida: ${etiqueta}. Se aplicará la próxima vez que abras el escáner.`,
    );
  }

  onSetZoomDefault(pct: number, etiqueta: string): void {
    this.configService.setZoomScannerDefault(pct / 100);
    this.toastService.success(`Zoom inicial del escáner: ${etiqueta}`);
  }

  onChangeZoomDefaultPct(pct: number | string): void {
    const n = typeof pct === 'string' ? parseInt(pct, 10) : pct;
    const clamped = Math.max(100, Math.min(300, isNaN(n) ? 100 : n));
    this.configService.setZoomScannerDefault(clamped / 100);
    this.debouncedToast('zoom-def', `Zoom inicial del escáner: ${clamped}%`);
  }

  onToggleCierreAutoConfirmar(): void {
    const nuevo = !this.configService.cierreAutoConfirmar;
    this.configService.setCierreAutoConfirmar(nuevo);
    this.toastService.success(
      nuevo
        ? 'Las salidas por timeout se confirmarán automáticamente'
        : 'Las salidas por timeout requerirán revisión manual',
    );
  }

  onToggleCierreAlHorario(): void {
    const nuevo = !this.configService.cierreAlHorario;
    this.configService.setCierreAlHorario(nuevo);
    this.toastService.success(
      nuevo
        ? 'Al llegar la hora de cierre se cerrarán todas las entradas pendientes'
        : 'Cierre por horario desactivado',
    );
  }

  // ═══════════════════════════════════════════════
  // CONTROL DE AFORO
  // ═══════════════════════════════════════════════

  readonly opcionesAforoModo: { valor: AforoModo; etiqueta: string; descripcion: string }[] = [
    {
      valor: 'permitir',
      etiqueta: 'Solo alertar',
      descripcion: 'Muestra alerta visual y sonora pero permite registrar más entradas.',
    },
    {
      valor: 'confirmar',
      etiqueta: 'Confirmar',
      descripcion: 'Bloquea el registro y pide confirmación explícita del personal para continuar.',
    },
    {
      valor: 'bloquear',
      etiqueta: 'Bloquear',
      descripcion: 'Bloqueo total — no se permiten nuevas entradas hasta que alguien salga.',
    },
  ];

  get descripcionModoActual(): string {
    const op = this.opcionesAforoModo.find(o => o.valor === this.configService.aforoModo);
    return op?.descripcion ?? '';
  }

  setAforoMaximo(valor: number | string): void {
    const num = typeof valor === 'string' ? parseInt(valor, 10) : valor;
    this.configService.setAforoMaximo(isNaN(num) ? 0 : num);
    if (num > 0) {
      this.toastService.info(`Aforo configurado: ${num} personas`);
    } else {
      this.toastService.info('Control de aforo desactivado');
    }
  }

  setAforoModo(modo: AforoModo): void {
    this.configService.setAforoModo(modo);
    const op = this.opcionesAforoModo.find(o => o.valor === modo);
    if (op) this.toastService.info(`Modo de aforo: ${op.etiqueta}`);
  }

  // ═══════════════════════════════════════════════
  // MODO QUIOSCO (v3.9.0)
  // ═══════════════════════════════════════════════

  toggleModoQuiosco(): void {
    const nuevo = !this.configService.modoQuiosco;
    this.configService.setModoQuiosco(nuevo);
    this.toastService.info(
      nuevo
        ? 'Modo quiosco activado — pulsación larga + PIN para salir'
        : 'Modo quiosco desactivado'
    );
  }

  setQuioscoPin(valor: string): void {
    this.configService.setQuioscoPin(valor);
    const pin = this.configService.quioscoPin;
    this.debouncedToast(
      'quiosco-pin',
      pin ? `PIN del modo quiosco: ${pin.length} dígito(s)` : 'PIN del modo quiosco eliminado',
    );
  }

  // ═══════════════════════════════════════════════
  // HORARIOS DE OPERACIÓN (v3.9.0)
  // ═══════════════════════════════════════════════

  readonly diasSemana = DIAS_SEMANA.map((nombre, indice) => ({ indice, nombre }));

  readonly opcionesHorarioModo: { valor: HorarioModo; etiqueta: string; descripcion: string }[] = [
    {
      valor: 'advertir',
      etiqueta: 'Solo advertir',
      descripcion: 'Muestra un toast de advertencia pero permite registrar.',
    },
    {
      valor: 'bloquear',
      etiqueta: 'Bloquear',
      descripcion: 'Bloquea el registro fuera del horario configurado.',
    },
  ];

  toggleHorarioActivo(): void {
    const nuevo = !this.configService.horarioActivo;
    this.configService.setHorarioActivo(nuevo);
    this.toastService.info(
      nuevo ? 'Horarios de operación activados' : 'Horarios desactivados'
    );
  }

  setHorarioModo(modo: HorarioModo): void {
    this.configService.setHorarioModo(modo);
    const op = this.opcionesHorarioModo.find(o => o.valor === modo);
    if (op) this.toastService.info(`Fuera de horario: ${op.etiqueta}`);
  }

  toggleDiaCerrado(dia: number): void {
    const actual = this.configService.horarios[dia];
    const nuevoCerrado = !actual.cerrado;
    this.configService.setHorarioDia(dia, { ...actual, cerrado: nuevoCerrado });
    const nombre = DIAS_SEMANA[dia] ?? `Día ${dia}`;
    this.toastService.success(
      nuevoCerrado ? `${nombre}: cerrado` : `${nombre}: abierto ${actual.apertura}–${actual.cierre}`,
    );
  }

  setHorarioCampo(dia: number, campo: 'apertura' | 'cierre', valor: string): void {
    const actual = this.configService.horarios[dia];
    this.configService.setHorarioDia(dia, { ...actual, [campo]: valor });
    const nombre = DIAS_SEMANA[dia] ?? `Día ${dia}`;
    const etiqueta = campo === 'apertura' ? 'apertura' : 'cierre';
    this.debouncedToast(
      `horario-${dia}-${campo}`,
      `${nombre} — ${etiqueta}: ${valor}`,
    );
  }

  // ═══════════════════════════════════════════════
  // CELEBRACIÓN (v3.9.0)
  // ═══════════════════════════════════════════════

  readonly opcionesCelebracion = [
    { valor: 0.03, etiqueta: 'Rara (3%)' },
    { valor: 0.08, etiqueta: 'Normal (8%)' },
    { valor: 0.15, etiqueta: 'Frecuente (15%)' },
    { valor: 0.30, etiqueta: 'Muy frecuente (30%)' },
  ];

  get porcentajeCelebracion(): number {
    return Math.round(this.configService.celebracionProbabilidad * 100);
  }

  celebracionMatch(valor: number): boolean {
    // Match exacto (redondeado al 1%) entre el preset y el valor actual.
    return Math.round(this.configService.celebracionProbabilidad * 100) === Math.round(valor * 100);
  }

  toggleCelebracion(): void {
    const nuevo = !this.configService.celebracionActiva;
    this.configService.setCelebracionActiva(nuevo);
    this.toastService.info(
      nuevo ? 'Animación celebratoria activada' : 'Animación celebratoria desactivada'
    );
  }

  setCelebracionProbabilidad(valor: number): void {
    this.configService.setCelebracionProbabilidad(valor);
    this.toastService.info(`Frecuencia: ~${Math.round(valor * 100)}%`);
  }

  /** Recibe un porcentaje 0-100 (libre) y lo convierte a probabilidad 0-1. */
  setCelebracionPorcentaje(pct: number | string): void {
    const num = typeof pct === 'string' ? parseFloat(pct) : pct;
    if (isNaN(num)) return;
    const acotado = Math.max(0, Math.min(100, Math.round(num)));
    this.configService.setCelebracionProbabilidad(acotado / 100);
    this.debouncedToast('celebracion', `Frecuencia de animación: ${acotado}%`);
  }

  // ═══════════════════════════════════════════════
  // TIEMPO DE PANTALLA DE ÉXITO (v3.20)
  // ═══════════════════════════════════════════════

  readonly opcionesTiempoExito = [
    { valor: 2000,  etiqueta: 'Rápida (2 s)' },
    { valor: 5000,  etiqueta: 'Normal (5 s)' },
    { valor: 8000,  etiqueta: 'Lenta (8 s)' },
    { valor: 12000, etiqueta: 'Quiosco (12 s)' },
  ];

  /** Valor en segundos derivado de tiempoExitoMs para los inputs. */
  get tiempoExitoSegundos(): number {
    return Math.round(this.configService.tiempoExitoMs / 1000);
  }

  /** Acepta segundos (1-60 sugerido pero sin tope duro). */
  setTiempoExitoSegundos(segundos: number | string): void {
    const num = typeof segundos === 'string' ? parseFloat(segundos) : segundos;
    if (isNaN(num)) return;
    const seg = Math.max(1, Math.round(num));
    this.configService.setTiempoExitoMs(seg * 1000);
    this.debouncedToast('tiempo-exito', `Pantalla de éxito: ${seg} s`);
  }

  /** Setter desde presets (ya en ms). */
  setTiempoExito(ms: number): void {
    this.configService.setTiempoExitoMs(ms);
    const etiqueta = this.opcionesTiempoExito.find(o => o.valor === ms)?.etiqueta ?? `${Math.round(ms / 1000)} s`;
    this.toastService.success(`Pantalla de éxito: ${etiqueta}`);
  }

  // ═══════════════════════════════════════════════
  // PREVIEW DE ANIMACIONES (v3.20)
  // ═══════════════════════════════════════════════

  /** Catálogo para los botones de preview — IDs deben coincidir con los del
   *  componente SuccessAnimation. */
  readonly temasPreview = [
    { id: 'book',       emoji: '📚', nombre: 'Libro' },
    { id: 'thumbsup',   emoji: '👍', nombre: 'Pulgar' },
    { id: 'trophy',     emoji: '🏆', nombre: 'Trofeo' },
    { id: 'graduation', emoji: '🎓', nombre: 'Graduación' },
    { id: 'star',       emoji: '⭐', nombre: 'Estrella' },
    { id: 'party',      emoji: '🎉', nombre: 'Fiesta' },
    { id: 'check',      emoji: '✅', nombre: 'Check' },
    { id: 'cofre',      emoji: '🎁', nombre: 'Cofre' },
  ];

  mostrarPreviewAnimacion = false;
  /** Si está undefined, el componente elige aleatorio. */
  temaPreview: string | undefined = undefined;

  abrirPreviewAnimacion(temaId?: string): void {
    this.temaPreview = temaId;
    // Forzar remount: si ya estaba abierto y se hace click en otro tema,
    // el cambio de @if asegura que ngOnInit se vuelva a disparar y la
    // animación arranque desde 0 con el nuevo tema.
    this.mostrarPreviewAnimacion = false;
    setTimeout(() => { this.mostrarPreviewAnimacion = true; }, 30);
  }

  cerrarPreviewAnimacion(): void {
    this.mostrarPreviewAnimacion = false;
    this.temaPreview = undefined;
  }

  // ═══════════════════════════════════════════════
  // NAVEGACIÓN
  // ═══════════════════════════════════════════════

  navegar(ruta: string): void {
    this.router.navigate([ruta]);
  }

  // ═══════════════════════════════════════════════
  // BACKUP
  // ═══════════════════════════════════════════════

  async exportarBackup(): Promise<void> {
    try {
      this.procesando = true;
      this.loadingService.show('Generando backup...');

      const resultado = await this.backupService.descargarBackup();

      this.loadingService.hide();
      this.procesando = false;
      this.ultimoBackup = new Date().toLocaleString('es-MX');
      this.toastService.success(`Backup descargado: ${resultado.nombreArchivo}`);
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al generar el backup');
    }
  }

  // ═══════════════════════════════════════════════
  // RESTORE
  // ═══════════════════════════════════════════════

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      const contenido = reader.result as string;
      const validacion = this.backupService.validarArchivo(contenido);

      if (!validacion.valido) {
        this.toastService.error(validacion.errores[0]);
        return;
      }

      this.backupPreview = validacion.datos!;
      this.toastService.info('Archivo válido — revisa los datos antes de importar');
    };
    reader.onerror = () => {
      this.toastService.error('Error al leer el archivo');
    };
    reader.readAsText(file);

    input.value = '';
  }

  async importarBackup(modo: 'merge' | 'replace'): Promise<void> {
    if (!this.backupPreview) return;

    if (modo === 'replace') {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          titulo: '¿Reemplazar TODOS los datos?',
          mensaje: 'Se borrarán todos los datos actuales y se reemplazarán con el backup. Esta acción no se puede deshacer.',
          variante: 'danger',
          textoConfirmar: 'Reemplazar todo',
          icono: 'swap_horiz',
        } as ConfirmDialogData,
      });

      const confirmado = await dialogRef.afterClosed().toPromise();
      if (!confirmado) return;
    }

    try {
      this.procesando = true;
      this.loadingService.show(
        modo === 'replace' ? 'Reemplazando datos...' : 'Combinando datos...'
      );

      this.resultadoImportacion = await this.backupService.importarBackup(
        this.backupPreview, modo
      );

      this.backupPreview = null;
      this.loadingService.hide();
      this.procesando = false;

      if (this.resultadoImportacion.exitoso) {
        this.toastService.success('Importación completada exitosamente');
        await this.cargarInfo();
      } else {
        this.toastService.error('Hubo errores durante la importación');
      }
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error durante la importación');
    }
  }

  cancelarImportacion(): void {
    this.backupPreview = null;
    this.resultadoImportacion = null;
    this.nombreArchivoSeleccionado = '';
  }

  // ═══════════════════════════════════════════════
  // MANTENIMIENTO
  // ═══════════════════════════════════════════════

  async limpiarDuplicados(): Promise<void> {
    try {
      this.procesando = true;
      this.loadingService.show('Limpiando motivos duplicados...');

      const eliminados = await this.backupService.limpiarMotivosDuplicados();

      this.loadingService.hide();
      this.procesando = false;

      if (eliminados > 0) {
        this.toastService.success(`${eliminados} motivos duplicados eliminados`);
      } else {
        this.toastService.info('No se encontraron motivos duplicados');
      }

      await this.cargarInfo();
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al limpiar duplicados');
    }
  }

  // ═══════════════════════════════════════════════
  // ZONA PELIGROSA
  // ═══════════════════════════════════════════════

  async limpiarTodosDatos(): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        titulo: '¿Eliminar TODOS los datos?',
        mensaje: 'Se borrarán todos los alumnos, registros y motivos. Los motivos por defecto se recrearán. Asegúrate de haber hecho un backup.',
        variante: 'danger',
        textoConfirmar: 'Eliminar todo',
        icono: 'delete_forever',
      } as ConfirmDialogData,
    });

    const confirmado = await dialogRef.afterClosed().toPromise();
    if (!confirmado) return;

    try {
      this.procesando = true;
      this.loadingService.show('Eliminando todos los datos...');

      await this.databaseService.limpiarTodosDatos();

      this.loadingService.hide();
      this.procesando = false;
      this.toastService.success('Todos los datos han sido eliminados');
      await this.cargarInfo();
    } catch (error) {
      this.loadingService.hide();
      this.procesando = false;
      this.toastService.error('Error al limpiar los datos');
    }
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════

  formatearFechaBackup(fecha: string): string {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}