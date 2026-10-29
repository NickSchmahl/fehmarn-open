import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AdminUebersicht } from '../../shared/admin-uebersicht';
import { Disziplin } from '../../shared/disziplin';
import { FLYER_ZEITPLAN } from '../../shared/flyer-zeitplan';
import { formatiereZeitstempel } from '../../shared/datum';
import { ToastService } from '../../core/services/toast.service';
import { DateiDownloadService } from '../../core/services/datei-download.service';
import { ExportKarteComponent } from './export-karte/export-karte.component';
import { RadikalDruckComponent } from './radikal-druck/radikal-druck.component';
import { TurniertagDruckComponent } from './turniertag-druck/turniertag-druck.component';
import { bereiteExportAuf, ExportDisziplin } from './logik/export-daten';
import { berechneKennzahlen, ExportKennzahlen } from './logik/kennzahlen';
import { RadikalZeile, radikalZeilen } from './logik/radikal-zeilen';
import { radikalCsvDateiname, zuRadikalCsv } from './logik/radikal-csv';
import { baueTurniertagListe, TurniertagDisziplin } from './logik/turniertag-blaetter';

/** Anzahl Datenzeilen in der CSV-Vorschau auf der Karte. */
const CSV_VORSCHAU_ZEILEN = 3;

/** Welche Druckansicht gerade gedruckt wird. */
export type DruckArt = 'turniertag' | 'radikal';

/** Ausschnitt aus GET /api/anmeldung/status: Limit des Teamwettbewerbs für „8 / 96". */
interface TeamlimitStatus {
  maxTeams: number;
}

/** Disziplin-Chip der Turniertag-Karte: Kurztag (Fr/Sa/So), Name, Anzahl Meldungen. */
export interface DisziplinChip {
  disziplin: Disziplin;
  tag: string;
  label: string;
  anzahl: number;
}

const ALLE_DISZIPLINEN: ReadonlySet<Disziplin> = new Set(
  FLYER_ZEITPLAN.map((eintrag) => eintrag.disziplin),
);

/** Zustand einer Checkbox aus ihrem change-Event. */
function istAngehakt(event: Event): boolean {
  return event.target instanceof HTMLInputElement && event.target.checked;
}

/**
 * Admin-Seite `/admin/export` (#305/#306): lädt einmal die Admin-Übersicht und reicht den Stand an
 * die Exporte weiter. Alle Exporte entstehen im Browser – kein eigener Backend-Endpunkt.
 */
@Component({
  selector: 'app-export',
  standalone: true,
  imports: [ExportKarteComponent, RadikalDruckComponent, TurniertagDruckComponent],
  templateUrl: './export.html',
  styleUrl: './export.scss',
})
export class Export implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly download = inject(DateiDownloadService);
  private readonly injector = inject(Injector);
  private readonly fenster = inject(DOCUMENT).defaultView;

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly uebersicht = signal<AdminUebersicht | null>(null);
  /**
   * Zuletzt gedruckte Ansicht. Sie bleibt danach (unsichtbar) im DOM: Auf Mobilgeräten kehrt
   * window.print() sofort zurück und `afterprint` kann vor dem Druck-Snapshot feuern – ein Abbau
   * dort ergäbe ein leeres PDF. Erneutes Strg+P druckt so die zuletzt gewählte Liste.
   */
  readonly druckAuftrag = signal<DruckArt | null>(null);
  /** Turniertag-Liste: gewählte Disziplinen (Standard: alle) und Optionen. */
  readonly turniertagAuswahl = signal<ReadonlySet<Disziplin>>(ALLE_DISZIPLINEN);
  readonly anwesenheitVorankreuzen = signal(true);
  readonly radikalIdAusblenden = signal(false);
  /** Limit des Teamwettbewerbs; null, solange unbekannt (dann ohne „/ 96"). */
  readonly maxTeams = signal<number | null>(null);
  /** Zeitpunkt, zu dem die angezeigten Daten geladen wurden („Stand" auf allen Exporten). */
  readonly stand = signal<Date | null>(null);

  readonly disziplinen = computed<readonly ExportDisziplin[]>(() => {
    const daten = this.uebersicht();
    return daten ? bereiteExportAuf(daten) : [];
  });

  readonly kennzahlen = computed<ExportKennzahlen | null>(() => {
    const daten = this.uebersicht();
    return daten ? berechneKennzahlen(daten, this.disziplinen()) : null;
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

  /** Chips chronologisch wie der Turnierablauf (Fr → Sa → So). */
  readonly disziplinChips = computed<readonly DisziplinChip[]>(() =>
    FLYER_ZEITPLAN.map((zeitplan) => {
      const daten = this.disziplinen().find((d) => d.disziplin === zeitplan.disziplin);
      return {
        disziplin: zeitplan.disziplin,
        tag: zeitplan.tag.split(' ')[0] ?? '',
        label: daten?.label ?? zeitplan.disziplin,
        anzahl: daten?.meldungen.length ?? 0,
      };
    }),
  );

  readonly alleGewaehlt = computed(() => this.turniertagAuswahl().size === ALLE_DISZIPLINEN.size);

  readonly turniertagListe = computed<readonly TurniertagDisziplin[]>(() =>
    baueTurniertagListe(this.disziplinen(), this.turniertagAuswahl(), this.maxTeams()),
  );

  readonly turniertagBlaetter = computed(() =>
    this.turniertagListe().reduce((summe, disziplin) => summe + disziplin.blaetter.length, 0),
  );

  readonly standText = computed(() => {
    const zeitpunkt = this.stand();
    return zeitpunkt ? formatiereZeitstempel(zeitpunkt) : '';
  });

  ngOnInit(): void {
    this.laden();
    this.ladeTeamlimit();
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

  /** Teamlimit nur für die Anzeige „8 / 96" – fehlt es, druckt die Liste ohne Limit. */
  private ladeTeamlimit(): void {
    this.http.get<TeamlimitStatus>('/api/anmeldung/status').subscribe({
      next: (status) => {
        this.maxTeams.set(status.maxTeams);
      },
      error: () => {
        this.maxTeams.set(null);
      },
    });
  }

  /** „Alle" schaltet zwischen allen und keiner Disziplin um. */
  alleUmschalten(): void {
    this.turniertagAuswahl.set(this.alleGewaehlt() ? new Set() : ALLE_DISZIPLINEN);
  }

  disziplinUmschalten(disziplin: Disziplin): void {
    const neu = new Set(this.turniertagAuswahl());
    if (neu.has(disziplin)) {
      neu.delete(disziplin);
    } else {
      neu.add(disziplin);
    }
    this.turniertagAuswahl.set(neu);
  }

  istGewaehlt(disziplin: Disziplin): boolean {
    return this.turniertagAuswahl().has(disziplin);
  }

  setzeAnwesenheitVorankreuzen(event: Event): void {
    this.anwesenheitVorankreuzen.set(istAngehakt(event));
  }

  setzeRadikalIdAusblenden(event: Event): void {
    this.radikalIdAusblenden.set(istAngehakt(event));
  }

  /**
   * Rendert die gewünschte Druckansicht und öffnet danach den Druckdialog des Browsers
   * („Als PDF speichern"). Auf dem Bildschirm bleibt die Druckansicht unsichtbar.
   */
  drucken(art: DruckArt): void {
    this.druckAuftrag.set(art);
    afterNextRender(
      {
        read: () => {
          this.fenster?.print();
        },
      },
      { injector: this.injector },
    );
  }
}
