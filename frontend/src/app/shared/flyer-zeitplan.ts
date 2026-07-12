// Turnier-Zeitplan des 12. Fehmarn Open (05.–07. März 2027), reale Daten aus dem
// Original-Flyer des Vereins. Ergänzt DISZIPLINEN (Preise/Spieleranzahl) um Tag,
// Spielmodus, Anmeldeschluss-Uhrzeit, Turnierbeginn und 1.-Platz-Preisgeld – wird
// ausschließlich von der Flyer-Seite genutzt.

import { Disziplin, DISZIPLINEN, DisziplinMeta } from './disziplin';

export interface FlyerZeitplanEintrag {
  disziplin: Disziplin;
  tag: string;
  spielmodus: string;
  anmeldeschluss: string;
  turnierbeginn: string;
  ersterPlatz: string;
}

export const FLYER_ZEITPLAN: FlyerZeitplanEintrag[] = [
  {
    disziplin: 'TEAMWETTBEWERB',
    tag: 'Fr 05.03.',
    spielmodus: '501 · Bo7',
    anmeldeschluss: '18:00',
    turnierbeginn: '19:00',
    ersterPlatz: '1.200 €',
  },
  {
    disziplin: 'HERRENEINZEL',
    tag: 'Sa 06.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '10:00',
    turnierbeginn: '11:00',
    ersterPlatz: '850 €',
  },
  {
    disziplin: 'DAMENEINZEL',
    tag: 'Sa 06.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '12:00',
    turnierbeginn: '12:30',
    ersterPlatz: '300 €',
  },
  {
    disziplin: 'U18',
    tag: 'Sa 06.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '13:00',
    turnierbeginn: '14:00',
    ersterPlatz: 'Sachpreise',
  },
  {
    disziplin: 'TRIPLE_MIX',
    tag: 'Sa 06.03.',
    spielmodus: '701 · Bo3',
    anmeldeschluss: '19:30',
    turnierbeginn: 'n. Einzel',
    ersterPlatz: '800 €',
  },
  {
    disziplin: 'HERRENDOPPEL',
    tag: 'So 07.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '10:30',
    turnierbeginn: '11:00',
    ersterPlatz: '600 €',
  },
  {
    disziplin: 'DAMENDOPPEL',
    tag: 'So 07.03.',
    spielmodus: '501 · Bo3',
    anmeldeschluss: '11:30',
    turnierbeginn: '12:00',
    ersterPlatz: '350 €',
  },
];

export const FLYER_TURNIER = {
  titel: '12. Fehmarn Open',
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
