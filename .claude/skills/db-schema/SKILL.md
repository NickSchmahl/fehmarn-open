---
name: db-schema
description: Ändert das Datenbankschema regelkonform als Liquibase-Changeset – neue Spalte, Tabelle, Constraint oder Enum-Wert. Kein DB-Reset, kein Löschen der fehmarnopen.db. Auch benutzen, wenn eine JPA-Entity ein Feld bekommt oder verliert.
---

# Schema-Änderung (Liquibase)

Vollständige Anleitung: [`docs/datenbank-schema-aendern.md`](../../../docs/datenbank-schema-aendern.md).
Das *Warum*: [ADR 0009](../../../docs/adr/0009-liquibase-statt-ddl-auto.md). Lies die Anleitung,
bevor du die erste Datei anfasst – hier steht nur der Ablauf im Überblick.

## Grundregel

> **Kein DB-Reset. Kein Löschen der `fehmarnopen.db`.**

Hibernate verwaltet das Schema nicht (`ddl-auto: none`). Jede Schema-Änderung ist ein neuer,
versionierter Changeset, den Liquibase beim Start auf die **bestehende** DB anwendet – auch
auf Produktion mit echten Daten. Der alte Behelf „DB löschen, Hibernate baut neu" stammt aus
der `ddl-auto: update`-Zeit und ist seit ADR 0009 (#117) überholt.

## Ablauf

1. **Changeset anlegen** unter `backend/src/main/resources/db/changelog/changes/`,
   Namensschema `<fortlaufende-nr>-<kurztitel>.sql` (z. B. `002-add-u18-disziplin.sql`).
   Nummern nie wiederverwenden – die Reihenfolge ist die Anwendungsreihenfolge.
2. **Einbinden** in `db/changelog/db.changelog-master.yaml` als weiteren `include`-Eintrag
   **am Ende**.
3. **Bestehende Changesets nie nachträglich ändern.** Liquibase merkt sich die Checksumme;
   ausgelieferte Changesets sind eingefroren. Korrektur = neuer Changeset.
4. **Entity/Code anpassen**, sodass JPA-Modell und Schema zusammenpassen.
5. **Round-Trip-Test ergänzen.** `ddl-auto: validate` läuft auf SQLite nicht (INTEGER-PK vs.
   BIGINT), deshalb sind Tests das Sicherheitsnetz: `SchemaMigrationTest` und die
   Repository-Tests. Neue/geänderte Werte dort mit abdecken.
6. **`cd backend && ./mvnw verify`** grün ziehen – fährt die Migration mit.

## SQLite-Sonderfälle

SQLite kann **kein** `ALTER TABLE … DROP COLUMN` und **kein** Ändern/Löschen bestehender
CHECK-Constraints. Strukturelle Änderungen deshalb entweder

- als deklaratives YAML/XML-Changeset (Liquibase baut die Tabelle sicher um), oder
- als SQL-Rebuild: neue Tabelle → `INSERT … SELECT` → `DROP` → `RENAME`.

Beispiel Disziplin-Liste: die steckt als CHECK-Constraint in `001-init.sql`. Ein neuer
Disziplin-Wert braucht deshalb einen Rebuild, kein simples `ALTER`.

## Woran du merkst, dass du falsch abbiegst

- Du willst die `.db`-Datei löschen oder anfassen → **stopp**, lies ADR 0009.
- Du willst `ddl-auto` umstellen → **stopp**, das ist eine ADR-Entscheidung.
- Du änderst eine Entity und schreibst keinen Changeset → die Änderung ist unvollständig.
