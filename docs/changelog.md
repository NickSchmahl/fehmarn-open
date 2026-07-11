# Änderungslog

Chronologischer Überblick über nennenswerte Änderungen (neueste zuerst). Ergänzt
die feingranulare Git-Historie um **Kontext und Begründung** über einzelne PRs
hinweg. Architekturentscheidungen liegen als [ADR](adr/), Ticket-Status in
[tickets/quality-roadmap.md](tickets/quality-roadmap.md).

## 2026-07-11 — Anmeldeschluss 28.02.2027 (#153)

Nach dem Anmeldeschluss sind keine Online-Anmeldungen mehr möglich, damit Finn planen kann.

- **Deadline als Server-Config:** `fehmarnopen.anmeldung.anmeldeschluss` (Default `2027-02-28`,
  ENV `ANMELDESCHLUSS`), ausgewertet im `AnmeldeschlussService` (Zeitzone Europe/Berlin, inklusive
  bis Tagesende). Begründung Config-statt-DB in [ADR 0013](adr/0013-anmeldeschluss-config-statt-db.md).
- **Backend-Sperre:** `POST /api/anmeldung` nach Ablauf → `AnmeldungGesperrtException` → **403**.
- **Frontend:** `GET /api/anmeldung/status` steuert die Anmeldeseite – nach Ablauf erscheint eine
  Infoseite statt des Formulars.
- **Aufräumen:** die ungenutzte Tabelle `turnier_config` + Entity entfernt (Changeset `003`).

## 2026-07-06 — Status-Abgleich Quality-Gate: Issues geradegezogen

Kontrolle, ob wirklich alles zum Quality-Gate auf `main` liegt, und Aufräumen der
Ticket-Wahrheit gegen den tatsächlichen Repo-Stand.

- **#54 Branch Protection — verifiziert & geschlossen.** `main` ist über ein
  Repository-Ruleset „Main Branch protection" (enforcement=active) geschützt:
  Required checks `backend`+`frontend`, Deletion + Non-fast-forward blockiert.
  Funktional getestet — Direktpush auf `main` wird abgelehnt
  (`GH013: 2 of 2 required status checks are expected`). Damit ist die letzte
  offene CI/CD-Lücke (L5) zu; [quality/ci-cd.md](quality/ci-cd.md) aktualisiert.
- **#49 (ArchUnit) & #50 (SpotBugs/FindSecBugs/PMD) — verifiziert & geschlossen.**
  #49 ist über PR #93 wiederhergestellt (`archunit-junit5` + `ArchitekturTest.java`),
  #50 über PR #91 auf `main`. Beide Plugins/Testklassen im Repo bestätigt.
- **⛔ #51 (JaCoCo) — `wontfix`.** Das Plugin war trotz gemergter PR #62 nie auf
  `main` (`git log -S jacoco -- backend/pom.xml` = null Treffer). Statt es nachzuholen,
  bewusst entschieden: **Coverage wird nicht als harte Zwangsgrenze erzwungen** —
  ein Schritt zu viel für dieses Projekt. Coverage bleibt messbar
  (`npm run test:coverage` bzw. JaCoCo-Report on demand), aber kein Build-brechendes
  Gate. Gilt symmetrisch fürs Frontend (#47 ohne `coverageThreshold`). Die übrigen
  Gates (Format, Lint, statische Analyse, ArchUnit, Tests) bleiben scharf.
- **✅ Epic #55 (Qualitäts-Big-Bang) geschlossen** — alle Tickets erledigt oder
  bewusst `wontfix` (#51).

## 2026-07-05 — Dependency-Härtung & Abschluss Qualitäts-Big-Bang

Nachdem Dependabot/CodeQL (#53) auf `main` gelandet waren, kam eine Welle von
Update-PRs herein. Diese Session hat sie kontrolliert abgearbeitet und den
Qualitäts-Big-Bang (Epic #55) fast abgeschlossen.

### CI / Security
- **CodeQL-Action `@v3` → `@v4`** (`.github/workflows/codeql.yml`). Behebt die
  Node-20-Deprecation der Runner **und** die v3-Action-Abkündigung in einem Schritt.
  Wartungsregel dazu in [quality/ci-cd.md](quality/ci-cd.md).
- **Dependabot: Angular als eine Gruppe** (#84, `.github/dependabot.yml`). Der
  Angular-Major kam vorher als 5+ Einzel-PRs; jetzt bündelt die Gruppe `angular`
  (`@angular/*`, `angular-eslint`, `jest-preset-angular`, `typescript`) inkl. Major
  zu **einer** PR. Dazu die **Dependabot-Merge-Policy** in
  [quality/ci-cd.md](quality/ci-cd.md): minor/patch mergen, Framework-Majors von
  Hand via `ng update` / Migrationsguide.

### Frontend
- **Angular 21 → 22** (#87), via `ng update` (nicht per Dependabot-Merge). Alle
  `@angular/*` 22.0.5, `angular-eslint` 22, `jest-preset-angular` 17,
  **TypeScript 6.0** (von `ng update` gesetzt). Nacharbeit: migrationsgesetztes
  `ChangeDetectionStrategy.Eager` wieder entfernt (kollidierte mit `prefer-on-push`),
  `withFetch()` entfernt (in v22 Default), v22-Diagnostics-Suppression ersatzlos
  gestrichen (Code löste sie nicht aus).
- **Node im Build angehoben**: `frontend-maven-plugin` `<nodeVersion>` v22.13.0 →
  **v22.23.1** (`backend/pom.xml`). Angular 22 verlangt Node ≥ 22.22.3; der
  Maven-Frontend-Build scheiterte sonst (der CI-`frontend`-Job über `setup-node@22`
  war nicht betroffen).
- **ESLint 9 → 10** (#90). ESLint 10 hat `@eslint/js` entkoppelt → als explizite
  devDependency ergänzt (`eslint.config.js` braucht es weiter). `typescript-eslint 8`
  und `angular-eslint 22` unterstützen ESLint 10 bereits.

### Backend
- **Statische Analyse (#50, in Review: PR #91)** — SpotBugs + FindSecBugs + PMD an
  `verify`. Java-25-Stolpersteine: SpotBugs' ASM auf 9.10.1 (kannte class version 69
  nicht), PMD `targetJdk=24` (Plugin kennt „25" noch nicht). Details:
  [quality/backend-code-qualitaet.md](quality/backend-code-qualitaet.md) Abschnitt 6.

### Offen / zu prüfen
- **#54 Branch Protection** — noch nicht gesetzt: das fine-grained GitHub-Token hat
  keine „Administration"-Berechtigung (403). Vorgehen + fertiger Befehl in
  [quality/ci-cd.md](quality/ci-cd.md), Abschnitt Branch Protection.
- **⚠️ #49 (ArchUnit) und #51 (JaCoCo)** sind auf GitHub als *completed* geschlossen,
  aber auf `main` ist **keine Implementierung** vorhanden (kein Plugin in `pom.xml`,
  keine ArchUnit-Tests). Vermutlich in der zwischenzeitlichen `main`-Divergenz
  verloren oder verfrüht geschlossen. **Verifizieren und ggf. wieder öffnen.**

### Aufgeräumt
- Zerstückelte Dependabot-Angular-PRs geschlossen (#72/#73/#75/#77/#81/#85/#86/#89),
  ebenso #88 (durch #90 ersetzt).
- Lokaler `main` war von `origin/main` abgedriftet (ohne Upstream-Tracking) und
  wurde geradegezogen; der lokale Commit „deployment info" war bereits als
  `f63d7bc` auf `origin/main` (docs/deployment.md).
