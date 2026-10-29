import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth/service/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('verlinkt Impressum und Datenschutz im Footer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const footerHrefs = Array.from(element.querySelectorAll('.app-footer a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(footerHrefs).toContain('/impressum');
    expect(footerHrefs).toContain('/datenschutz');
  });

  it('zeigt die Fehmarn-Bildmarke im Header-Link', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const mark = element.querySelector('.brand app-brand-icon');
    expect(mark).not.toBeNull();
    expect(element.querySelector('.brand-mark span')).toBeNull();
  });

  describe('Export-Link', () => {
    function exportLinks(eingeloggt: boolean): (string | null)[] {
      localStorage.clear();
      if (eingeloggt) {
        localStorage.setItem(AuthService.TOKEN_KEY, 'token');
      }
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      return Array.from(element.querySelectorAll('.desktop-nav a, .mobile-tabs a'), (link) =>
        link.getAttribute('href'),
      ).filter((href) => href === '/admin/export');
    }

    afterEach(() => {
      localStorage.clear();
    });

    it('erscheint eingeloggt in Desktop- und Mobil-Navigation', () => {
      expect(exportLinks(true)).toHaveLength(2);
    });

    it('fehlt ohne Login', () => {
      expect(exportLinks(false)).toHaveLength(0);
    });
  });
});
