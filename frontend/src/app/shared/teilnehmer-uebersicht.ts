// Typen der öffentlichen Teilnehmerübersicht (GET /api/teilnehmer, Backend:
// TeilnehmerUebersichtResponse). Listen sind readonly (ADR 0014).

import { Disziplin } from './disziplin';

export interface SpielerEintrag {
  vorname: string;
  nachname: string;
}

export interface MeldungEintrag {
  teamName: string | null;
  spieler: readonly SpielerEintrag[];
}

export interface DisziplinGruppe {
  disziplin: Disziplin;
  anzahl: number;
  meldungen: readonly MeldungEintrag[];
}

export interface TeilnehmerUebersicht {
  disziplinen: readonly DisziplinGruppe[];
}
