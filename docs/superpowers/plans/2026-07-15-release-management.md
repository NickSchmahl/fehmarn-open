# Release-Management & Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen schlanken Release-Prozess für Fehmarn Open bauen: versionierte Artefakte, Git-Tags + GitHub Releases pro Release, ein laufender Versions-Endpoint und ein dokumentierter Rollback-Weg.

**Architecture:** Version wird in `backend/pom.xml` + `frontend/package.json` gebumpt (SemVer, synchron). `release.yml` öffnet dafür einen Bump-PR nach der geschützten `main`; nach dem Merge taggt `release-publish.yml` den Merge-Commit und legt ein GitHub Release mit JAR an. Der JAR-Name wird per `finalName` stabilisiert (`fehmarnopen.jar`), damit der bestehende Auto-Deploy versionsunabhängig bleibt. Die laufende App weist ihre Version über `GET /api/version` (gespeist aus Spring-Boot `build-info`) aus. Rollback = CI vom Tag auf prod dispatchen (nur Doku).

**Tech Stack:** Spring Boot 4.1.0 (Java 25, Maven), Angular 22 (npm), GitHub Actions, `gh` CLI.

## Global Constraints

- SemVer für alle Versionen: `MAJOR.MINOR.PATCH`, RC erlaubt (`1.1.0-rc1`). Regex: `^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$`
- `backend/pom.xml` `<version>` und `frontend/package.json` `"version"` immer auf **dieselbe** Nummer.
- **Kein** Direktpush auf `main` — `main` ist per Ruleset geschützt (required checks `backend`+`frontend`, non-fast-forward blockiert). Versionsänderungen kommen ausschließlich per PR.
- **Kein** SNAPSHOT-Rückbump: `main` bleibt nach einem Release auf der Release-Version.
- Backend-Formatierung: `./mvnw spotless:check` muss grün bleiben (Java **und** `pom.xml`). Nach automatischen pom-Änderungen `spotless:apply` laufen lassen.
- Kein neuer Root-`CHANGELOG.md`; `docs/changelog.md` bleibt die Wahrheit.
- Kein Maven Release Plugin, kein Actuator.

---

### Task 1: Artefaktname entkoppeln (`finalName`) + `ci.yml` anpassen

Der JAR-Name ist in `ci.yml` zweifach hartkodiert (`fehmarnopen-0.0.1-SNAPSHOT.jar`). Sobald die pom-Version steigt, bräche der Deploy. `<finalName>` macht den Namen versionsunabhängig.

**Files:**
- Modify: `backend/pom.xml` (im `<build>`, ab Zeile 131)
- Modify: `.github/workflows/ci.yml` (JAR-Referenzen im `deploy`-Job)

**Interfaces:**
- Produces: gebautes Artefakt heißt immer `backend/target/fehmarnopen.jar` (unabhängig von `<version>`).

- [ ] **Step 1: `finalName` in die pom eintragen**

In `backend/pom.xml` direkt nach `<build>` (Zeile 131) die Zeile ergänzen, sodass es lautet:

```xml
  <build>
    <finalName>fehmarnopen</finalName>
    <plugins>
```

- [ ] **Step 2: Build ausführen und Artefaktnamen prüfen**

Run: `cd backend && ./mvnw -B clean package -DskipTests`
Expected: BUILD SUCCESS und die Datei `backend/target/fehmarnopen.jar` existiert (kein `-0.0.1-SNAPSHOT` mehr im Namen).

```bash
ls backend/target/fehmarnopen.jar
```
Expected: Pfad wird ausgegeben (Datei da).

- [ ] **Step 3: `ci.yml` — erste JAR-Referenz (scp `source:`) anpassen**

In `.github/workflows/ci.yml`, im Schritt „JAR auf den Server kopieren":

Ersetze
```yaml
          source: backend/target/fehmarnopen-0.0.1-SNAPSHOT.jar
```
durch
```yaml
          source: backend/target/fehmarnopen.jar
```

- [ ] **Step 4: `ci.yml` — zweite JAR-Referenz (`install` im ssh-Skript) anpassen**

Im Schritt „Installieren, Service neu starten & Healthcheck", im `install`-Aufruf:

Ersetze
```bash
            install -o fehmarnopen -g fehmarnopen \
              /tmp/fehmarnopen-0.0.1-SNAPSHOT.jar \
              /opt/fehmarnopen/$ENV/app.jar
```
durch
```bash
            install -o fehmarnopen -g fehmarnopen \
              /tmp/fehmarnopen.jar \
              /opt/fehmarnopen/$ENV/app.jar
```

