import { ChangeDetectorRef, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DisziplinMeta } from '../../../../shared/disziplin';
import { TEAMNAME_MAX_LAENGE } from '../../logik/teamname';
import { AnmeldungFormService } from '../../services/anmeldung-form.service';
import { SpielerZeileComponent } from '../spieler-zeile/spieler-zeile.component';

/**
 * Eine Meldung: (bei Team-Disziplinen) Teamname-Feld + Spielerzeilen + „+ Spieler hinzufügen".
 * Bewusst feature-smart: injiziert den komponenten-provideten AnmeldungFormService für
 * Struktur-Operationen, statt 8+ Outputs durch die Hierarchie zu ketten.
 */
@Component({
  selector: 'app-meldung-card',
  standalone: true,
  imports: [ReactiveFormsModule, SpielerZeileComponent],
  templateUrl: './meldung-card.component.html',
  styleUrl: './meldung-card.component.scss',
})
export class MeldungCardComponent {
  private formService = inject(AnmeldungFormService);

  meldungGroup = input.required<FormGroup>();
  i = input.required<number>();
  k = input.required<number>();
  meta = input.required<DisziplinMeta>();

  readonly teamnameMaxLaenge = TEAMNAME_MAX_LAENGE;

  constructor() {
    // Die FormGroup-Instanz im Input ändert sich nie – Formularzustands-Änderungen (auch von
    // Geschwister-Meldungen, z. B. für „Meldung entfernen"-Sichtbarkeit) müssen diese View
    // explizit als dirty markieren.
    const cdr = inject(ChangeDetectorRef);
    this.formService.form.events.pipe(takeUntilDestroyed()).subscribe(() => {
      cdr.markForCheck();
    });
  }

  get spielerControls(): AbstractControl[] {
    return this.formService.spielerArray(this.i(), this.k()).controls;
  }

  spielerGruppe(j: number): FormGroup {
    return this.formService.spielerGroup(this.i(), this.k(), j);
  }

  brauchtTeamname(): boolean {
    return this.formService.brauchtTeamname(this.i());
  }

  canRemoveMeldung(): boolean {
    return this.formService.canRemoveMeldung(this.i());
  }

  removeMeldung(): void {
    this.formService.removeMeldung(this.i(), this.k());
  }

  canRemoveSpieler(): boolean {
    return this.formService.canRemoveSpieler(this.i(), this.k());
  }

  removeSpieler(j: number): void {
    this.formService.removeSpieler(this.i(), this.k(), j);
  }

  canAddSpieler(): boolean {
    return this.formService.canAddSpieler(this.i(), this.k());
  }

  addSpieler(): void {
    this.formService.addSpieler(this.i(), this.k());
  }

  toggleRadikalId(j: number): void {
    this.formService.revalidiereRadikalFelder(this.i(), this.k(), j);
  }

  /** Die (optionale) 4. Zeile bei Triple Mix darf als Ersatz eingetragen werden. */
  istErsatzZeile(j: number): boolean {
    return this.meta().value === 'TRIPLE_MIX' && j === 3;
  }

  // ── Teamname-Fehlerprädikate ───────────────────────────────────────────────

  teamNameInvalid(): boolean {
    const ctrl = this.meldungGroup().get('teamName');
    return ctrl !== null && ctrl.invalid && ctrl.touched;
  }

  teamNameRequiredFehler(): boolean {
    const ctrl = this.meldungGroup().get('teamName');
    return ctrl !== null && ctrl.hasError('required') && ctrl.touched;
  }

  teamNameLaengeFehler(): boolean {
    const ctrl = this.meldungGroup().get('teamName');
    return ctrl !== null && ctrl.hasError('maxlaenge') && ctrl.touched;
  }

  teamNameZeichenFehler(): boolean {
    const ctrl = this.meldungGroup().get('teamName');
    return ctrl !== null && ctrl.hasError('zeichen') && ctrl.touched;
  }

  /** Fachliche Dubletten-Meldung vom Server (per FormService gesetzt) oder null. */
  teamNameDuplikatText(): string | null {
    const fehler: unknown = this.meldungGroup().get('teamName')?.errors?.['duplikat'];
    return typeof fehler === 'string' ? fehler : null;
  }
}
