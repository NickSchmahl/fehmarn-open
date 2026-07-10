import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';

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
});
