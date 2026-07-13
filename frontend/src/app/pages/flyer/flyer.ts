import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';
import { Disziplin } from '../../shared/disziplin';
import {
  FLYER_TURNIER,
  FlyerZeile,
  flyerZeilen,
  WEITERE_PLATZ_LABELS,
} from '../../shared/flyer-zeitplan';

@Component({
  selector: 'app-flyer',
  imports: [RouterLink, BrandIconComponent],
  templateUrl: './flyer.html',
  styleUrl: './flyer.scss',
})
export class Flyer {
  readonly turnier = FLYER_TURNIER;
  readonly zeilen: FlyerZeile[] = flyerZeilen();
  readonly weitereLabels = WEITERE_PLATZ_LABELS;

  // Offen-Zustand je Disziplin für das Hochformat-Accordion – bewusst pro Zeile,
  // damit sich mehrere Disziplinen unabhängig auf-/zuklappen lassen.
  private readonly offeneDisziplinen = signal<ReadonlySet<Disziplin>>(new Set());

  preisFuer(zeile: FlyerZeile, label: string): string {
    return zeile.weiterePlaetze.find((platz) => platz.label === label)?.wert ?? '';
  }

  istOffen(zeile: FlyerZeile): boolean {
    return this.offeneDisziplinen().has(zeile.value);
  }

  umschalten(zeile: FlyerZeile): void {
    // Zeilen ohne weitere Platzierungen (z. B. U18) sind nicht aufklappbar.
    if (zeile.weiterePlaetze.length === 0) {
      return;
    }
    this.offeneDisziplinen.update((offen) => {
      const naechste = new Set(offen);
      if (naechste.has(zeile.value)) {
        naechste.delete(zeile.value);
      } else {
        naechste.add(zeile.value);
      }
      return naechste;
    });
  }
}
