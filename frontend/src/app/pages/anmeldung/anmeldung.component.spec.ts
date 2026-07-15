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
    fixture.detectChanges(); // löst ngOnInit + Status-GET aus
    httpMock
      .expectOne('/api/anmeldung/status')
      .flush({ anmeldungOffen: true, anmeldeschluss: '2027-02-28' });
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

  function setzeMitRadikalId(
    i: number,
    k: number,
    j: number,
    vorname: string,
    nachname: string,
  ): void {
    const group = component.spielerGroup(i, k, j);
    group.get('vorname')?.setValue(vorname);
    group.get('nachname')?.setValue(nachname);
    group.get('radikalId')?.setValue(`${vorname[0]}${nachname[0]}01011990`);
  }

  function setzeOhneRadikalId(
    i: number,
    k: number,
    j: number,
    vorname: string,
    nachname: string,
    initialen: string,
    geburtsdatum: string,
  ): void {
    const group = component.spielerGroup(i, k, j);
    group.get('vorname')?.setValue(vorname);
    group.get('nachname')?.setValue(nachname);
    group.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(i, k, j);
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

  it('erklärt die Radikal ID zentral: Format, Beispiel und Pfad ohne bestehende ID', () => {
    fixture.detectChanges();
    const text = host()
      .querySelector('.radikal-hinweis')
      ?.textContent.replace(/\u00a0/g, ' ');
    expect(text).toContain('Radikal-ID für die Anmeldung');
    expect(text).toContain('Jede teilnehmende Person benötigt eine Radikal-ID');
    expect(text).toContain('erster Buchstabe des Vornamens');
    expect(text).toContain('erster Buchstabe des Nachnamens');
    expect(text).toContain('Geburtsdatum');
    expect(text).toContain('MM01011990');
    expect(text).toContain('geboren am 01.01.1990');
    expect(text).toContain('Noch keine ID?');
    expect(text).toContain('das System erstellt deine ID daraus automatisch');
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
    expect(component.spielerArray(U18, 0).length).toBe(1);
    expect(host.querySelectorAll('.spieler-row').length).toBe(1);
    expect(component.needsTeamName(U18)).toBe(false);
  });

  it('zeigt bei Herrendoppel 2 Spielerzeilen und ein Teamname-Feld', () => {
    waehleDisziplin(HERRENDOPPEL);
    const host = fixture.nativeElement as HTMLElement;
    expect(component.spielerArray(HERRENDOPPEL, 0).length).toBe(2);
    expect(host.querySelectorAll('.spieler-row').length).toBe(2);
    expect(component.needsTeamName(HERRENDOPPEL)).toBe(true);
  });

  describe('Feld-Layout der Spielerzeile (#168)', () => {
    it('legt Vorname, Nachname und Radikal ID in eine gemeinsame Feldreihe', () => {
      waehleDisziplin(HERRENEINZEL);

      const gefunden = host().querySelector('.spieler-row .spieler-felder');
      expect(gefunden).not.toBeNull();
      const felder = gefunden as HTMLElement;

      const ids = Array.from(felder.querySelectorAll('input')).map((el) => el.id);
      expect(ids.some((id) => id.startsWith('vorname-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('nachname-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('radikalId-'))).toBe(true);
      expect(felder.classList.contains('spieler-felder--split')).toBe(false);
    });

    it('zeigt bei „keine Radikal ID" Initialen und Geburtsdatum in derselben Reihe (--split)', () => {
      waehleDisziplin(HERRENEINZEL);
      component.spielerGroup(HERRENEINZEL, 0, 0).get('hatKeineRadikalId')?.setValue(true);
      component.toggleRadikalId(HERRENEINZEL, 0, 0);
      fixture.detectChanges();

      const gefunden = host().querySelector('.spieler-row .spieler-felder');
      expect(gefunden).not.toBeNull();
      const felder = gefunden as HTMLElement;
      expect(felder.classList.contains('spieler-felder--split')).toBe(true);

      const ids = Array.from(felder.querySelectorAll('input')).map((el) => el.id);
      expect(ids.some((id) => id.startsWith('vorname-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('nachname-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('initialen-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('geburtsdatum-'))).toBe(true);
      expect(ids.some((id) => id.startsWith('radikalId-'))).toBe(false);
    });
  });

  it('Teamwettbewerb: 4 Pflichtzeilen, auffüllbar bis 6, keine 7.', () => {
    waehleDisziplin(TEAMWETTBEWERB);
    expect(spielerZeilenAnzahl()).toBe(4);

    klickeSpielerHinzufuegen();
    klickeSpielerHinzufuegen();
    expect(spielerZeilenAnzahl()).toBe(6);

    // Bei Maximum verschwindet der Hinzufügen-Button – keine 7. Zeile möglich.
    expect(host().querySelector('.spieler-add')).toBeNull();
    expect(component.canAddSpieler(TEAMWETTBEWERB, 0)).toBe(false);
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

  // ── Weitere Meldung hinzufügen/entfernen (#169) ────────────────────────────

  describe('Weitere Meldung hinzufügen/entfernen (#169)', () => {
    /** Klickt den (bei genau einer gewählten Disziplin eindeutigen) „Weitere Meldung"-Button. */
    function klickeMeldungHinzufuegen(): void {
      const btn = host().querySelector('.meldung-add');
      (btn as HTMLButtonElement | null)?.click();
      fixture.detectChanges();
    }

    it('fügt bei Herreneinzel per Klick eine zweite eigenständige Meldung hinzu', () => {
      waehleDisziplin(HERRENEINZEL);
      fixture.detectChanges();

      klickeMeldungHinzufuegen();

      expect(component.meldungenArray(HERRENEINZEL).length).toBe(2);
      expect(component.spielerArray(HERRENEINZEL, 1).length).toBe(1);
    });

    it('lässt die letzte verbleibende Meldung nicht entfernen', () => {
      waehleDisziplin(HERRENEINZEL);
      fixture.detectChanges();

      expect(component.canRemoveMeldung(HERRENEINZEL)).toBe(false);
      expect(host().querySelector('.meldung-remove')).toBeNull();
    });

    it('entfernt per Klick eine zusätzlich hinzugefügte Meldung wieder', () => {
      waehleDisziplin(HERRENEINZEL);
      fixture.detectChanges();
      klickeMeldungHinzufuegen();
      expect(component.meldungenArray(HERRENEINZEL).length).toBe(2);

      const removeBtn = host().querySelector('.meldung-remove');
      (removeBtn as HTMLButtonElement | null)?.click();
      fixture.detectChanges();

      expect(component.meldungenArray(HERRENEINZEL).length).toBe(1);
    });

    it('springt nach „Weitere Meldung" ins Vorname-Feld der neuen Meldung (Tastaturbedienung)', async () => {
      waehleDisziplin(HERRENEINZEL);
      fixture.detectChanges();

      klickeMeldungHinzufuegen();
      await fixture.whenStable();

      const vornameFeld = host().querySelector(`#vorname-${HERRENEINZEL}-1-0`);
      expect(document.activeElement).toBe(vornameFeld);
    });
  });

  // ── Disziplin-Pflichtfehler erst beim Absenden ────────────────────────────

  describe('Disziplin-Pflichtfehler', () => {
    function disziplinFehlerSichtbar(): boolean {
      return Array.from(host().querySelectorAll('.alert-error')).some((e) =>
        e.textContent.includes('mindestens eine Disziplin'),
      );
    }

    it('zeigt den Fehler nicht schon beim An- und wieder Abwählen einer Disziplin', () => {
      waehleDisziplin(HERRENDOPPEL);
      component.disziplinGroup(HERRENDOPPEL).get('selected')?.setValue(false);
      // Simuliert das Anklicken/Wegklicken: die Felder gelten als „berührt" (blur).
      component.form.markAllAsTouched();
      fixture.detectChanges();

      expect(disziplinFehlerSichtbar()).toBe(false);
    });

    it('zeigt den Fehler nach dem Absenden ohne Auswahl', () => {
      component.onSubmit();
      fixture.detectChanges();

      expect(disziplinFehlerSichtbar()).toBe(true);
    });
  });

  // ── Validierung Radikal-ID-Angabe ─────────────────────────────────────────

  it('Absenden ohne Radikal-ID-Angabe eines Spielers ist ungültig (kein Request)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Die Bullseye Boys');
    component.spielerGroup(HERRENDOPPEL, 0, 0).get('vorname')?.setValue('Max');
    component.spielerGroup(HERRENDOPPEL, 0, 0).get('nachname')?.setValue('Mustermann');
    // Spieler 0 ohne Radikal ID / Initialen → ungültig
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.radikalAngabeInvalid(HERRENDOPPEL, 0, 0)).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('Spieler ohne Radikal ID, aber mit Initialen + Geburtsdatum ist gültig', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Die Bullseye Boys');
    setzeOhneRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann', 'MM', '1990-01-01');
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

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
    const g = component.spielerGroup(HERRENDOPPEL, 0, 0);
    g.get('radikalId')?.setValue('MM01011990');

    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0, 0);
    g.get('hatKeineRadikalId')?.setValue(false);
    component.toggleRadikalId(HERRENDOPPEL, 0, 0);

    expect(g.get('radikalId')?.value).toBe('MM01011990');
  });

  it('ist im „keine ID"-Modus ungültig, wenn nur eine alte Radikal ID, aber keine Initialen/Geburtsdatum vorliegen', () => {
    waehleDisziplin(HERRENDOPPEL);
    const g = component.spielerGroup(HERRENDOPPEL, 0, 0);
    g.get('vorname')?.setValue('Max');
    g.get('nachname')?.setValue('Mustermann');
    g.get('radikalId')?.setValue('MM01011990');
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0, 0);

    expect(g.hasError('radikalIdAngabeFehlt')).toBe(true);
  });

  it('blockiert nicht wegen unfertiger Radikal ID, wenn auf „keine ID" gewechselt und Initialen+Geburtsdatum ausgefüllt sind', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
    const g = component.spielerGroup(HERRENDOPPEL, 0, 0);
    g.get('vorname')?.setValue('Max');
    g.get('nachname')?.setValue('Mustermann');
    g.get('radikalId')?.setValue('MM01'); // unfertig/ungültig
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0, 0);
    g.get('initialen')?.setValue('MM');
    g.get('geburtsdatum')?.setValue('1990-01-01');
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

    expect(g.valid).toBe(true);
    expect(component.form.valid).toBe(true);
  });

  // ── Format-Validierung Radikal ID / Geburtsdatum ──────────────────────────

  it('lehnt eine Radikal ID im falschen Format ab (Feldfehler, kein Request)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 0, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('radikalId')?.setValue('MM-1234'); // altes Format mit Bindestrich, jetzt ungültig

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.spielerFeldInvalid(HERRENDOPPEL, 0, 1, 'radikalId')).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('zeigt die Format-Fehlermeldung sichtbar am Radikal-ID-Feld', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 0, 1);
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
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

    expect(component.spielerFeldInvalid(HERRENDOPPEL, 0, 0, 'radikalId')).toBe(false);
    expect(component.form.valid).toBe(true);
  });

  it('lehnt ein Geburtsdatum mit mehr als vierstelligem Jahr ab (Feldfehler)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 0, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0, 1);
    g.get('initialen')?.setValue('TT');
    g.get('geburtsdatum')?.setValue('12345-06-15'); // 5-stelliges Jahr

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.spielerFeldInvalid(HERRENDOPPEL, 0, 1, 'geburtsdatum')).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('lehnt ein Geburtsdatum in der Zukunft ab (Feldfehler)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    const g = component.spielerGroup(HERRENDOPPEL, 0, 1);
    g.get('vorname')?.setValue('Tom');
    g.get('nachname')?.setValue('Test');
    g.get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENDOPPEL, 0, 1);
    g.get('initialen')?.setValue('TT');
    const naechstesJahr = new Date().getFullYear() + 1;
    g.get('geburtsdatum')?.setValue(`${naechstesJahr}-06-15`);

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.spielerFeldInvalid(HERRENDOPPEL, 0, 1, 'geburtsdatum')).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  // ── Submit-Payload ────────────────────────────────────────────────────────

  it('sendet ein Team-DTO mit radikalId-Feld an /api/anmeldung', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Die Bullseye Boys');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

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
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('  Die   Bullseye  Boys  ');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    const body = req.request.body as AnmeldungPayload;
    expect(body.disziplinen[0].teamName).toBe('Die Bullseye Boys');
    req.flush({});
  });

  it('lehnt einen Teamnamen über 20 Zeichen ab (Feld-Fehler, kein Request)', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('123456789012345678901'); // 21 Zeichen
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

    component.onSubmit();

    expect(component.form.invalid).toBe(true);
    expect(component.teamNameLaengeFehler(HERRENDOPPEL, 0)).toBe(true);
    httpMock.expectNone('/api/anmeldung');
  });

  it('zeigt eine Teamname-Dublette (409) am richtigen Feld statt als Banner', () => {
    waehleDisziplin(HERRENDOPPEL);
    component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Die Bullseye Boys');
    setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

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

    expect(component.teamNameDuplikatText(HERRENDOPPEL, 0)).toContain('bereits vergeben');
    expect(component.errorMessage()).toBeNull();
  });

  it('zeigt eine Spieler-Dublette (409) an den Namensfeldern der richtigen Einzel-Meldung', () => {
    waehleDisziplin(HERRENEINZEL);
    component.addMeldung(HERRENEINZEL);
    fixture.detectChanges();
    setzeMitRadikalId(HERRENEINZEL, 0, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENEINZEL, 1, 0, 'Max', 'Mustermann');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    req.flush(
      {
        status: 409,
        message: 'Max Mustermann ist in dieser Disziplin bereits gemeldet.',
        errors: [
          {
            field: 'HERRENEINZEL:1',
            message: 'Max Mustermann ist in dieser Disziplin bereits gemeldet.',
          },
        ],
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.spielerDuplikatText(HERRENEINZEL, 1, 0)).toContain('bereits gemeldet');
    expect(component.spielerDuplikatText(HERRENEINZEL, 0, 0)).toBeNull();
    expect(component.errorMessage()).toBeNull();
  });

  it('sendet für zwei Herreneinzel-Meldungen zwei flache Disziplin-Einträge', () => {
    waehleDisziplin(HERRENEINZEL);
    component.addMeldung(HERRENEINZEL);
    fixture.detectChanges();
    setzeMitRadikalId(HERRENEINZEL, 0, 0, 'Max', 'M');
    setzeMitRadikalId(HERRENEINZEL, 1, 0, 'Tim', 'T');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    const body = req.request.body as { disziplinen: { disziplin: string; spieler: unknown[] }[] };
    expect(body.disziplinen).toHaveLength(2);
    expect(body.disziplinen[0].disziplin).toBe('HERRENEINZEL');
    expect(body.disziplinen[1].disziplin).toBe('HERRENEINZEL');
    req.flush({});
  });

  // ── Zeichensatz-Validierung (#167) ────────────────────────────────────────

  describe('Zeichensatz-Validierung (#167)', () => {
    it('akzeptiert Buchstaben, Ziffern und Leerzeichen im Teamnamen', () => {
      waehleDisziplin(HERRENDOPPEL);
      const ctrl = component.meldungGroup(HERRENDOPPEL, 0).get('teamName');
      ctrl?.setValue('München 42');
      expect(ctrl?.hasError('zeichen')).toBe(false);
    });

    it('lehnt ein Sonderzeichen im Teamnamen ab (Feldfehler, kein Request)', () => {
      waehleDisziplin(HERRENDOPPEL);
      component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team.');
      setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
      setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');

      component.onSubmit();

      expect(component.form.invalid).toBe(true);
      expect(component.teamNameZeichenFehler(HERRENDOPPEL, 0)).toBe(true);
      httpMock.expectNone('/api/anmeldung');
    });

    it('lehnt einen Bindestrich im Teamnamen ab (nicht wie beim Personennamen)', () => {
      waehleDisziplin(HERRENDOPPEL);
      const ctrl = component.meldungGroup(HERRENDOPPEL, 0).get('teamName');
      ctrl?.setValue('Team-Eins');
      expect(ctrl?.hasError('zeichen')).toBe(true);
    });

    it('zeigt die Zeichensatz-Meldung sichtbar am Teamnamenfeld', () => {
      waehleDisziplin(HERRENDOPPEL);
      component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team.');

      component.onSubmit();
      fixture.detectChanges();

      const fehler = Array.from(host().querySelectorAll('.field-error')).map((e) => e.textContent);
      expect(fehler.some((t) => t.includes('gültigen Teamnamen'))).toBe(true);
    });

    it('akzeptiert einen Doppelnamen mit Bindestrich im Vornamen', () => {
      waehleDisziplin(HERRENDOPPEL);
      const ctrl = component.spielerGroup(HERRENDOPPEL, 0, 0).get('vorname');
      ctrl?.setValue('Anna-Lena');
      expect(ctrl?.hasError('zeichen')).toBe(false);
    });

    it('lehnt Ziffern/Sonderzeichen im Vornamen ab (Feldfehler, kein Request)', () => {
      waehleDisziplin(HERRENDOPPEL);
      component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
      setzeMitRadikalId(HERRENDOPPEL, 0, 0, 'Max', 'Mustermann');
      setzeMitRadikalId(HERRENDOPPEL, 0, 1, 'Tom', 'Test');
      component.spielerGroup(HERRENDOPPEL, 0, 0).get('vorname')?.setValue('Ann@');

      component.onSubmit();

      expect(component.form.invalid).toBe(true);
      expect(component.spielerFeldHatFehler(HERRENDOPPEL, 0, 0, 'vorname', 'zeichen')).toBe(true);
      httpMock.expectNone('/api/anmeldung');
    });

    it('behandelt ein leeres Namensfeld als Pflichtfehler, nicht als Zeichensatzfehler', () => {
      waehleDisziplin(HERRENDOPPEL);
      const ctrl = component.spielerGroup(HERRENDOPPEL, 0, 0).get('vorname');
      ctrl?.setValue('');
      expect(ctrl?.hasError('required')).toBe(true);
      expect(ctrl?.hasError('zeichen')).toBe(false);
    });

    it('zeigt die Zeichensatz-Meldung sichtbar am Namensfeld', () => {
      waehleDisziplin(HERRENDOPPEL);
      component.spielerGroup(HERRENDOPPEL, 0, 0).get('vorname')?.setValue('Ann@');

      component.onSubmit();
      fixture.detectChanges();

      const fehler = Array.from(host().querySelectorAll('.field-error')).map((e) => e.textContent);
      expect(fehler.some((t) => t.includes('gültigen Namen'))).toBe(true);
    });
  });

  // ── Preisberechnung (10 € pro Spieler) ────────────────────────────────────

  function preisTexte(): string[] {
    return Array.from(host().querySelectorAll('.price-line')).map((e) => e.textContent);
  }

  it('Teamwettbewerb mit 5 Spielern kostet 50 € für diese Disziplin', () => {
    waehleDisziplin(TEAMWETTBEWERB);
    klickeSpielerHinzufuegen(); // 4 → 5 Spieler

    expect(component.spielerArray(TEAMWETTBEWERB, 0).length).toBe(5);
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

    expect(component.spielerArray(U18, 0).length).toBe(1);
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

  it('fasst drei Herreneinzel-Meldungen zu einer Preiszeile mit 30 € gesamt zusammen', () => {
    waehleDisziplin(HERRENEINZEL);
    component.addMeldung(HERRENEINZEL);
    component.addMeldung(HERRENEINZEL);
    fixture.detectChanges();

    expect(component.preisPosten().length).toBe(1);
    expect(component.preisPosten()[0].spielerAnzahl).toBe(3);
    expect(component.gesamtpreis()).toBe(30);
    expect(preisTexte().length).toBe(1);
  });

  it('zählt mehrere U18-Meldungen als kostenlos (0 €)', () => {
    waehleDisziplin(U18);
    component.addMeldung(U18);
    fixture.detectChanges();

    expect(component.gesamtpreis()).toBe(0);
  });

  it('typt FormGroup korrekt für Spieler-Zugriff', () => {
    waehleDisziplin(HERRENDOPPEL);
    expect(component.spielerGroup(HERRENDOPPEL, 0, 0) instanceof FormGroup).toBe(true);
  });

  describe('Anmeldeschluss', () => {
    it('übernimmt Status aus dem GET und formatiert das Datum', () => {
      expect(component.anmeldungOffen()).toBe(true);
      expect(component.anmeldeschlussAnzeige()).toBe('28.02.2027');
    });

    it('zeigt bei offener Anmeldung das Formular und keine Infoseite', () => {
      fixture.detectChanges();
      expect(host().querySelector('form')).not.toBeNull();
      expect(host().querySelector('.anmeldung-geschlossen')).toBeNull();
    });

    it('zeigt bei geschlossener Anmeldung die Infoseite statt des Formulars', () => {
      component.anmeldungOffen.set(false);
      component.anmeldeschlussAnzeige.set('28.02.2027');
      fixture.detectChanges();

      expect(host().querySelector('form')).toBeNull();
      const info = host().querySelector('.anmeldung-geschlossen');
      expect(info).not.toBeNull();
      expect((info as HTMLElement).textContent).toContain('28.02.2027');
    });
  });
});
