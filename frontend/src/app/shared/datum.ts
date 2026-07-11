// Formatiert ein ISO-Datum (yyyy-MM-dd, wie vom Backend geliefert) für die deutsche Anzeige.
// Bewusst eigenständig gehalten, damit es unabhängig von einzelnen Seiten wiederverwendbar bleibt.

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
