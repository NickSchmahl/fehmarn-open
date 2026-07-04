# Test-Coverage & -Gates

Coverage misst, **wie viel** Code von Tests ausgeführt wird. Sie ist ein
Sicherheitsnetz, kein Selbstzweck: 100 % beweisen keine Korrektheit, aber ein
**Gate** verhindert, dass ungetesteter Code unbemerkt nach `main` rutscht – genau
die Absicherung, die Vertrauen in automatisierte Änderungen schafft.

## Grundsatz

- **Gate statt Wunsch:** Eine Schwelle, die den Build bricht. Ohne Gate wird
  Coverage ignoriert.
- **Baseline-first bei Big-Bang:** Erst real messen, Schwelle knapp **unter** den
  gemessenen Ist-Wert setzen (Build sofort grün), dann in kleinen Schritten anheben.
  Keine Fantasiezahl, die den Build am Einführungstag rot macht.
- **Sinnvolle Ausschlüsse:** Generiertes/triviales nicht mitzählen (Lombok, DTOs
  ohne Logik, `main`-Methode, Config-Klassen), sonst misst man Rauschen.
- **Qualität vor Quote:** Lieber die Kernlogik (`AnmeldungService`, Security,
  Fehlerbehandlung) gründlich als Getter auf 100 % zu treiben.

## Backend – JaCoCo (Ist: fehlt)

Kein Coverage-Tooling vorhanden. Zielbild: JaCoCo im `verify`-Lauf mit `check`-Gate.

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

## Frontend – Jest coverageThreshold (Ist: Script da, kein Gate)

`test:coverage`-Script existiert und `collectCoverageFrom` ist gesetzt, aber es gibt
**keine Schwelle** und CI misst keine Coverage. Zielbild in `jest.config.ts`:

```ts
coverageThreshold: {
  global: { statements: 70, branches: 60, functions: 70, lines: 70 },
},
coverageReporters: ['text-summary', 'lcov'],
```

Ausschlüsse (bereits gesetzt): `*.spec.ts`, `main.ts`. Ergänzen: `*.config.ts`,
reine Modell-/Typdateien ohne Logik.

## CI-Integration

- **Backend:** JaCoCo läuft ohnehin in `./mvnw verify` mit (bereits im CI-Job).
- **Frontend:** CI-Testschritt auf `--coverage` umstellen, damit das Gate greift:
  ```yaml
  - name: Tests mit Coverage
    run: npm test -- --coverage --watch=false
  ```
- Optional: Coverage-Report als CI-Artefakt hochladen / PR-Kommentar (z.B. über eine
  Coverage-Action), um Trends sichtbar zu machen.

## Roadmap: Schwellen anheben

Nach Einführung schrittweise erhöhen (z.B. +5 Prozentpunkte je stabilem Sprint),
Zielkorridor Kernlogik ~80 %+ Lines / ~70 %+ Branches. Anhebungen als kleine PRs.

Tickets: **GitHub #51** (JaCoCo/Backend), **#47** (Jest/Frontend). Übersicht: [quality-roadmap.md](../tickets/quality-roadmap.md).
