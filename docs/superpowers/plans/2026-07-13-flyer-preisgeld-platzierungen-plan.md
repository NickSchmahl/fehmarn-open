# Flyer: Preisgeld-Tabelle um vollständige Platzierungen ergänzen (#193)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Flyer-Seite zeigt je Disziplin die vollständigen Preisgelder (Platz 2 bis 13./16.) statt nur „1. Platz" – im Querformat als statische Zusatzzeilen, im Hochformat als aufklappbares Accordion je Disziplin.

**Architecture:** Die Preisgelddaten wandern strukturiert (`weiterePlaetze: { label; wert }[]`) in `flyer-zeitplan.ts`. Das Querformat rendert je Platzierungs-Label eine zusätzliche statische Tabellenzeile. Das Hochformat macht jede Disziplin-Zeile zu einem Accordion, dessen Offen-Zustand pro Disziplin im Component-Signal gehalten wird. Bestehende Design-Tokens und ARIA-Struktur bleiben erhalten.

**Tech Stack:** Angular (standalone Component, Signals, `@for`/`@if`), SCSS, Karma/Jasmine Component-Tests.

## Global Constraints

- Design-Tokens ausschließlich aus `flyer.scss` (`--accent`, `--surface-2`, `--text-muted`, `--radius` …) – kein neues Farbschema, keine Hex-Werte aus den Mockups.
- ARIA-Struktur `role="table"`/`role="row"`/`role="cell"` beibehalten; klickbare Zeile bekommt `aria-expanded`, Chevron ist `aria-hidden`.
- Toggle-State pro Disziplin (keyed by `zeile.value`), nicht global.
- Klick-Interaktion in Tests über echten DOM-Klick, nicht per direktem Methodenaufruf (Projekt-Konvention).
- Echte Umlaute (ä/ö/ü/ß) auch in Kommentaren.
- Vor Commit volles Frontend-Gate lokal: `npm run lint && npm test && npm run format:check` (im `frontend/`-Verzeichnis); `nativeElement as HTMLElement` casten.
- Reale Preisgelddaten je Disziplin (aus Ticket / Mockup `renderVals`):

| Disziplin | 2. | 3. | 4. | 5./6. | 7./8. | 9./12. | 13./16. |
|---|---|---|---|---|---|---|---|
| Teamwettbewerb | 700 € | 500 € | 300 € | 150 € | 100 € | – | – |
| Herreneinzel | 600 € | 400 € | 280 € | 125 € | 100 € | 75 € | 40 € |
| Dameneinzel | 200 € | 150 € | 100 € | 75 € | 50 € | – | – |
| U18-Turnier | – | – | – | – | – | – | – |
| Triple Mix | 550 € | 400 € | 300 € | 200 € | 150 € | – | – |
| Herrendoppel | 400 € | 300 € | 200 € | 150 € | 100 € | – | – |
| Damendoppel | 250 € | 150 € | 100 € | 75 € | – | – | – |

---

### Task 1: Preisgelddaten strukturiert in `flyer-zeitplan.ts`

**Files:**
- Modify: `frontend/src/app/shared/flyer-zeitplan.ts`

**Interfaces:**
- Produces:
  - `interface Preisplatzierung { label: string; wert: string }`
  - `WEITERE_PLATZ_LABELS: readonly string[]` = `['2.', '3.', '4.', '5./6.', '7./8.', '9./12.', '13./16.']`
  - `FlyerZeitplanEintrag.weiterePlaetze: Preisplatzierung[]` und `FlyerZeile.weiterePlaetze: Preisplatzierung[]` (nur real existierende Platzierungen, leere weggefiltert).

- [ ] **Step 1: Typ, Label-Konstante und Builder ergänzen**

In `flyer-zeitplan.ts` oberhalb von `FlyerZeitplanEintrag` einfügen:

