# Design: Anmeldeschluss 28.02.2027 – Config-Datum + Infoseite + Backend-Sperre

**Issue:** #153
**Quelle:** PO-Feedback Finn (Sprachnachricht, 2026-07-10) + Flyer „Anmeldeschluss 28. Februar 2027".
**Datum:** 2026-07-11

## Kontext

Nach dem Anmeldeschluss dürfen keine Online-Anmeldungen mehr eingehen, damit Finn planen und
das Radikal-Team alles eintragen kann. Aktuell gibt es keine Deadline-Logik: `AnmeldungService.anmelden()`
prüft nichts, das Frontend postet direkt.

Ausgangslage im Code:

- Entity `TurnierConfig` + DB-Tabelle `turnier_config` (Spalten `anmeldung_gesperrt`, `anmeldeschluss_datum`)
  existieren seit dem allerersten Schema-Commit (#4), sind aber **komplett ungenutzt** — kein Repository,
  kein Service liest sie. Toter Code.
- `AnmeldungGesperrtException` existiert und ist im `GlobalExceptionHandler` bereits auf **403** gemappt.
- Das Frontend (`anmeldung.component.ts`) hat kein `ngOnInit`/Laden; es gibt keinen öffentlichen
  GET-Config-Endpoint.

## Entscheidungen

- **Deadline als feste Server-Config** (nicht DB-getrieben), Default `2027-02-28`.
- Die tote `TurnierConfig`-Tabelle/Entity wird **entfernt** (YAGNI, kein toter Code).
- Das Frontend erfährt den Status über einen **öffentlichen GET-Endpoint** und rendert Formular
  **oder** Infoseite.
- **Zeitzone Europe/Berlin, inklusive bis Tagesende:** Anmeldung offen, solange
  `jetzt < 2027-03-01T00:00 Europe/Berlin`. Der 28.02. ist den ganzen Tag offen.
- **HTTP-Status 403 Forbidden** für abgelehnte späte Anmeldungen (bereits verdrahtet).

## Architektur / Komponenten

### 1. Deadline-Config (Backend)

Neue Klasse `AnmeldungProperties` (`@ConfigurationProperties(prefix = "fehmarnopen.anmeldung")`),
analog zu `AdminProperties`:

- Property `anmeldeschluss: LocalDate`, Default in `application.yaml`:
  `fehmarnopen.anmeldung.anmeldeschluss: ${ANMELDESCHLUSS:2027-02-28}` (per ENV überschreibbar).
- Zeitzone als Konstante `ZoneId.of("Europe/Berlin")` (im `AnmeldeschlussService`).

### 2. Testbare Zeit

Ein `Clock`-Bean (`@Bean Clock clock() { return Clock.systemDefaultZone(); }`) wird in den
`AnmeldeschlussService` injiziert. So können Tests „vor / genau am / nach" dem Stichtag deterministisch
mit einem fixen `Clock` prüfen — kein verstreutes `LocalDateTime.now()`.

### 3. Sperr-Logik im Service

Neuer `AnmeldeschlussService` (Single Responsibility, ArchUnit-konform; DI-Feld heißt wie der Typ):

- `boolean anmeldungOffen()` — vergleicht `clock`-Zeitpunkt gegen die Deadline:
  offen, solange `jetzt < anmeldeschluss.plusDays(1).atStartOfDay(Europe/Berlin)`.
- `void pruefeAnmeldungOffen()` — wirft `AnmeldungGesperrtException`, wenn geschlossen.

`AnmeldungService.anmelden()` ruft ganz am Anfang `anmeldeschlussService.pruefeAnmeldungOffen()`.

Die `AnmeldungGesperrtException`-Meldung wird angepasst auf:
*„Der Anmeldeschluss war am 28.02.2027 – eine Anmeldung ist nicht mehr möglich."*
(Datum aus der Config formatiert, damit Meldung und Config nicht auseinanderdriften.)

Das bestehende `GlobalExceptionHandler`-Mapping auf **403** bleibt unverändert.

### 4. Status-Endpoint (öffentlich)

`GET /api/anmeldung/status` → `AnmeldeschlussStatusResponse { boolean anmeldungOffen, LocalDate anmeldeschluss }`.

- Neuer Handler in `AnmeldungController` (oder schlanker eigener Controller), delegiert an
  `AnmeldeschlussService`.
- In `SecurityConfig` als `permitAll` freigeben (wie POST `/api/anmeldung`).

### 5. Frontend

`anmeldung.component.ts`:

- In `ngOnInit` `GET /api/anmeldung/status` laden.
- Signal `anmeldungOffen` (+ `anmeldeschluss` für die Textausgabe).
- Template: `@if (anmeldungOffen())` rendert das bestehende Formular, `@else` einen Info-Block mit
  dem Text *„Der Anmeldeschluss war am 28.02.2027 – eine Anmeldung ist nicht mehr möglich."*
  (Datum formatiert aus der Response). Bei geschlossenem Status wird das Formular **gar nicht** gerendert.
- Der bestehende POST-Fehlerpfad (403) wird weiterhin sauber über die vorhandene Fehleranzeige
  dargestellt (Sicherheitsnetz, falls der Schluss zwischen Laden und Absenden eintritt).

### 6. Tote TurnierConfig entfernen

- Neues Liquibase-Changeset `003-drop-turnier-config.sql` (`drop table turnier_config`).
- Entity `TurnierConfig.java` entfernen.
- Zugehörigen Teil in `SchemaMigrationTest` (setzt/liest `turnier_config`) entfernen.

## Datenfluss

1. FE lädt beim Betreten der Anmeldeseite `GET /api/anmeldung/status`.
2. Backend berechnet `anmeldungOffen` via `AnmeldeschlussService` (Clock vs. Config-Deadline).
3. FE rendert Formular **oder** Infoseite.
4. Beim Absenden ruft `POST /api/anmeldung` → `AnmeldungService.anmelden()` → `pruefeAnmeldungOffen()`;
   nach Ablauf `AnmeldungGesperrtException` → 403 mit fachlicher Meldung.

## Fehlerbehandlung

- Späte Anmeldung: `AnmeldungGesperrtException` → **403 Forbidden** mit fachlicher Meldung
  (`GlobalExceptionHandler`, bereits vorhanden).
- Grenzfall exakt am 28.02.2027: den ganzen Tag offen (inklusive Tagesende Europe/Berlin).

## Tests

**Backend**
- `AnmeldeschlussServiceTest` — @Nested je Methode-unter-Test (ADR 0012), fixer `Clock`:
  vor Deadline → offen; genau am 28.02. (Tagesbeginn und -ende) → offen; ab 01.03. 00:00 → zu.
- `AnmeldungServiceTest` — Ergänzung: gesperrt → `AnmeldungGesperrtException`; offen → normale Anmeldung.
- Controller-Test für `GET /api/anmeldung/status` (offen/geschlossen).
- `GlobalExceptionHandlerTest` — 403 für `AnmeldungGesperrtException` (Meldung).
- `SchemaMigrationTest` — TurnierConfig-Teil entfernt; Migration `003` läuft.

**Frontend**
- `anmeldung.component.spec.ts` — Status offen → Formular sichtbar; Status geschlossen → Infoseite
  sichtbar, kein Formular gerendert; POST-403 wird sauber angezeigt.

## Doku

- `docs/features/` — Eintrag, wo die Deadline gesetzt wird (`fehmarnopen.anmeldung.anmeldeschluss` /
  ENV `ANMELDESCHLUSS`) und wie sich Frontend/Backend verhalten.
- `docs/changelog.md` — Eintrag.
- Kurzer ADR-Hinweis, dass bewusst Config-Property statt DB-Entity gewählt wurde (und `turnier_config`
  deshalb entfernt).

## Akzeptanzkriterien (aus dem Ticket)

- [ ] Deadline als konfigurierbarer Wert (Server-Config), Default `2027-02-28`, Zeitzone/Tagesende
      eindeutig festgelegt (Europe/Berlin, inklusive bis Tagesende).
- [ ] Backend lehnt `POST /api/anmeldung` nach Ablauf mit klarer fachlicher Meldung ab (403,
      sauber im `GlobalExceptionHandler`).
- [ ] Frontend zeigt nach Ablauf statt des Formulars eine Info.
- [ ] Vor Ablauf: Anmeldung funktioniert unverändert normal.
- [ ] Verhalten dokumentiert (wo wird die Deadline gesetzt).

## Testfälle (aus dem Ticket)

- Systemzeit vor Deadline → Formular sichtbar, Anmeldung erfolgreich.
- Systemzeit nach Deadline → Infoseite statt Formular; direkter POST wird vom Backend abgelehnt.
- Grenzfall exakt am 28.02.2027 (bis Tagesende erlaubt) verhält sich wie definiert.
