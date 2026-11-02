---
name: quality-gate
description: Führt das vollständige, CI-äquivalente Quality-Gate aus (Backend Spotless + verify, Frontend format:check + lint + test + build). Vor jedem Commit und vor jedem PR benutzen. Optionales Argument "backend" oder "frontend" beschränkt den Lauf auf einen Bereich.
argument-hint: "[backend|frontend]"
allowed-tools:
  - Bash(cd backend && ./mvnw *)
  - Bash(cd frontend && npm *)
  - Bash(.claude/hooks/deps-sync.sh)
  - Bash(git status *)
  - Bash(git diff *)
---

# Quality-Gate

Dies ist die **einzige** Wahrheit darüber, was vor einem Commit läuft. Nicht aus dem
Gedächtnis zusammenstückeln, nicht abkürzen. Die CI (`.github/workflows/ci.yml`) fährt
genau diese Schritte auf einer sauberen Maschine – was hier rot ist, ist dort auch rot.

Argument: `$ARGUMENTS` (leer = beide Bereiche).

## Vorher: was ist überhaupt betroffen?

```!
git status --short
```

Wenn `$ARGUMENTS` leer ist, entscheide anhand der geänderten Dateien: nur `backend/` berührt
→ Backend-Block genügt, nur `frontend/` → Frontend-Block. Sind beide oder repo-weite Dateien
betroffen (`.github/`, `deploy/`, Root), laufen **beide** Blöcke.

## Backend (`backend/`)

In dieser Reihenfolge, jeder Schritt muss grün sein, bevor der nächste startet:

1. `cd backend && ./mvnw spotless:apply` — formatiert Java **und** `pom.xml`.
   Lokal `apply` (nicht `check`): die CI prüft mit `spotless:check`, hier wird korrigiert.
   Ändert der Lauf Dateien, gehören die mit in den Commit.
2. `cd backend && ./mvnw verify` — Kompilieren, JUnit, ArchUnit (`ArchitekturTest`),
   SpotBugs, PMD, Liquibase-Migrationen in den Tests.

`verify` braucht Java 25. Schlägt es mit einer Java-Version fehl, ist das ein Setup-Problem
und **kein** grünes Gate – melden statt umgehen.

## Frontend (`frontend/`)

In CI-Reihenfolge:

0. `.claude/hooks/deps-sync.sh` — gleicht `node_modules` mit `package-lock.json` ab und
   fährt bei Abweichung `npm ci` (z. B. nach `git merge origin/main` mit neuer Abhängigkeit).
   Meldet es „FEHLGESCHLAGEN", ist das Gate rot – nicht mit alten `node_modules` weitermachen.
1. `cd frontend && npm run format && npm run format:check` — Prettier. Lokal erst
   formatieren, dann prüfen (analog `spotless:apply`); die CI fährt nur `format:check`.
   Ändert `format` Dateien, gehören die mit in den Commit.
2. `cd frontend && npm run lint` — ESLint `strict-type-checked`. **Das ist ein CI-Gate.**
   Nur Jest und Prettier zu prüfen reicht nicht (siehe `docs/workflow.md`).
   Autofix: `npm run lint:fix`, aber jede Änderung danach ansehen.
3. `cd frontend && npm test` — Jest.
4. `cd frontend && npm run build` — der Angular-Build ist Teil des Gates, nicht optional;
   `readonly`-Verstöße nach ADR 0014 fallen erst hier auf.

## Ergebnis berichten

Am Ende eine Tabelle: Schritt · Ergebnis (grün/rot) · bei rot die entscheidenden Zeilen der
Ausgabe. **Nie „Gate grün" sagen, wenn ein Schritt nicht gelaufen ist** – dann heißt es
„Schritt X übersprungen, weil …". Ein übersprungener Schritt ist ein rotes Gate.

Wenn etwas rot ist: erst reparieren, dann das Gate **komplett** neu fahren. Ein Fix, der einen
anderen Schritt kaputtmacht, ist der Normalfall – deshalb kein partieller Re-Run.
