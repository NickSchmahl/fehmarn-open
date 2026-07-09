import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Impressum } from './impressum';

describe('Impressum', () => {
  let component: Impressum;
  let fixture: ComponentFixture<Impressum>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Impressum],
    }).compileComponents();

    fixture = TestBed.createComponent(Impressum);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('zeigt die Impressum-Überschrift und § 5 DDG', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Impressum');
    expect(element.textContent).toContain('§ 5 DDG');
  });
});
