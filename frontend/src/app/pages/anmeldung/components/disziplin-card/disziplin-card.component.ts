import { ChangeDetectorRef, Component, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DisziplinMeta } from '../../../../shared/disziplin';
import { AnmeldungFormService } from '../../services/anmeldung-form.service';
import { MeldungCardComponent } from '../meldung-card/meldung-card.component';

/**
 * Eine Disziplin-Kachel: Auswahl-Checkbox, Titelzeile (bei Auswahl als Klapp-Button, #184)
 * und der Meldungen-Block. Der Klapp-Zustand selbst bleibt beim Container (KollapsZustand);
 * die Kachel meldet Klicks nur über `klappUmschalten`. Feature-smart: injiziert den
 * komponenten-provideten AnmeldungFormService.
 */
@Component({
  selector: 'app-disziplin-card',
  standalone: true,
  imports: [ReactiveFormsModule, MeldungCardComponent],
  templateUrl: './disziplin-card.component.html',
  styleUrl: './disziplin-card.component.scss',
})
export class DisziplinCardComponent {
  private formService = inject(AnmeldungFormService);

  meta = input.required<DisziplinMeta>();
  index = input.required<number>();
  eingeklappt = input.required<boolean>();

  klappUmschalten = output();

  constructor() {
    // Formularzustands-Änderungen (Auswahl, Meldungen, Fehler) markieren diese View als dirty –
    // die durchgereichten Instanzen im Input ändern sich nie.
    const cdr = inject(ChangeDetectorRef);
    this.formService.form.events.pipe(takeUntilDestroyed()).subscribe(() => {
      cdr.markForCheck();
    });
  }

  get disziplinGroup(): FormGroup {
    return this.formService.disziplinGroup(this.index());
  }

  istGewaehlt(): boolean {
    return this.formService.istDisziplinGewaehlt(this.index());
  }

  /** Anzahl der Meldungen (für die Zähler-Pill im zugeklappten Zustand). */
  meldungGesamt(): number {
    return this.formService.meldungGesamt(this.index());
  }

  get meldungControls(): AbstractControl[] {
    return this.formService.meldungenArray(this.index()).controls;
  }

  meldungGruppe(k: number): FormGroup {
    return this.formService.meldungGroup(this.index(), k);
  }

  addMeldung(): void {
    const k = this.formService.addMeldung(this.index());
    this.fokussiereVornameNachRender(k);
  }

  /**
   * Springt nach dem Hinzufügen einer Meldung ins Vorname-Feld ihres ersten Spielers – wichtig für
   * Tastatur-Bedienung: Enter auf „+ Weitere Meldung" soll direkt in die neue Zeile führen statt
   * den Fokus auf dem Button zu belassen. `setTimeout` wartet den Render-Zyklus ab, da das Feld erst
   * nach der Change Detection im DOM existiert.
   */
  private fokussiereVornameNachRender(k: number): void {
    setTimeout(() => {
      document.getElementById(`vorname-${this.index()}-${k}-0`)?.focus();
    });
  }
}
