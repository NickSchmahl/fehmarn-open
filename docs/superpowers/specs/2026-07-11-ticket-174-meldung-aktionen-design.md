# Ticket #174 — Admin-Übersicht: Anwesend/Abmelden als Icon-Aktionen

**Datum:** 2026-07-11
**Ticket:** [#174](https://github.com/NickSchmahl/fehmarn-open/issues/174)
**Quelle:** PO-Feedback Finn, 2026-07-11

## Problem

In der Admin-Teilnehmerübersicht bekommt aktuell **jede** Meldung — Team wie
Einzelmeldung — eine `team-head`-Kopfzeile mit ausgeschriebenen Text-Controls
(„anwesend"-Checkbox, „Abmelden"/„Reaktivieren"-Button), siehe
[teilnehmer.html:62-94](../../../frontend/src/app/pages/teilnehmer/teilnehmer.html).

Zwei Probleme:

1. Die Text-Controls fressen unverhältnismäßig viel Platz auf der Zeile.
2. Bei **Einzelmeldungen** (kein Teamname) ist diese Kopfzeile fast leer — kein
   Teamname, nur die Controls — und steht redundant über der einen Spielerzeile.

Zusätzlich ist der anwesend-Status nur am Zustand der Checkbox erkennbar, nicht
an der Zeile selbst (im Gegensatz zum abgemeldet-Status, der die Zeile per
Opacity abdunkelt, [teilnehmer.scss:310](../../../frontend/src/app/pages/teilnehmer/teilnehmer.scss)).

## Ziel

- Anwesend- und Abmelden-Aktion kompakt als **Icon-Buttons** (Text entfällt),
  barrierefrei über `aria-label`/`title`.
- Anwesend-Status **farblich an der Zeile** erkennbar (dezenter grüner Akzent),
  analog zur bestehenden abgemeldet-Kennzeichnung; beide Zustände bleiben
  visuell unterscheidbar und stapelbar.
- **Einzelmeldungen** verlieren die redundante Kopfzeile; die Aktionen wandern in
  die Spielerzeile.
- Funktionalität unverändert: Toggle löst `toggleAnwesenheit(...)` aus, Button
  `abmelden(...)` bzw. `reaktivieren(...)`.

## Design

### Neue Komponente `app-meldung-aktionen` (präsentational)

Reines Aktions-Cluster, **entkoppelt vom Seiten-Datenmodell** (nimmt Primitive,
nicht `AdminMeldungEintrag`), damit es isoliert test- und ersetzbar bleibt.

- **Ort:** `frontend/src/app/ui/meldung-aktionen/` (neben `brand-icon`),
  Standalone-Komponente nach bestehender `ui/`-Konvention.
- **Inputs:** `anwesend: boolean`, `abgemeldet: boolean`.
- **Outputs:** `toggleAnwesenheit` (emittiert den neuen Boolean-Wert),
  `abmelden`, `reaktivieren`.
- **Kennt keine `id` und kein HTTP** — die Seite verdrahtet Event → Service-Call.

Inhalt: zwei Icon-Buttons als Inline-SVG (`currentColor`, kein Icon-System nötig):

- **anwesend-Toggle:** `<button type="button" [attr.aria-pressed]="anwesend">`
  mit Haken-Icon. `aria-label`/`title` = „Als anwesend markieren" bzw. „Als
  abwesend markieren" je nach Zustand. Success-Farbe wenn aktiv, muted sonst.
  Klick emittiert `toggleAnwesenheit(!anwesend)`.
- **Abmelden/Reaktivieren:** je nach `abgemeldet` ein X-Icon (Abmelden,
  danger-Stil) oder ein Undo/Restore-Icon (Reaktivieren, ghost-Stil).
  `aria-label`/`title` entsprechend. Klick emittiert `abmelden` bzw.
  `reaktivieren`.

Icon-Button-Styling (quadratisch ~32px, transparenter Grund, hover-Akzent) ist
in der Komponente gekapselt und nutzt die Design-Tokens (`--success`,
`--danger`, `--accent`, `--text-muted`).

### Einbindung in `teilnehmer.html`

- **Team-Meldung** (`meldung.teamName` gesetzt): `team-head`-Kopfzeile bleibt;
  die bisherigen Text-Controls werden durch `<app-meldung-aktionen>` ersetzt.
  Highlight per `[class.team-head--anwesend]="meldung.anwesend"` (bzw. auf
  `team-block`).
- **Einzelmeldung** (kein Teamname): `team-head` entfällt komplett. Der
  `@if (meldung.teamName)`-Zweig umschließt künftig nur noch die Team-Kopfzeile.
  Das Cluster wird rechts in die eine `admin-row` der Spielerzeile eingesetzt,
  Highlight per `[class.admin-row--anwesend]="meldung.anwesend"`.

Die Seite (`teilnehmer.ts`) importiert die neue Komponente und verbindet die
Outputs mit den bestehenden Methoden `toggleAnwesenheit(id, wert)`,
`abmelden(id)`, `reaktivieren(id)`.

### Styling (`teilnehmer.scss`)

- `--anwesend`-Highlight: dezenter grüner Links-Border + `--success-dim`-Tint,
  analog zur bestehenden `--abgemeldet`-Opacity.
- Beide Zustände stapelbar: grüner Tint + Dimmen/Durchstreichen bleiben
  gleichzeitig lesbar und unterscheidbar.
- Mobile (`max-width: 720px`): Aktions-Cluster bleibt in der Zeile, kein
  Umbruch/Overlap.

## Tests

- **Komponententest** `meldung-aktionen.component.spec.ts`:
  - rendert Anwesend-Toggle mit korrektem `aria-pressed` je Input.
  - rendert Abmelden-Icon wenn nicht abgemeldet, Reaktivieren-Icon wenn
    abgemeldet, mit korrekten `aria-label`s.
  - echte DOM-Klicks emittieren `toggleAnwesenheit(!anwesend)`, `abmelden`,
    `reaktivieren`.
- **Seitentest** `teilnehmer.spec.ts` anpassen: Einzelmeldung rendert **keine**
  `team-head` mehr; Aktionen sitzen in der Spielerzeile. Team-Meldung behält die
  Kopfzeile mit Aktionen. anwesend-Klick togglet weiterhin.

## Akzeptanzkriterien (aus dem Ticket)

- [ ] anwesend + Abmelden/Reaktivieren kompakt, ohne unnötig Platz zu beanspruchen.
- [ ] Icons statt Text, mit `aria-label`/Tooltip.
- [ ] anwesend-Zeile farblich hervorgehoben, auch ohne Blick auf das Control.
- [ ] anwesend- und abgemeldet-Kennzeichnung klar unterscheidbar/kombinierbar.
- [ ] Funktionalität unverändert (Toggle/Abmelden/Reaktivieren).
- [ ] Mobil nutzbar, keine Overlaps.

## Nicht im Scope

- Kein Icon-System/Icon-Bibliothek — bespoke Inline-SVGs wie bei `brand-icon`.
- Keine Änderung an Backend/API oder am öffentlichen (nicht-Admin) Modus.
