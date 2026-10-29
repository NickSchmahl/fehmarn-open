import { Disziplin, DISZIPLINEN } from '../../../shared/disziplin';
import { bereiteExportAuf, ExportMeldung } from './export-daten';
import {
  baueTurniertagListe,
  EINZEL_ERSTES_BLATT,
  EINZEL_FOLGEBLATT,
  HOEHE,
  LEERZEILEN,
  mitLeerzeilen,
  startgeld,
  teamZeilenAnzahl,
  teileInBlaetter,
  TurniertagBlatt,
  TurniertagZeile,
  zeilenHoehe,
} from './turniertag-blaetter';
import { gruppe, meldung, mitId, uebersicht, vieleEinzel } from './export-testdaten';

const ALLE = new Set<Disziplin>(DISZIPLINEN.map((d) => d.value));

function exportMeldung(nr: number, spielerAnzahl = 1): ExportMeldung {
  return {
    nr,
    teamName: spielerAnzahl > 1 ? `Team ${nr}` : null,
    anwesend: false,
    spieler: Array.from({ length: spielerAnzahl }, (_, i) => ({
      vorname: 'V',
      nachname: `N${i}`,
      radikalId: 'VN01011990',
      neu: false,
      initialen: null,
      geburtsdatum: null,
    })),
  };
}

function einzelBlaetter(spieler: number): TurniertagBlatt[] {
  const meldungen = Array.from({ length: spieler }, (_, i) => exportMeldung(i + 1));
  return teileInBlaetter(mitLeerzeilen(meldungen), false);
}

function anzahlZeilen(blatt: TurniertagBlatt): number {
  return blatt.spalten.reduce((summe, spalte) => summe + spalte.length, 0);
}

function spaltenHoehe(spalte: readonly TurniertagZeile[], istTeam: boolean): number {
  return spalte.reduce((summe, zeile) => summe + zeilenHoehe(zeile, istTeam), 0);
}

