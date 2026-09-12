---
name: ticket-start
description: Startet die Arbeit an einem GitHub-Issue. Holt das Ticket, legt den Feature-Branch nach Konvention an und schreibt einen Umsetzungsplan, bevor Code entsteht.
argument-hint: "[issue-nr]"
arguments:
  - issue
allowed-tools:
  - Bash(gh issue view *)
  - Bash(git status *)
  - Bash(git fetch *)
  - Bash(git switch *)
  - Bash(git branch *)
---

# Ticket #$issue beginnen

## Das Ticket

```!
gh issue view $issue --json number,title,body,labels,state \
  --template '#{{.number}} [{{.state}}] {{.title}}{{"\n\n"}}{{.body}}{{"\n\n"}}Labels: {{range .labels}}{{.name}} {{end}}' \
  2>&1 || echo "(gh nicht verfuegbar oder Issue nicht gefunden – Nick nach dem Ticketinhalt fragen, NICHT raten)"
```

## Ausgangslage

```!
git status --short --branch 2>&1 || true
```

## Ablauf

1. **Ticket verstanden?** Ist die Ausgabe oben leer oder ein Fehler, frag Nick nach Titel und
   Inhalt. Rate nichts – ein falsch verstandenes Ticket kostet mehr als eine Rückfrage.

2. **Branch anlegen.** Von aktuellem `origin/main` aus, Namensschema aus `docs/workflow.md`:
   `feat/<nr>-kurzbeschreibung` · `fix/<nr>-kurzbeschreibung` · `chore/<nr>-...`
   ```
   git fetch origin main
   git switch -c <typ>/$issue-<kurzbeschreibung> origin/main
   ```
   Kurzbeschreibung deutsch, kleingeschrieben, mit Bindestrichen. Liegen uncommittete
   Änderungen herum, erst klären – nicht blind mitnehmen.

3. **Kontext lesen, bevor du planst.** Je nach Ticket:
   - Fachlicher Ist-Stand: `docs/features/`
   - Warum etwas so gebaut ist: `docs/adr/` (Index: `docs/adr/README.md`)
   - Test-/Qualitätsregeln des betroffenen Bereichs: `docs/quality/`
   - **Schema-Änderung?** Dann `/db-schema` statt eigener Ideen.

4. **Plan schreiben, dann erst Code.** Kurz und konkret:
   - Was ändert sich fachlich (in einem Satz)?
   - Welche Dateien, welche Schichten?
   - Welche Tests beweisen es? (Backend `@Nested` je Methode, ADR 0012)
   - Braucht es einen ADR (Architektur-/Technikentscheidung) oder ein Doku-Update?
   Der Plan gehört in die Antwort an Nick. Bei größeren Tickets zusätzlich als Datei unter
   `docs/superpowers/plans/<datum>-<kurztitel>.md` – dort liegen die Pläne der bisherigen
   Tickets als Vorlage.

5. **Umsetzen**, Tests mitschreiben, dann `/quality-gate`, dann `/ticket-pr $issue`.

## Definition of Done (aus `docs/workflow.md`)

- [ ] Code umgesetzt, deutsch kommentiert wo sinnvoll
- [ ] Tests angepasst/ergänzt, lokal grün
- [ ] `spotless:apply` gelaufen (Backend)
- [ ] `docs/` aktualisiert, falls Architektur/Entscheidung betroffen
- [ ] PR mit kurzer Beschreibung + `Closes #$issue` im Body, base `main`
