---
paths:
  - "backend/src/**/*.java"
  - "backend/pom.xml"
---

# Backend-Regeln (Java 25 / Spring Boot 4)

## Vor dem Commit

`cd backend && ./mvnw spotless:apply` **und** `./mvnw verify`. Spotless formatiert Java *und*
`pom.xml`; die CI prüft mit `spotless:check` und bricht sonst ab. Vollständiges Gate:
`/quality-gate`.

## Architektur – wird von `ArchitekturTest` (ArchUnit) erzwungen

Diese Regeln sind keine Empfehlung, sie sind Testfälle in `backend/src/test/java/.../ArchitekturTest.java`:

- **Controller greifen nicht direkt auf Repositories zu** – immer über einen Service.
- Keine Zyklen zwischen Paketen.
- Namenskonventionen: Controller enden auf `Controller`, Services auf `Service`.
- Repositories sind Interfaces.
- `@Entity`-Klassen liegen ausschließlich in `..entity..`.
- **Keine Field-Injection** – Konstruktor-Injection.
- Kein Zugriff auf `System.out`/`System.err` – Logger benutzen.
- Service-Felder heißen wie ihr Typ.

Wer eine dieser Regeln ändern will, ändert erst den ADR, dann den Test – nicht umgekehrt.

## Fachlogik und Validierung

- **Fachliche Konflikt-Validierung gehört in den Service** und antwortet mit HTTP 409, nicht
  als Bean-Validation-Constraint ([ADR 0011](../../docs/adr/0011-validierung-fachlich-im-service.md)).
  Bean Validation bleibt für formale Feld-Validierung (Format, Pflichtfeld, Länge).
- `AnmeldungService` ist die Kernlogik. Neue Regeln gehören dorthin, nicht in den Controller.

## Tests

- Fachliche Tests als **`@Nested`-Klasse je Methode**
  ([ADR 0012](../../docs/adr/0012-nested-tests-fachlogik.md)) – ein `@Nested`-Block pro
  getesteter Service-Methode, darin die Fälle.
- Schnitt: `@WebMvcTest` für Controller, `@DataJpaTest` für Repositories, plain JUnit für
  Service-Logik. Details: `docs/quality/teststrategie.md`.
- Bestehende Abdeckung nicht verschlechtern.

## Nebenläufigkeit / SQLite

Der Hikari-Pool steht bewusst auf **1** plus `busy_timeout`: SQLite erlaubt nur einen Schreiber,
der Pool serialisiert Writes gegen `SQLITE_BUSY`
([ADR 0001](../../docs/adr/0001-sqlite-pool-1.md)). **Nicht hochsetzen**, ohne die
Nebenläufigkeit durchdacht und den ADR ersetzt zu haben.

## Schema

Jede Entity-Änderung (Feld, Tabelle, Constraint) braucht einen **Liquibase-Changeset**.
Ohne ihn ist die Änderung unvollständig. Ablauf: `/db-schema`.
