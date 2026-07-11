# Anmeldeschluss 28.02.2027 – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nach dem Anmeldeschluss (Default 28.02.2027) lehnt das Backend Anmeldungen ab und das Frontend zeigt eine Infoseite statt des Formulars.

**Architecture:** Deadline als Server-Config (`@ConfigurationProperties`, per ENV überschreibbar), ausgewertet in einem eigenen `AnmeldeschlussService` mit injiziertem `Clock` (testbar). `AnmeldungService.anmelden()` prüft die Deadline und wirft die bestehende `AnmeldungGesperrtException` (403). Ein öffentlicher `GET /api/anmeldung/status` liefert dem Frontend den Status; die Anmeldekomponente lädt ihn in `ngOnInit` und rendert Formular **oder** Infoseite. Die ungenutzte DB-Tabelle `turnier_config` wird entfernt.

**Tech Stack:** Backend Spring Boot (Java 21, Lombok, JUnit 5 + Mockito + AssertJ, MockMvc, Liquibase/SQLite). Frontend Angular (Standalone Components, Signals, Reactive Forms, Jest).

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-11-anmeldeschluss-design.md` (verbindlich).
- **Zeitzone/Semantik:** `Europe/Berlin`, inklusive bis Tagesende — Anmeldung offen, solange `jetzt < anmeldeschluss.plusDays(1).atStartOfDay(Europe/Berlin)`. Der 28.02. ist ganztags offen.
- **HTTP-Status:** abgelehnte späte Anmeldung = **403 Forbidden** (bereits im `GlobalExceptionHandler` verdrahtet).
- **Default-Deadline:** `2027-02-28`, per ENV `ANMELDESCHLUSS` überschreibbar.
- **DI-Feld heißt wie der Typ** (ArchUnit): Feld für `AnmeldeschlussService` heißt `anmeldeschlussService`, für `AnmeldungProperties` `anmeldungProperties`, für `Clock` `clock`.
- **Fachliche Service-Tests** mit `@Nested` je Methode-unter-Test, kurze Verhaltens-Testnamen (ADR 0012).
- **Echte Umlaute** (ä/ö/ü/ß) auch in Kommentaren, nicht ae/oe/ue.
- **DB:** Schema nur über Liquibase (ddl-auto:none, ADR 0009) — Schema-Änderung = **neuer** Changeset, kein Reset. `DROP TABLE` ist auf SQLite ohne Rebuild erlaubt.
- **Vor jedem Commit** volle lokale Quality-Gate: Backend `./mvnw spotless:apply` + `./mvnw verify`; Frontend `npm run lint` + `npm test` + `npm run format:check`.
- **Commits:** kurz, deutsch, mit `#153`. Kein amend/force-push, kein `git add -A`.

---

### Task 1: Deadline-Config + AnmeldeschlussService

**Files:**
- Create: `backend/src/main/java/de/dart/fehmarnopen/config/AnmeldungProperties.java`
- Create: `backend/src/main/java/de/dart/fehmarnopen/config/ClockConfig.java`
- Create: `backend/src/main/java/de/dart/fehmarnopen/service/AnmeldeschlussService.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/exception/AnmeldungGesperrtException.java`
- Modify: `backend/src/main/resources/application.yaml` (Block `fehmarnopen:`)
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/AnmeldeschlussServiceTest.java`

**Interfaces:**
- Produces:
  - `AnmeldungProperties` mit `LocalDate getAnmeldeschluss()` / `setAnmeldeschluss(LocalDate)`.
  - `AnmeldeschlussService` mit `LocalDate anmeldeschluss()`, `boolean anmeldungOffen()`, `void pruefeAnmeldungOffen()`.
  - `AnmeldungGesperrtException(String anmeldeschlussDatum)` — Meldung enthält das Datum.
  - Bean `Clock clock()` (System-Default-Zone).

- [ ] **Step 1: Config-Klassen und Exception-Konstruktor anlegen (Produktivcode zuerst, da der Test die konkreten Typen konstruiert)**

`AnmeldungProperties.java`:

```java
package de.dart.fehmarnopen.config;

import java.time.LocalDate;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Fachliche Anmeldung-Konfiguration (Server-Config, per ENV überschreibbar). Siehe ADR 0013. */
@Getter
@Setter
@ConfigurationProperties(prefix = "fehmarnopen.anmeldung")
@Component
public class AnmeldungProperties {

