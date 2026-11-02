import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DisziplinFilterComponent } from './disziplin-filter.component';
import { DisziplinFilter, FilterChip } from '../../shared/disziplin-filter';

const CHIPS: readonly FilterChip[] = [
  { value: 'ALLE', label: 'Alle', anzahl: 3 },
  { value: 'HERRENEINZEL', label: 'Herreneinzel', anzahl: 2 },
  { value: 'DAMENEINZEL', label: 'Dameneinzel', anzahl: 1 },
];

describe('DisziplinFilterComponent', () => {
  let fixture: ComponentFixture<DisziplinFilterComponent>;

  function buttons(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button.chip'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DisziplinFilterComponent] });
    fixture = TestBed.createComponent(DisziplinFilterComponent);
    fixture.componentRef.setInput('chips', CHIPS);
    fixture.componentRef.setInput('aktiv', 'HERRENEINZEL');
    fixture.detectChanges();
  });

  it('zeigt je Chip Label und Anzahl', () => {
    expect(buttons().map((b) => b.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      'Alle 3',
      'Herreneinzel 2',
      'Dameneinzel 1',
    ]);
  });

  it('markiert genau den aktiven Chip (Klasse + aria-selected)', () => {
    const [alle, herren] = buttons();
    expect(herren.classList.contains('chip--active')).toBe(true);
    expect(herren.getAttribute('aria-selected')).toBe('true');
    expect(alle.classList.contains('chip--active')).toBe(false);
    expect(alle.getAttribute('aria-selected')).toBe('false');
  });

  it('meldet die Auswahl beim Klick', () => {
    let gewaehlt: DisziplinFilter | undefined;
    fixture.componentInstance.auswahl.subscribe((wert) => (gewaehlt = wert));

    buttons()[2].click();

    expect(gewaehlt).toBe('DAMENEINZEL');
  });
});
