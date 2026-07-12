import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeldungAktionenComponent } from './meldung-aktionen.component';

function createFixture(
  anwesend: boolean,
  abgemeldet: boolean,
): ComponentFixture<MeldungAktionenComponent> {
  const fixture = TestBed.createComponent(MeldungAktionenComponent);
  fixture.componentRef.setInput('anwesend', anwesend);
  fixture.componentRef.setInput('abgemeldet', abgemeldet);
  fixture.detectChanges();
  return fixture;
}

describe('MeldungAktionenComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeldungAktionenComponent],
    }).compileComponents();
  });

  it('zeigt den Anwesend-Toggle mit aria-pressed=false, wenn nicht anwesend', () => {
    const fixture = createFixture(false, false);
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.ma-btn--anwesend');
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
    expect(btn?.getAttribute('aria-label')).toBe('Als anwesend markieren');
  });

  it('markiert den Anwesend-Toggle als aktiv (aria-pressed=true), wenn anwesend', () => {
    const fixture = createFixture(true, false);
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.ma-btn--anwesend');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
    expect(btn?.classList.contains('ma-btn--anwesend-aktiv')).toBe(true);
    expect(btn?.getAttribute('aria-label')).toBe('Als abwesend markieren');
  });

  it('emittiert beim Klick den umgeschalteten Anwesend-Wert', () => {
    const fixture = createFixture(false, false);
    let emitted: boolean | undefined;
    fixture.componentInstance.toggleAnwesenheit.subscribe((wert) => (emitted = wert));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.ma-btn--anwesend')
      ?.click();
    expect(emitted).toBe(true);
  });

  it('zeigt den Abmelden-Button, wenn nicht abgemeldet, und emittiert beim Klick', () => {
    const fixture = createFixture(false, false);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.ma-btn--reaktivieren')).toBeNull();
    const abmelden = root.querySelector<HTMLButtonElement>('.ma-btn--abmelden');
    expect(abmelden?.getAttribute('aria-label')).toBe('Abmelden');
    let gefeuert = false;
    fixture.componentInstance.abmelden.subscribe(() => (gefeuert = true));
    abmelden?.click();
    expect(gefeuert).toBe(true);
  });

  it('zeigt den Reaktivieren-Button, wenn abgemeldet, und emittiert beim Klick', () => {
    const fixture = createFixture(false, true);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.ma-btn--abmelden')).toBeNull();
    const reaktivieren = root.querySelector<HTMLButtonElement>('.ma-btn--reaktivieren');
    expect(reaktivieren?.getAttribute('aria-label')).toBe('Reaktivieren');
    let gefeuert = false;
    fixture.componentInstance.reaktivieren.subscribe(() => (gefeuert = true));
    reaktivieren?.click();
    expect(gefeuert).toBe(true);
  });
});
