# ADR 0017 – PDF-Exporte über die Druckansicht des Browsers, CSV statt Excel

**Status:** Akzeptiert · **Datum:** 2026-10-29

## Kontext

Die Export-Seite (#305) liefert drei Ausgaben: die Turniertag-Liste (PDF) für Einlass und Kasse,
die Radikal-Meldungen als CSV und dieselben Daten als lesbare Meldeliste (PDF). Der frühere Plan
„Excel-Export" ([ADR 0008](0008-scope-reduktion-testabnahme.md)) hätte Apache POI gebraucht. Alle
nötigen Daten liefert bereits `GET /api/admin/teilnehmer`.

## Entscheidung

- **Alles im Frontend, kein neuer Endpunkt.** Eine gemeinsame, rein funktionale Aufbereitung
  (`pages/export/logik/`) sortiert, nummeriert und bildet Anzeige-ID + NEU-Status; CSV und beide
  PDFs bauen darauf auf und können so nicht auseinanderlaufen.
- **PDF = Druckansicht des Browsers.** Je Export eine Druck-Komponente; der Button rendert sie und
  ruft `window.print()` auf („Als PDF speichern"). Die Komponente entsteht erst beim Druckauftrag,
  ist am Bildschirm unsichtbar und bleibt danach stehen (auf Mobilgeräten kehrt `print()` sofort
  zurück, ein Abbau bei `afterprint` könnte ein leeres PDF ergeben). Ihre `@page`-Regel gilt nur,
  solange sie im DOM steht – also nur auf der Export-Seite.
  Gemeinsame Druck-Grundlagen liegen in `shared/druck/_druck.scss`.
- **Blätter der Turniertag-Liste werden im Code aufgeteilt**, nicht per CSS `columns`: Die
  Mehrspaltigkeit bricht über Seitengrenzen nicht verlässlich um, mit fester Aufteilung stimmen
  „Blatt x von y" und der Nummernbereich. Die Verteilung rechnet mit den festen Zeilenhöhen aus dem
  SCSS, damit auch die höheren Leerzeilen nie aus dem Blatt laufen.
- **Die Radikal-Meldeliste bricht fließend um**; Seitenzahl und Stand stehen in `@page`-Randboxen.
  Den Stand liest die Randbox aus einer CSS-Variablen am Wurzelelement, weil Randboxen nur von dort
  erben.
- **CSV statt Excel:** UTF-8 mit BOM, `;`, CRLF, RFC-4180-Quoting – öffnet per Doppelklick im
  deutschen Excel. Werte, die mit `=`, `+`, `-`, `@`, Tab oder CR beginnen, bekommen ein `'`
  vorangestellt (CSV-/Formel-Injection, OWASP), weil Namen aus dem öffentlichen Formular stammen.
- **Download beim Admin**, keine automatische Übermittlung an Radikal (Datenschutzerklärung §4).

## Konsequenzen

- Keine neue Dependency, kein Backend-Code, gleiche Schriften wie die App; Layout ist normales
  HTML/SCSS und als Angular-Komponente testbar.
- Das Ergebnis hängt minimal vom Browser ab. Zielbrowser ist Chrome/Edge; `@page`-Randboxen mit
  `counter(pages)` brauchen Chromium ≥ 131. Firefox/Safari drucken die Listen, die Fußzeile der
  Meldeliste kann dort fehlen.
- Im Druckdialog Papier A4 und Skalierung „Standard" (100 %) lassen: Die Turniertag-Blätter sind
  exakt auf A4 ohne Seitenrand (`@page { margin: 0 }`) ausgelegt, „An Seite anpassen" verkleinert sie.
- Ändern sich Zeilenhöhen im Turniertag-SCSS, muss `HOEHE` in `turniertag-blaetter.ts` mitziehen.
- Wünscht Radikal ein anderes CSV-Schema, wird nur `RADIKAL_CSV_SPALTEN` angepasst.

## Alternativen

| Variante | Warum nicht |
|----------|-------------|
| jsPDF / pdfmake im Frontend | Layout in JS-Koordinaten, Schriften einbetten, Bundle wächst |
| OpenPDF / PDFBox im Backend | neue Dependency, Layout in Java, doppelte Fachlogik, SpotBugs/PMD-Aufwand |
| Apache POI (echtes .xlsx) | große Dependency für eine Datei, die Excel als CSV genauso öffnet |
