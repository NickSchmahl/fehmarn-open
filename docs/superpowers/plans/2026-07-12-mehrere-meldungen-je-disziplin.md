# Mehrere Meldungen je Disziplin (#169) – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In einem Anmeldevorgang lassen sich für jede Disziplin beliebig viele eigenständige Meldungen anlegen (Einzel: je 1 Spieler; Team/Doppel: je eigener Teamname + Spielerliste).

**Architecture:** Das flache Request-DTO (`disziplinen: [{disziplin, teamName, spieler[]}]`) bleibt – dieselbe Disziplin darf jetzt mehrfach vorkommen. Backend: die Duplikat-Disziplin-Regel entfällt ersatzlos; zwei neue In-Memory-Prüfungen im `AnmeldungService` sichern Eindeutigkeit **innerhalb eines Requests** (Teamname je Disziplin, Radikal-ID je Disziplin). Frontend: das Formularmodell wird von „ein Spielerblock je Disziplin" auf „Liste von Meldungen je Disziplin" umgestellt.

**Tech Stack:** Spring Boot (Java 21, Lombok, JPA/SQLite, JUnit 5, Mockito, AssertJ, MockMvc), Angular (Standalone, Reactive Forms, Signals, Jest).

## Global Constraints

- Quality-Gate lokal vor jedem Commit: Frontend `npm run lint && npm test && npm run format:check`; Backend `./gradlew test`. (Memory: Quality-Gate vor Commit)
- Echte Umlaute (ä/ö/ü/ß) auch in Kommentaren und Testnamen. (Memory: Umlaute in Kommentaren)
- Kein amend/force-push auf gepushten Branches; Korrekturen als neuer Commit; kein `git add -A`. (Memory: Kein Force-Push)
- Backend-Fachtests mit `@Nested` je Methode-unter-Test gruppieren, kurze Verhaltens-Testnamen. (ADR 0012)
- Angular-Tests: `nativeElement` als `HTMLElement` casten; dynamische FormArray-Änderungen über **echte DOM-Klicks** testen, nicht per direktem Methodenaufruf. (Memory: Angular FormArray Test-Klick)
- Angular-Signals halten immutable Daten. (ADR 0014)
- DTO-Entscheidung: **flach** (mehrere Einträge derselben Disziplin). Eindeutigkeit #D: **Radikal-ID-Dublette je Disziplin im selben Request ablehnen** (nur wenn Radikal-ID gesetzt ist; ohne ID kein zuverlässiger Schlüssel → keine Prüfung).

---

## File Structure

**Backend (ändern):**
- `backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java` – Duplikat-Disziplin-Regel raus, zwei In-Memory-Prüfungen rein.
- `backend/src/main/java/de/dart/fehmarnopen/exception/GlobalExceptionHandler.java` – Handler für `DoppelteAnmeldungException` entfernen.
- `backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteAnmeldungException.java` – **löschen** (toter Code).
- `backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteRadikalIdException.java` – **neu** (400).

**Backend (Tests):**
- `AnmeldungServiceTest.java`, `AnmeldungControllerTest.java`.

**Frontend (ändern):**
- `frontend/src/app/pages/anmeldung/anmeldung.component.ts` – Formmodell + Accessoren + Methoden.
- `frontend/src/app/pages/anmeldung/anmeldung.component.html` – Meldungs-Wrapper + Buttons.
- `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts` – Accessor-Migration + neue Tests.

---

