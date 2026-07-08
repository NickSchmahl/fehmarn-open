// Gemeinsames Disziplin-Modell, genutzt von Anmeldung und Teilnehmerübersicht.

export type Disziplin =
  'HERRENEINZEL' | 'DAMENEINZEL' | 'HERRENDOPPEL' | 'DAMENDOPPEL' | 'TRIPLE_MIX' | 'TEAMWETTBEWERB';

export interface DisziplinMeta {
  value: Disziplin;
  label: string;
  subtitle: string;
  teamName: boolean; // benötigt Teamname-Feld
  minSpieler: number; // Untergrenze Spielerzahl (deckt sich mit Backend-SpielerValidierungService)
  maxSpieler: number; // Obergrenze Spielerzahl
}

export const DISZIPLINEN: DisziplinMeta[] = [
  {
    value: 'HERRENEINZEL',
    label: 'Herreneinzel',
    subtitle: '',
    teamName: false,
    minSpieler: 1,
    maxSpieler: 1,
  },
  {
    value: 'DAMENEINZEL',
    label: 'Dameneinzel',
    subtitle: '',
    teamName: false,
    minSpieler: 1,
    maxSpieler: 1,
  },
  {
    value: 'HERRENDOPPEL',
    label: 'Herrendoppel',
    subtitle: '',
    teamName: true,
    minSpieler: 2,
    maxSpieler: 2,
  },
  {
    value: 'DAMENDOPPEL',
    label: 'Damendoppel',
    subtitle: '',
    teamName: true,
    minSpieler: 2,
    maxSpieler: 2,
  },
  {
    value: 'TRIPLE_MIX',
    label: 'Triple Mix',
    subtitle: 'Mindestens eine Frau',
    teamName: true,
    minSpieler: 3,
    maxSpieler: 4,
  },
  {
    value: 'TEAMWETTBEWERB',
    label: 'Teamwettbewerb',
    subtitle: 'Mindestens 4 Spieler',
    teamName: true,
    minSpieler: 4,
    maxSpieler: 6,
  },
];

const LABEL_BY_VALUE = new Map<Disziplin, string>(DISZIPLINEN.map((d) => [d.value, d.label]));

export function disziplinLabel(value: Disziplin): string {
  return LABEL_BY_VALUE.get(value) ?? value;
}
