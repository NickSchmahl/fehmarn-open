# Design: Teamname-Validierung (#152)

**Datum:** 2026-07-10 · **Ticket:** [#152](https://github.com/NickSchmahl/fehmarn-open/issues/152)
· **Quelle:** PO-Feedback Finn (2026-07-10) + Präzisierung Nick
· **Zugehöriger ADR:** [0011 – Konflikt-Validierung im Service](../../adr/0011-validierung-fachlich-im-service.md)

## Ziel

Teamnamen sollen normalisiert, längenbegrenzt und pro Disziplin eindeutig sein:

1. **Normalisierung:** führende/abschließende Leerzeichen entfernen **und** interne
   Mehrfach-Leerzeichen zu einem einzelnen zusammenfassen.
2. **Länge:** max. **20 Zeichen** (gemessen **nach** Normalisierung; Radikal-Software-Limit).
3. **Eindeutigkeit:** **case-insensitive** und **pro Disziplin**, gegen **aktive** (nicht
   abgemeldete) Anmeldungen. Gleicher Name in anderer Disziplin ist erlaubt.

Betrifft nur Team-Disziplinen; Einzel/U18 haben keinen Teamnamen und bleiben unberührt.

## Architektur-Grundsatz

Backend = verbindliche Wahrheit, Frontend spiegelt fürs UX. Die Aufteilung folgt
[ADR 0011](../../adr/0011-validierung-fachlich-im-service.md): fachliche Konfliktprüfung
(Eindeutigkeit) im **Service** mit **409**, nicht als Bean-Validation-Constraint. Grund u. a.:
der Reaktivierungs-Pfad ist mit DTO-Validation nicht abdeckbar (nur ID im Request), 409 ist die
korrekte Semantik, DB-Zugriff im Validator läuft außerhalb der Transaktion.

## Backend

### 1. Normalisierung — `TeamnameNormalisierer`

Kleine, pure Einheit (eigene Datei): `trim()` + `replaceAll("\\s+", " ")`. Leer/null → null.
Isoliert unittestbar, keine Abhängigkeiten.

### 2. `TeamnameValidierungService` (`@Component`)

Collaborator: `AnmeldungRepository`. Aufgaben:

- **Länge:** normalisiert > 20 Zeichen → `UngueltigeAnmeldungException` (bestehende 400-Mappung).
- **Eindeutigkeit:** lädt aktive Anmeldungen der Disziplin und vergleicht deren (bereits
  normalisierte) Teamnamen mit dem Kandidaten per **`equalsIgnoreCase`** (Unicode-/umlaut-korrekt,
  siehe ADR 0011 zur SQLite-`UPPER`-Grenze). Kollision → neue `DoppelterTeamnameException`.
- Nimmt eine `ausschlussId` (Neuanlage: `null`; Reaktivierung: eigene ID → sich selbst
  ausschließen).
- Gibt den normalisierten Namen zurück, damit der Aufrufer ihn speichern kann.

Kein Teamname (null/blank nach Normalisierung) → keine Prüfung (Einzel/U18).

### 3. Repository

Neue Methode `List<Anmeldung> findByDisziplinAndAbgemeldetFalse(Disziplin disziplin)`.
Der case-insensitive Vergleich erfolgt bewusst in Java (nicht als `IgnoreCase`-Query), siehe ADR.

### 4. `AnmeldungService`

- **`anmeldenFuerDisziplin`:** Teamname über den Validierungsservice normalisieren + prüfen
  (`ausschlussId = null`), den **normalisierten** Namen setzen und speichern.
- **`reaktivieren`:** hat die Anmeldung einen Teamnamen, vor dem Reaktivieren dieselbe
  Eindeutigkeitsprüfung mit `ausschlussId = anmeldungId` durchführen → sonst 409.

### 5. `DoppelterTeamnameException` → 409

Trägt die `Disziplin` (für die Feldkennung) und liefert eine fachliche Meldung. Im
`GlobalExceptionHandler`: **409 Conflict** mit `ErrorResponse` inkl. `errors`-Liste, wobei
`field` = Disziplin-Wert (z. B. `"HERRENDOPPEL"`), `message` = fachlicher Text.

## Frontend

### Länge (Feld-Fehler, sofort)

`maxlength="20"` am Eingabefeld + `Validators.maxLength(20)` (auf dem normalisierten Wert). Klare
Meldung „Teamname darf höchstens 20 Zeichen haben". Server prüft zusätzlich (Absicherung →
Banner-Fallback, tritt bei normaler Nutzung nicht auf).

### Normalisierung im Payload

Teamname beim Absenden mit derselben Regel normalisieren (Trim + interne Whitespaces), damit
Payload und Längenmessung mit dem Backend übereinstimmen.

### Dublette (Feld-Fehler über Server, ADR 0011)

Beim **409** liest das Frontend `errors[0].field` (Disziplin-Wert), mappt via
`DISZIPLINEN.findIndex(...)` auf den Formular-Index und setzt am zugehörigen `teamName`-Control
per `setErrors({ duplikat: message })` einen Fehler (bestehende Validator-Fehler dabei
**mergen**). Anzeige unter dem Feld wie „Teamname ist erforderlich".

- **Zurücksetzen:** beim erneuten Absenden werden alte `duplikat`-Fehler geleert; zusätzlich
  löscht sich der Fehler, sobald der Nutzer das betroffene Teamname-Feld ändert.
- **Reaktivierungs-Pfad (Admin-UI):** sicherstellen, dass die 409-Meldung dort ebenfalls
  sichtbar wird (Admin-Übersicht hat kein Teamname-Formular → dort als Meldung/Banner, mit dem
  fachlichen Text des Servers).

## Tests

**Backend**
- `TeamnameNormalisierer`: „ Team " → „Team"; „a␣␣b" → „a b"; leer/null → null.
- `TeamnameValidierungService` (Repository gemockt): 20 Zeichen ok / 21 abgelehnt;
  gleiche Disziplin case-insensitive (inkl. Umlaut „Bär"/„BÄR") → 409; andere Disziplin → ok;
  `ausschlussId` schließt die eigene Anmeldung aus.
- `AnmeldungService`: Neuanlage speichert normalisiert; zweite gleiche → `DoppelterTeamnameException`;
  Reaktivierung mit Konflikt → Exception, ohne Konflikt → ok.
- `GlobalExceptionHandler`: `DoppelterTeamnameException` → 409 mit `errors`-Feldkennung.

**Frontend**
- `maxLength`-Validator zeigt Feld-Fehler bei > 20 Zeichen.
- Payload enthält normalisierten Teamnamen.
- 409-Antwort setzt Fehler am richtigen `teamName`-Control (Disziplin-Mapping); Fehler
  verschwindet nach Änderung des Feldes.

## Nicht im Scope

- Erzwingen, dass Team-Disziplinen überhaupt einen Teamnamen haben (bewusst lenient, wie in
  #151 entschieden).
- DB-Unique-Constraint (siehe ADR 0011).
- Kein Liquibase-Changeset nötig (rein serviceseitige Prüfung).
