import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnmeldungStatusApiService } from './anmeldung-status-api.service';

describe('AnmeldungStatusApiService', () => {
  let service: AnmeldungStatusApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnmeldungStatusApiService);
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
    const status = {
      anmeldungOffen: true,
      anmeldeschluss: '2027-02-28',
      teamwettbewerbAusgebucht: false,
      maxTeams: 96,
    };
    req.flush(status);

    expect(ergebnis).toEqual(status);
  });
});
