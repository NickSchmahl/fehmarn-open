import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Export } from './export';
import { ToastService } from '../../core/services/toast.service';
import { DateiDownloadService } from '../../core/services/datei-download.service';
import { gruppe, meldung, mitId, ohneId, uebersicht } from './logik/export-testdaten';

const ADMIN_URL = '/api/admin/teilnehmer';
const STATUS_URL = '/api/anmeldung/status';

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
    http.expectOne(STATUS_URL).flush({ teamwettbewerbAusgebucht: false, maxTeams: 96 });
  });

  afterEach(() => {
    http.verify();
    jest.useRealTimers();
    jest.restoreAllMocks();
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

  describe('CSV-Karte', () => {
    function csvKarte(): HTMLElement {
      const karte = Array.from(element.querySelectorAll<HTMLElement>('app-export-karte')).find(
        (eintrag) => eintrag.textContent.includes('Meldungen als CSV'),
      );
      if (!karte) {
        throw new Error('CSV-Karte fehlt');
      }
      return karte;
    }

    it('zeigt Kopfzeile, die ersten drei Zeilen und die Zeilenzahl', () => {
      laden();

      const vorschau = Array.from(csvKarte().querySelectorAll('.csv-vorschau code'), (code) =>
        code.textContent.trim(),
      );
      expect(vorschau).toEqual([
        'disziplin;disziplin_name;meldung_nr;team;nachname;vorname;radikal_id;id_status;initialen;geburtsdatum',
        'HERRENEINZEL;Herreneinzel;1;;Albers;Jonas;JA14021991;vorhanden;;',
        'HERRENEINZEL;Herreneinzel;2;;Claussen;Henrik;HC22111979;neu;HC;1979-11-22',
        'HERRENDOPPEL;Herrendoppel;1;Hafenkante;Kühl;Marco;MK19041977;vorhanden;;',
        '…',
      ]);
      expect(csvKarte().querySelector('.format-badges')?.textContent).toContain('4 Zeilen');
    });

    it('lädt die vollständige CSV mit datiertem Dateinamen herunter', () => {
      const download = TestBed.inject(DateiDownloadService);
      const herunterladen = jest.spyOn(download, 'herunterladen').mockImplementation(() => {});
      laden();

      csvKarte().querySelector<HTMLButtonElement>('button')?.click();

      expect(herunterladen).toHaveBeenCalledTimes(1);
      const [inhalt, dateiname, mimeTyp] = herunterladen.mock.calls[0];
      expect(dateiname).toBe('fehmarn-open-2027_radikal_2026-10-28.csv');
      expect(mimeTyp).toBe('text/csv;charset=utf-8');
      expect(inhalt.startsWith('\uFEFFdisziplin;')).toBe(true);
      expect(inhalt.trimEnd().split('\r\n')).toHaveLength(5);
    });

    it('sperrt den Download, wenn es keine aktiven Meldungen gibt', () => {
      http.expectOne(ADMIN_URL).flush(uebersicht());
      fixture.detectChanges();

      expect(csvKarte().querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
    });
  });

  describe('Druck', () => {
    let drucken: jest.SpyInstance;

    beforeEach(() => {
      // jsdom kennt keinen Druckdialog.
      drucken = jest.spyOn(window, 'print').mockImplementation(() => {});
    });

    function radikalKarte(): HTMLElement {
      const karte = Array.from(element.querySelectorAll<HTMLElement>('app-export-karte')).find(
        (eintrag) => eintrag.textContent.includes('Meldeliste für Radikal'),
      );
      if (!karte) {
        throw new Error('Radikal-Karte fehlt');
      }
      return karte;
    }

    it('rendert die Druckansicht erst beim Drucken und öffnet dann den Druckdialog', () => {
      laden();
      expect(element.querySelector('.druck-bereich')).toBeNull();

      radikalKarte().querySelector<HTMLButtonElement>('button')?.click();
      fixture.detectChanges();

      expect(element.querySelector('.druck-bereich app-radikal-druck')).not.toBeNull();
      expect(drucken).toHaveBeenCalledTimes(1);
    });

    it('lässt die Druckansicht nach dem Druck stehen und wechselt beim nächsten Druckauftrag', () => {
      laden();
      radikalKarte().querySelector<HTMLButtonElement>('button')?.click();
      fixture.detectChanges();

      // afterprint feuert auf Mobilgeräten evtl. vor dem Snapshot – darf nichts abbauen.
      window.dispatchEvent(new Event('afterprint'));
      fixture.detectChanges();
      expect(element.querySelector('.druck-bereich app-radikal-druck')).not.toBeNull();

      element.querySelector<HTMLButtonElement>('.btn--primaer')?.click();
      fixture.detectChanges();
      expect(element.querySelector('.druck-bereich app-radikal-druck')).toBeNull();
      expect(element.querySelector('.druck-bereich app-turniertag-druck')).not.toBeNull();
      expect(drucken).toHaveBeenCalledTimes(2);
    });

    it('reicht die Option „nur neue IDs" an die Meldeliste weiter', () => {
      laden();
      const option = radikalKarte().querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (!option) {
        throw new Error('Option fehlt');
      }
      option.click();
      radikalKarte().querySelector<HTMLButtonElement>('button')?.click();
      fixture.detectChanges();

      expect(element.querySelector('app-radikal-druck .kopf')?.textContent).toContain(
        'nur Spieler mit neuer Radikal-ID',
      );
    });
  });

  describe('Turniertag-Karte', () => {
    function turniertagKarte(): HTMLElement {
      const karte = element.querySelector<HTMLElement>('app-export-karte');
      if (!karte?.textContent.includes('Turniertag-Liste')) {
        throw new Error('Turniertag-Karte fehlt');
      }
      return karte;
    }

    function chips(): { text: string; an: boolean }[] {
      return Array.from(turniertagKarte().querySelectorAll('.chip'), (chip) => ({
        text: chip.textContent.replace(/\s+/g, ' ').trim(),
        an: chip.getAttribute('aria-pressed') === 'true',
      }));
    }

    function chip(text: string): HTMLButtonElement {
      const treffer = Array.from(
        turniertagKarte().querySelectorAll<HTMLButtonElement>('.chip'),
      ).find((eintrag) => eintrag.textContent.includes(text));
      if (!treffer) {
        throw new Error(`Chip ${text} fehlt`);
      }
      return treffer;
    }

    function druckButton(): HTMLButtonElement {
      const button = turniertagKarte().querySelector<HTMLButtonElement>('.btn--primaer');
      if (!button) {
        throw new Error('Druck-Button fehlt');
      }
      return button;
    }

    it('zeigt chronologische Disziplin-Chips mit Tag und Anzahl, Standard: alle gewählt', () => {
      laden();

      expect(chips()).toEqual([
        { text: 'Alle', an: true },
        { text: 'Fr · Teamwettbewerb 0', an: true },
        { text: 'Sa · Herreneinzel 2', an: true },
        { text: 'Sa · Dameneinzel 0', an: true },
        { text: 'Sa · U18-Turnier 0', an: true },
        { text: 'Sa · Triple Mix 0', an: true },
        { text: 'So · Herrendoppel 1', an: true },
        { text: 'So · Damendoppel 0', an: true },
      ]);
      expect(turniertagKarte().querySelector('.hinweis-klein')?.textContent).toContain('7 Blätter');
    });

    it('schaltet einzelne Disziplinen und über „Alle" alle bzw. keine um', () => {
      laden();

      chip('Herreneinzel').click();
      fixture.detectChanges();
      expect(chips().find((c) => c.text.includes('Herreneinzel'))?.an).toBe(false);
      expect(chips()[0]?.an).toBe(false);

      chip('Alle').click();
      fixture.detectChanges();
      expect(chips().every((c) => c.an)).toBe(true);

      chip('Alle').click();
      fixture.detectChanges();
      expect(chips().some((c) => c.an)).toBe(false);
      expect(druckButton().disabled).toBe(true);
      expect(turniertagKarte().querySelector('.hinweis-klein')?.textContent).toContain(
        'Mindestens eine Disziplin',
      );
    });

    it('druckt nur die gewählten Disziplinen mit Teamlimit und den gewählten Optionen', () => {
      const drucken = jest.spyOn(window, 'print').mockImplementation(() => {});
      laden();
      chip('Alle').click();
      chip('Herreneinzel').click();
      chip('Teamwettbewerb').click();
      const [vorankreuzen, ohneId] = Array.from(
        turniertagKarte().querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
      );
      expect(vorankreuzen.checked).toBe(true);
      expect(ohneId.checked).toBe(false);
      ohneId.click();

      druckButton().click();
      fixture.detectChanges();

      const druck = element.querySelector('.druck-bereich app-turniertag-druck');
      expect(drucken).toHaveBeenCalledTimes(1);
      expect(Array.from(druck?.querySelectorAll('.blatt h1') ?? [], (h) => h.textContent)).toEqual([
        'Teamwettbewerb',
        'Herreneinzel',
      ]);
      expect(druck?.querySelector('.kennzahl .von')?.textContent).toContain('/ 96');
      expect(druck?.querySelector('th.id')).toBeNull();
    });
  });
});
