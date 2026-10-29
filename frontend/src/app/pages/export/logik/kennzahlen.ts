// Kennzahlen zum aktuellen Stand für die Export-Seite (#306).

import { AdminUebersicht } from '../../../shared/admin-uebersicht';
import { anzahlNeueIds, anzahlSpieler, bereiteExportAuf } from './export-daten';

export interface ExportKennzahlen {
  aktiveMeldungen: number;
  /** Spieler je Disziplin gezählt – wer in zwei Disziplinen spielt, zählt zweimal (= CSV-Zeilen). */
  spieler: number;
  /** Spieler ohne angegebene Radikal-ID, ebenfalls je Disziplin gezählt. */
  neueRadikalIds: number;
  abgemeldet: number;
}

/**
 * Berechnet die Kennzahlen über dieselbe Aufbereitung wie die Exporte, damit die Zahlen auf der
 * Seite zu CSV und Meldeliste passen. Abgemeldete zählen nicht als aktiv, sondern separat.
 */
export function berechneKennzahlen(uebersicht: AdminUebersicht): ExportKennzahlen {
  const disziplinen = bereiteExportAuf(uebersicht);
  const abgemeldet = uebersicht.disziplinen.reduce(
    (summe, gruppe) => summe + gruppe.meldungen.filter((meldung) => meldung.abgemeldet).length,
    0,
  );
  return {
    aktiveMeldungen: disziplinen.reduce((summe, d) => summe + d.meldungen.length, 0),
    spieler: disziplinen.reduce((summe, d) => summe + anzahlSpieler(d), 0),
    neueRadikalIds: disziplinen.reduce((summe, d) => summe + anzahlNeueIds(d), 0),
    abgemeldet,
  };
}
