// Gemeinsames Disziplin-Modell, genutzt von Anmeldung und Teilnehmerübersicht.

export type Disziplin =
  | 'HERRENEINZEL'
  | 'DAMENEINZEL'
  | 'HERRENDOPPEL'
  | 'MIXED_DOPPEL'
  | 'TRIPLE_MIX'
  | 'TEAMWETTBEWERB';

export interface DisziplinMeta {
  value: Disziplin;
  label: string;
  subtitle: string;
  teamName: boolean; // benötigt Teamname-Feld
}

export const DISZIPLINEN: DisziplinMeta[] = [
  { value: 'HERRENEINZEL', label: 'Herreneinzel', subtitle: '', teamName: false },
  { value: 'DAMENEINZEL', label: 'Dameneinzel', subtitle: '', teamName: false },
  { value: 'HERRENDOPPEL', label: 'Herrendoppel', subtitle: '', teamName: true },
  { value: 'MIXED_DOPPEL', label: 'Mixed-Doppel', subtitle: 'Mindestens eine Frau', teamName: true },
  { value: 'TRIPLE_MIX', label: 'Triple Mix', subtitle: 'Mindestens eine Frau', teamName: true },
  { value: 'TEAMWETTBEWERB', label: 'Teamwettbewerb', subtitle: 'Mindestens 4 Spieler', teamName: true },
];

const LABEL_BY_VALUE = new Map<Disziplin, string>(DISZIPLINEN.map((d) => [d.value, d.label]));

export function disziplinLabel(value: Disziplin): string {
  return LABEL_BY_VALUE.get(value) ?? value;
}
