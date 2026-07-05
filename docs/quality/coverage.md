# Test-Coverage & -Gates

Coverage misst, **wie viel** Code von Tests ausgeführt wird. Sie ist ein
Sicherheitsnetz, kein Selbstzweck: 100 % beweisen keine Korrektheit.

> **Entscheidung 2026-07-06 — keine harte Coverage-Zwangsgrenze.** Ein
> Build-brechendes Coverage-Gate (JaCoCo-`check` im Backend, `coverageThreshold`
> im Frontend) ist für dieses Projekt bewusst **nicht** gewollt — das ist ein
> Schritt zu viel. Coverage bleibt **messbar** (`npm run test:coverage`,
> JaCoCo-Report on demand), wird aber **nicht erzwungen**. Die Abschnitte unten
> beschreiben das Zielbild eines Gates als Referenz/Option, sind aber bewusst
> nicht umgesetzt. Vertrauen kommt hier aus den übrigen scharfen Gates (Format,
> Lint, statische Analyse, ArchUnit, JUnit/Jest). Tickets: #51 (Backend) `wontfix`,
> #47 (Frontend) ohne Schwelle.

## Grundsatz (gilt *falls* je ein Gate eingeführt wird)

- **Gate statt Wunsch:** Eine Schwelle, die den Build bricht. Ohne Gate wird
  Coverage ignoriert.
- **Baseline-first bei Big-Bang:** Erst real messen, Schwelle knapp **unter** den
  gemessenen Ist-Wert setzen (Build sofort grün), dann in kleinen Schritten anheben.
  Keine Fantasiezahl, die den Build am Einführungstag rot macht.
- **Sinnvolle Ausschlüsse:** Generiertes/triviales nicht mitzählen (Lombok, DTOs
  ohne Logik, `main`-Methode, Config-Klassen), sonst misst man Rauschen.
- **Qualität vor Quote:** Lieber die Kernlogik (`AnmeldungService`, Security,
  Fehlerbehandlung) gründlich als Getter auf 100 % zu treiben.

## Backend – JaCoCo (bewusst nicht umgesetzt, `wontfix`)

Kein Coverage-Tooling im Build. Das folgende Zielbild (JaCoCo im `verify`-Lauf mit
`check`-Gate) ist als **Referenz** dokumentiert, aber per Entscheidung oben nicht aktiviert.

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <executions>
    <execution><id>prepare</id><goals><goal>prepare-agent</goal></goals></execution>
    <execution>
      <id>report</id><phase>test</phase><goals><goal>report</goal></goals>
    </execution>
    <execution>
      <id>check</id><phase>verify</phase><goals><goal>check</goal></goals>
      <configuration>
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit><counter>LINE</counter><value>COVEREDRATIO</value>
                     <minimum>0.70</minimum></limit>   <!-- Start: an Baseline anpassen -->
              <limit><counter>BRANCH</counter><value>COVEREDRATIO</value>
                     <minimum>0.60</minimum></limit>
            </limits>
          </rule>
        </rules>
        <excludes>
          <exclude>de/dart/fehmarnopen/FehmarnopenApplication.class</exclude>
          <exclude>de/dart/fehmarnopen/**/*Properties.class</exclude>
          <exclude>de/dart/fehmarnopen/dto/**</exclude>
        </excludes>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Lombok-generierte Methoden mit `lombok.addLombokGeneratedAnnotation = true` in
`lombok.config` von JaCoCo ausschließen lassen.

## Frontend – Jest coverageThreshold (bewusst ohne Gate)

`test:coverage`-Script existiert und `collectCoverageFrom` ist gesetzt, aber es gibt
per Entscheidung oben **keine Schwelle** und CI misst keine Coverage. Das Zielbild in
`jest.config.ts` ist als Referenz dokumentiert, aber nicht aktiviert:

```ts
coverageThreshold: {
  global: { statements: 70, branches: 60, functions: 70, lines: 70 },
},
coverageReporters: ['text-summary', 'lcov'],
```

Ausschlüsse (bereits gesetzt): `*.spec.ts`, `main.ts`. Ergänzen: `*.config.ts`,
reine Modell-/Typdateien ohne Logik.

## CI-Integration (nur bei Bedarf/on demand)

Coverage ist kein CI-Gate. Wer sie lokal messen will:

- **Backend:** `./mvnw test` erzeugt aktuell keinen Coverage-Report (kein JaCoCo).
  Für eine einmalige Messung müsste das Plugin temporär eingehängt werden.
- **Frontend:** `npm run test:coverage` erzeugt lokal einen Report.

## Falls es doch je ein Gate werden soll

Dann Baseline-first (s. o.): real messen, Schwelle knapp unter Ist-Wert, in kleinen
PRs anheben (Zielkorridor Kernlogik ~80 %+ Lines / ~70 %+ Branches). **Aktuell
bewusst nicht verfolgt** — Tickets: #51 (Backend) `wontfix`, #47 (Frontend) ohne
Schwelle. Übersicht: [quality-roadmap.md](../tickets/quality-roadmap.md).
