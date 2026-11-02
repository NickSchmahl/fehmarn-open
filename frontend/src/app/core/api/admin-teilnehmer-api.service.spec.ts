import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminTeilnehmerApiService } from './admin-teilnehmer-api.service';

describe('AdminTeilnehmerApiService', () => {
  let service: AdminTeilnehmerApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminTeilnehmerApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lädt die Admin-Übersicht per GET', () => {
    let ergebnis: unknown;
    service.ladeUebersicht().subscribe((daten) => (ergebnis = daten));

    const req = httpMock.expectOne('/api/admin/teilnehmer');
    expect(req.request.method).toBe('GET');
    req.flush({ disziplinen: [] });

    expect(ergebnis).toEqual({ disziplinen: [] });
  });

  it('meldet per POST ab', () => {
    let fertig = false;
    service.abmelden(7).subscribe(() => (fertig = true));

    const req = httpMock.expectOne('/api/admin/anmeldung/7/abmelden');
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(fertig).toBe(true);
  });

  it('reaktiviert per POST', () => {
    let fertig = false;
    service.reaktivieren(8).subscribe(() => (fertig = true));

    const req = httpMock.expectOne('/api/admin/anmeldung/8/reaktivieren');
    expect(req.request.method).toBe('POST');
    req.flush({});

    expect(fertig).toBe(true);
  });

  it('setzt die Anwesenheit per PUT mit dem Wert im Body', () => {
    let fertig = false;
    service.setzeAnwesenheit(9, true).subscribe(() => (fertig = true));

    const req = httpMock.expectOne('/api/admin/anmeldung/9/anwesenheit');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ anwesend: true });
    req.flush({});

    expect(fertig).toBe(true);
  });

  it('reicht HTTP-Fehler an den Aufrufer weiter', () => {
    let status: number | undefined;
    service
      .reaktivieren(3)
      .subscribe({ error: (err: { status: number }) => (status = err.status) });

    httpMock
      .expectOne('/api/admin/anmeldung/3/reaktivieren')
      .flush({ message: 'Teamname vergeben' }, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
  });
});
