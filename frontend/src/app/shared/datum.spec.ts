import { formatiereIsoDatum, heuteAlsIso, istGueltigesIsoDatum, liegtInZukunft } from './datum';

describe('formatiereIsoDatum', () => {
  it('formatiert ISO yyyy-MM-dd zu dd.MM.yyyy', () => {
    expect(formatiereIsoDatum('1990-03-14')).toBe('14.03.1990');
  });

  it('behält führende Nullen bei Tag und Monat', () => {
    expect(formatiereIsoDatum('2001-01-05')).toBe('05.01.2001');
  });

  it('liefert leeren String bei null', () => {
    expect(formatiereIsoDatum(null)).toBe('');
  });

  it('liefert leeren String bei leerem oder unpassendem Wert', () => {
    expect(formatiereIsoDatum('')).toBe('');
    expect(formatiereIsoDatum('14.03.1990')).toBe('');
  });
});

describe('heuteAlsIso', () => {
  it('liefert das heutige Datum im Format yyyy-MM-dd', () => {
    expect(heuteAlsIso()).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('istGueltigesIsoDatum', () => {
  it('akzeptiert ein reales Datum', () => {
    expect(istGueltigesIsoDatum('1990-03-14')).toBe(true);
  });

  it('lehnt falsche Formate ab (deutsches Format, fünfstelliges Jahr, leer)', () => {
    expect(istGueltigesIsoDatum('14.03.1990')).toBe(false);
    expect(istGueltigesIsoDatum('19901-03-14')).toBe(false);
    expect(istGueltigesIsoDatum('')).toBe(false);
  });

  it('lehnt formal passende, aber nicht existierende Kalendertage ab', () => {
    expect(istGueltigesIsoDatum('2027-02-30')).toBe(false);
    expect(istGueltigesIsoDatum('2027-13-01')).toBe(false);
  });
});

describe('liegtInZukunft', () => {
  it('erkennt ein morgiges Datum als Zukunft', () => {
    const morgen = new Date();
    morgen.setDate(morgen.getDate() + 1);
    const jahr = morgen.getFullYear();
    const monat = String(morgen.getMonth() + 1).padStart(2, '0');
    const tag = String(morgen.getDate()).padStart(2, '0');
    expect(liegtInZukunft(`${jahr}-${monat}-${tag}`)).toBe(true);
  });

  it('zählt Vergangenheit und den heutigen Tag nicht als Zukunft', () => {
    expect(liegtInZukunft('1990-03-14')).toBe(false);
    const heute = new Date();
    const jahr = heute.getFullYear();
    const monat = String(heute.getMonth() + 1).padStart(2, '0');
    const tag = String(heute.getDate()).padStart(2, '0');
    expect(liegtInZukunft(`${jahr}-${monat}-${tag}`)).toBe(false);
  });
});
