import { normalisiereTeamname, TEAMNAME_MAX_LAENGE } from './teamname';

describe('normalisiereTeamname', () => {
  it('entfernt führende/abschließende Leerzeichen und fasst interne Whitespaces zusammen', () => {
    expect(normalisiereTeamname('  Die   Bullseye\tBoys  ')).toBe('Die Bullseye Boys');
  });

  it('lässt bereits normalisierte Namen unverändert', () => {
    expect(normalisiereTeamname('Team X')).toBe('Team X');
  });

  it('ergibt null bei leeren oder reinen Whitespace-Eingaben', () => {
    expect(normalisiereTeamname('')).toBeNull();
    expect(normalisiereTeamname('   ')).toBeNull();
  });
});

describe('TEAMNAME_MAX_LAENGE', () => {
  it('entspricht dem Radikal-Software-Limit von 20 Zeichen', () => {
    expect(TEAMNAME_MAX_LAENGE).toBe(20);
  });
});
