import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService, jwtAblauf } from './auth.service';

/** Baut ein unsigniertes JWT mit dem gegebenen Payload (Signatur prüft nur das Backend). */
function jwt(payload: object): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.signatur`;
}

const IN_EINER_STUNDE = Math.floor(Date.now() / 1000) + 3600;
const VOR_EINER_STUNDE = Math.floor(Date.now() / 1000) - 3600;

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  /** Der Service liest localStorage beim Erzeugen – Vorbelegung also vor dem ersten inject. */
  function erzeuge(gespeichert?: string): AuthService {
    if (gespeichert !== undefined) {
      localStorage.setItem(AuthService.TOKEN_KEY, gespeichert);
    }
    const service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    return service;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('Start', () => {
    it('ist ohne gespeichertes Token ausgeloggt', () => {
      const service = erzeuge();
      expect(service.eingeloggt()).toBe(false);
      expect(service.getToken()).toBeNull();
    });

    it('übernimmt ein gültiges gespeichertes Token', () => {
      const token = jwt({ sub: 'admin', exp: IN_EINER_STUNDE });
      const service = erzeuge(token);
      expect(service.eingeloggt()).toBe(true);
      expect(service.getToken()).toBe(token);
    });

    it('wertet ein laut exp abgelaufenes Token als ausgeloggt und entfernt es', () => {
      const service = erzeuge(jwt({ sub: 'admin', exp: VOR_EINER_STUNDE }));
      expect(service.eingeloggt()).toBe(false);
      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem(AuthService.TOKEN_KEY)).toBeNull();
    });

    it('behält ein Token ohne lesbaren exp-Claim (das Backend entscheidet per 401)', () => {
      const service = erzeuge('kein-jwt');
      expect(service.eingeloggt()).toBe(true);
    });
  });

  describe('login()', () => {
    it('speichert das Token und meldet sofort eingeloggt', () => {
      const service = erzeuge();
      service.login('admin', 'password').subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'admin', password: 'password' });
      req.flush({ token: 'fake-jwt-token' });

      expect(localStorage.getItem(AuthService.TOKEN_KEY)).toBe('fake-jwt-token');
      expect(service.getToken()).toBe('fake-jwt-token');
      expect(service.eingeloggt()).toBe(true);
    });

    it('reicht einen 401 weiter und bleibt ausgeloggt', () => {
      const service = erzeuge();
      let status: number | undefined;

      service.login('admin', 'wrong').subscribe({
        error: (err: { status: number }) => (status = err.status),
      });
      httpMock
        .expectOne('/api/auth/login')
        .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(status).toBe(401);
      expect(localStorage.getItem(AuthService.TOKEN_KEY)).toBeNull();
      expect(service.eingeloggt()).toBe(false);
    });

    it('liefert void', () => {
      const service = erzeuge();
      let ergebnis: unknown = 'unberührt';
      service.login('admin', 'password').subscribe((r) => (ergebnis = r));
      httpMock.expectOne('/api/auth/login').flush({ token: 'tok' });
      expect(ergebnis).toBeUndefined();
    });
  });

  describe('logout()', () => {
    it('entfernt das Token und meldet sofort ausgeloggt', () => {
      const service = erzeuge(jwt({ exp: IN_EINER_STUNDE }));
      jest.spyOn(router, 'navigate').mockResolvedValue(true);

      service.logout();

      expect(localStorage.getItem(AuthService.TOKEN_KEY)).toBeNull();
      expect(service.getToken()).toBeNull();
      expect(service.eingeloggt()).toBe(false);
    });

    it('navigiert zu /admin/login', () => {
      const service = erzeuge();
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      service.logout();
      expect(navSpy).toHaveBeenCalledWith(['/admin/login']);
    });
  });
});

describe('jwtAblauf', () => {
  it('liest exp als Millisekunden', () => {
    expect(jwtAblauf(jwt({ exp: 1700000000 }))).toBe(1700000000000);
  });

  it('liefert null ohne exp-Claim', () => {
    expect(jwtAblauf(jwt({ sub: 'admin' }))).toBeNull();
  });

  it('liefert null für Nicht-JWTs und kaputte Payloads', () => {
    expect(jwtAblauf('kein-jwt')).toBeNull();
    expect(jwtAblauf('a.%%%.c')).toBeNull();
    expect(jwtAblauf(`a.${btoa('"text"')}.c`)).toBeNull();
  });
});
