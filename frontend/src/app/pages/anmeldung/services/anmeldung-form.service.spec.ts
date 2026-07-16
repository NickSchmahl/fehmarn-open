import { TestBed } from '@angular/core/testing';
import { DISZIPLINEN } from '../../../shared/disziplin';
import { AnmeldungFormService } from './anmeldung-form.service';

const HERRENEINZEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENEINZEL');
const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');
const TEAMWETTBEWERB = DISZIPLINEN.findIndex((d) => d.value === 'TEAMWETTBEWERB');

describe('AnmeldungFormService', () => {
  let service: AnmeldungFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AnmeldungFormService] });
    service = TestBed.inject(AnmeldungFormService);
  });

  function waehle(i: number): void {
    service.disziplinGroup(i).get('selected')?.setValue(true);
  }

  it('baut je Disziplin eine Gruppe und ist ohne Auswahl formweit ungültig', () => {
    expect(service.disziplinenArray.length).toBe(DISZIPLINEN.length);
    expect(service.form.hasError('noDisziplin')).toBe(true);
  });

  it('legt beim Anwählen eine Meldung mit der Pflicht-Spielerzahl an', () => {
    waehle(HERRENDOPPEL);
    expect(service.meldungenArray(HERRENDOPPEL).length).toBe(1);
    expect(service.spielerArray(HERRENDOPPEL, 0).length).toBe(DISZIPLINEN[HERRENDOPPEL].minSpieler);
    expect(service.istDisziplinGewaehlt(HERRENDOPPEL)).toBe(true);
    expect(service.brauchtTeamname(HERRENDOPPEL)).toBe(true);
  });

  it('leert die Meldungen beim Abwählen und meldet die Abwahl über abwahl$', () => {
    const abwahlen: number[] = [];
    service.abwahl$.subscribe((i) => abwahlen.push(i));

    waehle(HERRENDOPPEL);
    service.disziplinGroup(HERRENDOPPEL).get('selected')?.setValue(false);

    expect(service.meldungenArray(HERRENDOPPEL).length).toBe(0);
    expect(abwahlen).toEqual([HERRENDOPPEL]);
  });

  it('hält Meldungs- und Spielergrenzen ein (add/remove/can*)', () => {
    waehle(HERRENDOPPEL);
    expect(service.canRemoveMeldung(HERRENDOPPEL)).toBe(false);

    const neuerIndex = service.addMeldung(HERRENDOPPEL);
    expect(neuerIndex).toBe(1);
    expect(service.canRemoveMeldung(HERRENDOPPEL)).toBe(true);
    service.removeMeldung(HERRENDOPPEL, 1);
    expect(service.meldungenArray(HERRENDOPPEL).length).toBe(1);

    // Herrendoppel: min = max = 2 → weder hinzufügen noch entfernen möglich
    expect(service.canAddSpieler(HERRENDOPPEL, 0)).toBe(false);
    expect(service.canRemoveSpieler(HERRENDOPPEL, 0)).toBe(false);

    waehle(TEAMWETTBEWERB);
    expect(service.spielerArray(TEAMWETTBEWERB, 0).length).toBe(4);
    service.addSpieler(TEAMWETTBEWERB, 0);
    service.addSpieler(TEAMWETTBEWERB, 0);
    expect(service.spielerArray(TEAMWETTBEWERB, 0).length).toBe(6);
    expect(service.canAddSpieler(TEAMWETTBEWERB, 0)).toBe(false);
    service.addSpieler(TEAMWETTBEWERB, 0); // über Maximum → ignoriert
    expect(service.spielerArray(TEAMWETTBEWERB, 0).length).toBe(6);
  });

  it('aktualisiert das formWert-Signal bei Änderungen und nach reset()', () => {
    waehle(HERRENEINZEL);
    expect(service.formWert().disziplinen[HERRENEINZEL].selected).toBe(true);
    expect(service.formWert().disziplinen[HERRENEINZEL].meldungen).toHaveLength(1);

    service.form.reset();
    expect(service.formWert().disziplinen[HERRENEINZEL].selected).toBeNull();
    expect(service.formWert().disziplinen[HERRENEINZEL].meldungen).toHaveLength(0);
  });

  it('setzt und entfernt Teamname-Dubletten am Feld', () => {
    waehle(HERRENDOPPEL);
    const gesetzt = service.setzeTeamnameDuplikat({
      disziplinIndex: HERRENDOPPEL,
      message: 'Schon vergeben',
    });

    expect(gesetzt).toBe(true);
    const ctrl = service.meldungGroup(HERRENDOPPEL, 0).get('teamName');
    expect(ctrl?.getError('duplikat')).toBe('Schon vergeben');
    expect(ctrl?.touched).toBe(true);

    service.entferneDuplikatFehler();
    expect(ctrl?.hasError('duplikat')).toBe(false);
    // Reguläre Validierung greift danach wieder (Teamname ist Pflicht)
    expect(ctrl?.hasError('required')).toBe(true);
  });

  it('lehnt Teamname-Dubletten ohne vorhandene Meldung ab', () => {
    expect(service.setzeTeamnameDuplikat({ disziplinIndex: HERRENDOPPEL, message: 'x' })).toBe(
      false,
    );
  });

  it('setzt und entfernt Spieler-Dubletten an Vor- und Nachname', () => {
    waehle(HERRENEINZEL);
    const gesetzt = service.setzeSpielerDuplikat({
      disziplinIndex: HERRENEINZEL,
      meldungIndex: 0,
      message: 'Doppelt gemeldet',
    });

    expect(gesetzt).toBe(true);
    const spieler = service.spielerGroup(HERRENEINZEL, 0, 0);
    expect(spieler.get('vorname')?.getError('duplikat')).toBe('Doppelt gemeldet');
    expect(spieler.get('nachname')?.getError('duplikat')).toBe('Doppelt gemeldet');

    service.entferneDuplikatFehler();
    expect(spieler.get('vorname')?.hasError('duplikat')).toBe(false);
  });

  it('lehnt Spieler-Dubletten mit zu großem Meldungsindex ab', () => {
    waehle(HERRENEINZEL);
    expect(
      service.setzeSpielerDuplikat({ disziplinIndex: HERRENEINZEL, meldungIndex: 5, message: 'x' }),
    ).toBe(false);
  });

  it('revalidiert Radikal-Felder beim Umschalten, damit veraltete Fehler verschwinden', () => {
    waehle(HERRENEINZEL);
    const spieler = service.spielerGroup(HERRENEINZEL, 0, 0);
    spieler.get('radikalId')?.setValue('MM-1234'); // ungültiges Format
    expect(spieler.get('radikalId')?.hasError('pattern')).toBe(true);

    spieler.get('hatKeineRadikalId')?.setValue(true);
    service.revalidiereRadikalFelder(HERRENEINZEL, 0, 0);
    expect(spieler.get('radikalId')?.hasError('pattern')).toBe(false);
  });
});
