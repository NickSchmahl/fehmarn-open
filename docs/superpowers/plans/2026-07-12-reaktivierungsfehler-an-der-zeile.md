# Reaktivierungs-Fehler an der Zeile (#166) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den 409-Fehler beim Reaktivieren (Teamname-Dublette) an der betroffenen Meldungs-Zeile anzeigen statt als globalem Banner ganz oben.

**Architecture:** Reiner Frontend-UI-Fix in der Angular-Standalone-Component `Teilnehmer`. Der globale `aktionsFehler: signal<string | null>` wird durch ein zeilenbezogenes `signal<AktionsFehler | null>` mit `{ meldungId, text }` ersetzt. Ein Lese-Helper `fehlerFuer(id)` liefert dem Template den Text nur für die betroffene Zeile. Jede Admin-Aktion (reaktivieren/abmelden/anwesenheit) räumt den Fehler zu Beginn weg. Das Banner im Template wandert in den `team-block`.

**Tech Stack:** Angular (Signals, Standalone-Components, `@if`/`@for` Control-Flow), Jest + `@angular/common/http/testing` (`HttpTestingController`), SCSS.

## Global Constraints

- Backend bleibt **unverändert** — der 409 liefert die fachliche Meldung (`error.message`) bereits mit Disziplin-Feldkennung.
- Signals halten unveränderliche Daten; keine In-place-Mutation (ADR 0014).
- Echte Umlaute (ä/ö/ü/ß) auch in Kommentaren, nicht ae/oe/ue.
- Sprechende Namen (keine Ein-Buchstaben-Variablen).
- Vor jedem Commit volle Frontend-Gate lokal: `npm run lint && npm test && npm run format:check` (im Verzeichnis `frontend/`).
- Component-Tests, die dynamisches DOM prüfen, über echte Button-Klicks / `fixture.detectChanges()` — `nativeElement` beim Zugriff `as HTMLElement` casten.
- Kein Force-Push; Korrekturen als neue Commits.

---

## File Structure

- **Modify** `frontend/src/app/pages/teilnehmer/teilnehmer.ts` — neuer UI-Typ `AktionsFehler`, umgestelltes `aktionsFehler`-Signal, `fehlerFuer(id)`-Helper, `aktionBeginnen()`-Helper, angepasste Aktionen.
- **Modify** `frontend/src/app/pages/teilnehmer/teilnehmer.html` — globales Banner entfernen, zeilenbezogenen Fehler im `team-block` rendern.
- **Modify** `frontend/src/app/pages/teilnehmer/teilnehmer.scss` — schmale `.team-block-fehler`-Regel für Abstand im Block.
- **Modify** `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` — bestehenden 409-Test umstellen, neue Tests für Zeilenbezug + „andere Aktion räumt weg" + DOM.

Alle Arbeit ist im Verzeichnis `frontend/`. Kommandos unten gehen davon aus, dass die Shell dort steht (`cd frontend` einmal zu Beginn).

---

### Task 1: State-Modell zeilenbezogen machen (`teilnehmer.ts`)

**Files:**
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.ts`
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts`

**Interfaces:**
- Consumes: bestehende `AdminMeldungEintrag` (Feld `id: number`), `fehlerMeldung(err): string`.
- Produces:
  - `interface AktionsFehler { meldungId: number; text: string }`
  - `readonly aktionsFehler = signal<AktionsFehler | null>(null)`
  - `fehlerFuer(meldungId: number): string | null` — Text der betroffenen Zeile oder `null`
  - `private aktionBeginnen(): void` — setzt `aktionsFehler` auf `null`

- [ ] **Step 1: Bestehenden 409-Test umschreiben (failing)**

In `teilnehmer.spec.ts` den Test „zeigt bei Reaktivierungs-Konflikt (409) die Server-Meldung an" (aktuell ~Zeile 420) ersetzen durch die zeilenbezogene Variante. `adminResponse` enthält Meldungen mit id 5 (abgemeldet) — die reaktiviert wird. Prüfe zusätzlich, dass eine andere id keinen Fehler trägt:

