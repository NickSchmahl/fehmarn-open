import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import {
  Teilnehmer,
  meldungPasstZurSuche,
  sortiereAbgemeldeteAnsEnde,
  AdminMeldungEintrag,
} from './teilnehmer';
import { AuthService } from '../../auth/service/auth.service';

function adminMeldung(over: Partial<AdminMeldungEintrag>): AdminMeldungEintrag {
  return {
    id: 0,
    teamName: null,
    anwesend: false,
    abgemeldet: false,
    spieler: [
      { vorname: 'V', nachname: 'N', radikalId: null, initialen: null, geburtsdatum: null },
    ],
    ...over,
  };
}

describe('meldungPasstZurSuche', () => {
  it('leerer Suchbegriff passt immer', () => {
    expect(meldungPasstZurSuche(adminMeldung({}), '')).toBe(true);
  });

  it('trifft über den Teamnamen', () => {
    const meldung = adminMeldung({ teamName: 'Die Bullseye Boys' });
    expect(meldungPasstZurSuche(meldung, 'bullseye')).toBe(true);
  });

  it('trifft über den Namen eines beliebigen Spielers', () => {
    const meldung = adminMeldung({
      teamName: 'Team A',
      spieler: [
        { vorname: 'Anna', nachname: 'Schmidt', radikalId: null },
        { vorname: 'Bert', nachname: 'Adam', radikalId: null },
      ],
    });
    expect(meldungPasstZurSuche(meldung, 'adam')).toBe(true);
  });

  it('liefert false, wenn weder Team- noch Spielername passt', () => {
    const meldung = adminMeldung({
      teamName: 'Team A',
      spieler: [{ vorname: 'Anna', nachname: 'Schmidt', radikalId: null }],
    });
    expect(meldungPasstZurSuche(meldung, 'xyz')).toBe(false);
  });
});

describe('sortiereAbgemeldeteAnsEnde', () => {
  it('schiebt abgemeldete Meldungen ans Ende', () => {
    const eingabe = [
      adminMeldung({ id: 1, abgemeldet: false }),
      adminMeldung({ id: 2, abgemeldet: true }),
      adminMeldung({ id: 3, abgemeldet: false }),
    ];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([1, 3, 2]);
  });

  it('hält die Reihenfolge aktiver Meldungen stabil', () => {
    const eingabe = [
      adminMeldung({ id: 10, abgemeldet: false }),
      adminMeldung({ id: 20, abgemeldet: false }),
      adminMeldung({ id: 30, abgemeldet: false }),
    ];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([10, 20, 30]);
  });

  it('hält die Reihenfolge abgemeldeter Meldungen untereinander stabil', () => {
    const eingabe = [
      adminMeldung({ id: 1, abgemeldet: true }),
      adminMeldung({ id: 2, abgemeldet: false }),
      adminMeldung({ id: 3, abgemeldet: true }),
    ];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([2, 1, 3]);
  });

  it('lässt eine Gruppe ganz ohne Abgemeldete unverändert', () => {
    const eingabe = [adminMeldung({ id: 1 }), adminMeldung({ id: 2 })];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([1, 2]);
  });

  it('mutiert die Eingabeliste nicht', () => {
    const eingabe = [
      adminMeldung({ id: 1, abgemeldet: true }),
      adminMeldung({ id: 2, abgemeldet: false }),
    ];
    sortiereAbgemeldeteAnsEnde(eingabe);
    expect(eingabe.map((m) => m.id)).toEqual([1, 2]);
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

  it('zeigt die Überschrift "Teilnehmer" ohne Untertitel', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({ disziplinen: [] });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.teilnehmer-title')?.textContent).toContain('Teilnehmer');
    expect(host.querySelector('.teilnehmer-subtitle')).toBeNull();
    expect(host.querySelector('.teilnehmer-header')?.textContent).not.toContain(
      'Wer ist schon dabei',
    );
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
          meldungen: [{ teamName: null, spieler: [{ vorname: 'Anna', nachname: 'Schmidt' }] }],
        },
      ],
    });

    expect(component.gruppen()).toHaveLength(1);
  });

  it('zeigt alle Spieler eines Teams unter dem Teamnamen', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'TRIPLEMIX',
          anzahl: 1,
          meldungen: [
            {
              teamName: 'Die Fünf',
              spieler: [
                { vorname: 'A', nachname: 'Eins' },
                { vorname: 'B', nachname: 'Zwei' },
                { vorname: 'C', nachname: 'Drei' },
                { vorname: 'D', nachname: 'Vier' },
                { vorname: 'E', nachname: 'Fünf' },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const teamItems = root.querySelectorAll('.team-item');
    expect(teamItems).toHaveLength(1); // eine Meldung, nicht fünf Zeilen

    const teamName = root.querySelector('.team-name');
    expect(teamName?.textContent.trim()).toBe('Die Fünf');

    const text = root.querySelector('.team-members')?.textContent;
    for (const name of ['A Eins', 'B Zwei', 'C Drei', 'D Vier', 'E Fünf']) {
      expect(text).toContain(name);
    }
  });

  it('filtert die sichtbaren Gruppen nach aktiver Disziplin', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENEINZEL',
          anzahl: 1,
          meldungen: [{ teamName: null, spieler: [{ vorname: 'Anna', nachname: 'Schmidt' }] }],
        },
        {
          disziplin: 'DAMENEINZEL',
          anzahl: 1,
          meldungen: [{ teamName: null, spieler: [{ vorname: 'Eva', nachname: 'Klein' }] }],
        },
      ],
    });

    component.setFilter('DAMENEINZEL');
    expect(component.sichtbareGruppen()).toHaveLength(1);
    expect(component.sichtbareGruppen()[0].disziplin).toBe('DAMENEINZEL');

    component.setFilter('ALLE');
    expect(component.sichtbareGruppen()).toHaveLength(2);
  });

  it('zeigt in der öffentlichen Sicht weder Badge noch Geburtsdatum', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENEINZEL',
          anzahl: 1,
          meldungen: [{ teamName: null, spieler: [{ vorname: 'Anna', nachname: 'Schmidt' }] }],
        },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.neu-anlegen-badge')).toBeNull();
    expect(root.querySelector('.admin-radikal-id')).toBeNull();
    expect(root.textContent).not.toContain('1990');
  });
});

