import { DISZIPLINEN } from '../../../shared/disziplin';
import { anzahlNeueIds, anzahlSpieler, bereiteExportAuf, ExportDisziplin } from './export-daten';
import { gruppe, meldung, mitId, ohneId, uebersicht } from './export-testdaten';

function disziplin(daten: ExportDisziplin[], wert: string): ExportDisziplin {
  const treffer = daten.find((eintrag) => eintrag.disziplin === wert);
  if (!treffer) {
    throw new Error(`Disziplin ${wert} fehlt`);
  }
  return treffer;
}

describe('bereiteExportAuf', () => {
  it('liefert alle Disziplinen in DISZIPLINEN-Reihenfolge, auch ohne Meldungen', () => {
    const daten = bereiteExportAuf(uebersicht());

    expect(daten.map((eintrag) => eintrag.disziplin)).toEqual(DISZIPLINEN.map((d) => d.value));
    expect(daten.every((eintrag) => eintrag.meldungen.length === 0)).toBe(true);
  });

  it('übernimmt Label, Team-Kennzeichen und Preis aus DISZIPLINEN', () => {
    const daten = bereiteExportAuf(uebersicht());

    expect(disziplin(daten, 'HERRENDOPPEL')).toMatchObject({
      label: 'Herrendoppel',
      istTeam: true,
      preisProSpieler: 10,
    });
    expect(disziplin(daten, 'U18')).toMatchObject({ istTeam: false, preisProSpieler: 0 });
  });

  it('lässt abgemeldete Meldungen weg', () => {
    const daten = bereiteExportAuf(
      uebersicht(
        gruppe('HERRENEINZEL', [
          meldung([mitId('Jonas', 'Albers', 'JA14021991')]),
          meldung([mitId('Malte', 'Brandt', 'MB03071985')], { abgemeldet: true }),
        ]),
      ),
    );

    const namen = disziplin(daten, 'HERRENEINZEL').meldungen.map((m) => m.spieler[0]?.nachname);
    expect(namen).toEqual(['Albers']);
  });

  it('sortiert Einzel nach Nachname, dann Vorname, Umlaute wie im Telefonbuch', () => {
    const daten = bereiteExportAuf(
      uebersicht(
        gruppe('HERRENEINZEL', [
          meldung([mitId('Sven', 'Nissen', 'SN01011990')]),
          meldung([mitId('Uwe', 'Möller', 'UM01011990')]),
          meldung([mitId('Kim', 'Ahrens', 'KA01011990')]),
          meldung([mitId('Heiko', 'Ahrens', 'HA01011990')]),
          meldung([mitId('Jan', 'Moller', 'JM01011990')]),
        ]),
      ),
    );

    const namen = disziplin(daten, 'HERRENEINZEL').meldungen.map(
      (m) => `${m.spieler[0]?.nachname ?? ''}, ${m.spieler[0]?.vorname ?? ''}`,
    );
    expect(namen).toEqual([
      'Ahrens, Heiko',
      'Ahrens, Kim',
      'Moller, Jan',
      'Möller, Uwe',
      'Nissen, Sven',
    ]);
  });

  it('sortiert Team-Disziplinen nach Teamname, unabhängig von den Spielern', () => {
    const daten = bereiteExportAuf(
      uebersicht(
        gruppe('HERRENDOPPEL', [
          meldung([mitId('A', 'Aal', 'AA01011990'), mitId('B', 'Bär', 'BB01011990')], {
            teamName: 'Zielwasser',
          }),
          meldung([mitId('Y', 'Zander', 'YZ01011990'), mitId('Z', 'Zorn', 'ZZ01011990')], {
            teamName: 'Hafenkante',
          }),
        ]),
      ),
    );

    expect(disziplin(daten, 'HERRENDOPPEL').meldungen.map((m) => m.teamName)).toEqual([
      'Hafenkante',
      'Zielwasser',
    ]);
  });

  it('nummeriert je Disziplin ab 1 in Sortierreihenfolge', () => {
    const daten = bereiteExportAuf(
      uebersicht(
        gruppe('DAMENEINZEL', [
          meldung([mitId('Anna', 'Zeller', 'AZ01011990')]),
          meldung([mitId('Berta', 'Adam', 'BA01011990')]),
        ]),
      ),
    );

    expect(
      disziplin(daten, 'DAMENEINZEL').meldungen.map((m) => [m.nr, m.spieler[0]?.nachname]),
    ).toEqual([
      [1, 'Adam'],
      [2, 'Zeller'],
    ]);
  });

  it('bildet die Anzeige-ID und behält Initialen + Geburtsdatum nur bei neuen IDs', () => {
    const daten = bereiteExportAuf(
      uebersicht(
        gruppe('HERRENDOPPEL', [
          meldung(
            [mitId('Marco', 'Kühl', 'MK19041977'), ohneId('Hauke', 'Nissen', 'HN', '1981-11-11')],
            { teamName: 'Hafenkante' },
          ),
        ]),
      ),
    );

    expect(disziplin(daten, 'HERRENDOPPEL').meldungen[0]?.spieler).toEqual([
      {
        vorname: 'Marco',
        nachname: 'Kühl',
        radikalId: 'MK19041977',
        neu: false,
        initialen: null,
        geburtsdatum: null,
      },
      {
        vorname: 'Hauke',
        nachname: 'Nissen',
        radikalId: 'HN11111981',
        neu: true,
        initialen: 'HN',
        geburtsdatum: '1981-11-11',
      },
    ]);
  });

  it('übernimmt den Anwesenheitsstatus je Meldung', () => {
    const daten = bereiteExportAuf(
      uebersicht(
        gruppe('HERRENEINZEL', [meldung([mitId('A', 'A', 'AA01011990')], { anwesend: true })]),
      ),
    );

    expect(disziplin(daten, 'HERRENEINZEL').meldungen[0]?.anwesend).toBe(true);
  });

  it('mutiert die Eingabe nicht', () => {
    const meldungen = [
      meldung([mitId('B', 'Bär', 'BB01011990')]),
      meldung([mitId('A', 'Aal', 'AA01011990')]),
    ];
    const eingabe = uebersicht(gruppe('HERRENEINZEL', meldungen));
    const reihenfolgeVorher = eingabe.disziplinen[0]?.meldungen.map((m) => m.id);

    bereiteExportAuf(eingabe);

    expect(eingabe.disziplinen[0]?.meldungen.map((m) => m.id)).toEqual(reihenfolgeVorher);
  });
});

describe('anzahlSpieler / anzahlNeueIds', () => {
  it('zählt alle Spieler und die ohne Radikal-ID je Disziplin', () => {
    const herrendoppel = disziplin(
      bereiteExportAuf(
        uebersicht(
          gruppe('HERRENDOPPEL', [
            meldung([mitId('A', 'A', 'AA01011990'), ohneId('B', 'B', 'BB', '1990-01-01')], {
              teamName: 'Eins',
            }),
            meldung([ohneId('C', 'C', 'CC', '1990-01-01'), ohneId('D', 'D', 'DD', '1990-01-01')], {
              teamName: 'Zwei',
            }),
          ]),
        ),
      ),
      'HERRENDOPPEL',
    );

    expect(anzahlSpieler(herrendoppel)).toBe(4);
    expect(anzahlNeueIds(herrendoppel)).toBe(3);
  });
});
