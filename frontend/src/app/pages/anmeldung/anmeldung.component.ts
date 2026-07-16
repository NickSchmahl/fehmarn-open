import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DISZIPLINEN } from '../../shared/disziplin';
import { formatiereIsoDatum, heuteAlsIso } from '../../shared/datum';
import { extrahiereFehlermeldung } from '../../shared/http-fehler';
import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';
import {
  AnmeldeschlussStatus,
  AnmeldungFormWert,
  DisziplinFormWert,
  PreisPosten,
} from './model/anmeldung.model';
import { TEAMNAME_MAX_LAENGE } from './logik/teamname';
import {
  geburtsdatumValidator,
  mindestensEineDisziplinValidator,
  radikalIdAngabeValidator,
  radikalIdPatternValidator,
  spielernameMusterValidator,
  teamnameMaxLaengeValidator,
  teamnameMusterValidator,
} from './logik/anmeldung-validators';
import {
  berechneGesamtpreis,
  berechnePreisPosten,
  zaehleGewaehlteDisziplinen,
} from './logik/preisberechnung';
import { erstelleAnmeldungRequest } from './logik/anmeldung-payload';
import { parseSpielerDuplikat, parseTeamnameDuplikat } from './logik/duplikat-fehler';
import { AnmeldungApiService } from './services/anmeldung-api.service';

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
  private api = inject(AnmeldungApiService);

  // Öffentliche Metadaten für das Template
  readonly disziplinen = DISZIPLINEN;

  // State
  loading = signal(false);
  successMsg = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  // Erst nach einem Absende-Versuch sollen formweite Pflichtfehler (z. B. keine Disziplin gewählt)
  // erscheinen – nicht schon, wenn ein Feld nur berührt/wieder abgewählt wurde.
  submitted = signal(false);

  // Anmeldeschluss-Status (aus GET /api/anmeldung/status). Default offen, bis geladen; bei
  // geschlossenem Status wird das Formular gar nicht gerendert.
  anmeldungOffen = signal(true);
  anmeldeschlussAnzeige = signal<string | null>(null);

  // Reiner UI-State: Indizes der Disziplinen, deren Detailbereich eingeklappt ist. Bewusst NICHT im
  // Formularmodell, damit der Klapp-Zustand weder das POST-DTO noch die Validierung beeinflusst.
  // Nicht enthalten = aufgeklappt (Default). Siehe #184.
  private collapsed = signal(new Set<number>());

  ngOnInit(): void {
    this.api.ladeStatus().subscribe({
      next: (status: AnmeldeschlussStatus) => {
        this.anmeldungOffen.set(status.anmeldungOffen);
        this.anmeldeschlussAnzeige.set(formatiereIsoDatum(status.anmeldeschluss));
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
    { validators: mindestensEineDisziplinValidator },
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
    const validators = meta.teamName
      ? [Validators.required, teamnameMaxLaengeValidator, teamnameMusterValidator]
      : [];
    return this.formBuilder.group({
      teamName: ['', validators],
      spieler,
    });
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  /** Signal-Brücke: hält immer den aktuellen Formularwert, damit computed() reagieren kann. */
  private _formValue = signal(this.form.getRawValue());

  /** Wie viele Disziplinen sind aktuell angehakt? */
  selectedCount = computed(() =>
    zaehleGewaehlteDisziplinen(this._formValue().disziplinen as DisziplinFormWert[]),
  );

  /** Preisaufschlüsselung je gewählter Disziplin (siehe {@link berechnePreisPosten}). */
  preisPosten = computed<PreisPosten[]>(() =>
    berechnePreisPosten(this._formValue().disziplinen as DisziplinFormWert[]),
  );

  gesamtpreis = computed(() => berechneGesamtpreis(this.preisPosten()));

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
        vorname: ['', [Validators.required, spielernameMusterValidator]],
        nachname: ['', [Validators.required, spielernameMusterValidator]],
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
      // Klapp-Zustand zurücksetzen, damit eine erneute Auswahl wieder aufgeklappt startet.
      this.setCollapsed(i, false);
    }
  }

  // ── Ein-/Ausklappen des Detailbereichs (#184) ──────────────────────────────

  /** Ist der Detailbereich der Disziplin {@link i} eingeklappt? Default (nicht enthalten) = offen. */
  isCollapsed(i: number): boolean {
    return this.collapsed().has(i);
  }

  /** Schaltet den Klapp-Zustand der Disziplin {@link i} um (per Klick/Tastatur im Template). */
  toggleCollapse(i: number): void {
    this.setCollapsed(i, !this.isCollapsed(i));
  }

  /** Setzt den Klapp-Zustand explizit; erzeugt eine neue Set-Instanz (Signal-Immutabilität). */
  private setCollapsed(i: number, collapsed: boolean): void {
    const next = new Set(this.collapsed());
    if (collapsed) {
      next.add(i);
    } else {
      next.delete(i);
    }
    this.collapsed.set(next);
  }

  /** Anzahl der Meldungen der Disziplin {@link i} (für die Zähler-Pill im zugeklappten Zustand). */
  meldungGesamt(i: number): number {
    return this.meldungenArray(i).length;
  }

  /** Trägt der Meldungs-Block der Disziplin {@link i} einen Validierungsfehler? (fürs Auto-Aufklappen). */
  disziplinHatFehler(i: number): boolean {
    return this.meldungenArray(i).invalid;
  }

  addMeldung(i: number): void {
    const meldungen = this.meldungenArray(i);
    meldungen.push(this.createMeldungGroup(i));
    this.fokussiereVornameNachRender(i, meldungen.length - 1);
  }

  /**
   * Springt nach dem Hinzufügen einer Meldung ins Vorname-Feld ihres ersten Spielers – wichtig für
   * Tastatur-Bedienung: Enter auf „+ Weitere Meldung" soll direkt in die neue Zeile führen statt
   * den Fokus auf dem Button zu belassen. `setTimeout` wartet den Render-Zyklus ab, da das Feld erst
   * nach der Change Detection im DOM existiert.
   */
  private fokussiereVornameNachRender(i: number, k: number): void {
    setTimeout(() => {
      document.getElementById(`vorname-${i}-${k}-0`)?.focus();
    });
  }

  removeMeldung(i: number, k: number): void {
    if (this.canRemoveMeldung(i)) {
      this.meldungenArray(i).removeAt(k);
    }
  }

  canRemoveMeldung(i: number): boolean {
    return this.meldungenArray(i).length > 1;
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

  teamNameZeichenFehler(i: number, k: number): boolean {
    const ctrl = this.meldungGroup(i, k).get('teamName');
    return ctrl !== null && ctrl.hasError('zeichen') && ctrl.touched;
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
  readonly heuteIso = heuteAlsIso();

  radikalAngabeInvalid(i: number, k: number, j: number): boolean {
    const group = this.spielerGroup(i, k, j);
    return group.hasError('radikalIdAngabeFehlt') && group.touched;
  }

  /** Die (optionale) 4. Zeile bei Triple Mix darf als Ersatz eingetragen werden. */
  zeigtErsatzHinweis(i: number, k: number, j: number): boolean {
    return DISZIPLINEN[i].value === 'TRIPLE_MIX' && j === 3;
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  onSubmit(): void {
    // Alte Teamname-Dubletten-Fehler (vom Server gesetzt) zurücksetzen, damit sie das erneute
    // Absenden nicht blockieren.
    this.clearTeamnameDuplikatFehler();
    this.clearSpielerDuplikatFehler();
    this.submitted.set(true);
    this.form.markAllAsTouched();
    // Eingeklappte Karten mit Fehler wieder aufklappen, damit kein Validierungsfehler verdeckt bleibt.
    this.klappeFehlerhafteKartenAuf();
    if (this.form.invalid) return;

    const body = erstelleAnmeldungRequest(this.form.getRawValue() as AnmeldungFormWert);

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMsg.set(null);

    this.api.sendeAnmeldung(body).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMsg.set('Anmeldung erfolgreich! Wir sehen uns beim Turnier.');
        this.form.reset();
        this.submitted.set(false);
        this._formValue.set(this.form.getRawValue());
        // Nach dem Absenden zum Erfolgs-Banner am Seitenanfang hochscrollen, damit die
        // Bestätigung nicht unbemerkt oberhalb des Sichtbereichs bleibt.
        this.scrollToTop();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        // Teamname-Dublette (409 mit Disziplin-Feldkennung) direkt am Feld anzeigen; sonst Banner.
        if (this.zeigeTeamnameDuplikatAmFeld(err)) return;
        if (this.zeigeSpielerDuplikatAmFeld(err)) return;
        this.errorMessage.set(`Fehler bei der Anmeldung: ${extrahiereFehlermeldung(err)}`);
      },
    });
  }

  /**
   * Scrollt sanft an den Seitenanfang, wo das Erfolgs-Banner erscheint. Läuft nur im Browser
   * (kein `window` beim serverseitigen Rendern).
   */
  private scrollToTop(): void {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Klappt jede ausgewählte, eingeklappte Disziplin mit Validierungsfehler wieder auf, damit beim
   * Absende-Versuch kein Fehler hinter einer zugeklappten Karte verborgen bleibt (#184).
   */
  private klappeFehlerhafteKartenAuf(): void {
    this.disziplinenArray.controls.forEach((_, i) => {
      if (this.isDisziplinSelected(i) && this.isCollapsed(i) && this.disziplinHatFehler(i)) {
        this.setCollapsed(i, false);
      }
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
    const duplikat = parseTeamnameDuplikat(err);
    if (duplikat === null || this.meldungenArray(duplikat.disziplinIndex).length === 0) {
      return false;
    }
    const ctrl = this.meldungGroup(duplikat.disziplinIndex, 0).get('teamName');
    if (!ctrl) return false;
    ctrl.setErrors({ duplikat: duplikat.message });
    ctrl.markAsTouched();
    return true;
  }

  /** Entfernt an allen Spieler-Namensfeldern den serverseitig gesetzten `duplikat`-Fehler. */
  private clearSpielerDuplikatFehler(): void {
    this.disziplinenArray.controls.forEach((_, i) => {
      this.meldungenArray(i).controls.forEach((_, k) => {
        for (const spieler of this.spielerArray(i, k).controls) {
          for (const feld of ['vorname', 'nachname']) {
            const ctrl = spieler.get(feld);
            if (ctrl?.hasError('duplikat')) {
              ctrl.setErrors(null);
              ctrl.updateValueAndValidity();
            }
          }
        }
      });
    });
  }

  /**
   * Wertet einen 409 mit Feldkennung `"<DISZIPLIN>:<index>"` (Einzel-Spieler-Dublette, #170) aus und setzt
   * den Fehler an Vor-/Nachname der betroffenen Meldung. Gibt true zurück, wenn feldgenau behandelt.
   */
  private zeigeSpielerDuplikatAmFeld(err: unknown): boolean {
    const duplikat = parseSpielerDuplikat(err);
    if (
      duplikat === null ||
      duplikat.meldungIndex >= this.meldungenArray(duplikat.disziplinIndex).length
    ) {
      return false;
    }
    // Einzel: genau ein Spieler je Meldung
    const spieler = this.spielerGroup(duplikat.disziplinIndex, duplikat.meldungIndex, 0);
    for (const name of ['vorname', 'nachname']) {
      const ctrl = spieler.get(name);
      ctrl?.setErrors({ duplikat: duplikat.message });
      ctrl?.markAsTouched();
    }
    return true;
  }

  /** Serverseitig gesetzte Spieler-Dublette (409) für die Anzeige unter den Namensfeldern. */
  spielerDuplikatText(i: number, k: number, j: number): string | null {
    const fehler: unknown = this.spielerGroup(i, k, j).get('vorname')?.errors?.['duplikat'];
    return typeof fehler === 'string' ? fehler : null;
  }
}
