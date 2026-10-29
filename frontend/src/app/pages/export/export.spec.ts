import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Export } from './export';
import { ToastService } from '../../core/services/toast.service';
import { gruppe, meldung, mitId, ohneId, uebersicht } from './logik/export-testdaten';

const ADMIN_URL = '/api/admin/teilnehmer';

const DATEN = uebersicht(
  gruppe('HERRENEINZEL', [
    meldung([mitId('Jonas', 'Albers', 'JA14021991')]),
    meldung([ohneId('Henrik', 'Claussen', 'HC', '1979-11-22')]),
    meldung([mitId('Malte', 'Brandt', 'MB03071985')], { abgemeldet: true }),
  ]),
  gruppe('HERRENDOPPEL', [
    meldung([mitId('Marco', 'Kühl', 'MK19041977'), ohneId('Hauke', 'Nissen', 'HN', '1981-11-11')], {
      teamName: 'Hafenkante',
    }),
  ]),
);

describe('Export', () => {
  let fixture: ComponentFixture<Export>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 28, 14, 32) });
    await TestBed.configureTestingModule({
      imports: [Export],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Export);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    jest.useRealTimers();
  });

  function laden(): void {
    http.expectOne(ADMIN_URL).flush(DATEN);
    fixture.detectChanges();
  }

  function standChips(): string[] {
    return Array.from(element.querySelectorAll('.stand-chips li'), (li) =>
      li.textContent.replace(/\s+/g, ' ').trim(),
    );
  }

  it('zeigt beim Laden einen Ladezustand', () => {
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Wird geladen');
    laden();
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('zeigt die Kennzahlen zum geladenen Stand', () => {
    laden();

    expect(standChips()).toEqual([
      '3 aktive Meldungen',
      '4 Spieler',
      '2 neue Radikal-IDs',
      '1 abgemeldet',
      'Stand 28.10.2026, 14:32',
    ]);
  });

  it('zeigt die drei Export-Karten in zwei Bereichen, Turniertag zuerst', () => {
    laden();

    const bereiche = Array.from(element.querySelectorAll('.bereich h2'), (h) => h.textContent);
    expect(bereiche).toEqual(['Für den Turniertag', 'Für Radikal']);
    const karten = Array.from(element.querySelectorAll('app-export-karte h3'), (h) =>
      h.textContent.trim(),
    );
    expect(karten).toEqual(['Turniertag-Liste', 'Meldungen als CSV', 'Meldeliste für Radikal']);
    expect(element.querySelector('.karte--haupt h3')?.textContent).toContain('Turniertag-Liste');
  });

  it('zeigt einen Fehler mit erneutem Versuch, wenn das Laden scheitert', () => {
    http.expectOne(ADMIN_URL).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    const alert = element.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('konnten nicht geladen werden');

    alert?.querySelector('button')?.click();
    laden();
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(standChips()[0]).toBe('3 aktive Meldungen');
  });

  it('aktualisiert den Stand auf Knopfdruck', () => {
    laden();
    jest.setSystemTime(new Date(2026, 9, 28, 15, 0));

    const button = element.querySelector<HTMLButtonElement>('.stand button');
    button?.click();
    fixture.detectChanges();
    expect(button?.disabled).toBe(true);
    laden();

    expect(standChips().at(-1)).toBe('Stand 28.10.2026, 15:00');
  });

  it('behält beim gescheiterten Aktualisieren den alten Stand und meldet es per Toast', () => {
    const toast = TestBed.inject(ToastService);
    const show = jest.spyOn(toast, 'show');
    laden();

    element.querySelector<HTMLButtonElement>('.stand button')?.click();
    http.expectOne(ADMIN_URL).flush(null, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(standChips().at(-1)).toBe('Stand 28.10.2026, 14:32');
    expect(show).toHaveBeenCalledWith(expect.stringContaining('Stand 28.10.2026, 14:32'));
  });
});
