# Feature: Teilnehmer-Flow (öffentlich)

Der öffentliche Bereich für Turnier-Teilnehmer – ohne Login erreichbar.

> **Status verifiziert am 2026-07-04** gegen den Backend-Code (Endpunkte, Service).
> Scope-Stand gemäß [ADR 0008](../adr/0008-scope-reduktion-testabnahme.md):
> Selbst-Abmeldung **gestrichen**. E-Mail/Mailversand per **#113 vollständig entfernt**
> (kein `email`-Feld, kein Mail-Layer mehr).

## Ablauf (aktueller Scope)

```
Anmeldung ausfüllen (ohne E-Mail) ──► Öffentliche Teilnehmerliste
Flyer ansehen
```

## Bausteine & Status

| Teil-Feature | Backend-Endpunkt | Status | Anmerkung |
|--------------|------------------|--------|-----------|
| Online-Anmeldung (1..n Disziplinen) | `POST /api/anmeldung` | ✅ implementiert | `AnmeldungController` → `AnmeldungService.anmeldenMitTeilnehmer` |
| Öffentliche Teilnehmerliste | `GET /api/teilnehmer` | ✅ implementiert | `TeilnehmerController` → `oeffentlicheUebersicht()` |
| Disziplin-Filter der Liste | (Frontend) | ✅ implementiert | Filter clientseitig, Ticket #23/#26 |
| Flyer-Ansicht | Frontend-Route `/flyer` | ✅ Anzeige | statische Seite; Upload durch Admin geplant (siehe [admin.md](admin.md)) |
| ~~Bestätigungsmail bei Anmeldung~~ | — | ❌ **entfernt (#113)** | Mail-Layer, Events und `email`-Feld gelöscht → keine Mail, keine E-Mail-Erfassung (siehe [mail-benachrichtigungen.md](mail-benachrichtigungen.md)) |
| ~~Selbst-Abmeldung per Link~~ | — | 🚫 **gestrichen** | Nicht mehr vorgesehen. Teil-Code (`AnmeldungService.abmelden(String token)`, Feld `abmeldetoken`, Repo-Query) bleibt **vorerst liegen**, wird nicht ausgebaut |

## Datenmodell (relevant)

- **`Teilnehmer`**: `vorname`, `nachname`, `radikalId`, `initialen`, `angemeldetAm`.
- **`Anmeldung`**: `teilnehmer` (FK), `disziplin` (Enum), `teamName`, `abmeldetoken`
  (unique), `abgemeldet`/`abgemeldetAm`, `anwesend`.
- Eine Person kann mehrere Disziplinen belegen → mehrere `Anmeldung`-Zeilen je `Teilnehmer`.

## Fachregeln

- Mehrere Meldungen je Disziplin in einem Anmeldevorgang sind erlaubt (#169) – z. B. mehrere
  Einzel-Spieler oder mehrere Doppel-Teams in einem Request. Es gibt keine Sperre gegen
  dieselbe Disziplin mehrfach im Request mehr.
- Innerhalb eines Requests: doppelter (normalisierter, case-insensitiver) Teamname in
  derselben Disziplin → `DoppelterTeamnameException` (409); doppelte Radikal-ID in derselben
  Disziplin → `DoppelteRadikalIdException` (400). Beide Prüfungen laufen in-memory im
  `RequestDublettenService`, bevor irgendetwas gespeichert wird.
- **Anmeldeschluss:** nach dem Stichtag lehnt `POST /api/anmeldung` mit **403** ab; die
  Anmeldeseite zeigt dann eine Infoseite statt des Formulars (#153,
  [ADR 0013](../adr/0013-anmeldeschluss-config-statt-db.md)).
- **Teamlimit Teamwettbewerb: 96 Teams** (`TeamlimitService`,
  [ADR 0015](../adr/0015-teamlimit-96-fest-im-code.md)). Gezählt werden nur aktive
  (nicht abgemeldete) Meldungen; eine Abmeldung gibt den Platz frei. Passt nicht der ganze
  Request ins Limit, wird er komplett mit **409** (`TEAMWETTBEWERB:limit`) abgelehnt. Die
  Anmeldeseite sperrt die Kachel schon vorher, sobald `GET /api/anmeldung/status`
  `teamwettbewerbAusgebucht` meldet. Die Admin-Reaktivierung darf das Limit überziehen
  (Warndialog, siehe [admin.md](admin.md)).

## Offene Punkte (aktueller Scope)

Für den Teilnehmer-Flow selbst gibt es keine offenen Muss-Punkte mehr; Anmeldung und
Liste laufen. Angrenzend relevant:
- **Flyer-Upload** (Admin) ist die nächste erforderliche Ergänzung – siehe [admin.md](admin.md).

Zugehörige Tickets/Historie: [tickets/historie.md](../tickets/historie.md) (#11, #12, #14, #23, #26).
