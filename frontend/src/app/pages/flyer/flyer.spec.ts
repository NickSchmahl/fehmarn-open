import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Flyer } from './flyer';
import { FLYER_TURNIER } from '../../shared/flyer-zeitplan';

describe('Flyer', () => {
  let component: Flyer;
  let fixture: ComponentFixture<Flyer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Flyer],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Flyer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stellt die Turnier-Eckdaten bereit', () => {
    expect(component.turnier).toBe(FLYER_TURNIER);
  });

  it('stellt alle sieben Disziplin-Zeilen bereit', () => {
    expect(component.zeilen).toHaveLength(7);
    expect(component.zeilen[0].label).toBe('Teamwettbewerb');
  });
});
