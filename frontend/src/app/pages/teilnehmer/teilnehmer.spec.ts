import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Teilnehmer } from './teilnehmer';

// Integrationstest mit echtem TeilnehmerApiService: HttpTestingController prüft, dass die Seite
// über den Service genau den öffentlichen Endpunkt nutzt.
function setup() {
  TestBed.configureTestingModule({
    imports: [Teilnehmer],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });

  const fixture = TestBed.createComponent(Teilnehmer);
  const component = fixture.componentInstance;
  const httpTesting = TestBed.inject(HttpTestingController);
  return { fixture, component, httpTesting };
}

describe('Teilnehmer (öffentliche Liste)', () => {
  let component: Teilnehmer;
  let fixture: ComponentFixture<Teilnehmer>;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    ({ fixture, component, httpTesting } = setup());
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

  it('zeigt die Fehmarn-Bildmarke im Header', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({ disziplinen: [] });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.teilnehmer-header app-brand-icon')).not.toBeNull();
    expect(host.querySelector('.bullseye')).toBeNull();
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

  it('lädt nie die Admin-Übersicht, auch nicht für eingeloggte Admins', () => {
    localStorage.setItem('token', 'x');
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({ disziplinen: [] });
    httpTesting.expectNone('/api/admin/teilnehmer');
    localStorage.clear();
  });
});
