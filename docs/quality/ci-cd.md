# CI/CD – Pipeline & Härtung

Die CI ist die **Build-Wahrheit**: Was hier grün ist, gilt. Deployment muss an
diese Wahrheit gekoppelt sein. Dieses Dokument beschreibt Ist-Zustand, Lücken und
Zielbild.

## Ist-Zustand

### `.github/workflows/ci.yml` — **eine Pipeline** (Push/PR/manuell auf `main`)
Zwei Test-Jobs parallel, danach die Deploy-Stufe (`needs`):
- **backend:** Java 25 → `./mvnw spotless:check` → `./mvnw verify` (Tests).
- **frontend:** Node 22 → `npm ci` → `format:check` (Prettier) → `lint` (ESLint)
  → `npm test` (headless) → `npm run build`.
- **deploy:** `needs: [backend, frontend]` → läuft **nur nach grünen Tests**. Baut
  (`mvnw clean package`, inkl. Frontend), SCP der JAR auf den Server,
  `systemctl restart fehmarnopen-<env>`, Healthcheck auf `/api/teilnehmer`.
  Auf einen Blick im Graphen sichtbar, woran der Deploy hängt. ✅ (L1, #52)
  - **Push auf `main`** → Deploy Test (Port 8081); **`workflow_dispatch`** →
    Deploy test/prod (prod = Port 8080), Tests laufen auch hier zuerst;
    **Pull Request** → nur Tests, Deploy-Stufe wird übersprungen.
  - `concurrency`-Group (Job-Ebene) verhindert parallele Deploys derselben
    Umgebung, ohne die Test-Jobs zu drosseln. ✅

## Lücken (Risiken)

| # | Lücke | Risiko |
|---|-------|--------|
| ~~L1~~ | ~~**Deploy hängt nicht an grüner CI.**~~ **Behoben (#52):** Deploy ist eine `needs`-Stufe in `ci.yml` und läuft nur nach grünen `backend`+`frontend`-Jobs. | — |
| L2 | **Frontend-CI ohne Lint/Prettier/Coverage-Gate.** | Formatabweichungen & Lint-Fehler kommen durch (aktuell gibt es gar kein ESLint). |
| L3 | **Doppelter Build.** CI baut, Deploy baut erneut. | Verschwendete Zeit; Deploy-Artefakt ≠ getestetes Artefakt. |
| L4 | **Keine statische Analyse / Architekturtests** im `verify` (noch nicht eingeführt). | Struktur-/Bug-Regressionen unentdeckt. |
| L5 | **Branch Protection unklar.** Ist `main` gegen Direktpush geschützt, sind Checks Pflicht? | Ohne Schutz sind alle Gates umgehbar. |
| L6 | **Kein Dependency-/Security-Scan.** | Verwundbare Abhängigkeiten bleiben unbemerkt. |
| L7 | **Deploy ohne echten Rauch-Test** über den Healthcheck hinaus. | Kaputte Kernflows (Anmeldung/Login) fallen erst im Betrieb auf. |

## Zielbild

### Deploy an CI koppeln (L1) — höchste Priorität
> ✅ **Umgesetzt in #52** als **eine Pipeline** (`ci.yml`) mit `needs`-Stufe.

Deploy erst starten, wenn die Tests grün sind. Es gab zwei Wege — gewählt wurde der
zweite, weil die Abhängigkeit so im Graphen sichtbar ist:

- **`workflow_run`-Trigger** (verworfen): getrennte `deploy.yml`, die auf den
  Abschluss von „CI" lauscht. Nachteil: Deploy läuft als separater Run, die
  Kopplung ist nicht auf einen Blick sichtbar und erscheint nicht in den PR-Checks.
- **Ein Workflow, `needs`-Stufe** (gewählt): Test-Jobs `backend`/`frontend` und
  Deploy-Job in **einer** `ci.yml`; `deploy` mit `needs: [backend, frontend]` und
  `if` (nur Push auf `main` bzw. manueller Start, nicht bei PRs). Ein Ergebnis pro
  Push, ein Graph — das Äquivalent zu GitLab-Stages `test → deploy`.

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
