// Aufbereitung der Meldeliste für Radikal (#309) – das lesbare Gegenstück zur CSV. Baut auf
// denselben RadikalZeilen auf wie die CSV, damit Übersichtszahlen und Inhalt übereinstimmen.

import { Disziplin } from '../../../shared/disziplin';
import { RadikalZeile } from './radikal-zeilen';

export interface MeldelisteKennzahlen {
  meldungen: number;
  spieler: number;
  neueIds: number;
}

export interface MeldelisteUebersichtZeile extends MeldelisteKennzahlen {
  disziplin: Disziplin;
  name: string;
}

export interface MeldelisteZeile {
  /** Einzel: `3`; Team: `2.1`, `2.2` … (Meldung.Spieler). */
  lfd: string;
  /** Teamname in der ersten Zeile eines Teams, danach `〃`; leer bei Einzel. */
  team: string;
  nachname: string;
  vorname: string;
  radikalId: string;
  neu: boolean;
  /** ISO-Datum, nur bei neuen IDs (Datensparsamkeit), sonst leer. */
  geburtsdatum: string;
}

/** Die Spieler einer Meldung – im Druck ein `<tbody>`, das nicht über Seiten gerissen wird. */
export interface MeldelisteBlock {
  meldungNr: number;
  zeilen: readonly MeldelisteZeile[];
}

export interface MeldelisteAbschnitt extends MeldelisteUebersichtZeile {
  istTeam: boolean;
  bloecke: readonly MeldelisteBlock[];
}

export interface Meldeliste {
  uebersicht: readonly MeldelisteUebersichtZeile[];
  gesamt: MeldelisteKennzahlen;
  abschnitte: readonly MeldelisteAbschnitt[];
}

export const WIEDERHOLUNGSZEICHEN = '〃';

/** Zählt innerhalb **einer** Disziplin (Meldungsnummern sind nur je Disziplin eindeutig). */
function zaehle(zeilen: readonly RadikalZeile[]): MeldelisteKennzahlen {
  return {
    meldungen: new Set(zeilen.map((zeile) => zeile.meldungNr)).size,
    spieler: zeilen.length,
    neueIds: zeilen.filter((zeile) => zeile.idStatus === 'neu').length,
  };
}

/** Gruppiert aufeinanderfolgende Einträge mit gleichem Schlüssel; jede Gruppe ist nicht leer. */
function gruppiere<T>(liste: readonly T[], schluessel: (eintrag: T) => unknown): T[][] {
  const gruppen: T[][] = [];
  let letzterSchluessel: unknown;
  for (const eintrag of liste) {
    const aktuell = schluessel(eintrag);
    const letzte = gruppen.at(-1);
    if (letzte && aktuell === letzterSchluessel) {
      letzte.push(eintrag);
    } else {
      gruppen.push([eintrag]);
    }
    letzterSchluessel = aktuell;
  }
  return gruppen;
}

function zuBlock(zeilen: readonly RadikalZeile[]): MeldelisteBlock {
  return {
    meldungNr: zeilen[0].meldungNr,
    zeilen: zeilen.map((zeile, index) => ({
      lfd: zeile.istTeam ? `${zeile.meldungNr}.${zeile.spielerNr}` : String(zeile.meldungNr),
      team: zeile.istTeam ? (index === 0 ? zeile.team : WIEDERHOLUNGSZEICHEN) : '',
      nachname: zeile.nachname,
      vorname: zeile.vorname,
      radikalId: zeile.radikalId,
      neu: zeile.idStatus === 'neu',
      geburtsdatum: zeile.idStatus === 'neu' ? zeile.geburtsdatum : '',
    })),
  };
}

function zuAbschnitt(gruppe: readonly RadikalZeile[], nurNeue: boolean): MeldelisteAbschnitt {
  const erste = gruppe[0];
  const sichtbar = nurNeue ? gruppe.filter((zeile) => zeile.idStatus === 'neu') : gruppe;
  return {
    disziplin: erste.disziplin,
    name: erste.disziplinName,
    istTeam: erste.istTeam,
    ...zaehle(gruppe),
    bloecke: gruppiere(sichtbar, (zeile) => zeile.meldungNr).map(zuBlock),
  };
}

/**
 * Baut die Meldeliste. Die Übersicht zählt immer **alle** aktiven Meldungen (wie die CSV); mit
 * `nurNeue` enthalten die Abschnitte nur Spieler mit neuer Radikal-ID, behalten aber ihre laufende
 * Nummer, damit sie sich weiter der CSV bzw. Turniertag-Liste zuordnen lassen.
 */
export function baueMeldeliste(zeilen: readonly RadikalZeile[], nurNeue: boolean): Meldeliste {
  const alle = gruppiere(zeilen, (zeile) => zeile.disziplin).map((gruppe) =>
    zuAbschnitt(gruppe, nurNeue),
  );
  const uebersicht = alle.map(({ disziplin, name, meldungen, spieler, neueIds }) => ({
    disziplin,
    name,
    meldungen,
    spieler,
    neueIds,
  }));
  const gesamt = uebersicht.reduce(
    (summe, zeile) => ({
      meldungen: summe.meldungen + zeile.meldungen,
      spieler: summe.spieler + zeile.spieler,
      neueIds: summe.neueIds + zeile.neueIds,
    }),
    { meldungen: 0, spieler: 0, neueIds: 0 },
  );
  return {
    uebersicht,
    gesamt,
    abschnitte: alle.filter((abschnitt) => abschnitt.bloecke.length > 0),
  };
}
