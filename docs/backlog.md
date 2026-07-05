# Backlog / Tickets

Kurzfristige, priorisierte Aufgabenliste. Status: `TODO`, `IN ARBEIT`, `REVIEW`, `FERTIG`.
Format je Ticket: `[ID] Titel — Status — (optional GitHub #Issue)`.

> **Verwandte Listen:** Die strukturelle Qualitätsarbeit steht in
> [tickets/quality-roadmap.md](tickets/quality-roadmap.md) (Q-*), der Rückblick in
> [tickets/historie.md](tickets/historie.md). GitHub-Issues bei `gh`-Zugang spiegeln.

## Woche 1 – bis erste Testabnahme

### Stabilität & lauffähig machen
- [ ] `[S1]` Lokalen Build + Start auf Nicks Maschine verifizieren (Java 25, `mvnw verify`, `ng serve`) — TODO
- [ ] `[S2]` Uncommittete Änderungen klären: ~~`deploy.yml`~~ (erledigt, in `ci.yml` konsolidiert, #52) + `mvnw.cmd` (modifiziert) — TODO
- [ ] `[S3]` Deploy-Pipeline auf Test-Umgebung (8081) einmal grün durchlaufen lassen — TODO
- [ ] `[S4]` CI-Status auf `main` prüfen (Spotless, Tests, Frontend-Build) — TODO

### 🎯 Aktuelle Phase: Qualitäts-Härtung → **in GitHub-Issues**
Läuft als Big-Bang, getrackt in GitHub. Sammelticket **#55**, Einzeltickets **#44–#54**.
Übersicht/Verweise: [tickets/quality-roadmap.md](tickets/quality-roadmap.md).

### Features (NACH der Härtung, siehe [ADR 0008](adr/0008-scope-reduktion-testabnahme.md))
- [ ] **Flyer-Upload** (Admin) — **vor Testabnahme** — Issues #29/#30/#31/#32/#33
- [ ] QR-Code für Anmeldelink — gewünscht (Issue anlegen, wenn dran)
- [ ] Excel-Export — **verschoben**
- 🚫 ~~Selbst-Abmeldung~~ — gestrichen (#18/#20 wontfix)
- 🚫 ~~Anmeldeschluss durchsetzen~~ — umgekehrt, Code soll raus (#16/#17 wontfix)

### Cleanup / Vereinfachung (Issue anlegen, wenn dran)
- [ ] Anmeldeschluss-Code entfernen (`TurnierConfig` etc., overengineered)
- [ ] Bestätigungsmail-Trigger kappen (kein Versand mehr), Mail-Code behalten (Bezug #43)

## Später / Nice-to-have
- [ ] Migrations-Tooling (Flyway) statt `ddl-auto: update`, sobald Prod-Daten schützenswert
- [ ] `frontend/src/app/tmp/` (leerer Ordner) aufräumen; `vitest`-Dependency prüfen

---

## Erledigt
(noch nichts)
