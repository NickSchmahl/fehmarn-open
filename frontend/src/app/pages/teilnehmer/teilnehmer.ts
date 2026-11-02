import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Disziplin, disziplinLabel } from '../../shared/disziplin';
import {
  baueFilterChips,
  DisziplinFilter,
  FilterChip,
  passtZumFilter,
} from '../../shared/disziplin-filter';
import { DisziplinGruppe, SpielerEintrag } from '../../shared/teilnehmer-uebersicht';
import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';
import { DisziplinFilterComponent } from '../../ui/disziplin-filter/disziplin-filter.component';
import { TeilnehmerApiService } from './services/teilnehmer-api.service';

/** Aufbereitete Meldung für die Anzeige: Teamname + Spielernamen als Strings. */
export interface AnzeigeMeldung {
  teamName: string | null;
  mitglieder: readonly string[];
}

export interface AnzeigeGruppe {
  disziplin: Disziplin;
  label: string;
  anzahl: number;
  meldungen: readonly AnzeigeMeldung[];
}

/** Voller Anzeigename eines Spielers. */
function spielerName(spieler: SpielerEintrag): string {
  return `${spieler.vorname} ${spieler.nachname}`;
}

/**
 * Öffentliche Teilnehmerliste `/teilnehmer`: wer ist schon gemeldet, gefiltert nach Disziplin.
 * Die Admin-Verwaltung liegt seit #317 getrennt unter `/admin/teilnehmer`.
 */
@Component({
  selector: 'app-teilnehmer',
  imports: [BrandIconComponent, DisziplinFilterComponent],
  templateUrl: './teilnehmer.html',
  styleUrl: './teilnehmer.scss',
})
export class Teilnehmer implements OnInit {
  private readonly api = inject(TeilnehmerApiService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly gruppen = signal<readonly DisziplinGruppe[]>([]);
  readonly aktiveDisziplin = signal<DisziplinFilter>('ALLE');

  /** Filter-Chips: "Alle" + jede vorhandene Disziplin mit Anzahl (Meldungen). */
  readonly chips = computed<readonly FilterChip[]>(() => baueFilterChips(this.gruppen()));

  /** Gefiltert nach Disziplin; Spieler je Meldung als Namensliste aufbereitet. */
  readonly sichtbareGruppen = computed<readonly AnzeigeGruppe[]>(() => {
    const aktiv = this.aktiveDisziplin();
    return this.gruppen()
      .filter((gruppe) => passtZumFilter(gruppe.disziplin, aktiv))
      .map((gruppe) => ({
        disziplin: gruppe.disziplin,
        label: disziplinLabel(gruppe.disziplin),
        anzahl: gruppe.anzahl,
        meldungen: gruppe.meldungen.map((meldung) => ({
          teamName: meldung.teamName,
          mitglieder: meldung.spieler.map(spielerName),
        })),
      }));
  });

  ngOnInit(): void {
    this.laden();
  }

  setFilter(value: DisziplinFilter): void {
    this.aktiveDisziplin.set(value);
  }

  private laden(): void {
    this.loading.set(true);
    this.error.set(false);
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
