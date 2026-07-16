# Ticket #184 – Ausgefüllte Disziplin-Karte einklappbar machen

## Kontext

Auf der öffentlichen Anmeldeseite (`frontend/src/app/pages/anmeldung/`) wählt ein Captain im
`disziplin-grid` eine oder mehrere `disziplin-card`s aus. Sobald eine Disziplin angehakt ist,
klappt in der Karte dauerhaft der Detailbereich (bei Team-Disziplinen ein Teamname-Feld je Meldung
plus der `spieler-block` mit Spielerzeilen) auf. Bei mehreren gemeldeten Disziplinen bleiben alle
ausgefüllten Blöcke gleichzeitig sichtbar – die Seite wird lang und unübersichtlich, obwohl eine
Disziplin bereits fertig ausgefüllt ist.

## Ziel

Der Captain kann den Detailbereich einer ausgewählten `disziplin-card` manuell einklappen, um
weiterzuarbeiten, ohne die Auswahl zu verlieren.

## Entscheidungen

- **Startzustand:** Eine neu angehakte Disziplin startet **aufgeklappt** (bestehendes Verhalten).
  Zuklappen ist immer eine manuelle Aktion – kein automatisches Zuklappen.
- **Bedienelement:** Die **gesamte Titelzeile** (Name + Preis + Chevron) ist bei gewählter Disziplin
  ein Klapp-Button, der den Detailbereich ein-/ausklappt – ein Klick darauf klappt zu (statt
  abzuwählen), was natürlicher ist. Die **Auswahl-Checkbox** ist ein davon getrenntes Control links
  daneben und **hakt als Einzige wirklich ab**. Nicht gewählt ist die Titelzeile stattdessen ein
  `<label>`, dessen Klick die Disziplin auswählt.
