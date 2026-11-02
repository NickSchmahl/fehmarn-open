import { baueFilterChips, passtZumFilter } from './disziplin-filter';

describe('baueFilterChips', () => {
  it('beginnt mit "Alle" und der Gesamtzahl, danach je Disziplin', () => {
    expect(
      baueFilterChips([
        { disziplin: 'HERRENEINZEL', anzahl: 3 },
        { disziplin: 'TEAMWETTBEWERB', anzahl: 2 },
      ]),
    ).toEqual([
      { value: 'ALLE', label: 'Alle', anzahl: 5 },
      { value: 'HERRENEINZEL', label: 'Herreneinzel', anzahl: 3 },
      { value: 'TEAMWETTBEWERB', label: 'Teamwettbewerb', anzahl: 2 },
    ]);
  });

  it('liefert ohne Gruppen nur "Alle" mit 0', () => {
    expect(baueFilterChips([])).toEqual([{ value: 'ALLE', label: 'Alle', anzahl: 0 }]);
  });
});

describe('passtZumFilter', () => {
  it('"Alle" lässt jede Disziplin durch', () => {
    expect(passtZumFilter('DAMENEINZEL', 'ALLE')).toBe(true);
  });

  it('eine Disziplin lässt nur sich selbst durch', () => {
    expect(passtZumFilter('DAMENEINZEL', 'DAMENEINZEL')).toBe(true);
    expect(passtZumFilter('HERRENEINZEL', 'DAMENEINZEL')).toBe(false);
  });
});
