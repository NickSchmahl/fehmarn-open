import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnmeldungApiService } from './anmeldung-api.service';
import { AnmeldungRequest } from '../model/anmeldung.model';

describe('AnmeldungApiService', () => {
  let service: AnmeldungApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnmeldungApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lädt den Anmeldeschluss-Status per GET', () => {
    let ergebnis: unknown;
    service.ladeStatus().subscribe((status) => (ergebnis = status));

    const req = httpMock.expectOne('/api/anmeldung/status');
    expect(req.request.method).toBe('GET');
    req.flush({ anmeldungOffen: true, anmeldeschluss: '2027-02-28' });

    expect(ergebnis).toEqual({ anmeldungOffen: true, anmeldeschluss: '2027-02-28' });
  });

  it('sendet die Anmeldung per POST mit dem Request als Body', () => {
    const request: AnmeldungRequest = { disziplinen: [] };
    let abgeschlossen = false;
    service.sendeAnmeldung(request).subscribe(() => (abgeschlossen = true));

    const req = httpMock.expectOne('/api/anmeldung');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({});

    expect(abgeschlossen).toBe(true);
  });
});
