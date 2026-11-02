import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AdminLoginComponent, ruecksprungZiel } from './login.component';
import { AuthService } from '@auth/service/auth.service';

describe('AdminLoginComponent', () => {
  let fixture: ComponentFixture<AdminLoginComponent>;
  let component: AdminLoginComponent;
  let authService: jest.Mocked<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authMock: Partial<jest.Mocked<AuthService>> = {
      login: jest.fn(),
      logout: jest.fn(),
      getToken: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('zeigt die Fehmarn-Bildmarke im Login-Header', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.login-header app-brand-icon')).not.toBeNull();
    expect(element.querySelector('.bullseye')).toBeNull();
  });

  describe('Form validation', () => {
    it('should be invalid when empty', () => {
      expect(component.form.invalid).toBe(true);
    });

    it('should be valid with username and password', () => {
      component.form.setValue({ username: 'admin', password: 'secret123' });
      expect(component.form.valid).toBe(true);
    });

    it('should be invalid with password shorter than 4 chars', () => {
      component.form.setValue({ username: 'admin', password: '123' });
      expect(component.form.invalid).toBe(true);
    });
  });

  describe('onSubmit()', () => {
    it('should mark form as touched and not call login when form is invalid', () => {
      component.onSubmit();
      expect(authService.login).not.toHaveBeenCalled();
      expect(component.username.touched).toBe(true);
    });

    it('navigiert nach erfolgreichem Login ohne returnUrl in die Teilnehmerverwaltung', () => {
      authService.login.mockReturnValue(of(void 0));
      const navSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      component.form.setValue({ username: 'admin', password: 'password' });
      component.onSubmit();

      expect(navSpy).toHaveBeenCalledWith('/admin/teilnehmer');
    });

    it('navigiert nach erfolgreichem Login zur ursprünglich aufgerufenen Admin-Seite', async () => {
      await router.navigateByUrl('/?returnUrl=%2Fadmin%2Fexport');
      authService.login.mockReturnValue(of(void 0));
      const navSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      component.form.setValue({ username: 'admin', password: 'password' });
      component.onSubmit();

      expect(navSpy).toHaveBeenCalledWith('/admin/export');
    });

    it('should show 401 error message on wrong credentials', () => {
      authService.login.mockReturnValue(throwError(() => ({ status: 401 })));

      component.form.setValue({ username: 'admin', password: 'wrong1' });
      component.onSubmit();

      expect(component.errorMessage()).toBe('Benutzername oder Passwort falsch.');
    });

    it('should show generic error message on non-401 errors', () => {
      authService.login.mockReturnValue(throwError(() => ({ status: 500 })));

      component.form.setValue({ username: 'admin', password: 'password' });
      component.onSubmit();

      expect(component.errorMessage()).toBe(
        'AnmeldungComponent fehlgeschlagen. Bitte später erneut versuchen.',
      );
    });

    it('should reset loading state after error', () => {
      authService.login.mockReturnValue(throwError(() => ({ status: 500 })));
      component.form.setValue({ username: 'admin', password: 'password' });
      component.onSubmit();
      expect(component.loading()).toBe(false);
    });

    it('should clear previous error message on new submit attempt', () => {
      component.errorMessage.set('Alter Fehler');
      authService.login.mockReturnValue(of(void 0));
      jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      component.form.setValue({ username: 'admin', password: 'password' });
      component.onSubmit();

      expect(component.errorMessage()).toBeNull();
    });
  });

  describe('ruecksprungZiel()', () => {
    it.each([
      ['/admin/export', '/admin/export'],
      ['/admin/teilnehmer?filter=offen', '/admin/teilnehmer?filter=offen'],
    ])('übernimmt die Admin-Seite %s', (returnUrl, erwartet) => {
      expect(ruecksprungZiel(returnUrl)).toBe(erwartet);
    });

    it.each([
      null,
      '',
      '/anmeldung',
      '/admin/login',
      '//evil.example/admin/',
      'https://evil.example',
    ])('fällt bei %p auf die Teilnehmerverwaltung zurück', (returnUrl) => {
      expect(ruecksprungZiel(returnUrl)).toBe('/admin/teilnehmer');
    });
  });
});
