# #170 – Spieler-Eindeutigkeit je Einzel-Disziplin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Einzel-Disziplinen (Herreneinzel, Dameneinzel, U18) eine Meldung als Dublette ablehnen (409), wenn Vorname+Nachname (case-insensitiv) **oder** die Radikal-ID bereits aktiv gemeldet ist – geprüft gegen den DB-Bestand und innerhalb desselben Requests, mit feld-/zeilenbezogener Anzeige im Frontend.

**Architecture:** Neuer `DoppelteSpielerService` (analog `TeamnameValidierungService`, ADR 0011) prüft die Einzel-Meldungen im `AnmeldungService.anmelden` **vor** dem Speichern und beim `reaktivieren`. Konflikte werfen `DoppelterSpielerException`, die der `GlobalExceptionHandler` auf 409 mit Feldkennung `"<DISZIPLIN>:<meldungIndex>"` mappt. Das Angular-Anmeldeformular setzt den Fehler an den Namensfeldern der betroffenen Meldung.

**Tech Stack:** Spring Boot (Java 21, Lombok, JUnit 5 + Mockito + AssertJ, MockMvc), Angular (Reactive Forms, Jasmine/Karma).

## Global Constraints

- **Fachliche Konfliktprüfung im Service, nicht als Bean-Validation-Constraint** (ADR 0011): 409-Semantik, umlaut-korrekter Vergleich in Java über `String.CASE_INSENSITIVE_ORDER` (SQLites `UPPER` kann nur ASCII).
- **Fachliche Tests je öffentlicher Methode in eigener `@Nested`-Klasse** (ADR 0012); Nested-Klasse heißt nach der Methode.
- **Einzel-Disziplinen** = `HERRENEINZEL`, `DAMENEINZEL`, `U18` (die `teamName: false`-Disziplinen). Team-Disziplinen bleiben über den Teamnamen abgesichert (#152).
- **Feldkennung im 409** trägt `"<DISZIPLIN>:<meldungIndex>"` (0-basiert), z. B. `HERRENEINZEL:1`.
- Nach jeder Backend-Änderung Format-Gate beachten: der Pre-Commit-Hook ruft `spotless` – Code muss formatiert sein (der Commit-Befehl schlägt sonst fehl).
- Fehlermeldungen und Kommentare auf Deutsch, im Stil der bestehenden Klassen.

---

### Task 1: `Disziplin.istEinzel()` – gemeinsames Kriterium für Einzel-Disziplinen

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/entity/Disziplin.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/entity/DisziplinTest.java`

**Interfaces:**
- Produces: `boolean Disziplin.istEinzel()` – true genau für `HERRENEINZEL`, `DAMENEINZEL`, `U18`.

- [ ] **Step 1: Failing test schreiben**

In `DisziplinTest.java` ergänzen (Imports `EnumSet`/`Disziplin` sind über bestehende Pakete verfügbar; nutze vollqualifiziert wenn nötig):

```java
    @Test
    void istEinzel_nurFuerEinzelDisziplinen() {
        assertThat(Disziplin.HERRENEINZEL.istEinzel()).isTrue();
        assertThat(Disziplin.DAMENEINZEL.istEinzel()).isTrue();
        assertThat(Disziplin.U18.istEinzel()).isTrue();
        assertThat(Disziplin.HERRENDOPPEL.istEinzel()).isFalse();
        assertThat(Disziplin.DAMENDOPPEL.istEinzel()).isFalse();
        assertThat(Disziplin.TRIPLE_MIX.istEinzel()).isFalse();
        assertThat(Disziplin.TEAMWETTBEWERB.istEinzel()).isFalse();
    }
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=DisziplinTest`
Expected: FAIL – `istEinzel()` existiert nicht (Compile-Fehler).

- [ ] **Step 3: Minimal implementieren**

In `Disziplin.java` nach `getLabel()` ergänzen:

```java
    /** Einzel-Disziplinen (ohne Teamname): genau ein Spieler je Meldung. Für die Spieler-Eindeutigkeit (#170). */
    public boolean istEinzel() {
        return this == HERRENEINZEL || this == DAMENEINZEL || this == U18;
    }
```

- [ ] **Step 4: Test grün laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=DisziplinTest`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/entity/Disziplin.java \
        backend/src/test/java/de/dart/fehmarnopen/entity/DisziplinTest.java
git commit -m "#170 Disziplin.istEinzel() als gemeinsames Kriterium"
```

---

### Task 2: `SpielernameValidierungService.normalisiere()` – Normalisierung wiederverwendbar machen

Die Dubletten-Prüfung braucht dieselbe Namens-Normalisierung (Trim + Whitespace-Zusammenfassung) wie der Speicherpfad, aber **ohne** die Zeichensatz-Prüfung. Wir extrahieren sie in eine eigene Methode und lassen `normalisiereUndPruefe` sie aufrufen (DRY).

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/service/SpielernameValidierungService.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/SpielernameValidierungServiceTest.java`

**Interfaces:**
- Produces: `String SpielernameValidierungService.normalisiere(String name)` – `null` → `""`, sonst getrimmt und interne Whitespaces zu einzelnem Leerzeichen zusammengefasst; **keine** Zeichensatzprüfung.

- [ ] **Step 1: Failing test schreiben**

In `SpielernameValidierungServiceTest.java` ergänzen (die Testklasse instanziiert den Service ohne Mocks – bestehendes Muster nutzen; falls die Klasse eine `@Nested`-Struktur hat, einen Block `NormalisiereTest` analog zu `TeamnameValidierungServiceTest` anlegen):

```java
    @Nested
    class NormalisiereTest {

        private final SpielernameValidierungService service = new SpielernameValidierungService();

        @Test
        void entferntRandLeerzeichenUndFasstZusammen() {
            assertThat(service.normalisiere("  Anna   Lena ")).isEqualTo("Anna Lena");
        }

        @Test
        void nullErgibtLeerenString() {
            assertThat(service.normalisiere(null)).isEmpty();
        }

        @Test
        void prueftDenZeichensatzNicht() {
            // normalisiere() wirft nicht bei Sonderzeichen – die Zeichensatzprüfung bleibt normalisiereUndPruefe.
            assertThat(service.normalisiere("Anna1")).isEqualTo("Anna1");
        }
    }
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=SpielernameValidierungServiceTest`
Expected: FAIL – `normalisiere` existiert nicht.

- [ ] **Step 3: Minimal implementieren**

In `SpielernameValidierungService.java` die neue Methode hinzufügen und `normalisiereUndPruefe` darauf aufbauen:

```java
    /**
     * Normalisiert den Namen (Trim + Whitespace-Zusammenfassung) ohne Zeichensatzprüfung. {@code null}
     * ergibt {@code ""}. Wird sowohl vom Speicherpfad ({@link #normalisiereUndPruefe}) als auch von der
     * Spieler-Eindeutigkeit ({@link DoppelteSpielerService}) genutzt, damit beide gleich vergleichen.
     */
    public String normalisiere(String name) {
        return name == null ? "" : name.strip().replaceAll("\\s+", " ");
    }

    public String normalisiereUndPruefe(String name, String feldbezeichnung) {
        String normalisiert = normalisiere(name);
        if (normalisiert.isEmpty()) {
            return normalisiert;
        }
        if (!ERLAUBTES_MUSTER.matcher(normalisiert).matches()) {
            throw new UngueltigeAnmeldungException(feldbezeichnung
                    + ": bitte einen gültigen Namen eingeben (z. B. „Anna“, „Anna Lena“ oder „Anna-Lena“)");
        }
        return normalisiert;
    }
```

- [ ] **Step 4: Test grün laufen lassen (inkl. bestehender Tests der Klasse)**

Run: `cd backend && ./mvnw -q test -Dtest=SpielernameValidierungServiceTest`
Expected: PASS (alle, auch die bestehenden `normalisiereUndPruefe`-Tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/service/SpielernameValidierungService.java \
        backend/src/test/java/de/dart/fehmarnopen/service/SpielernameValidierungServiceTest.java
git commit -m "#170 SpielernameValidierungService.normalisiere() extrahiert"
```

---

### Task 3: `DoppelterSpielerException` + `DoppelteSpielerService` (Kern) + Repository-EntityGraph

**Files:**
- Create: `backend/src/main/java/de/dart/fehmarnopen/exception/DoppelterSpielerException.java`
- Create: `backend/src/main/java/de/dart/fehmarnopen/service/DoppelteSpielerService.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/repository/AnmeldungRepository.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/DoppelteSpielerServiceTest.java`

**Interfaces:**
- Consumes: `Disziplin.istEinzel()` (Task 1), `SpielernameValidierungService.normalisiere(String)` (Task 2), `AnmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin)` (mit Spielern geladen).
- Produces:
  - `DoppelterSpielerException(Disziplin disziplin, int meldungIndex, String message)` mit `getDisziplin()` und `getMeldungIndex()`.
  - `void DoppelteSpielerService.pruefe(AnmeldungRequest request)` – prüft alle Einzel-Meldungen des Requests gegen Bestand + untereinander.
  - `void DoppelteSpielerService.pruefeReaktivierung(Anmeldung anmeldung)` – prüft eine zu reaktivierende Einzel-Anmeldung gegen den übrigen aktiven Bestand.

- [ ] **Step 1: `AnmeldungRepository` – Spieler mitladen**

Damit die Prüfung die Spieler des Bestands sieht, den EntityGraph an der bestehenden Query ergänzen. In `AnmeldungRepository.java` die Methode ersetzen:

```java
    /**
     * Aktive (nicht abgemeldete) Anmeldungen einer Disziplin – für die Teamname-Eindeutigkeit (#152) und
     * die Spieler-Eindeutigkeit je Einzel-Disziplin (#170). Spieler werden mitgeladen.
     */
    @EntityGraph(attributePaths = "spieler")
    List<Anmeldung> findByDisziplinAndAbgemeldetFalse(Disziplin disziplin);
```

(`import org.springframework.data.jpa.repository.EntityGraph;` ist bereits vorhanden.)

- [ ] **Step 2: Exception anlegen**

Create `DoppelterSpielerException.java`:

```java
package de.dart.fehmarnopen.exception;

import de.dart.fehmarnopen.entity.Disziplin;

/**
 * Fachlicher Konflikt: In derselben Einzel-Disziplin ist derselbe Spieler bereits gemeldet – gleicher
 * (normalisierter, case-insensitiver) Vorname+Nachname ODER gleiche Radikal ID (#170). Wird auf HTTP 409
 * gemappt; {@code disziplin}+{@code meldungIndex} bilden die Feldkennung fürs Frontend (siehe ADR 0011).
 */
public class DoppelterSpielerException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final Disziplin disziplin;
    private final int meldungIndex;

    public DoppelterSpielerException(Disziplin disziplin, int meldungIndex, String message) {
        super(message);
        this.disziplin = disziplin;
        this.meldungIndex = meldungIndex;
    }

    public Disziplin getDisziplin() {
        return disziplin;
    }

    public int getMeldungIndex() {
        return meldungIndex;
    }
}
```

- [ ] **Step 3: Failing tests schreiben**

Create `DoppelteSpielerServiceTest.java`:

```java
package de.dart.fehmarnopen.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelterSpielerException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DoppelteSpielerServiceTest {

    @Mock
    private AnmeldungRepository anmeldungRepository;

    // Realer Namensservice: seine Normalisierung ist Teil des Vergleichs und in eigenem Test abgedeckt.
    private final SpielernameValidierungService spielernameValidierungService = new SpielernameValidierungService();

    private DoppelteSpielerService service() {
        return new DoppelteSpielerService(anmeldungRepository, spielernameValidierungService);
    }

    private SpielerRequest spieler(String vorname, String nachname, String radikalId) {
        return new SpielerRequest(vorname, nachname, radikalId, null, null);
    }

    private DisziplinAnmeldung einzel(Disziplin disziplin, SpielerRequest spieler) {
        return new DisziplinAnmeldung(disziplin, null, List.of(spieler));
    }

    private AnmeldungRequest request(DisziplinAnmeldung... eintraege) {
        return new AnmeldungRequest(List.of(eintraege));
    }

    private Anmeldung aktiveAnmeldung(Long id, Disziplin disziplin, String vorname, String nachname, String radikalId) {
        Spieler spieler = new Spieler();
        spieler.setVorname(vorname);
        spieler.setNachname(nachname);
        spieler.setRadikalId(radikalId);
        Anmeldung anmeldung = new Anmeldung();
        anmeldung.setId(id);
        anmeldung.setDisziplin(disziplin);
        anmeldung.setSpieler(List.of(spieler));
        return anmeldung;
    }

    @Nested
    class PruefeTest {

        @Test
        void gleicherNameWieAktiverBestandWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatThrownBy(() -> service()
                            .pruefe(request(einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", "BB02021992")))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void gleicherNameCaseInsensitivInklUmlautWirft() {
            // Umlaut case-insensitiv: "Bärbel Meier" == "BÄRBEL MEIER" (ä/Ä korrekt über CASE_INSENSITIVE_ORDER).
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.DAMENEINZEL))
                    .thenReturn(List.of(aktiveAnmeldung(1L, Disziplin.DAMENEINZEL, "Bärbel", "Meier", "AA01011990")));

            assertThatThrownBy(() -> service()
                            .pruefe(request(einzel(Disziplin.DAMENEINZEL, spieler("BÄRBEL", "MEIER", null)))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void gleicherVornameAberAndererNachnameIstOk() {
            // Nur Vor- UND Nachname zusammen bilden die Dublette – gleicher Vorname allein reicht nicht.
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatCode(() -> service()
                            .pruefe(request(einzel(Disziplin.HERRENEINZEL, spieler("Max", "Schmidt", "BB02021992")))))
                    .doesNotThrowAnyException();
        }

        @Test
        void gleicheRadikalIdWieBestandWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatThrownBy(() -> service()
                            .pruefe(request(einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", "AA01011990")))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void andereDisziplinGleicherSpielerIstErlaubt() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.DAMENEINZEL))
                    .thenReturn(List.of());

            assertThatCode(() -> service()
                            .pruefe(request(einzel(Disziplin.DAMENEINZEL, spieler("Max", "Mustermann", "AA01011990")))))
                    .doesNotThrowAnyException();
        }

        @Test
        void dubletteNamensGleichImSelbenRequestWirftMitMeldungIndex1() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of());

            assertThatThrownBy(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", "AA01011990")),
                                    einzel(Disziplin.HERRENEINZEL, spieler("max", "mustermann", "BB02021992")))))
                    .isInstanceOfSatisfying(DoppelterSpielerException.class, ex -> {
                        assertThat(ex.getDisziplin()).isEqualTo(Disziplin.HERRENEINZEL);
                        assertThat(ex.getMeldungIndex()).isEqualTo(1);
                    });
        }

        @Test
        void dubletteRadikalIdImSelbenRequestWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of());

            assertThatThrownBy(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", "AA01011990")),
                                    einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", "AA01011990")))))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void verschiedeneSpielerSindOk() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of(aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990")));

            assertThatCode(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", "BB02021992")),
                                    einzel(Disziplin.HERRENEINZEL, spieler("Uwe", "Ulf", "CC03031993")))))
                    .doesNotThrowAnyException();
        }

        @Test
        void ohneRadikalIdKeinRadikalKonflikt() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of());

            // Beide ohne Radikal ID, verschiedene Namen → ok (kein null-gleich-null-Konflikt).
            assertThatCode(() -> service()
                            .pruefe(request(
                                    einzel(Disziplin.HERRENEINZEL, spieler("Max", "Mustermann", null)),
                                    einzel(Disziplin.HERRENEINZEL, spieler("Tom", "Test", null)))))
                    .doesNotThrowAnyException();
        }

        @Test
        void teamDisziplinWirdIgnoriert() {
            // HERRENDOPPEL ist keine Einzel-Disziplin → keine DB-Abfrage, keine Prüfung hier.
            assertThatCode(() -> service()
                            .pruefe(request(new DisziplinAnmeldung(
                                    Disziplin.HERRENDOPPEL,
                                    "Team",
                                    List.of(spieler("Max", "M", "AA01011990"), spieler("Max", "M", "AA01011990"))))))
                    .doesNotThrowAnyException();
        }
    }

    @Nested
    class PruefeReaktivierungTest {

        @Test
        void nameInzwischenBelegtWirft() {
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of(aktiveAnmeldung(2L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "BB02021992")));
            Anmeldung eigene = aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990");

            assertThatThrownBy(() -> service().pruefeReaktivierung(eigene))
                    .isInstanceOf(DoppelterSpielerException.class);
        }

        @Test
        void eigeneAnmeldungWirdAusgeschlossen() {
            // Nur die eigene (id=1) trägt den Namen → mit Ausschluss keine Kollision.
            Anmeldung eigene = aktiveAnmeldung(1L, Disziplin.HERRENEINZEL, "Max", "Mustermann", "AA01011990");
            when(anmeldungRepository.findByDisziplinAndAbgemeldetFalse(Disziplin.HERRENEINZEL))
                    .thenReturn(List.of(eigene));

            assertThatCode(() -> service().pruefeReaktivierung(eigene)).doesNotThrowAnyException();
        }

        @Test
        void teamDisziplinWirdIgnoriert() {
            Anmeldung eigene = aktiveAnmeldung(1L, Disziplin.HERRENDOPPEL, "Max", "Mustermann", "AA01011990");
            assertThatCode(() -> service().pruefeReaktivierung(eigene)).doesNotThrowAnyException();
        }
    }
}
```

- [ ] **Step 4: Tests rot laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=DoppelteSpielerServiceTest`
Expected: FAIL – `DoppelteSpielerService` existiert nicht.

