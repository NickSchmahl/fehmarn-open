// Preislogik der Anmeldung als pure Funktionen über den Formular-Rohwerten.

import { DISZIPLINEN } from '../../../shared/disziplin';
import { DisziplinFormWert, PreisPosten } from '../model/anmeldung.model';

/** Wie viele Disziplinen sind aktuell angehakt? */
export function zaehleGewaehlteDisziplinen(disziplinen: DisziplinFormWert[]): number {
  return disziplinen.filter((d) => d.selected === true).length;
}

/**
 * Aufschlüsselung je Disziplin (eine Position pro Disziplin, unabhängig von der Anzahl
 * Meldungen): jede erfasste Person kostet das disziplin-abhängige Startgeld
 * (`meta.preisProSpieler`), der Betrag richtet sich also nach der Spielerzahl über alle
 * Meldungen dieser Disziplin hinweg. Kostenlose Disziplinen (z. B. U18) tragen 0 € bei.
 * Die Reihenfolge der Posten folgt der Index-Kopplung an {@link DISZIPLINEN}.
 */
export function berechnePreisPosten(disziplinen: DisziplinFormWert[]): PreisPosten[] {
  return disziplinen
    .map((disziplin, i) => ({ disziplin, meta: DISZIPLINEN[i] }))
    .filter(({ disziplin }) => disziplin.selected === true)
    .map(({ disziplin, meta }) => {
      const spielerAnzahl = disziplin.meldungen.reduce(
        (summe, meldung) => summe + meldung.spieler.length,
        0,
      );
      return {
        label: meta.label,
        spielerAnzahl,
        preisProSpieler: meta.preisProSpieler,
        betrag: spielerAnzahl * meta.preisProSpieler,
      };
    });
}

/** Summe aller Preisposten. */
export function berechneGesamtpreis(posten: PreisPosten[]): number {
  return posten.reduce((summe, p) => summe + p.betrag, 0);
}
