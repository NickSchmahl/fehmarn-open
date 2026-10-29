import { Component, computed, DestroyRef, DOCUMENT, effect, inject, input } from '@angular/core';
import { formatiereIsoZeitstempel } from '../../../shared/datum';
import { FLYER_TURNIER } from '../../../shared/flyer-zeitplan';
import { RadikalZeile } from '../logik/radikal-zeilen';
import { baueMeldeliste, Meldeliste } from '../logik/radikal-meldeliste';

/** CSS-Variable am Wurzelelement, aus der die `@page`-Fußzeile ihren Text liest. */
export const FUSS_VARIABLE = '--radikal-druck-fuss';

/**
 * Druckansicht „Meldeliste für Radikal" (#309): nüchternes Datenblatt in Graustufen, ohne
 * Ankreuz- und Kassenfelder. Fließender Umbruch; Seitenzahl und Stand stehen in der
 * `@page`-Fußzeile auf jeder Seite.
 */
@Component({
  selector: 'app-radikal-druck',
  standalone: true,
  templateUrl: './radikal-druck.component.html',
  styleUrl: './radikal-druck.component.scss',
})
export class RadikalDruckComponent {
  readonly zeilen = input.required<readonly RadikalZeile[]>();
  readonly stand = input.required<Date>();

  readonly turnier = `${FLYER_TURNIER.titel} ${FLYER_TURNIER.jahr} · ${FLYER_TURNIER.termin}`;

  readonly liste = computed<Meldeliste>(() => baueMeldeliste(this.zeilen()));
  readonly standIso = computed(() => formatiereIsoZeitstempel(this.stand()));

  constructor() {
    const wurzel = inject(DOCUMENT).documentElement;
    // Seitenrandboxen von @page erben nur vom Wurzelelement – daher die Variable dort setzen.
    effect(() => {
      wurzel.style.setProperty(
        FUSS_VARIABLE,
        `"fehmarn-open · Radikal-Meldeliste · Stand ${this.standIso()}"`,
      );
    });
    inject(DestroyRef).onDestroy(() => {
      wurzel.style.removeProperty(FUSS_VARIABLE);
    });
  }
}