```ts
it('zeigt den Reaktivierungs-Konflikt (409) nur an der betroffenen Zeile', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

  component.reaktivieren(5);

  const action = httpTesting.expectOne('/api/admin/anmeldung/5/reaktivieren');
  action.flush(
    { status: 409, message: 'Teamname ist in dieser Disziplin bereits vergeben: Team A' },
    { status: 409, statusText: 'Conflict' },
  );

  expect(component.fehlerFuer(5)).toContain('bereits vergeben');
  // Fehler ist zeilenbezogen: andere Zeilen bleiben sauber.
  expect(component.fehlerFuer(999)).toBeNull();
  // Kein Reload nach Fehler.
  httpTesting.expectNone('/api/admin/teilnehmer');
});
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx jest teilnehmer --silent`
Expected: FAIL — `component.fehlerFuer is not a function` (bzw. TS-Kompilationsfehler, weil `fehlerFuer` fehlt).

- [ ] **Step 3: Typ + Signal umstellen**

In `teilnehmer.ts` den bestehenden Kommentar + `aktionsFehler`-Signal (aktuell Zeile 138–139) ersetzen. Den neuen Typ direkt vor der Component-Klasse (nach den anderen Admin-Typen, vor `type Filter`) einfügen:

```ts
/** Fehler einer Zeilen-Aktion (z. B. 409 beim Reaktivieren wegen Teamname-Dublette). */
export interface AktionsFehler {
  meldungId: number;
  text: string;
}
```

Und im Klassenkörper:

```ts
  // Fehler einer Admin-Aktion, zeilenbezogen: welche Meldung + fachlicher Text.
  readonly aktionsFehler = signal<AktionsFehler | null>(null);
```

- [ ] **Step 4: Lese-Helper + Reset-Helper hinzufügen**

Im Klassenkörper, im Bereich der Admin-Aktionen (nach `setSuche`/vor `abmelden`), einfügen:

```ts
  /** Fehlertext für genau diese Meldung – oder null, wenn der Fehler eine andere/keine Zeile betrifft. */
  fehlerFuer(meldungId: number): string | null {
    const fehler = this.aktionsFehler();
    return fehler?.meldungId === meldungId ? fehler.text : null;
  }

  /** Start einer Admin-Aktion: einen evtl. sichtbaren Zeilen-Fehler wegräumen. */
  private aktionBeginnen(): void {
    this.aktionsFehler.set(null);
  }
```

- [ ] **Step 5: Aktionen anpassen**

`abmelden`, `reaktivieren` und `toggleAnwesenheit` beginnen mit `this.aktionBeginnen();`. `reaktivieren` setzt im `error`-Zweig den zeilenbezogenen Fehler:

```ts
  abmelden(id: number): void {
    this.aktionBeginnen();
    this.http.post(`/api/admin/anmeldung/${id}/abmelden`, {}).subscribe({
      next: () => {
        this.ladeAdmin();
      },
    });
  }

  reaktivieren(id: number): void {
    this.aktionBeginnen();
    this.http.post(`/api/admin/anmeldung/${id}/reaktivieren`, {}).subscribe({
      next: () => {
        this.ladeAdmin();
      },
      // Reaktivieren kann an einer Teamname-Dublette scheitern (409) – Fehler an der Zeile zeigen.
      error: (err: unknown) => {
        this.aktionsFehler.set({ meldungId: id, text: this.fehlerMeldung(err) });
      },
    });
  }

  toggleAnwesenheit(id: number, anwesend: boolean): void {
    this.aktionBeginnen();
    this.http.put(`/api/admin/anmeldung/${id}/anwesenheit`, { anwesend }).subscribe({
      next: () => {
        this.ladeAdmin();
      },
    });
  }
```

`ladeAdmin` behält seinen bestehenden `this.aktionsFehler.set(null);` (Zeile 276) — Reset beim Reload bleibt korrekt.

