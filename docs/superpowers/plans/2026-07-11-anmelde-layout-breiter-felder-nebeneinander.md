# Anmelde-Layout breiter + Spielerfelder nebeneinander (#168) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Anmelde-Card wird auf dem Desktop breiter und legt Vorname / Nachname / Radikal ID pro Spielerzeile nebeneinander (responsive stapelnd), während die geteilten Feld-Primitives einmalig global bereitgestellt werden.

**Architecture:** Reines Layout/SCSS + Template-Umbau, keine Logikänderung. (1) Die zwischen Login und Anmeldung duplizierten Feld-Primitives wandern nach `src/styles.scss` und werden aus beiden Komponenten entfernt (Tokens erben weiter über `:host`). (2) Die Spielerzeile wird auf ein CSS-Grid `.spieler-felder` umgebaut (3 Felder Standard, 4 im Toggle-Zustand), die Card auf `max-width: 880px` verbreitert, Responsivität über Viewport-Media-Queries.

**Tech Stack:** Angular (Standalone Components, `@if`/`@for` Control Flow, Reactive Forms), SCSS/CSS, Jest, ESLint, Prettier.

## Global Constraints

- Frontend-Quality-Gate vor jedem Commit lokal grün: `npm run lint` + `npm test` + `npm run format:check` (cwd `frontend/`).
- Keine Logik-/Validierungsänderung — nur Layout, SCSS und Template-Struktur.
- Keine Regression an bestehenden Validierungs-/Fehleranzeigen (`.field-error`-Spans + `radikalAngabeInvalid`-Hinweis bleiben erhalten).
- Login darf sich optisch **nicht** verändern (nur Deduplizierung, kein visueller Unterschied).
- Angular `anyComponentStyle`-Budget: 8 kB Warnung / 12 kB Fehler pro Komponenten-Style — die Extraktion darf es nicht verletzen (verkleinert das Anmeldung-SCSS).
- Echte Umlaute (ä/ö/ü/ß) auch in Kommentaren, nie ae/oe/ue.
- Sprechende Namen, Konventionen des Bestands folgen.
- Alle Kommandos laufen im Verzeichnis `frontend/`.

---

## File Structure

- `frontend/src/styles.scss` — **Modify.** Neuer, wiederverwendbarer Block „Formular-Feld-Primitives" (analog zum bestehenden `.hinweis`-Block).
- `frontend/src/app/pages/login/login.component.css` — **Modify.** Duplizierte Primitives entfernen (verweist implizit auf die globalen).
- `frontend/src/app/pages/anmeldung/anmeldung.component.scss` — **Modify.** Duplizierte Primitives + obsoletes `.field-row` entfernen; Card verbreitern; neues `.spieler-felder`-Grid.
- `frontend/src/app/pages/anmeldung/anmeldung.component.html` — **Modify.** Spielerzeile auf ein `.spieler-felder`-Grid umbauen (zwei alte `.field-row`-Wrapper entfallen).
- `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts` — **Modify.** Zwei neue Tests: Standard-Reihe (3 Felder) und Toggle-Reihe (`--split`, 4 Felder).

---

## Task 1: Feld-Primitives global extrahieren (Deduplizierung)

**Files:**
- Modify: `frontend/src/styles.scss` (neuer Block nach `.hinweis`)
- Modify: `frontend/src/app/pages/login/login.component.css:160-209`
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.scss:175-255`

**Interfaces:**
- Produces: globale Klassen `.field-group`, `.field-label`, `.field-label-optional`, `.required`, `.field-input` (+ `--sm`, `--error`, `:focus`, `::placeholder`), `.field-error`. Nutzbar in jeder Komponente, deren `:host` die Tokens `--surface-2`, `--border`, `--radius`, `--text`, `--text-muted`, `--text-dim`, `--border-focus`, `--accent`, `--accent-dim`, `--danger`, `--danger-dim` definiert (Login und Anmeldung tun das).
- Consumes: nichts.

**Hintergrund:** Die Primitives sind heute in `login.component.css` und `anmeldung.component.scss` **identisch** dupliziert. Einzige risikoarme Abweichung: Anmeldung-`.field-label` ist ein Flex-Container (für das `*`), Login nicht — bei Login-Einzeltext visuell gleich. Die globale Fassung übernimmt die Flex-Variante (Superset). `.field-row`, `.field-input--sm`, `.field-label-optional` und `.required` gibt es nur in der Anmeldung; davon werden `--sm`, `--label-optional`, `.required` mit globalisiert (Anmeldung nutzt sie), `.field-row` wird ersatzlos entfernt (nach dem Umbau in Task 2 unbenutzt, Login nutzt es nie).

- [ ] **Step 1: Globalen Primitives-Block in `styles.scss` einfügen**

Direkt nach dem schließenden `}` des `.hinweis`-Blocks (aktuell Zeile 34) einfügen:

```scss
/* ── Formular-Feld-Primitives ────────────────────────────────
   Wiederverwendbare Bausteine für Formularfelder (Login, Anmeldung
   und künftige Formulare). Die Farb-Tokens (--surface-2, --border …)
   erbt jedes Feld vom umgebenden Komponenten-:host – genau wie .hinweis.
   Seiten kombinieren die Primitives mit eigenen Layout-Klassen. */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.field-label-optional {
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text-dim);
  font-size: 0.7rem;
}

