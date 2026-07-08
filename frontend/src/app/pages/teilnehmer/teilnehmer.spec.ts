import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Teilnehmer, gruppiereNachTeam, gruppiereAdminNachTeam, AdminEintrag } from './teilnehmer';
import { AuthService } from '../../auth/service/auth.service';

function adminEintrag(over: Partial<AdminEintrag>): AdminEintrag {
  return {
    id: 0,
    vorname: 'V',
    nachname: 'N',
    radikalId: null,
    teamName: null,
    anwesend: false,
    abgemeldet: false,
    ...over,
  };
}

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
    const teams = gruppiereNachTeam([{ vorname: 'Anna', nachname: 'Schmidt', teamName: '  ' }]);

    expect(teams).toEqual([{ teamName: null, mitglieder: ['Anna Schmidt'] }]);
  });
});

describe('gruppiereAdminNachTeam', () => {
  it('gruppiert Mitglieder mit gleichem Teamnamen inkl. ids und Sammelflags', () => {
    const gruppen = gruppiereAdminNachTeam([
      adminEintrag({ id: 1, teamName: 'Team A', anwesend: true }),
      adminEintrag({ id: 2, teamName: 'Team A', anwesend: true, abgemeldet: true }),
    ]);

    expect(gruppen).toHaveLength(1);
    expect(gruppen[0].teamName).toBe('Team A');
    expect(gruppen[0].ids).toEqual([1, 2]);
    expect(gruppen[0].mitglieder).toHaveLength(2);
    expect(gruppen[0].alleAnwesend).toBe(true);
    expect(gruppen[0].alleAbgemeldet).toBe(false); // nur einer abgemeldet
  });

  it('lässt Einträge ohne Teamnamen als einzelne Gruppen', () => {
    const gruppen = gruppiereAdminNachTeam([
      adminEintrag({ id: 1, teamName: null }),
      adminEintrag({ id: 2, teamName: null }),
    ]);

    expect(gruppen).toHaveLength(2);
    expect(gruppen[0].teamName).toBeNull();
    expect(gruppen[0].ids).toEqual([1]);
  });

  it('alleAbgemeldet ist true nur wenn alle Mitglieder abgemeldet sind', () => {
    const gruppen = gruppiereAdminNachTeam([
      adminEintrag({ id: 1, teamName: 'Team B', abgemeldet: true }),
      adminEintrag({ id: 2, teamName: 'Team B', abgemeldet: true }),
    ]);

    expect(gruppen[0].alleAbgemeldet).toBe(true);
  });
});

function setup(isLoggedIn: boolean) {
  TestBed.configureTestingModule({
    imports: [Teilnehmer],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { isLoggedIn: () => isLoggedIn } },
    ],
  });

  const fixture = TestBed.createComponent(Teilnehmer);
  const component = fixture.componentInstance;
  const httpTesting = TestBed.inject(HttpTestingController);
  return { fixture, component, httpTesting };
}

describe('Teilnehmer (öffentlich)', () => {
  let component: Teilnehmer;
  let fixture: ComponentFixture<Teilnehmer>;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    ({ fixture, component, httpTesting } = setup(false));
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lädt die öffentliche Übersicht von GET /api/teilnehmer', () => {
    fixture.detectChanges();

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
});

describe('Teilnehmer (admin)', () => {
  let component: Teilnehmer;
  let fixture: ComponentFixture<Teilnehmer>;
  let httpTesting: HttpTestingController;

  const adminResponse = {
    disziplinen: [
      {
        disziplin: 'HERRENEINZEL',
        anzahl: 2,
        teilnehmer: [
          {
            id: 1,
            vorname: 'Anna',
            nachname: 'Schmidt',
            radikalId: null,
            teamName: null,
            anwesend: false,
            abgemeldet: false,
          },
          {
            id: 2,
            vorname: 'Bert',
            nachname: 'Adam',
            radikalId: null,
            teamName: null,
            anwesend: false,
            abgemeldet: true,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    ({ fixture, component, httpTesting } = setup(true));
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('lädt als Admin die Admin-Übersicht von GET /api/admin/teilnehmer', () => {
    fixture.detectChanges();

    const req = httpTesting.expectOne('/api/admin/teilnehmer');
    expect(req.request.method).toBe('GET');
    req.flush(adminResponse);

    expect(component.isAdmin()).toBe(true);
    expect(component.adminGruppen()).toHaveLength(1);
    expect(component.adminGruppen()[0].teilnehmer).toHaveLength(2);
  });

  it('abmelden feuert POST und lädt neu', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.abmelden(1);

    const action = httpTesting.expectOne('/api/admin/anmeldung/1/abmelden');
    expect(action.request.method).toBe('POST');
    action.flush(null);

    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse); // reload
  });

  it('reaktivieren feuert POST', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.reaktivieren(2);

    const action = httpTesting.expectOne('/api/admin/anmeldung/2/reaktivieren');
    expect(action.request.method).toBe('POST');
    action.flush(null);

    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
  });

  it('toggleAnwesenheit feuert PUT mit dem neuen Wert', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.toggleAnwesenheit(1, true);

    const action = httpTesting.expectOne('/api/admin/anmeldung/1/anwesenheit');
    expect(action.request.method).toBe('PUT');
    expect(action.request.body).toEqual({ anwesend: true });
    action.flush(null);

    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
  });

  it('filtert nach Suchbegriff über Name', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.setSuche('bert');
    const namen = component
      .sichtbareAdminGruppen()
      .flatMap((g) => g.teams.flatMap((t) => t.mitglieder.map((m) => m.nachname)));
    expect(namen).toEqual(['Adam']);
  });

  it('teamAbmelden meldet alle Mitglieder ab und lädt einmal neu', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.teamAbmelden([1, 2]);

    httpTesting.expectOne('/api/admin/anmeldung/1/abmelden').flush(null);
    httpTesting.expectOne('/api/admin/anmeldung/2/abmelden').flush(null);
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse); // ein Reload
  });

  it('teamAnwesenheit setzt für alle Mitglieder den Wert', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.teamAnwesenheit([1, 2], true);

    const r1 = httpTesting.expectOne('/api/admin/anmeldung/1/anwesenheit');
    const r2 = httpTesting.expectOne('/api/admin/anmeldung/2/anwesenheit');
    expect(r1.request.body).toEqual({ anwesend: true });
    expect(r2.request.body).toEqual({ anwesend: true });
    r1.flush(null);
    r2.flush(null);
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
  });
});
