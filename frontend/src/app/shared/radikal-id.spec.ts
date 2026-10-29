import { anzeigeRadikalId, istNeueRadikalId, RadikalAngabe } from './radikal-id';

function angabe(over: Partial<RadikalAngabe>): RadikalAngabe {
  return { radikalId: null, initialen: null, geburtsdatum: null, ...over };
}

describe('istNeueRadikalId', () => {
  it('ist false, wenn eine Radikal-ID angegeben wurde', () => {
    expect(istNeueRadikalId(angabe({ radikalId: 'MK19041977' }))).toBe(false);
  });

  it('ist true ohne Radikal-ID', () => {
    expect(istNeueRadikalId(angabe({ initialen: 'HN', geburtsdatum: '1981-11-11' }))).toBe(true);
  });

  it('wertet eine leere oder nur aus Leerzeichen bestehende ID als fehlend', () => {
    expect(istNeueRadikalId(angabe({ radikalId: '' }))).toBe(true);
    expect(istNeueRadikalId(angabe({ radikalId: '   ' }))).toBe(true);
  });
});

describe('anzeigeRadikalId', () => {
  it('zeigt eine angegebene ID unverändert (ohne Randleerzeichen)', () => {
    expect(anzeigeRadikalId(angabe({ radikalId: ' MK19041977 ' }))).toBe('MK19041977');
  });

  it('bildet die ID aus Initialen und Geburtsdatum TTMMJJJJ', () => {
    expect(anzeigeRadikalId(angabe({ initialen: 'HN', geburtsdatum: '1981-11-11' }))).toBe(
      'HN11111981',
    );
    expect(anzeigeRadikalId(angabe({ initialen: 'hc', geburtsdatum: '1979-11-22' }))).toBe(
      'HC22111979',
    );
  });

  it('bevorzugt die angegebene ID vor Initialen und Geburtsdatum', () => {
    expect(
      anzeigeRadikalId(
        angabe({ radikalId: 'JA14021991', initialen: 'XX', geburtsdatum: '2000-01-01' }),
      ),
    ).toBe('JA14021991');
  });

  it('liefert leer, wenn weder ID noch Initialen/Geburtsdatum vorliegen', () => {
    expect(anzeigeRadikalId(angabe({}))).toBe('');
  });
});
