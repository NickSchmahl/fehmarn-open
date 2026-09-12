# ADR 0015 – Claude-Harness im Repo (CLAUDE.md, Skills, Hooks, Path-Rules)

**Status:** Akzeptiert · **Datum:** 2026-08-31

## Kontext

Der Ticket-Ablauf ist seit [ADR 0005](0005-docs-agents-kontext.md) und `docs/workflow.md`
sauber beschrieben: Issue → Feature-Branch → Umsetzung → lokales Quality-Gate → PR mit
`Closes #<nr>` → grüne CI → Merge → Auto-Deploy. Die Qualitätsschichten stehen in
`docs/quality/`. Das ist ein guter Prozess – er war nur **nirgends maschinell verankert**.

Konkret fehlte im Repo alles, was ein KI-Assistent tatsächlich liest oder woran er sich
nicht vorbeimogeln kann:

1. **`AGENTS.md` wurde von Claude Code gar nicht geladen.** Claude Code liest `CLAUDE.md`,
   nicht `AGENTS.md`. Der gesamte kuratierte Projektkontext – SQLite-Pool = 1,
   Liquibase-Pflicht, Spotless, Deutsch-Konvention – landete in **keiner** Session
   automatisch im Kontext. Jede Sitzung begann damit, ihn von Hand zusammenzusuchen, oder
   eben nicht.
2. **Alle Regeln waren Prosa.** Auch geladener Kontext ist laut Claude-Code-Dokumentation
   ausdrücklich *Kontext*, keine erzwungene Konfiguration. „Kein Force-Push", „kein
   `git add -A`", „keine `*.db` committen" hielten genau so lange, wie das Modell die Zeile
   im Blick hatte.
3. **Das Quality-Gate existierte viermal in Prosa** (`AGENTS.md`, `docs/workflow.md`,
   PR-Template, `docs/quality/README.md`) mit je leicht abweichender Formulierung – aber
   nirgends als ein ausführbarer Ablauf. Folge waren Nachbesserungsrunden, bei denen erst
   die CI meldete, was ESLint lokal auch gefunden hätte.
4. **Die Spec-/Plan-Disziplin schlief ein.** `docs/superpowers/` enthält 32 saubere
   Artefakte, das letzte vom 17.07.2026. Das Verhalten hing an einer lokalen
   Plugin-Konfiguration, nicht am Repo – mit der Konfiguration verschwand es.

Die CI (`ci.yml`) fängt am Ende zwar alles ab, ist aber die *letzte* Verteidigungslinie:
jeder Verstoß kostet eine rote Pipeline und eine Review-Runde.

## Entscheidung

Der Harness zieht ins Repo und wird versioniert wie Code. Vier Bausteine, je nach dem, was
das Problem verlangt:

**1. `CLAUDE.md` im Root** – bindet per `@AGENTS.md` den bestehenden Projektkontext ein
(keine Kopie, keine zweite Wahrheit) und ergänzt darunter nur, welche Werkzeuge es gibt.
`AGENTS.md` bleibt das Menschen- und Fremdtool-Dokument.

**2. `.claude/skills/` – Prozeduren als Kommando**

| Skill | Zweck |
|-------|-------|
| `/quality-gate` | Der CI-äquivalente Ablauf, **eine** Wahrheit statt vier Prosastellen |
| `/ticket-start <nr>` | Issue holen (`gh` injiziert), Branch nach Konvention, Plan vor Code |
| `/ticket-pr <nr>` | Gate → Commit → Push → PR mit `Closes #<nr>`; `disable-model-invocation` |
| `/db-schema` | Liquibase-Ablauf nach ADR 0009, ohne DB-Reset |

