import { DISZIPLINEN } from './disziplin';

describe('Disziplin-Katalog', () => {
  const werte: string[] = DISZIPLINEN.map((d) => d.value as string);

  it('enthält Damendoppel als Doppel-Disziplin mit Teamname', () => {
    const damendoppel = DISZIPLINEN.find((d) => (d.value as string) === 'DAMENDOPPEL');
    expect(damendoppel).toBeDefined();
    expect(damendoppel?.label).toBe('Damendoppel');
    expect(damendoppel?.teamName).toBe(true);
  });

  it('bietet kein Mixed-Doppel mehr an', () => {
    expect(werte).not.toContain('MIXED_DOPPEL');
    expect(DISZIPLINEN.some((d) => d.label.includes('Mixed'))).toBe(false);
  });

  it('listet Damendoppel direkt nach Herrendoppel', () => {
    const iHerren = werte.indexOf('HERRENDOPPEL');
    const iDamen = werte.indexOf('DAMENDOPPEL');
    expect(iHerren).toBeGreaterThanOrEqual(0);
    expect(iDamen).toBe(iHerren + 1);
  });
});
