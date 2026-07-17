import { DISZIPLINEN } from '../../../shared/disziplin';
import { DisziplinFormWert } from '../model/anmeldung.model';
import {
  berechneGesamtpreis,
  berechnePreisPosten,
  zaehleGewaehlteDisziplinen,
} from './preisberechnung';

const HERRENEINZEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENEINZEL');
const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');
const U18 = DISZIPLINEN.findIndex((d) => d.value === 'U18');

/** Leerer Formular-Rohwert: alle Disziplinen abgewählt. */
function leereDisziplinen(): DisziplinFormWert[] {
  return DISZIPLINEN.map(() => ({ selected: false, meldungen: [] }));
}

function meldungMit(spielerAnzahl: number) {
  return {
    teamName: '',
    spieler: Array.from({ length: spielerAnzahl }, () => ({
      vorname: '',
      nachname: '',
      hatKeineRadikalId: false,
      radikalId: '',
      initialen: '',
      geburtsdatum: '',
    })),
  };
}

describe('zaehleGewaehlteDisziplinen', () => {
  it('zählt nur angehakte Disziplinen', () => {
    const disziplinen = leereDisziplinen();
    expect(zaehleGewaehlteDisziplinen(disziplinen)).toBe(0);
    disziplinen[HERRENEINZEL].selected = true;
    disziplinen[U18].selected = true;
    expect(zaehleGewaehlteDisziplinen(disziplinen)).toBe(2);
  });
});

describe('berechnePreisPosten', () => {
  it('liefert keine Posten ohne Auswahl', () => {
    expect(berechnePreisPosten(leereDisziplinen())).toEqual([]);
  });

  it('berechnet je Disziplin eine Position über alle Meldungen hinweg', () => {
    const disziplinen = leereDisziplinen();
    disziplinen[HERRENDOPPEL] = {
      selected: true,
      meldungen: [meldungMit(2), meldungMit(2)],
    };
    expect(berechnePreisPosten(disziplinen)).toEqual([
      { label: 'Herrendoppel', spielerAnzahl: 4, preisProSpieler: 10, betrag: 40 },
    ]);
  });

  it('führt kostenlose Disziplinen (U18) mit 0 € auf', () => {
    const disziplinen = leereDisziplinen();
    disziplinen[U18] = { selected: true, meldungen: [meldungMit(1)] };
    expect(berechnePreisPosten(disziplinen)).toEqual([
      { label: 'U18-Turnier', spielerAnzahl: 1, preisProSpieler: 0, betrag: 0 },
    ]);
  });
});

describe('berechneGesamtpreis', () => {
  it('summiert alle Posten', () => {
    expect(
      berechneGesamtpreis([
        { label: 'A', spielerAnzahl: 2, preisProSpieler: 10, betrag: 20 },
        { label: 'B', spielerAnzahl: 3, preisProSpieler: 10, betrag: 30 },
      ]),
    ).toBe(50);
    expect(berechneGesamtpreis([])).toBe(0);
  });
});