- [ ] **Step 6: Test laufen lassen — muss grün sein**

Run: `npx jest teilnehmer --silent`
Expected: PASS (der umgestellte 409-Test grün; die übrigen bestehenden Tests unverändert grün).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/teilnehmer/teilnehmer.ts frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#166 Reaktivierungs-Fehler zeilenbezogen im State (meldungId + text)"
```

---

### Task 2: „Andere Aktion räumt Fehler weg" absichern (`teilnehmer.spec.ts`)

**Files:**
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts`

**Interfaces:**
- Consumes: `component.reaktivieren`, `component.abmelden`, `component.fehlerFuer` (aus Task 1).

- [ ] **Step 1: Test schreiben (failing-first-Check)**

Neuen Test direkt nach dem 409-Test einfügen. Nach einem 409 auf id 5 löst `abmelden(5)` eine andere Aktion aus und muss den Fehler entfernen:

```ts
it('räumt den Zeilen-Fehler weg, sobald eine andere Aktion startet', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

  component.reaktivieren(5);
  httpTesting
    .expectOne('/api/admin/anmeldung/5/reaktivieren')
    .flush(
      { status: 409, message: 'Teamname ist in dieser Disziplin bereits vergeben: Team A' },
      { status: 409, statusText: 'Conflict' },
    );
  expect(component.fehlerFuer(5)).toContain('bereits vergeben');

  // Andere Aktion (Abmelden) startet -> Fehler verschwindet sofort.
  component.abmelden(5);
  expect(component.fehlerFuer(5)).toBeNull();

  httpTesting.expectOne('/api/admin/anmeldung/5/abmelden').flush(null);
  httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
});
```

- [ ] **Step 2: Test laufen lassen — muss grün sein**

Run: `npx jest teilnehmer --silent`
Expected: PASS (Task 1 hat `aktionBeginnen()` bereits in `abmelden` verdrahtet).

Falls FAIL: prüfen, dass `abmelden` mit `this.aktionBeginnen();` beginnt (Task 1, Step 5).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#166 Test: andere Aktion räumt zeilenbezogenen Fehler weg"
```

---

### Task 3: Template — Banner in die Zeile verschieben (`teilnehmer.html`)

**Files:**
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.html`
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts`

**Interfaces:**
- Consumes: `fehlerFuer(meldung.id)` (Task 1).

- [ ] **Step 1: DOM-Test schreiben (failing)**

Neuen Test hinzufügen, der prüft: nach 409 an id 5 erscheint genau ein `.team-block-fehler` im betroffenen Block und **kein** globales `.alert-error` oberhalb der Gruppen. Der Test klickt nicht, sondern setzt den Zustand über die Component-Methode und rendert:

```ts
it('rendert den Reaktivierungs-Fehler in der Zeile, nicht global', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);

  component.reaktivieren(5);
  httpTesting
    .expectOne('/api/admin/anmeldung/5/reaktivieren')
    .flush(
      { status: 409, message: 'Teamname ist in dieser Disziplin bereits vergeben: Team A' },
      { status: 409, statusText: 'Conflict' },
    );
  fixture.detectChanges();

  const element = fixture.nativeElement as HTMLElement;
  const zeilenFehler = element.querySelectorAll('.team-block-fehler');
  expect(zeilenFehler).toHaveLength(1);
  expect(zeilenFehler[0].textContent).toContain('bereits vergeben');
});
```

> Hinweis für die Umsetzung: In `adminResponse` muss eine abgemeldete Meldung mit `id: 5` existieren, damit der „Reaktivieren"-Block gerendert wird. Falls die vorhandene `adminResponse`-Fixture das nicht hergibt, im Test eine eigene Response mit `{ id: 5, abgemeldet: true, ... }` flushen statt `adminResponse` (analog zu den Sortier-Tests ab Zeile 448). Vorhandene Fixture zuerst prüfen und den kleineren Eingriff wählen.

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx jest teilnehmer --silent`
Expected: FAIL — `.team-block-fehler` wird (noch) nicht gerendert, `toHaveLength(1)` scheitert mit 0.

