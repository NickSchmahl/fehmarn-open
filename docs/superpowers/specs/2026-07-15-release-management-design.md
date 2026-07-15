# Design: Release-Management & Versioning (Ticket #202)

- **Datum:** 2026-07-15
- **Ticket:** #202 (Release-Management & Versioning für Fehmarn Open)
- **Baut auf:** bestehendem `ci.yml` (Auto-Deploy test/prod), geschützter `main`
  (Ruleset „Main Branch protection", required checks `backend`+`frontend`,
  non-fast-forward blockiert), `docs/changelog.md`, `docs/deployment.md`

## Problem

Es gibt keinen strukturierten Prozess, um Versionen zu taggen und Releases zu
verwalten. Konkret heißt das: **niemand kann nachvollziehen, welcher Stand wann
deployed wurde**, und es gibt **keinen dokumentierten Weg, sauber auf einen
älteren Stand zurückzurollen**. Beleg aus dem Ist-Zustand:

- **0 Git-Tags** — noch nie ein Release markiert.
- `backend/pom.xml` steht seit jeher auf `0.0.1-SNAPSHOT`, `frontend/package.json`
  auf `0.0.0` — Versionen werden nie hochgezählt.
- Die laufende App kann nicht sagen, welcher Build sie ist (kein Actuator,
  kein Versions-Endpoint, kein build-info).
- Der JAR-Name ist in `ci.yml` an **zwei Stellen hartkodiert**
  (`fehmarnopen-0.0.1-SNAPSHOT.jar`) — jeder pom-Bump würde den Deploy brechen.

## Ziel

Ein schlanker, aber vollständiger Release-Prozess für ein Vereins-Turnierprojekt:
Versionen in pom + package.json, Git-Tags pro Release, ein GitHub-Actions-Workflow
für Releases (getrennt vom Deploy), ein dokumentierter Rollback-Weg, und eine
laufende App, die ihre Version ausweist. **Ohne** Overkill: kein Maven Release
Plugin, kein SNAPSHOT-Zyklus, kein zweiter Changelog.

## Getroffene Entscheidungen

| Frage | Entscheidung |
|-------|--------------|
| Ambition (Scope) | **„Mittel"**: schlanker Kern (Tag + Version + Rollback) **plus** dedizierter `release.yml` mit `workflow_dispatch` (Version wählen, bumpen, taggen, GitHub Release mit Artefakt), getrennt vom Deploy. |
| Versionsquelle | **pom + package.json bumpen** (gleiche Nummer, synchron). SemVer `MAJOR.MINOR.PATCH`, RC erlaubt (`1.1.0-rc1`). |
| Bump-Weg auf geschützte `main` | **Per Release-PR.** `release.yml` legt Branch + Bump-Commit an und öffnet PR nach `main`. Nach Merge (Checks grün) taggt ein Folgeschritt den Merge-Commit und baut Release. Branch-Protection bleibt **voll intakt**. |
| SNAPSHOT-Rückbump | **Nein.** `main` bleibt nach Release `1.0.0` auf `1.0.0`, bis das nächste Release `1.1.0` setzt. Ein PR pro Release statt zwei. |
| Artefakt-Name | **`<finalName>fehmarnopen</finalName>`** → JAR heißt immer `fehmarnopen.jar`, unabhängig von der Version. Entkoppelt den Deploy vom Versionsstring. |
| Versions-Anzeige zur Laufzeit | **`GET /api/version`** (öffentlich, kein Auth), gespeist aus `build-info` des spring-boot-maven-plugin. **Kein** Actuator (neue Dependency/Endpoint vermieden), passt zum bestehenden `/api/...`-Stil. |
| Rollback | **Kein neuer Mechanismus** — CI/CD-Workflow (`ci.yml`) vom Tag `vX.Y.Z` mit Ziel `prod` dispatchen. Nur **Dokumentation** in `docs/deployment.md`. |
| Changelog | **Kein** Root-`CHANGELOG.md`. Das bestehende `docs/changelog.md` bleibt die Wahrheit; GitHub-Release-Notes verlinken den passenden Abschnitt. |
| Erste Version | Empfehlung **`1.0.0`** (App ist bereits live, test+prod deployed). Beim ersten `release.yml`-Lauf als Input gesetzt. |

