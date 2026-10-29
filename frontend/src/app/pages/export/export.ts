import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminUebersicht } from '../../shared/admin-uebersicht';
import { formatiereZeitstempel } from '../../shared/datum';
import { ToastService } from '../../core/services/toast.service';
import { DateiDownloadService } from '../../core/services/datei-download.service';
import { ExportKarteComponent } from './export-karte/export-karte.component';
import { bereiteExportAuf, ExportDisziplin } from './logik/export-daten';
import { berechneKennzahlen, ExportKennzahlen } from './logik/kennzahlen';
import { RadikalZeile, radikalZeilen } from './logik/radikal-zeilen';
import { radikalCsvDateiname, zuRadikalCsv } from './logik/radikal-csv';

/** Anzahl Datenzeilen in der CSV-Vorschau auf der Karte. */
const CSV_VORSCHAU_ZEILEN = 3;

/**
 * Admin-Seite `/admin/export` (#305/#306): lädt einmal die Admin-Übersicht und reicht den Stand an
 * die Exporte weiter. Alle Exporte entstehen im Browser – kein eigener Backend-Endpunkt.
 */
@Component({
  selector: 'app-export',
  standalone: true,
  imports: [ExportKarteComponent],
  templateUrl: './export.html',
  styleUrl: './export.scss',
})
export class Export implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly download = inject(DateiDownloadService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly uebersicht = signal<AdminUebersicht | null>(null);
  /** Zeitpunkt, zu dem die angezeigten Daten geladen wurden („Stand" auf allen Exporten). */
  readonly stand = signal<Date | null>(null);

  readonly disziplinen = computed<readonly ExportDisziplin[]>(() => {
    const daten = this.uebersicht();
    return daten ? bereiteExportAuf(daten) : [];
  });

  readonly kennzahlen = computed<ExportKennzahlen | null>(() => {
    const daten = this.uebersicht();
    return daten ? berechneKennzahlen(daten) : null;
  });

  /** Eine Zeile je Spieler und Disziplin – Grundlage für CSV und Radikal-Meldeliste. */
  readonly radikalZeilen = computed<readonly RadikalZeile[]>(() =>
    radikalZeilen(this.disziplinen()),
  );

  /** Kopfzeile + erste Datenzeilen der CSV, ohne BOM, für die Vorschau auf der Karte. */
  readonly csvVorschau = computed<readonly string[]>(() =>
    zuRadikalCsv(this.radikalZeilen().slice(0, CSV_VORSCHAU_ZEILEN))
      .replace(/^\uFEFF/, '')
      .trimEnd()
      .split('\r\n'),
  );

  readonly standText = computed(() => {
    const zeitpunkt = this.stand();
    return zeitpunkt ? formatiereZeitstempel(zeitpunkt) : '';
  });

  ngOnInit(): void {
    this.laden();
  }

  /** Lädt den aktuellen Stand. Schlägt ein Aktualisieren fehl, bleibt der alte Stand sichtbar. */
  laden(): void {
    this.loading.set(true);
    this.error.set(false);
    this.http.get<AdminUebersicht>('/api/admin/teilnehmer').subscribe({
      next: (daten) => {
        this.uebersicht.set(daten);
        this.stand.set(new Date());
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        if (this.uebersicht()) {
          this.toast.show(
            `Aktualisieren fehlgeschlagen – es gilt weiter der Stand ${this.standText()}.`,
          );
        } else {
          this.error.set(true);
        }
      },
    });
  }

  csvHerunterladen(): void {
    const stand = this.stand();
    if (!stand) {
      return;
    }
    this.download.herunterladen(
      zuRadikalCsv(this.radikalZeilen()),
      radikalCsvDateiname(stand),
      'text/csv;charset=utf-8',
    );
  }
}
