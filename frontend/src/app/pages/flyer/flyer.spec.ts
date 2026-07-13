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
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Dartverein Fehmarn e.V.');
    expect(text).toContain('12. Fehmarn Open');
    expect(text).toContain('05.–07. März 2027');
    expect(text).toContain('Teestube · Gahlendorfer Weg 25 · 23769 Fehmarn');
  });

  it('zeigt jede Disziplin mit Tag und 1.-Platz-Preisgeld', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent;
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

  it('zeigt im Querformat je weiterer Platzierung eine Tabellenzeile mit Werten', () => {
    const quer = (fixture.nativeElement as HTMLElement).querySelector('.flyer-quer') as HTMLElement;
    const rowheader = Array.from(quer.querySelectorAll('.flyer-tabelle-label')).map((el) =>
      el.textContent?.trim(),
    );
    expect(rowheader).toContain('2. Platz');
    expect(rowheader).toContain('13./16. Platz');
    // Team = 700 € auf Platz 2, Herreneinzel = 40 € auf Platz 13./16.
    expect(quer.textContent).toContain('700 €');
    expect(quer.textContent).toContain('40 €');
  });

  it('liefert Werte weiterer Platzierungen über preisFuer und leer bei fehlenden', () => {
    const team = component.zeilen.find((z) => z.value === 'TEAMWETTBEWERB')!;
    expect(component.preisFuer(team, '2.')).toBe('700 €');
    expect(component.preisFuer(team, '13./16.')).toBe(''); // Team hat keinen 13./16.
  });

  it('umschalten öffnet und schließt eine Disziplin unabhängig', () => {
    const team = component.zeilen.find((z) => z.value === 'TEAMWETTBEWERB')!;
    const herren = component.zeilen.find((z) => z.value === 'HERRENEINZEL')!;
    expect(component.istOffen(team)).toBe(false);
    component.umschalten(team);
    expect(component.istOffen(team)).toBe(true);
    expect(component.istOffen(herren)).toBe(false); // nur team offen
    component.umschalten(team);
    expect(component.istOffen(team)).toBe(false);
  });

  it('umschalten ist wirkungslos für Disziplinen ohne weitere Plätze', () => {
    const u18 = component.zeilen.find((z) => z.value === 'U18')!;
    component.umschalten(u18);
    expect(component.istOffen(u18)).toBe(false);
  });

  it('klappt eine Hochformat-Zeile per Klick auf und wieder zu', () => {
    const el = fixture.nativeElement as HTMLElement;
    const teamZeile = el.querySelector(
      '.flyer-hoch-liste [data-disziplin="TEAMWETTBEWERB"] .flyer-hoch-zeile',
    ) as HTMLElement;
    const container = el.querySelector(
      '.flyer-hoch-liste [data-disziplin="TEAMWETTBEWERB"]',
    ) as HTMLElement;

    // eingeklappt: keine weiteren Plätze im DOM, aria-expanded=false
    expect(container.querySelector('.flyer-hoch-weitere')).toBeNull();
    expect(teamZeile.getAttribute('aria-expanded')).toBe('false');

    teamZeile.click();
    fixture.detectChanges();
    const weitere = container.querySelector('.flyer-hoch-weitere') as HTMLElement;
    expect(weitere).not.toBeNull();
    expect(weitere.textContent).toContain('2. Platz');
    expect(weitere.textContent).toContain('700 €');
    expect(teamZeile.getAttribute('aria-expanded')).toBe('true');

    teamZeile.click();
    fixture.detectChanges();
    expect(container.querySelector('.flyer-hoch-weitere')).toBeNull();
    expect(teamZeile.getAttribute('aria-expanded')).toBe('false');
  });

  it('macht Disziplinen ohne weitere Plätze nicht klickbar (U18)', () => {
    const el = fixture.nativeElement as HTMLElement;
    const u18Zeile = el.querySelector(
      '.flyer-hoch-liste [data-disziplin="U18"] .flyer-hoch-zeile',
    ) as HTMLElement;
    expect(u18Zeile.hasAttribute('aria-expanded')).toBe(false);
    expect(u18Zeile.querySelector('.flyer-hoch-chevron')).toBeNull();
    u18Zeile.click();
    fixture.detectChanges();
    expect(
      el.querySelector('.flyer-hoch-liste [data-disziplin="U18"] .flyer-hoch-weitere'),
    ).toBeNull();
  });

  it('enthält keinen QR-Code-Platzhalter', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.qr-code')).toBeNull();
    expect(element.textContent.toLowerCase()).not.toContain('qr-code');
  });
});