- [ ] **Step 5: `DoppelteSpielerService` implementieren**

Create `DoppelteSpielerService.java`:

```java
package de.dart.fehmarnopen.service;

import de.dart.fehmarnopen.dto.AnmeldungRequest;
import de.dart.fehmarnopen.dto.AnmeldungRequest.DisziplinAnmeldung;
import de.dart.fehmarnopen.dto.AnmeldungRequest.SpielerRequest;
import de.dart.fehmarnopen.entity.Anmeldung;
import de.dart.fehmarnopen.entity.Disziplin;
import de.dart.fehmarnopen.entity.Spieler;
import de.dart.fehmarnopen.exception.DoppelterSpielerException;
import de.dart.fehmarnopen.repository.AnmeldungRepository;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Prüft die Spieler-Eindeutigkeit in Einzel-Disziplinen (#170): innerhalb derselben Einzel-Disziplin ist
 * eine Meldung eine Dublette, wenn die normalisierte Kombination Vorname+Nachname (case-insensitiv) ODER
 * die Radikal ID bereits vorkommt – geprüft gegen die aktiven Anmeldungen der Disziplin UND die übrigen
 * Einträge desselben Requests. Für Team-Disziplinen sichert der Teamname die Eindeutigkeit
 * ({@link TeamnameValidierungService}); dort greift diese Prüfung nicht.
 *
 * <p>Fachliche Konfliktprüfung im Service (ADR 0011): 409-Semantik, umlaut-korrekter Vergleich in Java über
 * {@link String#CASE_INSENSITIVE_ORDER}.
 */
@Component
@RequiredArgsConstructor
public class DoppelteSpielerService {

    private final AnmeldungRepository anmeldungRepository;
    private final SpielernameValidierungService spielernameValidierungService;

    /** Prüft alle Einzel-Meldungen eines Anmeldevorgangs gegen den aktiven Bestand und untereinander. */
    public void pruefe(AnmeldungRequest request) {
        Map<Disziplin, Bestand> bestandJeDisziplin = new EnumMap<>(Disziplin.class);
        Map<Disziplin, Integer> meldungIndexJeDisziplin = new EnumMap<>(Disziplin.class);
        for (DisziplinAnmeldung eingabe : request.disziplinen()) {
            Disziplin disziplin = eingabe.disziplin();
            if (!disziplin.istEinzel()) {
                continue;
            }
            Bestand bestand = bestandJeDisziplin.computeIfAbsent(disziplin, this::ladeAktivenBestand);
            int meldungIndex = meldungIndexJeDisziplin.getOrDefault(disziplin, -1) + 1;
            meldungIndexJeDisziplin.put(disziplin, meldungIndex);
            for (SpielerRequest spieler : eingabe.spieler()) {
                pruefeUndMerke(
                        disziplin, meldungIndex, spieler.vorname(), spieler.nachname(), spieler.radikalId(), bestand);
            }
        }
    }

    /** Prüft die Spieler einer zu reaktivierenden Einzel-Anmeldung gegen den übrigen aktiven Bestand. */
    public void pruefeReaktivierung(Anmeldung anmeldung) {
        Disziplin disziplin = anmeldung.getDisziplin();
        if (!disziplin.istEinzel()) {
            return;
        }
        Bestand bestand = ladeAktivenBestand(disziplin, anmeldung.getId());
        for (Spieler spieler : anmeldung.getSpieler()) {
            pruefeUndMerke(disziplin, 0, spieler.getVorname(), spieler.getNachname(), spieler.getRadikalId(), bestand);
        }
    }

    private Bestand ladeAktivenBestand(Disziplin disziplin) {
        return ladeAktivenBestand(disziplin, null);
    }

    private Bestand ladeAktivenBestand(Disziplin disziplin, Long ausschlussId) {
        Bestand bestand = new Bestand();
        for (Anmeldung anmeldung : anmeldungRepository.findByDisziplinAndAbgemeldetFalse(disziplin)) {
            if (ausschlussId != null && ausschlussId.equals(anmeldung.getId())) {
                continue;
            }
            for (Spieler spieler : anmeldung.getSpieler()) {
                bestand.namen.add(namensschluessel(spieler.getVorname(), spieler.getNachname()));
                if (hatRadikalId(spieler.getRadikalId())) {
                    bestand.radikalIds.add(spieler.getRadikalId());
                }
            }
        }
        return bestand;
    }

    private void pruefeUndMerke(
            Disziplin disziplin, int meldungIndex, String vorname, String nachname, String radikalId, Bestand bestand) {
        String vornameNorm = spielernameValidierungService.normalisiere(vorname);
        String nachnameNorm = spielernameValidierungService.normalisiere(nachname);
        if (!bestand.namen.add(namensschluessel(vornameNorm, nachnameNorm))) {
            throw new DoppelterSpielerException(
                    disziplin,
                    meldungIndex,
                    "%s %s ist in dieser Disziplin bereits gemeldet.".formatted(vornameNorm, nachnameNorm));
        }
        if (hatRadikalId(radikalId) && !bestand.radikalIds.add(radikalId)) {
            throw new DoppelterSpielerException(
                    disziplin,
                    meldungIndex,
                    "Diese Person ist in dieser Disziplin bereits gemeldet (Radikal ID %s).".formatted(radikalId));
        }
    }

    private static String namensschluessel(String vorname, String nachname) {
        // Ein Schlüssel aus beiden Namen; der Vergleich erfolgt case-insensitiv über die TreeSet-Ordnung.
        return vorname + " " + nachname;
    }

    private static boolean hatRadikalId(String radikalId) {
        return radikalId != null && !radikalId.isBlank();
    }

    /** Case-insensitiver Namens-Bestand (umlaut-korrekt via CASE_INSENSITIVE_ORDER) plus exakte Radikal-IDs. */
    private static final class Bestand {
        private final Set<String> namen = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        private final Set<String> radikalIds = new HashSet<>();
    }
}
```

