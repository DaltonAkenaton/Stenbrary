// ╔══════════════════════════════════════════════════════╗
// ║  login.component.ts                                  ║
// ║  Stenbrary — Pantalla de login (magic link)          ║
// ║                                                      ║
// ║  Fase 2.0 — Fundación de auth.                       ║
// ║                                                      ║
// ║  Estados visibles:                                   ║
// ║  - local-only: backend no configurado. Mensaje +     ║
// ║    botón "Continuar sin cuenta" → /scanner.          ║
// ║  - signed-in: el usuario ya tiene sesión activa.     ║
// ║    Botón a la app + "Cerrar sesión".                 ║
// ║  - idle / sending / sent / error: flujo de envío     ║
// ║    de magic link.                                    ║
// ╚══════════════════════════════════════════════════════╝

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

type LoginStatus = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly status = signal<LoginStatus>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isLocalOnly = this.auth.isLocalOnly;
  protected readonly isSignedIn = this.auth.isSignedIn;
  protected readonly currentUser = this.auth.currentUser;

  protected readonly canSubmit = computed(() => {
    const value = this.email().trim();
    return value.length > 3 && value.includes('@') && this.status() !== 'sending';
  });

  /**
   * Auto-redirect tras callback del magic link: cuando el AuthService pasa a
   * `signed-in` (porque Supabase consumió el ?code= de la URL), llevamos al
   * usuario al `returnUrl` o /scanner. Sin esto, queda viendo "Hola, X" o
   * el form mientras la sesión se carga — UX confusa.
   *
   * Si el usuario navega manualmente a /login con sesión activa (caso raro),
   * el redirect también dispara — es el comportamiento esperado de un login.
   */
  private readonly redirectAfterSignIn = effect(() => {
    if (this.isSignedIn()) {
      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/scanner';
      void this.router.navigateByUrl(returnUrl);
    }
  });

  protected async enviarEnlace(): Promise<void> {
    if (!this.canSubmit()) return;

    this.status.set('sending');
    this.errorMessage.set(null);

    const result = await this.auth.signInWithMagicLink(this.email());

    if (result.ok) {
      this.status.set('sent');
    } else {
      this.status.set('error');
      this.errorMessage.set(result.error ?? 'No se pudo enviar el enlace.');
    }
  }

  protected reintentar(): void {
    this.status.set('idle');
    this.errorMessage.set(null);
  }

  protected continuarLocal(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/scanner';
    void this.router.navigateByUrl(returnUrl);
  }

  protected async cerrarSesion(): Promise<void> {
    await this.auth.signOut();
    this.status.set('idle');
    this.email.set('');
  }
}
