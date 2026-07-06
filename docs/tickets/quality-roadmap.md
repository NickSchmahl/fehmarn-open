# Qualitäts- & Vertrauens-Roadmap

> **Quelle der Wahrheit sind die GitHub-Issues.** Diese Datei ist nur die Übersicht
> mit Verweisen. Sammelticket: **#55 – 🎯 Qualitäts-Härtung (Big-Bang)**.
> Strategie/Details je Thema: [quality/](../quality/). Prinzip: [ADR 0007](../adr/0007-qualitaets-tooling-bigbang.md)
> (Tool + Bestand konform + CI-Gate in **einem** PR, `main` bleibt grün).

## Qualitäts-Big-Bang (aktuelle Arbeit) — GitHub-Issues

Reihenfolge = empfohlene Abarbeitung.

| # | Issue | Bereich | Doku |
|---|-------|---------|------|
| 1 | [#44](https://github.com/NickSchmahl/fehmarn-open/issues/44) Frontend: ESLint streng | Frontend | [frontend-code-qualitaet](../quality/frontend-code-qualitaet.md) |
| 2 | [#45](https://github.com/NickSchmahl/fehmarn-open/issues/45) Frontend: Prettier als CI-Gate | Frontend | [frontend-code-qualitaet](../quality/frontend-code-qualitaet.md) |
| 3 | [#46](https://github.com/NickSchmahl/fehmarn-open/issues/46) Frontend: Import-/Architekturgrenzen | Frontend | [frontend-architektur-tests](../quality/frontend-architektur-tests.md) |
| 4 | [#47](https://github.com/NickSchmahl/fehmarn-open/issues/47) Frontend: Coverage-Gate (Jest) | Frontend | [coverage](../quality/coverage.md) |
| 5 | [#48](https://github.com/NickSchmahl/fehmarn-open/issues/48) Backend: Spotless verschärfen | Backend | [backend-code-qualitaet](../quality/backend-code-qualitaet.md) |
| 6 | [#49](https://github.com/NickSchmahl/fehmarn-open/issues/49) Backend: ArchUnit | Backend | [backend-architektur-tests](../quality/backend-architektur-tests.md) |
| 7 | [#50](https://github.com/NickSchmahl/fehmarn-open/issues/50) Backend: SpotBugs + FindSecBugs + PMD | Backend | [backend-code-qualitaet](../quality/backend-code-qualitaet.md) |
| 8 | [#51](https://github.com/NickSchmahl/fehmarn-open/issues/51) Backend: Coverage-Gate (JaCoCo) | Backend | [coverage](../quality/coverage.md) |
| 9 | [#52](https://github.com/NickSchmahl/fehmarn-open/issues/52) Deploy an grüne CI koppeln | CI/CD | [ci-cd](../quality/ci-cd.md) |
| 10 | [#53](https://github.com/NickSchmahl/fehmarn-open/issues/53) Dependabot + CodeQL | CI/CD | [ci-cd](../quality/ci-cd.md) |
| 11 | [#54](https://github.com/NickSchmahl/fehmarn-open/issues/54) Branch Protection (zuletzt) | CI/CD | [ci-cd](../quality/ci-cd.md) |

## Status (Stand 2026-07-06)

- ✅ **Erledigt & auf `main`:** #44, #45, #46, #47, #48, #49, #50, #52, #53, #54.
  - #49 (ArchUnit) über PR #93 wiederhergestellt (`archunit-junit5` + `ArchitekturTest.java`), verifiziert.
  - #50 (SpotBugs/FindSecBugs/PMD) über PR #91 auf `main`, verifiziert.
  - #54 (Branch Protection) via UI als Repository-Ruleset gesetzt und **funktional getestet**
    (Direktpush auf `main` abgelehnt: `GH013: 2 of 2 required status checks are expected`).
- ⛔ **#51 (JaCoCo) — `wontfix` (Entscheidung 2026-07-06).** Das Backend-Coverage-Gate
  war trotz gemergter PR #62 nie auf `main` (`git log -S jacoco -- backend/pom.xml` =
  null Treffer). Statt es nachzuholen, ist bewusst entschieden: **Coverage wird nicht
  als harte Zwangsgrenze erzwungen.** Damit ist auch das Frontend-Pendant (#47) bewusst
  ohne `coverageThreshold` — Coverage bleibt messbar (`npm run test:coverage`), aber
  ungated. Die übrigen Gates (Format, Lint, statische Analyse, ArchUnit, Tests) bleiben scharf.
- ✅ **Epic #55 abgeschlossen** — alle Härtungs-Tickets erledigt oder bewusst `wontfix`.

## Noch nicht als Issue angelegt (kommt, wenn dran)

Bewusst noch nicht geticketet, um den Tracker fokussiert zu halten. Wird zum Issue,
sobald wir es angehen:

**Cleanup / Scope-Reduktion** ([ADR 0008](../adr/0008-scope-reduktion-testabnahme.md))
- Anmeldeschluss-Code entfernen (`TurnierConfig`, `AnmeldungGesperrtException`, Handler). *(Die Build-Issues #16/#17 wurden als `wontfix` geschlossen.)*
- Bestätigungsmail-Trigger kappen (kein Versand mehr), Mail-Code behalten. *(Bezug: #43, on hold.)*
- Abmelde-Teilcode aufräumen — **zurückgestellt**, vorerst liegen lassen. *(Build-Issues #18/#20 als `wontfix` geschlossen.)*

**Weitere Backend-/Test-Härtung (P3)**
- Error Prone + NullAway — erst wenn Java-25-Support gesichert (Folge von #50).
- Ein-Artefakt-Deploy (CI baut, Deploy nutzt Artifact) + Post-Deploy-Smoke-Test (Folge von #52).
- Regressionstest gleichzeitige Writes (SQLITE_BUSY), E2E-Smoke (Playwright), Flyway-Migration ([ADR 0004](../adr/0004-ddl-auto-update.md)).
- Frontend-Aufräumen: leeren `src/app/tmp/` entfernen, `vitest`-Dependency prüfen.

## Feature-Arbeit (NACH dem Qualitäts-Big-Bang)

Nicht Teil dieser Härtungsphase. Vorhandene/relevante Issues:
- **Flyer-Upload**: #29, #30 (Backend), #31 (Admin-FE), #32 (öffentliche Ansicht), #33 (Admin-Nav) — vor Testabnahme.
- **QR-Code** für Anmeldelink — gewünscht (Issue anlegen, wenn dran).
- **Excel-Export** — verschoben.

Scope/Begründung: [ADR 0008](../adr/0008-scope-reduktion-testabnahme.md), [features/admin.md](../features/admin.md).
