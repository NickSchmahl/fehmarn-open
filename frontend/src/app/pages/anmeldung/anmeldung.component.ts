import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DISZIPLINEN } from '../../shared/disziplin';
import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';

// ── Typen ────────────────────────────────────────────────────────────────────

/** Eine Zeile der Preisaufschlüsselung: eine gewählte Disziplin mit Spielerzahl und Betrag. */
interface PreisPosten {
  label: string;
  spielerAnzahl: number;
  preisProSpieler: number; // Startgeld je Spieler dieser Disziplin (0 = kostenlos, z. B. U18)
  betrag: number;
}

/** Antwort von GET /api/anmeldung/status. */
interface AnmeldeschlussStatus {
  anmeldungOffen: boolean;
  anmeldeschluss: string; // ISO YYYY-MM-DD
}

/** Formatiert ein ISO-Datum (YYYY-MM-DD) als deutsches Datum (TT.MM.JJJJ) für die Anzeige. */
function formatiereDatum(isoDatum: string): string {
  const teile = isoDatum.split('-');
  if (teile.length !== 3) return isoDatum;
  const [jahr, monat, tag] = teile;
  return `${tag}.${monat}.${jahr}`;
}

/** Extrahiert typsicher eine Fehlermeldung aus einem unbekannten Fehlerobjekt. */
function extractFehlermeldung(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const backendError = (err as { error?: unknown }).error;
    if (typeof backendError === 'object' && backendError !== null && 'message' in backendError) {
      const message = backendError.message;
      if (typeof message === 'string') return message;
    }
    if ('message' in err) {
      const message = err.message;
      if (typeof message === 'string') return message;
    }
  }
  return 'Unbekannter Fehler';
}

/** Liest den Wert eines Controls typsicher als String (dynamisches `.value` ist sonst `any`). */
function stringWert(group: AbstractControl, feld: string): string {
  const value: unknown = group.get(feld)?.value;
  return typeof value === 'string' ? value : '';
}

/** Leere bzw. nur aus Leerzeichen bestehende Eingaben werden zu null (fürs Backend-DTO). */
function leerZuNull(value: string): string | null {
  return value.trim() !== '' ? value : null;
}

/** Maximale Teamname-Länge (Radikal-Software-Limit), gemessen nach Normalisierung. */
const TEAMNAME_MAX_LAENGE = 20;

/**
 * Teamname-Normalisierung wie im Backend (siehe TeamnameValidierungService): führende/abschließende
 * Leerzeichen entfernen und interne Mehrfach-Whitespaces zu einem einzelnen zusammenfassen. Leere
 * bzw. reine Whitespace-Eingaben ergeben null.
 */
function normalisiereTeamname(value: string): string | null {
  const normalisiert = value.trim().replace(/\s+/g, ' ');
  return normalisiert === '' ? null : normalisiert;
}

/** Feld-Validator: Teamname darf nach Normalisierung höchstens {@link TEAMNAME_MAX_LAENGE} Zeichen haben. */
function teamnameMaxLaengeValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  const normalisiert = normalisiereTeamname(value);
  if (normalisiert === null) return null;
  return normalisiert.length > TEAMNAME_MAX_LAENGE ? { maxlaenge: TEAMNAME_MAX_LAENGE } : null;
}

/** Radikal ID: zwei Buchstaben (Initialen) + achtstelliges Geburtsdatum TTMMJJJJ (z. B. MM01011990). */
const RADIKAL_ID_MUSTER = /^[A-Za-z]{2}\d{8}$/;

/**
 * Feld-Validator für die Radikal ID. Im „keine ID"-Modus ist das Feld ausgeblendet – ein
 * (ggf. unfertiger) Wert bleibt zwar erhalten, wird dann aber nicht gegen das Muster geprüft.
 */
function radikalIdPatternValidator(control: AbstractControl): ValidationErrors | null {
  const parent = control.parent;
  if (parent && parent.get('hatKeineRadikalId')?.value === true) return null;
  const value = typeof control.value === 'string' ? control.value : '';
  if (value === '') return null;
  return RADIKAL_ID_MUSTER.test(value) ? null : { pattern: true };
}