## Task 1: Duplikat-Disziplin-Regel entfernen (mehrere Einträge erlauben)

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/exception/GlobalExceptionHandler.java`
- Delete: `backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteAnmeldungException.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java`

**Interfaces:**
- Produces: `AnmeldungService.anmelden(AnmeldungRequest)` akzeptiert jetzt mehrere `DisziplinAnmeldung` mit gleicher Disziplin und speichert je eine `Anmeldung`.

- [ ] **Step 1: Bestehenden Duplikat-Test durch Mehrfach-Meldungs-Test ersetzen**

In `AnmeldungServiceTest.java` den Test `anmelden_beiDoppelterDisziplinImRequest_wirftDoppelteAnmeldung` (samt Import `DoppelteAnmeldungException`) **entfernen** und ersetzen durch:

```java
@Test
void anmelden_mitZweiHerreneinzelMeldungen_speichertZweiAnmeldungen() {
    when(anmeldungRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    AnmeldungRequest request = new AnmeldungRequest(List.of(
            new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M"))),
            new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Tim", "T")))));

    List<Anmeldung> result = anmeldungService.anmelden(request);

    assertThat(result).hasSize(2);
    verify(anmeldungRepository, times(2)).save(any(Anmeldung.class));
}
```

- [ ] **Step 2: Test ausführen – muss (noch) fehlschlagen**

Run: `./gradlew test --tests "de.dart.fehmarnopen.service.AnmeldungServiceTest"`
Expected: FAIL – `DoppelteAnmeldungException` wird noch geworfen (result != 2 Anmeldungen).

- [ ] **Step 3: Regel im Service entfernen**

In `AnmeldungService.java` den Aufruf `pruefeKeineDoppeltenDisziplinen(request);` in `anmelden(...)` **löschen** und die private Methode `pruefeKeineDoppeltenDisziplinen(...)` samt der Imports `DoppelteAnmeldungException`, `Disziplin` (nur falls ungenutzt), `EnumSet`, `Set` entfernen. `anmelden` lautet danach:

```java
@Transactional
public List<Anmeldung> anmelden(AnmeldungRequest request) {
    anmeldeschlussService.pruefeAnmeldungOffen();
    return request.disziplinen().stream().map(this::anmeldenFuerDisziplin).toList();
}
```

- [ ] **Step 4: Toten Exception-Handler + Klasse entfernen**

In `GlobalExceptionHandler.java` die Methode `handleDoppelteAnmeldung(...)` und den Import `DoppelteAnmeldungException` löschen. Datei `DoppelteAnmeldungException.java` löschen:

```bash
git rm backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteAnmeldungException.java
```

- [ ] **Step 5: Test ausführen – muss grün sein**

Run: `./gradlew test --tests "de.dart.fehmarnopen.service.AnmeldungServiceTest"`
Expected: PASS.

- [ ] **Step 6: Prüfen, dass `DoppelteAnmeldungException` nirgends mehr referenziert wird**

Run: `grep -rn "DoppelteAnmeldung" backend/src`
Expected: keine Treffer.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java \
        backend/src/main/java/de/dart/fehmarnopen/exception/GlobalExceptionHandler.java \
        backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java
git commit -m "#169 Mehrere Meldungen je Disziplin erlauben (Duplikat-Regel entfernt)"
```

---

## Task 2: Teamname-Eindeutigkeit innerhalb eines Requests

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java`

**Interfaces:**
- Consumes: `TeamnameValidierungService.normalisiere(String)` (bestehend, public) zum Normalisieren vor dem Vergleich.
- Produces: `anmelden(...)` wirft `DoppelterTeamnameException(disziplin, name)` (→ 409), wenn zwei Meldungen derselben Disziplin denselben normalisierten Teamnamen (case-insensitiv) tragen – **bevor** irgendetwas gespeichert wird.

- [ ] **Step 1: Failing Test in `@Nested MehrereMeldungen`**

```java
@Test
void anmelden_zweiTeamsGleicherNameSelbeDisziplin_wirftDoppelterTeamname() {
    when(teamnameValidierungService.normalisiere("Die Bullseye Boys")).thenReturn("Die Bullseye Boys");
    when(teamnameValidierungService.normalisiere("die bullseye boys")).thenReturn("die bullseye boys");
    AnmeldungRequest request = new AnmeldungRequest(List.of(
            new DisziplinAnmeldung(
                    Disziplin.HERRENDOPPEL, "Die Bullseye Boys", List.of(spieler("A", "A"), spieler("B", "B"))),
            new DisziplinAnmeldung(
                    Disziplin.HERRENDOPPEL, "die bullseye boys", List.of(spieler("C", "C"), spieler("D", "D")))));

    assertThatThrownBy(() -> anmeldungService.anmelden(request))
            .isInstanceOf(DoppelterTeamnameException.class);

    verify(anmeldungRepository, never()).save(any());
}
```

Import ergänzen: `import de.dart.fehmarnopen.exception.DoppelterTeamnameException;` (bereits vorhanden).

- [ ] **Step 2: Test ausführen – muss fehlschlagen**

Run: `./gradlew test --tests "de.dart.fehmarnopen.service.AnmeldungServiceTest"`
Expected: FAIL – keine Exception, `save` wird aufgerufen.

- [ ] **Step 3: In-Memory-Prüfung im Service ergänzen**

In `AnmeldungService.anmelden(...)` **vor** dem `stream().map(...)` aufrufen: `pruefeKeineDoppeltenTeamnamenImRequest(request);`. Neue private Methode (nutzt `String.CASE_INSENSITIVE_ORDER` wie der `TeamnameValidierungService`, umlaut-korrekt):

```java
private void pruefeKeineDoppeltenTeamnamenImRequest(AnmeldungRequest request) {
    Map<Disziplin, List<String>> gesehenJeDisziplin = new EnumMap<>(Disziplin.class);
    for (AnmeldungRequest.DisziplinAnmeldung eingabe : request.disziplinen()) {
        String normalisiert = teamnameValidierungService.normalisiere(eingabe.teamName());
        if (normalisiert == null) {
            continue; // Einzel/U18 ohne Teamname – nichts zu prüfen.
        }
        List<String> bereitsGesehen = gesehenJeDisziplin.computeIfAbsent(eingabe.disziplin(), d -> new ArrayList<>());
        boolean kollision = bereitsGesehen.stream()
                .anyMatch(vorhanden -> String.CASE_INSENSITIVE_ORDER.compare(vorhanden, normalisiert) == 0);
        if (kollision) {
            throw new DoppelterTeamnameException(eingabe.disziplin(), normalisiert);
        }
        bereitsGesehen.add(normalisiert);
    }
}
```

Imports ergänzen: `import java.util.ArrayList;`, `import java.util.EnumMap;`, `import java.util.Map;` (sowie `Disziplin`, falls durch Task 1 entfernt, wieder aufnehmen).

- [ ] **Step 4: Test ausführen – muss grün sein**

Run: `./gradlew test --tests "de.dart.fehmarnopen.service.AnmeldungServiceTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java \
        backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java
git commit -m "#169 Teamname-Eindeutigkeit je Disziplin auch innerhalb eines Requests"
```

---

## Task 3: Radikal-ID-Eindeutigkeit je Disziplin (#D)

**Files:**
- Create: `backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteRadikalIdException.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java`
- Test: `backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java`

**Interfaces:**
- Produces: `anmelden(...)` wirft `DoppelteRadikalIdException` (→ 400), wenn dieselbe Radikal-ID zweimal in derselben Disziplin im selben Request vorkommt.

- [ ] **Step 1: Failing Test**

```java
@Test
void anmelden_gleicheRadikalIdZweimalImSelbenEinzel_wirftDoppelteRadikalId() {
    AnmeldungRequest request = new AnmeldungRequest(List.of(
            new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M"))),
            new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spieler("Max", "M")))));

    assertThatThrownBy(() -> anmeldungService.anmelden(request))
            .isInstanceOf(DoppelteRadikalIdException.class);

    verify(anmeldungRepository, never()).save(any());
}
```

(Der Helper `spieler(...)` vergibt konstant `radikalId = "RAD-1"`, beide Meldungen kollidieren also.) Import ergänzen: `import de.dart.fehmarnopen.exception.DoppelteRadikalIdException;`.

- [ ] **Step 2: Test ausführen – muss fehlschlagen (Klasse fehlt/keine Exception)**

Run: `./gradlew test --tests "de.dart.fehmarnopen.service.AnmeldungServiceTest"`
Expected: FAIL (Compile-Fehler bzw. keine Exception).

- [ ] **Step 3: Exception-Klasse anlegen**

```java
package de.dart.fehmarnopen.exception;

/**
 * Fachlicher Konflikt: Dieselbe Radikal ID wurde innerhalb einer Disziplin mehrfach im selben
 * Anmeldevorgang gemeldet (#169/#D). Wird auf HTTP 400 gemappt.
 */
public class DoppelteRadikalIdException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public DoppelteRadikalIdException(String radikalId) {
        super("Diese Person ist in dieser Disziplin bereits gemeldet (Radikal ID " + radikalId + ").");
    }
}
```

- [ ] **Step 4: Handler ergänzen**

In `GlobalExceptionHandler.java`:

```java
@ExceptionHandler(DoppelteRadikalIdException.class)
public ResponseEntity<ErrorResponse> handleDoppelteRadikalId(DoppelteRadikalIdException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ErrorResponse.of(400, ex.getMessage()));
}
```

- [ ] **Step 5: Prüfung im Service ergänzen**

In `anmelden(...)` nach der Teamname-Prüfung `pruefeKeineDoppeltenRadikalIdsImRequest(request);` aufrufen. Neue Methode:

```java
private void pruefeKeineDoppeltenRadikalIdsImRequest(AnmeldungRequest request) {
    Map<Disziplin, Set<String>> gesehenJeDisziplin = new EnumMap<>(Disziplin.class);
    for (AnmeldungRequest.DisziplinAnmeldung eingabe : request.disziplinen()) {
        Set<String> bereitsGesehen = gesehenJeDisziplin.computeIfAbsent(eingabe.disziplin(), d -> new HashSet<>());
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

Imports ergänzen: `import java.util.HashSet;`, `import java.util.Set;` (sowie `SpielerRequest` ist bereits importiert).

- [ ] **Step 6: Test ausführen – muss grün sein**

Run: `./gradlew test --tests "de.dart.fehmarnopen.service.AnmeldungServiceTest"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/exception/DoppelteRadikalIdException.java \
        backend/src/main/java/de/dart/fehmarnopen/exception/GlobalExceptionHandler.java \
        backend/src/main/java/de/dart/fehmarnopen/service/AnmeldungService.java \
        backend/src/test/java/de/dart/fehmarnopen/service/AnmeldungServiceTest.java
git commit -m "#169 Radikal-ID-Dublette je Disziplin im Request ablehnen"
```

---

## Task 4: Controller-HTTP-Kontrakt für mehrere Meldungen

**Files:**
- Test: `backend/src/test/java/de/dart/fehmarnopen/controller/AnmeldungControllerTest.java`

**Interfaces:**
- Consumes: `AnmeldungService.anmelden(...)` ist im `@WebMvcTest` als `@MockitoBean` gemockt; getestet wird der HTTP-Kontrakt (De-/Serialisierung, Status).

- [ ] **Step 1: Failing/neuer Test – mehrere Meldungen werden akzeptiert**

```java
@Test
void post_mitZweiHerreneinzelMeldungen_gibt200UndZweiEintraege() throws Exception {
    when(anmeldeschlussService.isAnmeldungOffen()).thenReturn(true); // falls im Setup benötigt
    when(anmeldungService.anmelden(any())).thenReturn(List.of(
            buildAnmeldung(Disziplin.HERRENEINZEL, null, "Max"),
            buildAnmeldung(Disziplin.HERRENEINZEL, null, "Tim")));

    AnmeldungRequest request = new AnmeldungRequest(List.of(
            new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spielerRequest("Max"))),
            new DisziplinAnmeldung(Disziplin.HERRENEINZEL, null, List.of(spielerRequest("Tim")))));

    mockMvc.perform(post("/api/anmeldung")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(jsonMapper.writeValueAsString(request)))
            .andExpect(status().isOk());
}
```

> Hinweis: bestehende Tests dieser Klasse als Vorlage für Status-Erwartung (`isOk` vs. `isCreated`) und `anmeldeschlussService`-Stubbing nutzen; nicht raten.

- [ ] **Step 2: Test ausführen**

Run: `./gradlew test --tests "de.dart.fehmarnopen.controller.AnmeldungControllerTest"`
Expected: PASS (Kontrakt erlaubt Duplikate bereits, da nur `@Valid` greift).

- [ ] **Step 3: Referenz auf entfernte `DoppelteAnmeldungException` im Test bereinigen**

Run: `grep -n "DoppelteAnmeldung" backend/src/test/java/de/dart/fehmarnopen/controller/AnmeldungControllerTest.java`
Falls Treffer: zugehörigen Test/Import entfernen oder auf `DoppelterTeamnameException` (409) bzw. `DoppelteRadikalIdException` (400) umstellen.

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/java/de/dart/fehmarnopen/controller/AnmeldungControllerTest.java
git commit -m "#169 Controller-Test: mehrere Meldungen je Disziplin akzeptiert"
```

---

## Task 5: Frontend-Formmodell auf `meldungen[]` je Disziplin umstellen

Dies ist der strukturelle Kern: je Disziplin nicht mehr **ein** Spielerblock, sondern eine Liste von Meldungen. In diesem Task bleibt das sichtbare Verhalten bei **genau einer** Meldung je Disziplin (Feature „weitere Meldung" kommt in Task 6). Alle bestehenden Tests werden mechanisch auf die neuen Accessoren migriert.

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.ts`
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.html`
- Test: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts`

**Interfaces (neue/­geänderte Accessor-API, von Tasks 6–9 genutzt):**
- `disziplinGroup(i: number): FormGroup` – unverändert (`{ selected, meldungen }`).
- `meldungenArray(i: number): FormArray` – **neu**, die Meldungen einer Disziplin.
- `meldungGroup(i: number, k: number): FormGroup` – **neu**, `{ teamName, spieler }`.
- `spielerArray(i: number, k: number): FormArray` – **Signatur geändert** (zusätzlicher Meldungs-Index `k`).
- `spielerGroup(i: number, k: number, j: number): FormGroup` – **Signatur geändert**.
- `createMeldungGroup(i: number): FormGroup` – **neu**, füllt auf `minSpieler` auf und setzt Teamname-Validatoren je nach `meta.teamName`.

- [ ] **Step 1: Formmodell im Component umbauen**

In `anmeldung.component.ts` die Disziplin-Gruppe von `{ selected, teamName, spieler }` auf `{ selected, meldungen: FormArray }` ändern:

```ts
form = this.formBuilder.group(
  {
    disziplinen: this.formBuilder.array(
      DISZIPLINEN.map(() =>
        this.formBuilder.group({
          selected: [false],
          meldungen: this.formBuilder.array<FormGroup>([]),
        }),
      ),
    ),
  },
  { validators: (group: AbstractControl) => this.mindestensEineDisziplinValidator(group) },
);
```

- [ ] **Step 2: Accessoren + `createMeldungGroup` ersetzen**

```ts
get disziplinenArray(): FormArray {
  return this.form.get('disziplinen') as FormArray;
}

disziplinGroup(i: number): FormGroup {
  return this.disziplinenArray.at(i) as FormGroup;
}

meldungenArray(i: number): FormArray {
  return this.disziplinGroup(i).get('meldungen') as FormArray;
}

meldungGroup(i: number, k: number): FormGroup {
  return this.meldungenArray(i).at(k) as FormGroup;
}

spielerArray(i: number, k: number): FormArray {
  return this.meldungGroup(i, k).get('spieler') as FormArray;
}

spielerGroup(i: number, k: number, j: number): FormGroup {
  return this.spielerArray(i, k).at(j) as FormGroup;
}

/** Eine Meldung: (bei Team-Disziplinen) Teamname + auf Pflichtzahl aufgefüllte Spielerzeilen. */
private createMeldungGroup(i: number): FormGroup {
  const meta = DISZIPLINEN[i];
  const spieler = this.formBuilder.array<FormGroup>([]);
  while (spieler.length < meta.minSpieler) {
    spieler.push(this.createSpielerGroup());
  }
  const validators = meta.teamName ? [Validators.required, teamnameMaxLaengeValidator] : [];
  return this.formBuilder.group({
    teamName: ['', validators],
    spieler,
  });
}
```

- [ ] **Step 3: Toggle-Logik auf Meldungen umstellen**

```ts
private onDisziplinToggle(i: number, selected: boolean): void {
  const meldungen = this.meldungenArray(i);
  if (selected) {
    if (meldungen.length === 0) {
      meldungen.push(this.createMeldungGroup(i));
    }
  } else {
    meldungen.clear();
  }
}
```

- [ ] **Step 4: Spieler-Add/Remove auf `(i, k)` umstellen**

```ts
addSpieler(i: number, k: number): void {
  if (this.canAddSpieler(i, k)) {
    this.spielerArray(i, k).push(this.createSpielerGroup());
  }
}

removeSpieler(i: number, k: number, j: number): void {
  if (this.canRemoveSpieler(i, k)) {
    this.spielerArray(i, k).removeAt(j);
  }
}

canAddSpieler(i: number, k: number): boolean {
  return this.spielerArray(i, k).length < DISZIPLINEN[i].maxSpieler;
}

canRemoveSpieler(i: number, k: number): boolean {
  return this.spielerArray(i, k).length > DISZIPLINEN[i].minSpieler;
}
```

- [ ] **Step 5: Restliche `(i,j)`-Helper auf `(i,k,j)` umstellen**

Betroffen: `toggleRadikalId`, `hatKeineRadikalId`, `spielerFeldInvalid`, `spielerFeldHatFehler`, `radikalAngabeInvalid`, `zeigtErsatzHinweis`. Beispielhaft:

```ts
toggleRadikalId(i: number, k: number, j: number): void {
  const group = this.spielerGroup(i, k, j);
  group.get('radikalId')?.updateValueAndValidity();
  group.get('geburtsdatum')?.updateValueAndValidity();
}

hatKeineRadikalId(i: number, k: number, j: number): boolean {
  return this.spielerGroup(i, k, j).get('hatKeineRadikalId')?.value === true;
}

spielerFeldInvalid(i: number, k: number, j: number, feld: string): boolean {
  const ctrl = this.spielerGroup(i, k, j).get(feld);
  return ctrl !== null && ctrl.invalid && ctrl.touched;
}

spielerFeldHatFehler(i: number, k: number, j: number, feld: string, fehler: string): boolean {
  const ctrl = this.spielerGroup(i, k, j).get(feld);
  return ctrl !== null && ctrl.touched && ctrl.hasError(fehler);
}

radikalAngabeInvalid(i: number, k: number, j: number): boolean {
  const group = this.spielerGroup(i, k, j);
  return group.hasError('radikalIdAngabeFehlt') && group.touched;
}

zeigtErsatzHinweis(i: number, k: number, j: number): boolean {
  return DISZIPLINEN[i].value === 'TRIPLE_MIX' && j === 3;
}
```

Teamname-Helper auf `(i, k)` umstellen (`needsTeamName`, `teamNameInvalid`, `teamNameRequiredFehler`, `teamNameLaengeFehler`, `teamNameDuplikatText`), Zugriff jeweils über `this.meldungGroup(i, k).get('teamName')`. `needsTeamName(i, k)` = `DISZIPLINEN[i].teamName && this.isDisziplinSelected(i)`.

- [ ] **Step 6: Template auf verschachtelte Meldungen umstellen**

In `anmeldung.component.html` innerhalb der `disziplin-card` den Teamname-Block **und** den Spielerblock in eine Schleife über die Meldungen hüllen. Der bisherige `@if (needsTeamName(i))`-Block und `@if (isDisziplinSelected(i)) { <div class="spieler-block" formArrayName="spieler"> … }` werden ersetzt durch:

```html
@if (isDisziplinSelected(i)) {
  <div class="meldungen-block" formArrayName="meldungen">
    @for (meldungCtrl of meldungenArray(i).controls; track meldungCtrl; let k = $index) {
      <div class="meldung-card" [formGroupName]="k">
        @if (needsTeamName(i, k)) {
          <div class="teamname-field">
            <label [for]="'teamname-' + i + '-' + k" class="field-label">
              Teamname <span class="required">*</span>
            </label>
            <input
              [id]="'teamname-' + i + '-' + k"
              type="text"
              formControlName="teamName"
              class="field-input field-input--sm"
              [class.field-input--error]="teamNameInvalid(i, k)"
              placeholder="z. B. Die Bullseye Boys"
            />
            @if (teamNameRequiredFehler(i, k)) {
              <span class="field-error">Teamname ist erforderlich.</span>
            }
            @if (teamNameLaengeFehler(i, k)) {
              <span class="field-error"
                >Teamname darf höchstens {{ teamnameMaxLaenge }} Zeichen haben.</span
              >
            }
            @if (teamNameDuplikatText(i, k); as duplikatMeldung) {
              <span class="field-error">{{ duplikatMeldung }}</span>
            }
          </div>
        }

        <div class="spieler-block" formArrayName="spieler">
          @for (spielerCtrl of spielerArray(i, k).controls; track spielerCtrl; let j = $index) {
            <div class="spieler-row" [formGroupName]="j">
              <!-- Bestehende Spielerzeile 1:1 übernehmen, aber ALLE Aufrufe
                   (i, j) → (i, k, j) erweitern: hatKeineRadikalId, toggleRadikalId,
                   canRemoveSpieler, removeSpieler, spielerFeldInvalid,
                   spielerFeldHatFehler, radikalAngabeInvalid, zeigtErsatzHinweis
                   sowie die [id]/[for]-Suffixe '-' + i + '-' + k + '-' + j. -->
            </div>
          }

          @if (canAddSpieler(i, k)) {
            <button type="button" class="spieler-add" (click)="addSpieler(i, k)">
              + Spieler hinzufügen
            </button>
          }
        </div>
      </div>
    }
  </div>
}
```

- [ ] **Step 7: Bestehende Spec mechanisch auf neue Accessoren migrieren**

In `anmeldung.component.spec.ts` alle Zugriffe anpassen (Meldungsindex `0`, da hier noch eine Meldung je Disziplin):
- `component.spielerArray(i)` → `component.spielerArray(i, 0)`
- `component.disziplinGroup(i).get('teamName')` → `component.meldungGroup(i, 0).get('teamName')`
- `component.toggleRadikalId(i, j)` → `component.toggleRadikalId(i, 0, j)`
- Helper `setzeMitRadikalId(i, j, …)` / `setzeOhneRadikalId(...)` intern auf `spielerGroup(i, 0, j)` bzw. `toggleRadikalId(i, 0, j)` umstellen.
- Payload-Erwartungen: `body.disziplinen[n].spieler` bleibt gleich (das gesendete DTO ist unverändert flach) – nur die Erzeugung im Test über die neuen Accessoren.

- [ ] **Step 8: Lint + Tests grün**

Run: `npm run lint && npm test -- --testPathPattern anmeldung.component.spec`
Expected: PASS (Verhalten unverändert, eine Meldung je Disziplin).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.ts \
        frontend/src/app/pages/anmeldung/anmeldung.component.html \
        frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#169 Frontend: Formmodell auf Meldungen je Disziplin umgestellt"
```

---

## Task 6: „Weitere Meldung" hinzufügen/entfernen (Frontend)

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.ts`
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.html`
- Test: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts`

**Interfaces:**
- Consumes: `createMeldungGroup(i)`, `meldungenArray(i)` (Task 5).
- Produces: `addMeldung(i)`, `removeMeldung(i, k)`, `canRemoveMeldung(i)`.

- [ ] **Step 1: Failing Test (echter DOM-Klick)**

```ts
it('fügt bei Herreneinzel per Klick eine zweite eigenständige Meldung hinzu', () => {
  waehleDisziplin(HERRENEINZEL);
  fixture.detectChanges();

  const addBtn = host().querySelector(
    `[data-testid="meldung-add-${HERRENEINZEL}"]`,
  ) as HTMLButtonElement;
  addBtn.click();
  fixture.detectChanges();

  expect(component.meldungenArray(HERRENEINZEL).length).toBe(2);
  expect(component.spielerArray(HERRENEINZEL, 1).length).toBe(1);
});
```

- [ ] **Step 2: Test ausführen – muss fehlschlagen (Button/Methode fehlt)**

Run: `npm test -- --testPathPattern anmeldung.component.spec`
Expected: FAIL.

- [ ] **Step 3: Methoden ergänzen**

```ts
addMeldung(i: number): void {
  this.meldungenArray(i).push(this.createMeldungGroup(i));
}

removeMeldung(i: number, k: number): void {
  if (this.canRemoveMeldung(i)) {
    this.meldungenArray(i).removeAt(k);
  }
}

canRemoveMeldung(i: number): boolean {
  return this.meldungenArray(i).length > 1;
}
```

- [ ] **Step 4: Template – Entfernen je Meldung + Hinzufügen je Disziplin**

Im `meldung-card` (oben) einen Entfernen-Button, nach der Meldungs-Schleife einen Hinzufügen-Button:

```html
<!-- innerhalb von .meldung-card, vor dem Teamname -->
@if (canRemoveMeldung(i)) {
  <button
    type="button"
    class="meldung-remove"
    (click)="removeMeldung(i, k)"
    [attr.aria-label]="'Meldung ' + (k + 1) + ' entfernen'"
  >
    Meldung entfernen
  </button>
}
```

```html
<!-- nach @for der Meldungen, noch innerhalb von .meldungen-block -->
<button
  type="button"
  class="meldung-add"
  [attr.data-testid]="'meldung-add-' + i"
  (click)="addMeldung(i)"
>
  + Weitere Meldung
</button>
```

- [ ] **Step 5: Zweiter Test – letzte Meldung nicht entfernbar**

```ts
it('lässt die letzte verbleibende Meldung nicht entfernen', () => {
  waehleDisziplin(HERRENEINZEL);
  fixture.detectChanges();
  expect(component.canRemoveMeldung(HERRENEINZEL)).toBe(false);
});
```

- [ ] **Step 6: Lint + Tests grün**

Run: `npm run lint && npm test -- --testPathPattern anmeldung.component.spec`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.ts \
        frontend/src/app/pages/anmeldung/anmeldung.component.html \
        frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#169 Frontend: weitere Meldung hinzufügen/entfernen je Disziplin"
```

---

## Task 7: Preisberechnung je Meldung (Frontend)

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.ts`
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.html`
- Test: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts`

**Interfaces:**
- Produces: `preisPosten()` liefert **eine Position je Meldung**; `gesamtpreis()` summiert alle.

- [ ] **Step 1: Failing Test**

```ts
it('zählt drei Herreneinzel-Meldungen als 30 € gesamt', () => {
  waehleDisziplin(HERRENEINZEL);
  component.addMeldung(HERRENEINZEL);
  component.addMeldung(HERRENEINZEL);
  fixture.detectChanges();

  expect(component.preisPosten().length).toBe(3);
  expect(component.gesamtpreis()).toBe(30);
});

it('zählt mehrere U18-Meldungen als kostenlos (0 €)', () => {
  waehleDisziplin(U18);
  component.addMeldung(U18);
  fixture.detectChanges();

  expect(component.gesamtpreis()).toBe(0);
});
```

- [ ] **Step 2: Test ausführen – muss fehlschlagen**

Run: `npm test -- --testPathPattern anmeldung.component.spec`
Expected: FAIL (aktuelles `preisPosten` liest `disziplin.spieler`).

- [ ] **Step 3: `preisPosten` auf Meldungen umstellen**

```ts
preisPosten = computed<PreisPosten[]>(() => {
  const disziplinen = this._formValue().disziplinen as {
    selected: boolean | null;
    meldungen: { spieler: unknown[] }[];
  }[];
  return disziplinen
    .map((disziplin, i) => ({ disziplin, meta: DISZIPLINEN[i] }))
    .filter(({ disziplin }) => disziplin.selected === true)
    .flatMap(({ disziplin, meta }) =>
      disziplin.meldungen.map((meldung) => {
        const spielerAnzahl = meldung.spieler.length;
        return {
          label: meta.label,
          spielerAnzahl,
          preisProSpieler: meta.preisProSpieler,
          betrag: spielerAnzahl * meta.preisProSpieler,
        };
      }),
    );
});
```

- [ ] **Step 4: Template `track` der Preiszeile anpassen**

In `anmeldung.component.html` `@for (posten of preisPosten(); track posten.label)` → `track $index` (gleiches Label kann mehrfach vorkommen).

- [ ] **Step 5: Lint + Tests grün**

Run: `npm run lint && npm test -- --testPathPattern anmeldung.component.spec`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.ts \
        frontend/src/app/pages/anmeldung/anmeldung.component.html \
        frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#169 Frontend: Preis zählt jede Meldung als eigene Position"
```

---

## Task 8: Submit-Payload über alle Meldungen (Frontend)

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.ts`
- Test: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts`

**Interfaces:**
- Produces: `POST /api/anmeldung` sendet je Meldung einen flachen `disziplinen`-Eintrag `{ disziplin, teamName, spieler[] }`.

- [ ] **Step 1: Failing Test**

```ts
it('sendet für zwei Herreneinzel-Meldungen zwei flache Disziplin-Einträge', () => {
  waehleDisziplin(HERRENEINZEL);
  component.addMeldung(HERRENEINZEL);
  fixture.detectChanges();
  setzeMitRadikalId(HERRENEINZEL, 0, 'Max', 'M');
  setzeMitRadikalId(HERRENEINZEL, 1, 'Tim', 'T');

  component.onSubmit();

  const req = httpMock.expectOne('/api/anmeldung');
  const body = req.request.body as { disziplinen: { disziplin: string; spieler: unknown[] }[] };
  expect(body.disziplinen).toHaveLength(2);
  expect(body.disziplinen[0].disziplin).toBe('HERRENEINZEL');
  expect(body.disziplinen[1].disziplin).toBe('HERRENEINZEL');
  req.flush({});
});
```

(`setzeMitRadikalId` in Task 5 auf `(i, k, …)` erweitern; hier `k` = Meldungsindex.)

- [ ] **Step 2: Test ausführen – muss fehlschlagen**

Run: `npm test -- --testPathPattern anmeldung.component.spec`
Expected: FAIL (aktuelles `onSubmit` liest `ctrl.get('spieler')`).

- [ ] **Step 3: `onSubmit`-Mapping auf `flatMap` über Meldungen umstellen**

```ts
const disziplinen = this.disziplinenArray.controls
  .map((ctrl, i) => ({ ctrl, meta: DISZIPLINEN[i] }))
  .filter(({ ctrl }) => ctrl.get('selected')?.value === true)
  .flatMap(({ ctrl, meta }) =>
    (ctrl.get('meldungen') as FormArray).controls.map((meldung) => ({
      disziplin: meta.value,
      teamName: normalisiereTeamname(stringWert(meldung, 'teamName')),
      spieler: (meldung.get('spieler') as FormArray).controls.map((s) => this.toSpielerPayload(s)),
    })),
  );
```

- [ ] **Step 4: Lint + Tests grün**

Run: `npm run lint && npm test -- --testPathPattern anmeldung.component.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.ts \
        frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#169 Frontend: Submit sendet je Meldung einen Disziplin-Eintrag"
```

---

## Task 9: Server-Teamname-Dublette der richtigen Meldung zuordnen (Frontend)

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.ts`
- Test: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts`

**Interfaces:**
- Consumes: 409-Fehler mit `errors[0].field = <Disziplin>` (ADR 0011, `DoppelterTeamnameException`).
- Produces: `zeigeTeamnameDuplikatAmFeld` / `clearTeamnameDuplikatFehler` arbeiten über `meldungGroup(i, k)`; da die Feldkennung nur die Disziplin trägt, wird der Fehler an die **erste Team-Meldung** dieser Disziplin gesetzt.

- [ ] **Step 1: Failing Test**

```ts
it('zeigt eine Server-Teamname-Dublette (409) an der ersten Meldung der Disziplin', () => {
  waehleDisziplin(HERRENDOPPEL);
  fixture.detectChanges();
  component.meldungGroup(HERRENDOPPEL, 0).get('teamName')?.setValue('Team X');
  setzeMitRadikalId(HERRENDOPPEL, 0, 'A', 'A');
  setzeMitRadikalId(HERRENDOPPEL, 0, 'B', 'B'); // zweite Zeile über addSpieler in Helper

  component.onSubmit();
  const req = httpMock.expectOne('/api/anmeldung');
  req.flush(
    { status: 409, errors: [{ field: 'HERRENDOPPEL', message: 'Teamname bereits vergeben' }] },
    { status: 409, statusText: 'Conflict' },
  );

  expect(component.teamNameDuplikatText(HERRENDOPPEL, 0)).toBe('Teamname bereits vergeben');
});
```

- [ ] **Step 2: Test ausführen – muss fehlschlagen**

Run: `npm test -- --testPathPattern anmeldung.component.spec`
Expected: FAIL (Methoden greifen noch auf `disziplinGroup(i).get('teamName')`).

- [ ] **Step 3: `clearTeamnameDuplikatFehler` + `zeigeTeamnameDuplikatAmFeld` umstellen**

`clearTeamnameDuplikatFehler` iteriert über alle Disziplinen **und** deren Meldungen und räumt an jedem `teamName`-Control den `duplikat`-Fehler ab. `zeigeTeamnameDuplikatAmFeld` bestimmt aus `errors[0].field` den Disziplin-Index, findet die erste Meldung mit gesetztem/erwartetem Teamname (Index 0 bzw. erste Team-Meldung) und setzt dort `setErrors({ duplikat: message })`. Vollständige Fassung:

```ts
private clearTeamnameDuplikatFehler(): void {
  for (const disziplinGruppe of this.disziplinenArray.controls) {
    const meldungen = disziplinGruppe.get('meldungen') as FormArray;
    for (const meldung of meldungen.controls) {
      const ctrl = meldung.get('teamName');
      if (ctrl?.hasError('duplikat')) {
        ctrl.setErrors(null);
        ctrl.updateValueAndValidity();
      }
    }
  }
}

private zeigeTeamnameDuplikatAmFeld(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) return false;
  const errors = (err.error as { errors?: { field?: string; message?: string }[] } | null)?.errors;
  const feld = errors?.[0];
  if (!feld?.field) return false;
  const i = DISZIPLINEN.findIndex((d) => d.value === feld.field);
  if (i < 0 || this.meldungenArray(i).length === 0) return false;
  const ctrl = this.meldungGroup(i, 0).get('teamName');
  ctrl?.setErrors({ duplikat: feld.message ?? 'Teamname bereits vergeben' });
  return true;
}
```

`teamNameDuplikatText(i, k)` liest den Fehler über `this.meldungGroup(i, k).get('teamName')?.errors?.['duplikat']`.

- [ ] **Step 4: Lint + Tests grün**

Run: `npm run lint && npm test -- --testPathPattern anmeldung.component.spec`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.ts \
        frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#169 Frontend: Server-Teamname-Dublette der Meldung zuordnen"
```

---

## Task 10: Volles Quality-Gate + Doku

**Files:**
- Modify: `docs/features/*` bzw. betroffene Doku (Anmeldeflow), falls vorhanden.

- [ ] **Step 1: Backend-Gate**

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 2: Frontend-Gate**

Run: `cd frontend && npm run lint && npm test && npm run format:check`
Expected: alle grün.

- [ ] **Step 3: Doku pflegen**

Betroffene Feature-/Ablauf-Doku um „mehrere Meldungen je Disziplin" ergänzen (kurz halten). (Memory: Doku nach Korrektur)

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "#169 Doku: mehrere Meldungen je Disziplin"
```

---

## Self-Review

**Spec-Abdeckung (Ticket #169):**
- Frontend, mehrere Meldungen alle Disziplinen → Tasks 5, 6.
- Backend akzeptiert mehrere Meldungen / Duplikat-Regel entfällt → Task 1.
- Jede Meldung durchläuft Spieler-/Radikal-ID-Validierung → unverändert in `anmeldenFuerDisziplin` (Regression via bestehende Service-Tests, Task 1/4).
- Teamname-Eindeutigkeit innerhalb Request → Task 2; Frontend-Anzeige → Task 9.
- Radikal-ID-Eindeutigkeit (#D) → Task 3.
- Preis je Meldung → Task 7.
- Übersichten zeigen mehrere Meldungen → **kein Code nötig** (Mapper gruppiert bereits je Disziplin über alle aktiven Anmeldungen; jede Meldung ist eine eigene `Anmeldung`). Verifikation: bestehende `UebersichtMapperTest` bleibt grün; optional Regressionstest mit zwei Herreneinzel-Anmeldungen ergänzen.

**Offene Design-Punkte (entschieden):** DTO flach ✔; #D ablehnen ✔.

**Typ-Konsistenz:** Accessoren `spielerArray(i,k)` / `spielerGroup(i,k,j)` / `meldungGroup(i,k)` durchgängig in Tasks 5–9 verwendet; `createMeldungGroup(i)` in Tasks 5/6; `addMeldung/removeMeldung/canRemoveMeldung` in Task 6/7/8.

**Risiko:** Task 5 ist groß (Formmodell + Template + Spec-Migration in einem Schritt, sonst kompiliert nichts). Bewusst als eine Einheit belassen; Deliverable = alle bestehenden Tests grün bei einer Meldung je Disziplin.
