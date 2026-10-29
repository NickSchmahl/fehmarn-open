// Turniertag-Liste (#307): Aufteilung der Meldungen auf A4-Blätter. Die Aufteilung passiert hier
// im Code und nicht per CSS-Mehrspaltigkeit, weil `columns` über Seitengrenzen nicht verlässlich
// umbricht – so stimmen auch „Blatt x von y" und der Nummernbereich im Fuß.

import { Disziplin } from '../../../shared/disziplin';
import { FLYER_ZEITPLAN, FlyerZeitplanEintrag } from '../../../shared/flyer-zeitplan';
import { ExportDisziplin, ExportMeldung } from './export-daten';

/** Leerzeilen am Ende jeder Disziplin für Nachmeldungen vor Ort. */
export const LEERZEILEN = 10;

/** Spieler je Blatt bei Einzel (zweispaltig): Blatt 1 hat den vollen Kopf, Folgeblätter nicht. */
export const EINZEL_ERSTES_BLATT = 92;
export const EINZEL_FOLGEBLATT = 102;

/**
 * Zeilenhöhen in 1/100 mm – müssen zu den festen Höhen in turniertag-druck.component.scss passen.
 * Leerzeilen sind höher, damit man darin schreiben kann – außer sie würden dadurch ein eigenes
 * Blatt erzwingen; dann werden sie kompakt (so hoch wie normale Zeilen) gedruckt.
 */
export const HOEHE = {
  einzel: 455,
  einzelLeer: 540,
  team: [950, 1300] as const, // eine bzw. zwei Zeilen Spieler (je bis zu 3 nebeneinander)
  teamLeer: 700,
};

/** Spieler je Zeile in der Team-Tabelle; mehr Spieler brechen in eine zweite Zeile um. */
export const TEAM_SPIELER_JE_ZEILE = 3;

/** Platz für Tabellenzeilen je Spalte: so viel, wie 46 bzw. 51 Einzel-Zeilen brauchen. */
const BUDGET_ERSTES_BLATT = (EINZEL_ERSTES_BLATT / 2) * HOEHE.einzel;
const BUDGET_FOLGEBLATT = (EINZEL_FOLGEBLATT / 2) * HOEHE.einzel;

/** Eine Tabellenzeile: eine Meldung oder (meldung = null) eine Leerzeile für Nachmeldungen. */
export interface TurniertagZeile {
  nr: number;
  meldung: ExportMeldung | null;
}

export interface TurniertagBlatt {
  /** 1-basiert innerhalb der Disziplin. */
  nummer: number;
  /** Nummernbereich des Blatts (inkl. Leerzeilen), für den Fuß. */
  von: number;
  bis: number;
  /** Einzel: zwei Spalten (Telefonbuch-Reihenfolge), Team: eine. */
  spalten: readonly (readonly TurniertagZeile[])[];
}

export interface TurniertagDisziplin {
  disziplin: Disziplin;
  /** Leerzeilen so hoch wie normale Zeilen, weil sonst ein zusätzliches Blatt nötig wäre. */
  kompakteLeerzeilen: boolean;
  label: string;
  istTeam: boolean;
  zeitplan: FlyerZeitplanEintrag;
  preisProSpieler: number;
  meldungen: number;
  /** Obergrenze der Meldungen (nur Teamwettbewerb, z. B. 96), sonst null. */
  maxMeldungen: number | null;
  /** Summe Startgeld aller Meldungen in Euro (U18 = 0). */
  sollKasse: number;
  blaetter: readonly TurniertagBlatt[];
}

export function zeilenHoehe(zeile: TurniertagZeile, istTeam: boolean, kompakt = false): number {
  if (!istTeam) {
    return zeile.meldung || kompakt ? HOEHE.einzel : HOEHE.einzelLeer;
  }
  if (!zeile.meldung) {
    return HOEHE.teamLeer;
  }
  return teamZeilenAnzahl(zeile.meldung) > 1 ? HOEHE.team[1] : HOEHE.team[0];
}

/** Wie viele Zeilen die Spielerliste einer Team-Meldung braucht (1 oder 2). */
export function teamZeilenAnzahl(meldung: ExportMeldung): number {
  return Math.max(1, Math.ceil(meldung.spieler.length / TEAM_SPIELER_JE_ZEILE));
}

/**
 * Füllt Spalten nacheinander bis zu ihrem Höhenbudget. `budget(i)` liefert das Budget der i-ten
 * Spalte (0-basiert). Jede Spalte bekommt mindestens eine Zeile, damit es nie endlos läuft.
 */
function fuelleSpalten<T>(
  eintraege: readonly T[],
  hoehe: (eintrag: T) => number,
  budget: (spalte: number) => number,
): T[][] {
  const spalten: T[][] = [];
  let aktuell: T[] = [];
  let belegt = 0;
  for (const eintrag of eintraege) {
    const h = hoehe(eintrag);
    if (aktuell.length > 0 && belegt + h > budget(spalten.length)) {
      spalten.push(aktuell);
      aktuell = [];
      belegt = 0;
    }
    aktuell.push(eintrag);
    belegt += h;
  }
  if (aktuell.length > 0) {
    spalten.push(aktuell);
  }
  return spalten;
}

/**
 * Teilt die Zeilen des letzten Einzel-Blatts wie ein Telefonbuch auf zwei Spalten auf: links
 * mindestens so hoch wie rechts, beide möglichst gleich hoch. Passt die linke Spalte so nicht ins
 * Budget, gilt die ausgeglichenste Trennstelle – die passt immer, wenn der Inhalt vorher in zwei
 * Spalten gepasst hat.
 */
