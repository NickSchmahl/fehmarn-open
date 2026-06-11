import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Disziplin, disziplinLabel } from '../../shared/disziplin';
import { AuthService } from '../../auth/service/auth.service';

// ── Typen: öffentliche Übersicht (TeilnehmerUebersichtResponse) ───────────────

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

// ── Typen: Admin-Übersicht (AdminUebersichtResponse) ──────────────────────────

export interface AdminEintrag {
  id: number;
  vorname: string;
  nachname: string;
  email: string;
  radicalId: string | null;
  teamName: string | null;
  anwesend: boolean;
  abgemeldet: boolean;
}

interface AdminGruppe {
  disziplin: Disziplin;
  anzahl: number;
  teilnehmer: AdminEintrag[];
}

interface AdminUebersicht {
  disziplinen: AdminGruppe[];
}

export interface AdminAnzeigeGruppe {
  disziplin: Disziplin;
  label: string;
  anzahl: number;
  teilnehmer: AdminEintrag[];
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
  private authService = inject(AuthService);

  readonly isAdmin = signal(this.authService.isLoggedIn());

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly aktiveDisziplin = signal<Filter>('ALLE');

  // Öffentlicher Modus
  readonly gruppen = signal<DisziplinGruppe[]>([]);

  // Admin-Modus
  readonly adminGruppen = signal<AdminGruppe[]>([]);
  readonly suchbegriff = signal('');

  /** Filter-Chips: "Alle" + jede vorhandene Disziplin mit Anzahl. */
  readonly chips = computed(() => {
    const quelle = this.isAdmin() ? this.adminGruppen() : this.gruppen();
    const gesamt = quelle.reduce((sum, g) => sum + g.anzahl, 0);
    return [
      { value: 'ALLE' as Filter, label: 'Alle', anzahl: gesamt },
      ...quelle.map((g) => ({
        value: g.disziplin as Filter,
        label: disziplinLabel(g.disziplin),
        anzahl: g.anzahl,
      })),
    ];
  });

  /** Öffentlich: gefiltert nach Disziplin und nach Team gebündelt. */
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

  /** Admin: gefiltert nach Disziplin + Suchbegriff (Name/E-Mail), Zeilen je Anmeldung. */
  readonly sichtbareAdminGruppen = computed<AdminAnzeigeGruppe[]>(() => {
    const aktiv = this.aktiveDisziplin();
    const suche = this.suchbegriff().trim().toLowerCase();

    return this.adminGruppen()
      .filter((g) => aktiv === 'ALLE' || g.disziplin === aktiv)
      .map((g) => ({
        disziplin: g.disziplin,
        label: disziplinLabel(g.disziplin),
        anzahl: g.anzahl,
        teilnehmer: g.teilnehmer.filter((t) => this.passtZurSuche(t, suche)),
      }))
      .filter((g) => g.teilnehmer.length > 0);
  });

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.ladeAdmin();
    } else {
      this.ladeOeffentlich();
    }
  }

  setFilter(value: Filter): void {
    this.aktiveDisziplin.set(value);
  }

  setSuche(value: string): void {
    this.suchbegriff.set(value);
  }

  abmelden(id: number): void {
    this.http.post(`/api/admin/anmeldung/${id}/abmelden`, {}).subscribe({
      next: () => this.ladeAdmin(),
    });
  }

  reaktivieren(id: number): void {
    this.http.post(`/api/admin/anmeldung/${id}/reaktivieren`, {}).subscribe({
      next: () => this.ladeAdmin(),
    });
  }

  toggleAnwesenheit(id: number, anwesend: boolean): void {
    this.http.put(`/api/admin/anmeldung/${id}/anwesenheit`, { anwesend }).subscribe({
      next: () => this.ladeAdmin(),
    });
  }

  private passtZurSuche(t: AdminEintrag, suche: string): boolean {
    if (suche === '') {
      return true;
    }
    return `${t.vorname} ${t.nachname} ${t.email}`.toLowerCase().includes(suche);
  }

  private ladeOeffentlich(): void {
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

  private ladeAdmin(): void {
    this.loading.set(true);
    this.error.set(false);
    this.http.get<AdminUebersicht>('/api/admin/teilnehmer').subscribe({
      next: (data) => {
        this.adminGruppen.set(data.disziplinen);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
