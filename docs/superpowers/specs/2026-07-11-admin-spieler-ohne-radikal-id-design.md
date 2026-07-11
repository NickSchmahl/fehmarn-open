# Design: Admin-Sicht — Spieler ohne Radikal ID erkennbar machen

**Issue:** #154
**Datum:** 2026-07-11
**Quelle:** PO-Feedback Finn (Sprachnachricht, 2026-07-10)

## Problem

Spieler geben bei der Anmeldung entweder ihre **Radikal ID** an oder – falls sie keine haben –
**Initialen + Geburtsdatum**, damit das Radikal-Team eine ID anlegen kann. In der Admin-Übersicht
ist heute nur `radikalId` sichtbar; für Spieler ohne ID steht dort lediglich „—". Finn braucht klar
erkennbar, **wer keine ID hat** (ca. 20 % müssen neu angelegt werden) und mit welchen Daten die
Anlage erfolgt.

## Fachlicher Hintergrund

Ein Spieler hat laut Validierungsregel entweder eine `radikalId` **oder** `initialen` +
`geburtsdatum` (siehe `SpielerValidierungService.pruefeRadikalId`). Es gibt **keine**
algorithmisch berechnete Radikal ID — `initialen` + `geburtsdatum` sind die reine Anlage-Grundlage,
aus der das Radikal-Team später manuell eine ID erzeugt. Es wird daher **kein** künstlicher
ID-String gebildet.

## Lösung

Die Admin-DTO reicht künftig zusätzlich `initialen` und `geburtsdatum` durch. Das Frontend zeigt
für Spieler ohne ID diese Rohdaten in der ID-Spalte plus ein deutliches Badge „neu anlegen". Die
öffentliche Teilnehmeransicht bleibt **vollständig unverändert** (kein Geburtsdatum nach außen).

### Backend

- `AdminUebersichtResponse.SpielerEintrag` erweitern:
  `(vorname, nachname, radikalId)` → `(vorname, nachname, radikalId, initialen, geburtsdatum)`.
  - `geburtsdatum` als `java.time.LocalDate`; Jackson serialisiert es als ISO `yyyy-MM-dd`
    (konsistent zu `AnmeldungRequest`).
- `UebersichtMapper.toAdminMeldung`: die drei Felder **direkt** aus der `Spieler`-Entity
  durchreichen. Kein `if` nötig — bei Spielern mit ID sind `initialen`/`geburtsdatum` ohnehin
  `null`, bei Spielern ohne ID ist `radikalId` `null`. Damit erfüllt sich „Felder für Spieler ohne
  ID füllen" von selbst.
- `TeilnehmerUebersichtResponse` und `UebersichtMapper.oeffentlicheSpieler`: **unverändert**
  (weiterhin nur Vor-/Nachname).

### Frontend (`pages/teilnehmer`)

- Interface `AdminSpielerEintrag` erweitern um `initialen: string | null` und
  `geburtsdatum: string | null`.
- Admin-Listeneintrag je Spieler (`teilnehmer.html`, Block `admin-list`):
  - **mit** `radikalId`: wie bisher — ID-Spalte zeigt die ID, **kein** Badge.
  - **ohne** `radikalId`: ID-Spalte zeigt `Initialen, dd.MM.yyyy` (z. B. „NS, 14.03.1990") **plus**
    Badge „neu anlegen" (deutlich farbig; gleiche Badge-Mechanik/-Optik wie `status-badge`).
- **Datums-Helfer als eigenes, wiederverwendbares Modul** unter `shared/` (analog `shared/disziplin`),
  z. B. `shared/datum.ts` mit Funktion, die ISO `yyyy-MM-dd` → `dd.MM.yyyy` formatiert. Bewusst
  **nicht** in `teilnehmer.ts`, um lose Kopplung und Wiederverwendbarkeit zu wahren. Eigene
  `datum.spec.ts` mit Unit-Tests (gültiges Datum, evtl. null/leer-Verhalten).
- Styling für das Badge in `teilnehmer.scss` (an vorhandenen `status-badge` angelehnt).

## Testfälle

**Backend** (`UebersichtMapperTest`, ggf. `AdminTeilnehmerControllerTest`)
- Admin-Mapping, Spieler **ohne** ID → `initialen` + `geburtsdatum` gefüllt, `radikalId` null.
- Admin-Mapping, Spieler **mit** ID → `radikalId` gesetzt, `initialen`/`geburtsdatum` null.
- Öffentliche Übersicht/Controller → Response enthält **kein** Geburtsdatum/Initialen.

**Frontend** (`teilnehmer.spec.ts`, via echtem DOM)
- Admin: Spieler ohne ID → Badge „neu anlegen" + `Initialen, dd.MM.yyyy` sichtbar.
- Admin: Spieler mit ID → ID sichtbar, **kein** Badge.
- Öffentliche Sicht: weiterhin weder Initialen noch Geburtsdatum.

**Datums-Helfer** (`shared/datum.spec.ts`)
- `1990-03-14` → `14.03.1990`.
- null/leerer Wert → definiertes Verhalten (z. B. leerer String).

## Nicht enthalten (YAGNI)

- Keine berechnete Pseudo-Radikal-ID.
- Keine DB-/Liquibase-Änderung — `initialen`/`geburtsdatum` existieren bereits in der Entity/Tabelle.
- Keine Änderung am Anmeldeformular oder an der öffentlichen Teilnehmeransicht.

## Akzeptanzkriterien (aus Issue #154)

- [ ] `SpielerEintrag` um Initialen und Geburtsdatum erweitert (nur Admin-Sicht).
- [ ] Mapper füllt diese Felder für Spieler ohne Radikal ID.
- [ ] Admin-Übersicht zeigt für Spieler **ohne** ID Initialen + Geburtsdatum + Markierung „neu anlegen".
- [ ] Spieler **mit** ID werden wie bisher mit ID angezeigt (keine Markierung).
- [ ] Öffentliche Teilnehmeransicht bleibt unverändert (kein Geburtsdatum öffentlich).
