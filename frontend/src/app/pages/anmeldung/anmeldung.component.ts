import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DISZIPLINEN } from '../../shared/disziplin';

// ── Typen ────────────────────────────────────────────────────────────────────

const PREIS_PRO_SPIELER = 10;

/** Eine Zeile der Preisaufschlüsselung: eine gewählte Disziplin mit Spielerzahl und Betrag. */
interface PreisPosten {
  label: string;
  spielerAnzahl: number;
  betrag: number;
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

/** Radikal ID: zwei Buchstaben (Initialen) + achtstelliges Geburtsdatum TTMMJJJJ (z. B. MM01011990). */
const RADIKAL_ID_MUSTER = /^[A-Za-z]{2}\d{8}$/;

/**
 * Feld-Validator fürs Geburtsdatum: erlaubt nur ein reales Datum mit vierstelligem Jahr
 * (`YYYY-MM-DD`) und kein Datum in der Zukunft. Leer ist ok – die Pflicht-Logik steckt im
 * Gruppen-Validator {@link radikalIdAngabeValidator}.
 */
function geburtsdatumValidator(control: AbstractControl): ValidationErrors | null {
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
  const radikalId = stringWert(group, 'radikalId').trim();
  const initialen = stringWert(group, 'initialen').trim();
  const geburtsdatum = stringWert(group, 'geburtsdatum');
  if (radikalId !== '') return null;
  if (initialen !== '' && geburtsdatum !== '') return null;
  return { radikalIdAngabeFehlt: true };
}

// ── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-anmeldung',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './anmeldung.component.html',
  styleUrl: './anmeldung.component.scss',
})
export class AnmeldungComponent {
  private formBuilder = inject(FormBuilder);
  private httpClient = inject(HttpClient);

  // Öffentliche Metadaten für das Template
  readonly disziplinen = DISZIPLINEN;
  readonly preisProSpieler = PREIS_PRO_SPIELER;

  // State
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // ── Formular ────────────────────────────────────────────────────────────
  // Es gibt kein Kontaktfeld mehr: Name & Radikal-ID-Angabe leben ausschliesslich in den
  // Spielerzeilen. Je gewählter Disziplin klappt ein Block mit Spielerzeilen (+ Teamname) auf.

