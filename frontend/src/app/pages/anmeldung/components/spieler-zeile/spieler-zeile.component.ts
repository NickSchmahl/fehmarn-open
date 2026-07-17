import { ChangeDetectorRef, Component, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';
import { heuteAlsIso } from '../../../../shared/datum';

/**
 * Präsentationskomponente: eine Spielerzeile (Vor-/Nachname + Radikal-ID-Angabe bzw.
 * Initialen/Geburtsdatum). Bekommt ihre FormGroup als Instanz durchgereicht und bindet sie
 * per `[formGroup]` – kein `formGroupName`-Pfad über Komponentengrenzen.
 *
 * Die Indizes i/k/j dienen nur den stabilen id-/aria-Schemata (`vorname-{i}-{k}-{j}`),
 * auf die Fokus-Steuerung und Tests sich verlassen.
 */
@Component({
  selector: 'app-spieler-zeile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './spieler-zeile.component.html',
  styleUrl: './spieler-zeile.component.scss',
})
export class SpielerZeileComponent {
  spielerGroup = input.required<FormGroup>();
  i = input.required<number>();
  k = input.required<number>();
  j = input.required<number>();
  /** true → „Spieler N“-Beschriftung (Team-Disziplin), sonst „Meldung K“. */
  zeigeSpielerNr = input.required<boolean>();
  kannEntfernen = input.required<boolean>();
  /** „Meldung entfernen“ in der Kopfzeile (nur Einzel-Disziplinen, erste Zeile). */
  kannMeldungEntfernen = input.required<boolean>();
  /** Die (optionale) 4. Zeile bei Triple Mix darf als Ersatz eingetragen werden. */
  istErsatzZeile = input.required<boolean>();

  entfernen = output();
  meldungEntfernen = output();
  radikalIdUmgeschaltet = output();

  /** Heutiges Datum als `YYYY-MM-DD` – als `max` fürs Geburtsdatum-Feld (keine Zukunft). */
  readonly heuteIso = heuteAlsIso();

  constructor() {
    // Die FormGroup-Instanz im Input ändert sich nie – Zustandsänderungen (Wert, Status,
    // touched) würden diese View daher nicht als dirty markieren. Ohne diese Brücke blieben
    // z. B. die per markAllAsTouched() beim Absenden ausgelösten Feldfehler unsichtbar.
    const cdr = inject(ChangeDetectorRef);
    toObservable(this.spielerGroup)
      .pipe(
        switchMap((group) => group.events),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        cdr.markForCheck();
      });
  }

  hatKeineRadikalId(): boolean {
    return this.spielerGroup().get('hatKeineRadikalId')?.value === true;
  }

  feldInvalid(feld: string): boolean {
    const ctrl = this.spielerGroup().get(feld);
    return ctrl !== null && ctrl.invalid && ctrl.touched;
  }

  /** Prüft, ob ein Feld einen bestimmten (angefassten) Fehler trägt – für gezielte Meldungen. */
  feldHatFehler(feld: string, fehler: string): boolean {
    const ctrl = this.spielerGroup().get(feld);
    return ctrl !== null && ctrl.touched && ctrl.hasError(fehler);
  }

  radikalAngabeInvalid(): boolean {
    const group = this.spielerGroup();
    return group.hasError('radikalIdAngabeFehlt') && group.touched;
  }

  /** Serverseitig gesetzte Spieler-Dublette (409) für die Anzeige unter den Namensfeldern. */
  spielerDuplikatText(): string | null {
    const fehler: unknown = this.spielerGroup().get('vorname')?.errors?.['duplikat'];
    return typeof fehler === 'string' ? fehler : null;
  }
}
