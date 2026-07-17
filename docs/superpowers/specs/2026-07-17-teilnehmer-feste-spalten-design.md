# Feste Spalten in der Teilnehmer-Tabelle (Admin-Ansicht)

## Problem

Die Admin-Ansicht der Teilnehmer-Seite rendert Meldungszeilen als Flex-Container
(`.admin-row`, `display: flex` + `justify-content: space-between`). Dadurch hängt die
horizontale Position von Radikal-ID und Aktions-Buttons von der Namenslänge ab. In
Team-Zeilen fehlen die Aktions-Buttons ganz (sie sitzen im Team-Kopf), sodass die ID
dort wieder an anderer Stelle landet. Die Spalten „springen" von Zeile zu Zeile.

## Ziel

Radikal-ID und Aktionen liegen bei allen Admin-Zeilen auf einer gemeinsamen, festen
vertikalen Linie — unabhängig von Namenslänge, Filter oder Team-/Einzelmeldung.

## Umfang

Nur die Admin-Ansicht. Rein CSS-seitig. Die öffentliche Liste (`.team-item`, gestapelt,
ohne Spalten) und die Fachlogik bleiben unangetastet. Das Template wird nur minimal
angefasst (Grid-Positionierung), kein Platzhalter-Element.

## Lösung

### Grid statt Flex

`.admin-row` wechselt von Flex auf `display: grid` mit drei Spalten:

| Spalte | Breite | Inhalt |
|---|---|---|
| Name | `minmax(0, 1fr)` | Name + ggf. „ID neu anlegen"-Badge |
| Radikal-ID | `9rem` | ID oder Anlage-Grundlage; bricht bei Überlänge um |
| Aktionen | `72px` | zwei Icon-Buttons à 32px + 0.4rem Lücke; bei Team-Zeilen leer |

- Die letzten beiden Spalten sind fix → Spaltenkanten sind namens- und filterunabhängig.
- `minmax(0, 1fr)` beim Namen verhindert, dass lange Namen die Spalte aufdrücken.
- Überlange Radikal-IDs (Randfall) brechen um; die Spaltenkante bleibt stehen. Kein
  `text-overflow: ellipsis`.

### Aktions-Spalte bei Team-Mitgliedern

Das `@if (!meldung.teamName)` im Template bleibt unverändert — Team-Mitglieder bekommen
keine eigenen Buttons (keine Fachlogik-Änderung). Da Grid nach Spalten platziert, wird
die ID explizit auf Spalte 2 gesetzt (`grid-column: 2`). Spalte 3 bleibt dann leer, ohne
dass ein Platzhalter ins Template muss.

### Globale Bündigkeit über Team-Blöcke hinweg

`.team-block--named` hat `padding: 0.5rem`, wodurch die enthaltenen Zeilen gegenüber den
Einzelzeilen nach innen rücken (Spaltenlinie ~9px versetzt). Fix: horizontales Padding
entfernen → `padding: 0.5rem 0`. Es bleibt nur die 1px-Rahmenbreite, optisch nicht
wahrnehmbar. Der Fehler-Hinweis (`.team-block-fehler`) hat eigene Ränder und ist davon
nicht betroffen.

### Mobil (≤720px)

Bestehender Breakpoint bleibt beim gestapelten Ein-Spalten-Layout. Änderung: die
Aktionen bekommen `justify-self: end`, damit die Buttons rechtsbündig sitzen (bessere
Übersicht). Die tote Regel `.admin-row-actions` im Breakpoint wird entfernt — die Klasse
existiert im Template nicht.

## Tests

Rein CSS. `teilnehmer.spec.ts` prüft Verhalten und Struktur, keine Anpassung erwartet.
Suite laufen lassen, danach visuell im Browser prüfen (Desktop + Mobil, Team- und
Einzelzeilen, gefilterte Ansicht).
