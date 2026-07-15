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
- **Bedienelement:** Ein **reiner Icon-Button (Chevron)** rechts in der Kartenkopfzeile, neben dem
  Preis – kein eigener Balken, kein Textlabel. Die Auswahl-Checkbox bleibt davon getrennt und
  unabhängig bedienbar.
- **Zusammenfassung (zugeklappt):** **nur die Spieleranzahl** über alle Meldungen der Disziplin,
  als kompakte Zähler-Pill links neben dem Chevron (z. B. „2"); die volle Angabe („2 Spieler")
  steckt im `aria-label`. Aufgeklappt trägt der Button nur den Pfeil. Kein Teamname, keine
  Namensliste.
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
- `spielerGesamt(i): number` – Summe der Spielerzeilen über alle Meldungen der Disziplin `i`.
- `disziplinHatFehler(i): boolean` – ist der `meldungen`-FormArray der Disziplin `i` ungültig?

Änderungen:

- `onDisziplinToggle(i, selected)`: beim **Abwählen** zusätzlich `i` aus `collapsed` entfernen ⇒
  Wiederauswahl startet aufgeklappt.
- `onSubmit()`: nach `markAllAsTouched()` und **vor** `if (this.form.invalid) return;` alle
  ausgewählten Disziplinen, die eingeklappt sind **und** `disziplinHatFehler(i)` liefern, wieder
  aufklappen, damit kein Fehler verdeckt bleibt.

Kein Einfluss auf `toSpielerPayload` / das POST-Body.

### Template (`anmeldung.component.html`)

Auswahl-Label und Klapp-Toggle liegen in einer gemeinsamen Kopfzeile `.disziplin-head`
(Flex-Row). Der Toggle wird nur bei `isDisziplinSelected(i)` gerendert und sitzt rechts neben dem
Preis:

```html
<div class="disziplin-head">
  <label class="disziplin-label"><!-- Checkbox + Name + Preis + Subtitle --></label>

  @if (isDisziplinSelected(i)) {
    <button
      type="button"
      class="disziplin-collapse-toggle"
      [class.disziplin-collapse-toggle--collapsed]="isCollapsed(i)"
      (click)="toggleCollapse(i)"
      [attr.aria-expanded]="!isCollapsed(i)"
      [attr.aria-controls]="'disziplin-detail-' + i"
      [attr.aria-label]="
        isCollapsed(i) ? 'Details anzeigen, ' + spielerGesamt(i) + ' Spieler' : 'Details einklappen'
      "
    >
      @if (isCollapsed(i)) {
        <span class="collapse-count" aria-hidden="true">{{ spielerGesamt(i) }}</span>
      }
      <span class="collapse-chevron" aria-hidden="true"><!-- SVG-Chevron --></span>
    </button>
  }
</div>
```

- `meldungen-block` erhält `[id]="'disziplin-detail-' + i"` und wird nur bei `!isCollapsed(i)`
  gerendert (`@if (isDisziplinSelected(i) && !isCollapsed(i))`). Das `@if`-Entfernen lässt die
  FormArray-Controls und damit die Validität bestehen ⇒ Auto-Aufklappen bei Fehler funktioniert.
- Die Auswahl-Checkbox bleibt im `.disziplin-label` und ist – da der Toggle ein **Geschwister**
  außerhalb des Labels ist – unabhängig bedienbar.
- Da der Button icon-only ist, trägt er einen dynamischen `aria-label` als zugängliche
  Beschriftung; Tastatur (Enter/Space) und Fokus liefert das `<button>` nativ.

### Styling (`anmeldung.component.scss`)

- `.disziplin-head`: Flex-Row (`align-items: center`); `.disziplin-label` bekommt `flex: 1`.
- `.disziplin-collapse-toggle`: kompakter Icon-Button ohne Rahmen/Hintergrund, `color:
  var(--text-soft)`, Hover `var(--accent)`, sichtbarer `:focus-visible`-Ring.
- `.collapse-count`: kleine Pill (`border-radius: 999px`, `var(--surface)` auf `var(--border)`),
  nur im zugeklappten Zustand gerendert.
- `.collapse-chevron`: 22px-Kreis; per Transform rotiert – zugeklappt Pfeil nach unten (Standard),
  aufgeklappt nach oben (`:not(--collapsed)` → `rotate(180deg)`).
- Additiv; einzige Strukturänderung: Label + Toggle in `.disziplin-head` gruppiert.

### Tests (`anmeldung.component.spec.ts`)

Alle über echte DOM-Interaktion (Klick auf `.disziplin-collapse-toggle` bzw. Checkbox / Submit),
nicht per direktem Methodenaufruf:

1. Ausgewählte Disziplin startet aufgeklappt (Detail `#disziplin-detail-i` sichtbar,
   `aria-expanded="true"`).
2. Klick auf den Toggle klappt ein: Detail verschwindet, `aria-expanded="false"`, die Zähler-Pill
   `.collapse-count` zeigt die korrekte Spieleranzahl und der `aria-label` enthält „N Spieler".
   Aufgeklappt ist keine Pill vorhanden.
3. Erneuter Klick klappt wieder auf.
4. Checkbox bleibt im eingeklappten Zustand bedienbar: Abwählen entfernt den Detailbereich, erneutes
   Anwählen startet wieder aufgeklappt.
5. Eingeklappte Karte mit Validierungsfehler wird bei `onSubmit` (Klick auf „Jetzt anmelden")
   automatisch aufgeklappt.
6. Spieleranzahl in der Zusammenfassung aktualisiert sich nach „+ Spieler hinzufügen".

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
