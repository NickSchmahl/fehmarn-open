# Anmeldung Responsive-Bruch 480–620px (#194) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Im Viewportbereich ~480–620px keine abgeschnittenen/herausragenden Inhalte mehr; die Breakpoints der äußeren Disziplin-Grid und der inneren Spielerfelder werden über auto-fit + Container Queries inhärent abgestimmt.

**Architecture:** Reines SCSS in `anmeldung.component.scss`. (A) `.disziplin-grid` von fixem Zwei-Spalten-Layout + 480px-Media-Query auf das „RAM"-Pattern `repeat(auto-fit, minmax(min(260px, 100%), 1fr))` umstellen. (B) `.disziplin-card` als Query-Container (`container: disziplin / inline-size`) deklarieren und die beiden Viewport-`@media`-Blöcke der Spielerfelder durch `@container disziplin`-Queries ersetzen. Kein Template-, Logik- oder Test-Code betroffen.

**Tech Stack:** Angular (Standalone Component, komponenten-scoped SCSS), CSS Grid, CSS Container Queries (Browser-Baseline seit 2023).

## Global Constraints

- Datei: `frontend/src/app/pages/anmeldung/anmeldung.component.scss` (einzige Änderung).
- Keine Änderung an `anmeldung.component.html`, `.ts` oder `.spec.ts`.
- Echte Umlaute (ä/ö/ü/ß) in Kommentaren verwenden, nicht ae/oe/ue.
- Kommentare auf Deutsch, passend zum bestehenden Stil der Datei.
- Vor dem Commit volle lokale Quality-Gate im Verzeichnis `frontend`: `npm run lint`, `npm run test`, `npm run format:check`.
- Kein `git add -A`; nur die konkret geänderte Datei stagen.
- PR-Body später mit englischem `Closes #194`.

---

### Task 1: Breakpoints abstimmen (auto-fit-Grid + Container Queries)

**Files:**
- Modify: `frontend/src/app/pages/anmeldung/anmeldung.component.scss` (`.disziplin-grid` ~174–188, `.disziplin-card` ~190–213, `.spieler-felder`-Media-Queries ~351–363)

**Interfaces:**
- Consumes: bestehende Klassen `.disziplin-grid`, `.disziplin-card`, `.disziplin-card--selected`, `.spieler-felder`, `.spieler-felder--split` (Markup unverändert).
- Produces: nur CSS-Verhalten; keine neuen Selektoren/Signaturen für andere Tasks.

- [ ] **Step 1: `.disziplin-grid` auf auto-fit umstellen und die 480px-Media-Query entfernen**

`.disziplin-grid`-Regel ersetzen durch:

```scss
.disziplin-grid {
  display: grid;
  /* „RAM"-Pattern: so viele Spalten wie mit je >= 260px Platz haben, sonst
     automatisch einspaltig. Der Umschaltpunkt liegt so bei ~620px Viewport –
     genau dort, wo die Preis-Badge sonst aus der 50%-Kachel lief.
     min(260px, 100%) verhindert Ueberlauf auf sehr schmalen Viewports. */
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 0.625rem;
  align-items: start;

  /* Gewaehlte Disziplinen klappen Spielerzeilen aus und nehmen die volle Breite ein. */
  .disziplin-card--selected {
    grid-column: 1 / -1;
  }
}
```

(Die bisherige `@media (max-width: 480px) { grid-template-columns: 1fr; }` entfaellt ersatzlos.)

- [ ] **Step 2: `.disziplin-card` zum Query-Container machen**

In der `.disziplin-card`-Regel als erste Deklaration ergänzen:

```scss
.disziplin-card {
  /* Query-Container: die inneren Spielerfelder richten sich nach der echten
     Kachelbreite statt nach der Viewportbreite (siehe @container unten). */
  container: disziplin / inline-size;
  background: var(--surface-2);
  /* … restliche bestehende Deklarationen unveraendert … */
}
```

- [ ] **Step 3: Viewport-Media-Queries der Spielerfelder durch Container Queries ersetzen**

Die beiden Blöcke `@media (max-width: 760px)` und `@media (max-width: 520px)` für `.spieler-felder` / `--split` ersetzen durch:

```scss
/* Zwei Felder pro Zeile, sobald die Kachel schmaler als ~660px wird
   (entspricht ~760px Viewport minus Page-/Card-Padding). */
@container disziplin (max-width: 660px) {
  .spieler-felder,
  .spieler-felder--split {
    grid-template-columns: 1fr 1fr;
  }
}

/* Ein Feld pro Zeile, sobald die Kachel schmaler als ~420px wird
   (entspricht ~520px Viewport minus Page-/Card-Padding). */
@container disziplin (max-width: 420px) {
  .spieler-felder,
  .spieler-felder--split {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Quality-Gate lokal ausführen**

Run: `cd frontend && npm run lint && npm run test && npm run format:check`
Expected: alle drei grün (keine Lint-/Test-/Format-Fehler). `format:check` prüft u. a. die geänderte SCSS-Datei; ggf. vorher `npm run format` und erneut prüfen.

- [ ] **Step 5: Visuelle Verifikation im Browser (Responsive-Modus)**

Frontend starten und die Anmeldung-Seite im Responsive-Modus prüfen (Testfälle aus #194):
- Viewport schrittweise 400 → 800px: an keiner Stelle abgeschnittener/herausragender Text (Preis-Badges, Kachel-Überschriften).
- Gewählte Kachel (z. B. Herreneinzel) bei 500px und 600px: Vorname/Nachname/Radikal-ID vollständig lesbar, sauber umgebrochen.
- Übergänge < 480px, 480–620px, 620–760px, > 760px ohne Regression.
- Pixel-Schwellen (260/660/420px) bei Bedarf anhand des Bildes feinjustieren und Gate erneut laufen lassen.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/pages/anmeldung/anmeldung.component.scss
git commit -m "#194 Anmeldung: Responsive-Bruch 480-620px behoben (auto-fit + Container Queries)"
```

## Self-Review

- **Spec coverage:** AK1 (kein Überlauf 480–620px) → Step 1 (auto-fit) + Step 3 (Container Queries); AK2 (abgestimmte, containerbasierte Breakpoints) → Steps 2–3; AK3 (keine Regression in allen Bereichen) → Step 5. Alle Akzeptanzkriterien abgedeckt.
- **Placeholder scan:** keine TBD/TODO; konkrete Werte und Kommentare vorhanden.
- **Type consistency:** Container-Name `disziplin` konsistent in `container:`-Deklaration (Step 2) und beiden `@container disziplin`-Queries (Step 3).
