# Anmelde-Layout: Container breiter + Spielerfelder nebeneinander (#168)

**Quelle:** GitHub-Issue #168 (Nick, 2026-07-10). Reines Layout/SCSS + Template-Umbau, keine Logikänderung.

## Problem

Auf dem Desktop ist die Anmelde-Card schmal (`max-width: 640px`). Eine aufgeklappte
Disziplin wächst stark nach unten, obwohl z. B. die Radikal ID nur ein kurzes Feld
braucht. Mit mehreren Meldungen wird die Seite sehr lang.

## Akzeptanzkriterien (aus dem Ticket)

- Card auf dem Desktop breiter (mehr horizontaler Platz).
- Pro Spielerzeile Vorname / Nachname / Radikal ID nebeneinander (Radikal ID schmaler).
- Responsive: auf schmalen Viewports stapeln die Felder wieder vertikal.
- Weniger vertikale Gesamtlänge bei aufgeklappter Disziplin.
- Keine Regression an bestehenden Validierungs-/Fehleranzeigen.

## Kontext / Ausgangslage

- Feld-Primitives (`.field-group`, `.field-label`, `.field-label-optional`, `.required`,
  `.field-input` inkl. `--sm`/`--error`/`:focus`/`::placeholder`, `.field-error`) sind
  **doppelt** definiert: `frontend/src/app/pages/anmeldung/anmeldung.component.scss` und
  `frontend/src/app/pages/login/login.component.css`.
- Die Definitionen sind bis auf eine risikoarme Abweichung identisch: Anmeldung-`.field-label`
  ist ein Flex-Container (für das `*`-Sternchen), Login nicht (bei Einzeltext visuell gleich).
- Beide Komponenten erben ihre CSS-Tokens (`--surface-2`, `--border`, …) über ihren
  jeweiligen `:host`. Globale Klassen in `styles.scss` (`.hinweis`, `.legal-page`) nutzen
  bereits genau diese Vererbung → globale Primitives funktionieren ohne Token-Umzug.
- Login nutzt nur einspaltige Felder (kein `.field-row`). `.field-row` (2-Spalten) wird
  ausschließlich in der Anmeldung verwendet und durch den Umbau obsolet.

## Design

### A. Wiederverwendung — Primitives global (styles.scss)

Die geteilten Feld-Primitives wandern **einmalig** nach `src/styles.scss` (analog zu `.hinweis`):
`.field-group`, `.field-label`, `.field-label-optional`, `.required`, `.field-input`
(+ `--sm`, `--error`, `:focus`, `::placeholder`), `.field-error`.

Danach werden die **Kopien in `login.component.css` und `anmeldung.component.scss` entfernt**.
Tokens bleiben, wo sie sind (Vererbung über `:host`).

**Bewusst nicht globalisiert (YAGNI, außerhalb dieses Tickets):** Design-Tokens, `.submit-btn`,
`.alert-*`, `.spinner`, Bullseye — dupliziert, aber nicht Teil von #168. `.field-row` wird
durch den Umbau obsolet → **entfernt**, nicht spekulativ globalisiert.

### B. Layout-Umbau Anmeldung

- `.anmeldung-card` `max-width: 640px → 880px` (Login bleibt 400px).
- Neue page-spezifische Komposition `.spieler-felder` (bleibt lokal in `anmeldung.component.scss`):
  ein CSS-Grid über Vorname, Nachname und den Radikal-Teil.
  - Standard (3 Felder): `Vorname 1fr · Nachname 1fr · Radikal ID minmax(150px, 0.75fr)`
    (Radikal ID schmaler).
  - Toggle-Zustand `.spieler-felder--split` (4 Felder, „keine Radikal ID"):
    `Vorname 1fr · Nachname 1fr · Initialen minmax(90px, 0.5fr) · Geburtsdatum minmax(150px, 0.85fr)`
    — alle vier in einer Reihe.
- **Template:** Vorname, Nachname und der Radikal-Teil (Radikal ID **oder** Initialen +
  Geburtsdatum) werden zu direkten Kindern **eines** `.spieler-felder`-Grids. Die bisherigen
  zwei `.field-row`-Wrapper entfallen. Der Modifier `--split` wird über
  `[class.spieler-felder--split]="hatKeineRadikalId(i, j)"` gesetzt.
  Alle `@if`-Fehlerblöcke und Form-Bindings bleiben 1:1 erhalten.
- Der zeilenübergreifende `radikalAngabeInvalid`-Hinweis, die `.radikal-toggle`-Checkbox und
  der `ersatz-hinweis` bleiben **unter** dem Grid, volle Breite.

### C. Responsive (Media-Queries, konsistent zum Bestand)

- ≤ 520px: `.spieler-felder` und `.spieler-felder--split` einspaltig (stapeln), wie heute.
- 521–760px: zweispaltig (`grid-template-columns: 1fr 1fr`) — Namen oben, Radikal-Teil bricht um.
- ab 761px: 3 bzw. 4 Spalten wie unter B.

Container-Queries werden bewusst nicht genutzt (Bestand arbeitet mit Viewport-Media-Queries).

### D. Absicherung

- Fehler-/Validierungsanzeigen: alle `.field-error`-Spans plus der zeilenübergreifende
  `radikalAngabeInvalid`-Hinweis bleiben erhalten → keine Regression.
- Quality-Gate lokal: `npm run lint` + `npm test` + `npm run format:check`.
- Visuelle Preview-Kontrolle **Login und Anmeldung**, je Desktop + Mobil (Login darf sich
  optisch nicht verändern).
- Angular-CSS-Budget prüfen (Extraktion verkleinert Component-CSS → eher entlastend).

## Nicht im Scope

- Keine Logik-/Validierungsänderung.
- Keine „abgeschlossene Meldung in Sidebar"-Idee (im Ticket verworfen).
- Kein Globalisieren von Tokens/Button/Alert/Spinner/Bullseye.
