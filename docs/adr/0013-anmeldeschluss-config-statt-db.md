# ADR 0013 – Anmeldeschluss als Server-Config statt DB

**Status:** Akzeptiert · **Datum:** 2026-07-11

## Kontext

Nach dem Anmeldeschluss (Flyer 2027: 28. Februar 2027) dürfen keine Online-Anmeldungen mehr
eingehen (#153). Im Code lag seit dem ersten Schema-Commit (#4) eine ungenutzte Tabelle
`turnier_config` (Spalten `anmeldung_gesperrt`, `anmeldeschluss_datum`) samt Entity – ohne
Repository, ohne Leser: toter Code. `AGENTS.md` hielt bereits fest, dass dieser Teil raus soll.

## Entscheidung

Der Anmeldeschluss wird als **feste Server-Config** gesetzt, nicht in der Datenbank:

- Property `fehmarnopen.anmeldung.anmeldeschluss` (`AnmeldungProperties`), Default `2027-02-28`
  in `application.yaml`, per ENV `ANMELDESCHLUSS` überschreibbar.
- Auswertung im `AnmeldeschlussService` mit injiziertem `Clock` (testbar). Zeitzone `Europe/Berlin`,
  inklusive bis Tagesende: offen, solange `jetzt < anmeldeschluss.plusDays(1).atStartOfDay(Berlin)`.
- Das Backend lehnt späte `POST /api/anmeldung` mit `AnmeldungGesperrtException` → **403** ab.
- `GET /api/anmeldung/status` liefert dem Frontend `{ anmeldungOffen, anmeldeschluss }`.
- Die tote Tabelle `turnier_config` + Entity werden entfernt (Changeset `003`).

## Konsequenzen

- Kein Admin-UI nötig; der Stichtag ist eine Betriebs-Einstellung (ENV) – passend, da er einmal
  jährlich feststeht.
- Weniger toter Code und eine Tabelle weniger im Schema.
- Ändert sich der Stichtag doch dynamisch, wäre ein DB-getriebener Ansatz nötig – bewusst als
  YAGNI verworfen.

## Alternativen

- **DB-getrieben (`turnier_config`) mit Admin-Toggle:** flexibler, aber mehr Fläche (Repository,
  Seed, UI) für einen jährlich fixen Wert. Verworfen.
- **Datum im Frontend hart kodiert:** dupliziert die Wahrheit, driftet leicht. Verworfen.