    /**
     * Letzter Tag, an dem Online-Anmeldungen möglich sind (inklusive, Ende des Tages Europe/Berlin).
     * Default in application.yaml: 2027-02-28.
     */
    private LocalDate anmeldeschluss;
}
```

`ClockConfig.java`:

```java
package de.dart.fehmarnopen.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Stellt eine injizierbare Uhr bereit, damit zeitabhängige Logik in Tests deterministisch prüfbar ist. */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
```

`AnmeldungGesperrtException.java` — den parameterlosen Konstruktor durch einen mit Datum ersetzen (die Klasse wird bisher nirgends instanziiert, nur im `GlobalExceptionHandler` referenziert):

```java
package de.dart.fehmarnopen.exception;

public class AnmeldungGesperrtException extends RuntimeException {

    public AnmeldungGesperrtException(String anmeldeschlussDatum) {
        super("Der Anmeldeschluss war am " + anmeldeschlussDatum
                + " – eine Anmeldung ist nicht mehr möglich.");
    }
}
```

- [ ] **Step 2: Failing test schreiben**

`AnmeldeschlussServiceTest.java`:

```java
package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.dart.fehmarnopen.config.AnmeldungProperties;
import de.dart.fehmarnopen.exception.AnmeldungGesperrtException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class AnmeldeschlussServiceTest {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final LocalDate SCHLUSS = LocalDate.of(2027, 2, 28);

    /** Baut den Service mit fester Deadline und einer auf den Zeitpunkt fixierten Uhr. */
    private AnmeldeschlussService serviceUm(LocalDateTime zeitpunktBerlin) {
        AnmeldungProperties properties = new AnmeldungProperties();
        properties.setAnmeldeschluss(SCHLUSS);
        Clock fixeUhr = Clock.fixed(zeitpunktBerlin.atZone(BERLIN).toInstant(), BERLIN);
        return new AnmeldeschlussService(properties, fixeUhr);
    }

    @Nested
    class AnmeldungOffenTest {

        @Test
        void vorDemStichtagIstOffen() {
            assertThat(serviceUm(LocalDateTime.of(2027, 2, 1, 12, 0)).anmeldungOffen()).isTrue();
        }

        @Test
        void amStichtagFruehIstOffen() {
            assertThat(serviceUm(LocalDateTime.of(2027, 2, 28, 0, 0)).anmeldungOffen()).isTrue();
        }

        @Test
        void amStichtagSpaetIstOffen() {
            assertThat(serviceUm(LocalDateTime.of(2027, 2, 28, 23, 59)).anmeldungOffen()).isTrue();
        }

        @Test
        void abFolgetagMitternachtIstZu() {
            assertThat(serviceUm(LocalDateTime.of(2027, 3, 1, 0, 0)).anmeldungOffen()).isFalse();
        }
    }

    @Nested
    class PruefeAnmeldungOffenTest {

        @Test
        void wennOffenWirftNicht() {
            assertThatCode(() -> serviceUm(LocalDateTime.of(2027, 2, 28, 23, 59)).pruefeAnmeldungOffen())
                    .doesNotThrowAnyException();
        }

        @Test
        void wennZuWirftMitDatumInDerMeldung() {
            assertThatThrownBy(() -> serviceUm(LocalDateTime.of(2027, 3, 1, 0, 0)).pruefeAnmeldungOffen())
                    .isInstanceOf(AnmeldungGesperrtException.class)
                    .hasMessageContaining("28.02.2027");
        }
    }
}
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag verifizieren**

Run: `cd backend && ./mvnw test -Dtest=AnmeldeschlussServiceTest`
Expected: FAIL — Compile-Fehler „cannot find symbol: class AnmeldeschlussService".

- [ ] **Step 4: `AnmeldeschlussService` implementieren**

`AnmeldeschlussService.java`:

```java
package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.config.AnmeldungProperties;
import de.dart.fehmarnopen.exception.AnmeldungGesperrtException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Kapselt die Anmeldeschluss-Logik: bis wann Anmeldungen erlaubt sind (Server-Config, siehe ADR 0013). */
@Service
@RequiredArgsConstructor
public class AnmeldeschlussService {

    /** Das Turnier findet auf Fehmarn statt; der Stichtag gilt in deutscher Zeit. */
    private static final ZoneId ZONE = ZoneId.of("Europe/Berlin");

    private static final DateTimeFormatter DATUM_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final AnmeldungProperties anmeldungProperties;
    private final Clock clock;

    public LocalDate anmeldeschluss() {
        return anmeldungProperties.getAnmeldeschluss();
    }

    /** Offen, solange die aktuelle Zeit vor Beginn des Folgetags des Anmeldeschlusses liegt (inkl. Tagesende). */
    public boolean anmeldungOffen() {
        ZonedDateTime jetzt = clock.instant().atZone(ZONE);
        ZonedDateTime schlussEnde = anmeldeschluss().plusDays(1).atStartOfDay(ZONE);
        return jetzt.isBefore(schlussEnde);
    }

    public void pruefeAnmeldungOffen() {
        if (!anmeldungOffen()) {
            throw new AnmeldungGesperrtException(anmeldeschluss().format(DATUM_FORMAT));
        }
    }
}
```

