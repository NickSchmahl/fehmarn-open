import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { map, Observable, Subject } from 'rxjs';
import { DISZIPLINEN } from '../../../shared/disziplin';
import {
  geburtsdatumValidator,
  initialenMusterValidator,
  mindestensEineDisziplinValidator,
  radikalIdAngabeValidator,
  radikalIdPatternValidator,
  spielernameMusterValidator,
  teamnameMaxLaengeValidator,
  teamnameMusterValidator,
} from '../logik/anmeldung-validators';
import { SpielerDuplikat, TeamnameDuplikat } from '../logik/duplikat-fehler';
import { AnmeldungFormWert } from '../model/anmeldung.model';

/**
 * Hält das verschachtelte Anmeldeformular (Disziplinen → Meldungen → Spieler) samt Fabriken,
 * typisierten Zugriffen und Struktur-Operationen. Bewusst NICHT root-provided: Die Komponente
 * listet den Service in `providers`, sodass jede Komponenteninstanz ihr eigenes Formular bekommt
 * und Kindkomponenten dieselbe Instanz injizieren können.
 */
@Injectable()
export class AnmeldungFormService {
  private formBuilder = inject(FormBuilder);

  // Es gibt kein Kontaktfeld: Name & Radikal-ID-Angabe leben ausschliesslich in den
  // Spielerzeilen. Je gewählter Disziplin klappt ein Block mit Spielerzeilen (+ Teamname) auf.
  readonly form = this.formBuilder.group(
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

  /**
   * Signal-Brücke: hält immer den aktuellen Formular-Rohwert, damit computed() reagieren kann.
   * `reset()` und FormArray-Mutationen emittieren `valueChanges`, decken also alle Fälle ab.
   */
  readonly formWert = toSignal(this.form.valueChanges.pipe(map(() => this.rohwert())), {
    initialValue: this.rohwert(),
  });

  private abwahlSubject = new Subject<number>();
  /** Index einer Disziplin, sobald sie abgewählt wird – für UI-Belange wie den Klapp-Zustand. */
  readonly abwahl$: Observable<number> = this.abwahlSubject.asObservable();

  constructor() {
    // Beim An-/Abwählen einer Disziplin Spielerzeilen und Teamname-Pflicht dynamisch setzen.
    this.disziplinenArray.controls.forEach((ctrl, i) => {
      ctrl.get('selected')?.valueChanges.subscribe((checked) => {
        this.onDisziplinToggle(i, checked === true);
      });
    });
  }

  /** Aktueller Formular-Rohwert (inkl. disabled Controls). */
  rohwert(): AnmeldungFormWert {
    return this.form.getRawValue() as AnmeldungFormWert;
  }

  // ── Typisierte Zugriffe ────────────────────────────────────────────────────

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

  // ── Fabriken ───────────────────────────────────────────────────────────────

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

  private createSpielerGroup(): FormGroup {
    return this.formBuilder.group(
      {
        vorname: ['', [Validators.required, spielernameMusterValidator]],
        nachname: ['', [Validators.required, spielernameMusterValidator]],
        hatKeineRadikalId: [false],
        radikalId: ['', [radikalIdPatternValidator]],
        initialen: ['', [initialenMusterValidator]],
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
      this.abwahlSubject.next(i);
    }
  }

  // ── Struktur-Operationen ───────────────────────────────────────────────────

  /** Hängt eine weitere Meldung an und liefert deren Index (z. B. für den Eingabefokus). */
  addMeldung(i: number): number {
    const meldungen = this.meldungenArray(i);
    meldungen.push(this.createMeldungGroup(i));
    return meldungen.length - 1;
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

  canAddSpieler(i: number, k: number): boolean {
    return this.spielerArray(i, k).length < DISZIPLINEN[i].maxSpieler;
  }

  removeSpieler(i: number, k: number, j: number): void {
    if (this.canRemoveSpieler(i, k)) {
      this.spielerArray(i, k).removeAt(j);
    }
  }

  canRemoveSpieler(i: number, k: number): boolean {
    return this.spielerArray(i, k).length > DISZIPLINEN[i].minSpieler;
  }

  /**
   * Umschalter „Ich habe noch keine Radikal ID": Die Eingaben bleiben erhalten, damit man den
   * Umschalter ausprobieren kann, ohne bereits Getipptes zu verlieren. Nicht relevante Felder
   * werden erst beim Absenden ausgeblendet (siehe `toSpielerPayload`); hier werden nur die nun
   * ein-/ausgeblendeten Felder neu bewertet, damit veraltete Feldfehler verschwinden.
   */
  revalidiereRadikalFelder(i: number, k: number, j: number): void {
    const group = this.spielerGroup(i, k, j);
    group.get('radikalId')?.updateValueAndValidity();
    group.get('initialen')?.updateValueAndValidity();
    group.get('geburtsdatum')?.updateValueAndValidity();
  }

  // ── Abfragen ───────────────────────────────────────────────────────────────

  istDisziplinGewaehlt(i: number): boolean {
    return this.disziplinGroup(i).get('selected')?.value === true;
  }

  brauchtTeamname(i: number): boolean {
    return DISZIPLINEN[i].teamName && this.istDisziplinGewaehlt(i);
  }

  /** Anzahl der Meldungen der Disziplin {@link i} (für die Zähler-Pill im zugeklappten Zustand). */
  meldungGesamt(i: number): number {
    return this.meldungenArray(i).length;
  }

  /** Trägt der Meldungs-Block der Disziplin {@link i} einen Validierungsfehler? (fürs Auto-Aufklappen). */
  hatDisziplinFehler(i: number): boolean {
    return this.meldungenArray(i).invalid;
  }

  // ── Serverseitige Duplikat-Fehler (ADR 0011, #170) ─────────────────────────

  /** Entfernt an allen Teamname- und Spieler-Namensfeldern den serverseitig gesetzten `duplikat`-Fehler. */
  entferneDuplikatFehler(): void {
    this.disziplinenArray.controls.forEach((_, i) => {
      this.meldungenArray(i).controls.forEach((meldung, k) => {
        const teamName = meldung.get('teamName');
        if (teamName?.hasError('duplikat')) {
          teamName.setErrors(null);
          teamName.updateValueAndValidity();
        }
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
   * Setzt eine Teamname-Dublette am Teamname-Control der ersten Meldung der Disziplin.
   * Gibt true zurück, wenn der Fehler feldgenau gesetzt werden konnte.
   */
  setzeTeamnameDuplikat(duplikat: TeamnameDuplikat): boolean {
    if (this.meldungenArray(duplikat.disziplinIndex).length === 0) return false;
    const ctrl = this.meldungGroup(duplikat.disziplinIndex, 0).get('teamName');
    if (!ctrl) return false;
    ctrl.setErrors({ duplikat: duplikat.message });
    ctrl.markAsTouched();
    return true;
  }

  /**
   * Setzt eine Spieler-Dublette an Vor-/Nachname der betroffenen Meldung (Einzel: genau ein
   * Spieler je Meldung). Gibt true zurück, wenn der Fehler feldgenau gesetzt werden konnte.
   */
  setzeSpielerDuplikat(duplikat: SpielerDuplikat): boolean {
    if (duplikat.meldungIndex >= this.meldungenArray(duplikat.disziplinIndex).length) return false;
    const spieler = this.spielerGroup(duplikat.disziplinIndex, duplikat.meldungIndex, 0);
    for (const name of ['vorname', 'nachname']) {
      const ctrl = spieler.get(name);
      ctrl?.setErrors({ duplikat: duplikat.message });
      ctrl?.markAsTouched();
    }
    return true;
  }
}