- [ ] **Step 6: Tests grün laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=DoppelteSpielerServiceTest`
Expected: PASS (alle `@Nested`-Fälle).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/exception/DoppelterSpielerException.java \
        backend/src/main/java/de/dart/fehmarnopen/service/DoppelteSpielerService.java \
        backend/src/main/java/de/dart/fehmarnopen/repository/AnmeldungRepository.java \
        backend/src/test/java/de/dart/fehmarnopen/service/DoppelteSpielerServiceTest.java
git commit -m "#170 DoppelteSpielerService: Eindeutigkeit je Einzel-Disziplin"
```

---

### Task 4: `DoppelteSpielerService` in `AnmeldungService` verdrahten

Der Service läuft im `anmelden` **vor** dem Speichern und beim `reaktivieren`. Die bestehende Radikal-ID-im-Request-Prüfung wird auf Team-Disziplinen beschränkt (Einzel deckt jetzt der neue Service).

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java`

**Interfaces:**
- Consumes: `DoppelteSpielerService.pruefe(AnmeldungRequest)`, `DoppelteSpielerService.pruefeReaktivierung(Anmeldung)`, `Disziplin.istEinzel()`.

- [ ] **Step 1: Bestehenden Einzel-Radikal-Test im `AnmeldungServiceTest` an neues Blackbox-Verhalten anpassen (failing)**

In `AnmeldungServiceTest.java`:

1. Import ergänzen: `import de.dart.fehmarnopen.exception.DoppelterSpielerException;`
2. Neues Mock-Feld hinzufügen (bei den anderen `@Mock`-Feldern):

```java
    // Blackbox: die Einzel-Dubletten-Regeln selbst sind in DoppelteSpielerServiceTest abgedeckt.
    @Mock
    private DoppelteSpielerService doppelteSpielerService;
