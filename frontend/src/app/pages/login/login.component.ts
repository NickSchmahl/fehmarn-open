import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth/service/auth.service';
import { BrandIconComponent } from '@ui/brand-icon/brand-icon.component';

/** Ziel nach dem Login, wenn keine (gültige) `returnUrl` mitkommt. */
const STANDARD_ZIEL = '/admin/teilnehmer';

/**
 * Nur Admin-Seiten sind als Rücksprungziel erlaubt – keine fremden Hosts, keine
 * Endlosschleife zurück auf den Login.
 */
export function ruecksprungZiel(returnUrl: string | null): string {
  if (
    returnUrl?.startsWith('/admin/') &&
    !returnUrl.startsWith('/admin/login') &&
    !returnUrl.startsWith('//')
  ) {
    return returnUrl;
  }
  return STANDARD_ZIEL;
}

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, BrandIconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.form.getRawValue();

    this.authService.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(ruecksprungZiel(returnUrl));
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const unauthorized =
          typeof err === 'object' && err !== null && 'status' in err && err.status === 401;
        this.errorMessage.set(
          unauthorized
            ? 'Benutzername oder Passwort falsch.'
            : 'AnmeldungComponent fehlgeschlagen. Bitte später erneut versuchen.',
        );
      },
    });
  }

  get username() {
    return this.form.controls.username;
  }
  get password() {
    return this.form.controls.password;
  }
}