- [ ] **Step 5: Prüfen, dass keine alte JAR-Referenz übrig ist**

Run: `grep -n "fehmarnopen-0.0.1-SNAPSHOT" .github/workflows/ci.yml`
Expected: keine Treffer (leere Ausgabe).

- [ ] **Step 6: Spotless prüfen (pom-Formatierung)**

Run: `cd backend && ./mvnw -q spotless:check`
Expected: BUILD SUCCESS (pom bleibt formatiert).

- [ ] **Step 7: Commit**

```bash
git add backend/pom.xml .github/workflows/ci.yml
git commit -m "#202 Artefaktname via finalName stabilisieren (fehmarnopen.jar)"
```

---

### Task 2: Versions-Stamping ins JAR (`build-info`)

Das `spring-boot-maven-plugin` schreibt mit dem `build-info`-Goal die pom-Version (+ Build-Zeit) als `META-INF/build-info.properties` ins JAR. Spring Boot stellt daraus automatisch einen `BuildProperties`-Bean bereit.

**Files:**
- Modify: `backend/pom.xml` (`spring-boot-maven-plugin`, Zeile ~147–150)

**Interfaces:**
- Produces: `META-INF/build-info.properties` im JAR; ein auto-konfigurierter `org.springframework.boot.info.BuildProperties`-Bean zur Laufzeit (nur wenn die Datei vorhanden ist).

- [ ] **Step 1: `build-info`-Execution ergänzen**

In `backend/pom.xml` den `spring-boot-maven-plugin`-Block (aktuell ohne Konfiguration) ersetzen:

Vorher:
```xml
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
```
Nachher:
```xml
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <executions>
          <execution>
            <goals>
              <goal>build-info</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
```

- [ ] **Step 2: Build ausführen und build-info prüfen**

Run: `cd backend && ./mvnw -B clean package -DskipTests`
Expected: BUILD SUCCESS. Danach:

```bash
unzip -p backend/target/fehmarnopen.jar BOOT-INF/classes/META-INF/build-info.properties
```
Expected: Ausgabe enthält `build.version=0.0.1-SNAPSHOT` und `build.time=...`.

- [ ] **Step 3: Spotless prüfen**

