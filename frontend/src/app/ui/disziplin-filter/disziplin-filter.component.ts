import { Component, input, output } from '@angular/core';
import { DisziplinFilter, FilterChip } from '@shared/disziplin-filter';

/**
 * Chip-Leiste zum Filtern nach Disziplin (#317). Präsentational: zeigt die Chips, markiert den
 * aktiven und meldet die Auswahl – den Filterzustand hält die Seite.
 */
@Component({
  selector: 'app-disziplin-filter',
  templateUrl: './disziplin-filter.component.html',
  styleUrl: './disziplin-filter.component.scss',
})
export class DisziplinFilterComponent {
  readonly chips = input.required<readonly FilterChip[]>();
  readonly aktiv = input.required<DisziplinFilter>();
  readonly auswahl = output<DisziplinFilter>();
}
