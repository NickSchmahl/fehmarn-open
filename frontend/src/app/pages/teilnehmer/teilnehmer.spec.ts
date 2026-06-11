import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { Teilnehmer, gruppiereNachTeam } from './teilnehmer';

describe('gruppiereNachTeam', () => {
  it('bündelt Einträge mit gleichem Teamnamen', () => {
    const teams = gruppiereNachTeam([
      { vorname: 'Max', nachname: 'Mustermann', teamName: 'Die Bullseye Boys' },
      { vorname: 'Erika', nachname: 'Musterfrau', teamName: 'Die Bullseye Boys' },
    ]);

    expect(teams).toHaveLength(1);
    expect(teams[0].teamName).toBe('Die Bullseye Boys');
    expect(teams[0].mitglieder).toEqual(['Max Mustermann', 'Erika Musterfrau']);
  });

  it('lässt Einzelspieler ohne Teamnamen separat', () => {
    const teams = gruppiereNachTeam([
      { vorname: 'Anna', nachname: 'Schmidt', teamName: null },
      { vorname: 'Bert', nachname: 'Adam', teamName: null },
    ]);

    expect(teams).toHaveLength(2);
    expect(teams[0]).toEqual({ teamName: null, mitglieder: ['Anna Schmidt'] });
    expect(teams[1]).toEqual({ teamName: null, mitglieder: ['Bert Adam'] });
  });

  it('behandelt leeren/whitespace-Teamnamen wie Einzelspieler', () => {
    const teams = gruppiereNachTeam([
      { vorname: 'Anna', nachname: 'Schmidt', teamName: '  ' },
    ]);

    expect(teams).toEqual([{ teamName: null, mitglieder: ['Anna Schmidt'] }]);
  });
});

describe('Teilnehmer', () => {
  let component: Teilnehmer;
  let fixture: ComponentFixture<Teilnehmer>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teilnehmer],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Teilnehmer);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lädt die Übersicht von GET /api/teilnehmer', () => {
    fixture.detectChanges(); // löst ngOnInit aus

    const req = httpTesting.expectOne('/api/teilnehmer');
    expect(req.request.method).toBe('GET');
    req.flush({
      disziplinen: [
        {
          disziplin: 'HERRENEINZEL',
          anzahl: 1,
          teilnehmer: [{ vorname: 'Anna', nachname: 'Schmidt', teamName: null }],
        },
      ],
    });

    expect(component.gruppen()).toHaveLength(1);
    expect(component.loading()).toBe(false);
  });

  it('filtert die sichtbaren Gruppen nach aktiver Disziplin', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENEINZEL',
          anzahl: 1,
          teilnehmer: [{ vorname: 'Anna', nachname: 'Schmidt', teamName: null }],
        },
        {
          disziplin: 'DAMENEINZEL',
          anzahl: 1,
          teilnehmer: [{ vorname: 'Eva', nachname: 'Klein', teamName: null }],
        },
      ],
    });

    component.setFilter('DAMENEINZEL');
    expect(component.sichtbareGruppen()).toHaveLength(1);
    expect(component.sichtbareGruppen()[0].disziplin).toBe('DAMENEINZEL');

    component.setFilter('ALLE');
    expect(component.sichtbareGruppen()).toHaveLength(2);
  });

  it('reicht jede Disziplingruppe mit Label und Team-Gruppierung durch', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 2,
          teilnehmer: [
            { vorname: 'Max', nachname: 'Mustermann', teamName: 'Team A' },
            { vorname: 'Erika', nachname: 'Musterfrau', teamName: 'Team A' },
          ],
        },
      ],
    });

    const gruppe = component.sichtbareGruppen()[0];
    expect(gruppe.label).toBe('Herrendoppel');
    expect(gruppe.anzahl).toBe(2);
    expect(gruppe.teams).toHaveLength(1);
    expect(gruppe.teams[0].mitglieder).toEqual(['Max Mustermann', 'Erika Musterfrau']);
  });
});
