// Teamname-Regeln, gespiegelt vom Backend (siehe TeamnameValidierungService).

/** Maximale Teamname-Länge (Radikal-Software-Limit), gemessen nach Normalisierung. */
export const TEAMNAME_MAX_LAENGE = 20;

/**
 * Teamname-Normalisierung wie im Backend (siehe TeamnameValidierungService): führende/abschließende
 * Leerzeichen entfernen und interne Mehrfach-Whitespaces zu einem einzelnen zusammenfassen. Leere
 * bzw. reine Whitespace-Eingaben ergeben null.
 */
export function normalisiereTeamname(value: string): string | null {
  const normalisiert = value.trim().replace(/\s+/g, ' ');
  return normalisiert === '' ? null : normalisiert;
}
