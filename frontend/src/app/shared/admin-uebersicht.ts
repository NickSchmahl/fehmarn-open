// Typen der Admin-Übersicht (GET /api/admin/teilnehmer, Backend: AdminUebersichtResponse).
// Liegen in shared, weil Teilnehmerverwaltung und Export-Seite dieselbe Antwort lesen. Listen sind
// readonly (ADR 0014): Ableitungen erzeugen neue Listen statt die geladene Antwort zu verändern.

import { Disziplin } from './disziplin';

export interface AdminSpielerEintrag {
  vorname: string;
  nachname: string;
  radikalId: string | null;
  initialen: string | null;
  geburtsdatum: string | null; // ISO yyyy-MM-dd, nur Admin-Sicht
}

/** Eine Meldung im Admin: Status liegt pro Meldung, die Spieler hängen darunter. */
export interface AdminMeldungEintrag {
  id: number;
  teamName: string | null;
  anwesend: boolean;
  abgemeldet: boolean;
  spieler: readonly AdminSpielerEintrag[];
}

/** Meldungen einer Disziplin; `anzahl` zählt nur die aktiven (nicht abgemeldeten). */
export interface AdminGruppe {
  disziplin: Disziplin;
  anzahl: number;
  meldungen: readonly AdminMeldungEintrag[];
}

export interface AdminUebersicht {
  disziplinen: readonly AdminGruppe[];
}
