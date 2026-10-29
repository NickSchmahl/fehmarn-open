import { DISZIPLINEN } from '../../../shared/disziplin';
import { bereiteExportAuf } from './export-daten';
import { berechneKennzahlen } from './kennzahlen';
import { radikalZeilen } from './radikal-zeilen';
import { zuRadikalCsv } from './radikal-csv';
import { baueMeldeliste, WIEDERHOLUNGSZEICHEN } from './radikal-meldeliste';
import { gruppe, meldung, mitId, ohneId, uebersicht } from './export-testdaten';

const DATEN = uebersicht(
  gruppe('HERRENEINZEL', [
    meldung([mitId('Jonas', 'Albers', 'JA14021991')]),
    meldung([ohneId('Henrik', 'Claussen', 'HC', '1979-11-22')]),
    meldung([mitId('Malte', 'Brandt', 'MB03071985')], { abgemeldet: true }),
  ]),
  gruppe('HERRENDOPPEL', [
    meldung([mitId('Dennis', 'Hinz', 'DH25061990'), mitId('Bjarne', 'Jessen', 'BJ08081994')], {
      teamName: 'Doppelt hält besser',
    }),
    meldung([mitId('Marco', 'Kühl', 'MK19041977'), ohneId('Hauke', 'Nissen', 'HN', '1981-11-11')], {
      teamName: 'Hafenkante',
    }),
  ]),
);

const ZEILEN = radikalZeilen(bereiteExportAuf(DATEN));

describe('baueMeldeliste', () => {
  const liste = baueMeldeliste(ZEILEN);

  it('zählt je Disziplin Meldungen, Spieler und neue IDs', () => {
    const zeile = (disziplin: string) => liste.uebersicht.find((z) => z.disziplin === disziplin);
    expect(zeile('HERRENEINZEL')).toEqual({
      disziplin: 'HERRENEINZEL',
      name: 'Herreneinzel',
      meldungen: 2,
      spieler: 2,
      neueIds: 1,
    });
    expect(zeile('HERRENDOPPEL')).toMatchObject({ meldungen: 2, spieler: 4, neueIds: 1 });
  });

  it('nennt in der Übersicht alle Disziplinen, auch ohne Meldungen (mit 0)', () => {
    expect(liste.uebersicht.map((z) => z.disziplin)).toEqual(DISZIPLINEN.map((d) => d.value));
    expect(liste.uebersicht.find((z) => z.disziplin === 'DAMENDOPPEL')).toMatchObject({
      meldungen: 0,
      spieler: 0,
      neueIds: 0,
    });
  });

  it('summiert über Disziplinen, obwohl sich Meldungsnummern je Disziplin wiederholen', () => {
    expect(liste.gesamt).toEqual({ meldungen: 4, spieler: 6, neueIds: 2 });
  });

  it('passt zu CSV und Kennzahlen der Export-Seite (gleicher Stand → gleiche Zahlen)', () => {
    const csvDatenzeilen = zuRadikalCsv(ZEILEN).trimEnd().split('\r\n').length - 1;
    const kennzahlen = berechneKennzahlen(DATEN);

    expect(liste.gesamt.spieler).toBe(csvDatenzeilen);
    expect(liste.gesamt).toEqual({
      meldungen: kennzahlen.aktiveMeldungen,
      spieler: kennzahlen.spieler,
      neueIds: kennzahlen.neueRadikalIds,
    });
  });

  it('nummeriert Einzel schlicht und Teams als Meldung.Spieler', () => {
    const [einzel, doppel] = liste.abschnitte;
    expect(einzel.bloecke.flatMap((block) => block.zeilen.map((zeile) => zeile.lfd))).toEqual([
      '1',
      '2',
    ]);
    expect(doppel.bloecke.flatMap((block) => block.zeilen.map((zeile) => zeile.lfd))).toEqual([
      '1.1',
      '1.2',
      '2.1',
      '2.2',
    ]);
  });

  it('nennt den Teamnamen nur in der ersten Zeile eines Teams, danach 〃', () => {
    const doppel = liste.abschnitte[1];
    expect(doppel.bloecke.map((block) => block.zeilen.map((zeile) => zeile.team))).toEqual([
      ['Doppelt hält besser', WIEDERHOLUNGSZEICHEN],
      ['Hafenkante', WIEDERHOLUNGSZEICHEN],
    ]);
    expect(liste.abschnitte[0]?.bloecke[0]?.zeilen[0]?.team).toBe('');
  });

  it('zeigt das Geburtsdatum nur bei neuen IDs', () => {
    const zeilen = liste.abschnitte.flatMap((a) => a.bloecke.flatMap((b) => b.zeilen));
    expect(zeilen.filter((zeile) => zeile.geburtsdatum !== '').map((z) => z.nachname)).toEqual([
      'Claussen',
      'Nissen',
    ]);
    expect(zeilen.every((zeile) => zeile.neu === (zeile.geburtsdatum !== ''))).toBe(true);
  });

  it('enthält immer alle Spieler, auch die mit vorhandener ID', () => {
    const zeilen = liste.abschnitte.flatMap((a) => a.bloecke.flatMap((b) => b.zeilen));
    expect(zeilen).toHaveLength(liste.gesamt.spieler);
    expect(zeilen.some((zeile) => !zeile.neu)).toBe(true);
  });

  it('liefert für keine Meldungen nur Nullen und keine Abschnitte', () => {
    const leer = baueMeldeliste([]);
    expect(leer.uebersicht.every((z) => z.meldungen === 0 && z.spieler === 0)).toBe(true);
    expect(leer.gesamt).toEqual({ meldungen: 0, spieler: 0, neueIds: 0 });
    expect(leer.abschnitte).toEqual([]);
  });
});
