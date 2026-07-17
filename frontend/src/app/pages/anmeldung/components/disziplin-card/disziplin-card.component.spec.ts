import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DISZIPLINEN } from '../../../../shared/disziplin';
import { AnmeldungFormService } from '../../services/anmeldung-form.service';
import { DisziplinCardComponent } from './disziplin-card.component';

const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');

describe('DisziplinCardComponent', () => {
  let fixture: ComponentFixture<DisziplinCardComponent>;
  let formService: AnmeldungFormService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisziplinCardComponent],
      providers: [AnmeldungFormService],
    }).compileComponents();
    formService = TestBed.inject(AnmeldungFormService);
    fixture = TestBed.createComponent(DisziplinCardComponent);
    fixture.componentRef.setInput('meta', DISZIPLINEN[HERRENDOPPEL]);
    fixture.componentRef.setInput('index', HERRENDOPPEL);
    fixture.componentRef.setInput('eingeklappt', false);
    fixture.detectChanges();
  });

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('zeigt anfangs die Auswahl-Titelzeile ohne Meldungen-Block', () => {
    expect(el().querySelector('.disziplin-card--selected')).toBeNull();
    expect(el().querySelector('.meldungen-block')).toBeNull();
    expect(el().querySelector('.disziplin-name')?.textContent).toContain('Herrendoppel');
  });

  it('wählt die Disziplin per Checkbox an und rendert die Meldungen', () => {
    const checkbox = el().querySelector<HTMLInputElement>('.disziplin-checkbox-input');
    checkbox?.click();
    fixture.detectChanges();

    expect(el().querySelector('.disziplin-card--selected')).not.toBeNull();
    expect(el().querySelectorAll('app-meldung-card')).toHaveLength(1);
    expect(el().querySelector(`#disziplin-detail-${HERRENDOPPEL}`)).not.toBeNull();
  });

  it('fügt über den Button eine weitere Meldung hinzu', () => {
    formService.disziplinGroup(HERRENDOPPEL).get('selected')?.setValue(true);
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.meldung-add')?.click();
    fixture.detectChanges();

    expect(el().querySelectorAll('app-meldung-card')).toHaveLength(2);
  });

  it('verbirgt den Meldungen-Block im eingeklappten Zustand und zeigt die Zähler-Pill', () => {
    formService.disziplinGroup(HERRENDOPPEL).get('selected')?.setValue(true);
    fixture.componentRef.setInput('eingeklappt', true);
    fixture.detectChanges();

    expect(el().querySelector('.meldungen-block')).toBeNull();
    expect(el().querySelector('.collapse-count')?.textContent).toContain('1');
  });

  it('meldet Klicks auf die Titelzeile über klappUmschalten', () => {
    formService.disziplinGroup(HERRENDOPPEL).get('selected')?.setValue(true);
    fixture.detectChanges();

    let umgeschaltet = 0;
    fixture.componentInstance.klappUmschalten.subscribe(() => umgeschaltet++);
    el().querySelector<HTMLButtonElement>('button.disziplin-headline')?.click();

    expect(umgeschaltet).toBe(1);
  });
});