/**
 * Feld-Validator fürs Geburtsdatum: erlaubt nur ein reales Datum mit vierstelligem Jahr
 * (`YYYY-MM-DD`) und kein Datum in der Zukunft. Nur im „keine ID"-Modus relevant; sonst ist
 * das Feld ausgeblendet und ein Restwert wird nicht geprüft. Leer ist ok – die Pflicht-Logik
 * steckt im Gruppen-Validator {@link radikalIdAngabeValidator}.
 */
function geburtsdatumValidator(control: AbstractControl): ValidationErrors | null {
  const parent = control.parent;
  if (!parent || parent.get('hatKeineRadikalId')?.value !== true) return null;
  const value: unknown = control.value;
  if (typeof value !== 'string' || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { geburtsdatumUngueltig: true };
  const datum = new Date(`${value}T00:00:00`);
  if (Number.isNaN(datum.getTime())) return { geburtsdatumUngueltig: true };
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  if (datum.getTime() > heute.getTime()) return { geburtsdatumInZukunft: true };
  return null;
}

/**
 * Validator je Spielerzeile: Es muss entweder eine Radikal ID angegeben sein ODER
 * Initialen + Geburtsdatum, damit eine Radikal ID erstellt werden kann.
 */
function radikalIdAngabeValidator(group: AbstractControl): ValidationErrors | null {
  const hatKeine = group.get('hatKeineRadikalId')?.value === true;
  if (hatKeine) {
    const initialen = stringWert(group, 'initialen').trim();
    const geburtsdatum = stringWert(group, 'geburtsdatum');
    return initialen !== '' && geburtsdatum !== '' ? null : { radikalIdAngabeFehlt: true };
  }
  return stringWert(group, 'radikalId').trim() !== '' ? null : { radikalIdAngabeFehlt: true };
}

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-anmeldung',
  standalone: true,
  imports: [ReactiveFormsModule, BrandIconComponent],
  templateUrl: './anmeldung.component.html',
  styleUrl: './anmeldung.component.scss',
})
export class AnmeldungComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private httpClient = inject(HttpClient);

  // Öffentliche Metadaten für das Template
  readonly disziplinen = DISZIPLINEN;

  // State
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Anmeldeschluss-Status (aus GET /api/anmeldung/status). Default offen, bis geladen; bei
  // geschlossenem Status wird das Formular gar nicht gerendert.
  anmeldungOffen = signal(true);
  anmeldeschlussAnzeige = signal<string | null>(null);

  ngOnInit(): void {
    this.httpClient.get<AnmeldeschlussStatus>('/api/anmeldung/status').subscribe({
      next: (status) => {
        this.anmeldungOffen.set(status.anmeldungOffen);
        this.anmeldeschlussAnzeige.set(formatiereDatum(status.anmeldeschluss));
      },
      // Defensiv: bei Ladefehler das Formular zeigen; das Backend sperrt späte POSTs ohnehin (403).
      error: () => {
        this.anmeldungOffen.set(true);
      },
    });
  }

  // ── Formular ────────────────────────────────────────────────────────────
  // Es gibt kein Kontaktfeld mehr: Name & Radikal-ID-Angabe leben ausschliesslich in den
  // Spielerzeilen. Je gewählter Disziplin klappt ein Block mit Spielerzeilen (+ Teamname) auf.

  form = this.formBuilder.group(
    {
      disziplinen: this.formBuilder.array(
        DISZIPLINEN.map(() =>
          this.formBuilder.group({
            selected: [false],
            meldungen: this.formBuilder.array<FormGroup>([]),
          }),
        ),
      ),
    },
    { validators: (group: AbstractControl) => this.mindestensEineDisziplinValidator(group) },
  );

  get disziplinenArray(): FormArray {
    return this.form.get('disziplinen') as FormArray;
  }

  disziplinGroup(i: number): FormGroup {
    return this.disziplinenArray.at(i) as FormGroup;
  }

  meldungenArray(i: number): FormArray {
    return this.disziplinGroup(i).get('meldungen') as FormArray;
  }

  meldungGroup(i: number, k: number): FormGroup {
    return this.meldungenArray(i).at(k) as FormGroup;
  }

  spielerArray(i: number, k: number): FormArray {
    return this.meldungGroup(i, k).get('spieler') as FormArray;
  }

  spielerGroup(i: number, k: number, j: number): FormGroup {
    return this.spielerArray(i, k).at(j) as FormGroup;
  }

  /** Eine Meldung: (bei Team-Disziplinen) Teamname + auf Pflichtzahl aufgefüllte Spielerzeilen. */
  private createMeldungGroup(i: number): FormGroup {
    const meta = DISZIPLINEN[i];
    const spieler = this.formBuilder.array<FormGroup>([]);
    while (spieler.length < meta.minSpieler) {
      spieler.push(this.createSpielerGroup());
    }
    const validators = meta.teamName ? [Validators.required, teamnameMaxLaengeValidator] : [];
    return this.formBuilder.group({
      teamName: ['', validators],
      spieler,
    });
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  /** Signal-Brücke: hält immer den aktuellen Formularwert, damit computed() reagieren kann. */
  private _formValue = signal(this.form.getRawValue());

  /** Wie viele Disziplinen sind aktuell angehakt? */
  selectedCount = computed(() => {
    const disziplinen = this._formValue().disziplinen as { selected: boolean | null }[];
    return disziplinen.filter((d) => d.selected === true).length;
  });

  /**
   * Aufschlüsselung je gewählter Disziplin: jede erfasste Person kostet das disziplin-abhängige
   * Startgeld (`meta.preisProSpieler`), der Betrag richtet sich also nach der Spielerzahl.
   * Kostenlose Disziplinen (z. B. U18) tragen 0 € bei.
   */
  preisPosten = computed<PreisPosten[]>(() => {
    const disziplinen = this._formValue().disziplinen as {
      selected: boolean | null;
      meldungen: { spieler: unknown[] }[];
    }[];
    return disziplinen
      .map((disziplin, i) => ({ disziplin, meta: DISZIPLINEN[i] }))
      .filter(({ disziplin }) => disziplin.selected === true)
      .map(({ disziplin, meta }) => {
        const spielerAnzahl = disziplin.meldungen.reduce(
          (summe, meldung) => summe + meldung.spieler.length,
          0,
        );
        return {
          label: meta.label,
          spielerAnzahl,
          preisProSpieler: meta.preisProSpieler,
          betrag: spielerAnzahl * meta.preisProSpieler,
        };
      });
  });

  gesamtpreis = computed(() =>
    this.preisPosten().reduce((summe, posten) => summe + posten.betrag, 0),
  );

  constructor() {
    this.form.valueChanges.subscribe(() => {
      this._formValue.set(this.form.getRawValue());
    });

    // Beim An-/Abwählen einer Disziplin Spielerzeilen und Teamname-Pflicht dynamisch setzen.
    this.disziplinenArray.controls.forEach((ctrl, i) => {
      ctrl.get('selected')?.valueChanges.subscribe((checked) => {
        this.onDisziplinToggle(i, checked === true);
      });
    });
  }

  // ── Spieler-Verwaltung ─────────────────────────────────────────────────────

  private createSpielerGroup(): FormGroup {
    return this.formBuilder.group(
      {
        vorname: ['', [Validators.required]],
        nachname: ['', [Validators.required]],
        hatKeineRadikalId: [false],
        radikalId: ['', [radikalIdPatternValidator]],
        initialen: [''],
        geburtsdatum: ['', [geburtsdatumValidator]],
      },
      { validators: radikalIdAngabeValidator },
    );
  }

  private onDisziplinToggle(i: number, selected: boolean): void {
    const meldungen = this.meldungenArray(i);
    if (selected) {
      if (meldungen.length === 0) {
        meldungen.push(this.createMeldungGroup(i));
      }
    } else {
      meldungen.clear();
    }
  }

  addSpieler(i: number, k: number): void {
    if (this.canAddSpieler(i, k)) {
      this.spielerArray(i, k).push(this.createSpielerGroup());
    }
  }

  removeSpieler(i: number, k: number, j: number): void {
    if (this.canRemoveSpieler(i, k)) {
      this.spielerArray(i, k).removeAt(j);
    }
  }

  /**
   * Umschalter „Ich habe noch keine Radikal ID": Die Eingaben bleiben erhalten, damit man den
   * Umschalter ausprobieren kann, ohne bereits Getipptes zu verlieren. Nicht relevante Felder
   * werden erst beim Absenden ausgeblendet ({@link toSpielerPayload}); hier werden nur die nun
   * ein-/ausgeblendeten Felder neu bewertet, damit veraltete Feldfehler verschwinden.
   */
  toggleRadikalId(i: number, k: number, j: number): void {
    const group = this.spielerGroup(i, k, j);
    group.get('radikalId')?.updateValueAndValidity();
    group.get('geburtsdatum')?.updateValueAndValidity();
  }

  // ── Hilfsmethoden fürs Template ────────────────────────────────────────────

  isDisziplinSelected(i: number): boolean {
    return this.disziplinGroup(i).get('selected')?.value === true;
  }

  needsTeamName(i: number): boolean {
    return DISZIPLINEN[i].teamName && this.isDisziplinSelected(i);
  }

  teamNameInvalid(i: number, k: number): boolean {
    const ctrl = this.meldungGroup(i, k).get('teamName');
    return ctrl !== null && ctrl.invalid && ctrl.touched;
  }

  readonly teamnameMaxLaenge = TEAMNAME_MAX_LAENGE;

  teamNameRequiredFehler(i: number, k: number): boolean {
    const ctrl = this.meldungGroup(i, k).get('teamName');
    return ctrl !== null && ctrl.hasError('required') && ctrl.touched;
  }

  teamNameLaengeFehler(i: number, k: number): boolean {
    const ctrl = this.meldungGroup(i, k).get('teamName');
    return ctrl !== null && ctrl.hasError('maxlaenge') && ctrl.touched;
  }

  /** Fachliche Dubletten-Meldung vom Server (per {@link zeigeTeamnameDuplikatAmFeld} gesetzt) oder null. */
  teamNameDuplikatText(i: number, k: number): string | null {
    const fehler: unknown = this.meldungGroup(i, k).get('teamName')?.errors?.['duplikat'];
    return typeof fehler === 'string' ? fehler : null;
  }

  canAddSpieler(i: number, k: number): boolean {
    return this.spielerArray(i, k).length < DISZIPLINEN[i].maxSpieler;
  }

  canRemoveSpieler(i: number, k: number): boolean {
    return this.spielerArray(i, k).length > DISZIPLINEN[i].minSpieler;
  }

  hatKeineRadikalId(i: number, k: number, j: number): boolean {
    return this.spielerGroup(i, k, j).get('hatKeineRadikalId')?.value === true;
  }

  spielerFeldInvalid(i: number, k: number, j: number, feld: string): boolean {
    const ctrl = this.spielerGroup(i, k, j).get(feld);
    return ctrl !== null && ctrl.invalid && ctrl.touched;
  }

  /** Prüft, ob ein Feld einen bestimmten (angefassten) Fehler trägt – für gezielte Meldungen. */
  spielerFeldHatFehler(i: number, k: number, j: number, feld: string, fehler: string): boolean {
    const ctrl = this.spielerGroup(i, k, j).get(feld);
    return ctrl !== null && ctrl.touched && ctrl.hasError(fehler);
  }

  /** Heutiges Datum als `YYYY-MM-DD` – als `max` fürs Geburtsdatum-Feld (keine Zukunft). */
  readonly heuteIso = new Date().toISOString().slice(0, 10);

  radikalAngabeInvalid(i: number, k: number, j: number): boolean {
    const group = this.spielerGroup(i, k, j);
    return group.hasError('radikalIdAngabeFehlt') && group.touched;
  }

  /** Die (optionale) 4. Zeile bei Triple Mix darf als Ersatz eingetragen werden. */
  zeigtErsatzHinweis(i: number, k: number, j: number): boolean {
    return DISZIPLINEN[i].value === 'TRIPLE_MIX' && j === 3;
  }

  // ── Validator ────────────────────────────────────────────────────────────

  private mindestensEineDisziplinValidator(group: AbstractControl): ValidationErrors | null {
    const arr = (group.get('disziplinen') as FormArray).controls;
    const anySelected = arr.some((c) => c.get('selected')?.value === true);
    return anySelected ? null : { noDisziplin: true };
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    // Alte Teamname-Dubletten-Fehler (vom Server gesetzt) zurücksetzen, damit sie das erneute
    // Absenden nicht blockieren.
    this.clearTeamnameDuplikatFehler();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const disziplinen = this.disziplinenArray.controls
      .map((ctrl, i) => ({ i, ctrl, meta: DISZIPLINEN[i] }))
      .filter(({ ctrl }) => ctrl.get('selected')?.value === true)
      .map(({ i, meta }) => {
        // Aktuell genau eine Meldung je Disziplin (Feature „weitere Meldung" folgt in Task 6) –
        // das gesendete DTO bleibt daher flach: ein Eintrag je gewählter Disziplin.
        const meldung = this.meldungGroup(i, 0);
        return {
          disziplin: meta.value,
          teamName: normalisiereTeamname(stringWert(meldung, 'teamName')),
          spieler: (meldung.get('spieler') as FormArray).controls.map((s) =>
            this.toSpielerPayload(s),
          ),
        };
      });

    const body = { disziplinen };

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMsg.set(null);

    this.httpClient.post('/api/anmeldung', body).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMsg.set('Anmeldung erfolgreich! Wir sehen uns beim Turnier.');
        this.form.reset();
        this._formValue.set(this.form.getRawValue());
      },
      error: (err: unknown) => {
        this.loading.set(false);
        // Teamname-Dublette (409 mit Disziplin-Feldkennung) direkt am Feld anzeigen; sonst Banner.
        if (this.zeigeTeamnameDuplikatAmFeld(err)) return;
        this.errorMessage.set(`Fehler bei der Anmeldung: ${extractFehlermeldung(err)}`);
      },
    });
  }

  /** Entfernt an allen Teamname-Feldern den serverseitig gesetzten `duplikat`-Fehler. */
  private clearTeamnameDuplikatFehler(): void {
    this.disziplinenArray.controls.forEach((_, i) => {
      for (const meldung of this.meldungenArray(i).controls) {
        const ctrl = meldung.get('teamName');
        if (ctrl?.hasError('duplikat')) {
          ctrl.setErrors(null);
          ctrl.updateValueAndValidity();
        }
      }
    });
  }

  /**
   * Wertet einen 409 mit Disziplin-Feldkennung aus (siehe ADR 0011) und setzt den Fehler am
   * passenden Teamname-Control. Gibt true zurück, wenn der Fehler feldgenau behandelt wurde.
   */
  private zeigeTeamnameDuplikatAmFeld(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 409) return false;
    const errors = (err.error as { errors?: { field?: string; message?: string }[] } | null)
      ?.errors;
    const feld = errors?.[0];
    if (!feld?.field) return false;
    const index = DISZIPLINEN.findIndex((d) => d.value === feld.field);
    if (index < 0 || this.meldungenArray(index).length === 0) return false;
    const ctrl = this.meldungGroup(index, 0).get('teamName');
    if (!ctrl) return false;
    ctrl.setErrors({
      duplikat: feld.message ?? 'Teamname ist in dieser Disziplin bereits vergeben.',
    });
    ctrl.markAsTouched();
    return true;
  }

  /** Baut das Spieler-DTO; je nach Umschalter wird Radikal ID oder Initialen+Geburtsdatum gesendet. */
  private toSpielerPayload(group: AbstractControl) {
    const hatKeine = group.get('hatKeineRadikalId')?.value === true;
    return {
      vorname: stringWert(group, 'vorname'),
      nachname: stringWert(group, 'nachname'),
      radikalId: hatKeine ? null : leerZuNull(stringWert(group, 'radikalId')),
      initialen: hatKeine ? leerZuNull(stringWert(group, 'initialen')) : null,
      geburtsdatum: hatKeine ? leerZuNull(stringWert(group, 'geburtsdatum')) : null,
    };
  }
}
