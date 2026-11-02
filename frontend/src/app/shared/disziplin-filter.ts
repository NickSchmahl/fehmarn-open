// Disziplin-Filter der Teilnehmerlisten (öffentlich und Admin, #317): Filterwert, Chips und
// deren Aufbau als reine Funktion.

import { Disziplin, disziplinLabel } from './disziplin';

/** Gewählte Disziplin oder alle. */
export type DisziplinFilter = Disziplin | 'ALLE';

export interface FilterChip {
  value: DisziplinFilter;
  label: string;
  anzahl: number;
}

/** "Alle" mit der Gesamtzahl, danach jede vorhandene Disziplin mit ihrer Anzahl Meldungen. */
export function baueFilterChips(
  gruppen: readonly { disziplin: Disziplin; anzahl: number }[],
): readonly FilterChip[] {
  const gesamt = gruppen.reduce((summe, gruppe) => summe + gruppe.anzahl, 0);
  return [
    { value: 'ALLE', label: 'Alle', anzahl: gesamt },
    ...gruppen.map((gruppe) => ({
      value: gruppe.disziplin,
      label: disziplinLabel(gruppe.disziplin),
      anzahl: gruppe.anzahl,
    })),
  ];
}

/** Passt eine Gruppe zum gewählten Filter? */
export function passtZumFilter(disziplin: Disziplin, filter: DisziplinFilter): boolean {
  return filter === 'ALLE' || disziplin === filter;
}
