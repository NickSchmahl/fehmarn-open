import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Flyer } from './flyer';

describe('Flyer', () => {
  let component: Flyer;
  let fixture: ComponentFixture<Flyer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Flyer],
    }).compileComponents();

    fixture = TestBed.createComponent(Flyer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
