// Turnier-Zeitplan des 12. Fehmarn Open (05.–07. März 2027), reale Daten aus dem
// Original-Flyer des Vereins. Ergänzt DISZIPLINEN (Preise/Spieleranzahl) um Tag,
// Spielmodus, Anmeldeschluss-Uhrzeit, Turnierbeginn und Preisgelder (1. Platz +
// weitere Platzierungen) – wird ausschließlich von der Flyer-Seite genutzt.

import { Disziplin, DISZIPLINEN, DisziplinMeta } from './disziplin';

export interface Preisplatzierung {
  label: string;
  wert: string;
}

// Platzierungs-Labels der weiteren Plätze (Platz 1 steht separat in ersterPlatz).
// Reihenfolge = Zeilen-/Spaltenreihenfolge auf dem Flyer.
export const WEITERE_PLATZ_LABELS = [
  '2.',
  '3.',
  '4.',
  '5./6.',
  '7./8.',
  '9./12.',
  '13./16.',
] as const;

// Baut die weiteren Platzierungen positionsweise passend zu WEITERE_PLATZ_LABELS
// und lässt nicht besetzte (leere) Plätze weg.
function weiterePlaetze(...werte: string[]): Preisplatzierung[] {
  return WEITERE_PLATZ_LABELS.map((label, index) => ({
    label,
    wert: werte[index] ?? '',
  })).filter((platz) => platz.wert !== '');
}

export interface FlyerZeitplanEintrag {
  disziplin: Disziplin;
  tag: string;
  spielmodus: string;
  anmeldeschluss: string;
  turnierbeginn: string;
  ersterPlatz: string;
  weiterePlaetze: Preisplatzierung[];
}

export const FLYER_ZEITPLAN: FlyerZeitplanEintrag[] = [
  {
    disziplin: 'TEAMWETTBEWERB',
    tag: 'Fr 05.03.',
    spielmodus: '501 · Bo7',
    anmeldeschluss: '18:00',
    turnierbeginn: '19:00',
    ersterPlatz: '1.200 €',
    weiterePlaetze: weiterePlaetze('700 €', '500 €', '300 €', '150 €', '100 €'),
  },
  {
    disziplin: 'HERRENEINZEL',
    tag: 'Sa 06.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '10:00',
    turnierbeginn: '11:00',
    ersterPlatz: '850 €',
    weiterePlaetze: weiterePlaetze('600 €', '400 €', '280 €', '125 €', '100 €', '75 €', '40 €'),
  },
  {
    disziplin: 'DAMENEINZEL',
    tag: 'Sa 06.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '12:00',
    turnierbeginn: '12:30',
    ersterPlatz: '300 €',
    weiterePlaetze: weiterePlaetze('200 €', '150 €', '100 €', '75 €', '50 €'),
  },
  {
    disziplin: 'U18',
    tag: 'Sa 06.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '13:00',
    turnierbeginn: '14:00',
    ersterPlatz: 'Sachpreise',
    weiterePlaetze: weiterePlaetze(),
  },
  {
    disziplin: 'TRIPLE_MIX',
    tag: 'Sa 06.03.',
    spielmodus: '701 · Bo3',
    anmeldeschluss: '19:30',
    turnierbeginn: 'n. Einzel',
    ersterPlatz: '800 €',
    weiterePlaetze: weiterePlaetze('550 €', '400 €', '300 €', '200 €', '150 €'),
  },
  {
    disziplin: 'HERRENDOPPEL',
    tag: 'So 07.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '10:30',
    turnierbeginn: '11:00',
    ersterPlatz: '600 €',
    weiterePlaetze: weiterePlaetze('400 €', '300 €', '200 €', '150 €', '100 €'),
  },
  {
    disziplin: 'DAMENDOPPEL',
    tag: 'So 07.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '11:30',
    turnierbeginn: '12:00',
    ersterPlatz: '350 €',
    weiterePlaetze: weiterePlaetze('250 €', '150 €', '100 €', '75 €'),
  },
];

export const FLYER_TURNIER = {
  titel: '12. Fehmarn Open',
  // Titel-Präfix und Gold-Akzent getrennt gepflegt, damit das Template nicht per
  // String-Splitting raten muss, welches Wort in --accent hervorgehoben wird.
  titelPraefix: '12. Fehmarn',
  titelAkzent: 'Open',
  jahr: '2027',
  termin: '05.–07. März 2027',
  ort: 'Teestube · Gahlendorfer Weg 25 · 23769 Fehmarn',
  anmeldeschlussDatum: '28. Februar 2027',
  gesamtPreisgeld: 'über 13.000 €',
  automaten: '50 Automaten',
  bestOf: 'Best of 3 – 7',
  vereinsname: 'Dartverein Fehmarn e.V.',
  unterzeile: 'präsentiert · powered by RadikalDarts',
  hinweisSpielmodus:
    'Gespielt auf 50 RadikalDarts-Automaten. 501er-Turniere: Verliererseite 301 · ' +
    'Triple Mix 501. Nicht beendete Disziplinen laufen am Folgetag ab 10:00 weiter.',
  hinweisEinlass:
    'Einlass tägl. ca. 2 Std. vor Start (Fr ab 17:00) · Radikal-Cards ab Fr 17:00 (5 €) · ' +
    'Zahlung & Check-in vor Ort. Gastronomie vor Ort – bitte keine eigenen Speisen.',
} as const;

export interface FlyerZeile extends DisziplinMeta {
  tag: string;
  spielmodus: string;
  anmeldeschluss: string;
  turnierbeginn: string;
  ersterPlatz: string;
  weiterePlaetze: Preisplatzierung[];
}

const ZEITPLAN_NACH_DISZIPLIN = new Map<Disziplin, FlyerZeitplanEintrag>(
  FLYER_ZEITPLAN.map((eintrag) => [eintrag.disziplin, eintrag]),
);

// Kombiniert DISZIPLINEN (Preise/Spieleranzahl) mit dem Zeitplan zu vollständigen
// Flyer-Zeilen, in der bestehenden chronologischen Reihenfolge von DISZIPLINEN.
export function flyerZeilen(): FlyerZeile[] {
  return DISZIPLINEN.map((disziplin) => {
    const zeitplan = ZEITPLAN_NACH_DISZIPLIN.get(disziplin.value);
    if (!zeitplan) {
      throw new Error(`Kein Flyer-Zeitplan für Disziplin ${disziplin.value} hinterlegt.`);
    }
    return { ...disziplin, ...zeitplan };
  });
}
