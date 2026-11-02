import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TeilnehmerApiService } from './teilnehmer-api.service';

describe('TeilnehmerApiService', () => {
  it('lädt die öffentliche Übersicht per GET', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(TeilnehmerApiService);
    const httpMock = TestBed.inject(HttpTestingController);

    let ergebnis: unknown;
    service.ladeUebersicht().subscribe((daten) => (ergebnis = daten));

    const req = httpMock.expectOne('/api/teilnehmer');
    expect(req.request.method).toBe('GET');
    req.flush({ disziplinen: [] });

    expect(ergebnis).toEqual({ disziplinen: [] });
    httpMock.verify();
  });
});
