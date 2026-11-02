// Antwort von GET /api/anmeldung/status (Backend: AnmeldeschlussStatusResponse). Liegt in shared,
// weil Anmeldung, Teilnehmerverwaltung und Export denselben Status lesen (#318).

export interface AnmeldeschlussStatus {
  anmeldungOffen: boolean;
  anmeldeschluss: string; // ISO YYYY-MM-DD
  teamwettbewerbAusgebucht: boolean; // Teamlimit des Teamwettbewerbs erreicht
  maxTeams: number; // Obergrenze Teams im Teamwettbewerb
}
