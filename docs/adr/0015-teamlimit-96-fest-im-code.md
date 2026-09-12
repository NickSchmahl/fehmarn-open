# ADR 0015 – Teamlimit (96 Teams) fest im Code, Zählung über aktive Anmeldungen

**Status:** Akzeptiert · **Datum:** 2026-09-12

## Kontext

Der Teamwettbewerb ist durch Spielplan und Boards auf **96 Teams** begrenzt. Bisher konnten
beliebig viele Teams online gemeldet werden; ein Überlauf wäre erst bei der manuellen Planung
aufgefallen. Anders als der Anmeldeschluss ([ADR 0013](0013-anmeldeschluss-config-statt-db.md))
ist die Zahl keine jährliche Betriebs-Einstellung, sondern folgt der Hallenkapazität.

## Entscheidung

- **Feste Konstante** `TeamlimitService.MAX_TEAMS = 96` – keine Property, kein ENV. Die Zahl
  ändert sich nicht mit dem Turnierjahr; eine Config-Fläche wäre unbenutzt (YAGNI).
- **Gezählt werden nur aktive Anmeldungen** (`countByDisziplinAndAbgemeldetFalse`): Eine
  Admin-Abmeldung gibt den Platz wieder frei.
- **Alles-oder-nichts je Request:** Ein Anmeldevorgang mit mehreren Teams wird komplett
  abgelehnt, wenn nicht alle Teams ins Limit passen – keine Teil-Anmeldung.
- **Backend als Wahrheit:** `POST /api/anmeldung` wirft `TeamlimitErreichtException` → **409**
  mit Feldkennung `TEAMWETTBEWERB:limit` (Muster aus [ADR 0011](0011-validierung-fachlich-im-service.md)).
  Das Suffix `:limit` unterscheidet den Fehler von einer Teamname-Dublette (reine Disziplin-Kennung)
  und von einer Spieler-Dublette (`<DISZIPLIN>:<index>`).
- **Frontend sperrt vorbeugend:** `GET /api/anmeldung/status` liefert zusätzlich
  `{ teamwettbewerbAusgebucht, maxTeams }`; ist es voll, wird die Teamwettbewerb-Kachel als
  „Ausgebucht" gekennzeichnet und nicht mehr wählbar. Ein 409 beim Absenden (zwei Anmeldungen
  gleichzeitig) sperrt die Kachel nachträglich und erklärt das im Banner.
- **Admin darf überziehen:** Die Reaktivierung einer abgemeldeten Team-Meldung wird serverseitig
  **nicht** gegen das Limit geprüft. Das Frontend warnt den Admin vorher per Bestätigungsdialog.

## Konsequenzen

- Genau eine Quelle der Wahrheit für die Zahl: das Backend. Das Frontend zeigt nur, was der
  Status-Endpunkt meldet.
- Nebenläufigkeit: Zählen und Speichern laufen in einer Transaktion; SQLite mit Pool = 1
  ([ADR 0001](0001-sqlite-pool-1.md)) serialisiert Writes, ein 97. Team kann so nicht entstehen.
- Der Admin behält die Hoheit über Ausnahmen (Nachrücker, Absprachen vor Ort) und trägt die
  Verantwortung – die Warnung macht das Überziehen bewusst, verhindert es aber nicht.
- Ändert sich die Kapazität, ist es eine Code-Änderung samt Test. Bewusst in Kauf genommen.

## Alternativen

- **Limit als Server-Config (ENV):** analog zum Anmeldeschluss. Verworfen – der Wert ist
  hallengebunden, nicht jahresgebunden; eine ungenutzte Config-Fläche kostet nur Pflege.
- **Abgemeldete Teams mitzählen:** einfacher zu erklären, aber jeder Rücktritt würde einen Platz
  dauerhaft verbrennen. Verworfen.
- **Admin-Reaktivierung ebenfalls sperren:** konsistenter, nimmt dem Admin aber die
  Handlungsfähigkeit am Turniertag. Verworfen zugunsten der Warnung.
