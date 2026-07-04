# CI/CD – Pipeline & Härtung

Die CI ist die **Build-Wahrheit**: Was hier grün ist, gilt. Deployment muss an
diese Wahrheit gekoppelt sein. Dieses Dokument beschreibt Ist-Zustand, Lücken und
Zielbild.

## Ist-Zustand

### `.github/workflows/backend-ci.yml` (Push/PR auf `main`)
Zwei Jobs, parallel:
- **backend:** Java 25 → `./mvnw spotless:check` → `./mvnw verify` (Tests).
- **frontend:** Node 22 → `npm ci` → `npm test` (headless) → `npm run build`.

### `.github/workflows/deploy.yml`
- Trigger: **Push auf `main`** (→ Test, Port 8081) **oder** `workflow_dispatch`
  (Auswahl test/prod, prod = Port 8080).
- Baut (`mvnw clean package`, inkl. Frontend), SCP der JAR auf den Server,
  `systemctl restart fehmarnopen-<env>`, Healthcheck auf `/api/teilnehmer`.
- `concurrency`-Group verhindert parallele Deploys derselben Umgebung. ✅

## Lücken (Risiken)

| # | Lücke | Risiko |
|---|-------|--------|
| L1 | **Deploy hängt nicht an grüner CI.** `deploy.yml` startet bei jedem Push auf `main` **unabhängig** von `backend-ci.yml`. | Ein Push mit roten Tests kann trotzdem deployt werden. |
| L2 | **Frontend-CI ohne Lint/Prettier/Coverage-Gate.** | Formatabweichungen & Lint-Fehler kommen durch (aktuell gibt es gar kein ESLint). |
| L3 | **Doppelter Build.** CI baut, Deploy baut erneut. | Verschwendete Zeit; Deploy-Artefakt ≠ getestetes Artefakt. |
| L4 | **Keine statische Analyse / Architekturtests** im `verify` (noch nicht eingeführt). | Struktur-/Bug-Regressionen unentdeckt. |
| L5 | **Branch Protection unklar.** Ist `main` gegen Direktpush geschützt, sind Checks Pflicht? | Ohne Schutz sind alle Gates umgehbar. |
| L6 | **Kein Dependency-/Security-Scan.** | Verwundbare Abhängigkeiten bleiben unbemerkt. |
| L7 | **Deploy ohne echten Rauch-Test** über den Healthcheck hinaus. | Kaputte Kernflows (Anmeldung/Login) fallen erst im Betrieb auf. |

## Zielbild

### Deploy an CI koppeln (L1) — höchste Priorität
Deploy erst starten, wenn CI erfolgreich war. Zwei saubere Wege:

- **`workflow_run`-Trigger:** `deploy.yml` lauscht auf Abschluss von „CI" und läuft
  nur bei `conclusion == success` auf `main`:
  ```yaml
  on:
    workflow_run:
      workflows: ["CI"]
      types: [completed]
      branches: [main]
  jobs:
    deploy:
      if: ${{ github.event.workflow_run.conclusion == 'success' }}
  ```
- **Alternativ:** CI und Deploy in **einen** Workflow, Deploy-Job mit
  `needs: [backend, frontend]`. Einfacher nachzuvollziehen, ein Ergebnis pro Push.

### Frontend-Gates ergänzen (L2)
CI-`frontend`-Job erweitern:
```yaml
- run: npm ci
- run: npm run format:check      # Prettier
- run: npm run lint              # ESLint (neu)
- run: npm test -- --coverage --watch=false --browsers=ChromeHeadless
- run: npm run build
```

### Ein Build, ein Artefakt (L3)
CI baut die JAR und lädt sie als **Artifact** hoch; Deploy **lädt genau dieses
Artefakt** herunter und deployt es. So wird exakt das getestete Binary ausgeliefert.

### Backend-Gates (L4)
Ergänzt sich automatisch: SpotBugs/PMD/JaCoCo/ArchUnit hängen an `verify` – der
CI-Job ändert sich nicht (führt weiter `./mvnw verify` aus), wird aber strenger.

### Branch Protection (L5) — organisatorisch, kein Code
Auf GitHub für `main` einrichten:
- Pull Request vor Merge erforderlich.
- Required status checks: `backend`, `frontend` müssen grün sein.
- Kein Direktpush (auch nicht durch Admins/Agenten).

Damit ist der in [workflow.md](../workflow.md) beschriebene Ablauf technisch erzwungen.

### Security-/Dependency-Scan (L6)
- **Dependabot** (`.github/dependabot.yml`) für Maven + npm + GitHub Actions:
  wöchentliche Update-PRs.
- **CodeQL** (GitHub-nativ, kostenlos für das Repo) für Java + TypeScript als
  eigener Workflow → findet Sicherheitslücken statisch.

### Smoke-Test nach Deploy (L7)
Über den `/api/teilnehmer`-Healthcheck hinaus: minimaler Anmelde-/Login-Rauchtest
gegen die frisch deployte Test-Umgebung (später via Playwright, siehe
[teststrategie.md](teststrategie.md)).

## Reihenfolge der Umsetzung
1. **L1** (Deploy-Gate) + **L5** (Branch Protection) – sofort, risikoarm, größter Vertrauensgewinn.
2. **L2** (Frontend Prettier/Lint-Gate) zusammen mit ESLint-Einführung.
3. **L6** (Dependabot/CodeQL) – schnell, unabhängig.
4. **L3** (ein Artefakt), **L4** (Backend-Gates via verify), **L7** (Smoke-Test) danach.

Tickets: **GitHub #52** (Deploy-Gate), **#53** (Dependabot/CodeQL), **#54** (Branch Protection). Übersicht: [quality-roadmap.md](../tickets/quality-roadmap.md).