**3. `.claude/hooks/git-guard.sh` – die Verbotsliste aus `docs/workflow.md` als PreToolUse-Hook.**
Blockt `git commit --amend`, Force-Push (auch `--force-with-lease`), `git add -A`/`.`/`--all`,
`*.db` im Stage oder im `git add`, Direktcommits auf `main` und Push nach `main`. Der Hook
läuft als Shell-Skript vor dem Tool-Aufruf, unabhängig davon, was das Modell sich vornimmt.
Jede Ablehnung nennt den vorgesehenen Weg statt nur „nein".

**4. `.claude/rules/` – bereichsspezifische Regeln mit `paths`-Frontmatter.** Sie laden erst,
wenn passende Dateien angefasst werden: `backend.md` (Spotless, ArchUnit-Regeln, ADR 0011/0012,
Pool = 1), `frontend.md` (ESLint strict-type-checked, ADR 0014 Signals/`readonly`),
`liquibase.md` (greift bei `entity/**` und `db/**` – genau dann, wenn jemand im Begriff ist,
eine Entity ohne Changeset zu ändern).

Die Aufteilung folgt einer Regel: **Fakten → `CLAUDE.md`, Prozeduren → Skills,
Bereichswissen → Path-Rules, Unverhandelbares → Hooks.** `docs/` bleibt unverändert die
ausführliche Wahrheit; der Harness verweist dorthin, statt sie zu duplizieren.

## Konsequenzen

- Projektkontext ist ab sofort in jeder Session geladen, ohne dass jemand daran denken muss.
- Die fünf teuersten Git-Fehler sind technisch unmöglich statt nur unerwünscht.
- Das Quality-Gate hat eine einzige Definition. Ändert sich `ci.yml`, wird
  `.claude/skills/quality-gate/SKILL.md` im selben PR mitgezogen – sonst driften sie
  auseinander, und das Skill wäre schlimmer als keins.
- Der Harness ist Teil der Reviews: Änderungen daran gehen wie Code über einen PR.
- Kein zusätzliches Tooling, keine Dependency, keine CI-Änderung. Nur Markdown, eine
  `settings.json` und ein Bash-Skript.
- Ohne `jq` **und** ohne `python3` kann der Hook das Kommando nicht parsen. Er lässt dann
  bewusst durch und meldet das sichtbar – lieber ein sichtbarer Ausfall der Absicherung als
  ein blockiertes Bash-Tool.
- Der Guard prüft den Kommandotext. Ein Kommando, das eines der Muster als *Literal* enthält
  (z. B. `grep "git add -A " docs/`), kann fälschlich blockiert werden. Der Fehler ist
  harmlos und sichtbar; die Alternative – nur den Kommandoanfang prüfen – würde
  `cd backend && git commit --amend` durchlassen und damit den eigentlichen Zweck verfehlen.

## Alternativen

- **Symlink `CLAUDE.md → AGENTS.md`** statt `@AGENTS.md`-Import: einfacher, lässt aber keinen
  Platz für Claude-spezifische Ergänzungen und braucht unter Windows Adminrechte. Verworfen.
- **Alles in `CLAUDE.md`**: Zielgröße sind unter 200 Zeilen; längere Dateien kosten Kontext in
  *jeder* Session und senken die Befolgung. Prozedurales und Bereichswissen gehören deshalb
  in Skills bzw. Path-Rules, die nur bei Bedarf laden. Verworfen.
- **Nur Prosa lassen und auf die CI vertrauen**: funktioniert, verlagert aber jede Korrektur
  in eine rote Pipeline und eine Review-Runde. Genau das war der Anlass. Verworfen.
- **`git rebase` mitblocken**: Schaden entsteht erst zusammen mit einem Force-Push, und der
  ist dicht. Ein Blanket-Deny hätte nur Reibung erzeugt – und Reibung führt dazu, dass Hooks
  abgeschaltet werden. Bewusst nicht gemacht.
- **Als Plugin/Marketplace verpacken**: sinnvoll erst, wenn mehrere Repos denselben Harness
  teilen. Für ein Projekt ist `.claude/` im Repo der direktere Weg. Zurückgestellt.