.required {
  color: var(--accent);
}

.field-input {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.9375rem;
  padding: 0.65rem 0.875rem;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

.field-input::placeholder {
  color: var(--text-dim);
}

.field-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--accent-dim);
}

.field-input--error {
  border-color: var(--danger);
}

.field-input--error:focus {
  box-shadow: 0 0 0 3px var(--danger-dim);
}

.field-input--sm {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
}

.field-error {
  font-size: 0.75rem;
  color: var(--danger);
}
```

- [ ] **Step 2: Duplikate aus `login.component.css` entfernen**

Ersatzlos löschen: `.field-group` (Z. 160-164), `.field-label` (Z. 166-172), `.field-input` (Z. 174-188), `.field-input::placeholder` (Z. 190-192), `.field-input:focus` (Z. 194-197), `.field-input--error` (Z. 199-201), `.field-input--error:focus` (Z. 202-204), `.field-error` (Z. 206-209). Der Kommentar `/* ── Form ───… */` und `.login-form` bleiben. Alle übrigen Login-Regeln (Card, Bullseye, Submit, Spinner, Alert) unverändert lassen.

- [ ] **Step 3: Duplikate aus `anmeldung.component.scss` entfernen**

Ersatzlos löschen im Block „Field Primitives" (Z. 175-255): `.field-row` inkl. dessen `@media`, `.field-group`, `.field-label`, `.field-label-optional`, `.required`, `.field-input` (der ganze verschachtelte Block inkl. `&::placeholder`, `&:focus`, `&--error`, `&--sm`), `.field-error`. **Behalten** bleiben in diesem Abschnitt: `.field-hint`, `.hint-icon`, `.payment-hint` (nicht Teil der Primitives, bleiben lokal). Die Kommentarzeile `/* ── Field Primitives ─… */` kann entfernt werden.

- [ ] **Step 4: Login- und Anmeldung-Specs laufen lassen (Guard gegen Regression)**

Run: `cd frontend && npm test -- login.component.spec anmeldung.component.spec`
Expected: PASS (beide Suites grün) — bestätigt, dass Feld-/Fehler-Rendering unverändert funktioniert.

- [ ] **Step 5: Production-Build (Budget-Check)**

Run: `cd frontend && npm run build`
Expected: BUILD erfolgreich, keine `anyComponentStyle`-Budget-Fehler/-Warnung (Anmeldung-SCSS ist jetzt kleiner).

- [ ] **Step 6: Visueller Checkpoint Login (darf sich nicht verändert haben)**

Run: `cd frontend && npm start` (dann `http://localhost:4200/login` öffnen).
Expected: Login-Seite pixelgleich zu vorher — Feldrahmen, Fokus-Glow (gelb), Fehlerrahmen (rot) unverändert. Danach Server stoppen.

- [ ] **Step 7: Lint + Format**

