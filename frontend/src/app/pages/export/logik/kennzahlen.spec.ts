import { berechneKennzahlen } from './kennzahlen';
import { gruppe, meldung, mitId, ohneId, uebersicht } from './export-testdaten';

describe('berechneKennzahlen', () => {
  const daten = uebersicht(
    gruppe('HERRENEINZEL', [
      meldung([mitId('Jonas', 'Albers', 'JA14021991')]),
      meldung([ohneId('Henrik', 'Claussen', 'HC', '1979-11-22')]),
      meldung([ohneId('Timo', 'Gosch', 'TG', '1999-12-01')], { abgemeldet: true }),
    ]),
    gruppe('HERRENDOPPEL', [
      meldung(
        [mitId('Marco', 'Kühl', 'MK19041977'), ohneId('Hauke', 'Nissen', 'HN', '1981-11-11')],
        { teamName: 'Hafenkante' },
      ),
      meldung([mitId('A', 'A', 'AA01011990'), mitId('B', 'B', 'BB01011990')], {
        teamName: 'Weg',
        abgemeldet: true,
      }),
    ]),
  );

  it('zählt nur aktive Meldungen als aktiv und Abgemeldete separat', () => {
    expect(berechneKennzahlen(daten)).toMatchObject({ aktiveMeldungen: 3, abgemeldet: 2 });
  });

  it('stimmt mit den Anzahlen der Teilnehmerübersicht überein', () => {
    const summeAnzahl = daten.disziplinen.reduce((summe, g) => summe + g.anzahl, 0);
    expect(berechneKennzahlen(daten).aktiveMeldungen).toBe(summeAnzahl);
  });

  it('zählt Spieler und neue Radikal-IDs nur aus aktiven Meldungen', () => {
    expect(berechneKennzahlen(daten)).toMatchObject({ spieler: 4, neueRadikalIds: 2 });
  });

  it('liefert lauter Nullen für eine leere Übersicht', () => {
    expect(berechneKennzahlen(uebersicht())).toEqual({
      aktiveMeldungen: 0,
      spieler: 0,
      neueRadikalIds: 0,
      abgemeldet: 0,
    });
  });
});
