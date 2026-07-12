# Fehmarn-Insel-Marke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die generischen CSS-Marken (Header-Dartscheibe, Login-Bullseye) und das Favicon durch eine einheitliche Fehmarn-Insel-Bildmarke mit goldenem Bullseye-Punkt ersetzen.

**Architecture:** Eine geteilte, zustandslose Angular-Standalone-Präsentationskomponente `BrandIconComponent` (`app-brand-icon`) rendert das Inline-SVG. Header und Login binden sie ein und steuern die Größe per CSS. Das Favicon nutzt eine eigenständige `favicon.svg` mit demselben Motiv.

**Tech Stack:** Angular (Standalone Components), TypeScript, SCSS/CSS, Jasmine + Karma (`npm test`), ESLint (`npm run lint`), Prettier (`npm run format:check`).

## Global Constraints

- Sprache/Umlaute: echte Umlaute `ä/ö/ü/ß` in Kommentaren und Copy, nie `ae/oe/ue`.
- Self-contained: SVG inline in der Komponente bzw. lokale `favicon.svg` — kein CDN/externes Asset.
- Angular-Tests: `fixture.nativeElement as HTMLElement` casten (ESLint `no-unsafe-*` bleibt scharf).
- Standalone-Components mit `standalone: true`, Selector-Präfix `app-` (vgl. `ui/toast`).
- A11y: Icon rein dekorativ → `<svg aria-hidden="true" focusable="false">`; die Zugänglichkeit trägt der umgebende Link/die Überschrift.
- Vor jedem PR volle CI-Gate lokal: `npm run lint && npm test && npm run format:check` (im `frontend/`).
- Git: kein `git add -A`, gezielt Dateien adden; kein force-push.
- Design-Tokens: Silhouette in `currentColor`, Bullseye-Punkt in `var(--accent)` (`#e8c547`).

---

### Task 1: `BrandIconComponent` (geteilte Bildmarke)

**Files:**
- Create: `frontend/src/app/ui/brand-icon/brand-icon.component.ts`
- Test: `frontend/src/app/ui/brand-icon/brand-icon.component.spec.ts`

**Interfaces:**
- Consumes: nichts.
- Produces: `BrandIconComponent` (Standalone), Selector `app-brand-icon`. Rendert genau ein `<svg>` mit `aria-hidden="true"`. Keine `@Input()`s. Größe wird vom Einbettungskontext per CSS gesetzt (`app-brand-icon { display:inline-flex } svg { width:100%; height:100% }` liegt in der Komponente).

- [ ] **Step 1: Failing Test schreiben**

`frontend/src/app/ui/brand-icon/brand-icon.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { BrandIconComponent } from './brand-icon.component';

describe('BrandIconComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandIconComponent],
    }).compileComponents();
  });

  it('rendert genau ein dekoratives SVG', () => {
    const fixture = TestBed.createComponent(BrandIconComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const svgs = element.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
    expect(svgs[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('enthält den Bullseye-Punkt in der Akzentfarbe', () => {
    const fixture = TestBed.createComponent(BrandIconComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const bullseye = element.querySelector('.brand-icon__bullseye');
    expect(bullseye).not.toBeNull();
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `Cannot find module './brand-icon.component'`.

- [ ] **Step 3: Komponente implementieren**

`frontend/src/app/ui/brand-icon/brand-icon.component.ts` (Template inline; stilisierte Fehmarn-Silhouette in `currentColor`, Bullseye-Punkt in `var(--accent)`. Der konkrete Pfad ist eine Näherung und darf beim visuellen Feinschliff angepasst werden — Struktur/Klassen bleiben):

```typescript
import { Component } from '@angular/core';

