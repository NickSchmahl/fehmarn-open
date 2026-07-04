import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../service/auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

const mockRoute = {} as ActivatedRouteSnapshot;
const mockState = {} as RouterStateSnapshot;

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  const runGuard = () => TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

  it('should return true when user is logged in', () => {
    jest.spyOn(authService, 'isLoggedIn').mockReturnValue(true);
    expect(runGuard()).toBe(true);
  });

  it('should redirect to /admin/login when not logged in', () => {
    jest.spyOn(authService, 'isLoggedIn').mockReturnValue(false);
    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/admin/login');
  });

  it('should not call createUrlTree when logged in', () => {
    jest.spyOn(authService, 'isLoggedIn').mockReturnValue(true);
    const navSpy = jest.spyOn(router, 'createUrlTree');

    runGuard();

    expect(navSpy).not.toHaveBeenCalled();
  });
});
