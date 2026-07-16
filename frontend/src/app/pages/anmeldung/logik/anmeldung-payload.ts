// Mapping der Formular-Rohwerte auf das Request-DTO für POST /api/anmeldung.

import { DISZIPLINEN } from '../../../shared/disziplin';
import {
  AnmeldungFormWert,
  AnmeldungRequest,
  SpielerFormWert,
  SpielerPayload,
} from '../model/anmeldung.model';
import { normalisiereTeamname } from './teamname';

/** Leere bzw. nur aus Leerzeichen bestehende Eingaben werden zu null (fürs Backend-DTO). */
function leerZuNull(value: string): string | null {
  return value.trim() !== '' ? value : null;
}

/** Nach form.reset() können Rohwerte null sein – für das DTO zählt das als leer. */
function alsString(value: string | null): string {
  return value ?? '';
}

/** Baut das Spieler-DTO; je nach Umschalter wird Radikal ID oder Initialen+Geburtsdatum gesendet. */
export function toSpielerPayload(spieler: SpielerFormWert): SpielerPayload {
  const hatKeine = spieler.hatKeineRadikalId === true;
  return {
    vorname: alsString(spieler.vorname),
    nachname: alsString(spieler.nachname),
    radikalId: hatKeine ? null : leerZuNull(alsString(spieler.radikalId)),
    initialen: hatKeine ? leerZuNull(alsString(spieler.initialen)) : null,
    geburtsdatum: hatKeine ? leerZuNull(alsString(spieler.geburtsdatum)) : null,
  };
}

/**
 * Baut den Request-Body aus dem Formular-Rohwert: nur angehakte Disziplinen, je Meldung eine
 * Position mit normalisiertem Teamnamen (Index-Kopplung an {@link DISZIPLINEN}).
 */
export function erstelleAnmeldungRequest(wert: AnmeldungFormWert): AnmeldungRequest {
  const disziplinen = wert.disziplinen
    .map((disziplin, i) => ({ disziplin, meta: DISZIPLINEN[i] }))
    .filter(({ disziplin }) => disziplin.selected === true)
    .flatMap(({ disziplin, meta }) =>
      disziplin.meldungen.map((meldung) => ({
        disziplin: meta.value,
        teamName: normalisiereTeamname(alsString(meldung.teamName)),
        spieler: meldung.spieler.map(toSpielerPayload),
      })),
    );
  return { disziplinen };
}
