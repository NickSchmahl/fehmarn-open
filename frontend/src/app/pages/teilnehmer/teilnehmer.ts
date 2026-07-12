import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Disziplin, disziplinLabel } from '../../shared/disziplin';
import { formatiereIsoDatum } from '../../shared/datum';
import { AuthService } from '../../auth/service/auth.service';
import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';

// ── Typen: öffentliche Übersicht (TeilnehmerUebersichtResponse) ───────────────

export interface SpielerEintrag {
  vorname: string;
  nachname: string;
}

export interface MeldungEintrag {
  teamName: string | null;
  spieler: SpielerEintrag[];
}

interface DisziplinGruppe {
  disziplin: Disziplin;
  anzahl: number;
  meldungen: MeldungEintrag[];
}

interface TeilnehmerUebersicht {
  disziplinen: DisziplinGruppe[];
}

/** Aufbereitete Meldung für die Anzeige: Teamname + Spielernamen als Strings. */
export interface AnzeigeMeldung {
  teamName: string | null;
  mitglieder: string[];
}

export interface AnzeigeGruppe {
  disziplin: Disziplin;
  label: string;
  anzahl: number;
  meldungen: AnzeigeMeldung[];
}

// ── Typen: Admin-Übersicht (AdminUebersichtResponse) ──────────────────────────

export interface AdminSpielerEintrag {
  vorname: string;
  nachname: string;
  radikalId: string | null;
  initialen: string | null;
  geburtsdatum: string | null; // ISO yyyy-MM-dd, nur Admin-Sicht
}

/** Eine Meldung im Admin: Status liegt pro Meldung, die Spieler hängen darunter. */
export interface AdminMeldungEintrag {
  id: number;
  teamName: string | null;
  anwesend: boolean;
  abgemeldet: boolean;
  spieler: AdminSpielerEintrag[];
}

interface AdminGruppe {
  disziplin: Disziplin;
  anzahl: number;
  meldungen: AdminMeldungEintrag[];
}

interface AdminUebersicht {
  disziplinen: AdminGruppe[];
}

export interface AdminAnzeigeGruppe {
  disziplin: Disziplin;
  label: string;
  anzahl: number;
  meldungen: AdminMeldungEintrag[];
}

/** Fehler einer Zeilen-Aktion (z. B. 409 beim Reaktivieren wegen Teamname-Dublette). */
export interface AktionsFehler {
  meldungId: number;
  text: string;
}

type Filter = Disziplin | 'ALLE';

interface FilterChip {
  value: Filter;
  label: string;
  anzahl: number;
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

/** Voller Anzeigename eines Spielers. */
function spielerName(spieler: SpielerEintrag): string {
  return `${spieler.vorname} ${spieler.nachname}`;
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

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-teilnehmer',
  standalone: true,
  imports: [BrandIconComponent],
  templateUrl: './teilnehmer.html',
  styleUrl: './teilnehmer.scss',
})
export class Teilnehmer implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  readonly isAdmin = signal(this.authService.isLoggedIn());

  readonly loading = signal(false);
  readonly error = signal(false);
  // Fehler einer Admin-Aktion, zeilenbezogen: welche Meldung + fachlicher Text.
  readonly aktionsFehler = signal<AktionsFehler | null>(null);
  readonly aktiveDisziplin = signal<Filter>('ALLE');

  // Öffentlicher Modus
  readonly gruppen = signal<readonly DisziplinGruppe[]>([]);

  // Admin-Modus
  readonly adminGruppen = signal<readonly AdminGruppe[]>([]);
  readonly suchbegriff = signal('');

  /** Filter-Chips: "Alle" + jede vorhandene Disziplin mit Anzahl (Meldungen). */
  readonly chips = computed<FilterChip[]>(() => {
    const quelle = this.isAdmin() ? this.adminGruppen() : this.gruppen();
    const gesamt = quelle.reduce((sum, gruppe) => sum + gruppe.anzahl, 0);
    return [
      { value: 'ALLE', label: 'Alle', anzahl: gesamt },
      ...quelle.map((gruppe) => ({
        value: gruppe.disziplin,
        label: disziplinLabel(gruppe.disziplin),
        anzahl: gruppe.anzahl,
      })),
    ];
  });

  /** Öffentlich: gefiltert nach Disziplin; Spieler je Meldung als Namensliste aufbereitet. */
  readonly sichtbareGruppen = computed<AnzeigeGruppe[]>(() => {
    const aktiv = this.aktiveDisziplin();
    return this.gruppen()
      .filter((gruppe) => aktiv === 'ALLE' || gruppe.disziplin === aktiv)
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

  /** Admin: gefiltert nach Disziplin + Suchbegriff (Team- oder Spielername). */
  readonly sichtbareAdminGruppen = computed<AdminAnzeigeGruppe[]>(() => {
    const aktiv = this.aktiveDisziplin();
    const suche = this.suchbegriff().trim().toLowerCase();

    return this.adminGruppen()
      .filter((gruppe) => aktiv === 'ALLE' || gruppe.disziplin === aktiv)
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

  /** Fehlertext für genau diese Meldung – oder null, wenn der Fehler eine andere/keine Zeile betrifft. */
  fehlerFuer(meldungId: number): string | null {
    const fehler = this.aktionsFehler();
    return fehler?.meldungId === meldungId ? fehler.text : null;
  }

  /** Start einer Admin-Aktion: einen evtl. sichtbaren Zeilen-Fehler wegräumen. */
  private aktionBeginnen(): void {
    this.aktionsFehler.set(null);
  }

  /** Anlage-Grundlage für Spieler ohne Radikal ID: "Initialen, dd.MM.yyyy". */
  anlageGrundlage(spieler: AdminSpielerEintrag): string {
    const datum = formatiereIsoDatum(spieler.geburtsdatum);
    return [spieler.initialen, datum].filter((teil) => teil).join(', ');
  }

  // ── Admin-Aktionen: jeweils pro Meldung (eine Anmeldung-id) ──

  abmelden(id: number): void {
    this.aktionBeginnen();
    this.http.post(`/api/admin/anmeldung/${id}/abmelden`, {}).subscribe({
      next: () => {
        this.ladeAdmin();
      },
    });
  }

  reaktivieren(id: number): void {
    this.aktionBeginnen();
    this.http.post(`/api/admin/anmeldung/${id}/reaktivieren`, {}).subscribe({
      next: () => {
        this.ladeAdmin();
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

  toggleAnwesenheit(id: number, anwesend: boolean): void {
    this.aktionBeginnen();
    this.http.put(`/api/admin/anmeldung/${id}/anwesenheit`, { anwesend }).subscribe({
      next: () => {
        this.ladeAdmin();
      },
    });
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
    this.aktionsFehler.set(null);
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
