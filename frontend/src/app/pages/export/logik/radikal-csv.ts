// Radikal-Export als CSV (#308). Format: UTF-8 mit BOM (Excel erkennt sonst keine Umlaute),
// Trennzeichen `;` (deutsches Excel), CRLF und Quoting nach RFC 4180.

import { alsLokalesIsoDatum } from '../../../shared/datum';
import { FLYER_TURNIER } from '../../../shared/flyer-zeitplan';
import { RadikalZeile } from './radikal-zeilen';

/**
 * Der Export-Vertrag mit Radikal: Spaltennamen und -reihenfolge stehen nur hier. Wünscht Radikal
 * später ein anderes Schema, wird es an dieser einen Stelle angepasst.
 */
export const RADIKAL_CSV_SPALTEN = [
  'disziplin',
  'disziplin_name',
  'meldung_nr',
  'team',
  'nachname',
  'vorname',
  'radikal_id',
  'id_status',
  'initialen',
  'geburtsdatum',
] as const;

export type RadikalCsvSpalte = (typeof RADIKAL_CSV_SPALTEN)[number];

const WERT_JE_SPALTE: Record<RadikalCsvSpalte, (zeile: RadikalZeile) => string> = {
  disziplin: (zeile) => zeile.disziplin,
  disziplin_name: (zeile) => zeile.disziplinName,
  meldung_nr: (zeile) => String(zeile.meldungNr),
  team: (zeile) => zeile.team,
  nachname: (zeile) => zeile.nachname,
  vorname: (zeile) => zeile.vorname,
  radikal_id: (zeile) => zeile.radikalId,
  id_status: (zeile) => zeile.idStatus,
  initialen: (zeile) => zeile.initialen,
  geburtsdatum: (zeile) => zeile.geburtsdatum,
};

const BOM = '\uFEFF';
const TRENNZEICHEN = ';';
const ZEILENENDE = '\r\n';

// Werte, die Excel als Formel ausführen würde (OWASP „CSV Injection").
const FORMEL_ANFANG = /^[=+\-@\t\r]/;
const BRAUCHT_QUOTING = /[;"\r\n]/;

/**
 * Bereitet einen Wert für die CSV auf. Namen und Teamnamen stammen aus dem öffentlichen
 * Anmeldeformular: Beginnt ein Wert mit `=`, `+`, `-`, `@`, Tab oder CR, bekommt er ein
 * vorangestelltes `'`, damit Excel ihn als Text statt als Formel liest. Danach wird nach RFC 4180
 * gequotet, wenn `;`, `"` oder ein Zeilenumbruch enthalten ist.
 */
export function escapeCsvWert(wert: string): string {
  const entschaerft = FORMEL_ANFANG.test(wert) ? `'${wert}` : wert;
  return BRAUCHT_QUOTING.test(entschaerft) ? `"${entschaerft.replaceAll('"', '""')}"` : entschaerft;
}

/** Erzeugt die komplette CSV-Datei (mit BOM, Kopfzeile und abschließendem Zeilenende). */
export function zuRadikalCsv(zeilen: readonly RadikalZeile[]): string {
  const kopf = RADIKAL_CSV_SPALTEN.join(TRENNZEICHEN);
  const daten = zeilen.map((zeile) =>
    RADIKAL_CSV_SPALTEN.map((spalte) => escapeCsvWert(WERT_JE_SPALTE[spalte](zeile))).join(
      TRENNZEICHEN,
    ),
  );
  return BOM + [kopf, ...daten].map((zeile) => zeile + ZEILENENDE).join('');
}

/** Dateiname mit Datum, damit mehrere Stände unterscheidbar bleiben. */
export function radikalCsvDateiname(stand: Date): string {
  return `fehmarn-open-${FLYER_TURNIER.jahr}_radikal_${alsLokalesIsoDatum(stand)}.csv`;
}
