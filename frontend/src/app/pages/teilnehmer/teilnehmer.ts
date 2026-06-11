import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Disziplin, disziplinLabel } from '../../shared/disziplin';

// ── Typen (passend zu TeilnehmerUebersichtResponse im Backend) ────────────────

export interface TeilnehmerEintrag {
  vorname: string;
  nachname: string;
  teamName: string | null;
}

interface DisziplinGruppe {
  disziplin: Disziplin;
  anzahl: number;
  teilnehmer: TeilnehmerEintrag[];
}

interface TeilnehmerUebersicht {
  disziplinen: DisziplinGruppe[];
}

export interface TeamGruppe {
  teamName: string | null;
  mitglieder: string[];
}

export interface AnzeigeGruppe {
  disziplin: Disziplin;
  label: string;
  anzahl: number;
  teams: TeamGruppe[];
}

type Filter = Disziplin | 'ALLE';

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

/**
 * Bündelt Teilnehmer einer Disziplin nach Teamnamen. Einträge ohne (bzw. mit leerem)
 * Teamnamen werden als einzelne Gruppe je Person dargestellt. Reihenfolge der ersten
 * Nennung bleibt erhalten.
 */
export function gruppiereNachTeam(eintraege: TeilnehmerEintrag[]): TeamGruppe[] {
  const teams: TeamGruppe[] = [];
  const indexByTeam = new Map<string, number>();

  for (const eintrag of eintraege) {
    const name = `${eintrag.vorname} ${eintrag.nachname}`;
    const team = eintrag.teamName?.trim() ?? '';

    if (team === '') {
      teams.push({ teamName: null, mitglieder: [name] });
      continue;
    }

    const vorhanden = indexByTeam.get(team);
    if (vorhanden === undefined) {
      indexByTeam.set(team, teams.length);
      teams.push({ teamName: team, mitglieder: [name] });
    } else {
      teams[vorhanden].mitglieder.push(name);
    }
  }

  return teams;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-teilnehmer',
  standalone: true,
  imports: [],
  templateUrl: './teilnehmer.html',
  styleUrl: './teilnehmer.scss',
})
export class Teilnehmer implements OnInit {
  private http = inject(HttpClient);

  readonly gruppen = signal<DisziplinGruppe[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly aktiveDisziplin = signal<Filter>('ALLE');

  /** Filter-Chips: "Alle" + jede vorhandene Disziplin mit Anzahl. */
  readonly chips = computed(() => {
    const gesamt = this.gruppen().reduce((sum, g) => sum + g.anzahl, 0);
    return [
      { value: 'ALLE' as Filter, label: 'Alle', anzahl: gesamt },
      ...this.gruppen().map((g) => ({
        value: g.disziplin as Filter,
        label: disziplinLabel(g.disziplin),
        anzahl: g.anzahl,
      })),
    ];
  });

  /** Disziplingruppen, gefiltert und für die Anzeige (nach Team gebündelt) aufbereitet. */
  readonly sichtbareGruppen = computed<AnzeigeGruppe[]>(() => {
    const aktiv = this.aktiveDisziplin();
    return this.gruppen()
      .filter((g) => aktiv === 'ALLE' || g.disziplin === aktiv)
      .map((g) => ({
        disziplin: g.disziplin,
        label: disziplinLabel(g.disziplin),
        anzahl: g.anzahl,
        teams: gruppiereNachTeam(g.teilnehmer),
      }));
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(false);
    this.http.get<TeilnehmerUebersicht>('/api/teilnehmer').subscribe({
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

  setFilter(value: Filter): void {
    this.aktiveDisziplin.set(value);
  }
}
