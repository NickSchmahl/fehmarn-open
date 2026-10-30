import { Component, computed, input } from '@angular/core';
import { formatiereZeitstempel } from '../../../shared/datum';
import { FLYER_TURNIER } from '../../../shared/flyer-zeitplan';
import { BrandIconComponent } from '../../../ui/brand-icon/brand-icon.component';
import { ExportMeldung } from '../logik/export-daten';
import { startgeld, teamZeilenAnzahl, TurniertagDisziplin } from '../logik/turniertag-blaetter';

const EURO = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

/** Betrag in Euro mit Tausenderpunkt: 2800 → „2.800 €". */
export function euro(betrag: number): string {
  return `${EURO.format(betrag)} €`;
}

/**
 * Druckansicht „Turniertag-Liste" (#307): je Disziplin eigene A4-Blätter mit Kästchen für
 * Anwesend und Bezahlt. Die Aufteilung auf Blätter kommt fertig aus `baueTurniertagListe`, die
 * Komponente rendert nur.
 */
@Component({
  selector: 'app-turniertag-druck',
  standalone: true,
  imports: [BrandIconComponent],
  templateUrl: './turniertag-druck.component.html',
  styleUrl: './turniertag-druck.component.scss',
})
export class TurniertagDruckComponent {
  readonly disziplinen = input.required<readonly TurniertagDisziplin[]>();
  readonly stand = input.required<Date>();
  /** Digital erfasste Anwesenheit beim Druck schon ankreuzen. */
  readonly anwesenheitVorankreuzen = input(true);
  /**
   * Aushang-Variante zum Aufhängen: ohne Radikal-ID (enthält das Geburtsdatum), ohne Kästchen,
   * ohne Startgeld/Soll Kasse und ohne Unterschriften – nur wer in welcher Disziplin gemeldet ist.
   */
  readonly aushang = input(false);

  readonly turnier = `${FLYER_TURNIER.titel} ${FLYER_TURNIER.jahr}`;
  readonly unterzeile = FLYER_TURNIER.termin;
  readonly standText = computed(() => formatiereZeitstempel(this.stand()));
  readonly euro = euro;

  preis(disziplin: TurniertagDisziplin): string {
    return disziplin.preisProSpieler > 0
      ? `${euro(disziplin.preisProSpieler)} / Spieler`
      : 'Startgeld frei';
  }

  startgeld(meldung: ExportMeldung, disziplin: TurniertagDisziplin): string {
    return disziplin.preisProSpieler > 0
      ? euro(startgeld(meldung, disziplin.preisProSpieler))
      : 'frei';
  }

  rechenweg(meldung: ExportMeldung, disziplin: TurniertagDisziplin): string {
    return disziplin.preisProSpieler > 0
      ? `${meldung.spieler.length} × ${disziplin.preisProSpieler}`
      : '';
  }

  zweizeilig(meldung: ExportMeldung): boolean {
    return teamZeilenAnzahl(meldung) > 1;
  }

  angekreuzt(meldung: ExportMeldung | null): boolean {
    return this.anwesenheitVorankreuzen() && !this.aushang() && !!meldung?.anwesend;
  }
}
