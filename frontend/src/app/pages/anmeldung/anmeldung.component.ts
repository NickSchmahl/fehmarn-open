import {Component, computed, inject, signal} from '@angular/core';
import {AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {DISZIPLINEN} from '../../shared/disziplin';

// ── Typen ────────────────────────────────────────────────────────────────────

const PREIS_PRO_DISZIPLIN = 10;

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
  readonly preisProDisziplin = PREIS_PRO_DISZIPLIN;

  // State
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // ── Formular ────────────────────────────────────────────────────────────

  form = this.formBuilder.group({
    vorname: ['', [Validators.required]],
    nachname: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    radicalId: [''],
    disziplinen: this.formBuilder.array(
      DISZIPLINEN.map(() =>
        this.formBuilder.group({
          selected: [false],
          teamName: [''],
        })
      )
    ),
  }, {validators: this.mindestensEineDisziplinValidator});

  get disziplinenArray(): FormArray {
    return this.form.get('disziplinen') as FormArray;
  }

  disziplinGroup(i: number): AbstractControl {
    return this.disziplinenArray.at(i);
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  /** Wie viele Disziplinen sind aktuell angehakt? */
  selectedCount = computed(() => {
    // Wir lesen den Formwert reaktiv über ein Signal, das bei
    // valueChanges aktualisiert wird (s.u. via trackFormValue).
    return this._formValue()
      .disziplinen
      .filter((d: { selected: boolean | null }) => d.selected === true)
      .length;
  });

  gesamtpreis = computed(() => this.selectedCount() * PREIS_PRO_DISZIPLIN);

  /**
   * Signal-Brücke: hält immer den aktuellen Formularwert,
   * damit computed() darauf reagieren kann.
   */
  private _formValue = signal(this.form.getRawValue());

  constructor() {
    this.form.valueChanges.subscribe(() =>
      this._formValue.set(this.form.getRawValue())
    );

    // Teamname-Pflichtfeld dynamisch setzen
    this.disziplinenArray.controls.forEach((ctrl, i) => {
      ctrl.get('selected')!.valueChanges.subscribe(checked => {
        const teamNameCtrl = ctrl.get('teamName')!;
        const needsTeam = DISZIPLINEN[i].teamName;
        if (needsTeam && checked) {
          teamNameCtrl.setValidators([Validators.required]);
        } else {
          teamNameCtrl.clearValidators();
          teamNameCtrl.setValue('');
        }
        teamNameCtrl.updateValueAndValidity();
      });
    });
  }

  // ── Hilfsmethoden ────────────────────────────────────────────────────────

  isDisziplinSelected(i: number): boolean {
    return !!this.disziplinenArray.at(i).get('selected')?.value;
  }

  needsTeamName(i: number): boolean {
    return DISZIPLINEN[i].teamName && this.isDisziplinSelected(i);
  }

  teamNameInvalid(i: number): boolean {
    const ctrl = this.disziplinenArray.at(i).get('teamName')!;
    return ctrl.invalid && ctrl.touched;
  }

  /** Shortcut-Getter für Template-Validierungsfeedback */
  get vorname() {
    return this.form.get('vorname')!;
  }

  get nachname() {
    return this.form.get('nachname')!;
  }

  get email() {
    return this.form.get('email')!;
  }

  get radicalId() {
    return this.form.get('radicalId')!;
  }

  // ── Validator ────────────────────────────────────────────────────────────

  private mindestensEineDisziplinValidator(group: AbstractControl) {
    const arr = (group.get('disziplinen') as FormArray).controls;
    const anySelected = arr.some(c => c.get('selected')?.value === true);
    return anySelected ? null : {noDisziplin: true};
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    // Nur ausgewählte Disziplinen ans Backend schicken
    const rawDisziplinen = (this.form.value.disziplinen ?? []) as Array<{
      selected: boolean;
      teamName: string;
    }>;

    const selectedDisziplinen = rawDisziplinen
      .map((d, i) => ({...d, meta: DISZIPLINEN[i]}))
      .filter(d => d.selected)
      .map(d => ({
        disziplin: d.meta.value,
        teamName: d.teamName || null,
      }));

    const body = {
      vorname: this.form.value.vorname,
      nachname: this.form.value.nachname,
      email: this.form.value.email,
      radicalId: this.form.value.radicalId || null,
      disziplinen: selectedDisziplinen,
    };

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMsg.set(null);

    this.httpClient.post('/api/anmeldung', body).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMsg.set('Anmeldung erfolgreich! Du erhältst in Kürze eine Bestätigung.');
        this.form.reset();
        this._formValue.set(this.form.getRawValue());
      },
      error: err => {
        this.loading.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'Unbekannter Fehler';
        this.errorMessage.set(`Fehler bei der Anmeldung: ${msg}`);
      },
    });
  }
}