- [ ] **Step 5: Default-Deadline in `application.yaml` ergänzen**

Im Block `fehmarnopen:` (unter `admin:`) ergänzen:

```yaml
fehmarnopen:
  admin:
    accounts:
      - username: ${ADMIN_1_USERNAME:admin1}
        password: ${ADMIN_1_PASSWORD}
      - username: ${ADMIN_2_USERNAME:admin2}
        password: ${ADMIN_2_PASSWORD}
  anmeldung:
    # Letzter Anmeldetag (inklusive, Ende des Tages Europe/Berlin). Per ENV ANMELDESCHLUSS
    # überschreibbar. Flyer 2027: Anmeldeschluss 28. Februar 2027 (#153, ADR 0013).
    anmeldeschluss: ${ANMELDESCHLUSS:2027-02-28}
```

- [ ] **Step 6: Test laufen lassen, Erfolg verifizieren**

Run: `cd backend && ./mvnw test -Dtest=AnmeldeschlussServiceTest`
Expected: PASS (6 Tests grün).

- [ ] **Step 7: Formatieren + Commit**

```bash
cd backend && ./mvnw spotless:apply
cd .. && git add backend/src/main/java/de/dart/fehmarnopen/config/AnmeldungProperties.java \
  backend/src/main/java/de/dart/fehmarnopen/config/ClockConfig.java \
  backend/src/main/java/de/dart/fehmarnopen/service/AnmeldeschlussService.java \
  backend/src/main/java/de/dart/fehmarnopen/exception/AnmeldungGesperrtException.java \
  backend/src/main/resources/application.yaml \
  backend/src/test/java/de/dart/fehmarnopen/service/AnmeldeschlussServiceTest.java
git commit -m "#153 Anmeldeschluss-Config + AnmeldeschlussService (Clock-basiert, testbar)"
```

---

### Task 2: Sperre in `AnmeldungService.anmelden()`

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java`

**Interfaces:**
- Consumes: `AnmeldeschlussService.pruefeAnmeldungOffen()` (Task 1).
- Produces: `AnmeldungService.anmelden()` wirft `AnmeldungGesperrtException`, wenn geschlossen — **bevor** irgendetwas gespeichert wird.

- [ ] **Step 1: Failing tests ergänzen**

In `AnmeldungServiceTest.java` das Mock-Feld ergänzen (nach den bestehenden `@Mock`-Feldern, vor `@InjectMocks`):

```java
    // Blackbox: die Stichtags-Logik selbst ist in AnmeldeschlussServiceTest abgedeckt.
    @Mock
    private de.dart.fehmarnopen.service.AnmeldeschlussService anmeldeschlussService;
