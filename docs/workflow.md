# Workflow – Zusammenarbeit Nick & KI-Assistent

Vereinbart am 2026-07-04. Ziel: guter, wiederholbarer Ablauf bis zur ersten
Testabnahme und darüber hinaus.

## Rollen

- **Nick:** Product Owner + Reviewer. Entscheidet Prioritäten, testet Abnahmen,
  merged PRs, betreibt Server/Deployment.
- **KI-Assistent:** Umsetzung. Arbeitet im lokalen Ordner `fehmarn-open`,
  legt Feature-Branches an, committet, öffnet PRs, hält `docs/` aktuell.

## GitHub-Zugang

Vereinbart: **gh CLI**. Bevorzugter Weg ist **Claude Code** direkt auf Nicks
Maschine – dort nutzt der Assistent die einmalig per `gh auth login` eingerichtete
Anmeldung, kein Token muss in die Konversation eingegeben werden.

In **Cowork** (isolierte Sandbox) als Fallback: Token pro Session als Env-Variable
(`GH_TOKEN` / `GITHUB_TOKEN`), **nie in Dateien**.

Setup-Details siehe `docs/setup-github.md`.

Letzter Fallback ohne jeden Zugang: Der Assistent committet lokal auf einem
Branch, Nick pusht/merged selbst.

## Branch- & Commit-Konvention

- Ein **Feature-Branch pro Ticket**: `feat/<nr>-kurzbeschreibung`,
  `fix/<nr>-kurzbeschreibung`, `chore/...`.
- Commits deutsch, mit Issue-Referenz: `#42 abmeldelink-mail korrigieren`.
- **Vor jedem Commit die vollständige, CI-äquivalente Quality-Gate lokal laufen**
  (nicht nur eine Teilmenge – sonst wird die CI rot):
  - Backend: `./mvnw spotless:apply` (bzw. `spotless:check`) + `./mvnw verify`.
  - Frontend (`frontend/`): `npm run lint` **und** `npm test` **und**
    `npm run format:check`. ESLint (`strict-type-checked`) ist ein CI-Gate – nur
    Jest + Prettier zu prüfen reicht **nicht**.
- **Nur bewusst gewählte Dateien stagen** (`git add <pfad>`), **kein `git add -A`**
  – sonst geraten fremde/versehentliche Dateien in den Commit.

## Ticket-Ablauf

1. Neue Aufgabe → als Eintrag in `docs/backlog.md` (und optional GitHub Issue).
2. Assistent nimmt Ticket, legt Branch an, setzt um, schreibt/aktualisiert Tests.
3. PR öffnen (Vorlage `.github/pull_request_template.md`), CI abwarten (grün = Build-Wahrheit).
   Der PR-Body enthält eine Zeile **`Closes #<nr>`** und geht gegen base **`main`** –
   sonst schliesst das Ticket beim Merge nicht automatisch (siehe Auto-Close-Regel unten).
4. Nick reviewt & merged → Auto-Deploy auf Test-Umgebung (Port 8081).
5. Testabnahme durch Nick → Feedback als neue Tickets in `docs/backlog.md`.
6. Freigabe prod: manueller Deploy-Workflow (`workflow_dispatch` → prod).

## Was der Assistent NICHT tut

- Keine Prod-Deploys ohne ausdrückliche Freigabe.
- Keine Secrets/Passwörter/Tokens in Dateien oder Commits.
- Keine `main`-Direktcommits – immer über Branch + PR.
- Datenbank (`*.db`) nicht anfassen/committen.
- **Kein `git commit --amend` und kein `git push --force`/`--force-with-lease` auf
  bereits gepushten Branches / offenen PRs.** Historie, auf die andere/GitHub bereits
  zugreifen, wird nicht umgeschrieben. Korrekturen kommen als **zusätzlicher neuer
  Commit** obendrauf.
- **Merge-Konflikte** eines PR-Branches werden gelöst, indem `main` **in den Branch
  gemergt** wird (`git merge origin/main`, Konflikte auflösen, neuer Merge-Commit) –
  **nicht** per Rebase mit Force-Push.

## Auto-Close von Issues

GitHub schliesst ein Issue beim Merge nur, wenn **beides** stimmt:

- Der **PR-Body** enthält ein **englisches** Closing-Keyword mit Nummer:
  `Closes #<nr>` (auch `Fixes`/`Resolves`). **Deutsche Prosa wie „Schliesst #107"
  schliesst nichts**, und eine Nummer nur im Titel reicht ebenfalls nicht.
- Der PR wird in den **Default-Branch `main`** gemergt. Gestackte PRs in andere
  Feature-Branches lösen kein Auto-Close aus.

Die Vorlage `.github/pull_request_template.md` gibt die `Closes #`-Zeile vor.

## Definition of Done (pro Ticket)

- [ ] Code umgesetzt, deutsch kommentiert wo sinnvoll
- [ ] Tests angepasst/ergänzt, lokal bzw. in CI grün
- [ ] `spotless:apply` gelaufen (Backend)
- [ ] `docs/` aktualisiert falls Architektur/Entscheidung betroffen
- [ ] PR mit kurzer Beschreibung + **`Closes #<nr>`** im Body (base `main`)
