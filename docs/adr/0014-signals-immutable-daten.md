# ADR 0014 – Signals halten unveränderliche Daten (kein In-place-Mutieren)

**Status:** Akzeptiert · **Datum:** 2026-07-11

## Kontext

Der State im Frontend liegt in Angular-Signals (`signal<T[]>`), abgeleitete Sichten in
`computed`. Signals erkennen Änderungen über Referenzgleichheit: Wird der Inhalt eines
Signal-Arrays in-place mutiert (`.sort()`, `.push()`, `.splice()`, `.reverse()`), ändert sich
die Referenz nicht — Change Detection und `computed` können die Änderung verpassen oder
inkonsistent rendern. Das ist eine leise, schwer zu findende Fehlerklasse. Aufgefallen bei der
Sortierung abgemeldeter Teams (Issue #175), wo eine Liste je Disziplin sortiert werden musste.

## Entscheidung

Signal-gehaltene Daten werden als **unveränderlich** behandelt: nie in-place mutieren, sondern
immer eine **neue** Struktur ableiten und per `set`/`update` setzen.

- Sortieren/Umordnen über eine Kopie: `[...liste].sort(...)` statt `liste.sort(...)`.
- Reine Transformationsfunktionen bekommen ihre Eingabe als `readonly`-Array und geben eine
  neue Liste zurück.
- Signal-Payloads mit Listen werden mit `readonly`-Element-Typ deklariert:
  `signal<readonly Foo[]>([])`. Dadurch sind mutierende Array-Methoden ein **Compile-Fehler**
  (`Property 'sort' does not exist on type 'readonly Foo[]'`), der im bestehenden
  `tsc`/`ng build`-Gate der CI greift — kein zusätzliches ESLint-Plugin nötig.

Referenzimplementierung: `sortiereAbgemeldeteAnsEnde` + `gruppen`/`adminGruppen` in
`frontend/src/app/pages/teilnehmer/teilnehmer.ts` (Issue #175).

**Geltungsbereich:** verbindlich für neue/umgebaute Signal-basierte Zustände. Bestehende
Signale werden **nicht** pauschal umgestellt – nur wenn eine Komponente ohnehin angefasst wird.

## Konsequenzen

- In-place-Mutation von Signal-Listen wird zur Compile-Zeit verhindert statt erst im Betrieb
  aufzufallen.
- Klarere Datenflüsse: Computeds leiten sichtbar aus Quell-Signalen ab, statt sie zu verändern.
- Minimaler Zusatzaufwand: eine `readonly`-Annotation je Signal-Payload; Kopie beim Sortieren.
- Kein neues Tooling/keine neue Dependency.

## Alternativen

- **ESLint-Regel** (`eslint-plugin-functional`, `immutable-data`): fängt mutierende Methoden
  ebenfalls, aber heuristisch, mit false positives, neuer Dependency und Konfig-Pflege.
  Verworfen zugunsten der präziseren Typ-Lösung.
- **Nur Doku/Konvention ohne Typen:** verlässt sich auf Disziplin, kein Guardrail. Verworfen.
- **Tief-`readonly` aller verschachtelten Typen:** stärkere Garantie, aber invasiv und über den
  Anlass hinaus. Vorerst nur Signal-Payload + reine Helfer.