```

3. Den bestehenden Test `anmelden_gleicheRadikalIdZweimalImSelbenEinzel_wirftDoppelteRadikalId` (nutzt jetzt den ausgelagerten Service) **ersetzen** durch ein Blackbox-Verhalten plus einen Team-Fall:

```java
    @Test
    void anmelden_beiEinzelSpielerDublette_speichertNichts() {
        doThrow(new DoppelterSpielerException(Disziplin.HERRENEINZEL, 1, "dublette"))
                .when(doppelteSpielerService)
                .pruefe(any());
        AnmeldungRequest request = new AnmeldungRequest(List.of(
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M"))),
                new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request)).isInstanceOf(DoppelterSpielerException.class);

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void anmelden_gleicheRadikalIdZweimalImSelbenDoppel_wirftDoppelteRadikalId() {
        // Team-Disziplin: die Radikal-ID-im-Request-Prüfung bleibt im AnmeldungService und wirft weiterhin.
        AnmeldungRequest request = new AnmeldungRequest(List.of(new DisziplinAnmeldung(
                Disziplin.HERRENDOPPEL, "Team", List.of(spieler("Max", "M", "RAD-1"), spieler("Tim", "T", "RAD-1")))));

        assertThatThrownBy(() -> anmeldungService.anmelden(request)).isInstanceOf(DoppelteRadikalIdException.class);

        verify(anmeldungRepository, never()).save(any());
    }

    @Test
    void reaktivieren_beiSpielerDublette_wirftUndSpeichertNicht() {
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENEINZEL, null, spielerEntity("Max", "M"));
        anmeldung.setAbgemeldet(true);
        when(anmeldungRepository.findById(7L)).thenReturn(Optional.of(anmeldung));
        doThrow(new DoppelterSpielerException(Disziplin.HERRENEINZEL, 0, "dublette"))
                .when(doppelteSpielerService)
                .pruefeReaktivierung(anmeldung);

        assertThatThrownBy(() -> anmeldungService.reaktivieren(7L)).isInstanceOf(DoppelterSpielerException.class);

        assertThat(anmeldung.isAbgemeldet()).isTrue();
        verify(anmeldungRepository, never()).save(any());
    }
