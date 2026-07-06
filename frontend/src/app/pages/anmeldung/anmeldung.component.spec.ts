import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnmeldungComponent } from './anmeldung.component';

describe('AnmeldungComponent', () => {
  let component: AnmeldungComponent;
  let fixture: ComponentFixture<AnmeldungComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnmeldungComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnmeldungComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('zeigt im Untertitel den Zusatz "pro Person"', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const subtitle = host.querySelector('.anmeldung-subtitle');
    expect(subtitle?.textContent).toContain('je Disziplin pro Person');
  });

  it('schreibt den Markennamen als „Radikal" (mit K), nicht „Radical"', () => {
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Radikal ID');
    expect(text).not.toContain('Radical');
  });

  it('zeigt den Hinweis „Bezahlung ausschließlich vor Ort"', () => {
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Die Bezahlung erfolgt ausschließlich vor Ort.');
  });
});
