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
- **Bedienelement:** Ein **eigener Toggle-Button** (Chevron + Text) unterhalb des Auswahl-Labels.
  Die Auswahl-Checkbox bleibt davon getrennt und unabhängig bedienbar.
- **Zusammenfassung (zugeklappt):** **nur die Spieleranzahl** über alle Meldungen der Disziplin
  (z. B. „Details anzeigen · 4 Spieler"). Kein Teamname, keine Namensliste.
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

Innerhalb `.disziplin-card`, nur wenn `isDisziplinSelected(i)`, zwischen `.disziplin-label` und
`meldungen-block` eine Klapp-Leiste:

```html
@if (isDisziplinSelected(i)) {
  <button
    type="button"
    class="disziplin-collapse-toggle"
    (click)="toggleCollapse(i)"
    [attr.aria-expanded]="!isCollapsed(i)"
    [attr.aria-controls]="'disziplin-detail-' + i"
  >
    <span class="collapse-chevron" aria-hidden="true"><!-- SVG-Chevron --></span>
    <span class="collapse-label">
      @if (isCollapsed(i)) { Details anzeigen · {{ spielerGesamt(i) }} Spieler }
      @else { Details einklappen }
    </span>
  </button>
}
```

- `meldungen-block` erhält `[id]="'disziplin-detail-' + i"` und wird nur bei `!isCollapsed(i)`
  gerendert (`@if (isDisziplinSelected(i) && !isCollapsed(i))`). Das `@if`-Entfernen lässt die
  FormArray-Controls und damit die Validität bestehen ⇒ Auto-Aufklappen bei Fehler funktioniert.
- Die Auswahl-Checkbox bleibt unverändert im `.disziplin-label` und ist unabhängig bedienbar.
- Tastatur (Enter/Space) und Fokus liefert das `<button>` nativ; ARIA über `aria-expanded` und
  `aria-controls`.

### Styling (`anmeldung.component.scss`)

- `.disziplin-collapse-toggle`: volle Breite, dezente Leiste im Kartenstil (Border-Top zur
  Abtrennung vom Label), Flex mit Chevron links, `cursor: pointer`, sichtbarer
  `:focus-visible`-Ring nach bestehender Konvention.
- `.collapse-chevron`: SVG-Chevron, per Transform je nach Zustand rotiert (Zustand über
  Klasse `--collapsed`).
- Rein additiv, keine Umbauten an bestehenden Klassen.

### Tests (`anmeldung.component.spec.ts`)

Alle über echte DOM-Interaktion (Klick auf `.disziplin-collapse-toggle` bzw. Checkbox / Submit),
nicht per direktem Methodenaufruf:

1. Ausgewählte Disziplin startet aufgeklappt (Detail `#disziplin-detail-i` sichtbar,
   `aria-expanded="true"`).
2. Klick auf den Toggle klappt ein: Detail verschwindet, `aria-expanded="false"`, Zusammenfassung
   zeigt korrekte Spieleranzahl.
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
