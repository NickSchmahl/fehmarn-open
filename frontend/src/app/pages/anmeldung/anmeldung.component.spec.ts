import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormGroup } from '@angular/forms';

import { AnmeldungComponent } from './anmeldung.component';
import { DISZIPLINEN } from '../../shared/disziplin';

// ── Testhilfen ─────────────────────────────────────────────────────────────

const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');
const TRIPLE_MIX = DISZIPLINEN.findIndex((d) => d.value === 'TRIPLE_MIX');
const TEAMWETTBEWERB = DISZIPLINEN.findIndex((d) => d.value === 'TEAMWETTBEWERB');

interface SpielerPayload {
  vorname: string;
  nachname: string;
  radikalId: string | null;
  initialen: string | null;
  geburtsdatum: string | null;
}

interface DisziplinPayload {
  disziplin: string;
  teamName: string | null;
  spieler: SpielerPayload[];
}

interface AnmeldungPayload {
  disziplinen: DisziplinPayload[];
}

describe('AnmeldungComponent', () => {
  let component: AnmeldungComponent;
  let fixture: ComponentFixture<AnmeldungComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnmeldungComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AnmeldungComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function waehleDisziplin(i: number): void {
    component.disziplinGroup(i).get('selected')?.setValue(true);
    fixture.detectChanges();
  }

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  /** Klickt den (bei genau einer gewählten Disziplin eindeutigen) „Spieler hinzufügen"-Button. */
  function klickeSpielerHinzufuegen(): void {
    const btn = host().querySelector('.spieler-add');
    (btn as HTMLButtonElement | null)?.click();
    fixture.detectChanges();
  }

  function spielerZeilenAnzahl(): number {
    return host().querySelectorAll('.spieler-row').length;
  }

  function setzeMitRadikalId(i: number, j: number, vorname: string, nachname: string): void {
    const group = component.spielerGroup(i, j);
    group.get('vorname')?.setValue(vorname);
    group.get('nachname')?.setValue(nachname);
    group.get('radikalId')?.setValue(`${vorname[0]}${nachname[0]}-12345`);
  }

  function setzeOhneRadikalId(
    i: number,
    j: number,
    vorname: string,
    nachname: string,
    initialen: string,
    geburtsdatum: string,
  ): void {
    const group = component.spielerGroup(i, j);
    group.get('vorname')?.setValue(vorname);
    group.get('nachname')?.setValue(nachname);
    group.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(i, j);
    group.get('initialen')?.setValue(initialen);
    group.get('geburtsdatum')?.setValue(geburtsdatum);
  }

  // ── Grundlegendes / Texte ─────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('zeigt im Untertitel den Zusatz "pro Person"', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.anmeldung-subtitle')?.textContent).toContain(
      'je Disziplin pro Person',
    );
  });

  it('schreibt den Markennamen als „Radikal" (mit K), nicht „Radical"', () => {
    waehleDisziplin(HERRENDOPPEL);
    const text = host().textContent;
    expect(text).toContain('Radikal ID');
    expect(text).not.toContain('Radical');
  });

  it('startet ohne Persönliche-Daten-Sektion (kein Kontaktfeld)', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('Persönliche Daten');
  });

  // ── Spielerzeilen je Disziplin ────────────────────────────────────────────

  it('zeigt bei Herrendoppel 2 Spielerzeilen und ein Teamname-Feld', () => {
    waehleDisziplin(HERRENDOPPEL);
    const host = fixture.nativeElement as HTMLElement;
    expect(component.spielerArray(HERRENDOPPEL).length).toBe(2);
    expect(host.querySelectorAll('.spieler-row').length).toBe(2);
    expect(component.needsTeamName(HERRENDOPPEL)).toBe(true);
  });

  it('Teamwettbewerb: 4 Pflichtzeilen, auffüllbar bis 6, keine 7.', () => {
    waehleDisziplin(TEAMWETTBEWERB);
    expect(spielerZeilenAnzahl()).toBe(4);

    klickeSpielerHinzufuegen();
    klickeSpielerHinzufuegen();
    expect(spielerZeilenAnzahl()).toBe(6);

    // Bei Maximum verschwindet der Hinzufügen-Button – keine 7. Zeile möglich.
    expect(host().querySelector('.spieler-add')).toBeNull();
    expect(component.canAddSpieler(TEAMWETTBEWERB)).toBe(false);
  });

  it('Triple Mix: 3 Pflichtzeilen + optionale 4. Zeile mit Ersatz-Hinweis, keine 5.', () => {
    waehleDisziplin(TRIPLE_MIX);
    expect(spielerZeilenAnzahl()).toBe(3);

    klickeSpielerHinzufuegen();
    expect(spielerZeilenAnzahl()).toBe(4);
    expect(host().textContent).toContain('Die vierte Person kann als Ersatz eingetragen werden.');

    // Maximum erreicht (4) – keine 5. Zeile möglich.
    expect(host().querySelector('.spieler-add')).toBeNull();
  });

  it('rendert für mehrere gewählte Disziplinen je einen eigenen Spielerblock', () => {
    waehleDisziplin(HERRENDOPPEL);
    waehleDisziplin(TRIPLE_MIX);
    expect(host().querySelectorAll('.spieler-block').length).toBe(2);
  });

  // ── Validierung Radikal-ID-Angabe ─────────────────────────────────────────

  it('Absenden ohne Radikal-ID-Angabe eines Spielers ist ungültig (kein Request)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Die Bullseye Boys');
    component.spielerGroup(HERRENDOPPEL, 0).get('vorname')?.setValue('Max');
    component.spielerGroup(HERRENDOPPEL, 0).get('nachname')?.setValue('Mustermann');
    // Spieler 0 ohne Radikal ID / Initialen → ungültig
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.radikalAngabeInvalid(HERRENDOPPEL, 0)).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('Spieler ohne Radikal ID, aber mit Initialen + Geburtsdatum ist gültig', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Die Bullseye Boys');
    setzeOhneRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann', 'MM', '1990-01-01');
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    const body = req.request.body as AnmeldungPayload;
    const spieler0 = body.disziplinen[0].spieler[0];
    expect(spieler0.radikalId).toBeNull();
    expect(spieler0.initialen).toBe('MM');
    expect(spieler0.geburtsdatum).toBe('1990-01-01');
    req.flush({});
  });

  // ── Submit-Payload ────────────────────────────────────────────────────────

  it('sendet ein Team-DTO mit radikalId-Feld an /api/anmeldung', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Die Bullseye Boys');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    const body = req.request.body as AnmeldungPayload;
    expect(body.disziplinen.length).toBe(1);
    expect(body.disziplinen[0].disziplin).toBe('HERRENDOPPEL');
    expect(body.disziplinen[0].teamName).toBe('Die Bullseye Boys');
    expect(body.disziplinen[0].spieler.length).toBe(2);
    expect(body.disziplinen[0].spieler[0].radikalId).toBe('MM-12345');
    req.flush({});
    expect(component.successMsg()).toContain('Anmeldung erfolgreich');
  });

  it('typt FormGroup korrekt für Spieler-Zugriff', () => {
    waehleDisziplin(HERRENDOPPEL);
    expect(component.spielerGroup(HERRENDOPPEL, 0) instanceof FormGroup).toBe(true);
  });
});
