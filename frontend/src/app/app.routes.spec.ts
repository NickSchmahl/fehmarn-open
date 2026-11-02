import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { authGuard } from './auth/guard/auth.guard';

describe('routes', () => {
  const erwarteteTitelProPfad: Record<string, string> = {
    anmeldung: '12. Fehmarn Open 2027 – Anmeldung',
    teilnehmer: '12. Fehmarn Open 2027 – Teilnehmer',
    flyer: '12. Fehmarn Open 2027',
    impressum: '12. Fehmarn Open 2027 – Impressum',
    datenschutz: '12. Fehmarn Open 2027 – Datenschutz',
    'admin/login': '12. Fehmarn Open 2027 – Admin-Login',
    'admin/teilnehmer': '12. Fehmarn Open 2027 – Teilnehmerverwaltung',
    'admin/export': '12. Fehmarn Open 2027 – Export',
  };

  it.each(Object.entries(erwarteteTitelProPfad))(
    'setzt für Route "%s" den Titel "%s"',
    (pfad, erwarteterTitel) => {
      const route = routes.find((eintrag) => eintrag.path === pfad);
      expect(route?.title).toBe(erwarteterTitel);
    },
  );

  it.each(Object.keys(erwarteteTitelProPfad))('lädt die Seite "%s" lazy', (pfad) => {
    const route = routes.find((eintrag) => eintrag.path === pfad);
    expect(route?.loadComponent).toBeDefined();
    expect(route?.component).toBeUndefined();
  });

  it.each(['admin/teilnehmer', 'admin/export'])('schützt /%s mit dem authGuard', (pfad) => {
    const route = routes.find((eintrag) => eintrag.path === pfad);
    expect(route?.canActivate).toEqual([authGuard]);
  });

  it.each(['admin/teilnehmer', 'admin/export'])(
    'steht /%s vor der Wildcard-Route, damit es nicht umgeleitet wird',
    (pfad) => {
      const pfade = routes.map((eintrag) => eintrag.path);
      expect(pfade.indexOf(pfad)).toBeLessThan(pfade.indexOf('**'));
    },
  );

  it('lässt /teilnehmer ohne Guard (öffentlich)', () => {
    const route = routes.find((eintrag) => eintrag.path === 'teilnehmer');
    expect(route?.canActivate).toBeUndefined();
  });

  it.each(['/admin/teilnehmer', '/admin/export'])(
    'leitet %s ohne Login auf /admin/login um',
    async (url) => {
      localStorage.clear();
      TestBed.configureTestingModule({
        providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
      });
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(url);

      expect(TestBed.inject(Router).url).toBe('/admin/login');
    },
  );
});
