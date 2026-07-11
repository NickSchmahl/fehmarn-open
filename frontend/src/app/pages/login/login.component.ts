import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/service/auth.service';
import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, BrandIconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class AdminLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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
        void this.router.navigate(['/teilnehmer']);
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
