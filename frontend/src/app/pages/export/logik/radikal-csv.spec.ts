import { bereiteExportAuf } from './export-daten';
import { radikalZeilen } from './radikal-zeilen';
import {
  escapeCsvWert,
  RADIKAL_CSV_SPALTEN,
  radikalCsvDateiname,
  zuRadikalCsv,
} from './radikal-csv';
import { gruppe, meldung, mitId, ohneId, uebersicht } from './export-testdaten';

describe('escapeCsvWert', () => {
  it('lässt unkritische Werte unverändert', () => {
    expect(escapeCsvWert('Kühl')).toBe('Kühl');
    expect(escapeCsvWert('Schmidt-Wöllner')).toBe('Schmidt-Wöllner');
    expect(escapeCsvWert('')).toBe('');
  });

  it('quotet Werte mit Trennzeichen, Anführungszeichen oder Zeilenumbruch nach RFC 4180', () => {
    expect(escapeCsvWert('Darts; Bier & Spiele')).toBe('"Darts; Bier & Spiele"');
    expect(escapeCsvWert('Die "Profis"')).toBe('"Die ""Profis"""');
    expect(escapeCsvWert('Zeile\nUmbruch')).toBe('"Zeile\nUmbruch"');
  });

  it('wehrt Formel-Injection ab: =HYPERLINK(...) als Teamname wird zu Text', () => {
    expect(escapeCsvWert('=HYPERLINK("http://boese.example","klick")')).toBe(
      '"\'=HYPERLINK(""http://boese.example"",""klick"")"',
    );
  });

  it.each(['=1+1', '+49 123', '-2+3', '@SUMME(A1)', '\tTab', '\rCR'])(
    'stellt "%s" ein Hochkomma voran',
    (wert) => {
      expect(escapeCsvWert(wert).replace(/^"/, '').startsWith("'")).toBe(true);
    },
  );

  it('entschärft nur am Wertanfang, nicht mitten im Wert', () => {
    expect(escapeCsvWert('Team=Gut')).toBe('Team=Gut');
  });
});

describe('zuRadikalCsv', () => {
  const zeilen = radikalZeilen(
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
        gruppe('TEAMWETTBEWERB', [
          meldung([mitId('Sven', 'Ehlers', 'SE30011988')], { teamName: 'Darts; Bier & Spiele' }),
          meldung([mitId('Eve', 'Böse', 'EB01011990')], { teamName: '=HYPERLINK("x")' }),
          meldung([mitId('Tom', 'Weg', 'TW01011990')], { teamName: 'Weg', abgemeldet: true }),
        ]),
      ),
    ),
  );
  const csv = zuRadikalCsv(zeilen);

  it('beginnt mit UTF-8-BOM, damit Excel die Umlaute erkennt', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('erzeugt Kopfzeile und eine Zeile je Spieler mit CRLF, abgemeldete fehlen', () => {
    expect(csv).toBe(
      '\uFEFF' +
        [
          'disziplin;disziplin_name;meldung_nr;team;nachname;vorname;radikal_id;id_status;initialen;geburtsdatum',
          'HERRENEINZEL;Herreneinzel;1;;Albers;Jonas;JA14021991;vorhanden;;',
          'HERRENEINZEL;Herreneinzel;2;;Claussen;Henrik;HC22111979;neu;HC;1979-11-22',
          'HERRENDOPPEL;Herrendoppel;1;Hafenkante;Kühl;Marco;MK19041977;vorhanden;;',
          'HERRENDOPPEL;Herrendoppel;1;Hafenkante;Nissen;Hauke;HN11111981;neu;HN;1981-11-11',
          // Sortiert nach Teamname: Sonderzeichen wie "=" vor Buchstaben.
          'TEAMWETTBEWERB;Teamwettbewerb;1;"\'=HYPERLINK(""x"")";Böse;Eve;EB01011990;vorhanden;;',
          'TEAMWETTBEWERB;Teamwettbewerb;2;"Darts; Bier & Spiele";Ehlers;Sven;SE30011988;vorhanden;;',
        ]
          .map((zeile) => `${zeile}\r\n`)
          .join(''),
    );
  });

  it('hat in jeder Zeile genau so viele Felder wie Spalten', () => {
    const datenzeilen = csv.slice(1).trimEnd().split('\r\n');
    // Gequotete Felder mit ";" vorher entfernen, dann Trennzeichen zählen.
    const felder = datenzeilen.map(
      (zeile) => zeile.replace(/"([^"]|"")*"/g, 'x').split(';').length,
    );
    expect(new Set(felder)).toEqual(new Set([RADIKAL_CSV_SPALTEN.length]));
  });

  it('liefert für keine Meldungen nur die Kopfzeile', () => {
    expect(zuRadikalCsv([])).toBe(`\uFEFF${RADIKAL_CSV_SPALTEN.join(';')}\r\n`);
  });
});

describe('radikalCsvDateiname', () => {
  it('enthält Turnierjahr und Datum des Stands', () => {
    expect(radikalCsvDateiname(new Date(2026, 9, 28, 14, 32))).toBe(
      'fehmarn-open-2027_radikal_2026-10-28.csv',
    );
  });
});
