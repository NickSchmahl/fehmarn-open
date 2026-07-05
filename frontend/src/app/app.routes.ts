import { Routes } from '@angular/router';
import { AdminLoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: '', redirectTo: 'anmeldung', pathMatch: 'full' },
  {
    path: 'anmeldung',
    loadComponent: () =>
      import('./pages/anmeldung/anmeldung.component').then((m) => m.AnmeldungComponent),
  },
  {
    path: 'teilnehmer',
    loadComponent: () => import('./pages/teilnehmer/teilnehmer').then((m) => m.Teilnehmer),
  },
  {
    path: 'flyer',
    loadComponent: () => import('./pages/flyer/flyer').then((m) => m.Flyer),
  },
  {
    path: 'admin/login',
    component: AdminLoginComponent,
  },
  { path: '**', redirectTo: 'anmeldung' },
];