- [ ] **Step 3: Globales Banner entfernen**

In `teilnehmer.html` den Block (aktuell Zeile 20–22) löschen:

```html
      @if (aktionsFehler(); as meldung) {
        <div class="alert-error" role="alert">{{ meldung }}</div>
      }
```

- [ ] **Step 4: Zeilenbezogenen Fehler im `team-block` rendern**

Im `@for (meldung of gruppe.meldungen; ...)`-Block, unmittelbar **nach** dem schließenden `</div>` des `team-head` und **vor** der `<ul class="admin-list">`, einfügen:

```html
                @if (fehlerFuer(meldung.id); as fehler) {
                  <div class="team-block-fehler alert-error" role="alert">{{ fehler }}</div>
                }
```

- [ ] **Step 5: Test laufen lassen — muss grün sein**

Run: `npx jest teilnehmer --silent`
Expected: PASS.

- [ ] **Step 6: SCSS-Abstand ergänzen**

In `teilnehmer.scss`, nach dem `.team-head-actions`-Block (~Zeile 326), einfügen:

```scss
.team-block-fehler {
  margin: 0 0.35rem 0.5rem;
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/teilnehmer/teilnehmer.html frontend/src/app/pages/teilnehmer/teilnehmer.scss frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#166 Fehler an der betroffenen Zeile statt globalem Banner rendern"
```

---

### Task 4: Volle Frontend-Gate + Abschluss

**Files:** keine Änderung (Verifikation).

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: keine Fehler.

- [ ] **Step 2: Alle Tests**

Run: `npm test`
Expected: alle Suites grün, insbesondere `teilnehmer.spec.ts`.

- [ ] **Step 3: Format-Check**

Run: `npm run format:check`
Expected: „All matched files use Prettier code style!". Bei Abweichung `npm run format` ausführen und die formatierten Dateien als eigenen Commit nachziehen.

- [ ] **Step 4: PR erstellen (Branch bereits vorhanden)**

Body enthält englisches Auto-Close-Keyword:

```bash
gh pr create --base main --title "#166 Reaktivierungs-Fehler an der Zeile statt globalem Banner" --body "$(cat <<'EOF'
Nachbesserung zu #152: der 409-Fehler beim Reaktivieren (Teamname-Dublette) erscheint jetzt an der betroffenen Meldungs-Zeile statt als globalem Banner oben. Jede weitere Admin-Aktion räumt den Fehler weg. Backend unverändert.

Closes #166

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

> Der Agent merged **nicht** selbst — PR bleibt für Nick zum Review.

---

## Self-Review

**Spec coverage (AK aus #166):**
- „Fehler an der betroffenen Meldung/Zeile, nicht global oben" → Task 1 (State) + Task 3 (Template/DOM-Test). ✅
- „Fehler verschwindet bei erneutem Versuch oder anderer Aktion" → `aktionBeginnen()` in allen drei Aktionen (Task 1, Step 5) + Test in Task 2. ✅
- „Fachliche Server-Meldung bleibt sichtbar" → `fehlerMeldung(err)` unverändert übernommen, Text im `{ meldungId, text }` gespeichert und gerendert (Task 1/3). ✅
- „Bestehende Tests angepasst (`teilnehmer.spec.ts`)" → Task 1 stellt den 409-Test um; Task 2/3 ergänzen. ✅
- „Reiner Frontend-Fix, Backend unverändert" → Global Constraints + keine Backend-Dateien im File-Structure. ✅

**Placeholder scan:** keine TBD/TODO; alle Code-Steps enthalten vollständigen Code. ✅

**Type consistency:** `AktionsFehler { meldungId; text }`, `aktionsFehler` (Signal), `fehlerFuer(meldungId)`, `aktionBeginnen()` durchgängig gleich benannt in Tasks 1–3. Template nutzt `fehlerFuer(meldung.id)` mit `AdminMeldungEintrag.id: number`. ✅
