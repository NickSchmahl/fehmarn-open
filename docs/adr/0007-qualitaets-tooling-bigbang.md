# ADR 0007 – Qualitäts-Tooling als Big-Bang einführen

**Status:** Akzeptiert · **Datum:** 2026-07-04

## Kontext
Für langfristige Wartbarkeit und Vertrauen in (auch KI-getriebene) Änderungen soll
das Projekt strenge Guardrails bekommen: Linting, statische Analyse,
Architekturtests, Coverage-Gates, CI-/Deploy-Härtung (siehe [quality/](../quality/)).
Solche Regeln kann man schrittweise („ratchet", nur neue/geänderte Dateien) oder als
Big-Bang (sofort scharf, ganzer Bestand angepasst) einführen.

## Entscheidung
**Big-Bang: Regeln sofort als Fehler**, Bestandscode in einem Rutsch konform machen.
Kein dauerhafter Warnungsmodus.

## Begründung
- Der Code ist jung und klein (**39** Backend-, **16** Frontend-Quelldateien) – die
  einmalige Anpassung ist jetzt günstig.
- Sauberer, streng geschützter Endzustand ab Tag 1; keine Alt-Baseline, die man
  „irgendwann später" aufräumt.

## Konsequenzen
- Jede Tooling-Einführung ist **ein Ticket = ein PR**, der (a) das Tool einbaut,
  (b) den Bestand konform macht, (c) das CI-Gate scharf schaltet – damit `main` nie
  rot wird.
- Ausnahme **Coverage**: Schwelle wird zunächst knapp **unter** den gemessenen
  Ist-Wert gesetzt (Baseline-first) und dann angehoben – sonst bräche der Build am
  Einführungstag ([coverage.md](../quality/coverage.md)).
- Kurzfristig höherer Aufwand pro Einführungs-PR; danach konstant niedrige Reibung.

## Alternativen
- **Ratchet/schrittweise**: nur neue/geänderte Dateien erzwingen. Verworfen – bei der
  aktuellen Codegröße unnötig, hinterlässt länger einen inkonsistenten Zustand.