Run: `cd frontend && npm run format && npm run lint && npm run format:check`
Expected: keine Fehler.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/styles.scss frontend/src/app/pages/login/login.component.css frontend/src/app/pages/anmeldung/anmeldung.component.scss
git commit -m "#168 Feld-Primitives global in styles.scss (Login+Anmeldung dedupliziert)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Card verbreitern + Spielerzeile als Grid (nebeneinander, responsive)

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts` (2 neue Tests)
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.html:140-248`
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.scss` (`.anmeldung-card` `max-width`; neuer `.spieler-felder`-Block)

**Interfaces:**
- Consumes: globale Primitives aus Task 1; Component-Helfer `waehleDisziplin(i)` (Test-Helper), `component.spielerGroup(i, j)`, `component.toggleRadikalId(i, j)`, Template-Getter `hatKeineRadikalId(i, j)`. Konstanten `HERRENEINZEL` (Index in `DISZIPLINEN`) sind im Spec bereits definiert.
- Produces: Layout-Klassen `.spieler-felder` (+ Modifier `.spieler-felder--split`).

- [ ] **Step 1: Failing-Tests schreiben**

In `anmeldung.component.spec.ts` im `describe('AnmeldungComponent', …)` (z. B. nach dem Block „Spielerzeilen je Disziplin") einfügen:

```ts
describe('Feld-Layout der Spielerzeile (#168)', () => {
  it('legt Vorname, Nachname und Radikal ID in eine gemeinsame Feldreihe', () => {
    waehleDisziplin(HERRENEINZEL);

    const felder = host().querySelector('.spieler-row .spieler-felder');
    expect(felder).not.toBeNull();

    const ids = Array.from(felder!.querySelectorAll('input')).map(
      (el) => (el as HTMLInputElement).id,
    );
    expect(ids.some((id) => id.startsWith('vorname-'))).toBe(true);
    expect(ids.some((id) => id.startsWith('nachname-'))).toBe(true);
    expect(ids.some((id) => id.startsWith('radikalId-'))).toBe(true);
    expect(felder!.classList.contains('spieler-felder--split')).toBe(false);
  });

  it('zeigt bei „keine Radikal ID" Initialen und Geburtsdatum in derselben Reihe (--split)', () => {
    waehleDisziplin(HERRENEINZEL);
    component.spielerGroup(HERRENEINZEL, 0).get('hatKeineRadikalId')?.setValue(true);
    component.toggleRadikalId(HERRENEINZEL, 0);
    fixture.detectChanges();

    const felder = host().querySelector('.spieler-row .spieler-felder');
    expect(felder).not.toBeNull();
    expect(felder!.classList.contains('spieler-felder--split')).toBe(true);

    const ids = Array.from(felder!.querySelectorAll('input')).map(
      (el) => (el as HTMLInputElement).id,
    );
    expect(ids.some((id) => id.startsWith('vorname-'))).toBe(true);
    expect(ids.some((id) => id.startsWith('nachname-'))).toBe(true);
    expect(ids.some((id) => id.startsWith('initialen-'))).toBe(true);
    expect(ids.some((id) => id.startsWith('geburtsdatum-'))).toBe(true);
    expect(ids.some((id) => id.startsWith('radikalId-'))).toBe(false);
  });
});
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

Run: `cd frontend && npm test -- anmeldung.component.spec -t "Feld-Layout der Spielerzeile"`
Expected: FAIL — `.spieler-felder` existiert noch nicht (Selector liefert `null`).

- [ ] **Step 3: Template umbauen — ein Grid statt zwei `.field-row`**

In `anmeldung.component.html` den Bereich von `<div class="field-row">` (Vorname/Nachname, aktuell Z. 140) bis zum Ende des `@else`-Blocks der Radikal-Angabe (aktuell Z. 248) ersetzen durch:

