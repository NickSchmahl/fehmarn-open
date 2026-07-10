import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastComponent } from './ui/toast/toast.component';
import { BrandIconComponent } from './ui/brand-icon/brand-icon.component';
import { AuthService } from './auth/service/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, BrandIconComponent],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('fehmarnopen-frontend');
  protected readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
