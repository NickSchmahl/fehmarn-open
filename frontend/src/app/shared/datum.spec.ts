import { formatiereIsoDatum } from './datum';

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
