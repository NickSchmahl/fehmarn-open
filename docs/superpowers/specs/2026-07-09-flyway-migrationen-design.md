# #117 — Migrations-Tooling einführen (`ddl-auto: update → validate`)

**Datum:** 2026-07-09
**Ticket:** #117 (vor Go-Live)
**Branch:** `feat/117-flyway-migrationen`

> **Tool-Wahl:** Das Ticket nannte Flyway. **Flyway 12** (von Spring Boot 4.1 gemanagt)
> **unterstützt SQLite nicht** — es gibt kein SQLite-DB-Modul mehr (`flyway-database-sqlite`
> existiert nicht auf Maven Central). Wir nutzen daher **Liquibase 5.0.3** (ebenfalls von Boot
> gemanagt): SQLite ist nativ unterstützt (`liquibase.database.core.SQLiteDatabase`), inkl.
> automatischem Umgang mit SQLites ALTER-TABLE-Grenzen (Table-Rebuild). Gleiches Ziel,
> für SQLite der robustere Weg.

## Problem

Hibernate pflegt das Schema über `spring.jpa.hibernate.ddl-auto: update` ([ADR 0004](../../adr/0004-ddl-auto-update.md)).
`update` **fügt nur hinzu** — Änderungen an Enum-Werten oder Constraints/Spalten greifen
nicht auf bestehende DBs (Schema-Drift, vgl. #102 Enum-CHECK, #113 verwaiste `email`-Spalte).
In der Testphase löst der manuelle `db-reset.yml` das. **Nach dem ersten produktiven
Go-Live ist Reset keine Option mehr** (echte Anmeldungen).

## Lösung

Versioniertes Schema-Management mit **Liquibase**; Hibernate nur noch `validate`.

### 1. Abhängigkeit & Haupt-Konfiguration

- `org.liquibase:liquibase-core` (Version von Spring Boot 4.1 gemanagt → 5.0.3).
- `application.yaml`:
  - `spring.jpa.hibernate.ddl-auto: validate`
  - `spring.liquibase.enabled: true`
  - `spring.liquibase.change-log: classpath:db/changelog/db.changelog-master.yaml`

### 2. Changelog-Struktur & Baseline

- Master-Changelog `backend/src/main/resources/db/changelog/db.changelog-master.yaml`, das die
  einzelnen Änderungs-Changelogs `include`t.
- **Baseline** `db/changelog/changes/001-init.sql` als **Liquibase formatted SQL**: Inhalt aus
  dem **Hibernate-generierten DDL** (Schema-Export gegen den SQLite-Community-Dialekt) abgeleitet
  und aufgeräumt — so trifft die Baseline exakt die von Hibernate erwartete Struktur (inkl.
  Enum-CHECK auf `anmeldung.disziplin`, `admin_user.benutzername UNIQUE`, FK `spieler.anmeldung_id`).
  Nur DDL: `anmeldung`, `spieler`, `admin_user`. Keine Daten (Admins legt der `DataInitializer`
  an, Anmeldungen sind Nutzdaten).

### 3. Cutover auf bestehende DBs (Precondition MARK_RAN)

- Der Init-ChangeSet trägt eine **Precondition** `onFail: MARK_RAN`, die prüft, ob die Tabellen
  schon existieren: leere/neue DB → Init läuft; bestehende DB mit Schema (Test mit Daten,
  Prod falls schon angelegt) → Init wird als „bereits angewendet" markiert, ohne ausgeführt zu
  werden. **Kein Reset nötig.** (Liquibase-Äquivalent zu Flyways baseline-on-migrate.)
- **Vorbedingung:** Der MARK_RAN-Pfad vertraut darauf, dass das vorhandene Schema der Baseline
  entspricht. Test/Prod sind aktuell in sync (Prod leer; Test per Reset gepflegt). Falls je Drift
  vermutet wird, einmalig `db-reset.yml` **vor** dem Liquibase-Deploy — danach nie wieder.
- Deploy bleibt unverändert (JAR + `systemctl restart`); Liquibase läuft beim Start automatisch.

### 4. Tests

- Test-Profil (`application-test.yaml`): `create-drop` → `validate`, Liquibase aktiv. Die
  DB-berührenden Tests bauen das Schema über die Changelogs; Hibernate `validate` beweist
  Entity↔Schema-Konsistenz. Test-DB liegt unter `target/` (durch `mvn clean` frisch).
- Neuer Test, der belegt, dass der Kontext mit Liquibase + `validate` hochkommt (Sicherheitsnetz
  gegen Baseline-Drift).
- **Risiko/Fallback:** Sollte Hibernate-`validate` auf dem SQLite-Community-Dialekt bei
  Typ-Äquivalenz zicken, Fallback = Liquibase baut das Schema, Test prüft nur sauberes
  Anwenden (ohne `validate`). Empirisch bei der Umsetzung entscheiden und im PR dokumentieren.

### 5. Dokumentation & Workflow (fester Bestandteil dieses Tickets)

- **Neuer ADR** „Liquibase statt ddl-auto"; ADR 0004 auf Status „abgelöst durch ADR 00xx".
- **Workflow verankern** (in `AGENTS.md` und `docs/`): Ab jetzt bedeutet **jede
  Schema-Änderung ein neues Changelog** (`changes/<n>-<beschreibung>.(sql|yaml)`, im Master
  eingebunden) — Entity-Änderung ohne zugehörige Migration ist unvollständig. Jede Migration
  **muss getestet** werden (der `validate`-Kontexttest fängt fehlende/fehlerhafte Migrationen ab).
- **SQLite-Spezifika** dokumentieren: kein `ALTER TABLE … DROP COLUMN/CONSTRAINT`. Liquibase
  löst das für deklarative Changesets (XML/YAML) automatisch (Table-Rebuild via
  `AlterTableVisitor`); bei formatted-SQL das Rebuild-Muster „neue Tabelle + `INSERT … SELECT` +
  `DROP` + `RENAME`" von Hand. Empfehlung: strukturelle Änderungen als YAML/XML-Changeset.
- `docs/decisions.md` und ggf. `docs/quality/` aktualisieren.

## Scope

Ein PR für #117. Backend + Doku/ADR. Keine Deploy-Pipeline-Änderung nötig (Liquibase läuft
beim App-Start). Kein Frontend.

## Nicht in Scope

- `db-reset.yml` bleibt bestehen (Test-Werkzeug); der Hinweis „nach Go-Live nicht auf prod" ist
  durch Liquibase künftig faktisch erfüllt.
- Keine fachlichen Schema-Änderungen — reine Einführung des Migrationswerkzeugs mit der
  aktuellen Struktur als Baseline.

## Akzeptanzkriterien

- Backend startet mit `ddl-auto: validate` + Liquibase-Migrationen grün (Test).
- Voller `./mvnw verify` grün (inkl. neuem Migrations-/`validate`-Test, PMD, SpotBugs, ArchUnit).
- ADR + Workflow-Doku aktualisiert; Migrations-Konvention inkl. SQLite-Spezifika dokumentiert.