```html
<div class="spieler-felder" [class.spieler-felder--split]="hatKeineRadikalId(i, j)">
  <div class="field-group">
    <label [for]="'vorname-' + i + '-' + j" class="field-label">
      Vorname <span class="required">*</span>
    </label>
    <input
      [id]="'vorname-' + i + '-' + j"
      type="text"
      formControlName="vorname"
      class="field-input field-input--sm"
      [class.field-input--error]="spielerFeldInvalid(i, j, 'vorname')"
      autocomplete="given-name"
      placeholder="Max"
    />
    @if (spielerFeldInvalid(i, j, 'vorname')) {
      <span class="field-error">Vorname ist erforderlich.</span>
    }
  </div>

  <div class="field-group">
    <label [for]="'nachname-' + i + '-' + j" class="field-label">
      Nachname <span class="required">*</span>
    </label>
    <input
      [id]="'nachname-' + i + '-' + j"
      type="text"
      formControlName="nachname"
      class="field-input field-input--sm"
      [class.field-input--error]="spielerFeldInvalid(i, j, 'nachname')"
      autocomplete="family-name"
      placeholder="Mustermann"
    />
    @if (spielerFeldInvalid(i, j, 'nachname')) {
      <span class="field-error">Nachname ist erforderlich.</span>
    }
  </div>

  <!-- Radikal-ID-Angabe: entweder Radikal ID oder Initialen + Geburtsdatum -->
  @if (!hatKeineRadikalId(i, j)) {
    <div class="field-group">
      <label [for]="'radikalId-' + i + '-' + j" class="field-label">
        Radikal ID <span class="required">*</span>
      </label>
      <input
        [id]="'radikalId-' + i + '-' + j"
        type="text"
        formControlName="radikalId"
        class="field-input field-input--sm"
        [class.field-input--error]="
          radikalAngabeInvalid(i, j) || spielerFeldHatFehler(i, j, 'radikalId', 'pattern')
        "
        placeholder="MM01011990"
      />
      @if (spielerFeldHatFehler(i, j, 'radikalId', 'pattern')) {
        <span class="field-error">
          Format: zwei Buchstaben und achtstelliges Geburtsdatum (z.&nbsp;B. MM01011990).
        </span>
      }
    </div>
  } @else {
    <div class="field-group">
      <label [for]="'initialen-' + i + '-' + j" class="field-label">
        Initialen <span class="required">*</span>
      </label>
      <input
        [id]="'initialen-' + i + '-' + j"
        type="text"
        formControlName="initialen"
        class="field-input field-input--sm"
        [class.field-input--error]="radikalAngabeInvalid(i, j)"
        placeholder="MM"
      />
    </div>
    <div class="field-group">
      <label [for]="'geburtsdatum-' + i + '-' + j" class="field-label">
        Geburtsdatum <span class="required">*</span>
      </label>
      <input
        [id]="'geburtsdatum-' + i + '-' + j"
        type="date"
        formControlName="geburtsdatum"
        class="field-input field-input--sm"
        [max]="heuteIso"
        [class.field-input--error]="
          radikalAngabeInvalid(i, j) || spielerFeldInvalid(i, j, 'geburtsdatum')
        "
      />
      @if (spielerFeldHatFehler(i, j, 'geburtsdatum', 'geburtsdatumUngueltig')) {
        <span class="field-error">
          Bitte ein gültiges Datum mit vierstelligem Jahr eingeben.
        </span>
      }
      @if (spielerFeldHatFehler(i, j, 'geburtsdatum', 'geburtsdatumInZukunft')) {
        <span class="field-error"> Das Geburtsdatum darf nicht in der Zukunft liegen. </span>
      }
    </div>
  }
</div>
```

Wichtig: Die nachfolgende `.radikal-toggle`-Checkbox, der `@if (radikalAngabeInvalid(i, j))`-Fehlerhinweis und `@if (zeigtErsatzHinweis(i, j))` bleiben **unverändert direkt nach** dem schließenden `</div>` von `.spieler-felder` (volle Breite unter dem Grid). Es werden nur die zwei bisherigen `.field-row`-Wrapper aufgelöst; alle Inputs, Labels, `formControlName`, IDs, `[class.field-input--error]`-Bindings und `@if`-Fehlerblöcke bleiben inhaltlich identisch.

- [ ] **Step 4: `.spieler-felder`-Grid + breitere Card in SCSS ergänzen**

In `anmeldung.component.scss` `.anmeldung-card` ändern: `max-width: 640px;` → `max-width: 880px;`.

Im Abschnitt „Spielerzeilen" (nach `.spieler-row-head` bzw. vor `.spieler-nr`, Reihenfolge egal) einfügen:

```scss
/* Vorname / Nachname / Radikal ID einer Spielerzeile nebeneinander in
   einer Reihe (Radikal ID schmaler). Im Toggle-Zustand --split vier
   Felder (Initialen + Geburtsdatum statt Radikal ID). Auf schmalen
   Viewports stapeln die Felder wieder vertikal. */
.spieler-felder {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr 1fr minmax(150px, 0.75fr);
}

.spieler-felder--split {
  grid-template-columns: 1fr 1fr minmax(90px, 0.5fr) minmax(150px, 0.85fr);
}

@media (max-width: 760px) {
  .spieler-felder,
  .spieler-felder--split {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 520px) {
  .spieler-felder,
  .spieler-felder--split {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Tests laufen lassen — müssen bestehen**

Run: `cd frontend && npm test -- anmeldung.component.spec`
Expected: PASS (die 2 neuen Tests grün, gesamte Anmeldung-Suite grün — keine Regression an Fehleranzeige-Tests).

- [ ] **Step 6: Production-Build (Budget-Check)**

Run: `cd frontend && npm run build`
Expected: BUILD erfolgreich, kein Budget-Fehler.

- [ ] **Step 7: Lint + Format**

Run: `cd frontend && npm run format && npm run lint && npm run format:check`
Expected: keine Fehler.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.html frontend/src/app/pages/anmeldung/anmeldung.component.scss frontend/src/app/pages/anmeldung/anmeldung.component.spec.ts
git commit -m "#168 Anmelde-Card breiter + Spielerfelder nebeneinander (responsive)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Visuelle Verifikation Desktop + Mobil (Login & Anmeldung)

**Files:** keine Code-Änderung (nur Verifikation; falls ein Mangel auffällt, zurück zu Task 2).

**Interfaces:** Consumes: fertiges Layout aus Task 1 + 2.

- [ ] **Step 1: Dev-Server starten**

Run: `cd frontend && npm start`
Expected: läuft auf `http://localhost:4200`.