### Bewusst weggelassen (YAGNI, gegen Ticket-Checkliste)

Maven Release Plugin · SNAPSHOT-Entwicklungszyklus · Conventional-Commits-Autochangelog
· Root-`CHANGELOG.md` · Docker-Image-Tags · Upload in ein Maven-Repository.
Begründung: Vereinsprojekt, Single-Server-Deploy, das Ticket empfiehlt Custom-Workflow selbst.

## Architektur / Ablauf

### Release-Ablauf (ein Klick zum Start, ein Klick zum Merge)

```
Maintainer: workflow_dispatch release.yml  (Input: version = 1.0.0)
        │
        ▼
 [Job prepare]  Branch release/v1.0.0:
        │   - backend/pom.xml  <version>1.0.0</version>
        │   - frontend/package.json  "version": "1.0.0"
        │   - Commit + Push + PR nach main ("Release v1.0.0")
        ▼
 CI (backend, frontend) laufen auf dem PR  ──▶  Maintainer merged den PR
        │
        ▼
 [publish, on push:main]  HEAD = Release-Version & Tag fehlt noch?
        │   - annotierten Tag v1.0.0 auf den Merge-Commit
        │   - ./mvnw clean package  →  fehmarnopen.jar
        │   - GitHub Release v1.0.0: JAR angehängt + auto-Notes
        │     + Link auf docs/changelog.md
        ▼
   main steht auf 1.0.0, Tag v1.0.0 zeigt auf den deploybaren Stand
```

Das **`publish`**-Trigger ist idempotent und branch-namen-unabhängig: bei jedem
`push` auf `main` prüft es, ob die Version in `backend/pom.xml` eine Release-Version
ist (SemVer, kein `-SNAPSHOT`) **und** der Tag `v<version>` noch nicht existiert.
Nur dann wird getaggt und released. Feature-Merges ohne Versionsänderung lösen nichts aus.

### Deploy bleibt unverändert (nur Artefaktname angepasst)

`ci.yml` baut weiterhin aus dem ausgecheckten Ref und rollt `fehmarnopen.jar` aus.
Einzige Änderung: die zwei hartkodierten `fehmarnopen-0.0.1-SNAPSHOT.jar`-Stellen
werden zu `fehmarnopen.jar` (durch `finalName` stabil).

### Rollback (Doku, kein Code)

```
GitHub → Actions → CI/CD → "Run workflow"
   Use workflow from: Tag  v1.0.0     Zielumgebung: prod
        │
        ▼
   CI baut exakt den getaggten Quellstand und deployed ihn nach prod.
   Verifikation: GET https://<prod>/api/version  →  {"version":"1.0.0", ...}
```

Warnhinweis in der Doku: **Liquibase-Schema-Änderungen rollen nicht automatisch
zurück** — bei DB-Schema-Sprüngen zwischen den Versionen siehe
`docs/datenbank-schema-aendern.md` und ggf. manuelle Migration.

## Komponenten

### 1. `backend/pom.xml`
- `<version>0.0.1-SNAPSHOT</version>` → `<version>1.0.0</version>` (erster Release-Stand).
- `<finalName>fehmarnopen</finalName>` im `<build>`.
- `spring-boot-maven-plugin`: Execution mit `build-info`-Goal → schreibt
  `META-INF/build-info.properties` (Version, Zeit, optional Git-Commit) ins JAR.

### 2. `frontend/package.json`
- `"version": "0.0.0"` → `"1.0.0"`, synchron zur pom-Version.

