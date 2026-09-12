---
paths:
  - "backend/src/main/java/de/dart/fehmarnopen/entity/**"
  - "backend/src/main/resources/db/**"
---

# Achtung: Schema-relevanter Bereich

Du arbeitest gerade an einer JPA-Entity oder am Changelog. Damit gilt
[ADR 0009](../../docs/adr/0009-liquibase-statt-ddl-auto.md):

> **Kein DB-Reset. Kein Löschen der `fehmarnopen.db`.**
> Jede Schema-Änderung ist ein neuer, versionierter Liquibase-Changeset.

Hibernate fasst das Schema nicht an (`ddl-auto: none`). Eine **Entity-Änderung ohne
zugehörigen Changeset ist unvollständig** – ein neues Feld existiert in der Datenbank
schlicht nicht.

Bevor du weitermachst: **`/db-schema`** – dort steht der vollständige Ablauf
(Changeset anlegen → in `db.changelog-master.yaml` einbinden → Entity anpassen →
Round-Trip-Test → `./mvnw verify`).

Drei Fallen:

1. **Bestehende Changesets sind eingefroren.** Liquibase prüft Checksummen. Korrektur =
   neuer Changeset, nie eine Änderung am alten.
2. **SQLite kann kein `DROP COLUMN` und keine CHECK-Constraint-Änderung.** Strukturelle
   Umbauten als deklaratives YAML/XML-Changeset oder als Rebuild
   (neue Tabelle → `INSERT … SELECT` → `DROP` → `RENAME`).
3. **`ddl-auto: validate` läuft auf SQLite nicht** (INTEGER-PK vs. BIGINT-Erwartung).
   Das Sicherheitsnetz sind Tests: `SchemaMigrationTest` und die Repository-Tests
   müssen neue/geänderte Werte abdecken.
