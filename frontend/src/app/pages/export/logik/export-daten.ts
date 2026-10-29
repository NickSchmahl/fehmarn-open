// Gemeinsame Datenaufbereitung aller Exporte (#305): aus der Admin-Übersicht werden je Disziplin
// die aktiven Meldungen sortiert, durchnummeriert und mit Anzeige-ID + NEU-Status versehen.
// Turniertag-Liste, Radikal-CSV und Radikal-Meldeliste bauen alle darauf auf – dadurch tragen
// dieselben Meldungen in jedem Export dieselbe Nummer und dieselbe Radikal-ID.

import {
  AdminMeldungEintrag,
  AdminSpielerEintrag,
  AdminUebersicht,
} from '../../../shared/admin-uebersicht';
import { Disziplin, DISZIPLINEN } from '../../../shared/disziplin';
import { anzeigeRadikalId, istNeueRadikalId } from '../../../shared/radikal-id';

export interface ExportSpieler {
  vorname: string;
  nachname: string;
  /** Angegebene oder aus Initialen + Geburtsdatum gebildete Radikal-ID. */
  radikalId: string;
  /** true = keine ID angegeben, muss bei Radikal angelegt werden. */
  neu: boolean;
  initialen: string | null;
  geburtsdatum: string | null; // ISO yyyy-MM-dd
}

export interface ExportMeldung {
  /** Laufende Nummer innerhalb der Disziplin (1-basiert, nach Sortierung). */
  nr: number;
  teamName: string | null;
  anwesend: boolean;
  spieler: readonly ExportSpieler[];
}

export interface ExportDisziplin {
  disziplin: Disziplin;
  label: string;
  /** Team-Disziplin (Doppel, Triple Mix, Team) – sortiert nach Teamname statt nach Spieler. */
  istTeam: boolean;
  preisProSpieler: number;
  meldungen: readonly ExportMeldung[];
}

// numeric: „Team 2“ vor „Team 11“ statt reiner Textsortierung.
const SORTIERUNG = new Intl.Collator('de', { numeric: true });

function vergleicheSpieler(a: AdminSpielerEintrag, b: AdminSpielerEintrag): number {
  return SORTIERUNG.compare(a.nachname, b.nachname) || SORTIERUNG.compare(a.vorname, b.vorname);
}

function vergleicheErstenSpieler(a: AdminMeldungEintrag, b: AdminMeldungEintrag): number {
  const spielerA = a.spieler.at(0);
  const spielerB = b.spieler.at(0);
  if (!spielerA || !spielerB) {
    return a.spieler.length - b.spieler.length;
  }
  return vergleicheSpieler(spielerA, spielerB);
}

/**
 * Sortierung innerhalb einer Disziplin: Einzel nach Nachname, dann Vorname; Team-Disziplinen nach
 * Teamname (gleichnamige Teams dann nach ihrem ersten Spieler). Umlaute sortiert der deutsche
 * Collator wie im Telefonbuch zum Grundbuchstaben (Möller bei Moller), Zahlen numerisch.
 */
function vergleicheMeldungen(istTeam: boolean) {
  return (a: AdminMeldungEintrag, b: AdminMeldungEintrag): number => {
    if (istTeam) {
      const nachTeam = SORTIERUNG.compare(a.teamName ?? '', b.teamName ?? '');
      if (nachTeam !== 0) {
        return nachTeam;
      }
    }
    return vergleicheErstenSpieler(a, b) || a.id - b.id;
  };
}

function zuExportSpieler(spieler: AdminSpielerEintrag): ExportSpieler {
  const neu = istNeueRadikalId(spieler);
  return {
    vorname: spieler.vorname,
    nachname: spieler.nachname,
    radikalId: anzeigeRadikalId(spieler),
    neu,
    initialen: neu ? spieler.initialen : null,
    geburtsdatum: neu ? spieler.geburtsdatum : null,
  };
}

/**
 * Bereitet die Admin-Übersicht für die Exporte auf. Liefert **alle** Disziplinen in der
 * DISZIPLINEN-Reihenfolge, auch ohne Meldungen (die Turniertag-Liste druckt dann nur die
 * Leerzeilen für Nachmeldungen). Abgemeldete Meldungen fallen heraus. Geburtsdatum und Initialen
 * bleiben nur bei neuen IDs erhalten (Datensparsamkeit: Radikal braucht sie nur dort).
 */
export function bereiteExportAuf(uebersicht: AdminUebersicht): ExportDisziplin[] {
  return DISZIPLINEN.map((meta) => {
    const gruppe = uebersicht.disziplinen.find((eintrag) => eintrag.disziplin === meta.value);
    const aktive = (gruppe?.meldungen ?? []).filter((meldung) => !meldung.abgemeldet);
    const meldungen = [...aktive]
      .sort(vergleicheMeldungen(meta.teamName))
      .map((meldung, index) => ({
        nr: index + 1,
        teamName: meldung.teamName,
        anwesend: meldung.anwesend,
        spieler: meldung.spieler.map(zuExportSpieler),
      }));
    return {
      disziplin: meta.value,
      label: meta.label,
      istTeam: meta.teamName,
      preisProSpieler: meta.preisProSpieler,
      meldungen,
    };
  });
}

/** Anzahl Spieler einer Disziplin (ein Spieler je Meldung bei Einzel, alle Teammitglieder sonst). */
export function anzahlSpieler(disziplin: ExportDisziplin): number {
  return disziplin.meldungen.reduce((summe, meldung) => summe + meldung.spieler.length, 0);
}

/** Anzahl Spieler einer Disziplin ohne angegebene Radikal-ID. */
export function anzahlNeueIds(disziplin: ExportDisziplin): number {
  return disziplin.meldungen.reduce(
    (summe, meldung) => summe + meldung.spieler.filter((spieler) => spieler.neu).length,
    0,
  );
}
