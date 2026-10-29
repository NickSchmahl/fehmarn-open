import { ComponentFixture, TestBed } from '@angular/core/testing';

import { euro, TurniertagDruckComponent } from './turniertag-druck.component';
import { Disziplin } from '../../../shared/disziplin';
import { bereiteExportAuf } from '../logik/export-daten';
import { baueTurniertagListe, LEERZEILEN } from '../logik/turniertag-blaetter';
import { gruppe, meldung, mitId, ohneId, uebersicht, vieleEinzel } from '../logik/export-testdaten';

const DATEN = bereiteExportAuf(
  uebersicht(
    gruppe('HERRENEINZEL', [
      meldung([mitId('Jonas', 'Albers', 'JA14021991')], { anwesend: true }),
      meldung([ohneId('Henrik', 'Claussen', 'HC', '1979-11-22')]),
      meldung([mitId('Malte', 'Brandt', 'MB03071985')], { abgemeldet: true }),
    ]),
    gruppe('U18', [meldung([mitId('Kai', 'Jung', 'KJ01012012')])]),
    gruppe('TEAMWETTBEWERB', [
      meldung(
        [
          mitId('Rainer', 'Wulf', 'RW15091984'),
          mitId('Rainer', 'Möller', 'RM16072001'),
          mitId('Florian', 'Hein', 'FH25081995'),
          mitId('Finn', 'Oldenburg', 'FO11071988'),
          ohneId('Jan', 'Neve', 'JN', '1969-08-12'),
        ],
        { teamName: 'Bullseye Boys', anwesend: true },
      ),
    ]),
  ),
);

describe('euro', () => {
  it('formatiert mit Tausenderpunkt', () => {
    expect(euro(2800)).toBe('2.800 €');
    expect(euro(0)).toBe('0 €');
  });
});