describe('mitLeerzeilen', () => {
  it('hängt 10 fortlaufend nummerierte Leerzeilen an', () => {
    const zeilen = mitLeerzeilen([exportMeldung(1), exportMeldung(2)]);

    expect(zeilen).toHaveLength(2 + LEERZEILEN);
    expect(zeilen.map((zeile) => zeile.nr)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(zeilen.slice(2).every((zeile) => zeile.meldung === null)).toBe(true);
  });

  it('liefert auch ohne Meldungen die 10 Leerzeilen', () => {
    expect(mitLeerzeilen([]).map((zeile) => zeile.nr)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('teileInBlaetter – Einzel (zweispaltig)', () => {
  it('passt 280 Spieler + 10 Leerzeilen auf 3 Blätter: 92, 102, Rest', () => {
    const blaetter = einzelBlaetter(280);

    expect(blaetter).toHaveLength(3);
    expect(blaetter.map(anzahlZeilen)).toEqual([EINZEL_ERSTES_BLATT, EINZEL_FOLGEBLATT, 96]);
  });

  it('braucht für 300 Spieler 4 Blätter', () => {
    expect(einzelBlaetter(300)).toHaveLength(4);
  });

  it('füllt volle Blätter je zur Hälfte links und rechts (Telefonbuch-Reihenfolge)', () => {
    const [erstes, zweites] = einzelBlaetter(280);

    expect(erstes.spalten.map((spalte) => spalte.length)).toEqual([46, 46]);
    expect(erstes.spalten[0]?.at(-1)?.nr).toBe(46);
    expect(erstes.spalten[1]?.at(0)?.nr).toBe(47);
    expect(zweites.spalten.map((spalte) => spalte.length)).toEqual([51, 51]);
  });

  it('teilt das letzte Blatt auf zwei etwa gleich hohe Spalten, Leerzeilen am Ende rechts', () => {
    const letztes = einzelBlaetter(280).at(-1);
    const [links = [], rechts = []] = letztes?.spalten ?? [];

    expect(Math.abs(spaltenHoehe(links, false) - spaltenHoehe(rechts, false))).toBeLessThanOrEqual(
      HOEHE.einzelLeer,
    );
    expect(spaltenHoehe(links, false)).toBeGreaterThanOrEqual(spaltenHoehe(rechts, false));
    expect(rechts.slice(-LEERZEILEN).every((zeile) => zeile.meldung === null)).toBe(true);
  });

  it('nummeriert durchgehend und nennt den Nummernbereich je Blatt', () => {
    const blaetter = einzelBlaetter(280);

    expect(blaetter.map((blatt) => [blatt.nummer, blatt.von, blatt.bis])).toEqual([
      [1, 1, 92],
      [2, 93, 194],
      [3, 195, 290],
    ]);
    const nummern = blaetter.flatMap((blatt) => blatt.spalten.flat().map((zeile) => zeile.nr));
    expect(nummern).toEqual(Array.from({ length: 290 }, (_, i) => i + 1));
  });

  it('lässt keine Spalte über ihr Höhenbudget laufen – auch wenn Leerzeilen ein Blatt füllen', () => {
    // 286 + 10 Leerzeilen = 296 = 92 + 102 + 102: hier würde eine starre Aufteilung überlaufen,
    // weil Leerzeilen höher sind als normale Zeilen.
    for (const spieler of [0, 9, 91, 92, 93, 194, 280, 286, 290, 300]) {
      einzelBlaetter(spieler).forEach((blatt) => {
        const budget = (blatt.nummer === 1 ? EINZEL_ERSTES_BLATT : EINZEL_FOLGEBLATT) / 2;
        blatt.spalten.forEach((spalte) => {
          expect(spaltenHoehe(spalte, false)).toBeLessThanOrEqual(budget * HOEHE.einzel);
        });
      });
    }
  });

  it('kommt für wenige Spieler mit einem Blatt aus', () => {
    const blaetter = einzelBlaetter(9);

    expect(blaetter).toHaveLength(1);
    expect(blaetter[0]?.spalten.map((spalte) => spalte.length)).toEqual([10, 9]);
  });
});

describe('teileInBlaetter – Team (einspaltig)', () => {
  function teamBlaetter(teams: number, spieler: number): TurniertagBlatt[] {
    const meldungen = Array.from({ length: teams }, (_, i) => exportMeldung(i + 1, spieler));
    return teileInBlaetter(mitLeerzeilen(meldungen), true);
  }

  it('nutzt eine Spalte je Blatt', () => {
    expect(teamBlaetter(8, 5).every((blatt) => blatt.spalten.length === 1)).toBe(true);
  });

  it('passt 8 Teams + 10 Leerzeilen auf ein Blatt', () => {
    expect(teamBlaetter(8, 5)).toHaveLength(1);
  });

  it('verteilt 96 Teams mit je 6 Spielern ohne Überlauf auf mehrere Blätter', () => {
    const blaetter = teamBlaetter(96, 6);
    const budget = (EINZEL_ERSTES_BLATT / 2) * HOEHE.einzel;

    expect(blaetter.length).toBeGreaterThan(1);
    blaetter.forEach((blatt) => {
      const max = blatt.nummer === 1 ? budget : (EINZEL_FOLGEBLATT / 2) * HOEHE.einzel;
      expect(spaltenHoehe(blatt.spalten[0] ?? [], true)).toBeLessThanOrEqual(max);
    });
    expect(blaetter.at(-1)?.bis).toBe(96 + LEERZEILEN);
  });
});

describe('teamZeilenAnzahl', () => {
  it('bricht ab 4 Spielern in eine zweite Zeile um', () => {
    expect(teamZeilenAnzahl(exportMeldung(1, 2))).toBe(1);
    expect(teamZeilenAnzahl(exportMeldung(1, 3))).toBe(1);
    expect(teamZeilenAnzahl(exportMeldung(1, 4))).toBe(2);
    expect(teamZeilenAnzahl(exportMeldung(1, 6))).toBe(2);
  });
});

describe('startgeld', () => {
  it('rechnet Spieler × Preis', () => {
    expect(startgeld(exportMeldung(1, 5), 10)).toBe(50);
    expect(startgeld(exportMeldung(1, 1), 0)).toBe(0);
  });
});

describe('baueTurniertagListe', () => {
  const daten = bereiteExportAuf(
    uebersicht(
      vieleEinzel('HERRENEINZEL', 3),
      gruppe('U18', [meldung([mitId('Kai', 'Jung', 'KJ01012012')])]),
      gruppe('TEAMWETTBEWERB', [
        meldung(
          Array.from({ length: 5 }, (_, i) => mitId('S', `T${i}`, 'ST01011990')),
          { teamName: 'Bullseye Boys' },
        ),
        meldung(
          Array.from({ length: 4 }, (_, i) => mitId('S', `U${i}`, 'SU01011990')),
          { teamName: 'Darts Vader', abgemeldet: true },
        ),
      ]),
    ),
  );

  it('ordnet die Disziplinen chronologisch nach dem Turnierablauf', () => {
    const liste = baueTurniertagListe(daten, ALLE, 96);

    expect(liste.map((eintrag) => eintrag.disziplin)).toEqual([
      'TEAMWETTBEWERB',
      'HERRENEINZEL',
      'DAMENEINZEL',
      'U18',
      'TRIPLE_MIX',
      'HERRENDOPPEL',
      'DAMENDOPPEL',
    ]);
  });

  it('enthält nur die gewählten Disziplinen', () => {
    const liste = baueTurniertagListe(daten, new Set<Disziplin>(['U18', 'HERRENEINZEL']), 96);
    expect(liste.map((eintrag) => eintrag.disziplin)).toEqual(['HERRENEINZEL', 'U18']);
  });

  it('druckt auch Disziplinen ohne Meldungen – mit den Leerzeilen für Nachmeldungen', () => {
    const damen = baueTurniertagListe(daten, new Set<Disziplin>(['DAMENEINZEL']), 96)[0];

    expect(damen.meldungen).toBe(0);
    expect(damen.blaetter).toHaveLength(1);
    expect(damen.blaetter[0]?.bis).toBe(LEERZEILEN);
  });

  it('berechnet Soll Kasse nur aus aktiven Meldungen, U18 kostenlos', () => {
    const liste = baueTurniertagListe(daten, ALLE, 96);
    const kasse = new Map(liste.map((eintrag) => [eintrag.disziplin, eintrag.sollKasse]));

    expect(kasse.get('TEAMWETTBEWERB')).toBe(50);
    expect(kasse.get('HERRENEINZEL')).toBe(30);
    expect(kasse.get('U18')).toBe(0);
  });

  it('zeigt das Teamlimit nur beim Teamwettbewerb', () => {
    const liste = baueTurniertagListe(daten, ALLE, 96);
    const limits = new Map(liste.map((eintrag) => [eintrag.disziplin, eintrag.maxMeldungen]));

    expect(limits.get('TEAMWETTBEWERB')).toBe(96);
    expect(limits.get('HERRENDOPPEL')).toBeNull();
  });

  it('übernimmt Tag, Meldeschluss und Beginn aus dem Flyer-Zeitplan', () => {
    const team = baueTurniertagListe(daten, new Set<Disziplin>(['TEAMWETTBEWERB']), null)[0];

    expect(team.zeitplan).toMatchObject({
      tag: 'Fr 05.03.',
      anmeldeschluss: '18:00',
      turnierbeginn: '19:00',
    });
    expect(team.maxMeldungen).toBeNull();
  });
});