```

- [ ] **Step 2: Tests rot laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=AnmeldungServiceTest`
Expected: FAIL – `doppelteSpielerService` ist im `AnmeldungService` noch keine Abhängigkeit (Compile-Fehler) bzw. das erwartete Werfen bleibt aus.

- [ ] **Step 3: `AnmeldungService` implementieren**

In `AnmeldungService.java`:

1. Feld ergänzen (bei den anderen `private final`-Feldern):

```java
    private final DoppelteSpielerService doppelteSpielerService;
```

2. `anmelden` erweitern:

```java
    @Transactional
    public List<Anmeldung> anmelden(AnmeldungRequest request) {
        anmeldeschlussService.pruefeAnmeldungOffen();
        pruefeKeineDoppeltenTeamnamenImRequest(request);
        pruefeKeineDoppeltenRadikalIdsImRequest(request);
        doppelteSpielerService.pruefe(request);
        return request.disziplinen().stream().map(this::anmeldenFuerDisziplin).toList();
    }
```

3. `pruefeKeineDoppeltenRadikalIdsImRequest` auf Team-Disziplinen beschränken (Einzel deckt jetzt `DoppelteSpielerService`). Am Schleifenkopf ergänzen:

```java
    private void pruefeKeineDoppeltenRadikalIdsImRequest(AnmeldungRequest request) {
        Map<Disziplin, Set<String>> gesehenJeDisziplin = new EnumMap<>(Disziplin.class);
        for (AnmeldungRequest.DisziplinAnmeldung eingabe : request.disziplinen()) {
            if (eingabe.disziplin().istEinzel()) {
                continue; // Einzel-Radikal-Dubletten prüft der DoppelteSpielerService (#170).
            }
            Set<String> bereitsGesehen =
                    gesehenJeDisziplin.computeIfAbsent(eingabe.disziplin(), disziplin -> new HashSet<>());
            for (SpielerRequest spielerRequest : eingabe.spieler()) {
                String radikalId = spielerRequest.radikalId();
                if (radikalId == null || radikalId.isBlank()) {
                    continue; // Ohne Radikal ID kein zuverlässiger Schlüssel – hier nicht prüfen.
                }
                if (!bereitsGesehen.add(radikalId)) {
                    throw new DoppelteRadikalIdException(radikalId);
                }
            }
        }
    }
```

