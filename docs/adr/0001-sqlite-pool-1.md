# ADR 0001 – SQLite mit Hikari-Pool = 1 + busy_timeout

**Status:** Akzeptiert · **Datum:** aus Code rekonstruiert (Commit `80022cf`)

## Kontext
Die Anwendung nutzt SQLite als Datenbank. SQLite erlaubt nur **einen Schreiber
gleichzeitig**. Bei gleichzeitigen Writes (beobachtet bei Team-Aktionen) trat
`SQLITE_BUSY` auf und Requests schlugen fehl.

## Entscheidung
- Hikari-Connection-Pool auf **`maximum-pool-size: 1`** setzen → gleichzeitige Writes
  serialisieren sich am Pool statt mit Fehler abzubrechen.
- Zusätzlich `PRAGMA busy_timeout = 5000` als Sicherheitsnetz (`connection-init-sql`).

## Konsequenzen
- Kein echter Write-Parallelismus. Für die erwartete Last (Turnier-Anmeldungen)
  unkritisch.
- **Nicht** blind hochsetzen – höhere Pool-Größe bringt `SQLITE_BUSY` zurück. Wer den
  Wert ändert, muss über Nebenläufigkeit nachdenken.
- Empfehlung Qualität: ein Regressionstest für gleichzeitige Writes (siehe
  [teststrategie.md](../quality/teststrategie.md)).

## Alternativen
- Wechsel auf Server-DB (PostgreSQL): mehr Betrieb, für Projektgröße unnötig.
- WAL-Modus: mildert, löst das Ein-Schreiber-Prinzip aber nicht grundsätzlich.
