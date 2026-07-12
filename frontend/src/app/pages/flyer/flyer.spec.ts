import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Flyer } from './flyer';
import { FLYER_TURNIER } from '../../shared/flyer-zeitplan';

describe('Flyer', () => {
  let component: Flyer;
  let fixture: ComponentFixture<Flyer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Flyer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Flyer);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stellt die Turnier-Eckdaten bereit', () => {
    expect(component.turnier).toBe(FLYER_TURNIER);
  });

  it('stellt alle sieben Disziplin-Zeilen bereit', () => {
    expect(component.zeilen).toHaveLength(7);
    expect(component.zeilen[0].label).toBe('Teamwettbewerb');
  });

  it('zeigt Vereinsname, Titel, Termin und Ort', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dartverein Fehmarn e.V.');
    expect(text).toContain('12. Fehmarn Open');
    expect(text).toContain('05.–07. März 2027');
    expect(text).toContain('Teestube · Gahlendorfer Weg 25 · 23769 Fehmarn');
  });

  it('zeigt jede Disziplin mit Tag und 1.-Platz-Preisgeld', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const zeile of component.zeilen) {
      expect(text).toContain(zeile.label);
      expect(text).toContain(zeile.tag);
      expect(text).toContain(zeile.ersterPlatz);
    }
  });

  it('verlinkt den Anmelde-Aufruf per RouterLink auf /anmeldung', () => {
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('.flyer-cta');
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link.getAttribute('href')).toBe('/anmeldung');
    });
  });

  it('enthält keinen QR-Code-Platzhalter', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.qr-code')).toBeNull();
    expect((element.textContent ?? '').toLowerCase()).not.toContain('qr-code');
  });
});
