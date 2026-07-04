# ADR 0005 – `docs/` + `AGENTS.md` als Projektkontext

**Status:** Akzeptiert · **Datum:** 2026-07-04

## Kontext
Die Zusammenarbeit mit KI-Assistenten (und wechselnden Beitragenden) braucht
persistenten, geteilten Kontext, der über einzelne Sessions hinaus erhalten bleibt.

## Entscheidung
- **`AGENTS.md`** im Repo-Root = kompakter Haupteinstieg (Stack, Architektur,
  Konventionen, Arbeitsweise).
- **`docs/`** = ausführlicher Arbeitsordner, thematisch gegliedert: `features/`,
  `adr/`, `quality/`, `tickets/` plus Workflow/Requirements/Backlog.

## Konsequenzen
- Kontext ist versioniert und im selben PR wie Code pflegbar (Definition of Done).
- Einheitliche Anlaufstelle für „warum ist das so?" (ADRs) und „was kann die
  Software?" (features).
- Pflegeaufwand: Doku muss bei relevanten Änderungen mitgezogen werden – als DoD
  verankert ([workflow.md](../workflow.md)).

## Alternativen
- Wissen nur im Code/Wiki/Chat: geht über Sessions/Personen verloren, kein Review.
