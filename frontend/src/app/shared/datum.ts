// Datums-Helfer rund um das ISO-Format yyyy-MM-dd (wie vom Backend geliefert und von
// <input type="date"> verwendet). Bewusst eigenständig gehalten, damit sie unabhängig von
// einzelnen Seiten wiederverwendbar bleiben.

const ISO_DATUM = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Wandelt `yyyy-MM-dd` in `dd.MM.yyyy`; leerer/ungültiger Wert ergibt einen leeren String. */
export function formatiereIsoDatum(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const treffer = ISO_DATUM.exec(iso);
  if (!treffer) {
    return '';
  }
  const [, jahr, monat, tag] = treffer;
  return `${tag}.${monat}.${jahr}`;
}

/** Heutiges Datum als `yyyy-MM-dd` – z. B. als `max` für Datumsfelder ohne Zukunftswerte. */
export function heuteAlsIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Ist der Wert ein reales Kalenderdatum im Format `yyyy-MM-dd` (vierstelliges Jahr)?
 * Der Rückvergleich der Datumsteile fängt Überlauf-Daten wie `2027-02-30` ab, die
 * `new Date(...)` sonst stillschweigend auf den Folgemonat umrechnet.
 */
export function istGueltigesIsoDatum(wert: string): boolean {
  const treffer = ISO_DATUM.exec(wert);
  if (!treffer) {
    return false;
  }
  const [, jahr, monat, tag] = treffer.map(Number);
  const datum = new Date(`${wert}T00:00:00`);
  return (
    !Number.isNaN(datum.getTime()) &&
    datum.getFullYear() === jahr &&
    datum.getMonth() + 1 === monat &&
    datum.getDate() === tag
  );
}

/** Liegt das ISO-Datum (lokal interpretiert) nach dem heutigen Tag? */
export function liegtInZukunft(iso: string): boolean {
  const datum = new Date(`${iso}T00:00:00`);
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  return datum.getTime() > heute.getTime();
}

function zweistellig(zahl: number): string {
  return String(zahl).padStart(2, '0');
}

/** Lokales Kalenderdatum eines Zeitpunkts als `yyyy-MM-dd` (z. B. für Dateinamen). */
export function alsLokalesIsoDatum(zeitpunkt: Date): string {
  return `${zeitpunkt.getFullYear()}-${zweistellig(zeitpunkt.getMonth() + 1)}-${zweistellig(zeitpunkt.getDate())}`;
}

/** Lokale Uhrzeit eines Zeitpunkts als `HH:mm`. */
function alsUhrzeit(zeitpunkt: Date): string {
  return `${zweistellig(zeitpunkt.getHours())}:${zweistellig(zeitpunkt.getMinutes())}`;
}

/** Zeitstempel für Menschen: `dd.MM.yyyy, HH:mm` (lokale Zeit). */
export function formatiereZeitstempel(zeitpunkt: Date): string {
  return `${formatiereIsoDatum(alsLokalesIsoDatum(zeitpunkt))}, ${alsUhrzeit(zeitpunkt)}`;
}

/** Technischer Zeitstempel: `yyyy-MM-dd HH:mm` (lokale Zeit), z. B. für die Radikal-Meldeliste. */
export function formatiereIsoZeitstempel(zeitpunkt: Date): string {
  return `${alsLokalesIsoDatum(zeitpunkt)} ${alsUhrzeit(zeitpunkt)}`;
}
