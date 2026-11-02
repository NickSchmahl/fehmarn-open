import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Disziplin, disziplinLabel } from '@shared/disziplin';
import { formatiereIsoDatum } from '@shared/datum';
import {
  baueFilterChips,
  DisziplinFilter,
  FilterChip,
  passtZumFilter,
} from '@shared/disziplin-filter';
import { AdminGruppe, AdminMeldungEintrag, AdminSpielerEintrag } from '@shared/admin-uebersicht';
import { AdminTeilnehmerApiService } from '@core/api/admin-teilnehmer-api.service';
import { AnmeldungStatusApiService } from '@core/api/anmeldung-status-api.service';
import { MeldungAktionenComponent } from '@ui/meldung-aktionen/meldung-aktionen.component';
import { BrandIconComponent } from '@ui/brand-icon/brand-icon.component';
import { DisziplinFilterComponent } from '@ui/disziplin-filter/disziplin-filter.component';

export interface AdminAnzeigeGruppe {
  disziplin: Disziplin;
  label: string;
  anzahl: number;
  meldungen: readonly AdminMeldungEintrag[];
}

/** Fehler einer Zeilen-Aktion (z. B. 409 beim Reaktivieren wegen Teamname-Dublette). */
export interface AktionsFehler {
  meldungId: number;
  text: string;
}

/**
 * Prüft, ob eine Meldung zum (bereits normalisierten) Suchbegriff passt: Treffer im Teamnamen
 * oder im Namen eines beliebigen Spielers. Leerer Suchbegriff passt immer.
 */
export function meldungPasstZurSuche(meldung: AdminMeldungEintrag, suche: string): boolean {
  if (suche === '') {
    return true;
  }
  if (meldung.teamName?.toLowerCase().includes(suche)) {
    return true;
  }
  return meldung.spieler.some((spieler) =>
    `${spieler.vorname} ${spieler.nachname}`.toLowerCase().includes(suche),
  );
}

/**
 * Sortiert abgemeldete Meldungen stabil ans Ende; aktive behalten ihre bisherige Reihenfolge.
 * Nimmt eine `readonly`-Liste und arbeitet auf einer Kopie, damit Signal-Arrays nie in-place
 * verändert werden (siehe ADR 0014).
 */
export function sortiereAbgemeldeteAnsEnde(
  meldungen: readonly AdminMeldungEintrag[],
): AdminMeldungEintrag[] {
  return [...meldungen].sort((a, b) => Number(a.abgemeldet) - Number(b.abgemeldet));
}

/**
 * Teilnehmerverwaltung `/admin/teilnehmer` (#317, hinter dem authGuard): alle Meldungen mit
 * Radikal-ID bzw. Anlage-Grundlage, Suche, Anwesenheit, Abmelden/Reaktivieren.
 */
@Component({
  selector: 'app-admin-teilnehmer',
  imports: [MeldungAktionenComponent, BrandIconComponent, DisziplinFilterComponent],
  templateUrl: './admin-teilnehmer.html',
  styleUrl: './admin-teilnehmer.scss',
})
export class AdminTeilnehmer implements OnInit {
  private readonly api = inject(AdminTeilnehmerApiService);
  private readonly statusApi = inject(AnmeldungStatusApiService);

  readonly loading = signal(false);
  readonly error = signal(false);
  // Fehler einer Admin-Aktion, zeilenbezogen: welche Meldung + fachlicher Text.
  readonly aktionsFehler = signal<AktionsFehler | null>(null);
  readonly aktiveDisziplin = signal<DisziplinFilter>('ALLE');
  readonly gruppen = signal<readonly AdminGruppe[]>([]);
  readonly suchbegriff = signal('');

  /** Filter-Chips: "Alle" + jede vorhandene Disziplin mit Anzahl (aktive Meldungen). */
  readonly chips = computed<readonly FilterChip[]>(() => baueFilterChips(this.gruppen()));

  /** Gefiltert nach Disziplin + Suchbegriff (Team- oder Spielername). */
  readonly sichtbareGruppen = computed<readonly AdminAnzeigeGruppe[]>(() => {
    const aktiv = this.aktiveDisziplin();
    const suche = this.suchbegriff().trim().toLowerCase();

    return this.gruppen()
      .filter((gruppe) => passtZumFilter(gruppe.disziplin, aktiv))
      .map((gruppe) => ({
        disziplin: gruppe.disziplin,
        label: disziplinLabel(gruppe.disziplin),
        anzahl: gruppe.anzahl,
        meldungen: sortiereAbgemeldeteAnsEnde(
          gruppe.meldungen.filter((meldung) => meldungPasstZurSuche(meldung, suche)),
        ),
      }))
      .filter((gruppe) => gruppe.meldungen.length > 0);
  });

