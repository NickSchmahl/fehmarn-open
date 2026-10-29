// Flache Zeilenliste für Radikal (#308/#309): eine Zeile je Spieler und Disziplin. CSV und
// Radikal-Meldeliste werden beide daraus gebaut und können so nicht auseinanderlaufen.

import { Disziplin } from '../../../shared/disziplin';
import { ExportDisziplin } from './export-daten';

export type IdStatus = 'vorhanden' | 'neu';

export interface RadikalZeile {
  disziplin: Disziplin;
  disziplinName: string;
  istTeam: boolean;
  /** Laufende Nummer der Meldung je Disziplin; gruppiert die Spieler eines Teams. */
  meldungNr: number;
  /** Position des Spielers innerhalb der Meldung (1-basiert) – nur für die Meldeliste. */
  spielerNr: number;
  team: string;
  nachname: string;
  vorname: string;
  radikalId: string;
  idStatus: IdStatus;
  /** Nur bei `neu` gefüllt, sonst leer. */
  initialen: string;
  /** ISO yyyy-MM-dd, nur bei `neu` gefüllt, sonst leer. */
  geburtsdatum: string;
}

/** Baut aus der Export-Aufbereitung die Radikal-Zeilen (Reihenfolge wie die Aufbereitung). */
export function radikalZeilen(disziplinen: readonly ExportDisziplin[]): RadikalZeile[] {
  return disziplinen.flatMap((disziplin) =>
    disziplin.meldungen.flatMap((meldung) =>
      meldung.spieler.map((spieler, index) => ({
        disziplin: disziplin.disziplin,
        disziplinName: disziplin.label,
        istTeam: disziplin.istTeam,
        meldungNr: meldung.nr,
        spielerNr: index + 1,
        team: meldung.teamName ?? '',
        nachname: spieler.nachname,
        vorname: spieler.vorname,
        radikalId: spieler.radikalId,
        idStatus: spieler.neu ? 'neu' : 'vorhanden',
        initialen: spieler.initialen ?? '',
        geburtsdatum: spieler.geburtsdatum ?? '',
      })),
    ),
  );
}
