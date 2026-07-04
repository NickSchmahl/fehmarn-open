# Backend – Architekturtests (ArchUnit)

Architekturtests sind ausführbarer, versionierter Architekturvertrag. Sie stellen
sicher, dass Schichten und Konventionen eingehalten werden – auch wenn ein
(menschlicher oder KI-)Beitragender die Struktur nicht kennt. Das ist zentral für
Vertrauen: Der Agent **kann** die Schichtung nicht versehentlich verletzen, ohne
dass der Build bricht.

Werkzeug: **ArchUnit** (`com.tngtech.archunit:archunit-junit5`), als normale
JUnit-Tests im `verify`-Lauf.

## Ist-Schichtung (aus `de.dart.fehmarnopen`)

```
controller  →  service  →  repository  →  (JPA / entity)
     │            │
     └── dto      └── event → mail
   config (Security, Async, Properties, DataInitializer)
   exception (GlobalExceptionHandler + fachliche Exceptions)
   auth (Controller, Filter, Service, DTOs)
```

## Regeln, die erzwungen werden sollen

### Schichtzugriff (layered architecture)
```java
layeredArchitecture().consideringOnlyDependenciesInLayers()
  .layer("Controller").definedBy("..controller..", "..auth..")
  .layer("Service").definedBy("..service..")
  .layer("Repository").definedBy("..repository..")
  .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
  .whereLayer("Service").mayOnlyBeAccessedByLayers("Controller")
  .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service");
```

### Konkrete Verbotsregeln
- **Controller greifen nicht direkt auf Repositories zu** (immer über Service).
- **Repositories geben keine Web-DTOs zurück** und Controller reichen **keine
  Entities** nach außen (nur `dto/`-Klassen in Responses).
- **Keine zyklischen Abhängigkeiten** zwischen Packages (`slices().should().beFreeOfCycles()`).
- **Kein Field-Injection**: Felder dürfen nicht `@Autowired` sein →
  Konstruktor-Injektion erzwingen (testbar, unveränderlich).
- **`entity/`-Klassen hängen nicht von `controller/`/`service/` ab** (Domänenkern rein).
- **`javax/jakarta.persistence`-Annotationen nur in `entity/`** (kein JPA-Leak in Services).
- **Standard-Logging/keine `System.out`**: `System.out`/`System.err` verboten.

### Namens-/Struktur-Konventionen
- Klassen in `..controller..` enden auf `Controller` und tragen `@RestController`.
- Klassen in `..service..` enden auf `Service` und tragen `@Service`.
- Klassen in `..repository..` sind Interfaces und erweitern ein Spring-Data-Repository.
- Exceptions liegen in `..exception..` und enden auf `Exception`.

## Beispiel-Testklasse

```java
@AnalyzeClasses(packages = "de.dart.fehmarnopen",
                importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitekturTest {

  @ArchTest static final ArchRule schichten = layeredArchitecture()... ;

  @ArchTest static final ArchRule keineZyklen =
      slices().matching("de.dart.fehmarnopen.(*)..").should().beFreeOfCycles();

  @ArchTest static final ArchRule controllerNamen =
      classes().that().resideInAPackage("..controller..")
               .should().haveSimpleNameEndingWith("Controller")
               .andShould().beAnnotatedWith(RestController.class);

  @ArchTest static final ArchRule keinFieldInjection =
      noFields().should().beAnnotatedWith(Autowired.class);
}
```

## Einführung (Big-Bang)
1. `archunit-junit5` als `test`-Dependency.
2. Alle Regeln oben scharf.
3. Bestandsverstöße im selben PR beheben (bei sauberer Schichtung erwartet gering).
4. Grün → Merge. Ab dann bricht jede Schichtverletzung den Build.

Ticket: **GitHub #49** (Übersicht: [quality-roadmap.md](../tickets/quality-roadmap.md)).
