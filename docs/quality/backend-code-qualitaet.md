# Backend – Code-Qualität: Formatierung & statische Analyse

Zielbild eines **sofort strengen** Backends. Umsetzung ticketweise
(siehe [quality-roadmap.md](../tickets/quality-roadmap.md)).

> **Ist-Stand:** Spotless (#48), SpotBugs+FindSecBugs und PMD (#50) sind an
> `verify` **aktiv und scharf**. `./mvnw verify` = CI-Wahrheit. Details zur
> konkreten Konfiguration und zu den bewusst begründeten Ausnahmen unten in
> [Abschnitt 6](#6-ist-umgesetzt-in-50--java-25-besonderheiten--ausnahmen).

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

## 6. Ist (umgesetzt in #50) – Java-25-Besonderheiten & Ausnahmen

Konkrete Konfiguration in `backend/pom.xml`, `backend/spotbugs-exclude.xml`,
`backend/pmd-ruleset.xml`, `backend/lombok.config`.

### Java-25-Kompatibilität (wichtig)
Beide Tools sind bleeding-edge gegenüber Java 25:
- **SpotBugs 4.9.3** brachte ein ASM mit, das Java 25 (class file version 69) nicht
  kennt → `Unsupported class file major version 69`. Behoben, indem **ASM auf 9.10.1
  hochgezogen** wird (Plugin-`<dependencies>` im spotbugs-maven-plugin).
- **maven-pmd-plugin 3.28.0** kennt `targetJdk` „25" noch nicht
  („Unsupported targetJdk value '25'"). PMD parst nur **Quelltext** (kein Bytecode);
  der Code nutzt keine Java-25-only-Syntax → `targetJdk` auf **24** gesetzt (höchste
  vom Plugin akzeptierte Version). Beim nächsten Plugin-Update auf `${java.version}`
  zurückstellen.

### Lombok
`backend/lombok.config` mit `lombok.addLombokGeneratedAnnotation = true` → SpotBugs
ignoriert generierte Methoden automatisch.

### Bewusst begründete Ausnahmen
Big-Bang-Prinzip: Verstöße wurden **behoben**, nur Framework-Idiome sind unterdrückt.

**SpotBugs/FindSecBugs** (`spotbugs-exclude.xml`) – jeweils mit Begründung im File:
- `SPRING_ENDPOINT`, `SERVLET_HEADER` – informativ bzw. inhärent (Auth-Filter muss
  den Header lesen; Absicherung via JWT-Signatur).
- `EI_EXPOSE_REP` / `EI_EXPOSE_REP2` – feuert auf unveränderliche DTO-Records,
  JPA-Entities und injizierte Singleton-Beans; kein echtes Mutable-State-Leak.
- `CRLF_INJECTION_LOGS` – geloggt werden nur vertrauenswürdige Config-Werte bzw.
  Library-Exception-Messages (debug), kein ungeprüftes Request-Payload.

**PMD** (`pmd-ruleset.xml`): Formatierung (Spotless) und Namens-/Strukturkonventionen
(ArchUnit) sind ausgenommen; zusätzlich `AvoidCatchingGenericException` (bewusste
Fail-Safe-Boundaries im Auth-Filter), `UseUtilityClass` (Spring-Boot-Main),
`AvoidInstantiatingObjectsInLoops` (ein Objekt pro Input ist inhärent).

**Im Code behoben** (nicht unterdrückt): `CT_CONSTRUCTOR_THROW` → `JwtService` final;
`REC_CATCH_EXCEPTION` → `catch(RuntimeException)`; `SE_NO_SERIALVERSIONID` →
`serialVersionUID` in `AdminUser`; `RedundantFieldInitializer` → redundante
`= false`-Initializer entfernt.

## Coverage
Eigenes Thema: [coverage.md](coverage.md) (JaCoCo mit Schwelle).