  form = this.formBuilder.group(
    {
      disziplinen: this.formBuilder.array(
        DISZIPLINEN.map(() =>
          this.formBuilder.group({
            selected: [false],
            teamName: [''],
            spieler: this.formBuilder.array<FormGroup>([]),
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

  spielerArray(i: number): FormArray {
    return this.disziplinGroup(i).get('spieler') as FormArray;
  }

  spielerGroup(i: number, j: number): FormGroup {
    return this.spielerArray(i).at(j) as FormGroup;
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
   * Aufschlüsselung je gewählter Disziplin: jede erfasste Person kostet
   * {@link PREIS_PRO_SPIELER} €, der Betrag richtet sich also nach der Spielerzahl.
   */
  preisPosten = computed<PreisPosten[]>(() => {
    const disziplinen = this._formValue().disziplinen as {
      selected: boolean | null;
      spieler: unknown[];
    }[];
    return disziplinen
      .map((disziplin, i) => ({ disziplin, meta: DISZIPLINEN[i] }))
      .filter(({ disziplin }) => disziplin.selected === true)
      .map(({ disziplin, meta }) => {
        const spielerAnzahl = disziplin.spieler.length;
        return { label: meta.label, spielerAnzahl, betrag: spielerAnzahl * PREIS_PRO_SPIELER };
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
        radikalId: ['', [Validators.pattern(RADIKAL_ID_MUSTER)]],
        initialen: [''],
        geburtsdatum: ['', [geburtsdatumValidator]],
      },
      { validators: radikalIdAngabeValidator },
    );
  }

  private onDisziplinToggle(i: number, selected: boolean): void {
    const meta = DISZIPLINEN[i];
    const teamNameCtrl = this.disziplinGroup(i).get('teamName');
    const spieler = this.spielerArray(i);

    if (selected) {
      if (meta.teamName) {
        teamNameCtrl?.setValidators([Validators.required]);
      }
      // Auf die Pflichtanzahl auffüllen (idempotent, falls bereits Zeilen vorhanden sind).
      while (spieler.length < meta.minSpieler) {
        spieler.push(this.createSpielerGroup());
      }
    } else {
      teamNameCtrl?.clearValidators();
      teamNameCtrl?.setValue('');
      spieler.clear();
    }
    teamNameCtrl?.updateValueAndValidity();
  }

  addSpieler(i: number): void {
    if (this.canAddSpieler(i)) {
      this.spielerArray(i).push(this.createSpielerGroup());
    }
  }

  removeSpieler(i: number, j: number): void {
    if (this.canRemoveSpieler(i)) {
      this.spielerArray(i).removeAt(j);
    }
  }

  /**
   * Umschalter „Ich habe noch keine Radikal ID": leert die jeweils ausgeblendeten Felder,
   * damit kein veralteter Wert ans Backend gesendet wird.
   */
  toggleRadikalId(i: number, j: number): void {
    const group = this.spielerGroup(i, j);
    if (this.hatKeineRadikalId(i, j)) {
      group.get('radikalId')?.setValue('');
    } else {
      group.get('initialen')?.setValue('');
      group.get('geburtsdatum')?.setValue('');
    }
  }

  // ── Hilfsmethoden fürs Template ────────────────────────────────────────────

  isDisziplinSelected(i: number): boolean {
    return this.disziplinGroup(i).get('selected')?.value === true;
  }

  needsTeamName(i: number): boolean {
    return DISZIPLINEN[i].teamName && this.isDisziplinSelected(i);
  }

  teamNameInvalid(i: number): boolean {
    const ctrl = this.disziplinGroup(i).get('teamName');
    return ctrl !== null && ctrl.invalid && ctrl.touched;
  }

  canAddSpieler(i: number): boolean {
    return this.spielerArray(i).length < DISZIPLINEN[i].maxSpieler;
  }

  canRemoveSpieler(i: number): boolean {
    return this.spielerArray(i).length > DISZIPLINEN[i].minSpieler;
  }

  hatKeineRadikalId(i: number, j: number): boolean {
    return this.spielerGroup(i, j).get('hatKeineRadikalId')?.value === true;
  }

  spielerFeldInvalid(i: number, j: number, feld: string): boolean {
    const ctrl = this.spielerGroup(i, j).get(feld);
    return ctrl !== null && ctrl.invalid && ctrl.touched;
  }

  /** Prüft, ob ein Feld einen bestimmten (angefassten) Fehler trägt – für gezielte Meldungen. */
  spielerFeldHatFehler(i: number, j: number, feld: string, fehler: string): boolean {
    const ctrl = this.spielerGroup(i, j).get(feld);
    return ctrl !== null && ctrl.touched && ctrl.hasError(fehler);
  }

  /** Heutiges Datum als `YYYY-MM-DD` – als `max` fürs Geburtsdatum-Feld (keine Zukunft). */
  readonly heuteIso = new Date().toISOString().slice(0, 10);

  radikalAngabeInvalid(i: number, j: number): boolean {
    const group = this.spielerGroup(i, j);
    return group.hasError('radikalIdAngabeFehlt') && group.touched;
  }

  /** Die (optionale) 4. Zeile bei Triple Mix darf als Ersatz eingetragen werden. */
  zeigtErsatzHinweis(i: number, j: number): boolean {
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
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const disziplinen = this.disziplinenArray.controls
      .map((ctrl, i) => ({ ctrl, meta: DISZIPLINEN[i] }))
      .filter(({ ctrl }) => ctrl.get('selected')?.value === true)
      .map(({ ctrl, meta }) => ({
        disziplin: meta.value,
        teamName: leerZuNull(stringWert(ctrl, 'teamName')),
        spieler: (ctrl.get('spieler') as FormArray).controls.map((s) => this.toSpielerPayload(s)),
      }));

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
        this.errorMessage.set(`Fehler bei der Anmeldung: ${extractFehlermeldung(err)}`);
      },
    });
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
