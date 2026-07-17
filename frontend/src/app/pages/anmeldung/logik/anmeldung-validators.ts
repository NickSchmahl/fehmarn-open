// Validatoren des Anmeldeformulars. Zeichensätze und Regeln sind vom Backend gespiegelt (#167);
// pure Funktionen ohne Angular-DI, damit sie isoliert testbar bleiben.

import { AbstractControl, FormArray, ValidationErrors } from '@angular/forms';
import { istGueltigesIsoDatum, liegtInZukunft } from '../../../shared/datum';
import { normalisiereTeamname, TEAMNAME_MAX_LAENGE } from './teamname';

/** Liest den Wert eines Controls typsicher als String (dynamisches `.value` ist sonst `any`). */
export function stringWert(group: AbstractControl, feld: string): string {
  const value: unknown = group.get(feld)?.value;
  return typeof value === 'string' ? value : '';
}

/** Feld-Validator: Teamname darf nach Normalisierung höchstens {@link TEAMNAME_MAX_LAENGE} Zeichen haben. */
export function teamnameMaxLaengeValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  const normalisiert = normalisiereTeamname(value);
  if (normalisiert === null) return null;
  return normalisiert.length > TEAMNAME_MAX_LAENGE ? { maxlaenge: TEAMNAME_MAX_LAENGE } : null;
}

/**
 * Zeichensatz wie im Backend (#167): nach Normalisierung nur Buchstaben (inkl. Umlaute), Ziffern und
 * Leerzeichen – Sonderzeichen inkl. Bindestrich sind verboten. Leer bleibt Sache der Pflichtprüfung.
 */
const TEAMNAME_MUSTER = /^[\p{L}\p{N} ]+$/u;
export function teamnameMusterValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  const normalisiert = normalisiereTeamname(value);
  if (normalisiert === null) return null;
  return TEAMNAME_MUSTER.test(normalisiert) ? null : { zeichen: true };
}

/**
 * Zeichensatz für Personennamen wie im Backend (#167): Buchstaben (inkl. Umlaute), einzelne
 * Leerzeichen und der Bindestrich für Doppelnamen – Letzterer nur zwischen zwei Buchstaben. Leere
 * Eingaben bleiben Sache der Pflichtprüfung (`Validators.required`).
 */
const SPIELERNAME_MUSTER = /^\p{L}+([ -]\p{L}+)*$/u;
export function spielernameMusterValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  const normalisiert = value.trim().replace(/\s+/g, ' ');
  if (normalisiert === '') return null;
  return SPIELERNAME_MUSTER.test(normalisiert) ? null : { zeichen: true };
}

/** Radikal ID: zwei Buchstaben (Initialen) + achtstelliges Geburtsdatum TTMMJJJJ (z. B. MM01011990). */
const RADIKAL_ID_MUSTER = /^[A-Za-z]{2}\d{8}$/;

/**
 * Feld-Validator für die Radikal ID. Im „keine ID"-Modus ist das Feld ausgeblendet – ein
 * (ggf. unfertiger) Wert bleibt zwar erhalten, wird dann aber nicht gegen das Muster geprüft.
 */
export function radikalIdPatternValidator(control: AbstractControl): ValidationErrors | null {
  const parent = control.parent;
  if (parent && parent.get('hatKeineRadikalId')?.value === true) return null;
  const value = typeof control.value === 'string' ? control.value : '';
  if (value === '') return null;
  return RADIKAL_ID_MUSTER.test(value) ? null : { pattern: true };
}

/** Initialen: genau zwei Großbuchstaben (A–Z), z. B. „MM“. */
const INITIALEN_MUSTER = /^[A-Z]{2}$/;

/**
 * Feld-Validator für die Initialen: genau zwei Großbuchstaben. Nur im „keine ID"-Modus relevant;
 * sonst ist das Feld ausgeblendet und ein Restwert wird nicht geprüft. Leer bleibt Sache der
 * Pflicht-Logik im Gruppen-Validator {@link radikalIdAngabeValidator}.
 */
export function initialenMusterValidator(control: AbstractControl): ValidationErrors | null {
  const parent = control.parent;
  if (!parent || parent.get('hatKeineRadikalId')?.value !== true) return null;
  const value = typeof control.value === 'string' ? control.value : '';
  if (value === '') return null;
  return INITIALEN_MUSTER.test(value) ? null : { initialenMuster: true };
}

/**
 * Feld-Validator fürs Geburtsdatum: erlaubt nur ein reales Datum mit vierstelligem Jahr
 * (`YYYY-MM-DD`) und kein Datum in der Zukunft. Nur im „keine ID"-Modus relevant; sonst ist
 * das Feld ausgeblendet und ein Restwert wird nicht geprüft. Leer ist ok – die Pflicht-Logik
 * steckt im Gruppen-Validator {@link radikalIdAngabeValidator}.
 */
export function geburtsdatumValidator(control: AbstractControl): ValidationErrors | null {
  const parent = control.parent;
  if (!parent || parent.get('hatKeineRadikalId')?.value !== true) return null;
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;
  if (!istGueltigesIsoDatum(value)) return { geburtsdatumUngueltig: true };
  if (liegtInZukunft(value)) return { geburtsdatumInZukunft: true };
  return null;
}

/**
 * Validator je Spielerzeile: Es muss entweder eine Radikal ID angegeben sein ODER
 * Initialen + Geburtsdatum, damit eine Radikal ID erstellt werden kann.
 */
export function radikalIdAngabeValidator(group: AbstractControl): ValidationErrors | null {
  const hatKeine = group.get('hatKeineRadikalId')?.value === true;
  if (hatKeine) {
    const initialen = stringWert(group, 'initialen').trim();
    const geburtsdatum = stringWert(group, 'geburtsdatum');
    return initialen !== '' && geburtsdatum !== '' ? null : { radikalIdAngabeFehlt: true };
  }
  return stringWert(group, 'radikalId').trim() !== '' ? null : { radikalIdAngabeFehlt: true };
}

/** Formular-Validator: Mindestens eine Disziplin muss angehakt sein. */
export function mindestensEineDisziplinValidator(group: AbstractControl): ValidationErrors | null {
  const arr = (group.get('disziplinen') as FormArray).controls;
  const anySelected = arr.some((c) => c.get('selected')?.value === true);
  return anySelected ? null : { noDisziplin: true };
}
