import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FUSS_VARIABLE, RadikalDruckComponent } from './radikal-druck.component';
import { bereiteExportAuf } from '../logik/export-daten';
import { radikalZeilen } from '../logik/radikal-zeilen';
import { gruppe, meldung, mitId, ohneId, uebersicht } from '../logik/export-testdaten';

const ZEILEN = radikalZeilen(
  bereiteExportAuf(
    uebersicht(
      gruppe('HERRENEINZEL', [
        meldung([mitId('Jonas', 'Albers', 'JA14021991')]),
        meldung([ohneId('Henrik', 'Claussen', 'HC', '1979-11-22')]),
      ]),
      gruppe('HERRENDOPPEL', [
        meldung(
          [mitId('Marco', 'Kühl', 'MK19041977'), ohneId('Hauke', 'Nissen', 'HN', '1981-11-11')],
          { teamName: 'Hafenkante' },
        ),
      ]),
    ),
  ),
);

describe('RadikalDruckComponent', () => {
  let fixture: ComponentFixture<RadikalDruckComponent>;
  let element: HTMLElement;

  function rendern(nurNeue = false): void {
    fixture = TestBed.createComponent(RadikalDruckComponent);
    fixture.componentRef.setInput('zeilen', ZEILEN);
    fixture.componentRef.setInput('stand', new Date(2026, 9, 28, 14, 32));
    fixture.componentRef.setInput('nurNeue', nurNeue);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  /** Je Tabellenzeile die Zellinhalte, mit Leerzeichen verbunden. */
  function zeilen(selektor: string): string[] {
    return Array.from(element.querySelectorAll(selektor), (tr) =>
      Array.from(tr.children, (zelle) => zelle.textContent.trim()).join(' '),
    );
  }

  function text(selektor: string): string[] {
    return Array.from(element.querySelectorAll(selektor), (el) =>
      el.textContent.replace(/\s+/g, ' ').trim(),
    );
  }

  it('zeigt Kopf mit Turnier, Umfang und Export-Zeitstempel', () => {
    rendern();
    expect(text('.kopf p')[0]).toBe(
      '12. Fehmarn Open 2027 · 05.–07. März 2027 · alle aktiven Meldungen',
    );
    expect(text('.meta')[0]).toBe('Export 2026-10-28 14:32');
  });

  it('zeigt die Übersicht je Disziplin mit Summenzeile', () => {
    rendern();
    expect(zeilen('.summe tbody tr')).toEqual([
      'Herreneinzel HERRENEINZEL 2 2 1',
      'Dameneinzel DAMENEINZEL 0 0 0',
      'Herrendoppel HERRENDOPPEL 1 2 1',
      'Damendoppel DAMENDOPPEL 0 0 0',
      'Triple Mix TRIPLE_MIX 0 0 0',
      'Teamwettbewerb TEAMWETTBEWERB 0 0 0',
      'U18-Turnier U18 0 0 0',
    ]);
    expect(zeilen('.summe tfoot tr')[0]).toBe('Gesamt  3 4 2');
  });

  it('enthält keine Ankreuz- oder Kassenfelder und keinen Anmeldezeitpunkt', () => {
    rendern();
    expect(element.querySelector('input, .box')).toBeNull();
    expect(element.textContent).not.toMatch(/Bezahlt|Anwesend|Kasse|angemeldet am/i);
  });

  it('markiert NEU-Spieler und zeigt das Geburtsdatum nur bei ihnen', () => {
    rendern();
    expect(zeilen('.liste tbody tr')).toEqual([
      '1 Albers Jonas JA14021991 VORHANDEN –',
      '2 Claussen Henrik HC22111979 NEU 1979-11-22',
      '1.1 Hafenkante Kühl Marco MK19041977 VORHANDEN –',
      '1.2 〃 Nissen Hauke HN11111981 NEU 1981-11-11',
    ]);
    expect(element.querySelectorAll('.status--neu')).toHaveLength(3); // 2 Spieler + Legende
  });

  it('zeigt die Team-Spalte nur bei Team-Disziplinen', () => {
    rendern();
    const koepfe = Array.from(element.querySelectorAll('.liste thead tr'), (tr) =>
      tr.textContent.includes('Team'),
    );
    expect(koepfe).toEqual([false, true]);
  });

  it('zeigt mit „nur neue" nur Spieler ohne Radikal-ID', () => {
    rendern(true);
    expect(text('.kopf p')[0]).toContain('nur Spieler mit neuer Radikal-ID');
    expect(zeilen('.liste tbody tr')).toEqual([
      '2 Claussen Henrik HC22111979 NEU 1979-11-22',
      '1.2 Hafenkante Nissen Hauke HN11111981 NEU 1981-11-11',
    ]);
  });

  it('setzt den Fußzeilen-Text für @page am Wurzelelement und räumt ihn wieder ab', () => {
    rendern();
    expect(document.documentElement.style.getPropertyValue(FUSS_VARIABLE)).toBe(
      '"fehmarn-open · Radikal-Meldeliste · Stand 2026-10-28 14:32"',
    );
    fixture.destroy();
    expect(document.documentElement.style.getPropertyValue(FUSS_VARIABLE)).toBe('');
  });
});
