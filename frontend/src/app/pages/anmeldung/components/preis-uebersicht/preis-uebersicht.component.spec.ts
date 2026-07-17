import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreisUebersichtComponent } from './preis-uebersicht.component';

describe('PreisUebersichtComponent', () => {
  let fixture: ComponentFixture<PreisUebersichtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreisUebersichtComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(PreisUebersichtComponent);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent;
  }

  it('zeigt je Posten eine Zeile mit Rechnung und Betrag', () => {
    fixture.componentRef.setInput('posten', [
      { label: 'Herrendoppel', spielerAnzahl: 4, preisProSpieler: 10, betrag: 40 },
    ]);
    fixture.componentRef.setInput('gesamt', 40);
    fixture.detectChanges();

    const zeilen = (fixture.nativeElement as HTMLElement).querySelectorAll('.price-line');
    expect(zeilen).toHaveLength(1);
    expect(text()).toContain('Herrendoppel · 4 Spieler × 10');
    expect(text()).toContain('40');
  });

  it('weist kostenlose Posten als „kostenlos" aus', () => {
    fixture.componentRef.setInput('posten', [
      { label: 'U18-Turnier', spielerAnzahl: 1, preisProSpieler: 0, betrag: 0 },
    ]);
    fixture.componentRef.setInput('gesamt', 0);
    fixture.detectChanges();

    expect(text()).toContain('kostenlos');
    expect(text()).not.toContain('×');
  });

  it('zeigt die Gesamtsumme', () => {
    fixture.componentRef.setInput('posten', []);
    fixture.componentRef.setInput('gesamt', 50);
    fixture.detectChanges();

    const total = (fixture.nativeElement as HTMLElement).querySelector('.price-total');
    expect(total?.textContent).toContain('50');
  });
});
