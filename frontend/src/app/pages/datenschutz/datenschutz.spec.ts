import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Datenschutz } from './datenschutz';

describe('Datenschutz', () => {
  let component: Datenschutz;
  let fixture: ComponentFixture<Datenschutz>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Datenschutz],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Datenschutz);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('zeigt die Datenschutz-Überschrift und verlinkt das Impressum', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Datenschutzerklärung');
    const impressumLink = element.querySelector('a[href="/impressum"]');
    expect(impressumLink).not.toBeNull();
  });
});
