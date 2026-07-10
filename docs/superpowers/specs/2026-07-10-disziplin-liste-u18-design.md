# Design: Disziplin-Liste an Flyer 2027 angleichen + U18 (#151)

**Datum:** 2026-07-10 · **Ticket:** [#151](https://github.com/NickSchmahl/fehmarn-open/issues/151)
· **Quelle:** PO-Feedback Finn (2026-07-10) + Flyer „12. Fehmarn Open 2027"

## Ziel

Die Disziplin-Liste in Backend und Frontend an den Flyer 2027 angleichen:
chronologische Reihenfolge nach Turnierzeitpunkt **und** ein neues, kostenloses
**U18-Turnier** ergänzen.

## Ziel-Reihenfolge (lt. Flyer)

1. Teamwettbewerb — Fr 05.03.
2. Herreneinzel — Sa 06.03.
3. Dameneinzel — Sa 06.03.
4. **U18-Turnier** — Sa 06.03. *(neu)*
5. Triple Mix — Sa 06.03.
6. Herrendoppel — So 07.03.
7. Damendoppel — So 07.03.

## U18-Regeln (Entscheidung Nick, 2026-07-10)

- **1 Spieler** pro Meldung (Einzel-Format), **kein** Teamname-Feld.
- **Offen** für alle unter 18 – keine Geschlechtertrennung.
- **Kostenlos** (0 €); der sonstige 10-€-pro-Spieler-Preis gilt nicht.
- **Keine technische Alterskontrolle** — U18 verhält sich wie ein Einzel ohne
  Geschlechtertrennung; das Geburtsdatum wird nicht gegen ein Höchstalter geprüft.
  Verantwortung liegt beim Melder/Orga.

## Umsetzung

### 1. Backend-Enum

[`Disziplin.java`](../../../backend/src/main/java/de/dart/fehmarnopen/entity/Disziplin.java)
in Flyer-Reihenfolge umsortieren und `U18("U18-Turnier")` an Position 4 einfügen:

```
TEAMWETTBEWERB, HERRENEINZEL, DAMENEINZEL, U18, TRIPLE_MIX, HERRENDOPPEL, DAMENDOPPEL
```

Die Disziplin wird als `@Enumerated(EnumType.STRING)` gespeichert → Umsortieren ist
DB-sicher (gespeichert wird der Name, nicht die Position).

### 2. Liquibase-Changeset (kein DB-Reset)

Neuer Changeset
`backend/src/main/resources/db/changelog/changes/002-add-u18-disziplin.sql`
im **Formatted-SQL-Rebuild-Stil** wie `001-init.sql`, eingebunden im
`db.changelog-master.yaml` (nach `001-init`). Da SQLite keinen
`ALTER TABLE … DROP/ADD CONSTRAINT` kann, wird die `anmeldung`-Tabelle umgebaut:

1. neue Tabelle (`anmeldung_neu`) mit CHECK-Constraint inkl. `'U18'`,
2. `INSERT … SELECT` alle Bestandsdaten kopieren,
3. alte Tabelle `DROP`,
4. `anmeldung_neu` → `RENAME` auf `anmeldung`.

Kein DB-Reset — Liquibase migriert bestehende DBs beim Start. Anleitung:
[`docs/datenbank-schema-aendern.md`](../../datenbank-schema-aendern.md).

### 3. Backend-Validierung

[`SpielerValidierungService`](../../../backend/src/main/java/de/dart/fehmarnopen/service/SpielerValidierungService.java):
neuer `case U18 -> pruefeSpielerzahl(disziplin, anzahlSpieler, 1, 1)`. Die
Radikal-ID-Regel je Spieler gilt unverändert für alle Disziplinen.

### 4. Teamname bei U18 (bewusste Entscheidung)

Das Frontend zeigt für U18 – wie für die Einzeldisziplinen – **kein** Teamname-Feld
und sendet keinen Teamnamen. Das Backend bleibt **unverändert**: Es erzwingt schon
heute bei keiner teamlosen Disziplin (Herren-/Dameneinzel) die Abwesenheit eines
Teamnamens (`AnmeldungService` speichert `teamName` unbesehen; der
`SpielerValidierungService` erhält ihn gar nicht). U18 wird konsistent so behandelt.

Bewusst **nicht** umgesetzt: eine neue Backend-Ablehnung „teamlose Disziplin darf
keinen Teamnamen haben". Das würde den Validierungsservice umbauen und *auch*
Herren-/Dameneinzel neu einschränken (Scope-Ausweitung, Risiko fürs Bestandsverhalten).
Der ursprüngliche Ticket-Testfall „U18 mit gesetztem Teamname → abgelehnt" wird
entsprechend zu „Frontend bietet für U18 kein Teamname-Feld" präzisiert.

### 5. Frontend-Modell

[`disziplin.ts`](../../../frontend/src/app/shared/disziplin.ts):

- `Disziplin`-Union und `DISZIPLINEN`-Array um `'U18'` erweitern, Array in
  Flyer-Reihenfolge bringen.
- U18-Eintrag: `label: 'U18-Turnier'`, `subtitle: ''`, `teamName: false`,
  `minSpieler: 1`, `maxSpieler: 1`.
- Neues Feld `preisProSpieler: number` in `DisziplinMeta` (U18 = `0`, alle anderen
  = `10`). Die bisherige Konstante `PREIS_PRO_SPIELER` wandert damit ins Meta-Modell.

### 6. Frontend-Preis

[`anmeldung.component.ts`](../../../frontend/src/app/pages/anmeldung/anmeldung.component.ts):

- `betrag = spielerAnzahl * meta.preisProSpieler` (statt fixer Konstante).
- Die U18-Position zeigt **„kostenlos"** statt eines Betrags; der Beitrag `0 €`
  fließt regulär (mit +0) in die Gesamtsumme.
- Die Anzeige des „pro Spieler"-Hinweises je Disziplin folgt `preisProSpieler`.

### 7. Übersichten

Teilnehmer- und Admin-Übersicht erben die Reihenfolge automatisch, sofern sie über
das Enum bzw. `DISZIPLINEN` iterieren. Beim Umsetzen verifizieren; falls irgendwo
eine feste Reihenfolge dupliziert ist, dort nachziehen.

## Tests

**Backend**
- `SpielerValidierungService`: U18 mit 1 Spieler gültig; mit 2 Spielern abgelehnt.
- Schema-Round-Trip: eine persistierte `U18`-Anmeldung lässt sich speichern und laden
  (`SchemaMigrationTest` / `AnmeldungRepositoryTest`); Migration läuft in `./mvnw verify` mit.
- Bestandsanmeldungen anderer Disziplinen bleiben nach Umsortierung korrekt lesbar.

**Frontend**
- Disziplin-Auswahl zeigt die 7 Disziplinen in Ziel-Reihenfolge; U18 an Position 4.
- U18 wählen → genau **eine** Spielerzeile, **kein** Teamname-Feld.
- U18-Meldung → Position „kostenlos"/0 €, Beitrag 0 € in der Summe; eine 10-€-Disziplin
  daneben zählt normal.

## Nicht im Scope

- Technische Alterskontrolle für U18.
- Zentrale Teamname-Abwesenheits-Validierung für teamlose Disziplinen (siehe §4).
- Anzeige von Tag/Datum je Disziplin (eigenes Ticket #155).
