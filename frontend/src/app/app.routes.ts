import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'anmeldung', pathMatch: 'full' },
  {
    path: 'anmeldung',
    loadComponent: () =>
      import('./pages/anmeldung/anmeldung')
        .then(m => m.Anmeldung)
  },
  {
    path: 'teilnehmer',
    loadComponent: () =>
      import('./pages/teilnehmer/teilnehmer')
        .then(m => m.Teilnehmer)
  },
  {
    path: 'flyer',
    loadComponent: () =>
      import('./pages/flyer/flyer')
        .then(m => m.Flyer)
  },
  { path: '**', redirectTo: 'anmeldung' }
];
