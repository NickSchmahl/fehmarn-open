import { signal } from '@angular/core';
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

const mockRoute = {} as ActivatedRouteSnapshot;
const mockState = { url: '/admin/export' } as RouterStateSnapshot;

describe('authGuard', () => {
  const eingeloggt = signal(false);
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { eingeloggt } }],
    });

    router = TestBed.inject(Router);
  });

  const runGuard = () => TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

  it('should return true when user is logged in', () => {
    eingeloggt.set(true);
    expect(runGuard()).toBe(true);
  });

  it('leitet ohne Login auf /admin/login um und merkt sich die Ziel-URL', () => {
    eingeloggt.set(false);
    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/admin/login?returnUrl=%2Fadmin%2Fexport');
  });

  it('should not call createUrlTree when logged in', () => {
    eingeloggt.set(true);
    const navSpy = jest.spyOn(router, 'createUrlTree');

    runGuard();

    expect(navSpy).not.toHaveBeenCalled();
  });
});
