// Gemeinsames Disziplin-Modell, genutzt von Anmeldung und Teilnehmerübersicht.

export type Disziplin =
  | 'TEAMWETTBEWERB'
  | 'HERRENEINZEL'
  | 'DAMENEINZEL'
  | 'U18'
  | 'TRIPLE_MIX'
  | 'HERRENDOPPEL'
  | 'DAMENDOPPEL';

export interface DisziplinMeta {
  value: Disziplin;
  label: string;
  subtitle: string;
  teamName: boolean; // benötigt Teamname-Feld
  minSpieler: number; // Untergrenze Spielerzahl (deckt sich mit Backend-SpielerValidierungService)
  maxSpieler: number; // Obergrenze Spielerzahl
  preisProSpieler: number; // Startgeld je Spieler in Euro (U18 ist kostenlos = 0)
}

// Reihenfolge chronologisch nach Turnierzeitpunkt (Flyer 2027) – schlägt überall durch,
// wo Disziplinen gelistet werden.
export const DISZIPLINEN: DisziplinMeta[] = [
  {
    value: 'TEAMWETTBEWERB',
    label: 'Teamwettbewerb',
    subtitle: 'Mindestens 4 Spieler',
    teamName: true,
    minSpieler: 4,
    maxSpieler: 6,
    preisProSpieler: 10,
  },
  {
    value: 'HERRENEINZEL',
    label: 'Herreneinzel',
    subtitle: '',
    teamName: false,
    minSpieler: 1,
    maxSpieler: 1,
    preisProSpieler: 10,
  },
  {
    value: 'DAMENEINZEL',
    label: 'Dameneinzel',
    subtitle: '',
    teamName: false,
    minSpieler: 1,
    maxSpieler: 1,
    preisProSpieler: 10,
  },
  {
    value: 'U18',
    label: 'U18-Turnier',
    subtitle: '',
    teamName: false,
    minSpieler: 1,
    maxSpieler: 1,
    preisProSpieler: 0,
  },
  {
    value: 'TRIPLE_MIX',
    label: 'Triple Mix',
    subtitle: 'Mindestens eine Frau',
    teamName: true,
    minSpieler: 3,
    maxSpieler: 4,
    preisProSpieler: 10,
  },
  {
    value: 'HERRENDOPPEL',
    label: 'Herrendoppel',
    subtitle: '',
    teamName: true,
    minSpieler: 2,
    maxSpieler: 2,
    preisProSpieler: 10,
  },
  {
    value: 'DAMENDOPPEL',
    label: 'Damendoppel',
    subtitle: '',
    teamName: true,
    minSpieler: 2,
    maxSpieler: 2,
    preisProSpieler: 10,
  },
];

const LABEL_BY_VALUE = new Map<Disziplin, string>(DISZIPLINEN.map((d) => [d.value, d.label]));

export function disziplinLabel(value: Disziplin): string {
  return LABEL_BY_VALUE.get(value) ?? value;
}
