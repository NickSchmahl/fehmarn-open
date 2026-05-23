import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Teilnehmer } from './teilnehmer';

describe('Teilnehmer', () => {
  let component: Teilnehmer;
  let fixture: ComponentFixture<Teilnehmer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teilnehmer],
    }).compileComponents();

    fixture = TestBed.createComponent(Teilnehmer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
