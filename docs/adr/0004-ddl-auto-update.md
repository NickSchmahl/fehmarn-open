# ADR 0004 – `ddl-auto: update` statt Migrations-Tooling

**Status:** Akzeptiert (befristet) · **Datum:** aus Code rekonstruiert (#4)

## Kontext
Das DB-Schema muss zum JPA-Entity-Modell passen. Das Projekt ist jung, das Schema
ändert sich häufig.

## Entscheidung
Hibernate pflegt das Schema selbst über **`spring.jpa.hibernate.ddl-auto: update`**.
Kein Migrations-Tooling (Flyway/Liquibase).

## Konsequenzen
- Schnelle Iteration in der Entwicklungsphase, kein Migrations-Overhead.
- **Kein kontrolliertes, versioniertes Schema.** `update` fügt hinzu, entfernt/ändert
  aber nichts sauber → riskant, sobald **schützenswerte Prod-Daten** existieren.
- Bei Entity-Änderungen daran denken, dass Alt-Spalten liegenbleiben können.

## Geplante Ablösung
Sobald Prod-Daten schützenswert sind: auf **Flyway** umstellen (versionierte
Migrationen, `ddl-auto: validate`). Bereits im Backlog vermerkt. Wird ein eigener
ADR, wenn umgesetzt.

## Alternativen
- Flyway/Liquibase von Anfang an: mehr Disziplin, in der frühen Explorationsphase aber
  bewusst zurückgestellt.
