# Anmeldung: Responsive-Bruch 480–620px (#194)

**Quelle:** GitHub-Issue #194 (Nick, 2026-07-13, Screenshot-Vergleich ~480px vs. ~600px).
Reines Layout/SCSS, keine Logik- oder Template-Änderung.

## Problem

Im Bereich ca. 480–620px Viewportbreite wirkt die Anmeldung-Seite kaputt: Texte (z. B. die
Preis-Badge „10 € / Spieler") werden abgeschnitten bzw. ragen aus ihren Kacheln heraus. Ursache
sind zwei unabhängige, nicht aufeinander abgestimmte Breakpoint-Sets in
`frontend/src/app/pages/anmeldung/anmeldung.component.scss`:

- `.disziplin-grid` (bisher Zeilen 174–188) ist zweispaltig und bleibt es bis hinunter zu `480px`
  (erst darunter `grid-template-columns: 1fr`). Jede unselektierte Kachel hat in diesem Bereich
  nur ~50 % der Viewportbreite. Die Kopfzeile `.disziplin-check-row`
  (`[Custom-Check] [.disziplin-name flex:1] [.disziplin-price white-space:nowrap]`) passt bei
  ~50 % Viewport nicht mehr nebeneinander → die nowrap-Preis-Badge läuft über.
- `.spieler-felder` / `.spieler-felder--split` (bisher Zeilen 341–363) schalten mit eigenen
  `@media`-Breakpoints bei `760px` und `520px` nach der **Viewportbreite** um, nicht nach der
  tatsächlich verfügbaren Kachelbreite. Beide Breakpoint-Ebenen (äußere Kachel-Grid, innere
  Spielerzeilen-Grid) sind dadurch nicht aufeinander abgestimmt.

Die Spielerfelder erscheinen nur in einer **selektierten** Kachel; selektierte Kacheln nehmen per
`.disziplin-card--selected { grid-column: 1 / -1 }` die volle Breite ein. Der sichtbare
Preis-Badge-Bruch betrifft also die **unselektierten** Zwei-Spalten-Kacheln; die
Viewport-vs.-Container-Fehlabstimmung betrifft die **inneren** Felder der selektierten Kachel.

## Akzeptanzkriterien (aus dem Ticket)

- Zwischen ca. 480px und 620px Viewportbreite kein sichtbar abgeschnittener oder herausragender
  Inhalt mehr (Preis-Badges, Spielerfelder, Kachel-Überschriften).
- Breakpoints von `.disziplin-grid` und `.spieler-felder`/`--split` sind aufeinander abgestimmt
  (bevorzugt: Container Queries `@container`, damit sich die Spielerzeilen an der tatsächlichen
  Kachelbreite statt an der Viewportbreite orientieren).
- Optik in den Bereichen < 480px, 480–620px, 620–760px und > 760px geprüft (keine Regression).

## Design

Zwei etablierte Standard-CSS-Muster, kein maßgeschneiderter Sonderweg. Nur die konkreten
Pixel-Schwellen sind projektspezifisch und werden visuell im Browser feinjustiert.

### A. Äußere Grid — auto-fit statt fixem Zwei-Spalten-Layout

`.disziplin-grid` wird von `grid-template-columns: 1fr 1fr` (+ 480px-Media-Query) umgestellt auf
das gängige „RAM"-Pattern (Repeat, Auto, Minmax):

```scss
.disziplin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 0.625rem;
  align-items: start;

  .disziplin-card--selected {
    grid-column: 1 / -1;
  }
}
```

- Das Grid bildet nur so viele Spalten wie mit je ≥ 260px Platz haben; sonst fällt es automatisch
  auf eine Spalte zurück. Der Umschaltpunkt liegt damit rechnerisch bei ~620px Viewport (Card-Innen
  = Viewport − ~96px Page-/Card-Padding; zwei Spalten à 260px + gap brauchen ~545px Innenbreite),
  also genau im Problembereich.
- `min(260px, 100%)` verhindert Überlauf auf sehr schmalen Viewports (< 260px), Standard-Absicherung.
- Die bisherige `@media (max-width: 480px)`-Regel entfällt ersatzlos (eine Media-Query weniger).
- `grid-column: 1 / -1` funktioniert mit `auto-fit` unverändert (spannt alle Spuren).

### B. Innere Spielerfelder — Container Queries statt Viewport-Media-Queries

`.disziplin-card` wird zum Query-Container erklärt; die Spielerfelder messen dann die echte
Kachelbreite statt der Viewportbreite:

```scss
.disziplin-card {
  container: disziplin / inline-size;
  /* … bestehende Deklarationen unverändert … */
}
```

Die beiden `@media`-Blöcke für `.spieler-felder` / `--split` werden durch `@container`-Queries
ersetzt. Umrechnung der bisherigen Viewport-Schwellen auf Kachel-Innenbreite
(Card-Innen ≈ Viewport − ~96px): 760px → ~660px, 520px → ~420px. Gerundet:

```scss
/* Zwei Felder pro Zeile, sobald die Kachel schmaler als ~660px wird. */
@container disziplin (max-width: 660px) {
  .spieler-felder,
  .spieler-felder--split {
    grid-template-columns: 1fr 1fr;
  }
}

/* Ein Feld pro Zeile, sobald die Kachel schmaler als ~420px wird. */
@container disziplin (max-width: 420px) {
  .spieler-felder,
  .spieler-felder--split {
    grid-template-columns: 1fr;
  }
}
```

Da die selektierte Kachel voll breit ist, orientieren sich beide Grid-Ebenen jetzt an derselben
realen Breite — die Breakpoints sind inhärent abgestimmt, ohne dass man Werte manuell synchron
halten muss.

## Wartbarkeit

- Eine Media-Query weniger; die verbleibenden Schwellen sind container-lokal und mit deutschem
  Kommentar versehen (warum welcher Wert).
- Neue Disziplinen brauchen keine Breakpoint-Anpassung (auto-fit passt sich selbst an).
- Standard-Patterns (RAM-Grid, Container Queries; Browser-Baseline seit 2023), gut auffindbar
  dokumentiert.

## Nicht-Ziele / YAGNI

- Keine Template-Änderung (`anmeldung.component.html` bleibt unverändert).
- Keine Logik-/TypeScript-Änderung.
- Keine Überarbeitung anderer Breakpoints/Komponenten (bewusst fokussiert auf #194).

## Verifikation

Reines Layout — keine Unit-Tests. Manuell im Browser (Frontend lokal, Responsive-Modus):

- Viewport schrittweise 400 → 800px: an keiner Stelle abgeschnittener/herausragender Text.
- Gewählte Kachel (z. B. Herreneinzel) bei 500px und 600px Viewport: Vorname/Nachname/Radikal-ID
  vollständig lesbar und sauber umgebrochen.
- Übergänge < 480px, 480–620px, 620–760px, > 760px ohne Regression.
- Volle lokale Quality-Gate vor Commit: `frontend` → `npm run lint`, `npm run test`,
  `npm run format:check`.
