import { Component, input } from '@angular/core';
import { PreisPosten } from '../../model/anmeldung.model';

/** Präsentationskomponente: Preisaufschlüsselung je gewählter Disziplin + Gesamtsumme. */
@Component({
  selector: 'app-preis-uebersicht',
  standalone: true,
  templateUrl: './preis-uebersicht.component.html',
  styleUrl: './preis-uebersicht.component.scss',
})
export class PreisUebersichtComponent {
  posten = input.required<PreisPosten[]>();
  gesamt = input.required<number>();
}
