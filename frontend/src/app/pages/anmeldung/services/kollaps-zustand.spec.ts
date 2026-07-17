import { KollapsZustand } from './kollaps-zustand';

describe('KollapsZustand', () => {
  let zustand: KollapsZustand;

  beforeEach(() => {
    zustand = new KollapsZustand();
  });

  it('startet für alle Indizes aufgeklappt', () => {
    expect(zustand.istEingeklappt(0)).toBe(false);
    expect(zustand.istEingeklappt(5)).toBe(false);
  });

  it('schaltet den Zustand je Index um, ohne andere zu beeinflussen', () => {
    zustand.umschalten(2);
    expect(zustand.istEingeklappt(2)).toBe(true);
    expect(zustand.istEingeklappt(1)).toBe(false);
    zustand.umschalten(2);
    expect(zustand.istEingeklappt(2)).toBe(false);
  });

  it('setzt den Zustand explizit und idempotent', () => {
    zustand.setzen(3, true);
    zustand.setzen(3, true);
    expect(zustand.istEingeklappt(3)).toBe(true);
    zustand.setzen(3, false);
    expect(zustand.istEingeklappt(3)).toBe(false);
  });
});
