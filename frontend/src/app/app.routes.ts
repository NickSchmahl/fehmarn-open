import { Routes } from '@angular/router';
import { AdminLoginComponent } from './pages/login/login.component';

const BASISTITEL = '12. Fehmarn Open 2027';

export const routes: Routes = [
  { path: '', redirectTo: 'flyer', pathMatch: 'full' },
  {
    path: 'anmeldung',
    title: `${BASISTITEL} – Anmeldung`,
    loadComponent: () =>
      import('./pages/anmeldung/anmeldung.component').then((m) => m.AnmeldungComponent),
  },
  {
    path: 'teilnehmer',
    title: `${BASISTITEL} – Teilnehmer`,
    loadComponent: () => import('./pages/teilnehmer/teilnehmer').then((m) => m.Teilnehmer),
  },
  {
    path: 'flyer',
    title: BASISTITEL,
    loadComponent: () => import('./pages/flyer/flyer').then((m) => m.Flyer),
  },
  {
    path: 'impressum',
    title: `${BASISTITEL} – Impressum`,
    loadComponent: () => import('./pages/impressum/impressum').then((m) => m.Impressum),
  },
  {
    path: 'datenschutz',
    title: `${BASISTITEL} – Datenschutz`,
    loadComponent: () => import('./pages/datenschutz/datenschutz').then((m) => m.Datenschutz),
  },
  {
    path: 'admin/login',
    title: `${BASISTITEL} – Admin-Login`,
    component: AdminLoginComponent,
  },
  { path: '**', redirectTo: 'flyer' },
];