4. `reaktivieren` erweitern (nach dem Teamname-Re-Check):

```java
    @Transactional
    public void reaktivieren(Long anmeldungId) {
        Anmeldung anmeldung = findeOderWirf(anmeldungId);
        // Beim Reaktivieren erneut auf Dubletten prüfen: Team über Teamname, Einzel über die Spieler –
        // beide könnten inzwischen von einer anderen aktiven Anmeldung der Disziplin belegt sein.
        teamnameValidierungService.normalisiereUndPruefe(
                anmeldung.getDisziplin(), anmeldung.getTeamName(), anmeldungId);
        doppelteSpielerService.pruefeReaktivierung(anmeldung);
        anmeldung.setAbgemeldet(false);
        anmeldung.setAbgemeldetAm(null);
        anmeldungRepository.save(anmeldung);
    }
```

- [ ] **Step 4: Tests grün laufen lassen (ganze Service-Testklasse)**

Run: `cd backend && ./mvnw -q test -Dtest=AnmeldungServiceTest`
Expected: PASS (inkl. der unveränderten Happy-Path- und Reaktivierungs-Tests – `doppelteSpielerService` tut als Mock im Normalfall nichts).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java \
        backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java
git commit -m "#170 AnmeldungService: Einzel-Dubletten-Prüfung verdrahtet"
```

---

### Task 5: `GlobalExceptionHandler` – 409-Mapping

`DoppelterSpielerException` → 409 mit Feldkennung `"<DISZIPLIN>:<meldungIndex>"`. `DoppelteRadikalIdException` von 400 auf 409 umstellen.

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteRadikalIdException.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/config/GlobalExceptionHandlerTest.java`

**Interfaces:**
- Consumes: `DoppelterSpielerException.getDisziplin()`, `getMeldungIndex()`, `getMessage()`.

- [ ] **Step 1: Failing Integrationstests schreiben**

In `GlobalExceptionHandlerTest.java` ergänzen (Muster wie `ungueltigeAnmeldung_falscheSpielerzahl_shouldReturn400WithMessage`; die Anmeldung ist im Testprofil offen und `POST /api/anmeldung` ist öffentlich):

```java
    @Test
    void spielerDublette_gleicheRadikalId_shouldReturn409WithFieldIndex() throws Exception {
        // Zwei Herreneinzel im selben Request mit gleicher Radikal ID → 409, Feldkennung zeigt auf die 2. Meldung.
        String body =
                """
                {"disziplinen":[
                  {"disziplin":"HERRENEINZEL","teamName":null,"spieler":[
                    {"vorname":"Max","nachname":"Mustermann","radikalId":"MM01011990","initialen":null,"geburtsdatum":null}]},
                  {"disziplin":"HERRENEINZEL","teamName":null,"spieler":[
                    {"vorname":"Tom","nachname":"Test","radikalId":"MM01011990","initialen":null,"geburtsdatum":null}]}
                ]}""";

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errors[0].field").value("HERRENEINZEL:1"))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @Test
    void spielerDublette_gleicherName_shouldReturn409() throws Exception {
        // Gleicher Name (case-insensitiv), unterschiedliche Radikal ID → 409 über die Namensregel.
        String body =
                """
                {"disziplinen":[
                  {"disziplin":"HERRENEINZEL","teamName":null,"spieler":[
                    {"vorname":"Max","nachname":"Mustermann","radikalId":"MM01011990","initialen":null,"geburtsdatum":null}]},
                  {"disziplin":"HERRENEINZEL","teamName":null,"spieler":[
                    {"vorname":"max","nachname":"mustermann","radikalId":"TT02021992","initialen":null,"geburtsdatum":null}]}
                ]}""";

        mockMvc.perform(post("/api/anmeldung")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.errors[0].field").value("HERRENEINZEL:1"));
    }
```