### 3. Backend: Versions-Endpoint
- `VersionController` (o. Ä.): `GET /api/version`, öffentlich (Security-Config:
  Pfad freigeben, analog zum Healthcheck-Ziel `/api/teilnehmer`).
- Liest `BuildProperties` (aus build-info) → JSON `{ version, buildTime, commit? }`.
- Test: MockMvc-Test auf `GET /api/version` (200, Feld `version` gesetzt).

### 4. `.github/workflows/release.yml`
- `on: workflow_dispatch` mit Input `version` (String), validiert gegen SemVer-Regex
  (`^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$`); bricht bei ungültigem Input ab.
- Job `prepare`: Branch `release/v<version>`, Version in pom + package.json setzen,
  Commit, Push, PR nach `main` per `gh pr create`.
- Nutzt den Standard-`GITHUB_TOKEN` (kein PAT nötig: es wird **kein** Direktpush auf
  `main` gemacht, nur ein Feature-Branch + PR). `permissions: contents: write,
  pull-requests: write`.

### 5. `.github/workflows/release.yml` → Publish-Teil (oder eigener `release-publish.yml`)
- `on: push: branches: [main]`.
- Guard-Step: Version aus `backend/pom.xml` lesen; wenn `-SNAPSHOT` **oder** Tag
  existiert bereits → sauber beenden (kein Fehler).
- Sonst: annotierten Tag `v<version>` erstellen + pushen, `./mvnw -B clean package`,
  `gh release create v<version>` mit `backend/target/fehmarnopen.jar` + `--generate-notes`.

### 6. `ci.yml`
- `source: backend/target/fehmarnopen-0.0.1-SNAPSHOT.jar` → `fehmarnopen.jar`.
- `install ... /tmp/fehmarnopen-0.0.1-SNAPSHOT.jar` → `/tmp/fehmarnopen.jar`.

### 7. Doku
- `docs/deployment.md`: neuer Abschnitt **„Releases & Rollback"** (Release per
  `release.yml`, Rollback per CI-Dispatch vom Tag, Liquibase-Caveat, `/api/version`).
- `docs/changelog.md`: kurze Konventions-Notiz „ein datierter Abschnitt pro Release,
  GitHub-Release verlinkt hierher".
- `AGENTS.md`: ein Verweis auf den Release-Prozess.

## Error Handling / Edge Cases

- **Ungültige Versionseingabe** → `release.yml` prepare bricht im Regex-Guard ab.
- **PR nie gemerged** → kein Tag, kein Release; `main` unverändert. Kein halber Zustand.
- **Publish doppelt getriggert** (z. B. erneuter push:main) → Tag-Existenz-Guard
  verhindert Doppel-Release (idempotent).
- **Feature-Merge ohne Versionsbump** → Guard sieht unveränderte/gleiche Version bzw.
  bereits existierenden Tag → tut nichts.
- **Deploy nach Bump** → durch `finalName` bleibt der JAR-Name stabil, ci.yml findet
  das Artefakt unabhängig von der Nummer.

## Testing

- **Backend-Unit/Slice:** MockMvc-Test `GET /api/version` → 200 + `version`-Feld;
  Security-Test, dass der Endpoint ohne Auth erreichbar ist.
- **Build:** `./mvnw -B clean package` erzeugt `fehmarnopen.jar` mit
  `build-info.properties` (lokal verifizieren).
- **Workflow:** erster echter Release-Lauf `release.yml` mit `version=1.0.0` end-to-end
  (PR erscheint → merge → Tag `v1.0.0` + GitHub Release mit JAR).
- **Rollback-Probe (optional):** CI vom Tag auf **test** dispatchen, `/api/version`
  prüfen.

## Offene Kleinigkeiten für den Plan

- Git-Commit in `build-info` (nur Version+Zeit reicht, Commit ist „nice to have").
- Exakter Ort des Publish-Jobs (in `release.yml` mit zwei `on:`-Triggern vs. eigener
  `release-publish.yml`) — im Plan entscheiden; Verhalten ist identisch.
