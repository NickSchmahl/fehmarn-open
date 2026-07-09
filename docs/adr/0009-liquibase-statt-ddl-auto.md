# ADR 0009 – Liquibase-Migrationen statt `ddl-auto`

**Status:** Akzeptiert · **Datum:** 2026-07-09 · **Ticket:** #117 · **Löst ab:** ADR 0004

## Kontext

Hibernate pflegte das Schema bisher über `ddl-auto: update` (ADR 0004). `update` fügt nur
hinzu und ändert/entfernt bestehende Constraints/Spalten nicht → Schema-Drift auf laufenden
DBs (#102 Enum-CHECK, #113 verwaiste `email`-Spalte). In der Testphase behalf der manuelle
`db-reset.yml`. **Nach dem ersten produktiven Go-Live ist Reset keine Option mehr** (echte
Anmeldungen). Vor Go-Live braucht es versioniertes, auch auf Prod-Daten anwendbares
Schema-Management.

## Entscheidung

Versionierte Migrationen mit **Liquibase**; Hibernate verwaltet das Schema nicht mehr.

- **Liquibase statt Flyway:** Das von Spring Boot 4.1 verwaltete **Flyway 12 unterstützt
  SQLite nicht** (kein `flyway-database-sqlite`-Modul auf Maven Central). **Liquibase 5.0.3**
  (ebenfalls von Boot gemanagt) kann SQLite nativ (`liquibase.database.core.SQLiteDatabase`,
  inkl. automatischem Table-Rebuild für ALTER-Grenzen).
- **`ddl-auto: none`** statt `validate`: Hibernate erwartet für die `Long`-`@Id` **BIGINT**,
  SQLite braucht für autoincrement aber einen **INTEGER**-PK (rowid-Alias). `validate` würde an
  diesem unauflösbaren Typkonflikt scheitern (BIGINT ⇒ validate ok, aber ID bleibt zur Laufzeit
  NULL; INTEGER ⇒ Laufzeit ok, aber validate meldet Typfehler). Daher besitzt Liquibase das
  Schema allein.
- **Baseline** `db/changelog/changes/001-init.sql` (Liquibase formatted SQL) aus dem
  Hibernate-generierten DDL abgeleitet. Adoption bestehender DBs ohne Reset über eine
  **Precondition** (`onFail: MARK_RAN`): existiert das Schema bereits, wird der Init-ChangeSet
  als angewendet markiert; leere DBs bauen frisch auf.

## Konsequenzen

- **Kontrolliertes, versioniertes Schema** — auch auf Prod-Daten anwendbar; kein Reset nach Go-Live.
- **Workflow:** Jede Schema-Änderung = neues Changelog unter `db/changelog/changes/`, im
  `db.changelog-master.yaml` eingebunden. Entity-Änderung ohne Migration ist unvollständig.
- **Sicherheitsnetz statt `validate`:** Da `validate` auf SQLite ausfällt, prüfen
  **Round-Trip-Persistenz-Tests** (`SchemaMigrationTest`, `AnmeldungRepositoryTest`) die
  Schema↔Entity-Konsistenz. Neue/geänderte Entities brauchen entsprechende Test-Abdeckung.
- **SQLite-Spezifika:** kein `ALTER TABLE … DROP COLUMN/CONSTRAINT`. Strukturelle Änderungen als
  deklaratives YAML/XML-Changeset (Liquibase baut sicher um) oder SQL-Rebuild-Muster (neue
  Tabelle + `INSERT … SELECT` + `DROP` + `RENAME`).
- `db-reset.yml` bleibt als Test-Werkzeug; für Prod durch Liquibase faktisch obsolet.

## Alternativen

- **Bei Flyway bleiben:** Erfordert Herunterpinnen auf eine alte Version unter den Boot-BOM +
  unsicheren Community-SQLite-Support. Verworfen (fragil).
- **`ddl-auto: validate`:** Auf SQLite wegen INTEGER/BIGINT-Konflikt nicht lauffähig. Verworfen.