- [ ] **Step 2: Tests rot laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=GlobalExceptionHandlerTest`
Expected: FAIL – noch kein Handler für `DoppelterSpielerException` (aktuell greift der generische 500-Handler → Status ≠ 409).

- [ ] **Step 3: Handler implementieren**

In `GlobalExceptionHandler.java` neuen Handler ergänzen (bei den anderen `@ExceptionHandler`-Methoden):

```java
    @ExceptionHandler(DoppelterSpielerException.class)
    public ResponseEntity<ErrorResponse> handleDoppelterSpieler(DoppelterSpielerException ex) {
        // Feldkennung "<DISZIPLIN>:<meldungIndex>", damit das Frontend den Fehler der genauen Einzel-Meldung
        // zuordnen kann (siehe ADR 0011).
        FieldError feld = new FieldError(ex.getDisziplin().name() + ":" + ex.getMeldungIndex(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(409, ex.getMessage(), List.of(feld)));
    }
```

Und den bestehenden `handleDoppelteRadikalId` auf 409 umstellen:

```java
    @ExceptionHandler(DoppelteRadikalIdException.class)
    public ResponseEntity<ErrorResponse> handleDoppelteRadikalId(DoppelteRadikalIdException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ErrorResponse.of(409, ex.getMessage()));
    }
```

In `DoppelteRadikalIdException.java` den Javadoc-Satz „Wird auf HTTP 400 gemappt." auf „Wird auf HTTP 409 gemappt." ändern.

- [ ] **Step 4: Tests grün laufen lassen**

Run: `cd backend && ./mvnw -q test -Dtest=GlobalExceptionHandlerTest`
Expected: PASS

- [ ] **Step 5: Backend-Gesamtlauf (Regression + Format-Gate)**

Run: `cd backend && ./mvnw -q verify`
Expected: BUILD SUCCESS (alle Tests grün, spotless sauber). Bei spotless-Meckern `./mvnw spotless:apply` und Änderungen mit committen.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/exception/GlobalExceptionHandler.java \
        backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteRadikalIdException.java \
        backend/src/test/java/de/dart/fehmarnopen/config/GlobalExceptionHandlerTest.java
git commit -m "#170 GlobalExceptionHandler: 409 für Spieler-Dublette und Radikal-ID"
```

---

