import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('login()', () => {

    it('should store token in localStorage on success', () => {
      service.login('admin', 'password').subscribe();

      const req = httpMock.expectOne('/api/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'admin', password: 'password' });
      req.flush({ token: 'fake-jwt-token' });

      expect(localStorage.getItem(AuthService.TOKEN_KEY)).toBe('fake-jwt-token');
    });

    it('should propagate error on 401', () => {
      let errorReceived = false;

      service.login('admin', 'wrong').subscribe({
        error: (err) => {
          errorReceived = true;
          expect(err.status).toBe(401);
        },
      });

      httpMock
        .expectOne('/api/auth/login')
        .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      expect(errorReceived).toBe(true);
      expect(localStorage.getItem(AuthService.TOKEN_KEY)).toBeNull();
    });

    it('should return void on success', (done) => {
      service.login('admin', 'password').subscribe((result) => {
        expect(result).toBeUndefined();
        done();
      });

      httpMock.expectOne('/api/auth/login').flush({ token: 'tok' });
    });
  });

  describe('logout()', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem(AuthService.TOKEN_KEY, 'some-token');
      jest.spyOn(router, 'navigate').mockResolvedValue(true);

      service.logout();

      expect(localStorage.getItem(AuthService.TOKEN_KEY)).toBeNull();
    });

    it('should navigate to /admin/login', () => {
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      service.logout();
      expect(navSpy).toHaveBeenCalledWith(['/admin/login']);
    });
  });

  describe('getToken()', () => {
    it('should return null when no token stored', () => {
      expect(service.getToken()).toBeNull();
    });

    it('should return stored token', () => {
      localStorage.setItem(AuthService.TOKEN_KEY, 'my-token');
      expect(service.getToken()).toBe('my-token');
    });
  });

  describe('isLoggedIn()', () => {
    it('should return false when no token present', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('should return true when token is stored', () => {
      localStorage.setItem(AuthService.TOKEN_KEY, 'my-token');
      expect(service.isLoggedIn()).toBe(true);
    });
  });
});
