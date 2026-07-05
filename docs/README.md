# docs/ – Projektarbeitsordner

Zentrale Ablage für Projektkontext, Planung, Entscheidungen und die langfristige
Qualitäts-/Vertrauensstrategie. Einstiegspunkt für Menschen **und** KI-Assistenten.

## Navigation

| Bereich | Zweck |
|---------|-------|
| [`../AGENTS.md`](../AGENTS.md) | Haupt-Einstieg: Architektur, Stack, Konventionen (Kurzform) |
| [`workflow.md`](workflow.md) | Zusammenarbeit Nick ↔ Assistent (Branches, PRs, Tickets, DoD) |
| [`setup-github.md`](setup-github.md) | GitHub-Zugang für den Assistenten |
| [`deployment.md`](deployment.md) | Server, Deploy-Secrets & Hetzner-Console-Zugang |
| [`requirements.md`](requirements.md) | Anforderungen + Ist/Soll-Abgleich |
| [`backlog.md`](backlog.md) | Kurzfristige, priorisierte Aufgabenliste |
| [`decisions.md`](decisions.md) | Kurzindex → verweist auf `adr/` |
| [`changelog.md`](changelog.md) | Chronologie nennenswerter Änderungen (Kontext über PRs hinweg) |
| **[`features/`](features/)** | Was die Software kann – ein Dokument je Fachbereich |
| **[`adr/`](adr/)** | Architecture Decision Records – warum es so gebaut ist |
| **[`quality/`](quality/)** | **Teststrategie, Linting, statische Analyse, Architekturtests, CI/CD** |
| **[`tickets/`](tickets/)** | Ticket-Historie (#1–#42) + Qualitäts-Roadmap |

## Wo trage ich was ein?

| Ich will … | … dann hierhin |
|------------|----------------|
| eine neue Aufgabe festhalten | [`backlog.md`](backlog.md) bzw. [`tickets/quality-roadmap.md`](tickets/quality-roadmap.md) |
| eine Architektur-/Technikentscheidung dokumentieren | neuer ADR in [`adr/`](adr/) |
| ein Feature beschreiben/ändern | passendes Dokument in [`features/`](features/) |
| eine Qualitätsregel/Testkonvention festlegen | passendes Dokument in [`quality/`](quality/) |

## Konvention

- Änderungen an Architektur oder wichtigen Entscheidungen **immer** als ADR in
  [`adr/`](adr/) festhalten – so bleibt Kontext über Sessions und Personen hinweg erhalten.
- Doku wird im selben PR wie der Code geändert (siehe Definition of Done in
  [`workflow.md`](workflow.md)).
- Sprache: Deutsch (wie Code, Commits, UI).
