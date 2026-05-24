import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../service/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should attach Authorization header when token is present', () => {
    jest.spyOn(authService, 'getToken').mockReturnValue('my-jwt');

    http.get('/api/tournaments').subscribe();

    const req = httpMock.expectOne('/api/tournaments');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-jwt');
    req.flush({});
  });

  it('should not attach Authorization header when no token', () => {
    jest.spyOn(authService, 'getToken').mockReturnValue(null);

    http.get('/api/tournaments').subscribe({ error: () => {} });

    const req = httpMock.expectOne('/api/tournaments');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should call logout on 401 from a non-login endpoint', () => {
    const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(() => {});
    jest.spyOn(authService, 'getToken').mockReturnValue('expired-token');

    http.get('/api/admin/players').subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/admin/players')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('should NOT call logout on 401 from the login endpoint', () => {
    const logoutSpy = jest.spyOn(authService, 'logout').mockImplementation(() => {});
    jest.spyOn(authService, 'getToken').mockReturnValue(null);

    http.post('/api/auth/login', {}).subscribe({ error: () => {} });

    httpMock
      .expectOne('/api/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(logoutSpy).not.toHaveBeenCalled();
  });

  it('should propagate the error after handling 401', () => {
    let errorStatus: number | undefined;
    jest.spyOn(authService, 'getToken').mockReturnValue('tok');
    jest.spyOn(authService, 'logout').mockImplementation(() => {});

    http.get('/api/admin/players').subscribe({
      error: (err) => (errorStatus = err.status),
    });

    httpMock
      .expectOne('/api/admin/players')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errorStatus).toBe(401);
  });
});
