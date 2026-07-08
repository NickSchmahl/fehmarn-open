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
    group.get('radikalId')?.setValue(`${vorname[0]}${nachname[0]}-1234`);
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

  it('erklärt die Radikal ID zentral: Format, Herkunft und Pfad ohne bestehende ID', () => {
    fixture.detectChanges();
    const text = host()
      .querySelector('.radikal-hinweis')
      ?.textContent.replace(/\u00a0/g, ' ');
    expect(text).toContain('jeder teilnehmenden Person');
    expect(text).toContain('Initialen + Nummer');
    expect(text).toContain('MM-1234');
    expect(text).toContain('Name und Geburtsdatum');
    expect(text).toContain('noch keine Radikal ID');
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

  // ── Format-Validierung Radikal ID / Geburtsdatum ──────────────────────────

  it('lehnt eine Radikal ID im falschen Format ab (Feldfehler, kein Request)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.disziplinGroup(HERRENDOPPEL).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('radikalId')?.setValue('AB-12'); // zu wenige Ziffern

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
    g.get('radikalId')?.setValue('AB-12');

    component.onSubmit();
    fixture.detectChanges();

    const fehler = Array.from(host().querySelectorAll('.field-error')).map((e) => e.textContent);
    expect(fehler.some((t) => t.includes('zwei Buchstaben, Bindestrich, vier Ziffern'))).toBe(true);
  });

  it('akzeptiert eine korrekt formatierte Radikal ID (zwei Buchstaben, Bindestrich, vier Ziffern)', () => {
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
    expect(body.disziplinen[0].spieler[0].radikalId).toBe('MM-1234');
    req.flush({});
    expect(component.successMsg()).toContain('Anmeldung erfolgreich');
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