```ts
export interface Preisplatzierung {
  label: string;
  wert: string;
}

// Platzierungs-Labels der weiteren Plätze (Platz 1 steht separat in ersterPlatz).
// Reihenfolge = Zeilen-/Spaltenreihenfolge auf dem Flyer.
export const WEITERE_PLATZ_LABELS = [
  '2.',
  '3.',
  '4.',
  '5./6.',
  '7./8.',
  '9./12.',
  '13./16.',
] as const;

// Baut die weiteren Platzierungen positionsweise passend zu WEITERE_PLATZ_LABELS
// und lässt nicht besetzte (leere) Plätze weg.
function weiterePlaetze(...werte: string[]): Preisplatzierung[] {
  return WEITERE_PLATZ_LABELS.map((label, index) => ({
    label,
    wert: werte[index] ?? '',
  })).filter((platz) => platz.wert !== '');
}
```

- [ ] **Step 2: `weiterePlaetze` zum Interface hinzufügen**

Das `FlyerZeitplanEintrag`-Interface um ein Feld ergänzen (nach `ersterPlatz`):

```ts
export interface FlyerZeitplanEintrag {
  disziplin: Disziplin;
  tag: string;
  spielmodus: string;
  anmeldeschluss: string;
  turnierbeginn: string;
  ersterPlatz: string;
  weiterePlaetze: Preisplatzierung[];
}
```

Und `FlyerZeile` (erweitert `DisziplinMeta`) analog um `weiterePlaetze: Preisplatzierung[]`:

```ts
export interface FlyerZeile extends DisziplinMeta {
  tag: string;
  spielmodus: string;
  anmeldeschluss: string;
  turnierbeginn: string;
  ersterPlatz: string;
  weiterePlaetze: Preisplatzierung[];
}
```

- [ ] **Step 3: Jede FLYER_ZEITPLAN-Zeile um `weiterePlaetze` ergänzen**

