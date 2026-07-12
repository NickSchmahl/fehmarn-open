# Architecture Decision Records (ADR)

Chronologisches, unveränderliches Log wichtiger technischer/fachlicher Entscheidungen.
Ein ADR je Entscheidung. Bestehende ADRs werden nicht umgeschrieben – überholte
Entscheidungen bekommen ein neues ADR mit Status „ersetzt durch …".

**Format je ADR:** Kontext → Entscheidung → Konsequenzen (→ Alternativen).
**Status:** `Akzeptiert` · `Ersetzt` · `Verworfen`.

| Nr | Titel | Status |
|----|-------|--------|
| [0001](0001-sqlite-pool-1.md) | SQLite mit Hikari-Pool = 1 + busy_timeout | Akzeptiert |
| [0002](0002-jwt-stateless.md) | JWT stateless statt Server-Sessions | Akzeptiert |
| [0003](0003-async-mail-events.md) | Asynchroner Mailversand über Application Events | Zurückgezogen (#113) |
| [0004](0004-ddl-auto-update.md) | `ddl-auto: update` statt Migrations-Tooling | Akzeptiert (befristet) |
| [0005](0005-docs-agents-kontext.md) | `docs/` + `AGENTS.md` als Projektkontext | Akzeptiert |
| [0006](0006-github-gh-cli.md) | GitHub-Zusammenarbeit über gh CLI | Akzeptiert |
| [0007](0007-qualitaets-tooling-bigbang.md) | Qualitäts-Tooling als Big-Bang einführen | Akzeptiert |
| [0008](0008-scope-reduktion-testabnahme.md) | Scope-Reduktion vor der ersten Testabnahme | Akzeptiert |
| [0009](0009-liquibase-statt-ddl-auto.md) | Liquibase-Migrationen statt `ddl-auto` | Akzeptiert |
| [0010](0010-tls-reverse-proxy.md) | HTTPS/TLS über Reverse Proxy (Caddy) | Akzeptiert |
| [0011](0011-validierung-fachlich-im-service.md) | Fachliche Konflikt-Validierung im Service (409) statt Bean-Validation-Constraint | Akzeptiert |
| [0012](0012-nested-tests-fachlogik.md) | `@Nested`-Testklassen je Methode für fachliche Tests | Akzeptiert |
| [0013](0013-anmeldeschluss-config-statt-db.md) | Anmeldeschluss als Server-Config statt DB | Akzeptiert |
| [0014](0014-signals-immutable-daten.md) | Signals halten unveränderliche Daten (kein In-place-Mutieren) | Akzeptiert |

> Neuen ADR anlegen: nächste freie Nummer, Dateiname `NNNN-kurz-titel.md`, Zeile hier ergänzen.
