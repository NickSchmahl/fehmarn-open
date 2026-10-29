// Radikal-ID eines Spielers für Exporte und Listen. Hat ein Spieler bei der Anmeldung keine ID
// angegeben, wird sie wie im Hinweistext der Anmeldung aus Initialen + Geburtsdatum (TTMMJJJJ)
// gebildet und im Radikal-System neu angelegt. CSV und beide Druckansichten nutzen diese
// Funktionen, damit überall dieselbe ID steht.

import { formatiereIsoDatum } from './datum';

/** Der Ausschnitt eines Spielers, aus dem sich die Radikal-ID ergibt. */
export interface RadikalAngabe {
  radikalId: string | null;
  initialen: string | null;
  geburtsdatum: string | null; // ISO yyyy-MM-dd
}

/** Hat der Spieler keine eigene Radikal-ID angegeben (→ muss bei Radikal angelegt werden)? */
export function istNeueRadikalId(spieler: RadikalAngabe): boolean {
  return !spieler.radikalId?.trim();
}

/**
 * Angezeigte Radikal-ID: die angegebene oder die aus Initialen + Geburtsdatum gebildete
 * (z. B. `HN` + `1981-11-11` → `HN11111981`). Fehlt beides, bleibt der Wert leer.
 */
export function anzeigeRadikalId(spieler: RadikalAngabe): string {
  if (!istNeueRadikalId(spieler)) {
    return (spieler.radikalId ?? '').trim();
  }
  const initialen = (spieler.initialen ?? '').trim().toUpperCase();
  const datum = formatiereIsoDatum(spieler.geburtsdatum).replaceAll('.', '');
  return `${initialen}${datum}`;
}