Je Eintrag nach `ersterPlatz` einfügen (Werte aus der Tabelle in „Global Constraints"):

```ts
// TEAMWETTBEWERB
weiterePlaetze: weiterePlaetze('700 €', '500 €', '300 €', '150 €', '100 €'),
// HERRENEINZEL
weiterePlaetze: weiterePlaetze('600 €', '400 €', '280 €', '125 €', '100 €', '75 €', '40 €'),
// DAMENEINZEL
weiterePlaetze: weiterePlaetze('200 €', '150 €', '100 €', '75 €', '50 €'),
// U18
weiterePlaetze: weiterePlaetze(),
// TRIPLE_MIX
weiterePlaetze: weiterePlaetze('550 €', '400 €', '300 €', '200 €', '150 €'),
// HERRENDOPPEL
weiterePlaetze: weiterePlaetze('400 €', '300 €', '200 €', '150 €', '100 €'),
// DAMENDOPPEL
weiterePlaetze: weiterePlaetze('250 €', '150 €', '100 €', '75 €'),
```

- [ ] **Step 4: Datei-Kopfkommentar aktualisieren**

Im einleitenden Kommentar (Zeilen 1–4) „und 1.-Platz-Preisgeld" ersetzen durch „und Preisgelder (1. Platz + weitere Platzierungen)".

- [ ] **Step 5: Lint/Format prüfen**

Run: `cd frontend && npx eslint src/app/shared/flyer-zeitplan.ts && npx prettier --check src/app/shared/flyer-zeitplan.ts`
Expected: keine Fehler.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/shared/flyer-zeitplan.ts
git commit -m "$(cat <<'EOF'
#193 Weitere Preisgeld-Platzierungen strukturiert im Flyer-Zeitplan hinterlegen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Component-Logik – Accordion-State und Lookups

**Files:**
- Modify: `frontend/src/app/pages/flyer/flyer.ts`
- Test: `frontend/src/app/pages/flyer/flyer.spec.ts`

**Interfaces:**
- Consumes: `FlyerZeile`, `WEITERE_PLATZ_LABELS` aus Task 1.
- Produces (auf `Flyer`):
  - `readonly weitereLabels: readonly string[]`
  - `preisFuer(zeile: FlyerZeile, label: string): string` – Wert der Platzierung oder `''`.
  - `istOffen(zeile: FlyerZeile): boolean`
  - `umschalten(zeile: FlyerZeile): void` – no-op wenn `weiterePlaetze` leer.

- [ ] **Step 1: Failing-Tests für die Component-Logik schreiben**

In `flyer.spec.ts` innerhalb des bestehenden `describe('Flyer', …)` ergänzen:

```ts
it('liefert Werte weiterer Platzierungen über preisFuer und leer bei fehlenden', () => {
  const team = component.zeilen.find((z) => z.value === 'TEAMWETTBEWERB')!;
  expect(component.preisFuer(team, '2.')).toBe('700 €');
  expect(component.preisFuer(team, '13./16.')).toBe(''); // Team hat keinen 13./16.
});

it('umschalten öffnet und schließt eine Disziplin unabhängig', () => {
  const team = component.zeilen.find((z) => z.value === 'TEAMWETTBEWERB')!;
  const herren = component.zeilen.find((z) => z.value === 'HERRENEINZEL')!;
  expect(component.istOffen(team)).toBe(false);
  component.umschalten(team);
  expect(component.istOffen(team)).toBe(true);
  expect(component.istOffen(herren)).toBe(false); // nur team offen
  component.umschalten(team);
  expect(component.istOffen(team)).toBe(false);
});

it('umschalten ist wirkungslos für Disziplinen ohne weitere Plätze', () => {
  const u18 = component.zeilen.find((z) => z.value === 'U18')!;
  component.umschalten(u18);
  expect(component.istOffen(u18)).toBe(false);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: FAIL – `preisFuer`/`umschalten`/`istOffen` sind keine Funktionen auf `component`.

- [ ] **Step 3: Component implementieren**

`flyer.ts` ersetzen durch:

```ts
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';
import { Disziplin } from '../../shared/disziplin';
import {
  FLYER_TURNIER,
  FlyerZeile,
  flyerZeilen,
  WEITERE_PLATZ_LABELS,
} from '../../shared/flyer-zeitplan';

@Component({
  selector: 'app-flyer',
  imports: [RouterLink, BrandIconComponent],
  templateUrl: './flyer.html',
  styleUrl: './flyer.scss',
})
export class Flyer {
  readonly turnier = FLYER_TURNIER;
  readonly zeilen: FlyerZeile[] = flyerZeilen();
  readonly weitereLabels = WEITERE_PLATZ_LABELS;

  // Offen-Zustand je Disziplin für das Hochformat-Accordion – bewusst pro Zeile,
  // damit sich mehrere Disziplinen unabhängig auf-/zuklappen lassen.
  private readonly offeneDisziplinen = signal<ReadonlySet<Disziplin>>(new Set());

  preisFuer(zeile: FlyerZeile, label: string): string {
    return zeile.weiterePlaetze.find((platz) => platz.label === label)?.wert ?? '';
  }

  istOffen(zeile: FlyerZeile): boolean {
    return this.offeneDisziplinen().has(zeile.value);
  }

  umschalten(zeile: FlyerZeile): void {
    // Zeilen ohne weitere Platzierungen (z. B. U18) sind nicht aufklappbar.
    if (zeile.weiterePlaetze.length === 0) {
      return;
    }
    this.offeneDisziplinen.update((offen) => {
      const naechste = new Set(offen);
      if (naechste.has(zeile.value)) {
        naechste.delete(zeile.value);
      } else {
        naechste.add(zeile.value);
      }
      return naechste;
    });
  }
}
```

- [ ] **Step 4: Tests laufen lassen, grün bestätigen**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS (alle Flyer-Tests inkl. der neuen Logik-Tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/flyer/flyer.ts frontend/src/app/pages/flyer/flyer.spec.ts
git commit -m "$(cat <<'EOF'
#193 Flyer-Component um Preis-Lookup und Accordion-State ergänzen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Querformat/Desktop – statische Zusatzzeilen

**Files:**
- Modify: `frontend/src/app/pages/flyer/flyer.html`
- Modify: `frontend/src/app/pages/flyer/flyer.scss:178` (`grid-template-rows`)
- Test: `frontend/src/app/pages/flyer/flyer.spec.ts`

**Interfaces:**
- Consumes: `weitereLabels`, `preisFuer` aus Task 2.

- [ ] **Step 1: Failing-Test für Desktop-Zeilen schreiben**

In `flyer.spec.ts` ergänzen:

```ts
it('zeigt im Querformat je weiterer Platzierung eine Tabellenzeile mit Werten', () => {
  const quer = (fixture.nativeElement as HTMLElement).querySelector(
    '.flyer-quer',
  ) as HTMLElement;
  const rowheader = Array.from(quer.querySelectorAll('.flyer-tabelle-label')).map(
    (el) => el.textContent?.trim(),
  );
  expect(rowheader).toContain('2. Platz');
  expect(rowheader).toContain('13./16. Platz');
  // Team = 700 € auf Platz 2, Herreneinzel = 40 € auf Platz 13./16.
  expect(quer.textContent).toContain('700 €');
  expect(quer.textContent).toContain('40 €');
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: FAIL – „2. Platz"/„13./16. Platz" noch nicht im DOM.

- [ ] **Step 3: Zusatzzeilen ins Querformat-Template einfügen**

In `flyer.html` direkt nach der schließenden `</div>` der Gold-Zeile („1. Platz", endet Zeile 68) und **vor** der „Startgeld p. P."-Zeile einfügen:

```html
@for (label of weitereLabels; track label) {
  <div class="flyer-tabelle-zeile" role="row">
    <span class="flyer-tabelle-zelle flyer-tabelle-label" role="rowheader"
      >{{ label }} Platz</span
    >
    @for (zeile of zeilen; track zeile.value) {
      <span class="flyer-tabelle-zelle" role="cell">{{ preisFuer(zeile, label) }}</span>
    }
  </div>
}
```

- [ ] **Step 4: Grid-Zeilenanzahl in SCSS anpassen**

In `flyer.scss` `.flyer-tabelle` `grid-template-rows: repeat(7, 1fr);` → `grid-template-rows: repeat(14, 1fr);` (7 Bestandszeilen + 7 neue Platzierungszeilen).

- [ ] **Step 5: Test laufen lassen, grün bestätigen**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 6: Visuell prüfen (Querformat)**

Dev-Server starten und `/flyer` bei Desktop-Breite (>720px) öffnen. Prüfen: 7 neue Zeilen (2. … 13./16. Platz) erscheinen zwischen „1. Platz" und „Startgeld p. P."; leere Zellen bei fehlenden Platzierungen; Tabelle nicht überquellend. Falls Zeilen zu gedrängt: `.flyer-quer` `aspect-ratio` entfernen bzw. durch `min-height` ersetzen (nur bei Bedarf).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/flyer/flyer.html frontend/src/app/pages/flyer/flyer.scss frontend/src/app/pages/flyer/flyer.spec.ts
git commit -m "$(cat <<'EOF'
#193 Querformat-Tabelle um statische Zeilen je weiterer Platzierung ergänzen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Hochformat/Mobil – Accordion je Disziplin

**Files:**
- Modify: `frontend/src/app/pages/flyer/flyer.html`
- Modify: `frontend/src/app/pages/flyer/flyer.scss` (Hochformat-Block)
- Test: `frontend/src/app/pages/flyer/flyer.spec.ts`

**Interfaces:**
- Consumes: `istOffen`, `umschalten` aus Task 2.

- [ ] **Step 1: Failing-Tests für das Accordion schreiben (echter DOM-Klick)**

In `flyer.spec.ts` ergänzen:

```ts
it('klappt eine Hochformat-Zeile per Klick auf und wieder zu', () => {
  const el = fixture.nativeElement as HTMLElement;
  const teamZeile = el.querySelector(
    '.flyer-hoch-liste [data-disziplin="TEAMWETTBEWERB"] .flyer-hoch-zeile',
  ) as HTMLElement;
  const container = el.querySelector(
    '.flyer-hoch-liste [data-disziplin="TEAMWETTBEWERB"]',
  ) as HTMLElement;

  // eingeklappt: keine weiteren Plätze im DOM, aria-expanded=false
  expect(container.querySelector('.flyer-hoch-weitere')).toBeNull();
  expect(teamZeile.getAttribute('aria-expanded')).toBe('false');

  teamZeile.click();
  fixture.detectChanges();
  const weitere = container.querySelector('.flyer-hoch-weitere') as HTMLElement;
  expect(weitere).not.toBeNull();
  expect(weitere.textContent).toContain('2. Platz');
  expect(weitere.textContent).toContain('700 €');
  expect(teamZeile.getAttribute('aria-expanded')).toBe('true');

  teamZeile.click();
  fixture.detectChanges();
  expect(container.querySelector('.flyer-hoch-weitere')).toBeNull();
  expect(teamZeile.getAttribute('aria-expanded')).toBe('false');
});

it('macht Disziplinen ohne weitere Plätze nicht klickbar (U18)', () => {
  const el = fixture.nativeElement as HTMLElement;
  const u18Zeile = el.querySelector(
    '.flyer-hoch-liste [data-disziplin="U18"] .flyer-hoch-zeile',
  ) as HTMLElement;
  expect(u18Zeile.hasAttribute('aria-expanded')).toBe(false);
  expect(u18Zeile.querySelector('.flyer-hoch-chevron')).toBeNull();
  u18Zeile.click();
  fixture.detectChanges();
  expect(
    el.querySelector('.flyer-hoch-liste [data-disziplin="U18"] .flyer-hoch-weitere'),
  ).toBeNull();
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag bestätigen**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: FAIL – `[data-disziplin]`/`.flyer-hoch-weitere` existieren noch nicht.

- [ ] **Step 3: Hochformat-Liste zum Accordion umbauen**

In `flyer.html` den `@for (zeile of zeilen; …)`-Block der Hochformat-Liste (aktuell Zeilen 126–133) ersetzen durch:

```html
@for (zeile of zeilen; track zeile.value) {
  <div
    class="flyer-hoch-item"
    [class.flyer-hoch-item--offen]="istOffen(zeile)"
    [attr.data-disziplin]="zeile.value"
  >
    <div
      class="flyer-hoch-zeile"
      [class.flyer-hoch-zeile--klickbar]="zeile.weiterePlaetze.length"
      role="row"
      [attr.tabindex]="zeile.weiterePlaetze.length ? 0 : null"
      [attr.aria-expanded]="zeile.weiterePlaetze.length ? istOffen(zeile) : null"
      (click)="umschalten(zeile)"
      (keydown.enter)="umschalten(zeile); $event.preventDefault()"
      (keydown.space)="umschalten(zeile); $event.preventDefault()"
    >
      <span class="flyer-hoch-name" role="cell">{{ zeile.label }}</span>
      <span role="cell">{{ zeile.tag }}</span>
      <span role="cell">{{ zeile.turnierbeginn }}</span>
      <span class="flyer-hoch-preis" role="cell">{{ zeile.ersterPlatz }}</span>
      @if (zeile.weiterePlaetze.length) {
        <span class="flyer-hoch-chevron" aria-hidden="true">⌄</span>
      }
    </div>
    @if (istOffen(zeile)) {
      <div class="flyer-hoch-weitere">
        @for (platz of zeile.weiterePlaetze; track platz.label) {
          <div class="flyer-hoch-weitere-zeile">
            <span>{{ platz.label }} Platz</span>
            <span class="flyer-hoch-weitere-wert">{{ platz.wert }}</span>
          </div>
        }
      </div>
    }
  </div>
}
```

- [ ] **Step 4: Hochformat-SCSS ergänzen**

In `flyer.scss`:
- `.flyer-hoch-zeile` `grid-template-columns: 1.5fr 0.9fr 0.8fr 0.8fr;` → `1.5fr 0.9fr 0.8fr 0.8fr 16px;` (Chevron-Spalte; Kopfzeile bleibt ausgerichtet, 5. Spalte dort leer).
- Nach dem `.flyer-hoch-preis`-Block ergänzen:

```scss
.flyer-hoch-item {
  border-radius: var(--radius);
  transition: background 0.15s;
}

.flyer-hoch-item--offen {
  background: var(--surface-2);
}

.flyer-hoch-zeile--klickbar {
  cursor: pointer;
}

.flyer-hoch-chevron {
  justify-self: end;
  font-size: 0.85rem;
  color: var(--text-muted);
  transition:
    transform 0.15s,
    color 0.15s;
}

.flyer-hoch-item--offen .flyer-hoch-chevron {
  transform: rotate(180deg);
  color: var(--accent);
}

.flyer-hoch-weitere {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0 0.5rem 0.65rem;
}

.flyer-hoch-weitere-zeile {
  display: flex;
  justify-content: flex-end;
  gap: 1.25rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.flyer-hoch-weitere-wert {
  font-weight: 700;
  color: var(--accent);
}
```

- [ ] **Step 5: Tests laufen lassen, grün bestätigen**

Run: `cd frontend && npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 6: Visuell prüfen (Hochformat)**

`/flyer` bei Mobil-Breite (≤720px, z. B. 375px) öffnen. Prüfen: Klick/Tap auf eine Disziplin-Zeile klappt die weiteren Plätze auf/zu; Chevron rotiert und wird golden; geöffnete Karte hat dezenten `--surface-2`-Hintergrund; U18 ohne Chevron und nicht klickbar.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/flyer/flyer.html frontend/src/app/pages/flyer/flyer.scss frontend/src/app/pages/flyer/flyer.spec.ts
git commit -m "$(cat <<'EOF'
#193 Hochformat-Zeilen als Accordion mit weiteren Platzierungen umsetzen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Gesamt-Gate und Abschluss

**Files:** keine (Verifikation).

- [ ] **Step 1: Volles Frontend-Gate lokal**

Run: `cd frontend && npm run lint && npm test -- --watch=false --browsers=ChromeHeadless && npm run format:check`
Expected: lint sauber, alle Tests grün, format:check ohne Abweichung.

- [ ] **Step 2: Doku prüfen**

Prüfen, ob eine Flyer-/Feature-Doku existiert, die die „nur 1. Platz"-Darstellung beschreibt (`grep -ri "1. Platz\|flyer" docs/`). Falls ja: um die vollständige Platzierungs-Tabelle + Accordion aktualisieren; falls nein: kein Doku-Änderungsbedarf.

- [ ] **Step 3: PR erstellen (Agent merged nicht selbst)**

Branch pushen und PR gegen `main` öffnen, Body mit englischem `Closes #193`.

## Self-Review

- **Spec coverage:** AK „flyer-zeitplan.ts ergänzen" → Task 1; „Querformat statische Zeilen" → Task 3; „Hochformat Accordion" → Task 4; „Toggle-State pro Disziplin" → Task 2 (Signal keyed by `value`); „Design-Tokens beibehalten" → Task 3/4 (nur `var(--…)`); „ARIA/aria-expanded/Chevron aria-hidden" → Task 4; „Component-Tests (Desktop-Zeilen + Auf-/Zuklappen + nicht klickbar, echter DOM-Klick)" → Tasks 2–4. Alle AK abgedeckt.
- **Placeholder scan:** keine TBD/TODO; alle Code-Blöcke vollständig.
- **Type consistency:** `Preisplatzierung`, `weiterePlaetze`, `WEITERE_PLATZ_LABELS`, `preisFuer`/`istOffen`/`umschalten` durchgängig identisch benannt zwischen Tasks 1/2/3/4.
