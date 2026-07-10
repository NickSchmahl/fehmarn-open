# DB-Schema ändern – Anleitung (Liquibase)

Diese Anleitung beschreibt **verbindlich und vollständig**, was passieren muss, wenn sich das
Datenbankschema ändert (neue Spalte/Tabelle, geänderter Constraint, neuer Enum-Wert, …).
Sie richtet sich an **alle** – Menschen wie KI-Assistenten. Das *Warum* steht in
[ADR 0009](adr/0009-liquibase-statt-ddl-auto.md); hier steht das *Wie*.

## Grundregel (bitte merken)

> **Kein DB-Reset. Kein Löschen der `fehmarnopen.db`.**
> Jede Schema-Änderung ist ein **neuer, versionierter Liquibase-Changeset**. Liquibase wendet
> ihn beim Start automatisch auf die bestehende DB an – auch auf Produktion mit echten Daten.

Hibernate verwaltet das Schema **nicht** (`spring.jpa.hibernate.ddl-auto: none`). Eine
Entity-Änderung **ohne** passenden Changeset ist unvollständig und schlägt spätestens im Test
fehl. Der frühere Behelf „DB löschen, Hibernate baut neu" (aus der `ddl-auto: update`-Zeit) ist
**seit [ADR 0009](adr/0009-liquibase-statt-ddl-auto.md) (#117) überholt** und darf nicht mehr
genannt oder gemacht werden.

## Ablauf (Schritt für Schritt)

1. **Neue Changeset-Datei anlegen** unter
   `backend/src/main/resources/db/changelog/changes/`.
   Namensschema: fortlaufende Nummer + sprechender Kurztitel, z. B.
   `002-add-u18-disziplin.sql`. Nummern **nie** wiederverwenden, Reihenfolge = Anwendungsreihenfolge.

2. **Changeset einbinden** in
   [`db/changelog/db.changelog-master.yaml`](../backend/src/main/resources/db/changelog/db.changelog-master.yaml)
   als weiteren `include`-Eintrag **am Ende** (nach `001-init.sql`).

3. **Bestehende Changesets nie nachträglich ändern.** Einmal ausgelieferte Changesets sind
   eingefroren (Liquibase merkt sich ihre Checksumme). Korrekturen = **neuer** Changeset.

4. **Entity/Code anpassen**, sodass JPA-Modell und neues Schema zusammenpassen.

5. **Round-Trip-Test ergänzen/anpassen.** Da `ddl-auto: validate` auf SQLite nicht läuft
   (siehe ADR 0009), sichern Persistenz-Tests die Schema↔Entity-Konsistenz ab:
   [`SchemaMigrationTest`](../backend/src/test/java/de/dart/fehmarnopen/db/SchemaMigrationTest.java)
   und die Repository-Tests (z. B.
   [`AnmeldungRepositoryTest`](../backend/src/test/java/de/dart/fehmarnopen/repository/AnmeldungRepositoryTest.java)).
   Neue/geänderte Werte dort mit abdecken. Die Tests fahren dieselben Changesets wie Prod
   (`ddl-auto: none` auch in `application-test.yaml`) → ein kaputter Changeset fällt hier auf.

6. **`./mvnw verify`** lokal grün ziehen (führt die Migration mit aus).

## SQLite-Sonderfall: Constraint / Enum-Wert ändern

SQLite kann **keinen** `ALTER TABLE … DROP/ADD CONSTRAINT` und **kein** `DROP COLUMN` auf
ältere CHECK-Constraints. Beispiel: Die Disziplin-Liste steckt als CHECK in
[`001-init.sql`](../backend/src/main/resources/db/changelog/changes/001-init.sql):

```sql
disziplin varchar(255) not null
    check ((disziplin in ('HERRENEINZEL','DAMENEINZEL','HERRENDOPPEL','DAMENDOPPEL','TRIPLE_MIX','TEAMWETTBEWERB')))
```

Um einen Wert (z. B. `U18`) zu ergänzen, muss die Tabelle **umgebaut** werden. Zwei Wege:

- **Deklaratives Changeset (bevorzugt):** die Änderung als Liquibase-YAML/XML formulieren –
  Liquibase erkennt die SQLite-ALTER-Grenze und macht den Tabellen-Rebuild sicher selbst.
- **SQL-Rebuild-Muster (manuell):** neue Tabelle mit erweitertem CHECK anlegen →
  `INSERT … SELECT` alte Daten kopieren → alte Tabelle `DROP` → neue `RENAME`.
  Auf Fremdschlüssel/Reihenfolge achten.

Beides läuft als normaler Changeset (Schritte 1–6 oben) – **ohne** Reset.

## Kurz-Checkliste

- [ ] Neuer Changeset unter `changes/`, im Master eingebunden
- [ ] Kein bestehender Changeset verändert
- [ ] Entity/Code passend
- [ ] Persistenz-/Schema-Test deckt die Änderung ab
- [ ] `./mvnw verify` grün
- [ ] **Nirgends** von „DB-Reset" die Rede
