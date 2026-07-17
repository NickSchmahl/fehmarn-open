// Domänen- und DTO-Typen der Anmeldung: Request-Payloads (POST /api/anmeldung),
// Status-Antwort sowie die Strukturtypen der Formular-Rohwerte (form.getRawValue()).

import { Disziplin } from '../../../shared/disziplin';

/** Spieler-DTO; je nach Umschalter wird Radikal ID oder Initialen+Geburtsdatum gesendet. */
export interface SpielerPayload {
  vorname: string;
  nachname: string;
  radikalId: string | null;
  initialen: string | null;
  geburtsdatum: string | null; // ISO YYYY-MM-DD
}

/** Eine Meldung: Disziplin, (bei Team-Disziplinen) Teamname und ihre Spieler. */
export interface MeldungPayload {
  disziplin: Disziplin;
  teamName: string | null;
  spieler: SpielerPayload[];
}

/** Request-Body für POST /api/anmeldung. */
export interface AnmeldungRequest {
  disziplinen: MeldungPayload[];
}

/** Antwort von GET /api/anmeldung/status. */
export interface AnmeldeschlussStatus {
  anmeldungOffen: boolean;
  anmeldeschluss: string; // ISO YYYY-MM-DD
}

/** Eine Zeile der Preisaufschlüsselung: eine gewählte Disziplin mit Spielerzahl und Betrag. */
export interface PreisPosten {
  label: string;
  spielerAnzahl: number;
  preisProSpieler: number; // Startgeld je Spieler dieser Disziplin (0 = kostenlos, z. B. U18)
  betrag: number;
}

// ── Formular-Rohwerte ────────────────────────────────────────────────────────
// Nach form.reset() können Feldwerte null sein; die puren Funktionen behandeln das defensiv.

/** Rohwert einer Spielerzeile. */
export interface SpielerFormWert {
  vorname: string | null;
  nachname: string | null;
  hatKeineRadikalId: boolean | null;
  radikalId: string | null;
  initialen: string | null;
  geburtsdatum: string | null;
}

/** Rohwert einer Meldung (Teamname + Spielerzeilen). */
export interface MeldungFormWert {
  teamName: string | null;
  spieler: SpielerFormWert[];
}

/** Rohwert einer Disziplin-Gruppe (Checkbox + Meldungen). */
export interface DisziplinFormWert {
  selected: boolean | null;
  meldungen: MeldungFormWert[];
}

/** Rohwert des gesamten Anmeldeformulars. */
export interface AnmeldungFormWert {
  disziplinen: DisziplinFormWert[];
}
