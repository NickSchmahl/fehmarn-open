# ADR 0012 – `@Nested`-Testklassen je Methode für fachliche Tests

**Status:** Akzeptiert · **Datum:** 2026-07-10

## Kontext

Fachliche Service-Tests (Kernlogik in `service/`) sammeln schnell viele Testfälle pro Klasse.
Bisher lagen alle Fälle flach nebeneinander, mit langen Methodennamen, die die getestete Methode
mit in den Namen ziehen mussten (`pruefe_gleicherNameInDerselbenDisziplin_wirftDoppelterTeamname`).
Das ist schwer zu überfliegen: Welche Methode wird gerade getestet, und welche Fälle sind schon
abgedeckt? Die Struktur der Testklasse spiegelt die Struktur der Produktivklasse nicht wider.

## Entscheidung

Fachliche Tests (Service-/Kernlogik) werden **nach der Methode-unter-Test in
`@Nested`-Klassen gruppiert** (JUnit 5).

- Je öffentlicher Methode eine `@Nested`-Klasse, benannt nach der Methode in PascalCase +
  Suffix `Test`: `normalisiere(...)` → `class NormalisiereTest`,
  `normalisiereUndPruefe(...)` → `class NormalisiereUndPruefeTest`.
- Die Testmethoden **darin** sind kurz und beschreiben nur noch das **Verhalten**, ohne die
  Methode zu wiederholen: `entferntRandLeerzeichen`, `ueber20ZeichenWirdAbgelehnt`,
  `gleicherNameAndereDisziplinIstErlaubt`.
- Mocks (`@Mock`) und `@InjectMocks` sowie gemeinsame Testdaten-Helfer bleiben in der äußeren
  Klasse; die inneren Klassen greifen darauf zu. `@ExtendWith(MockitoExtension.class)` an der
  äußeren Klasse gilt für die `@Nested`-Klassen mit.

Referenzimplementierung: `TeamnameValidierungServiceTest` (Issue #152).

**Geltungsbereich:** verbindlich für neue/umgebaute **fachliche** Tests (Service-Kernlogik).
Für Slice-/Integrationstests (`@WebMvcTest`, `@DataJpaTest`) ist `@Nested` optional und nur bei
mehreren klar trennbaren Achsen sinnvoll. Bestehende flache Tests werden **nicht** pauschal
umgeschrieben – nur wenn eine Klasse ohnehin angefasst wird.

## Konsequenzen

- Die Testklasse liest sich wie ein Inhaltsverzeichnis der Produktivklasse; der Testreport
  gruppiert sichtbar nach Methode (`NormalisiereTest › entferntRandLeerzeichen`).
- Kürzere, klarere Methodennamen; die getestete Methode steckt im Klassennamen, nicht im
  Methodennamen.
- Lücken in der Abdeckung einer Methode fallen schneller auf.
- Minimaler Mehraufwand: eine Verschachtelungsebene; Mockito-Setup bleibt in der äußeren Klasse.

Diese Konvention ergänzt `docs/quality/teststrategie.md` (Abschnitt „Konventionen Backend").

## Alternativen

- **Flache Testklasse mit sprechenden Methodennamen** (bisher): funktioniert, skaliert aber
  schlecht und zwingt die Methode in jeden Testnamen. Verworfen als Standard für Fachlogik.
- **Eine Testklasse pro Methode-unter-Test** (mehrere Dateien): stärkere Trennung, aber verteilt
  zusammengehörige Tests über viele Dateien und dupliziert das Mock-Setup. Verworfen.