```

Und zwei neue Testmethoden ergänzen (z. B. am Ende der Klasse). Der Import wird gebraucht:

```java
import de.dart.fehmarnopen.exception.AnmeldungGesperrtException;
```

```java
    @Test
    void anmelden_wennAnmeldungGesperrt_wirftUndSpeichertNichts() {
        org.mockito.Mockito.doThrow(new AnmeldungGesperrtException("28.02.2027"))
                .when(anmeldeschlussService)
                .pruefeAnmeldungOffen();
        AnmeldungRequest request = new AnmeldungRequest(
                List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request))
                .isInstanceOf(AnmeldungGesperrtException.class);

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void anmelden_wennAnmeldungOffen_speichertNormal() {
        when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        AnmeldungRequest request = new AnmeldungRequest(
                List.of(new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M")))));

        List<Anmeldung> result = anmeldungService.anmelden(request);

        assertThat(result).hasSize(1);
        verify(anmeldeschlussService).pruefeAnmeldungOffen();
    }
```

Hinweis: Die bestehenden Tests bleiben unverändert grün — der `@Mock anmeldeschlussService` tut bei `pruefeAnmeldungOffen()` per Default nichts (void), sperrt also nicht.

- [ ] **Step 2: Test laufen lassen, Fehlschlag verifizieren**

Run: `cd backend && ./mvnw test -Dtest=AnmeldungServiceTest`
Expected: FAIL — Compile-Fehler (Konstruktor von `AnmeldungService` kennt `AnmeldeschlussService` noch nicht) bzw. `anmelden_wennAnmeldungGesperrt...` speichert noch.

- [ ] **Step 3: `AnmeldungService` verdrahten**

In `AnmeldungService.java` das Feld ergänzen (bei den anderen `private final`-Feldern):

```java
    private final AnmeldeschlussService anmeldeschlussService;
```

Import ergänzen:

```java
import de.dart.fehmarnopen.service.AnmeldeschlussService;
```
(Gleiches Paket — Import ist optional; falls Spotless ihn entfernt, ist das ok.)

Und in `anmelden(...)` als **erste** Zeile die Prüfung einziehen:

```java
    @Transactional
    public List<Anmeldung> anmelden(AnmeldungRequest request) {
        anmeldeschlussService.pruefeAnmeldungOffen();
        pruefeKeineDoppeltenDisziplinen(request);
        return request.disziplinen().stream().map(this::anmeldenFuerDisziplin).toList();
    }
```

- [ ] **Step 4: Test laufen lassen, Erfolg verifizieren**

Run: `cd backend && ./mvnw test -Dtest=AnmeldungServiceTest`
Expected: PASS (alle bestehenden + 2 neue Tests grün).

- [ ] **Step 5: Formatieren + Commit**

```bash
cd backend && ./mvnw spotless:apply
cd .. && git add backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java \
  backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java
git commit -m "#153 Anmeldung nach Anmeldeschluss serverseitig ablehnen (403)"
```

---

### Task 3: Status-Endpoint `GET /api/anmeldung/status`

**Files:**
- Create: `backend/src/main/java/de/dart/fehmarnopen/dto/AnmeldeschlussStatusResponse.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/controller/AnmeldungController.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/config/SecurityConfig.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/controller/AnmeldungControllerTest.java`

**Interfaces:**
- Consumes: `AnmeldeschlussService.anmeldungOffen()`, `AnmeldeschlussService.anmeldeschluss()` (Task 1).
- Produces: `GET /api/anmeldung/status` → JSON `{ "anmeldungOffen": true, "anmeldeschluss": "2027-02-28" }` (LocalDate ISO). Öffentlich erreichbar.

- [ ] **Step 1: DTO anlegen**

`AnmeldeschlussStatusResponse.java`:

```java
package de.dart.fehmarnopen.dto;

import java.time.LocalDate;

/** Öffentlicher Anmeldeschluss-Status fürs Frontend: ob Anmeldung offen ist und der Stichtag. */
public record AnmeldeschlussStatusResponse(boolean anmeldungOffen, LocalDate anmeldeschluss) {}
```

- [ ] **Step 2: Failing tests ergänzen**

In `AnmeldungControllerTest.java` die Imports ergänzen:

```java
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import de.dart.fehmarnopen.service.AnmeldeschlussService;
import java.time.LocalDate;
```

Das gemockte Feld ergänzen (neben `@MockitoBean AnmeldungService`):

```java
    @MockitoBean
    private AnmeldeschlussService anmeldeschlussService;
```

Und zwei Tests ergänzen:

```java
    @Test
    void getStatus_wennOffen_sollOffenUndDatumZurueckgeben() throws Exception {
        when(anmeldeschlussService.anmeldungOffen()).thenReturn(true);
        when(anmeldeschlussService.anmeldeschluss()).thenReturn(LocalDate.of(2027, 2, 28));

        mockMvc.perform(get("/api/anmeldung/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anmeldungOffen").value(true))
                .andExpect(jsonPath("$.anmeldeschluss").value("2027-02-28"));
    }

    @Test
    void getStatus_wennGeschlossen_sollAnmeldungOffenFalseZurueckgeben() throws Exception {
        when(anmeldeschlussService.anmeldungOffen()).thenReturn(false);
        when(anmeldeschlussService.anmeldeschluss()).thenReturn(LocalDate.of(2027, 2, 28));

        mockMvc.perform(get("/api/anmeldung/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anmeldungOffen").value(false));
    }
```

- [ ] **Step 3: Test laufen lassen, Fehlschlag verifizieren**

Run: `cd backend && ./mvnw test -Dtest=AnmeldungControllerTest`
Expected: FAIL — Compile-Fehler (`AnmeldeschlussService` als Controller-Dependency nicht vorhanden) bzw. 404 für `/status`.

- [ ] **Step 4: Controller-Endpoint implementieren**

`AnmeldungController.java` — Feld + GET-Methode ergänzen, Imports ergänzen:

```java
package de.dart.fehmarnopen.controller;

import de.dart.fehmarnopen.dto.AnmeldeschlussStatusResponse;
import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungResponse;
import de.dart.fehmarnopen.service.AnmeldeschlussService;
import de.dart.fehmarnopen.service.AnmeldungService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/anmeldung")
@RequiredArgsConstructor
public class AnmeldungController {

    private final AnmeldungService anmeldungService;
    private final AnmeldeschlussService anmeldeschlussService;

    @PostMapping
    public ResponseEntity<AnmeldungResponse> anmelden(@Valid @RequestBody AnmeldungRequest request) {
        var anmeldungen = anmeldungService.anmelden(request);
        return ResponseEntity.ok(AnmeldungResponse.from(anmeldungen));
    }

    @GetMapping("/status")
    public AnmeldeschlussStatusResponse status() {
        return new AnmeldeschlussStatusResponse(
                anmeldeschlussService.anmeldungOffen(), anmeldeschlussService.anmeldeschluss());
    }
}
```

- [ ] **Step 5: Endpoint in `SecurityConfig` öffentlich freigeben**

In `SecurityConfig.java` in der `authorizeHttpRequests`-Kette nach der `POST /api/anmeldung`-Zeile ergänzen:

```java
                                .requestMatchers(HttpMethod.POST, "/api/anmeldung")
                                .permitAll()
                                .requestMatchers(HttpMethod.GET, "/api/anmeldung/status")
                                .permitAll()
```

- [ ] **Step 6: Test laufen lassen, Erfolg verifizieren**

Run: `cd backend && ./mvnw test -Dtest=AnmeldungControllerTest`
Expected: PASS (alle bestehenden + 2 neue Tests grün).

Hinweis: `AnmeldungControllerTest` nutzt `TestSecurityConfig`, nicht die echte `SecurityConfig`; die permitAll-Änderung ist dort nicht test-sichtbar, aber unschädlich. Der volle `verify`-Lauf in Task 6 deckt den Kontextstart mit echter Security ab.

- [ ] **Step 7: Formatieren + Commit**

```bash
cd backend && ./mvnw spotless:apply
cd .. && git add backend/src/main/java/de/dart/fehmarnopen/dto/AnmeldeschlussStatusResponse.java \
  backend/src/main/java/de/dart/fehmarnopen/controller/AnmeldungController.java \
  backend/src/main/java/de/dart/fehmarnopen/config/SecurityConfig.java \
  backend/src/test/java/de/dart/fehmarnopen/controller/AnmeldungControllerTest.java
git commit -m "#153 Öffentlicher GET /api/anmeldung/status für Frontend"
```

---

### Task 4: Tote `TurnierConfig`-Tabelle entfernen

**Files:**
- Delete: `backend/src/main/java/de/dart/fehmarnopen/entity/TurnierConfig.java`
- Create: `backend/src/main/resources/db/changelog/changes/003-drop-turnier-config.sql`
- Modify: `backend/src/main/resources/db/changelog/db.changelog-master.yaml`
- Modify: `backend/src/test/java/de/dart/fehmarnopen/db/SchemaMigrationTest.java`

**Interfaces:**
- Produces: Schema ohne Tabelle `turnier_config`; keine Entity `TurnierConfig` mehr. (Entkoppelt von Tasks 1–3.)

- [ ] **Step 1: Changeset anlegen**

`003-drop-turnier-config.sql`:

```sql
--liquibase formatted sql

--changeset fehmarnopen:003-drop-turnier-config
--comment: Entfernt die ungenutzte Tabelle turnier_config. Der Anmeldeschluss wird als Server-Config gesetzt (fehmarnopen.anmeldung.anmeldeschluss), nicht in der DB (#153, ADR 0013). SQLite erlaubt DROP TABLE ohne Rebuild.
drop table turnier_config;
```

- [ ] **Step 2: Changeset ins Master-Changelog einbinden**

`db.changelog-master.yaml` am Ende ergänzen:

```yaml
  - include:
      file: changes/003-drop-turnier-config.sql
      relativeToChangelogFile: true
```

- [ ] **Step 3: Entity + zugehörigen Test entfernen**

Datei `TurnierConfig.java` löschen:

```bash
git rm backend/src/main/java/de/dart/fehmarnopen/entity/TurnierConfig.java
```

In `SchemaMigrationTest.java`:
- Testmethode `turnierConfig_persistiertUndLiestAlleFelderZurueck()` (Zeilen 84–98) komplett entfernen.
- Import `import de.dart.fehmarnopen.entity.TurnierConfig;` entfernen.
- Import `import java.time.LocalDateTime;` entfernen (wird nur von dieser Methode benutzt).

- [ ] **Step 4: Migration + Persistenz-Tests laufen lassen**

Run: `cd backend && ./mvnw test -Dtest=SchemaMigrationTest`
Expected: PASS — die Migrationen 001→002→003 laufen durch, `turnier_config` ist entfernt, die verbleibenden Round-Trip-Tests sind grün.

- [ ] **Step 5: Formatieren + Commit**

```bash
cd backend && ./mvnw spotless:apply
cd .. && git add backend/src/main/resources/db/changelog/changes/003-drop-turnier-config.sql \
  backend/src/main/resources/db/changelog/db.changelog-master.yaml \
  backend/src/test/java/de/dart/fehmarnopen/db/SchemaMigrationTest.java \
  backend/src/main/java/de/dart/fehmarnopen/entity/TurnierConfig.java
git commit -m "#153 Tote turnier_config-Tabelle + Entity entfernen (Changeset 003)"
```

---

### Task 5: Frontend – Status laden + Infoseite

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.ts`
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.html`
- Test: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts`

**Interfaces:**
- Consumes: `GET /api/anmeldung/status` → `{ anmeldungOffen: boolean, anmeldeschluss: string }` (Task 3).
- Produces: Anmeldeseite zeigt bei `anmeldungOffen === false` einen Info-Block (`.anmeldung-geschlossen`) statt des Formulars.

- [ ] **Step 1: Failing tests ergänzen**

Zuerst die gemeinsame `beforeEach` in `anmeldung.component.spec.ts` anpassen, damit der neue Status-GET in **allen** Tests bedient wird (sonst schlägt `httpMock.verify()` fehl). Den Block ab `fixture = TestBed.createComponent(...)` so ersetzen:

```ts
    fixture = TestBed.createComponent(AnmeldungComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // löst ngOnInit + Status-GET aus
    httpMock
      .expectOne('/api/anmeldung/status')
      .flush({ anmeldungOffen: true, anmeldeschluss: '2027-02-28' });
    await fixture.whenStable();
```

Dann drei neue Tests ergänzen (z. B. in einem eigenen `describe('Anmeldeschluss', ...)`-Block innerhalb der Datei):

```ts
  describe('Anmeldeschluss', () => {
    it('übernimmt Status aus dem GET und formatiert das Datum', () => {
      expect(component.anmeldungOffen()).toBe(true);
      expect(component.anmeldeschlussAnzeige()).toBe('28.02.2027');
    });

    it('zeigt bei offener Anmeldung das Formular und keine Infoseite', () => {
      fixture.detectChanges();
      expect(host().querySelector('form')).not.toBeNull();
      expect(host().querySelector('.anmeldung-geschlossen')).toBeNull();
    });

    it('zeigt bei geschlossener Anmeldung die Infoseite statt des Formulars', () => {
      component.anmeldungOffen.set(false);
      component.anmeldeschlussAnzeige.set('28.02.2027');
      fixture.detectChanges();

      expect(host().querySelector('form')).toBeNull();
      const info = host().querySelector('.anmeldung-geschlossen');
      expect(info).not.toBeNull();
      expect((info as HTMLElement).textContent).toContain('28.02.2027');
    });
  });
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag verifizieren**

Run: `cd frontend && npm test -- --testPathPattern anmeldung.component`
Expected: FAIL — `component.anmeldungOffen` / `anmeldeschlussAnzeige` existieren nicht; Status-GET in `beforeEach` findet keinen Request (`expectOne` schlägt fehl).

- [ ] **Step 3: Komponente implementieren**

In `anmeldung.component.ts`:

Import um `OnInit` erweitern:

```ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
```

Nach den bestehenden Modul-Hilfsfunktionen (vor `@Component`) einen Typ + Formatierer ergänzen:

```ts
/** Antwort von GET /api/anmeldung/status. */
interface AnmeldeschlussStatus {
  anmeldungOffen: boolean;
  anmeldeschluss: string; // ISO YYYY-MM-DD
}

/** Formatiert ein ISO-Datum (YYYY-MM-DD) als deutsches Datum (TT.MM.JJJJ) für die Anzeige. */
function formatiereDatum(isoDatum: string): string {
  const teile = isoDatum.split('-');
  if (teile.length !== 3) return isoDatum;
  const [jahr, monat, tag] = teile;
  return `${tag}.${monat}.${jahr}`;
}
```

Die Klassendeklaration um `implements OnInit` erweitern:

```ts
export class AnmeldungComponent implements OnInit {
```

Bei den State-Signals ergänzen (nach `errorMessage`):

```ts
  // Anmeldeschluss-Status (aus GET /api/anmeldung/status). Default offen, bis geladen; bei
  // geschlossenem Status wird das Formular gar nicht gerendert.
  anmeldungOffen = signal(true);
  anmeldeschlussAnzeige = signal<string | null>(null);
```

Eine `ngOnInit`-Methode ergänzen (z. B. direkt nach den `form`-Gettern):

```ts
  ngOnInit(): void {
    this.httpClient.get<AnmeldeschlussStatus>('/api/anmeldung/status').subscribe({
      next: (status) => {
        this.anmeldungOffen.set(status.anmeldungOffen);
        this.anmeldeschlussAnzeige.set(formatiereDatum(status.anmeldeschluss));
      },
      // Defensiv: bei Ladefehler das Formular zeigen; das Backend sperrt späte POSTs ohnehin (403).
      error: () => this.anmeldungOffen.set(true),
    });
  }
```

- [ ] **Step 4: Template um Infoseite ergänzen**

In `anmeldung.component.html` das gesamte `<form ...> ... </form>`-Element in eine `@if`/`@else`-Struktur setzen. Konkret die Zeile `<form [formGroup]="form" ...>` durch den Öffnungsteil und das schließende `</form>` durch den Abschlussteil ersetzen:

Vor dem `<form>`:

```html
    @if (anmeldungOffen()) {
```

Nach dem `</form>`:

```html
    } @else {
      <div class="anmeldung-geschlossen" role="status">
        <p>
          Der Anmeldeschluss war am {{ anmeldeschlussAnzeige() }} – eine Anmeldung ist nicht mehr
          möglich.
        </p>
      </div>
    }
```

(Das `@if (successMsg())`-Erfolgs-Banner darüber bleibt unverändert.)

- [ ] **Step 5: Tests laufen lassen, Erfolg verifizieren**

Run: `cd frontend && npm test -- --testPathPattern anmeldung.component`
Expected: PASS (alle bestehenden + 3 neue Tests grün).

- [ ] **Step 6: Lint + Format + Commit**

```bash
cd frontend && npm run lint && npm run format:check
cd .. && git add frontend/src/app/pages/anmeldung/anmeldung.component.ts \
  frontend/src/app/pages/anmeldung/anmeldung.component.html \
  frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#153 Frontend: Anmeldeschluss-Status laden, Infoseite statt Formular"
```

Falls `format:check` etwas moniert: `npm run format` ausführen, geänderte Dateien erneut adden.

---

### Task 6: Doku + volle Quality-Gate

**Files:**
- Create: `docs/adr/0013-anmeldeschluss-config-statt-db.md`
- Modify: `docs/changelog.md`
- Modify: `AGENTS.md` (Scope-Notiz)

**Interfaces:**
- Produces: dokumentiertes Verhalten (wo die Deadline gesetzt wird) + grüne Gesamt-Gate.

- [ ] **Step 1: ADR 0013 anlegen**

`docs/adr/0013-anmeldeschluss-config-statt-db.md`:

```markdown
# ADR 0013 – Anmeldeschluss als Server-Config statt DB

**Status:** Akzeptiert · **Datum:** 2026-07-11

## Kontext

Nach dem Anmeldeschluss (Flyer 2027: 28. Februar 2027) dürfen keine Online-Anmeldungen mehr
eingehen (#153). Im Code lag seit dem ersten Schema-Commit (#4) eine ungenutzte Tabelle
`turnier_config` (Spalten `anmeldung_gesperrt`, `anmeldeschluss_datum`) samt Entity – ohne
Repository, ohne Leser: toter Code. `AGENTS.md` hielt bereits fest, dass dieser Teil raus soll.

## Entscheidung

Der Anmeldeschluss wird als **feste Server-Config** gesetzt, nicht in der Datenbank:

- Property `fehmarnopen.anmeldung.anmeldeschluss` (`AnmeldungProperties`), Default `2027-02-28`
  in `application.yaml`, per ENV `ANMELDESCHLUSS` überschreibbar.
- Auswertung im `AnmeldeschlussService` mit injiziertem `Clock` (testbar). Zeitzone `Europe/Berlin`,
  inklusive bis Tagesende: offen, solange `jetzt < anmeldeschluss.plusDays(1).atStartOfDay(Berlin)`.
- Das Backend lehnt späte `POST /api/anmeldung` mit `AnmeldungGesperrtException` → **403** ab.
- `GET /api/anmeldung/status` liefert dem Frontend `{ anmeldungOffen, anmeldeschluss }`.
- Die tote Tabelle `turnier_config` + Entity werden entfernt (Changeset `003`).

## Konsequenzen

- Kein Admin-UI nötig; der Stichtag ist eine Betriebs-Einstellung (ENV) – passend, da er einmal
  jährlich feststeht.
- Weniger toter Code und eine Tabelle weniger im Schema.
- Ändert sich der Stichtag doch dynamisch, wäre ein DB-getriebener Ansatz nötig – bewusst als
  YAGNI verworfen.

## Alternativen

- **DB-getrieben (`turnier_config`) mit Admin-Toggle:** flexibler, aber mehr Fläche (Repository,
  Seed, UI) für einen jährlich fixen Wert. Verworfen.
- **Datum im Frontend hart kodiert:** dupliziert die Wahrheit, driftet leicht. Verworfen.
```

- [ ] **Step 2: Changelog-Eintrag ergänzen**

In `docs/changelog.md` direkt nach der Einleitung (vor `## 2026-07-06 …`) einen neuen Abschnitt einfügen:

```markdown
## 2026-07-11 — Anmeldeschluss 28.02.2027 (#153)

Nach dem Anmeldeschluss sind keine Online-Anmeldungen mehr möglich, damit Finn planen kann.

- **Deadline als Server-Config:** `fehmarnopen.anmeldung.anmeldeschluss` (Default `2027-02-28`,
  ENV `ANMELDESCHLUSS`), ausgewertet im `AnmeldeschlussService` (Zeitzone Europe/Berlin, inklusive
  bis Tagesende). Begründung Config-statt-DB in [ADR 0013](adr/0013-anmeldeschluss-config-statt-db.md).
- **Backend-Sperre:** `POST /api/anmeldung` nach Ablauf → `AnmeldungGesperrtException` → **403**.
- **Frontend:** `GET /api/anmeldung/status` steuert die Anmeldeseite – nach Ablauf erscheint eine
  Infoseite statt des Formulars.
- **Aufräumen:** die ungenutzte Tabelle `turnier_config` + Entity entfernt (Changeset `003`).
```

- [ ] **Step 3: Scope-Notiz in `AGENTS.md` aktualisieren**

Die Zeile

```
  - **Excel-Export** → verschoben. **Anmeldeschluss/`TurnierConfig`** → soll raus (toter Code).
```

ersetzen durch:

```
  - **Excel-Export** → verschoben. **Anmeldeschluss** → als Server-Config umgesetzt (#153, ADR 0013);
    die tote `TurnierConfig`-Tabelle wurde entfernt.
```

- [ ] **Step 4: Volle lokale Quality-Gate (Backend + Frontend)**

Run:
```bash
cd backend && ./mvnw spotless:apply && ./mvnw verify
cd ../frontend && npm run lint && npm test && npm run format:check
```
Expected: Backend `BUILD SUCCESS` (inkl. Kontextstart mit echter `SecurityConfig` + alle Migrationen), Frontend Lint/Tests/Format grün.

- [ ] **Step 5: Commit**

```bash
git add docs/adr/0013-anmeldeschluss-config-statt-db.md docs/changelog.md AGENTS.md
git commit -m "#153 Doku: ADR 0013 (Config statt DB) + Changelog + Scope-Notiz"
```

---

## Self-Review

**Spec coverage** (gegen `2026-07-11-anmeldeschluss-design.md`):
- Deadline-Config + Zeitzone/Tagesende → Task 1 ✓
- Testbare Zeit (Clock) → Task 1 ✓
- Sperr-Logik im Service (403) → Task 1 (Exception/Meldung) + Task 2 (Aufruf) ✓
- Status-Endpoint öffentlich → Task 3 ✓
- Frontend Formular/Infoseite → Task 5 ✓
- Tote TurnierConfig entfernen → Task 4 ✓
- Tests (Backend Service/Controller/GlobalExceptionHandler/Schema, Frontend) → Tasks 1–5.
  Hinweis: Das 403-Mapping der `AnmeldungGesperrtException` ist bereits im `GlobalExceptionHandler`
  vorhanden und unverändert; es wird durch den vollen `verify`-Lauf (Task 6) mit abgedeckt. Ein
  separater neuer `GlobalExceptionHandlerTest`-Fall ist nicht nötig, da sich das Mapping nicht ändert.
- Doku (ADR/Changelog/Scope) → Task 6 ✓

**Placeholder scan:** kein TBD/TODO; jeder Code-Step enthält vollständigen Code.

**Type consistency:** `AnmeldeschlussService.anmeldungOffen()/anmeldeschluss()/pruefeAnmeldungOffen()`,
`AnmeldungProperties.getAnmeldeschluss()`, `AnmeldeschlussStatusResponse(boolean, LocalDate)`,
FE-Signals `anmeldungOffen`/`anmeldeschlussAnzeige` sind über alle Tasks konsistent benannt.
```
