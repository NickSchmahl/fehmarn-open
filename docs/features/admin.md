# Feature: Admin-Bereich

Geschützter Bereich für die Organisatoren (Login erforderlich, siehe
[auth-security.md](auth-security.md)).

> **Status verifiziert am 2026-07-04** gegen den Backend-Code.
> ⚠️ README/alte `requirements.md` führten Flyer-Upload, Excel-Export, QR-Code und
> Anmeldeschluss als „fertig" – im Backend existiert dafür **kein Code**. Der Scope
> wurde neu bewertet ([ADR 0008](../adr/0008-scope-reduktion-testabnahme.md)), siehe
> Tabellen unten.

## Tatsächlich implementierte Admin-Endpunkte

Alle unter `/api/admin`, JWT-geschützt (`AdminTeilnehmerController`):

| Funktion | Endpunkt | Status |
|----------|----------|--------|
| Teilnehmer-/Anmeldeübersicht (nach Team gruppiert) | `GET /api/admin/teilnehmer` | ✅ |
| Manuelle Abmeldung einer Anmeldung | `POST /api/admin/anmeldung/{id}/abmelden` | ✅ |
| Abmeldung rückgängig (reaktivieren) | `POST /api/admin/anmeldung/{id}/reaktivieren` | ✅ |
| Anwesenheit setzen (Turniertag) | `PUT /api/admin/anmeldung/{id}/anwesenheit` | ✅ |

**Teamlimit beim Reaktivieren:** Der Teamwettbewerb ist auf 96 Teams begrenzt
([ADR 0016](../adr/0016-teamlimit-96-fest-im-code.md)). Die Reaktivierung wird serverseitig
**nicht** gegen das Limit geprüft – der Admin darf bewusst überziehen (Nachrücker, Absprachen
vor Ort). Ist der Wettbewerb voll, fragt das Frontend vorher per Bestätigungsdialog nach.

## Nicht implementiert – Entscheidung je Funktion (Scope 2026-07-04)

| Funktion | Ist-Zustand (Code) | Entscheidung |
|----------|--------------------|--------------|
| **Flyer-Upload** | Kein Upload-Endpunkt, keine Speicherung; nur statische Route `/flyer` | ✅ **umsetzen – vor Testabnahme** (`Q-FEAT-4`) |
| **QR-Code für Anmeldelink** | Kein Code, keine QR-Bibliothek | ⭕ **umsetzen – gewünscht** (`Q-FEAT-5`), evtl. rein clientseitig |
| **Excel-Export** | ersetzt, kein POI | ✅ **ersetzt durch die Export-Seite** (#305, `Q-FEAT-3`) – siehe Abschnitt [Export-Seite](#export-seite-admin-export) |
| **Anmeldeschluss sperren / Datum setzen** | `TurnierConfig` (`anmeldungGesperrt`, `anmeldeschlussDatum`) existiert, wird aber **von nichts genutzt**; `AnmeldungGesperrtException` **nie geworfen** → toter Code | 🚫 **soll raus** – overengineered (`Q-RM-1`) |

Details/Begründung: [ADR 0008](../adr/0008-scope-reduktion-testabnahme.md).
Tickets: [tickets/quality-roadmap.md](../tickets/quality-roadmap.md) (Abschnitt A + Cleanup).

### Umsetzungshinweise
- **Flyer-Upload:** Speicherort festlegen; Datei-Whitelist + Größenlimit beachten
  (Sicherheitsaspekt – kein beliebiger Upload).
- **QR-Code:** kann evtl. ohne Backend rein im Frontend erzeugt werden (Bibliothek prüfen).

## Export-Seite (`/admin/export`)

Nur eingeloggt erreichbar (`authGuard`, sonst Redirect auf `/admin/login`); Nav-Eintrag „Export"
erscheint nur mit Login. Umgesetzt in #305 (#306–#309), Technik-Entscheidung:
[ADR 0017](../adr/0017-pdf-export-ueber-browser-druck.md). Mockups:
[specs/assets/2026-10-28-export/](../superpowers/specs/assets/2026-10-28-export/).

- **Daten:** einmal `GET /api/admin/teilnehmer` (kein eigener Endpunkt), „Aktualisieren" lädt neu.
  Kennzahlen: aktive Meldungen, Spieler (je Disziplin gezählt = CSV-Zeilen), neue Radikal-IDs,
  abgemeldet, Stand. Für „x / 96" beim Teamwettbewerb zusätzlich `GET /api/anmeldung/status`.
- **Gemeinsame Regeln aller Exporte:** abgemeldete Meldungen fehlen; Einzel nach Nachname/Vorname,
  Team-Disziplinen nach Teamname sortiert (Umlaute wie im Telefonbuch, Zahlen numerisch); die
  laufende Nummer je Disziplin ist in allen Exporten gleich. Ohne angegebene Radikal-ID wird sie aus
  Initialen + Geburtsdatum (`TTMMJJJJ`) gebildet und als **NEU** markiert.

| Export | Format | Inhalt |
|--------|--------|--------|
| **Turniertag-Liste** | PDF (Druckansicht) | Je Disziplin eigene A4-Blätter, chronologisch (Fr → So). Einzel zweispaltig (92 Spieler auf Blatt 1, 102 je Folgeblatt), Teams einspaltig mit Startgeld (`5 × 10`). Kästchen **Anwesend** (optional mit X vorangekreuzt) und **Bezahlt** (nur auf Papier, kein Datenfeld), 10 Leerzeilen für Nachmeldungen, Soll Kasse, Unterschriften auf dem letzten Blatt. Optionen: Disziplinen wählen, „Radikal-ID ausblenden" als Aushang-Variante. |
| **Meldungen als CSV** | CSV (UTF-8 mit BOM, `;`, CRLF) | Eine Zeile je Spieler und Disziplin: `disziplin;disziplin_name;meldung_nr;team;nachname;vorname;radikal_id;id_status;initialen;geburtsdatum`. Initialen/Geburtsdatum nur bei `neu`. Schutz gegen Formel-Injection. Dateiname `fehmarn-open-2027_radikal_<Datum>.csv`. |
| **Meldeliste für Radikal** | PDF (Druckansicht) | Dieselben Daten wie die CSV, lesbar, ohne Ankreuzfelder: Übersicht je Disziplin, Abschnitte mit `VORHANDEN`/`NEU`, Geburtsdatum nur bei NEU. Immer alle Spieler, keine Optionen. |

Alles entsteht im Browser des Admins und wird dort heruntergeladen bzw. gedruckt – keine
automatische Übermittlung an Radikal (Datenschutzerklärung §4).

## Datenmodell

- **`AdminUser`** (`benutzername`, `passwortHash`) – Accounts via Env-Variablen
  angelegt (`DataInitializer`, siehe [auth-security.md](auth-security.md)).
- **`TurnierConfig`** – vorbereitet, aber ungenutzt → **zur Entfernung vorgemerkt** (`Q-RM-1`).
