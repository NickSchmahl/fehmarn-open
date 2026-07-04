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

## Nicht implementiert – Entscheidung je Funktion (Scope 2026-07-04)

| Funktion | Ist-Zustand (Code) | Entscheidung |
|----------|--------------------|--------------|
| **Flyer-Upload** | Kein Upload-Endpunkt, keine Speicherung; nur statische Route `/flyer` | ✅ **umsetzen – vor Testabnahme** (`Q-FEAT-4`) |
| **QR-Code für Anmeldelink** | Kein Code, keine QR-Bibliothek | ⭕ **umsetzen – gewünscht** (`Q-FEAT-5`), evtl. rein clientseitig |
| **Excel-Export** | Kein Code, keine POI-Abhängigkeit | ⏭️ **verschoben** – nicht vor Testabnahme (`Q-FEAT-3`) |
| **Anmeldeschluss sperren / Datum setzen** | `TurnierConfig` (`anmeldungGesperrt`, `anmeldeschlussDatum`) existiert, wird aber **von nichts genutzt**; `AnmeldungGesperrtException` **nie geworfen** → toter Code | 🚫 **soll raus** – overengineered (`Q-RM-1`) |

Details/Begründung: [ADR 0008](../adr/0008-scope-reduktion-testabnahme.md).
Tickets: [tickets/quality-roadmap.md](../tickets/quality-roadmap.md) (Abschnitt A + Cleanup).

### Umsetzungshinweise
- **Flyer-Upload:** Speicherort festlegen; Datei-Whitelist + Größenlimit beachten
  (Sicherheitsaspekt – kein beliebiger Upload).
- **QR-Code:** kann evtl. ohne Backend rein im Frontend erzeugt werden (Bibliothek prüfen).
- **Excel-Export (später):** z.B. Apache POI.

## Datenmodell

- **`AdminUser`** (`benutzername`, `passwortHash`) – Accounts via Env-Variablen
  angelegt (`DataInitializer`, siehe [auth-security.md](auth-security.md)).
- **`TurnierConfig`** – vorbereitet, aber ungenutzt → **zur Entfernung vorgemerkt** (`Q-RM-1`).
