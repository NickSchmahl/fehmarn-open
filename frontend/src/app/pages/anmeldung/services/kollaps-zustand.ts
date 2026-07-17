import { signal } from '@angular/core';

/**
 * Reiner UI-State: Indizes der Disziplinen, deren Detailbereich eingeklappt ist. Bewusst NICHT im
 * Formularmodell, damit der Klapp-Zustand weder das POST-DTO noch die Validierung beeinflusst.
 * Nicht enthalten = aufgeklappt (Default). Siehe #184. DI-frei – die Komponente instanziiert
 * die Klasse selbst.
 */
export class KollapsZustand {
  private eingeklappt = signal(new Set<number>());

  /** Ist der Detailbereich der Disziplin {@link i} eingeklappt? Default (nicht enthalten) = offen. */
  istEingeklappt(i: number): boolean {
    return this.eingeklappt().has(i);
  }

  /** Schaltet den Klapp-Zustand der Disziplin {@link i} um (per Klick/Tastatur im Template). */
  umschalten(i: number): void {
    this.setzen(i, !this.istEingeklappt(i));
  }

  /** Setzt den Klapp-Zustand explizit; erzeugt eine neue Set-Instanz (Signal-Immutabilität). */
  setzen(i: number, eingeklappt: boolean): void {
    const next = new Set(this.eingeklappt());
    if (eingeklappt) {
      next.add(i);
    } else {
      next.delete(i);
    }
    this.eingeklappt.set(next);
  }
}