- **Zusammenfassung (zugeklappt):** **die Anzahl der Meldungen** der Disziplin (nicht der Spieler –
  ein 4er-Team ist eine Meldung ⇒ „1"), als kompakte Zähler-Pill links neben dem Chevron. Aufgeklappt
  trägt die Titelzeile nur den Pfeil, keine Pill. Kein Teamname, keine Namensliste.
- **Zustandshaltung:** Reiner UI-State als Component-Signal (`Set<number>` der eingeklappten
  Disziplin-Indizes), **nicht** im Reactive-Form-Modell – der Klapp-Zustand darf das POST-DTO und
  die Validierung nicht beeinflussen.

## Umsetzung

### Component (`anmeldung.component.ts`)

Neu:

- `private collapsed = signal(new Set<number>())` – Menge der **eingeklappten** Disziplin-Indizes.
  Default leer ⇒ alles aufgeklappt.
- `isCollapsed(i): boolean` – ist `i` in der Menge?
- `toggleCollapse(i): void` – Index umschalten; erzeugt eine **neue** `Set`-Instanz
  (Signal-Immutabilität).
- `meldungGesamt(i): number` – Anzahl der Meldungen (`meldungenArray(i).length`) der Disziplin `i`.
- `disziplinHatFehler(i): boolean` – ist der `meldungen`-FormArray der Disziplin `i` ungültig?

Änderungen:

- `onDisziplinToggle(i, selected)`: beim **Abwählen** zusätzlich `i` aus `collapsed` entfernen ⇒
  Wiederauswahl startet aufgeklappt.
- `onSubmit()`: nach `markAllAsTouched()` und **vor** `if (this.form.invalid) return;` alle
  ausgewählten Disziplinen, die eingeklappt sind **und** `disziplinHatFehler(i)` liefern, wieder
  aufklappen, damit kein Fehler verdeckt bleibt.

Kein Einfluss auf `toSpielerPayload` / das POST-Body.

### Template (`anmeldung.component.html`)

Kopfzeile `.disziplin-head` (Flex-Row) mit zwei getrennten Elementen: links die **Auswahl-Checkbox**
(eigenes `<label>` mit verstecktem Input + Custom-Check), rechts die **Titelzeile** `.disziplin-headline`.
Die Titelzeile ist zustandsabhängig:

- **gewählt** → ein `<button>`, dessen Klick `toggleCollapse(i)` auslöst (aria-expanded /
  aria-controls). Enthält Name + Subtitle, Preis, zugeklappt die Zähler-Pill `meldungGesamt(i)` und
  den Chevron.
- **nicht gewählt** → ein `<label [for]="'disziplin-' + value">`, dessen Klick die Disziplin nativ
  auswählt.

```html
<div class="disziplin-head">
  <label class="disziplin-checkbox">
    <input type="checkbox" formControlName="selected" [id]="'disziplin-' + disziplin.value" … />
    <span class="disziplin-custom-check" aria-hidden="true"><!-- SVG-Haken --></span>
  </label>

  @if (isDisziplinSelected(i)) {
    <button type="button" class="disziplin-headline"
      [class.disziplin-headline--collapsed]="isCollapsed(i)" (click)="toggleCollapse(i)"
      [attr.aria-expanded]="!isCollapsed(i)" [attr.aria-controls]="'disziplin-detail-' + i">
      <span class="disziplin-headline-text">…Name + Subtitle…</span>
      <span class="disziplin-price">…</span>
      @if (isCollapsed(i)) { <span class="collapse-count" aria-hidden="true">{{ meldungGesamt(i) }}</span> }
      <span class="collapse-chevron" aria-hidden="true"><!-- SVG-Chevron --></span>
    </button>
  } @else {
    <label class="disziplin-headline" [for]="'disziplin-' + disziplin.value">…Name + Preis…</label>
  }
</div>
```

- `meldungen-block` erhält `[id]="'disziplin-detail-' + i"` und wird nur bei `!isCollapsed(i)`
  gerendert. Das `@if`-Entfernen lässt die FormArray-Controls und damit die Validität bestehen ⇒
  Auto-Aufklappen bei Fehler funktioniert.
- Nur die Checkbox wählt wirklich ab; die Titelzeile klappt (gewählt) bzw. wählt aus (nicht gewählt).
- Der Chevron/Pill sind `aria-hidden`; der Klapp-Button trägt Name + Preis als zugängliche
  Beschriftung, `aria-expanded` meldet den Zustand. Tastatur/Fokus liefert `<button>`/`<label>` nativ.

### Styling (`anmeldung.component.scss`)

- `.disziplin-head`: Flex-Row (`align-items: center`).
- `.disziplin-checkbox`: eigenes Control links, `flex-shrink: 0`; versteckter Input als
  `.disziplin-checkbox-input`, sichtbarer `.disziplin-custom-check`.
- `.disziplin-headline`: `flex: 1`, Flex-Row; als `button` mit Reset (kein Rahmen/Hintergrund),
  `:focus-visible`-Ring, Hover tönt den Chevron.
- `.collapse-count`: kleine Pill (`border-radius: 999px`), nur zugeklappt gerendert.
- `.collapse-chevron`: 22px-Kreis; zugeklappt Pfeil nach unten (Standard), aufgeklappt nach oben
  (`.disziplin-headline:not(--collapsed)` → `rotate(180deg)`).

### Tests (`anmeldung.component.spec.ts`)

Alle über echte DOM-Interaktion (Klick auf `.disziplin-headline` bzw. Checkbox / Submit / „+ Weitere
Meldung"), nicht per direktem Methodenaufruf:

1. Ausgewählte Disziplin startet aufgeklappt (Detail sichtbar, `aria-expanded="true"`, keine Pill).
2. Klick auf die Titelzeile klappt ein: Detail verschwindet, `aria-expanded="false"`, die Zähler-Pill
   `.collapse-count` zeigt die Meldungsanzahl (1 bei einem Team – nicht die Spielerzahl).
3. Erneuter Klick klappt wieder auf.
4. Klick auf die Titelzeile klappt nur ein, **wählt nicht ab** (Disziplin bleibt gewählt).
5. Die **Checkbox** wählt auch im eingeklappten Zustand ab; erneutes Anwählen startet aufgeklappt.
6. Eingeklappte Karte mit Validierungsfehler wird bei Submit automatisch aufgeklappt.
7. Die Pill-Meldungsanzahl aktualisiert sich nach „+ Weitere Meldung".

## Akzeptanzkriterien (aus dem Ticket)

- [x] Ein-/Ausklapp-Zustand je ausgewählter Karte für den Detailbereich.
- [x] Zugeklappt: Disziplin-Name, Auswahl-Häkchen und kurze Zusammenfassung (Spieleranzahl), keine
      Eingabefelder.
- [x] Checkbox bleibt unabhängig vom Klapp-Zustand bedienbar.
- [x] Zugeklappte Karte mit Validierungsfehler klappt bei Submit automatisch auf.
- [x] Bedienung per Klick und Tastatur (Enter/Space) inkl. `aria-expanded`.
- [x] Component-Tests über echte DOM-Interaktion.

## Nicht im Scope

- Kein „Alle einklappen"/„Alle ausklappen"-Sammelschalter.
- Keine Persistenz des Klapp-Zustands über einen Reload hinweg.
- Keine Animation über einfaches Chevron-Rotieren hinaus (kein Slide-Down erforderlich).