function teileAusgeglichen<T>(
  zeilen: readonly T[],
  hoehe: (eintrag: T) => number,
  budget: number,
): T[][] {
  const gesamt = zeilen.reduce((summe, zeile) => summe + hoehe(zeile), 0);
  let links = 0;
  let ausgeglichensteStelle = zeilen.length;
  let kleinstesMaximum = Infinity;
  for (const [index, zeile] of zeilen.entries()) {
    const stelle = index + 1;
    links += hoehe(zeile);
    const rechts = gesamt - links;
    if (links >= rechts && links <= budget) {
      return [zeilen.slice(0, stelle), zeilen.slice(stelle)];
    }
    if (Math.max(links, rechts) < kleinstesMaximum) {
      kleinstesMaximum = Math.max(links, rechts);
      ausgeglichensteStelle = stelle;
    }
  }
  return [zeilen.slice(0, ausgeglichensteStelle), zeilen.slice(ausgeglichensteStelle)];
}

/**
 * Teilt die Zeilen einer Disziplin auf Blätter auf. Einzel zweispaltig wie ein Telefonbuch (erst
 * links von oben nach unten, dann rechts), auf dem letzten Blatt beide Spalten gleich lang. Teams
 * einspaltig. Blatt 1 hat weniger Platz (voller Kopf mit Kennzahlen). `kompakt` = Leerzeilen so
 * hoch wie normale Zeilen.
 */
export function teileInBlaetter(
  zeilen: readonly TurniertagZeile[],
  istTeam: boolean,
  kompakt = false,
): TurniertagBlatt[] {
  const hoehe = (zeile: TurniertagZeile) => zeilenHoehe(zeile, istTeam, kompakt);
  const spaltenJeBlatt = istTeam ? 1 : 2;
  const budget = (spalte: number) =>
    spalte < spaltenJeBlatt ? BUDGET_ERSTES_BLATT : BUDGET_FOLGEBLATT;

  const spalten = fuelleSpalten(zeilen, hoehe, budget);
  const blaetter: TurniertagZeile[][][] = [];
  for (let start = 0; start < spalten.length; start += spaltenJeBlatt) {
    blaetter.push(spalten.slice(start, start + spaltenJeBlatt));
  }

  const letztes = blaetter.at(-1);
  if (!istTeam && letztes) {
    const letztesBudget = blaetter.length === 1 ? BUDGET_ERSTES_BLATT : BUDGET_FOLGEBLATT;
    blaetter[blaetter.length - 1] = teileAusgeglichen(letztes.flat(), hoehe, letztesBudget);
  }

  return blaetter.map((blattSpalten, index) => {
    const alle = blattSpalten.flat();
    return {
      nummer: index + 1,
      von: alle.at(0)?.nr ?? 0,
      bis: alle.at(-1)?.nr ?? 0,
      spalten: blattSpalten,
    };
  });
}

/**
 * Wie `teileInBlaetter`, aber ohne Blatt nur für Leerzeilen: Brauchen die hohen Leerzeilen ein
 * Blatt mehr als kompakte, werden sie kompakt gedruckt (nur Einzel; bei Teams sind Leerzeilen
 * ohnehin niedriger als Meldungen).
 */
export function teileSparsamInBlaetter(
  zeilen: readonly TurniertagZeile[],
  istTeam: boolean,
): { blaetter: TurniertagBlatt[]; kompakt: boolean } {
  const hoch = teileInBlaetter(zeilen, istTeam);
  if (istTeam) {
    return { blaetter: hoch, kompakt: false };
  }
  const kompakt = teileInBlaetter(zeilen, istTeam, true);
  return kompakt.length < hoch.length
    ? { blaetter: kompakt, kompakt: true }
    : { blaetter: hoch, kompakt: false };
}

/** Meldungen durchnummeriert plus die nummerierten Leerzeilen. */
export function mitLeerzeilen(meldungen: readonly ExportMeldung[]): TurniertagZeile[] {
  const leer = Array.from({ length: LEERZEILEN }, (_, index) => ({
    nr: meldungen.length + index + 1,
    meldung: null,
  }));
  return [...meldungen.map((meldung) => ({ nr: meldung.nr, meldung })), ...leer];
}

/** Startgeld einer Meldung in Euro. */
export function startgeld(meldung: ExportMeldung, preisProSpieler: number): number {
  return meldung.spieler.length * preisProSpieler;
}

/**
 * Baut die Turniertag-Liste für die gewählten Disziplinen, chronologisch nach FLYER_ZEITPLAN
 * (Fr Team → Sa Einzel/U18/Triple → So Doppel). `maxTeams` ist das Limit des Teamwettbewerbs.
 */
export function baueTurniertagListe(
  disziplinen: readonly ExportDisziplin[],
  auswahl: ReadonlySet<Disziplin>,
  maxTeams: number | null,
): TurniertagDisziplin[] {
  return FLYER_ZEITPLAN.filter((zeitplan) => auswahl.has(zeitplan.disziplin)).flatMap(
    (zeitplan) => {
      const daten = disziplinen.find((eintrag) => eintrag.disziplin === zeitplan.disziplin);
      if (!daten) {
        return [];
      }
      const { blaetter, kompakt } = teileSparsamInBlaetter(
        mitLeerzeilen(daten.meldungen),
        daten.istTeam,
      );
      return [
        {
          disziplin: daten.disziplin,
          kompakteLeerzeilen: kompakt,
          label: daten.label,
          istTeam: daten.istTeam,
          zeitplan,
          preisProSpieler: daten.preisProSpieler,
          meldungen: daten.meldungen.length,
          maxMeldungen: daten.disziplin === 'TEAMWETTBEWERB' ? maxTeams : null,
          sollKasse: daten.meldungen.reduce(
            (summe, meldung) => summe + startgeld(meldung, daten.preisProSpieler),
            0,
          ),
          blaetter,
        },
      ];
    },
  );
}