describe('Teilnehmer (admin)', () => {
  let component: Teilnehmer;
  let fixture: ComponentFixture<Teilnehmer>;
  let httpTesting: HttpTestingController;

  const adminResponse = {
    disziplinen: [
      {
        disziplin: 'HERRENDOPPEL',
        anzahl: 1,
        meldungen: [
          {
            id: 5,
            teamName: 'Team A',
            anwesend: false,
            abgemeldet: false,
            spieler: [
              {
                vorname: 'Anna',
                nachname: 'Schmidt',
                radikalId: 'AS-1',
                initialen: null,
                geburtsdatum: null,
              },
              {
                vorname: 'Bert',
                nachname: 'Adam',
                radikalId: 'BA-2',
                initialen: null,
                geburtsdatum: null,
              },
            ],
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
    expect(component.adminGruppen()[0].meldungen).toHaveLength(1);
    expect(component.adminGruppen()[0].meldungen[0].spieler).toHaveLength(2);
  });

  it('zeigt je Spieler die Radikal-ID', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const ids = Array.from(root.querySelectorAll('.admin-radikal-id')).map((el) =>
      el.textContent.trim(),
    );
    expect(ids).toEqual(['AS-1', 'BA-2']);
  });

  it('zeigt für Spieler ohne Radikal ID Initialen + Geburtsdatum und ein "neu anlegen"-Badge', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 1,
          meldungen: [
            {
              id: 5,
              teamName: 'Team A',
              anwesend: false,
              abgemeldet: false,
              spieler: [
                {
                  vorname: 'Bert',
                  nachname: 'Adam',
                  radikalId: null,
                  initialen: 'BA',
                  geburtsdatum: '1990-03-14',
                },
                {
                  vorname: 'Anna',
                  nachname: 'Schmidt',
                  radikalId: 'AS-1',
                  initialen: null,
                  geburtsdatum: null,
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const zeilen = Array.from(root.querySelectorAll('.admin-row'));

    // Spieler ohne ID: Initialen + Geburtsdatum + Badge sichtbar.
    const ohneId = zeilen.find((z) => z.textContent.includes('Bert Adam')) as HTMLElement;
    expect(ohneId.querySelector('.neu-anlegen-badge')).not.toBeNull();
    expect(ohneId.querySelector('.admin-radikal-id')?.textContent).toContain('BA');
    expect(ohneId.querySelector('.admin-radikal-id')?.textContent).toContain('14.03.1990');

    // Spieler mit ID: ID sichtbar, kein Badge.
    const mitId = zeilen.find((z) => z.textContent.includes('Anna Schmidt')) as HTMLElement;
    expect(mitId.querySelector('.neu-anlegen-badge')).toBeNull();
    expect(mitId.querySelector('.admin-radikal-id')?.textContent).toContain('AS-1');
  });

  it('Anwesend-Schalter feuert genau einen Request pro Meldung (Team-Klick)', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const checkboxes = root.querySelectorAll('.anwesend-toggle input');
    expect(checkboxes).toHaveLength(1); // genau ein Schalter je Meldung, nicht je Spieler

    (checkboxes[0] as HTMLInputElement).click();

    const action = httpTesting.expectOne('/api/admin/anmeldung/5/anwesenheit');
    expect(action.request.method).toBe('PUT');
    expect(action.request.body).toEqual({ anwesend: true });
    action.flush(null);

    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse); // ein Reload
  });

  it('Abmelden-Button feuert einen POST pro Meldung', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.btn-danger')?.click();

    const action = httpTesting.expectOne('/api/admin/anmeldung/5/abmelden');
    expect(action.request.method).toBe('POST');
    action.flush(null);

    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse); // ein Reload
  });

  it('reaktivieren feuert POST', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.reaktivieren(5);

    const action = httpTesting.expectOne('/api/admin/anmeldung/5/reaktivieren');
    expect(action.request.method).toBe('POST');
    action.flush(null);

    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
  });

  it('zeigt bei Reaktivierungs-Konflikt (409) die Server-Meldung an', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.reaktivieren(5);

    const action = httpTesting.expectOne('/api/admin/anmeldung/5/reaktivieren');
    action.flush(
      { status: 409, message: 'Teamname ist in dieser Disziplin bereits vergeben: Team A' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.aktionsFehler()).toContain('bereits vergeben');
    // Kein Reload nach Fehler.
    httpTesting.expectNone('/api/admin/teilnehmer');
  });

  it('filtert nach Suchbegriff über Spielernamen', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

    component.setSuche('adam');
    expect(component.sichtbareAdminGruppen()).toHaveLength(1);

    component.setSuche('gibtsnicht');
    expect(component.sichtbareAdminGruppen()).toHaveLength(0);
  });

  it('sortiert abgemeldete Teams ans Ende der Disziplin-Gruppe', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 3,
          meldungen: [
            { id: 1, teamName: 'Aktiv 1', anwesend: false, abgemeldet: false, spieler: [] },
            { id: 2, teamName: 'Abgemeldet', anwesend: false, abgemeldet: true, spieler: [] },
            { id: 3, teamName: 'Aktiv 2', anwesend: false, abgemeldet: false, spieler: [] },
          ],
        },
      ],
    });

    const reihenfolge = component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id);
    expect(reihenfolge).toEqual([1, 3, 2]);
  });

  it('rutscht ein Team nach dem Abmelden ans Ende (Live-Update über Reload)', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 2,
          meldungen: [
            { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: false, spieler: [] },
            { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: false, spieler: [] },
          ],
        },
      ],
    });

    component.abmelden(1);
    httpTesting.expectOne('/api/admin/anmeldung/1/abmelden').flush(null);
    // Reload liefert Team 1 nun als abgemeldet zurück.
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 2,
          meldungen: [
            { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: true, spieler: [] },
            { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: false, spieler: [] },
          ],
        },
      ],
    });

    expect(component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id)).toEqual([2, 1]);
  });

  it('rutscht ein Team nach der Reaktivierung zurück in den aktiven Bereich', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 2,
          meldungen: [
            { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: false, spieler: [] },
            { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: true, spieler: [] },
          ],
        },
      ],
    });
    // Ausgangslage: abgemeldetes Team 2 steht hinten.
    expect(component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id)).toEqual([1, 2]);

    component.reaktivieren(2);
    httpTesting.expectOne('/api/admin/anmeldung/2/reaktivieren').flush(null);
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 2,
          meldungen: [
            { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: false, spieler: [] },
            { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: false, spieler: [] },
          ],
        },
      ],
    });

    expect(component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id)).toEqual([1, 2]);
  });
});
