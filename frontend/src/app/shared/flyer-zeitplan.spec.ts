import { DISZIPLINEN } from './disziplin';
import { FLYER_ZEITPLAN, FLYER_TURNIER, flyerZeilen } from './flyer-zeitplan';

describe('flyerZeitplan', () => {
  it('liefert für jede Disziplin aus DISZIPLINEN genau einen Zeitplan-Eintrag', () => {
    const werte = FLYER_ZEITPLAN.map((eintrag) => eintrag.disziplin);
    expect(werte.sort()).toEqual(DISZIPLINEN.map((d) => d.value).sort());
  });

  it('kombiniert Disziplin-Metadaten und Zeitplan pro Zeile', () => {
    const zeilen = flyerZeilen();

    expect(zeilen).toHaveLength(DISZIPLINEN.length);
    const team = zeilen.find((zeile) => zeile.value === 'TEAMWETTBEWERB');
    expect(team).toMatchObject({
      label: 'Teamwettbewerb',
      preisProSpieler: 10,
      tag: 'Fr 05.03.',
      spielmodus: '501 · Bo7',
      anmeldeschluss: '18:00',
      turnierbeginn: '19:00',
      ersterPlatz: '1.200 €',
    });
  });

  it('folgt der chronologischen FLYER_ZEITPLAN-Reihenfolge, unabhängig von DISZIPLINEN', () => {
    const zeilen = flyerZeilen();
    expect(zeilen.map((zeile) => zeile.value)).toEqual(
      FLYER_ZEITPLAN.map((eintrag) => eintrag.disziplin),
    );
  });

  it('enthält die zentralen Turnier-Eckdaten', () => {
    expect(FLYER_TURNIER.termin).toBe('05.–07. März 2027');
    expect(FLYER_TURNIER.ort).toBe('Teestube · Gahlendorfer Weg 25 · 23769 Fehmarn');
    expect(FLYER_TURNIER.anmeldeschlussDatum).toBe('28. Februar 2027');
    expect(FLYER_TURNIER.gesamtPreisgeld).toBe('über 13.000 €');
  });
});
