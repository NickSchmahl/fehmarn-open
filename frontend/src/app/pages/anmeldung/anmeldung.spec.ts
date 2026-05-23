import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Anmeldung } from './anmeldung';

describe('Anmeldung', () => {
  let component: Anmeldung;
  let fixture: ComponentFixture<Anmeldung>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Anmeldung],
    }).compileComponents();

    fixture = TestBed.createComponent(Anmeldung);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
