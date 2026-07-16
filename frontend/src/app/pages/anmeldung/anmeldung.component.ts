import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DISZIPLINEN } from '../../shared/disziplin';
import { formatiereIsoDatum, heuteAlsIso } from '../../shared/datum';
import { extrahiereFehlermeldung } from '../../shared/http-fehler';
import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';
import { AnmeldeschlussStatus, PreisPosten } from './model/anmeldung.model';
import { TEAMNAME_MAX_LAENGE } from './logik/teamname';
import {
  berechneGesamtpreis,
  berechnePreisPosten,
  zaehleGewaehlteDisziplinen,
} from './logik/preisberechnung';
import { erstelleAnmeldungRequest } from './logik/anmeldung-payload';
import { parseSpielerDuplikat, parseTeamnameDuplikat } from './logik/duplikat-fehler';
import { AnmeldungApiService } from './services/anmeldung-api.service';
import { AnmeldungFormService } from './services/anmeldung-form.service';
import { KollapsZustand } from './services/kollaps-zustand';
import { PreisUebersichtComponent } from './components/preis-uebersicht/preis-uebersicht.component';

/**
 * Container der Anmeldeseite: orchestriert Formular (AnmeldungFormService), HTTP
 * (AnmeldungApiService), Klapp-UI-State (KollapsZustand) und die pure Logik aus `logik/`.
 * Viele Methoden delegieren nur an den FormService – sie bilden die öffentliche API
 * für Template und Tests.
 */
@Component({
  selector: 'app-anmeldung',
  standalone: true,
  imports: [ReactiveFormsModule, BrandIconComponent, PreisUebersichtComponent],
  providers: [AnmeldungFormService],
  templateUrl: './anmeldung.component.html',
  styleUrl: './anmeldung.component.scss',
})
export class AnmeldungComponent implements OnInit {
  private api = inject(AnmeldungApiService);
  private formService = inject(AnmeldungFormService);

  // Öffentliche Metadaten für das Template
  readonly disziplinen = DISZIPLINEN;
  readonly teamnameMaxLaenge = TEAMNAME_MAX_LAENGE;

  /** Heutiges Datum als `YYYY-MM-DD` – als `max` fürs Geburtsdatum-Feld (keine Zukunft). */
  readonly heuteIso = heuteAlsIso();

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

  /** Klapp-Zustand der Disziplin-Karten (#184). */
  private kollaps = new KollapsZustand();

  readonly form = this.formService.form;

  // ── Abgeleitete Werte ──────────────────────────────────────────────────────

  /** Wie viele Disziplinen sind aktuell angehakt? */
  selectedCount = computed(() =>
    zaehleGewaehlteDisziplinen(this.formService.formWert().disziplinen),
  );

  /** Preisaufschlüsselung je gewählter Disziplin (siehe {@link berechnePreisPosten}). */
  preisPosten = computed<PreisPosten[]>(() =>
    berechnePreisPosten(this.formService.formWert().disziplinen),
  );

  gesamtpreis = computed(() => berechneGesamtpreis(this.preisPosten()));

  constructor() {
    // Klapp-Zustand zurücksetzen, damit eine erneute Auswahl wieder aufgeklappt startet.
    this.formService.abwahl$.subscribe((i) => {
      this.kollaps.setzen(i, false);
    });
  }

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

  // ── Formular-Fassade (delegiert an AnmeldungFormService) ───────────────────

  get disziplinenArray(): FormArray {
    return this.formService.disziplinenArray;
  }

  disziplinGroup(i: number): FormGroup {
    return this.formService.disziplinGroup(i);
  }

  meldungenArray(i: number): FormArray {
    return this.formService.meldungenArray(i);
  }

  meldungGroup(i: number, k: number): FormGroup {
    return this.formService.meldungGroup(i, k);
  }

  spielerArray(i: number, k: number): FormArray {
    return this.formService.spielerArray(i, k);
  }

  spielerGroup(i: number, k: number, j: number): FormGroup {
    return this.formService.spielerGroup(i, k, j);
  }

  addMeldung(i: number): void {
    const k = this.formService.addMeldung(i);
    this.fokussiereVornameNachRender(i, k);
  }

  removeMeldung(i: number, k: number): void {
    this.formService.removeMeldung(i, k);
  }

  canRemoveMeldung(i: number): boolean {
    return this.formService.canRemoveMeldung(i);
  }

  addSpieler(i: number, k: number): void {
    this.formService.addSpieler(i, k);
  }