  ngOnInit(): void {
    this.laden();
  }

  setFilter(value: DisziplinFilter): void {
    this.aktiveDisziplin.set(value);
  }

  setSuche(value: string): void {
    this.suchbegriff.set(value);
  }

  /** Fehlertext für genau diese Meldung – oder null, wenn der Fehler eine andere/keine Zeile betrifft. */
  fehlerFuer(meldungId: number): string | null {
    const fehler = this.aktionsFehler();
    return fehler?.meldungId === meldungId ? fehler.text : null;
  }

  /** Anlage-Grundlage für Spieler ohne Radikal ID: "Initialen, dd.MM.yyyy". */
  anlageGrundlage(spieler: AdminSpielerEintrag): string {
    const datum = formatiereIsoDatum(spieler.geburtsdatum);
    return [spieler.initialen, datum].filter((teil) => teil).join(', ');
  }

  // ── Aktionen: jeweils pro Meldung (eine Anmeldung-id) ──

  abmelden(id: number): void {
    this.aktionBeginnen();
    this.api.abmelden(id).subscribe({
      next: () => {
        this.laden();
      },
    });
  }

  /**
   * Reaktiviert eine Meldung. Beim Teamwettbewerb darf der Admin das 96er-Limit überziehen,
   * bekommt vorher aber eine Warnung – dafür wird der aktuelle Ausgebucht-Status geholt.
   */
  reaktivieren(id: number): void {
    this.aktionBeginnen();
    if (this.disziplinVon(id) !== 'TEAMWETTBEWERB') {
      this.sendeReaktivierung(id);
      return;
    }
    this.statusApi.ladeStatus().subscribe({
      next: (status) => {
        if (status.teamwettbewerbAusgebucht && !this.bestaetigeUeberziehen(status.maxTeams)) {
          return;
        }
        this.sendeReaktivierung(id);
      },
      // Status nicht erreichbar: die Reaktivierung nicht blockieren – sie ist ohnehin erlaubt.
      error: () => {
        this.sendeReaktivierung(id);
      },
    });
  }

  toggleAnwesenheit(id: number, anwesend: boolean): void {
    this.aktionBeginnen();
    this.api.setzeAnwesenheit(id, anwesend).subscribe({
      next: () => {
        this.laden();
      },
    });
  }

  /** Start einer Aktion: einen evtl. sichtbaren Zeilen-Fehler wegräumen. */
  private aktionBeginnen(): void {
    this.aktionsFehler.set(null);
  }

  /** Disziplin einer Meldung aus der geladenen Übersicht, oder null. */
  private disziplinVon(meldungId: number): Disziplin | null {
    for (const gruppe of this.gruppen()) {
      if (gruppe.meldungen.some((meldung) => meldung.id === meldungId)) {
        return gruppe.disziplin;
      }
    }
    return null;
  }

  private bestaetigeUeberziehen(maxTeams: number): boolean {
    return window.confirm(
      `Der Teamwettbewerb ist mit ${String(maxTeams)} Teams voll. Beim Reaktivieren wird das ` +
        `Limit überschritten. Trotzdem reaktivieren?`,
    );
  }

  private sendeReaktivierung(id: number): void {
    this.api.reaktivieren(id).subscribe({
      next: () => {
        this.laden();
      },
      // Reaktivieren kann an einer Teamname-Dublette scheitern (409) – Fehler an der Zeile zeigen.
      error: (err: unknown) => {
        this.aktionsFehler.set({ meldungId: id, text: this.fehlerMeldung(err) });
      },
    });
  }

  private fehlerMeldung(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const message = (err.error as { message?: unknown } | null)?.message;
      if (typeof message === 'string') return message;
    }
    return 'Aktion fehlgeschlagen. Bitte später erneut versuchen.';
  }

  private laden(): void {
    this.loading.set(true);
    this.error.set(false);
    this.aktionsFehler.set(null);
    this.api.ladeUebersicht().subscribe({
      next: (data) => {
        this.gruppen.set(data.disziplinen);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