- [ ] **Step 2: Anmeldung Desktop prüfen**

`http://localhost:4200/anmeldung` bei ~1280px Breite öffnen, eine Disziplin (z. B. Herrendoppel) aufklappen.
Erwartet: Card spürbar breiter als vorher (max. 880px). Pro Spielerzeile stehen **Vorname / Nachname / Radikal ID nebeneinander**, Radikal ID sichtbar schmaler. „Ich habe noch keine Radikal ID" aktivieren → **vier Felder** (Vorname / Nachname / Initialen / Geburtsdatum) in einer Reihe. Aufgeklappte Disziplin ist erkennbar **kürzer** als zuvor.

- [ ] **Step 3: Fehleranzeigen prüfen (keine Regression)**

Bei aufgeklappter Disziplin absenden ohne Eingaben.
Erwartet: rote Fehlerrahmen an den Feldern, `.field-error`-Texte unter den jeweiligen Feldern, der zeilenübergreifende Radikal-Hinweis unter dem Grid — alles wie zuvor lesbar und korrekt positioniert.

- [ ] **Step 4: Anmeldung Mobil prüfen**

Viewport auf ~375px (Mobil) stellen.
Erwartet: Felder stapeln wieder **einspaltig** (untereinander), keine horizontale Überlaufscroll, Card nutzt volle Breite mit Rand.

- [ ] **Step 5: Login gegenprüfen (darf sich nicht verändert haben)**

`http://localhost:4200/login` Desktop + Mobil.
Erwartet: unverändertes Aussehen — Feldrahmen, gelber Fokus-Glow, roter Fehlerrahmen wie vor der Änderung. Danach Server stoppen.

- [ ] **Step 6: Abschluss-Quality-Gate**

Run: `cd frontend && npm run lint && npm test && npm run format:check`
Expected: alles grün.

- [ ] **Step 7 (optional): Kleiner Feinschliff-Commit**

Nur falls in den Schritten 2-5 eine Nachjustierung nötig war (z. B. Spaltenbreiten/Breakpoint). Andernfalls entfällt dieser Schritt.

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.scss
git commit -m "#168 Feinschliff Spaltenbreiten/Breakpoints nach Sichtprüfung

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec-Abdeckung:**
- Card breiter (Desktop) → Task 2 Step 4 (`max-width: 880px`), verifiziert Task 3 Step 2. ✅
- Vorname/Nachname/Radikal ID nebeneinander, Radikal ID schmaler → Task 2 Step 3 + 4 (`.spieler-felder`, `minmax(150px, 0.75fr)`), Test Task 2 Step 1. ✅
- Responsive stapeln auf Mobil → Task 2 Step 4 (`@media`-Breakpoints), verifiziert Task 3 Step 4. ✅
- Weniger vertikale Länge → Zusammenlegen zweier Reihen in eine, verifiziert Task 3 Step 2. ✅
- Keine Regression an Validierungs-/Fehleranzeigen → Bindings/`@if` unverändert übernommen (Task 2 Step 3), Anmeldung-Suite grün (Task 2 Step 5), Sichtprüfung (Task 3 Step 3). ✅
- Wiederverwendung/Primitives global → Task 1. ✅
- Toggle-Fall vier Felder in einer Reihe → Task 2 (`--split`), Test Task 2 Step 1. ✅

**Placeholder-Scan:** Keine TBD/TODO; jeder Code-Schritt enthält vollständigen Code. ✅

**Typ-/Namens-Konsistenz:** `.spieler-felder` / `.spieler-felder--split`, `hatKeineRadikalId(i, j)`, `component.spielerGroup(i, j)`, `component.toggleRadikalId(i, j)`, `waehleDisziplin(i)` durchgängig gleich benannt; alle in Task 2 verwendeten Helfer existieren im Bestand (im Spec verifiziert). ✅
