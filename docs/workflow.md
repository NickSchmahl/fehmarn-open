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
- Vor jedem Backend-Commit: `./mvnw spotless:apply` (sonst CI rot).

## Ticket-Ablauf

1. Neue Aufgabe → als Eintrag in `docs/backlog.md` (und optional GitHub Issue).
2. Assistent nimmt Ticket, legt Branch an, setzt um, schreibt/aktualisiert Tests.
3. PR öffnen, CI abwarten (grün = Build-Wahrheit).
4. Nick reviewt & merged → Auto-Deploy auf Test-Umgebung (Port 8081).
5. Testabnahme durch Nick → Feedback als neue Tickets in `docs/backlog.md`.
6. Freigabe prod: manueller Deploy-Workflow (`workflow_dispatch` → prod).

## Was der Assistent NICHT tut

- Keine Prod-Deploys ohne ausdrückliche Freigabe.
- Keine Secrets/Passwörter/Tokens in Dateien oder Commits.
- Keine `main`-Direktcommits – immer über Branch + PR.
- Datenbank (`*.db`) nicht anfassen/committen.

## Definition of Done (pro Ticket)

- [ ] Code umgesetzt, deutsch kommentiert wo sinnvoll
- [ ] Tests angepasst/ergänzt, lokal bzw. in CI grün
- [ ] `spotless:apply` gelaufen (Backend)
- [ ] `docs/` aktualisiert falls Architektur/Entscheidung betroffen
- [ ] PR mit kurzer Beschreibung + Ticket-Referenz
