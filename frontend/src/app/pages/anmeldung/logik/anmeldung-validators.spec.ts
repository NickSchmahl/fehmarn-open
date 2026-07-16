import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  geburtsdatumValidator,
  mindestensEineDisziplinValidator,
  radikalIdAngabeValidator,
  radikalIdPatternValidator,
  spielernameMusterValidator,
  stringWert,
  teamnameMaxLaengeValidator,
  teamnameMusterValidator,
} from './anmeldung-validators';

/** Holt ein Control und macht fehlende Namen als Testfehler sichtbar (statt Non-Null-Assertion). */
function control(group: FormGroup, name: string): AbstractControl {
  const ctrl = group.get(name);
  if (!ctrl) throw new Error(`Control "${name}" fehlt in der Testgruppe`);
  return ctrl;
}

/** Spielergruppe wie im Formular, damit die Validatoren den Parent-Kontext sehen. */
function spielerGroup(werte: Partial<Record<string, string | boolean>> = {}): FormGroup {
  return new FormGroup({
    vorname: new FormControl(werte['vorname'] ?? ''),
    nachname: new FormControl(werte['nachname'] ?? ''),
    hatKeineRadikalId: new FormControl(werte['hatKeineRadikalId'] ?? false),
    radikalId: new FormControl(werte['radikalId'] ?? ''),
    initialen: new FormControl(werte['initialen'] ?? ''),
    geburtsdatum: new FormControl(werte['geburtsdatum'] ?? ''),
  });
}

describe('stringWert', () => {
  it('liefert String-Werte und sonst einen leeren String', () => {
    const group = new FormGroup({ a: new FormControl('x'), b: new FormControl(5) });
    expect(stringWert(group, 'a')).toBe('x');
    expect(stringWert(group, 'b')).toBe('');
    expect(stringWert(group, 'fehlt')).toBe('');
  });
});

describe('teamnameMaxLaengeValidator', () => {
  it('akzeptiert bis zu 20 Zeichen nach Normalisierung', () => {
    expect(teamnameMaxLaengeValidator(new FormControl('12345678901234567890'))).toBeNull();
    expect(teamnameMaxLaengeValidator(new FormControl('  viel   Whitespace  '))).toBeNull();
  });

  it('meldet Überlänge mit dem Limit als Fehlerwert', () => {
    expect(teamnameMaxLaengeValidator(new FormControl('123456789012345678901'))).toEqual({
      maxlaenge: 20,
    });
  });

  it('ignoriert leere Eingaben (Sache der Pflichtprüfung)', () => {
    expect(teamnameMaxLaengeValidator(new FormControl(''))).toBeNull();
  });
});

describe('teamnameMusterValidator', () => {
  it('akzeptiert Buchstaben (inkl. Umlaute), Ziffern und Leerzeichen', () => {
    expect(teamnameMusterValidator(new FormControl('Überflieger 08'))).toBeNull();
  });

  it('lehnt Sonderzeichen inkl. Bindestrich ab', () => {
    expect(teamnameMusterValidator(new FormControl('Team-X'))).toEqual({ zeichen: true });
    expect(teamnameMusterValidator(new FormControl('Darts!'))).toEqual({ zeichen: true });
  });

  it('ignoriert leere Eingaben', () => {
    expect(teamnameMusterValidator(new FormControl('   '))).toBeNull();
  });
});

describe('spielernameMusterValidator', () => {
  it('akzeptiert Doppelnamen mit Bindestrich und Leerzeichen', () => {
    expect(spielernameMusterValidator(new FormControl('Anna-Lena'))).toBeNull();
    expect(spielernameMusterValidator(new FormControl('Karl Heinz'))).toBeNull();
  });

  it('lehnt Ziffern und alleinstehende Bindestriche ab', () => {
    expect(spielernameMusterValidator(new FormControl('R2D2'))).toEqual({ zeichen: true });
    expect(spielernameMusterValidator(new FormControl('-Max'))).toEqual({ zeichen: true });
  });

  it('ignoriert leere Eingaben', () => {
    expect(spielernameMusterValidator(new FormControl(''))).toBeNull();
  });
});

