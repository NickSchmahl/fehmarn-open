import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastComponent } from '@ui/toast/toast.component';
import { BrandIconComponent } from '@ui/brand-icon/brand-icon.component';
import { AuthService } from '@auth/service/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, BrandIconComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly authService = inject(AuthService);
  protected readonly toasts = inject(ToastService).toasts;

  /** „Teilnehmer" führt eingeloggt in die Verwaltung, sonst zur öffentlichen Liste (#317). */
  protected readonly teilnehmerLink = computed(() =>
    this.authService.eingeloggt() ? '/admin/teilnehmer' : '/teilnehmer',
  );

  protected logout(): void {
    this.authService.logout();
  }
}
