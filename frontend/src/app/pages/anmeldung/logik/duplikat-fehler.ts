// Parsing der fachlichen 409-Duplikat-Antworten des Backends (siehe ADR 0011).
// Pur gehalten: hier wird nur der Fehler interpretiert; das Setzen der Fehler an den
// Form-Controls übernimmt der Aufrufer (Formular-Schicht).

import { HttpErrorResponse } from '@angular/common/http';
import { DISZIPLINEN } from '../../../shared/disziplin';

/** Teamname-Dublette: Disziplin-Feldkennung (z. B. `"HERRENDOPPEL"`). */
export interface TeamnameDuplikat {
  disziplinIndex: number;
  message: string;
}

/** Spieler-Dublette (#170): Feldkennung `"<DISZIPLIN>:<meldungsIndex>"`. */
export interface SpielerDuplikat {
  disziplinIndex: number;
  meldungIndex: number;
  message: string;
}

/** Erster Feldfehler eines 409, sonst undefined. */
function ersterFeldFehler(err: unknown): { field?: string; message?: string } | undefined {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) return undefined;
  return (err.error as { errors?: { field?: string; message?: string }[] } | null)?.errors?.[0];
}

/** Wertet einen 409 mit reiner Disziplin-Feldkennung als Teamname-Dublette aus. */
export function parseTeamnameDuplikat(err: unknown): TeamnameDuplikat | null {
  const feld = ersterFeldFehler(err);
  if (!feld?.field) return null;
  const index = DISZIPLINEN.findIndex((d) => d.value === feld.field);
  if (index < 0) return null;
  return {
    disziplinIndex: index,
    message: feld.message ?? 'Teamname ist in dieser Disziplin bereits vergeben.',
  };
}

/**
 * Feldkennung des ausgebuchten Teamwettbewerbs (#96er-Limit). Bewusst mit Suffix, damit sie weder
 * als Teamname-Dublette (reine Disziplin-Kennung) noch als Spieler-Dublette (`<DISZIPLIN>:<index>`)
 * durchgeht.
 */
const TEAMLIMIT_FELD = 'TEAMWETTBEWERB:limit';

/** Wertet einen 409 mit der Teamlimit-Kennung aus und liefert die Meldung, sonst null. */
export function parseTeamlimitFehler(err: unknown): string | null {
  const feld = ersterFeldFehler(err);
  if (feld?.field !== TEAMLIMIT_FELD) return null;
  return feld.message ?? 'Der Teamwettbewerb ist ausgebucht.';
}

/** Wertet einen 409 mit Feldkennung `"<DISZIPLIN>:<index>"` als Einzel-Spieler-Dublette aus (#170). */
export function parseSpielerDuplikat(err: unknown): SpielerDuplikat | null {
  const feld = ersterFeldFehler(err);
  if (!feld?.field?.includes(':')) return null;
  const [disziplin, indexText] = feld.field.split(':');
  const i = DISZIPLINEN.findIndex((d) => d.value === disziplin);
  const k = Number(indexText);
  if (i < 0 || Number.isNaN(k) || k < 0) return null;
  return {
    disziplinIndex: i,
    meldungIndex: k,
    message: feld.message ?? 'Diese Person ist in dieser Disziplin bereits gemeldet.',
  };
}
