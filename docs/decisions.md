# Entscheidungslog → umgezogen nach `adr/`

Die technischen/fachlichen Entscheidungen liegen jetzt als einzelne **Architecture
Decision Records** im Ordner [`adr/`](adr/) (ein ADR je Entscheidung, unveränderlich,
mit Status). Diese Datei bleibt nur als Wegweiser bestehen.

| Nr | Titel | Status |
|----|-------|--------|
| [0001](adr/0001-sqlite-pool-1.md) | SQLite mit Hikari-Pool = 1 + busy_timeout | Akzeptiert |
| [0002](adr/0002-jwt-stateless.md) | JWT stateless statt Server-Sessions | Akzeptiert |
| [0003](adr/0003-async-mail-events.md) | Asynchroner Mailversand über Application Events | Zurückgezogen (#113) |
| [0004](adr/0004-ddl-auto-update.md) | `ddl-auto: update` statt Migrations-Tooling | Abgelöst durch 0009 |
| [0005](adr/0005-docs-agents-kontext.md) | `docs/` + `AGENTS.md` als Projektkontext | Akzeptiert |
| [0006](adr/0006-github-gh-cli.md) | GitHub-Zusammenarbeit über gh CLI | Akzeptiert |
| [0007](adr/0007-qualitaets-tooling-bigbang.md) | Qualitäts-Tooling als Big-Bang einführen | Akzeptiert |
| [0008](adr/0008-scope-reduktion-testabnahme.md) | Scope-Reduktion vor der ersten Testabnahme | Akzeptiert |
| [0009](adr/0009-liquibase-statt-ddl-auto.md) | Liquibase-Migrationen statt `ddl-auto` | Akzeptiert |

**Neue Entscheidung?** → neuen ADR in [`adr/`](adr/) anlegen (nicht mehr hier).
