import { bereiteExportAuf } from './export-daten';
import { radikalZeilen } from './radikal-zeilen';
import { gruppe, meldung, mitId, ohneId, uebersicht } from './export-testdaten';

describe('radikalZeilen', () => {
  const zeilen = radikalZeilen(
    bereiteExportAuf(
      uebersicht(
        gruppe('HERRENDOPPEL', [
          meldung(
            [mitId('Marco', 'Kühl', 'MK19041977'), ohneId('Hauke', 'Nissen', 'HN', '1981-11-11')],
            { teamName: 'Hafenkante' },
          ),
          meldung([mitId('A', 'Abgemeldet', 'AA01011990'), mitId('B', 'B', 'BB01011990')], {
            teamName: 'Weg',
            abgemeldet: true,
          }),
        ]),
        gruppe('HERRENEINZEL', [
          meldung([ohneId('Henrik', 'Claussen', 'HC', '1979-11-22')]),
          meldung([mitId('Jonas', 'Albers', 'JA14021991')]),
        ]),
      ),
    ),
  );

  it('liefert eine Zeile je Spieler aktiver Meldungen, Disziplinen in DISZIPLINEN-Reihenfolge', () => {
    expect(zeilen.map((zeile) => `${zeile.disziplin}/${zeile.nachname}`)).toEqual([
      'HERRENEINZEL/Albers',
      'HERRENEINZEL/Claussen',
      'HERRENDOPPEL/Kühl',
      'HERRENDOPPEL/Nissen',
    ]);
  });

  it('gruppiert Teamspieler über die gemeinsame Meldungsnummer', () => {
    const doppel = zeilen.filter((zeile) => zeile.disziplin === 'HERRENDOPPEL');
    expect(doppel.map((zeile) => [zeile.meldungNr, zeile.spielerNr, zeile.team])).toEqual([
      [1, 1, 'Hafenkante'],
      [1, 2, 'Hafenkante'],
    ]);
  });

  it('füllt Initialen und Geburtsdatum nur bei neuen IDs', () => {
    expect(zeilen.find((zeile) => zeile.nachname === 'Claussen')).toMatchObject({
      team: '',
      radikalId: 'HC22111979',
      idStatus: 'neu',
      initialen: 'HC',
      geburtsdatum: '1979-11-22',
    });
    expect(zeilen.find((zeile) => zeile.nachname === 'Albers')).toMatchObject({
      radikalId: 'JA14021991',
      idStatus: 'vorhanden',
      initialen: '',
      geburtsdatum: '',
    });
  });
});