describe('TurniertagDruckComponent', () => {
  let fixture: ComponentFixture<TurniertagDruckComponent>;
  let element: HTMLElement;

  function rendern(
    auswahl: Disziplin[],
    optionen: { vorankreuzen?: boolean; aushang?: boolean; maxTeams?: number | null } = {},
    daten = DATEN,
  ): void {
    fixture = TestBed.createComponent(TurniertagDruckComponent);
    fixture.componentRef.setInput(
      'disziplinen',
      baueTurniertagListe(
        daten,
        new Set(auswahl),
        'maxTeams' in optionen ? (optionen.maxTeams ?? null) : 96,
      ),
    );
    fixture.componentRef.setInput('stand', new Date(2026, 9, 28, 14, 32));
    fixture.componentRef.setInput('anwesenheitVorankreuzen', optionen.vorankreuzen ?? true);
    fixture.componentRef.setInput('aushang', optionen.aushang ?? false);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  /** Sichtbarer Text je Treffer; Textknoten mit Leerzeichen verbunden (wie im Druck). */
  function text(selektor: string, wurzel: ParentNode = element): string[] {
    return Array.from(wurzel.querySelectorAll(selektor), (el) => {
      const teile: string[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        teile.push(walker.currentNode.textContent ?? '');
      }
      return teile
        .map((teil) => teil.trim())
        .filter((teil) => teil !== '')
        .join(' ')
        .replace(/ ,/g, ',');
    });
  }

  it('rendert je Disziplin eigene Blätter mit Kopf, Stand und Blattzähler', () => {
    rendern(['HERRENEINZEL', 'U18']);

    expect(text('.blatt h1')).toEqual(['Herreneinzel', 'U18-Turnier']);
    expect(text('.kopf-rechts')[0]).toBe(
      'Turniertag-Liste Stand 28.10.2026, 14:32 Uhr Herreneinzel · Blatt 1 von 1',
    );
    expect(element.querySelector('.kopf app-brand-icon')).not.toBeNull();
  });

  it('zeigt Chips aus dem Flyer-Zeitplan und die Kennzahlen', () => {
    rendern(['HERRENEINZEL']);

    expect(text('.chip')).toEqual([
      'Sa 06.03.',
      'Meldeschluss vor Ort 10:00',
      'Beginn 11:00',
      '501 · Bo3',
      '10 € / Spieler',
    ]);
    expect(text('.kennzahl')).toEqual(['2 Meldungen', 'Anwesend', '20 € Soll Kasse']);
  });

  it('zeigt U18 als frei mit 0 € Soll Kasse', () => {
    rendern(['U18']);

    expect(text('.chip')).toContain('Startgeld frei');
    expect(text('.kennzahl').at(-1)).toBe('0 € Soll Kasse');
  });

  it('listet Einzel als „Nachname, Vorname" mit ID, N-Marke und ohne Abgemeldete', () => {
    rendern(['HERRENEINZEL']);

    const zeilen = text('table.einzel tbody tr:not(.leer)');
    expect(zeilen).toEqual(['1 Albers, Jonas JA14021991', '2 Claussen, Henrik HC22111979 N']);
    expect(element.textContent).not.toContain('Brandt');
  });

  it('hängt 10 nummerierte Leerzeilen mit Kästchen an', () => {
    rendern(['HERRENEINZEL']);

    const leer = element.querySelectorAll('table.einzel tbody tr.leer');
    expect(leer).toHaveLength(LEERZEILEN);
    expect(text('td.nr', leer[0])[0]).toBe('3');
    expect(leer[0].querySelectorAll('.box')).toHaveLength(2);
  });

  it('kreuzt erfasste Anwesenheit vor, Bezahlt bleibt immer leer', () => {
    rendern(['HERRENEINZEL']);
    const ersteZeile = element.querySelector('table.einzel tbody tr');
    const [anwesend, bezahlt] = Array.from(ersteZeile?.querySelectorAll('.box') ?? []);

    expect(anwesend.classList.contains('an')).toBe(true);
    expect(bezahlt.classList.contains('an')).toBe(false);
  });

  it('lässt ohne Option „vorankreuzen" alle Kästchen leer', () => {
    rendern(['HERRENEINZEL', 'TEAMWETTBEWERB'], { vorankreuzen: false });

    expect(element.querySelector('.box.an')).toBeNull();
    expect(text('.fuss')[0]).not.toContain('digital erfasst');
  });

  it('zeigt Teams mit Spielern, IDs, Startgeld samt Rechenweg und Teamlimit', () => {
    rendern(['TEAMWETTBEWERB']);

    const zeile = element.querySelector('table.team tbody tr');
    expect(zeile?.querySelector('.team-name')?.textContent).toBe('Bullseye Boys');
    expect(text('.team-spieler span', zeile ?? element)).toHaveLength(5);
    expect(text('.team-spieler span', zeile ?? element).at(-1)).toBe('Jan Neve JN12081969 N');
    expect(text('.geld', zeile ?? element)[0]).toBe('50 € 5 × 10');
    expect(zeile?.classList.contains('z2')).toBe(true);
    expect(text('.kennzahl')[0]).toBe('1 / 96 Teams');
  });

  it('zeigt ohne bekanntes Teamlimit nur die Anzahl', () => {
    rendern(['TEAMWETTBEWERB'], { maxTeams: null });
    expect(text('.kennzahl')[0]).toBe('1 Teams');
  });

  describe('Aushang-Variante', () => {
    beforeEach(() => {
      rendern(['HERRENEINZEL', 'TEAMWETTBEWERB'], { aushang: true });
    });

    it('lässt die ID-Spalte, IDs und N-Marken weg', () => {
      expect(element.querySelector('th.id, td.id, code, .neu')).toBeNull();
      expect(element.textContent).not.toContain('JA14021991');
    });

    it('lässt alle Kästchen weg – auch bei erfasster Anwesenheit und in den Leerzeilen', () => {
      expect(element.querySelector('.box, .box-zelle')).toBeNull();
    });

    it('lässt Startgeld, Soll Kasse und den Anwesend-Kasten weg, behält die Meldungszahl', () => {
      expect(element.querySelector('.geld')).toBeNull();
      expect(text('.kennzahl')).toEqual(['1 / 96 Teams', '2 Meldungen']);
      expect(element.textContent).not.toMatch(/Soll Kasse|Startgeld \d/);
    });

    it('lässt die Unterschriftsfelder weg', () => {
      expect(element.querySelector('.unterschrift')).toBeNull();
    });

    it('heißt im Kopf „Teilnehmerliste" statt „Turniertag-Liste"', () => {
      expect(text('.kopf-rechts strong')[0]).toBe('Teilnehmerliste');
    });

    it('nennt im Fuß nur Sortierung und Nummernbereich', () => {
      expect(text('.fuss')[0]).toBe('Sortiert nach Teamname · Nr. 1–11');
    });
  });

  it('zeigt auf Folgeblättern nur die schmale Fortsetzungszeile', () => {
    const viele = bereiteExportAuf(uebersicht(vieleEinzel('HERRENEINZEL', 280)));
    rendern(['HERRENEINZEL'], {}, viele);

    const blaetter = element.querySelectorAll('.blatt');
    expect(blaetter).toHaveLength(3);
    expect(blaetter[0].querySelector('.disziplin')).not.toBeNull();
    expect(text('.fortsetzung', blaetter[1])[0]).toBe(
      'Herreneinzel Fortsetzung · Sa 06.03. · Meldeschluss 10:00 · 10 € / Spieler',
    );
    expect(blaetter[1].querySelector('.disziplin')).toBeNull();
  });

  it('zeigt Unterschriftsfelder nur auf dem letzten Blatt einer Disziplin, Nummernbereich im Fuß', () => {
    const viele = bereiteExportAuf(uebersicht(vieleEinzel('HERRENEINZEL', 280)));
    rendern(['HERRENEINZEL'], {}, viele);

    const blaetter = Array.from(element.querySelectorAll('.blatt'));
    expect(blaetter.map((blatt) => blatt.querySelector('.unterschrift') !== null)).toEqual([
      false,
      false,
      true,
    ]);
    expect(text('.fuss', blaetter[0] ?? element)[0]).toContain('Nr. 1–92');
    expect(text('.fuss', blaetter[2] ?? element)[0]).toContain('Nr. 195–290');
  });
});
