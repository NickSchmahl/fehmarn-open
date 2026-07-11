import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormGroup } from '@angular/forms';

import { AnmeldungComponent } from './anmeldung.component';
import { DISZIPLINEN } from '../../shared/disziplin';

// ── Testhilfen ─────────────────────────────────────────────────────────────

const HERRENEINZEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENEINZEL');
const HERRENDOPPEL = DISZIPLINEN.findIndex((d) => d.value === 'HERRENDOPPEL');
const TRIPLE_MIX = DISZIPLINEN.findIndex((d) => d.value === 'TRIPLE_MIX');
const TEAMWETTBEWERB = DISZIPLINEN.findIndex((d) => d.value === 'TEAMWETTBEWERB');
const U18 = DISZIPLINEN.findIndex((d) => d.value === 'U18');

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

  it('zeigt die Fehmarn-Bildmarke im Anmeldungs-Header', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.anmeldung-header app-brand-icon')).not.toBeNull();
    expect(element.querySelector('.bullseye')).toBeNull();
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
    group.get('radikalId')?.setValue(`${vorname[0]}${nachname[0]}01011990`);
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

  it('zeigt die Überschrift "Turnieranmeldung" ohne redundanten Untertitel', () => {
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.anmeldung-title')?.textContent).toContain('Turnieranmeldung');
    expect(host.querySelector('.anmeldung-subtitle')).toBeNull();
    expect(host.querySelector('.anmeldung-header')?.textContent).not.toContain(
      'Darts Turnierverwaltung',
    );
  });

  it('erklärt die Radikal ID zentral: Format, Herkunft und Pfad ohne bestehende ID', () => {
    fixture.detectChanges();
    const text = host()
      .querySelector('.radikal-hinweis')
      ?.textContent.replace(/\u00a0/g, ' ');
    expect(text).toContain('jeder teilnehmenden Person');
    expect(text).toContain('Initialen + Geburtsdatum');
    expect(text).toContain('MM01011990');
    expect(text).toContain('geboren am 01.01.1990');
    expect(text).toContain('Name und Geburtsdatum');
    expect(text).toContain('noch keine Radikal ID');
    expect(text).not.toContain('Initialen + Nummer');
    expect(text).not.toContain('MM-1234');
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

  it('listet die 7 Disziplinen in Flyer-Reihenfolge mit U18 an vierter Stelle', () => {
    expect(DISZIPLINEN.map((d) => d.value)).toEqual([
      'TEAMWETTBEWERB',
      'HERRENEINZEL',
      'DAMENEINZEL',
      'U18',
      'TRIPLE_MIX',
      'HERRENDOPPEL',
      'DAMENDOPPEL',
    ]);
  });

  it('zeigt bei U18 genau eine Spielerzeile und kein Teamname-Feld', () => {
    waehleDisziplin(U18);
    const host = fixture.nativeElement as HTMLElement;
    expect(component.spielerArray(U18).length).toBe(1);
    expect(host.querySelectorAll('.spieler-row').length).toBe(1);
    expect(component.needsTeamName(U18)).toBe(false);
  });

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

  // ── Umschalter „keine Radikal ID": Werte erhalten ────────────────────────

  it('behält den Radikal-ID-Wert beim Hin- und Herschalten des „keine ID"-Umschalters', () => {
    waehleDisziplin(HERRENDOPPEL);
    const g = component.spielerGroup(HERRENDOPPEL, 0);
    g.get('radikalId')?.setValue('MM01011990');

    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0);
    g.get('hatKeineRadikalId')?.setValue(false);
    component.toggleRadikalId(HERRENDOPPEL, 0);

    expect(g.get('radikalId')?.value).toBe('MM01011990');
  });

  it('ist im „keine ID"-Modus ungültig, wenn nur eine alte Radikal ID, aber keine Initialen/Geburtsdatum vorliegen', () => {
    waehleDisziplin(HERRENDOPPEL);
    const g = component.spielerGroup(HERRENDOPPEL, 0);
    g.get('vorname')?.setValue('Max');
    g.get('nachname')?.setValue('Mustermann');
    g.get('radikalId')?.setValue('MM01011990');
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0);

    expect(g.hasError('radikalIdAngabeFehlt')).toBe(true);
  });

  it('blockiert nicht wegen unfertiger Radikal ID, wenn auf „keine ID" gewechselt und Initialen+Geburtsdatum ausgefüllt sind', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Team X');
    const g = component.spielerGroup(HERRENDOPPEL, 0);
    g.get('vorname')?.setValue('Max');
    g.get('nachname')?.setValue('Mustermann');
    g.get('radikalId')?.setValue('MM01'); // unfertig/ungültig
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0);
    g.get('initialen')?.setValue('MM');
    g.get('geburtsdatum')?.setValue('1990-01-01');
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    expect(g.valid).toBe(true);
    expect(component.form.valid).toBe(true);
  });

  // ── Format-Validierung Radikal ID / Geburtsdatum ──────────────────────────

  it('lehnt eine Radikal ID im falschen Format ab (Feldfehler, kein Request)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('radikalId')?.setValue('MM-1234'); // altes Format mit Bindestrich, jetzt ungültig

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.spielerFeldInvalid(HERRENDOPPEL, 1, 'radikalId')).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('zeigt die Format-Fehlermeldung sichtbar am Radikal-ID-Feld', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('radikalId')?.setValue('MM-1234');

    component.onSubmit();
    fixture.detectChanges();

    const fehler = Array.from(host().querySelectorAll('.field-error')).map((e) => e.textContent);
    expect(fehler.some((t) => t.includes('achtstelliges Geburtsdatum'))).toBe(true);
  });

  it('akzeptiert eine korrekt formatierte Radikal ID (zwei Buchstaben + achtstelliges Geburtsdatum)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    expect(component.spielerFeldInvalid(HERRENDOPPEL, 0, 'radikalId')).toBe(false);
    expect(component.form.valid).toBe(true);
  });

  it('lehnt ein Geburtsdatum mit mehr als vierstelligem Jahr ab (Feldfehler)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 1);
    g.get('initialen')?.setValue('TT');
    g.get('geburtsdatum')?.setValue('12345-06-15'); // 5-stelliges Jahr

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.spielerFeldInvalid(HERRENDOPPEL, 1, 'geburtsdatum')).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('lehnt ein Geburtsdatum in der Zukunft ab (Feldfehler)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 1);
    g.get('initialen')?.setValue('TT');
    const naechstesJahr = new Date().getFullYear() + 1;
    g.get('geburtsdatum')?.setValue(`${naechstesJahr}-06-15`);

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.spielerFeldInvalid(HERRENDOPPEL, 1, 'geburtsdatum')).toBe(true);
    httpMock.expectNone('/api/anmeldung');
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
    expect(body.disziplinen[0].spieler[0].radikalId).toBe('MM01011990');
    req.flush({});
    expect(component.successMsg()).toContain('Anmeldung erfolgreich');
  });

  it('normalisiert den Teamnamen im Payload (Trim + interne Whitespaces)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('  Die   Bullseye  Boys  ');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    const body = req.request.body as AnmeldungPayload;
    expect(body.disziplinen[0].teamName).toBe('Die Bullseye Boys');
    req.flush({});
  });

  it('lehnt einen Teamnamen über 20 Zeichen ab (Feld-Fehler, kein Request)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('123456789012345678901'); // 21 Zeichen
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.teamNameLaengeFehler(HERRENDOPPEL)).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('zeigt eine Teamname-Dublette (409) am richtigen Feld statt als Banner', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Die Bullseye Boys');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 1, 'Tom', 'Test');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    req.flush(
      {
        status: 409,
        message: 'Teamname ist in dieser Disziplin bereits vergeben: Die Bullseye Boys',
        errors: [
          {
            field: 'HERRENDOPPEL',
            message: 'Teamname ist in dieser Disziplin bereits vergeben: Die Bullseye Boys',
          },
        ],
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.teamNameDuplikatText(HERRENDOPPEL)).toContain('bereits vergeben');
    expect(component.errorMessage()).toBeNull();
  });

  // ── Preisberechnung (10 € pro Spieler) ────────────────────────────────────

  function preisTexte(): string[] {
    return Array.from(host().querySelectorAll('.price-line')).map((e) => e.textContent);
  }

  it('Teamwettbewerb mit 5 Spielern kostet 50 € für diese Disziplin', () => {
    waehleDisziplin(TEAMWETTBEWERB);
    klickeSpielerHinzufuegen(); // 4 → 5 Spieler

    expect(component.spielerArray(TEAMWETTBEWERB).length).toBe(5);
    expect(component.preisPosten()[0].betrag).toBe(50);
    expect(component.gesamtpreis()).toBe(50);
  });

  it('Herrendoppel (20 €) + Herreneinzel (10 €) ergeben Gesamt 30 €', () => {
    waehleDisziplin(HERRENDOPPEL);
    waehleDisziplin(HERRENEINZEL);

    const betraege = component.preisPosten().map((p) => p.betrag);
    expect(betraege).toContain(20);
    expect(betraege).toContain(10);
    expect(component.gesamtpreis()).toBe(30);
  });

  it('Triple Mix kostet 30 € mit 3 Spielern und 40 € mit 4 Spielern', () => {
    waehleDisziplin(TRIPLE_MIX);
    expect(component.gesamtpreis()).toBe(30);

    klickeSpielerHinzufuegen(); // 3 → 4 Spieler
    expect(component.gesamtpreis()).toBe(40);
  });

  it('U18 ist kostenlos: Beitrag 0 € und Position „kostenlos"', () => {
    waehleDisziplin(U18);
    fixture.detectChanges();

    expect(component.spielerArray(U18).length).toBe(1);
    expect(component.needsTeamName(U18)).toBe(false);
    expect(component.preisPosten()[0].betrag).toBe(0);
    expect(component.gesamtpreis()).toBe(0);
    expect(preisTexte().some((t) => t.includes('U18-Turnier') && t.includes('kostenlos'))).toBe(
      true,
    );
  });

  it('U18 (0 €) + Herreneinzel (10 €) ergeben Gesamt 10 €', () => {
    waehleDisziplin(U18);
    waehleDisziplin(HERRENEINZEL);

    expect(component.gesamtpreis()).toBe(10);
  });

  it('zeigt die Aufschlüsselung je Disziplin und die Gesamtsumme an', () => {
    waehleDisziplin(HERRENDOPPEL);
    waehleDisziplin(HERRENEINZEL);
    fixture.detectChanges();

    const zeilen = preisTexte();
    expect(zeilen.some((t) => t.includes('Herrendoppel') && t.includes('20'))).toBe(true);
    expect(zeilen.some((t) => t.includes('Herreneinzel') && t.includes('10'))).toBe(true);
    expect(host().querySelector('.price-total')?.textContent).toContain('30');
  });

  it('aktualisiert den Preis reaktiv beim Hinzufügen eines Spielers', () => {
    waehleDisziplin(TRIPLE_MIX);
    expect(host().querySelector('.price-total')?.textContent).toContain('30');

    klickeSpielerHinzufuegen(); // 3 → 4 Spieler
    expect(host().querySelector('.price-total')?.textContent).toContain('40');
  });

  it('typt FormGroup korrekt für Spieler-Zugriff', () => {
    waehleDisziplin(HERRENDOPPEL);
    expect(component.spielerGroup(HERRENDOPPEL, 0) instanceof FormGroup).toBe(true);
  });
});