  removeSpieler(i: number, k: number, j: number): void {
    this.formService.removeSpieler(i, k, j);
  }

  canAddSpieler(i: number, k: number): boolean {
    return this.formService.canAddSpieler(i, k);
  }

  canRemoveSpieler(i: number, k: number): boolean {
    return this.formService.canRemoveSpieler(i, k);
  }

  toggleRadikalId(i: number, k: number, j: number): void {
    this.formService.revalidiereRadikalFelder(i, k, j);
  }

  isDisziplinSelected(i: number): boolean {
    return this.formService.istDisziplinGewaehlt(i);
  }

  needsTeamName(i: number): boolean {
    return this.formService.brauchtTeamname(i);
  }

  /** Anzahl der Meldungen der Disziplin {@link i} (für die Zähler-Pill im zugeklappten Zustand). */
  meldungGesamt(i: number): number {
    return this.formService.meldungGesamt(i);
  }

  /** Trägt der Meldungs-Block der Disziplin {@link i} einen Validierungsfehler? (fürs Auto-Aufklappen). */
  disziplinHatFehler(i: number): boolean {
    return this.formService.hatDisziplinFehler(i);
  }

  // ── Ein-/Ausklappen des Detailbereichs (#184) ──────────────────────────────

  isCollapsed(i: number): boolean {
    return this.kollaps.istEingeklappt(i);
  }

  toggleCollapse(i: number): void {
    this.kollaps.umschalten(i);
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

  // ── Fehler-Prädikate fürs Template ─────────────────────────────────────────

  teamNameInvalid(i: number, k: number): boolean {
    const ctrl = this.meldungGroup(i, k).get('teamName');
    return ctrl !== null && ctrl.invalid && ctrl.touched;
  }

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

  /** Fachliche Dubletten-Meldung vom Server (per FormService gesetzt) oder null. */
  teamNameDuplikatText(i: number, k: number): string | null {
    const fehler: unknown = this.meldungGroup(i, k).get('teamName')?.errors?.['duplikat'];
    return typeof fehler === 'string' ? fehler : null;
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

  radikalAngabeInvalid(i: number, k: number, j: number): boolean {
    const group = this.spielerGroup(i, k, j);
    return group.hasError('radikalIdAngabeFehlt') && group.touched;
  }

  /** Die (optionale) 4. Zeile bei Triple Mix darf als Ersatz eingetragen werden. */
  zeigtErsatzHinweis(i: number, k: number, j: number): boolean {
    return DISZIPLINEN[i].value === 'TRIPLE_MIX' && j === 3;
  }

  /** Serverseitig gesetzte Spieler-Dublette (409) für die Anzeige unter den Namensfeldern. */
  spielerDuplikatText(i: number, k: number, j: number): string | null {
    const fehler: unknown = this.spielerGroup(i, k, j).get('vorname')?.errors?.['duplikat'];
    return typeof fehler === 'string' ? fehler : null;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  onSubmit(): void {
    // Alte Dubletten-Fehler (vom Server gesetzt) zurücksetzen, damit sie das erneute
    // Absenden nicht blockieren.
    this.formService.entferneDuplikatFehler();
    this.submitted.set(true);
    this.form.markAllAsTouched();
    // Eingeklappte Karten mit Fehler wieder aufklappen, damit kein Validierungsfehler verdeckt bleibt.
    this.klappeFehlerhafteKartenAuf();
    if (this.form.invalid) return;

    const body = erstelleAnmeldungRequest(this.formService.rohwert());

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMsg.set(null);

    this.api.sendeAnmeldung(body).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMsg.set('Anmeldung erfolgreich! Wir sehen uns beim Turnier.');
        this.form.reset();
        this.submitted.set(false);
        // Nach dem Absenden zum Erfolgs-Banner am Seitenanfang hochscrollen, damit die
        // Bestätigung nicht unbemerkt oberhalb des Sichtbereichs bleibt.
        this.scrollToTop();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        // Dubletten (409 mit Feldkennung, ADR 0011/#170) direkt am Feld anzeigen; sonst Banner.
        const teamnameDuplikat = parseTeamnameDuplikat(err);
        if (teamnameDuplikat && this.formService.setzeTeamnameDuplikat(teamnameDuplikat)) return;
        const spielerDuplikat = parseSpielerDuplikat(err);
        if (spielerDuplikat && this.formService.setzeSpielerDuplikat(spielerDuplikat)) return;
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
        this.kollaps.setzen(i, false);
      }
    });
  }
}
