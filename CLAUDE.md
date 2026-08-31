@AGENTS.md

## Claude Code – Harness in diesem Repo

`AGENTS.md` (oben eingebunden) ist der fachliche Projektkontext. Dieser Abschnitt sagt nur,
welche Werkzeuge im Repo liegen und wann sie zu benutzen sind. Warum es sie gibt:
[ADR 0015](docs/adr/0015-claude-harness-im-repo.md).

### Skills statt Prosa

| Kommando | Wofür |
|----------|-------|
| `/quality-gate` | Vollständiges, CI-äquivalentes Gate. **Vor jedem Commit.** Nicht von Hand zusammenstückeln. |
| `/ticket-start <nr>` | Ticket holen, Branch nach Konvention anlegen, Umsetzungsplan schreiben. |
| `/ticket-pr <nr>` | Gate → Commit → Push → PR mit `Closes #<nr>` gegen `main`. Nur Nick löst das aus. |
| `/db-schema` | Schema-Änderung als Liquibase-Changeset (kein DB-Reset). |

### Regeln, die automatisch greifen

- `.claude/rules/` lädt bereichsspezifische Regeln erst, wenn passende Dateien angefasst werden
  (Backend/Frontend/Liquibase) – kein Dauer-Kontext.
- `.claude/hooks/git-guard.sh` **blockt** die Git-Verbote aus `docs/workflow.md` hart:
  `--amend`, Force-Push, `git add -A`/`.`, `*.db` im Commit, Direktcommit auf `main`.
  Ein Block ist kein Fehler, den man umgeht – er nennt den vorgesehenen Weg.

### Umgangston

- Alles auf **Deutsch**: Code-Kommentare, Commit-Messages, PR-Texte, Doku, UI.
- Nur bewusst gewählte Dateien stagen (`git add <pfad>`).
- Doku im selben Zug mitziehen, wenn eine Änderung sie veralten lässt (siehe DoD in
  `docs/workflow.md`).
