# Backend – Code-Qualität: Formatierung & statische Analyse

Zielbild eines **sofort strengen** Backends. Alle Vorschläge sind noch **nicht
umgesetzt**, außer explizit als „Ist" markiert. Umsetzung ticketweise
(siehe [quality-roadmap.md](../tickets/quality-roadmap.md)).

## 1. Formatierung – Spotless (Ist: aktiv, aber minimal)

**Ist** (`backend/pom.xml`): `palantirJavaFormat` + `trimTrailingWhitespace` +
`endWithNewline`, gebunden an `verify`. CI ruft zusätzlich `spotless:check`.

**Zielbild – strenger:**

```xml
<configuration>
  <java>
    <palantirJavaFormat><version>2.71.0</version></palantirJavaFormat>
    <importOrder/>                <!-- deterministische Import-Reihenfolge -->
    <removeUnusedImports/>        <!-- tote Imports raus -->
    <formatAnnotations/>          <!-- Annotationen einheitlich -->
    <trimTrailingWhitespace/>
    <endWithNewline/>
  </java>
  <pom>
    <sortPom>                     <!-- pom.xml deterministisch sortiert -->
      <expandEmptyElements>false</expandEmptyElements>
    </sortPom>
  </pom>
</configuration>
```

Optional: Lizenz-/Header-Kommentar erzwingen (`<licenseHeader>`), falls gewünscht.

## 2. Statische Analyse – Bug- und Design-Regeln

Spotless prüft nur **Stil**. Bugs, Ressourcenlecks, Null-Fehler brauchen echte
Analyse. Empfohlener, verlässlicher Stack für **Java 25**:

### SpotBugs (+ FindSecBugs)
Bytecode-Analyse für klassische Bug-Muster (Null-Deref, offene Ressourcen,
falsches equals/hashCode). Mit `findsecbugs`-Plugin auch Sicherheitsmuster.

```xml
<plugin>
  <groupId>com.github.spotbugs</groupId>
  <artifactId>spotbugs-maven-plugin</artifactId>
  <configuration>
    <effort>Max</effort>
    <threshold>Low</threshold>       <!-- streng: auch schwache Warnungen -->
    <failOnError>true</failOnError>
    <plugins>
      <plugin>
        <groupId>com.h3xstream.findsecbugs</groupId>
        <artifactId>findsecbugs-plugin</artifactId>
        <version>1.13.0</version>
      </plugin>
    </plugins>
  </configuration>
  <executions>
    <execution><goals><goal>check</goal></goals><phase>verify</phase></execution>
  </executions>
</plugin>
```

### PMD
Quelltext-Analyse für Design-/Komplexitätsregeln (zu lange Methoden, leere Catches,
zyklomatische Komplexität, ungenutzte Variablen). Regelsatz kuratiert in
`backend/pmd-ruleset.xml` ablegen, Lombok-generierten Code ausschließen.

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-pmd-plugin</artifactId>
  <configuration>
    <failOnViolation>true</failOnViolation>
    <printFailingErrors>true</printFailingErrors>
    <rulesets><ruleset>pmd-ruleset.xml</ruleset></rulesets>
  </configuration>
  <executions>
    <execution><goals><goal>check</goal></goals><phase>verify</phase></execution>
  </executions>
</plugin>
```

### Error Prone + NullAway (optional, aspirational)
Stärkstes Werkzeug gegen NPEs/Bugs zur **Compile-Zeit**. **Risiko:** Error Prone
hinkt neuen JDKs hinterher – Kompatibilität mit **Java 25 + Lombok** vor Einbau
verifizieren. Bis dahin ist SpotBugs+PMD der verlässliche Weg. Wenn verfügbar:
NullAway auf `de.dart.fehmarnopen` scharf schalten (nur annotierte Null-Pfade erlaubt).

## 3. Checkstyle – bewusst NICHT
Formatierung deckt Spotless (palantir) bereits vollständig ab; Checkstyle wäre
größtenteils redundant und konfliktträchtig. Namens-/Strukturkonventionen werden
über **ArchUnit** ([backend-architektur-tests.md](backend-architektur-tests.md))
erzwungen, was mächtiger und projektnäher ist.

## 4. Zusammenspiel & Build-Reihenfolge

```
compile → (Error Prone falls aktiv) → test → verify:
    spotless:check → spotbugs:check → pmd:check → jacoco:check → ArchUnit-Tests
```

Alles hängt an `verify`, damit lokal `./mvnw verify` = CI-Wahrheit ist.

## 5. Umgang mit Lombok
Lombok-generierter Code darf statische Analyse nicht fluten:
- SpotBugs: `lombok.addLombokGeneratedAnnotation = true` in `lombok.config`,
  dann ignoriert SpotBugs generierte Methoden automatisch.
- PMD: generierte Klassen/Pfad ausschließen.

## Coverage
Eigenes Thema: [coverage.md](coverage.md) (JaCoCo mit Schwelle).
