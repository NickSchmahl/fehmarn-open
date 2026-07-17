import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DISZIPLINEN } from '../../../../shared/disziplin';
import { AnmeldungFormService } from '../../services/anmeldung-form.service';
import { MeldungCardComponent } from './meldung-card.component';

const HERRENEINZEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENEINZEL');
const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');
const TEAMWETTBEWERB = DISZIPLINEN.findIndex((d) => d.value === 'TEAMWETTBEWERB');

describe('MeldungCardComponent', () => {
  let fixture: ComponentFixture<MeldungCardComponent>;
  let formService: AnmeldungFormService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeldungCardComponent],
      providers: [AnmeldungFormService],
    }).compileComponents();
    formService = TestBed.inject(AnmeldungFormService);
    fixture = TestBed.createComponent(MeldungCardComponent);
  });

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function richteEin(i: number): void {
    formService.disziplinGroup(i).get('selected')?.setValue(true);
    fixture.componentRef.setInput('meldungGroup', formService.meldungGroup(i, 0));
    fixture.componentRef.setInput('i', i);
    fixture.componentRef.setInput('k', 0);
    fixture.componentRef.setInput('meta', DISZIPLINEN[i]);
    fixture.detectChanges();
  }

  it('zeigt bei Team-Disziplinen das Teamname-Feld mit stabiler id', () => {
    richteEin(HERRENDOPPEL);
    expect(el().querySelector(`#teamname-${HERRENDOPPEL}-0`)).not.toBeNull();
  });

  it('zeigt bei Einzel-Disziplinen kein Teamname-Feld', () => {
    richteEin(HERRENEINZEL);
    expect(el().querySelector('.teamname-field')).toBeNull();
  });

  it('rendert je Spieler eine Spielerzeile', () => {
    richteEin(HERRENDOPPEL);
    expect(el().querySelectorAll('app-spieler-zeile')).toHaveLength(
      DISZIPLINEN[HERRENDOPPEL].minSpieler,
    );
  });

  it('fügt über den Button Spieler hinzu, bis das Maximum erreicht ist', () => {
    richteEin(TEAMWETTBEWERB);
    const button = el().querySelector<HTMLButtonElement>('.spieler-add');
    expect(button).not.toBeNull();

    button?.click();
    button?.click();
    fixture.detectChanges();

    expect(el().querySelectorAll('app-spieler-zeile')).toHaveLength(
      DISZIPLINEN[TEAMWETTBEWERB].maxSpieler,
    );
    expect(el().querySelector('.spieler-add')).toBeNull();
  });

  it('zeigt Teamname-Fehler erst nach Berührung an', () => {
    richteEin(HERRENDOPPEL);
    expect(el().querySelector('.field-error')).toBeNull();

    const ctrl = formService.meldungGroup(HERRENDOPPEL, 0).get('teamName');
    ctrl?.markAsTouched();
    ctrl?.updateValueAndValidity();
    fixture.detectChanges();

    expect(el().querySelector('.field-error')?.textContent).toContain('Teamname ist erforderlich.');
  });
});
