# ADR 0011 – Fachliche Konflikt-Validierung im Service (409) statt Bean-Validation-Constraint

**Status:** Akzeptiert · **Datum:** 2026-07-10 · **Ticket:** #152

## Kontext

Bei der Teamname-Validierung (#152) muss die **Eindeutigkeit pro Disziplin** geprüft werden
(derselbe normalisierte Name darf nicht zweimal aktiv in derselben Disziplin vorkommen). Der
Fehler soll im Frontend **am betroffenen Feld** erscheinen. Es stellte sich die Frage, ob man
das über den **Jakarta-Bean-Validation-Standard** (eigener `ConstraintValidator` mit
Spring-injiziertem Repository, Feld-Zuordnung via `addPropertyNode`) lösen sollte – der Fehler
liefe dann automatisch durch den bestehenden `MethodArgumentNotValidException`-Pfad
(`errors:[{field,message}]`).

## Entscheidung

**Struktur-/Feldregeln** (Pflichtfeld, Format, feste Obergrenzen) bleiben **Bean Validation**
am DTO (`@NotBlank`, `@Pattern`, `@Size` …) → HTTP 400 über den bestehenden Handler.

**Fachliche Konflikt-/Bestandsprüfungen** (Eindeutigkeit, alles was den DB-Bestand oder
mehrere Entitäten kennt) liegen im **Service** und werfen eine fachliche Exception, die der
`GlobalExceptionHandler` auf den passenden Status mappt – für Dubletten **409 Conflict**.

Damit der Fehler trotzdem **feldgenau** ankommt, gibt der Handler bei solchen Exceptions die
schon vorhandene `FieldError`-Struktur (`errors:[{field,message}]`) zurück, wobei `field` die
**Disziplin** als stabile Kennung trägt. Das Frontend mappt `Disziplin → Formular-Control` und
setzt den Fehler per `control.setErrors(...)` (Angular-Standardweg – es gibt keinen eingebauten
Server-Fehler-nach-Formular-Mechanismus).

## Begründung

- **409 ist die korrekte Semantik** für eine Dublette (Konflikt mit Bestand), nicht 400
  (Formatfehler). Bean Validation kann nur 400.
- **Der Reaktivierungs-Pfad ist mit DTO-Validation nicht abdeckbar:** Beim Reaktivieren einer
  abgemeldeten Anmeldung kommt nur eine ID herein, kein Teamname. Die Eindeutigkeit muss dort
  ohnehin gegen den Bestand geprüft werden → die Regel gehört an **eine** Stelle im Service,
  sonst läge sie doppelt (DTO **und** Service).
- **DB-Zugriff im Validator läuft außerhalb der Service-Transaktion** (Race-Fenster) und gilt
  als Anti-Pattern.
- **Feld-Mapping trotzdem standardnah:** Wir nutzen die etablierte `FieldError`-Struktur; nur
  die Prüfung selbst ist serviceseitig.

## Konsequenzen

- Neue Exceptions dieser Klasse (z. B. `DoppelterTeamnameException`) werden im
  `GlobalExceptionHandler` gemappt und liefern eine `errors`-Liste mit Feldkennung.
- Das Frontend braucht einmalig eine kleine Verdrahtung „Server-Feldfehler → Control"
  (`setErrors`, bestehende Validator-Fehler dabei **mergen**, nicht überschreiben).
- **Case-insensitiver Vergleich in Java, nicht in SQL:** SQLites `UPPER`/`IgnoreCase` deckt nur
  ASCII ab (Umlaute würden nicht als gleich erkannt). Daher aktive Namen der Disziplin laden und
  in Java mit `equalsIgnoreCase` (Unicode-korrekt) vergleichen. Datenmenge ist klein.
- **Kein DB-Unique-Constraint:** case-insensitiv + normalisiert + nur-aktiv + pro-Disziplin ist
  in SQLite nicht sauber als Constraint abbildbar; die Service-Prüfung ist flexibler.

## Alternativen

- **Eigener `ConstraintValidator` mit Repository:** Standardnah, aber 400 statt 409, deckt die
  Reaktivierung nicht ab, DB-Zugriff außerhalb Transaktion. Verworfen.
- **DB-Unique-Constraint (Liquibase):** In SQLite für diese zusammengesetzte,
  normalisiert-case-insensitive-aktiv-Bedingung nicht sauber umsetzbar. Verworfen.