// Geteilte Bildmarke: stilisierte Fehmarn-Silhouette mit Bullseye-Punkt (Darts-Bezug).
// Rein dekorativ (aria-hidden); Größe steuert der Einbettungskontext per CSS.
@Component({
  selector: 'app-brand-icon',
  standalone: true,
  template: `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <path
        class="brand-icon__island"
        d="M8 34C6 26 14 20 22 19C30 18 34 12 42 13C52 14 58 22 56 30C55 37 48 41 44 45C39 50 34 52 26 51C17 50 10 43 8 34Z"
        fill="currentColor"
      />
      <circle class="brand-icon__ring" cx="34" cy="33" r="8" fill="none" stroke="var(--accent)" stroke-width="2" />
      <circle class="brand-icon__bullseye" cx="34" cy="33" r="3.5" fill="var(--accent)" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 100%;
        height: 100%;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class BrandIconComponent {}
```

- [ ] **Step 4: Test laufen lassen, Erfolg prüfen**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (beide `BrandIconComponent`-Specs grün).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/ui/brand-icon/brand-icon.component.ts frontend/src/app/ui/brand-icon/brand-icon.component.spec.ts
git commit -m "#156 BrandIconComponent: geteilte Fehmarn-Insel-Marke"
```

---

### Task 2: Header auf `app-brand-icon` umstellen

**Files:**
- Modify: `frontend/src/app/app.ts` (Import + `imports`-Array)
- Modify: `frontend/src/app/app.html:3-5` (`.brand-mark`-Span → Komponente)
- Modify: `frontend/src/app/app.scss:48-76` und `:202-205` (Dartscheiben-Styles entfernen, Box-Maße behalten)
- Modify: `frontend/src/app/app.spec.ts` (Smoke-Test)

**Interfaces:**
- Consumes: `BrandIconComponent` aus Task 1.
- Produces: Header rendert `app-brand-icon.brand-mark` innerhalb des Marken-Links; `aria-label="Fehmarn Open Startseite"` am Link bleibt unverändert.

- [ ] **Step 1: Failing Smoke-Test ergänzen**

In `frontend/src/app/app.spec.ts` innerhalb `describe('App', …)` ergänzen:

```typescript
  it('zeigt die Fehmarn-Bildmarke im Header-Link', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const mark = element.querySelector('.brand app-brand-icon');
    expect(mark).not.toBeNull();
    expect(element.querySelector('.brand-mark span')).toBeNull();
  });
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `.brand app-brand-icon` ist `null` (Marke noch nicht ersetzt).

- [ ] **Step 3: Template umstellen**

In `frontend/src/app/app.html` die Zeilen 3-5 ersetzen:

```html
    <app-brand-icon class="brand-mark" />
```

(ersetzt den kompletten `<span class="brand-mark" aria-hidden="true"><span></span></span>`-Block; der umschließende `<a class="brand" …>` bleibt).

- [ ] **Step 4: Komponente in `app.ts` importieren**

`frontend/src/app/app.ts` — Import ergänzen und in `imports` aufnehmen:

```typescript
import { BrandIconComponent } from './ui/brand-icon/brand-icon.component';
```

```typescript
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, BrandIconComponent],
```

- [ ] **Step 5: `app.scss` bereinigen**

In `frontend/src/app/app.scss` den `.brand-mark`-Block (Zeilen 48-65) ersetzen durch reine Box-Maße und den `.brand-mark span`-Block (Zeilen 67-76) **entfernen**:

```scss
.brand-mark {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  color: var(--text);
}
```

Im `@media (max-width: 720px)`-Block bleiben die `.brand-mark`-Maße (Zeilen 202-205) unverändert (34px).

- [ ] **Step 6: Tests laufen lassen, Erfolg prüfen**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (App-Specs inkl. neuem Smoke-Test grün).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/app.ts frontend/src/app/app.html frontend/src/app/app.scss frontend/src/app/app.spec.ts
git commit -m "#156 Header nutzt Fehmarn-Bildmarke statt CSS-Dartscheibe"
```

---

### Task 3: Login auf `app-brand-icon` umstellen

**Files:**
- Modify: `frontend/src/app/pages/login/login.component.ts` (Import + `imports`-Array)
- Modify: `frontend/src/app/pages/login/login.component.html:4-9` (`.bullseye`-Block → Komponente)
- Modify: `frontend/src/app/pages/login/login.component.css:83-135` (Bullseye-/Ring-/Keyframe-Styles entfernen, `.brand-logo` ergänzen)
- Modify: `frontend/src/app/pages/login/login.component.spec.ts` (Smoke-Test)

**Interfaces:**
- Consumes: `BrandIconComponent` aus Task 1.
- Produces: Login-Header rendert `app-brand-icon.brand-logo`; die pulsierende Ring-Animation entfällt ersatzlos.

- [ ] **Step 1: Failing Smoke-Test ergänzen**

In `frontend/src/app/pages/login/login.component.spec.ts` innerhalb des bestehenden `describe`-Blocks ergänzen (Setup analog vorhandener Tests wiederverwenden):

```typescript
  it('zeigt die Fehmarn-Bildmarke im Login-Header', () => {
    const fixture = TestBed.createComponent(AdminLoginComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.login-header app-brand-icon')).not.toBeNull();
    expect(element.querySelector('.bullseye')).toBeNull();
  });
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAIL — `.login-header app-brand-icon` ist `null`.

- [ ] **Step 3: Template umstellen**

In `frontend/src/app/pages/login/login.component.html` die Zeilen 4-9 (`<div class="bullseye" …>…</div>`) ersetzen durch:

```html
      <app-brand-icon class="brand-logo" />
```

- [ ] **Step 4: Komponente in `login.component.ts` importieren**

```typescript
import { BrandIconComponent } from '../../ui/brand-icon/brand-icon.component';
```

```typescript
  imports: [ReactiveFormsModule, BrandIconComponent],
```

- [ ] **Step 5: `login.component.css` bereinigen**

`.bullseye` (Z. 83-88), `.ring`/`.r1`/`.r2`/`.r3` (Z. 90-111), `.center-dot` (Z. 113-125) und `@keyframes pulse-ring` (Z. 127 ff.) **entfernen**. Stattdessen ergänzen:

```css
.brand-logo {
  display: block;
  width: 56px;
  height: 56px;
  margin: 0 auto 1.25rem;
  color: var(--text);
}
```

- [ ] **Step 6: Tests laufen lassen, Erfolg prüfen**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (Login-Specs inkl. neuem Smoke-Test grün).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/login/login.component.ts frontend/src/app/pages/login/login.component.html frontend/src/app/pages/login/login.component.css frontend/src/app/pages/login/login.component.spec.ts
git commit -m "#156 Login nutzt Fehmarn-Bildmarke statt Bullseye-Animation"
```

---

### Task 4: Favicon auf Insel-Form umstellen

**Files:**
- Create: `frontend/public/favicon.svg`
- Modify: `frontend/src/index.html:8` (SVG-Favicon-Link ergänzen)

**Interfaces:**
- Consumes: dasselbe Insel-Motiv wie Task 1 (Pfad bewusst dupliziert, da außerhalb des Angular-Bundles geladen).
- Produces: `favicon.svg` wird von SVG-fähigen Browsern genutzt, `favicon.ico` bleibt Fallback.

- [ ] **Step 1: `favicon.svg` anlegen**

`frontend/public/favicon.svg` (dunkler Grund passend zum Theme, Insel in Textfarbe, Bullseye in Akzentgold — hier fest kodiert, da CSS-Variablen im Favicon nicht greifen):

```svg
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="12" fill="#0d0f12" />
  <path
    d="M8 34C6 26 14 20 22 19C30 18 34 12 42 13C52 14 58 22 56 30C55 37 48 41 44 45C39 50 34 52 26 51C17 50 10 43 8 34Z"
    fill="#eceef4"
  />
  <circle cx="34" cy="33" r="8" fill="none" stroke="#e8c547" stroke-width="2" />
  <circle cx="34" cy="33" r="3.5" fill="#e8c547" />
</svg>
```

- [ ] **Step 2: `index.html` verlinken**

In `frontend/src/index.html` vor der bestehenden `.ico`-Zeile (Z. 8) ergänzen:

```html
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
```

(Die vorhandene `<link rel="icon" type="image/x-icon" href="favicon.ico" />`-Zeile bleibt als Fallback bestehen.)

- [ ] **Step 3: Build verifizieren**

Run: `cd frontend && npm run build`
Expected: BUILD erfolgreich; `favicon.svg` liegt anschließend in `dist/…/browser/`.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/favicon.svg frontend/src/index.html
git commit -m "#156 Favicon nutzt Fehmarn-Insel-Motiv (SVG mit ICO-Fallback)"
```

---

### Task 5: Gesamtabnahme (Gate + visuelle Prüfung)

**Files:** keine Änderung (nur Verifikation; ggf. Feinschliff des SVG-Pfades).

- [ ] **Step 1: Volle CI-Gate lokal**

Run: `cd frontend && npm run lint && npm test -- --watch=false && npm run format:check`
Expected: alle drei grün.

- [ ] **Step 2: Visuelle Prüfung**

Run: `cd frontend && npm start` und im Browser prüfen:
- Header zeigt die Insel-Marke (Desktop **und** mobil < 720px, scharf/korrekt skaliert).
- Login zeigt dieselbe Marke, keine pulsierende Dartscheibe mehr.
- Browser-Tab zeigt das Insel-Favicon.
Bei Bedarf den Insel-Pfad in `BrandIconComponent` **und** `favicon.svg` identisch nachziehen.

- [ ] **Step 3: Doku-Abgleich**

Prüfen, ob eine Doku die alten Marken (`.brand-mark`-Dartscheibe / `.bullseye`) beschreibt (z. B. `docs/features/`); falls ja, kurz auf die neue Bildmarke anpassen (leichtgewichtig, kein eigenes Ticket).

- [ ] **Step 4: PR erstellen**

PR-Body mit englischem Auto-Close-Keyword: `Closes #156`.

---

## Self-Review

**Spec coverage:**
- Header-Marke ersetzt → Task 2 ✅
- Login-Bullseye ersetzt (einheitliche Marke) → Task 3 ✅
- Responsiv + `viewBox`/Retina + A11y (`aria-hidden`) → Task 1 (SVG) + Task 2/3 (CSS-Maße, mobil) ✅
- Favicon-Übernahme → Task 4 ✅
- Kein CDN / self-contained → Global Constraints + Inline-SVG/lokale Datei ✅
- Insel-Silhouette selbst gezeichnet + Bullseye-Punkt (Motiv) → Task 1 ✅
- Offene Detailentscheidung (Pfad-Form) → in Task 1 und Task 5 als Feinschliff verankert ✅

**Placeholder scan:** Kein TBD/TODO; jeder Code-Step zeigt konkreten Code. Der SVG-Pfad ist bewusst als anpassbare Näherung markiert, aber vollständig lauffähig angegeben.

**Type/Naming consistency:** Selector `app-brand-icon`, Klasse `BrandIconComponent`, CSS-Klassen `.brand-mark` (Header) / `.brand-logo` (Login) / `.brand-icon__*` (SVG-intern) durchgängig konsistent zwischen Tasks 1–3.