describe('radikalIdPatternValidator', () => {
  it('akzeptiert zwei Buchstaben plus achtstelliges Datum', () => {
    const group = spielerGroup({ radikalId: 'MM01011990' });
    expect(radikalIdPatternValidator(control(group, 'radikalId'))).toBeNull();
  });

  it('lehnt das alte Format mit Bindestrich ab', () => {
    const group = spielerGroup({ radikalId: 'MM-1234' });
    expect(radikalIdPatternValidator(control(group, 'radikalId'))).toEqual({ pattern: true });
  });

  it('prüft im „keine ID"-Modus nicht (Feld ist ausgeblendet)', () => {
    const group = spielerGroup({ radikalId: 'MM-1234', hatKeineRadikalId: true });
    expect(radikalIdPatternValidator(control(group, 'radikalId'))).toBeNull();
  });

  it('ignoriert leere Eingaben', () => {
    const group = spielerGroup();
    expect(radikalIdPatternValidator(control(group, 'radikalId'))).toBeNull();
  });
});

describe('geburtsdatumValidator', () => {
  it('akzeptiert ein reales Datum in der Vergangenheit', () => {
    const group = spielerGroup({ hatKeineRadikalId: true, geburtsdatum: '1990-01-01' });
    expect(geburtsdatumValidator(control(group, 'geburtsdatum'))).toBeNull();
  });

  it('lehnt unmögliche oder formal falsche Daten ab', () => {
    for (const wert of ['2027-02-30', '19901-01-01', '01.01.1990']) {
      const group = spielerGroup({ hatKeineRadikalId: true, geburtsdatum: wert });
      expect(geburtsdatumValidator(control(group, 'geburtsdatum'))).toEqual({
        geburtsdatumUngueltig: true,
      });
    }
  });

  it('lehnt Zukunftsdaten ab', () => {
    const naechstesJahr = new Date().getFullYear() + 1;
    const group = spielerGroup({ hatKeineRadikalId: true, geburtsdatum: `${naechstesJahr}-06-15` });
    expect(geburtsdatumValidator(control(group, 'geburtsdatum'))).toEqual({
      geburtsdatumInZukunft: true,
    });
  });

  it('prüft nur im „keine ID"-Modus', () => {
    const group = spielerGroup({ geburtsdatum: 'Quatsch' });
    expect(geburtsdatumValidator(control(group, 'geburtsdatum'))).toBeNull();
  });
});

describe('radikalIdAngabeValidator', () => {
  it('verlangt eine Radikal ID, wenn der Umschalter aus ist', () => {
    expect(radikalIdAngabeValidator(spielerGroup())).toEqual({ radikalIdAngabeFehlt: true });
    expect(radikalIdAngabeValidator(spielerGroup({ radikalId: 'MM01011990' }))).toBeNull();
  });

  it('verlangt Initialen + Geburtsdatum im „keine ID"-Modus', () => {
    expect(
      radikalIdAngabeValidator(spielerGroup({ hatKeineRadikalId: true, initialen: 'MM' })),
    ).toEqual({ radikalIdAngabeFehlt: true });
    expect(
      radikalIdAngabeValidator(
        spielerGroup({ hatKeineRadikalId: true, initialen: 'MM', geburtsdatum: '1990-01-01' }),
      ),
    ).toBeNull();
  });
});

describe('mindestensEineDisziplinValidator', () => {
  function formMit(selected: boolean[]): FormGroup {
    return new FormGroup({
      disziplinen: new FormArray(
        selected.map((s) => new FormGroup({ selected: new FormControl(s) })),
      ),
    });
  }

  it('meldet noDisziplin, wenn nichts angehakt ist', () => {
    expect(mindestensEineDisziplinValidator(formMit([false, false]))).toEqual({
      noDisziplin: true,
    });
  });

  it('ist gültig, sobald eine Disziplin angehakt ist', () => {
    expect(mindestensEineDisziplinValidator(formMit([false, true]))).toBeNull();
  });
});