### Task 6: Frontend – Spieler-Dublette (409) feld-/zeilengenau anzeigen

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.ts`
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.html`
- Test: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts`

**Interfaces:**
- Consumes: 409-Body `{ errors: [{ field: "<DISZIPLIN>:<index>", message }] }`.
- Produces: `spielerDuplikatText(i, k, j): string | null` fürs Template; interne Handler `zeigeSpielerDuplikatAmFeld`, `clearSpielerDuplikatFehler`.

- [ ] **Step 1: Failing Spec schreiben**

In `anmeldung.component.spec.ts` – am Muster des Tests „zeigt eine Teamname-Dublette (409) am richtigen Feld…" (nutzt die Helfer `waehleDisziplin`, `setzeMitRadikalId`, `HERRENDOPPEL` etc.). Konstante für den Disziplin-Index von Herreneinzel prüfen/ergänzen: In der Spec gibt es bereits Index-Konstanten (z. B. `HERRENDOPPEL`); der Index von `HERRENEINZEL` ergibt sich aus `DISZIPLINEN` (Position 1). Falls keine Konstante existiert, lokal `const HERRENEINZEL = 1;` im Test definieren.

```javascript
  it('zeigt eine Spieler-Dublette (409) an den Namensfeldern der richtigen Einzel-Meldung', () => {
    const HERRENEINZEL = 1; // Position in DISZIPLINEN
    waehleDisziplin(HERRENEINZEL);
    component.addMeldung(HERRENEINZEL); // zweite Einzel-Meldung
    setzeMitRadikalId(HERRENEINZEL, 0, 0, 'Max', 'Mustermann');
    setzeMitRadikalId(HERRENEINZEL, 1, 0, 'Max', 'Mustermann');

    component.onSubmit();

    const req = httpMock.expectOne('/api/anmeldung');
    req.flush(
      {
        status: 409,
        message: 'Max Mustermann ist in dieser Disziplin bereits gemeldet.',
        errors: [
          { field: 'HERRENEINZEL:1', message: 'Max Mustermann ist in dieser Disziplin bereits gemeldet.' },
        ],
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component.spielerDuplikatText(HERRENEINZEL, 1, 0)).toContain('bereits gemeldet');
    expect(component.spielerDuplikatText(HERRENEINZEL, 0, 0)).toBeNull();
    expect(component.errorMessage()).toBeNull();
  });
```

Hinweis zur Verifikation: Prüfe im Test-Setup, wie `setzeMitRadikalId(i, k, j, vorname, nachname)` und `waehleDisziplin`/`addMeldung` in dieser Spec genau heißen (oben aus dem bestehenden Teamname-Test übernommen) und passe die Aufrufe bei Abweichung an.

- [ ] **Step 2: Spec rot laufen lassen**

Run: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless`
Expected: FAIL – `spielerDuplikatText` existiert nicht / Fehler wird nicht am Feld gesetzt.

- [ ] **Step 3: Component-Logik implementieren**

In `anmeldung.component.ts`:

1. In `onSubmit()` das Zurücksetzen ergänzen – direkt nach `this.clearTeamnameDuplikatFehler();`:

```javascript
    this.clearSpielerDuplikatFehler();
```

2. Im `error`-Callback des `post(...)` den zusätzlichen Zweig einfügen – nach `if (this.zeigeTeamnameDuplikatAmFeld(err)) return;`:

```javascript
        if (this.zeigeSpielerDuplikatAmFeld(err)) return;
```

3. Neue Methoden ergänzen (neben `zeigeTeamnameDuplikatAmFeld` / `clearTeamnameDuplikatFehler`):

```javascript
  /** Entfernt an allen Spieler-Namensfeldern den serverseitig gesetzten `duplikat`-Fehler. */
  private clearSpielerDuplikatFehler(): void {
    this.disziplinenArray.controls.forEach((_, i) => {
      this.meldungenArray(i).controls.forEach((_, k) => {
        for (const spieler of this.spielerArray(i, k).controls) {
          for (const feld of ['vorname', 'nachname']) {
            const ctrl = spieler.get(feld);
            if (ctrl?.hasError('duplikat')) {
              ctrl.setErrors(null);
              ctrl.updateValueAndValidity();
            }
          }
        }
      });
    });
  }

  /**
   * Wertet einen 409 mit Feldkennung `"<DISZIPLIN>:<index>"` (Einzel-Spieler-Dublette, #170) aus und setzt
   * den Fehler an Vor-/Nachname der betroffenen Meldung. Gibt true zurück, wenn feldgenau behandelt.
   */
  private zeigeSpielerDuplikatAmFeld(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 409) return false;
    const feld = (err.error as { errors?: { field?: string; message?: string }[] } | null)?.errors?.[0];
    if (!feld?.field || !feld.field.includes(':')) return false;
    const [disziplin, indexText] = feld.field.split(':');
    const i = DISZIPLINEN.findIndex((d) => d.value === disziplin);
    const k = Number(indexText);
    if (i < 0 || Number.isNaN(k) || k < 0 || k >= this.meldungenArray(i).length) return false;
    const spieler = this.spielerGroup(i, k, 0); // Einzel: genau ein Spieler je Meldung
    const nachricht = feld.message ?? 'Diese Person ist in dieser Disziplin bereits gemeldet.';
    for (const name of ['vorname', 'nachname']) {
      const ctrl = spieler.get(name);
      ctrl?.setErrors({ duplikat: nachricht });
      ctrl?.markAsTouched();
    }
    return true;
  }

  /** Serverseitig gesetzte Spieler-Dublette (409) für die Anzeige unter den Namensfeldern. */
  spielerDuplikatText(i: number, k: number, j: number): string | null {
    const fehler: unknown = this.spielerGroup(i, k, j).get('vorname')?.errors?.['duplikat'];
    return typeof fehler === 'string' ? fehler : null;
  }
```

- [ ] **Step 4: Template ergänzen**

In `anmeldung.component.html` direkt nach dem schließenden `</div>` der `spieler-felder`-Zeile (aktuell Zeile 324, unmittelbar **vor** dem `@if (radikalAngabeInvalid(i, k, j))`-Block) einfügen:

```html
                              @if (spielerDuplikatText(i, k, j); as duplikatMeldung) {
                                <span class="field-error">{{ duplikatMeldung }}</span>
                              }
```

- [ ] **Step 5: Spec grün laufen lassen**

Run: `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS (neuer Test + bestehende Specs, inkl. Teamname-409-Test).

- [ ] **Step 6: Frontend-Gates (Lint + Format)**

Run: `cd frontend && npm run lint && npx prettier --check "src/app/pages/anmeldung/**"`
Expected: keine Fehler. Bei Prettier-Meckern `npx prettier --write "src/app/pages/anmeldung/**"` und mitcommitten.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.ts \
        frontend/src/app/pages/anmeldung/anmeldung.component.html \
        frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#170 Frontend: Einzel-Spieler-Dublette (409) feldgenau anzeigen"
```

---

## Abschluss

- [ ] **Manuelle Verifikation** (verify-Skill / echte App): Zwei Herreneinzel-Meldungen mit demselben Namen bzw. derselben Radikal-ID absenden → Fehler erscheint an den Namensfeldern der zweiten Meldung, kein Banner. Verschiedene Disziplinen mit demselben Spieler → akzeptiert.
- [ ] **Voller Testlauf**: `cd backend && ./mvnw -q verify` und `cd frontend && npm test -- --watch=false --browsers=ChromeHeadless`.
- [ ] **Ticket schließen / PR** gemäß finishing-a-development-branch.

## Spec-Abdeckung (Self-Review)

- Backend Dubletten-Check gegen aktive Anmeldungen **und** Request → Task 3 (`pruefe`, `ladeAktivenBestand`).
- Name **oder** Radikal-ID → 409 mit feldbezogener Meldung → Task 3 (`pruefeUndMerke`) + Task 5 (Mapping, Feldkennung).
- Verschiedene Disziplinen erlaubt → Task 3 (`andereDisziplinGleicherSpielerIstErlaubt`).
- Frontend 409 feld-/zeilengenau → Task 6.
- `@Nested`-Tests (gleicher Name / gleiche Radikal-ID / andere Disziplin / Dublette im Request) → Task 3.
- Reaktivierung (analog #152) → Task 3 (`pruefeReaktivierung`) + Task 4.
- Radikal-ID-Statusvereinheitlichung auf 409 → Task 5.
