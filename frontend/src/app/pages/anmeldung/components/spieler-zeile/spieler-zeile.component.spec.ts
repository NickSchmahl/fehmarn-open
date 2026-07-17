import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { SpielerZeileComponent } from './spieler-zeile.component';

function spielerGroup(): FormGroup {
  return new FormGroup({
    vorname: new FormControl(''),
    nachname: new FormControl(''),
    hatKeineRadikalId: new FormControl(false),
    radikalId: new FormControl(''),
    initialen: new FormControl(''),
    geburtsdatum: new FormControl(''),
  });
}

describe('SpielerZeileComponent', () => {
  let fixture: ComponentFixture<SpielerZeileComponent>;
  let group: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpielerZeileComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SpielerZeileComponent);
    group = spielerGroup();
    fixture.componentRef.setInput('spielerGroup', group);
    fixture.componentRef.setInput('i', 2);
    fixture.componentRef.setInput('k', 0);
    fixture.componentRef.setInput('j', 1);
    fixture.componentRef.setInput('zeigeSpielerNr', true);
    fixture.componentRef.setInput('kannEntfernen', false);
    fixture.componentRef.setInput('kannMeldungEntfernen', false);
    fixture.componentRef.setInput('istErsatzZeile', false);
  });

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  /** Holt ein Element und macht fehlende Selektoren als Testfehler sichtbar. */
  function muss(selector: string): HTMLElement {
    const gefunden = el().querySelector<HTMLElement>(selector);
    if (!gefunden) throw new Error(`Element "${selector}" nicht gefunden`);
    return gefunden;
  }

  it('rendert die Eingabefelder mit dem stabilen id-Schema vorname-{i}-{k}-{j}', () => {
    fixture.detectChanges();
    expect(el().querySelector('#vorname-2-0-1')).not.toBeNull();
    expect(el().querySelector('#nachname-2-0-1')).not.toBeNull();
    expect(el().querySelector('#radikalId-2-0-1')).not.toBeNull();
  });

  it('beschriftet die Zeile je nach Modus mit Spieler- oder Meldungsnummer', () => {
    fixture.detectChanges();
    expect(el().querySelector('.spieler-nr')?.textContent).toContain('Spieler 2');

    fixture.componentRef.setInput('zeigeSpielerNr', false);
    fixture.detectChanges();
    expect(el().querySelector('.spieler-nr')?.textContent).toContain('Meldung 1');
  });

  it('zeigt im „keine ID"-Modus Initialen + Geburtsdatum statt Radikal ID', () => {
    group.get('hatKeineRadikalId')?.setValue(true);
    fixture.detectChanges();

    expect(el().querySelector('#radikalId-2-0-1')).toBeNull();
    expect(el().querySelector('#initialen-2-0-1')).not.toBeNull();
    expect(el().querySelector('#geburtsdatum-2-0-1')).not.toBeNull();
  });

  it('emittiert entfernen und meldungEntfernen über die Kopfzeilen-Buttons', () => {
    fixture.componentRef.setInput('kannEntfernen', true);
    fixture.componentRef.setInput('kannMeldungEntfernen', true);
    fixture.detectChanges();

    const entfernt: string[] = [];
    fixture.componentInstance.entfernen.subscribe(() => entfernt.push('spieler'));
    fixture.componentInstance.meldungEntfernen.subscribe(() => entfernt.push('meldung'));

    muss('.spieler-remove').click();
    muss('.meldung-remove').click();
    expect(entfernt).toEqual(['spieler', 'meldung']);
  });

  it('emittiert radikalIdUmgeschaltet beim Umschalten des Toggles', () => {
    fixture.detectChanges();
    let umgeschaltet = 0;
    fixture.componentInstance.radikalIdUmgeschaltet.subscribe(() => umgeschaltet++);

    muss('.radikal-toggle input').click();
    fixture.detectChanges();

    expect(umgeschaltet).toBe(1);
  });

  it('zeigt den Ersatz-Hinweis nur für die Ersatzzeile', () => {
    fixture.detectChanges();
    expect(el().querySelector('.ersatz-hinweis')).toBeNull();

    fixture.componentRef.setInput('istErsatzZeile', true);
    fixture.detectChanges();
    expect(el().querySelector('.ersatz-hinweis')?.textContent).toContain('Ersatz');
  });
});
