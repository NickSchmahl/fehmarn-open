# #117 — Flyway-Migrationen einführen (`ddl-auto: update → validate`)

**Datum:** 2026-07-09
**Ticket:** #117 (vor Go-Live)
**Branch:** `feat/117-flyway-migrationen`

## Problem

Hibernate pflegt das Schema über `spring.jpa.hibernate.ddl-auto: update` ([ADR 0004](../../adr/0004-ddl-auto-update.md)).
`update` **fügt nur hinzu** — Änderungen an Enum-Werten oder Constraints/Spalten greifen
nicht auf bestehende DBs (Schema-Drift, vgl. #102 Enum-CHECK, #113 verwaiste `email`-Spalte).
In der Testphase löst der manuelle `db-reset.yml` das. **Nach dem ersten produktiven
Go-Live ist Reset keine Option mehr** (echte Anmeldungen).

## Lösung

Versioniertes Schema-Management mit **Flyway**; Hibernate nur noch `validate`.

### 1. Abhängigkeiten & Haupt-Konfiguration

- `flyway-core` + das SQLite-Modul (`flyway-database-sqlite`; Version von Spring Boot 4.1
  gemanagt — korrekte Artefakt-Koordinaten bei der Umsetzung verifizieren).
- `application.yaml`:
  - `spring.jpa.hibernate.ddl-auto: validate`
  - `spring.flyway.enabled: true`
  - `spring.flyway.baseline-on-migrate: true`
  - `spring.flyway.baseline-version: 1`

### 2. Baseline `V1__init.sql`

- Abgeleitet aus dem **Hibernate-generierten DDL** (Schema-Export gegen den SQLite-
  Community-Dialekt), dann aufgeräumt. So trifft die Baseline exakt die von Hibernate
  erwartete Struktur — inklusive der **Enum-CHECK-Constraint** auf `anmeldung.disziplin`
  und `admin_user.benutzername UNIQUE`.
- Ort: `backend/src/main/resources/db/migration/V1__init.sql`.
- Nur DDL: `anmeldung`, `spieler` (FK `anmeldung_id`), `admin_user`. **Keine Daten** —
  Admins legt weiterhin der `DataInitializer` (Java) an, Anmeldungen sind Nutzdaten.

### 3. Cutover (baseline-on-migrate)

- Bestehendes Schema (Test mit Daten, Prod leer/frisch) wird beim ersten Start als
  „V1 bereits angewendet" markiert; leere/neue DBs bekommen V1 regulär. **Kein Reset nötig.**
- **Vorbedingung:** `baseline-on-migrate` vertraut darauf, dass das vorhandene Schema V1
  entspricht. Test/Prod sind aktuell in sync (Prod leer; Test per Reset gepflegt). Falls je
  Drift auf einer Umgebung vermutet wird, einmalig `db-reset.yml` **vor** dem Flyway-Deploy —
  danach nie wieder.
- Deploy selbst bleibt unverändert (JAR + `systemctl restart`); Flyway läuft beim Start
  automatisch mit.

### 4. Tests

- Test-Profil (`application-test.yaml`): `create-drop` → `validate`, Flyway aktiv. Die
  DB-berührenden Tests bauen das Schema über V1; Hibernate `validate` beweist
  Entity↔Schema-Konsistenz. Test-DB liegt unter `target/` (durch `mvn clean` frisch).
- Neuer Test, der belegt, dass die Migrationen auf einer leeren DB sauber durchlaufen und
  der Kontext mit `validate` hochkommt (Sicherheitsnetz gegen Baseline-Drift).
- **Risiko/Fallback:** Sollte Hibernate-`validate` auf dem SQLite-Community-Dialekt bei
  Typ-Äquivalenz zicken, Fallback = Flyway baut das Schema, Test prüft nur sauberes
  Anwenden (ohne `validate`). Empirisch bei der Umsetzung entscheiden und im PR dokumentieren.

### 5. Dokumentation & Workflow (fester Bestandteil dieses Tickets)

- **Neuer ADR** „Flyway statt ddl-auto"; ADR 0004 auf Status „abgelöst durch ADR 00xx".
- **Workflow verankern** (in `AGENTS.md` und `docs/`): Ab jetzt bedeutet **jede
  Schema-Änderung eine neue versionierte Migrationsdatei** `V<n>__beschreibung.sql` —
  Entity-Änderung ohne zugehörige Migration ist unvollständig. Jede Migration **muss
  getestet** werden (der `validate`-Kontexttest fängt fehlende/fehlerhafte Migrationen ab).
- **SQLite-Spezifika** dokumentieren: kein `ALTER TABLE … DROP CONSTRAINT`/`DROP COLUMN` mit
  Constraints → Muster „neue Tabelle + `INSERT … SELECT` + `DROP` + `RENAME`".
- `docs/decisions.md` und ggf. `docs/quality/` aktualisieren.

## Scope

Ein PR für #117. Backend + Doku/ADR. Keine Deploy-Pipeline-Änderung nötig (Flyway läuft
beim App-Start). Kein Frontend.

## Nicht in Scope

- `db-reset.yml` bleibt bestehen (Test-Werkzeug); nur der Hinweis „nach Go-Live nicht auf
  prod" ist durch Flyway künftig faktisch erfüllt.
- Keine fachlichen Schema-Änderungen — reine Einführung des Migrationswerkzeugs mit der
  aktuellen Struktur als Baseline.

## Akzeptanzkriterien

- Backend startet mit `ddl-auto: validate` + Flyway-Migrationen grün (Test).
- Voller `./mvnw verify` grün (inkl. neuem Migrations-/`validate`-Test, PMD, SpotBugs, ArchUnit).
- ADR + Workflow-Doku aktualisiert; Migrations-Konvention inkl. SQLite-Spezifika dokumentiert.
