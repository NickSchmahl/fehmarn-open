// Testdaten-Bausteine für die Export-Specs. Nur von *.spec.ts importiert, nicht im App-Bundle.

import {
  AdminGruppe,
  AdminMeldungEintrag,
  AdminSpielerEintrag,
  AdminUebersicht,
} from '../../../shared/admin-uebersicht';
import { Disziplin } from '../../../shared/disziplin';

let naechsteId = 1;

export function spieler(
  vorname: string,
  nachname: string,
  over: Partial<AdminSpielerEintrag> = {},
): AdminSpielerEintrag {
  return { vorname, nachname, radikalId: null, initialen: null, geburtsdatum: null, ...over };
}

/** Spieler mit angegebener Radikal-ID. */
export function mitId(vorname: string, nachname: string, radikalId: string): AdminSpielerEintrag {
  return spieler(vorname, nachname, { radikalId });
}

/** Spieler ohne Radikal-ID (NEU), mit Initialen + Geburtsdatum. */
export function ohneId(
  vorname: string,
  nachname: string,
  initialen: string,
  geburtsdatum: string,
): AdminSpielerEintrag {
  return spieler(vorname, nachname, { initialen, geburtsdatum });
}

export function meldung(
  spielerListe: AdminSpielerEintrag[],
  over: Partial<AdminMeldungEintrag> = {},
): AdminMeldungEintrag {
  return {
    id: naechsteId++,
    teamName: null,
    anwesend: false,
    abgemeldet: false,
    spieler: spielerListe,
    ...over,
  };
}

export function gruppe(disziplin: Disziplin, meldungen: AdminMeldungEintrag[]): AdminGruppe {
  return {
    disziplin,
    anzahl: meldungen.filter((eintrag) => !eintrag.abgemeldet).length,
    meldungen,
  };
}

export function uebersicht(...gruppen: AdminGruppe[]): AdminUebersicht {
  return { disziplinen: gruppen };
}

/** `anzahl` Einzel-Meldungen mit fortlaufenden, sortierbaren Nachnamen (Spieler001 …). */
export function vieleEinzel(disziplin: Disziplin, anzahl: number): AdminGruppe {
  const meldungen = Array.from({ length: anzahl }, (_, index) => {
    const nr = String(index + 1).padStart(3, '0');
    return meldung([mitId('Vorname', `Spieler${nr}`, `VS01011990`)]);
  });
  return gruppe(disziplin, meldungen);
}
