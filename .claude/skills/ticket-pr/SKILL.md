---
name: ticket-pr
description: Bringt ein fertiges Ticket über die Ziellinie – Quality-Gate, Commit nach Konvention, Push, PR gegen main mit "Closes #<nr>". Nur manuell auslösbar.
argument-hint: "[issue-nr]"
arguments:
  - issue
disable-model-invocation: true
allowed-tools:
  - Bash(git status *)
  - Bash(git diff *)
  - Bash(git log *)
  - Bash(gh pr *)
---

# PR für Ticket #$issue

Dieses Skill hat Außenwirkung (Push, PR). Es läuft **nur**, wenn Nick es tippt – nie von
selbst. Wenn du meinst, es wäre so weit: sag es und warte.

## Stand

```!
git status --short --branch 2>&1 || true
```

```!
git diff --stat 2>&1 || true
```

## Reihenfolge – keinen Schritt vorziehen

1. **`/quality-gate`** – vollständig, nicht in Teilen. Rot heißt: hier ist Schluss, erst
   reparieren. Ein PR mit roter CI kostet eine Runde und Vertrauen.

2. **Diff gegenlesen.** Zeile für Zeile `git diff`. Suche gezielt nach:
   - Debug-Ausgaben, auskommentiertem Code, `TODO`s ohne Ticket
   - versehentlich mitgeänderten Dateien
   - Secrets, Passwörtern, Tokens (gehören **nie** in Dateien oder Commits)
   - englischen Kommentaren/UI-Texten (Konvention ist Deutsch)

3. **Bewusst stagen.** `git add <pfad>` je Datei. Kein `git add -A`, kein `git add .` –
   der Git-Guard blockt das ohnehin. `*.db` bleibt draußen.

4. **Commit** – deutsch, kurz, mit Issue-Referenz voran:
   ```
   git commit -m "#$issue kurzbeschreibung im imperativ"
   ```
   Mehrere logisch getrennte Änderungen → mehrere Commits. Kein `--amend`; Korrekturen
   kommen als neuer Commit obendrauf.

5. **Push:**
   ```
   git push -u origin <branchname>
   ```

6. **PR öffnen** gegen base **`main`**, Body nach `.github/pull_request_template.md`:
   - Abschnitt **Was & warum**: zwei bis vier Sätze, deutsch.
   - Die Zeile **`Closes #$issue`** – englisches Keyword, sonst schließt das Ticket beim
     Merge nicht. „Schliesst #$issue" schließt **nichts**. Eine Nummer nur im Titel auch nicht.
   - Abschnitt **Tests**: welche Gate-Schritte gelaufen sind und was sie abdecken.
   - Die Checkliste ehrlich abhaken – ungeprüfte Haken sind schlimmer als offene.

7. **CI beobachten.** `gh pr checks --watch`. Rot → sofort reparieren und als neuen Commit
   nachschieben, nicht auf Nick warten.

## Was hier nicht passiert

- Kein Merge. Das macht Nick.
- Kein Prod-Deploy. Der läuft manuell per `workflow_dispatch`, nur nach ausdrücklicher Freigabe.
- Kein Force-Push, kein Rebase auf einem gepushten Branch. Konflikte: `git merge origin/main`
  im Branch, Konflikte auflösen, Merge-Commit stehen lassen.
