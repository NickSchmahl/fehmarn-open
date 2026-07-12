# Design: Fehmarn-Insel-Marke (#156)

**Datum:** 2026-07-11 · **Ticket:** [#156](https://github.com/NickSchmahl/fehmarn-open/issues/156)
· **Quelle:** Idee Nick (2026-07-10) · **Priorität:** niedrig (Nice-to-have, kein Blocker)
· **Betrifft:** ausschließlich Frontend

## Ziel

Die generischen CSS-Marken werden durch **eine einheitliche Fehmarn-Insel-Bildmarke** ersetzt:

- Header-Marke `.brand-mark` (generische Dartscheibe aus radialen Gradients + Dart-Linie).
- Login-„Dartscheibe" `.bullseye` (drei pulsierende Ringe + Center-Dot).
- Optional/mitgenommen: Favicon.

**Motiv (entschieden):** stilisierte, selbst gezeichnete Fehmarn-Silhouette (geografisch
angenähert, kein Lizenzthema) mit einem goldenen **Bullseye-Punkt** (`--accent`) als
Darts-Bezug. Ein Motiv, drei Einsatzorte.

## Architektur-Grundsatz

Eine geteilte, zustandslose **Präsentationskomponente** statt dupliziertem Inline-SVG: ein
Pfad, eine Wahrheit — künftige Änderungen an genau einer Stelle. Das folgt der bestehenden
`ui/`-Konvention (vgl. `ui/toast`). Self-contained: SVG inline in der Komponente, kein
externes Asset/CDN.

## Komponente — `BrandIconComponent`

- **Ort/Selector:** `frontend/src/app/ui/brand-icon/`, `selector: app-brand-icon`,
  `standalone: true` (analog `ui/toast`), Template inline oder `.html`.
- **Inhalt:** ein `<svg>` mit `viewBox` (scharfe Skalierung Retina/mobil), Pfad der
  Insel-Silhouette + `<circle>` für den Bullseye-Punkt.
- **Theming:** Silhouette in `currentColor` (erbt die Textfarbe des Kontexts), Bullseye-Punkt
  fest auf `var(--accent)`. So bleibt der Gold-Akzent überall konsistent.
- **Größe:** SVG füllt `width/height: 100%` seines Containers → die Einsatzorte bestimmen die
  Größe per CSS.
- **A11y:** `aria-hidden="true"` + `focusable="false"` am `<svg>` (rein dekorativ). Die
  Zugänglichkeit trägt weiterhin der umgebende Link im Header
  (`aria-label="Fehmarn Open Startseite"`) bzw. die Überschrift im Login.

## Änderungen an den Einsatzorten

### 1. Header — `app.html` / `app.scss`

- [`app.html`](../../../frontend/src/app/app.html): `<span class="brand-mark">…</span>` →
  `<app-brand-icon class="brand-mark" />`. `BrandIconComponent` in `app.ts` importieren.
- [`app.scss`](../../../frontend/src/app/app.scss): in `.brand-mark` die
  Gradient-/`box-shadow`-/`.brand-mark span`-Deklarationen (Dartscheiben-Look) entfernen, nur
  Box-Maße behalten (38px, mobil 34px im `@media`-Block). Der Rand `border-radius: 50%` entfällt
  (Insel ist kein Kreis).

### 2. Login — `login.component.html` / `login.component.css` / `login.component.ts`

- [`login.component.html`](../../../frontend/src/app/pages/login/login.component.html): den
  kompletten `.bullseye`-Block (drei `.ring` + `.center-dot`) →
  `<app-brand-icon class="brand-logo" />`.
- [`login.component.css`](../../../frontend/src/app/pages/login/login.component.css):
  `.bullseye`, `.ring`, `.r1/.r2/.r3`, `.center-dot` und `@keyframes pulse-ring` entfernen;
  schlanke `.brand-logo`-Maße ergänzen (56px, zentriert `margin: 0 auto 1.25rem`).
- `login.component.ts`: `BrandIconComponent` importieren.
- **Bewusste Änderung:** die pulsierende Ring-Animation entfällt ersatzlos.

### 3. Favicon

- Neue Datei `frontend/public/favicon.svg` mit **derselben** Insel-Form (eigenständige Datei,
  da das Favicon außerhalb des Angular-Bundles vom Browser geladen wird — der SVG-Pfad wird
  hier bewusst dupliziert; Quelle der Wahrheit bleibt konzeptionell die Komponente).
- [`index.html`](../../../frontend/src/index.html): vor der bestehenden `.ico`-Zeile
  `<link rel="icon" type="image/svg+xml" href="favicon.svg" />` ergänzen. `favicon.ico` bleibt
  als Fallback für Browser ohne SVG-Favicon-Support.

## Tests

- Neuer Spec `brand-icon.component.spec.ts`: Komponente erzeugt genau ein `<svg>`, das
  `aria-hidden="true"` trägt.
- `app.spec.ts` / `login.component.spec.ts` referenzieren die alten Marken **nicht** → kein
  Bruch. Optional je ein kleiner Smoke-Check, dass `<app-brand-icon>` gerendert wird.
- Vor Commit/PR volle CI-Gate lokal: `npm run lint && npm test && npm run format:check`
  (Angular-Tests: `nativeElement as HTMLElement` casten).

## Bewusst nicht im Scope (YAGNI)

- Keine Konfigurierbarkeit der Komponente (Farb-/Größen-`@Input()`s) — Größe über CSS reicht.
- Keine Animation im Login (Pulse-Rings entfallen ersatzlos).
- Keine geografisch exakte Silhouette (stilisiert genügt für ein Nice-to-have).

## Offene Detailentscheidung (bei Umsetzung)

- Konkrete Form des Insel-Pfades und Platzierung/Größe des Bullseye-Punktes werden beim
  Zeichnen festgelegt und visuell (Header + Login, Desktop + mobil) geprüft.
