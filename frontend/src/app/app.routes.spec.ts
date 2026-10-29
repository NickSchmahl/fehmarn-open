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
    'admin/export': '12. Fehmarn Open 2027 – Export',
  };

  it.each(Object.entries(erwarteteTitelProPfad))(
    'setzt für Route "%s" den Titel "%s"',
    (pfad, erwarteterTitel) => {
      const route = routes.find((eintrag) => eintrag.path === pfad);
      expect(route?.title).toBe(erwarteterTitel);
    },
  );

  it('schützt /admin/export mit dem authGuard', () => {
    const route = routes.find((eintrag) => eintrag.path === 'admin/export');
    expect(route?.canActivate).toEqual([authGuard]);
  });

  it('steht vor der Wildcard-Route, damit /admin/export nicht umgeleitet wird', () => {
    const pfade = routes.map((eintrag) => eintrag.path);
    expect(pfade.indexOf('admin/export')).toBeLessThan(pfade.indexOf('**'));
  });

  it('leitet /admin/export ohne Login auf /admin/login um', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/admin/export');

    expect(TestBed.inject(Router).url).toBe('/admin/login');
  });
});