Run: `cd backend && ./mvnw -q spotless:check`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/pom.xml
git commit -m "#202 build-info ins JAR stempeln (Versions-Metadaten)"
```

---

### Task 3: `GET /api/version` Endpoint

Öffentlicher Endpoint, der die gestempelte Version ausgibt. Nutzt `BuildProperties`, fällt aber sauber auf `"dev"` zurück, wenn kein `build-info` vorhanden ist (z. B. `spring-boot:run` lokal). Die reale `SecurityConfig` hat `anyRequest().permitAll()`, daher ist **keine** Security-Änderung nötig.

**Files:**
- Create: `backend/src/main/java/de/dart/fehmarnopen/controller/VersionController.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/controller/VersionControllerTest.java`

**Interfaces:**
- Consumes: `org.springframework.boot.info.BuildProperties` (aus Task 2, optional/nullable).
- Produces: `GET /api/version` → JSON `{ "version": String, "buildTime": String|null }`. Record `VersionController.VersionResponse(String version, String buildTime)`.

- [ ] **Step 1: Failing Test schreiben**

Erstelle `backend/src/test/java/de/dart/fehmarnopen/controller/VersionControllerTest.java`:

```java
package de.dart.fehmarnopen.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.dart.fehmarnopen.config.TestSecurityConfig;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.TestConfiguration;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest
@ContextConfiguration(classes = VersionController.class)
@Import({TestSecurityConfig.class, VersionControllerTest.BuildInfoConfig.class})
class VersionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @TestConfiguration
    static class BuildInfoConfig {
        @Bean
        BuildProperties buildProperties() {
            Properties props = new Properties();
            props.setProperty("version", "1.2.3");
            props.setProperty("time", "1700000000000");
            return new BuildProperties(props);
        }
    }

    @Test
    void getVersion_sollGestempelteVersionOeffentlichZurueckgeben() throws Exception {
        mockMvc.perform(get("/api/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value("1.2.3"));
    }

    @Test
    void ohneBuildInfo_sollDevZurueckgeben() {
        VersionController controller = new VersionController(null);
        assertThat(controller.version().version()).isEqualTo("dev");
        assertThat(controller.version().buildTime()).isNull();
    }
}
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd backend && ./mvnw -q test -Dtest=VersionControllerTest`
Expected: FAIL (Kompilierfehler: `VersionController` existiert nicht).

- [ ] **Step 3: Controller implementieren**

Erstelle `backend/src/main/java/de/dart/fehmarnopen/controller/VersionController.java`:

```java
package de.dart.fehmarnopen.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.info.BuildProperties;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/version")
public class VersionController {

    @Nullable private final BuildProperties buildProperties;

    public VersionController(@Autowired(required = false) @Nullable BuildProperties buildProperties) {
        this.buildProperties = buildProperties;
    }

    @GetMapping
    public VersionResponse version() {
        if (buildProperties == null) {
            return new VersionResponse("dev", null);
        }
        String buildTime = buildProperties.getTime() != null ? buildProperties.getTime().toString() : null;
        return new VersionResponse(buildProperties.getVersion(), buildTime);
    }

    public record VersionResponse(String version, String buildTime) {}
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `cd backend && ./mvnw -q test -Dtest=VersionControllerTest`
Expected: PASS (beide Tests grün).

- [ ] **Step 5: Formatierung anwenden und prüfen**

Run: `cd backend && ./mvnw -q spotless:apply && ./mvnw -q spotless:check`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/controller/VersionController.java \
        backend/src/test/java/de/dart/fehmarnopen/controller/VersionControllerTest.java
git commit -m "#202 GET /api/version: laufende Version ausweisen"
```

> **Hinweis für den Implementierer:** Falls der Import `org.springframework.boot.info.BuildProperties` in Spring Boot 4.1 in ein anderes Modul gewandert ist, den vom Compiler/IDE vorgeschlagenen Ersatz-Import verwenden — Klassenname und API (`getVersion()`, `getTime()`) bleiben gleich.

---

### Task 4: `release.yml` — Versions-Bump per PR

Manuell getriggerter Workflow: validiert die Eingabeversion, setzt sie in pom + package.json, öffnet einen PR nach `main`. Kein Direktpush (Protection bleibt intakt), Standard-`GITHUB_TOKEN` genügt.

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Produces: PR `Release v<version>` von Branch `release/v<version>` nach `main`, mit gebumpter `backend/pom.xml` + `frontend/package.json` (+ `package-lock.json`).

- [ ] **Step 1: Workflow anlegen**

Erstelle `.github/workflows/release.yml`:

```yaml
name: Release (Bump-PR)

# Manuell gestartet: hebt die Version in pom + package.json und oeffnet einen PR
# nach main. Der Tag + das GitHub Release entstehen erst nach dem Merge
# (siehe release-publish.yml). Kein Direktpush auf die geschuetzte main noetig.
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Release-Version (SemVer, z. B. 1.0.0 oder 1.1.0-rc1)'
        required: true
        type: string

permissions:
  contents: write
  pull-requests: write

jobs:
  prepare:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          ref: main

      - name: Version validieren (SemVer)
        run: |
          if ! printf '%s' "${{ inputs.version }}" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$'; then
            echo "FEHLER: '${{ inputs.version }}' ist keine gueltige SemVer-Version (erwartet z. B. 1.0.0 oder 1.1.0-rc1)." >&2
            exit 1
          fi

      - name: Java 25 aufsetzen
        uses: actions/setup-java@v5
        with:
          java-version: '25'
          distribution: 'temurin'
          cache: 'maven'

      - name: Node aufsetzen
        uses: actions/setup-node@v6
        with:
          node-version: '22'

      - name: Version in pom.xml setzen
        working-directory: backend
        run: |
          ./mvnw -B -q versions:set -DnewVersion=${{ inputs.version }} -DgenerateBackupPoms=false
          ./mvnw -B -q spotless:apply

      - name: Version in package.json setzen
        working-directory: frontend
        run: npm version ${{ inputs.version }} --no-git-tag-version

      - name: Branch, Commit, Push, PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -e
          BRANCH="release/v${{ inputs.version }}"
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git checkout -b "$BRANCH"
          git add backend/pom.xml frontend/package.json frontend/package-lock.json
          git commit -m "#202 Release v${{ inputs.version }}"
          git push origin "$BRANCH"
          gh pr create --base main --head "$BRANCH" \
            --title "Release v${{ inputs.version }}" \
            --body "Automatischer Versions-Bump auf **${{ inputs.version }}**. Nach dem Merge erstellt \`release-publish.yml\` automatisch Tag \`v${{ inputs.version }}\` + ein GitHub Release mit dem JAR."
```

- [ ] **Step 2: YAML-Syntax prüfen**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release.yml')); print('OK')"`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "#202 release.yml: Versions-Bump per PR (workflow_dispatch)"
```

---

### Task 5: `release-publish.yml` — Tag + GitHub Release nach Merge

Läuft bei jedem Push auf `main`. Ermittelt die pom-Version; nur wenn sie eine Release-Version ist (kein `-SNAPSHOT`) **und** der Tag `v<version>` noch nicht existiert, wird getaggt, gebaut und ein GitHub Release mit `fehmarnopen.jar` erstellt. Idempotent: normale Feature-Merges lösen nichts aus.

**Files:**
- Create: `.github/workflows/release-publish.yml`

**Interfaces:**
- Consumes: `backend/target/fehmarnopen.jar` (Task 1), pom-Version.
- Produces: annotierter Git-Tag `v<version>` + GitHub Release `v<version>` mit angehängtem JAR.

- [ ] **Step 1: Workflow anlegen**

Erstelle `.github/workflows/release-publish.yml`:

```yaml
name: Release veroeffentlichen

# Laeuft bei jedem Push auf main. Taggt + released NUR, wenn die pom-Version eine
# Release-Version ist (kein -SNAPSHOT) und der Tag noch nicht existiert. Dadurch
# loesen normale Feature-Merges nichts aus, ein gemergter Release-Bump-PR aber schon.
on:
  push:
    branches: [ main ]

permissions:
  contents: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0   # volle Historie + Tags fuer die Existenzpruefung

      - name: Java 25 aufsetzen
        uses: actions/setup-java@v5
        with:
          java-version: '25'
          distribution: 'temurin'
          cache: 'maven'

      - name: Release-Entscheidung treffen
        id: decide
        working-directory: backend
        run: |
          VERSION=$(./mvnw -q -DforceStdout help:evaluate -Dexpression=project.version)
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          if printf '%s' "$VERSION" | grep -q 'SNAPSHOT'; then
            echo "SNAPSHOT-Version ($VERSION) -> kein Release."
            echo "release=false" >> "$GITHUB_OUTPUT"
          elif git rev-parse "v$VERSION" >/dev/null 2>&1; then
            echo "Tag v$VERSION existiert bereits -> kein Release."
            echo "release=false" >> "$GITHUB_OUTPUT"
          else
            echo "Release-Version $VERSION ohne bestehenden Tag -> Release."
            echo "release=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Build (JAR inkl. Frontend)
        if: steps.decide.outputs.release == 'true'
        working-directory: backend
        run: ./mvnw -B clean package

      - name: Tag erstellen und pushen
        if: steps.decide.outputs.release == 'true'
        run: |
          set -e
          VERSION=${{ steps.decide.outputs.version }}
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git tag -a "v$VERSION" -m "Release v$VERSION"
          git push origin "v$VERSION"

      - name: GitHub Release erstellen
        if: steps.decide.outputs.release == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          VERSION=${{ steps.decide.outputs.version }}
          gh release create "v$VERSION" \
            backend/target/fehmarnopen.jar \
            --title "v$VERSION" \
            --generate-notes \
            --notes-file <(printf 'Details siehe [docs/changelog.md](../blob/main/docs/changelog.md).\n')
```

- [ ] **Step 2: YAML-Syntax prüfen**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release-publish.yml')); print('OK')"`
Expected: `OK`.

> **Hinweis:** `--generate-notes` und `--notes-file` schließen sich in manchen `gh`-Versionen aus. Falls der erste echte Lauf hier scheitert, den `--notes-file`-Teil entfernen und den Changelog-Link stattdessen manuell in die Release-Beschreibung setzen — die auto-generierten Notes sind die Hauptquelle.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release-publish.yml
git commit -m "#202 release-publish.yml: Tag + GitHub Release nach Merge"
```

---

### Task 6: Dokumentation (Rollback, Changelog-Konvention, AGENTS.md)

**Files:**
- Modify: `docs/deployment.md` (neuer Abschnitt „Releases & Rollback")
- Modify: `docs/changelog.md` (Konventions-Notiz im Kopf)
- Modify: `AGENTS.md` (Verweis auf den Release-Prozess)

**Interfaces:** keine Code-Schnittstellen.

- [ ] **Step 1: Rollback-Abschnitt in `docs/deployment.md` ergänzen**

Am Ende von `docs/deployment.md` anhängen:

```markdown
## Releases & Rollback

### Release erstellen
1. **Actions → „Release (Bump-PR)" → Run workflow**, Version eingeben (z. B. `1.0.0`).
   Es entsteht ein PR `Release v1.0.0` mit gebumpter Version in `pom.xml` + `package.json`.
2. PR reviewen und **mergen** (die CI-Checks `backend`/`frontend` müssen grün sein).
3. Nach dem Merge läuft `release-publish.yml` automatisch: Tag `v1.0.0` + GitHub Release
   mit angehängtem `fehmarnopen.jar` entstehen. `main` bleibt auf `1.0.0`, bis das
   nächste Release eine neue Nummer setzt.

### Welcher Stand läuft?
`GET /api/version` (öffentlich) liefert die laufende Version, z. B.
`{"version":"1.0.0","buildTime":"..."}`. Für prod: `https://<prod-host>/api/version`.

### Rollback auf eine ältere Version
1. **Actions → „CI/CD" → Run workflow**.
2. Bei **„Use workflow from"** den Tag `vX.Y.Z` wählen, **Zielumgebung** = `prod`.
3. Die CI baut exakt den getaggten Quellstand und deployed ihn. Danach
   `GET /api/version` gegen prod prüfen.

> **Achtung Datenbank:** Liquibase-Schema-Änderungen rollen **nicht** automatisch
> zurück. Wenn sich das Schema zwischen den Versionen geändert hat, vorher
> [docs/datenbank-schema-aendern.md](datenbank-schema-aendern.md) lesen und ggf.
> manuell migrieren/Backup einspielen.
```

- [ ] **Step 2: Konventions-Notiz in `docs/changelog.md` ergänzen**

In `docs/changelog.md` nach dem einleitenden Absatz (vor dem ersten `## `-Abschnitt) einfügen:

```markdown
> **Release-Konvention:** Pro Release ein datierter Abschnitt hier; das zugehörige
> [GitHub Release](../../releases) (Tag `vX.Y.Z`) verlinkt auf diesen Changelog.
```

- [ ] **Step 3: Verweis in `AGENTS.md` ergänzen**

Eine passende Stelle in `AGENTS.md` (z. B. im Deployment-/Workflow-Abschnitt) um einen Satz erweitern:

```markdown
- **Releases:** Version wird per „Release (Bump-PR)"-Workflow gebumpt (SemVer, pom + package.json),
  nach dem Merge entsteht automatisch Tag + GitHub Release. Rollback + Details: `docs/deployment.md`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/deployment.md docs/changelog.md AGENTS.md
git commit -m "#202 Doku: Release-Prozess & Rollback"
```

---

## Self-Review

**Spec-Coverage:**
- Artefakt-Entkopplung (`finalName`) + `ci.yml` → Task 1 ✓
- Versionierung pom + package.json (SemVer, synchron) → Task 4 (Bump), Task 1/2 (pom-Basis) ✓
- Versions-Stamping / `build-info` → Task 2 ✓
- `GET /api/version` → Task 3 ✓
- `release.yml` (workflow_dispatch, Bump-PR) → Task 4 ✓
- Tag + GitHub Release nach Merge (idempotenter Guard) → Task 5 ✓
- Rollback-Doku (CI vom Tag, Liquibase-Caveat, /api/version) → Task 6 ✓
- Changelog bleibt `docs/changelog.md`, Konventions-Notiz → Task 6 ✓
- AGENTS.md-Verweis → Task 6 ✓
- Bewusst weggelassen (Maven Release Plugin, SNAPSHOT-Zyklus, Root-CHANGELOG, Docker) — kein Task, korrekt ✓

**Placeholder-Scan:** Keine TBD/TODO; alle Code-/YAML-Blöcke vollständig. Zwei „Hinweis"-Kästen dokumentieren bewusst mögliche Umgebungsabweichungen (Spring-Boot-Import, `gh`-Flag) mit konkretem Fallback — keine offenen Stellen.

**Typ-Konsistenz:** `VersionController.VersionResponse(String version, String buildTime)` in Task 3 durchgängig; Artefaktname `fehmarnopen.jar` in Task 1, 5 identisch; Tag-Schema `v<version>` in Task 4, 5, 6 identisch.
