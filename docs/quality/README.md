# Qualität & Vertrauen

> **Warum dieser Ordner existiert:** Nick soll dem KI-Assistenten (und jedem
> anderen Beitragenden) vertrauen können, dass eingecheckter Code funktioniert und
> die Software langfristig wartbar bleibt. Vertrauen entsteht nicht aus Zusagen,
> sondern aus **automatischen Schutzmechanismen**, die Fehler abfangen, bevor sie
> nach `main` oder in Produktion gelangen.

## Das Vertrauensmodell: mehrschichtige Verteidigung

Jede Zeile Code durchläuft mehrere unabhängige Gates. Kein einzelnes muss perfekt
sein – zusammen fangen sie die typischen Fehlerklassen ab:

```
 Entwicklung          │ 1. Formatierung   Spotless / Prettier   (Stil, keine Diskussion)
   (lokal + Agent)    │ 2. Linting        (angular-)ESLint      (Bugs, Anti-Patterns)
                      │ 3. Statische      SpotBugs/PMD (BE)      (Null, Ressourcen,
                      │    Analyse        typescript-eslint (FE)  Sicherheitsmuster)
 ─────────────────────┼──────────────────────────────────────────────────────────
 Tests                │ 4. Unit/Integr.   JUnit + Jest          (Verhalten korrekt)
                      │ 5. Architektur    ArchUnit (BE)          (Schichten, Grenzen
                      │    tests          ESLint-Boundaries (FE)  eingehalten)
                      │ 6. Coverage       nur messbar, kein Gate (bewusst, s. coverage.md)
 ─────────────────────┼──────────────────────────────────────────────────────────
 Integration          │ 7. CI (grün)      GitHub Actions        (reproduzierbar,
                      │                                            auf sauberer Maschine)
                      │ 8. Branch Protect. main nur via PR + grüne CI
                      │ 9. Deploy-Gate    Deploy nur nach grüner CI
```

Details je Schicht:

| # | Schicht | Backend | Frontend | Dokument |
|---|---------|---------|----------|----------|
| 1 | Formatierung | Spotless (palantir) | Prettier | [backend-code-qualitaet.md](backend-code-qualitaet.md) · [frontend-code-qualitaet.md](frontend-code-qualitaet.md) |
| 2 | Linting | — (via statische Analyse) | angular-eslint + typescript-eslint | [frontend-code-qualitaet.md](frontend-code-qualitaet.md) |
| 3 | Statische Analyse | SpotBugs + PMD (+ Error Prone/NullAway) | typescript-eslint type-checked | [backend-code-qualitaet.md](backend-code-qualitaet.md) |
| 4 | Tests | JUnit 5, @WebMvcTest, @DataJpaTest | Jest, Angular Testing | [teststrategie.md](teststrategie.md) |
| 5 | Architekturtests | ArchUnit | eslint-plugin-boundaries / dependency-cruiser | [backend-architektur-tests.md](backend-architektur-tests.md) · [frontend-architektur-tests.md](frontend-architektur-tests.md) |
| 6 | Coverage (nur messbar, **kein Gate** — bewusst) | JaCoCo (nicht aktiv) | Jest `--coverage` (keine Schwelle) | [coverage.md](coverage.md) |
| 7–9 | CI/CD & Gates | GitHub Actions | GitHub Actions | [ci-cd.md](ci-cd.md) |

## Zielbild vs. Ist-Zustand (Stand 2026-07-04)

| Schicht | Ist | Ziel |
|---------|-----|------|
| Formatierung Backend | ✅ Spotless (nur Format) | ➕ importOrder, removeUnusedImports, formatAnnotations, sortPom |
| Formatierung Frontend | ⚠️ Prettier da, **nicht in CI geprüft** | ✅ `prettier --check` als CI-Gate |
| Linting Frontend | ❌ **kein ESLint** | ✅ angular-eslint + typescript-eslint (strict-type-checked) |
| Statische Analyse Backend | ❌ keine | ✅ SpotBugs + PMD im `verify` |
| Architekturtests Backend | ❌ keine | ✅ ArchUnit-Schichtregeln |
| Architekturtests Frontend | ❌ keine | ✅ Import-Grenzen erzwungen |
| Coverage-Gate Backend | ⛔ bewusst kein Gate (#51 `wontfix`) | Coverage nur on demand messbar, nicht erzwungen |
| Coverage-Gate Frontend | ⛔ bewusst kein Gate (#47 ohne Schwelle) | Coverage nur on demand messbar, nicht erzwungen |
| CI-Gates | ⚠️ Frontend ohne Lint/Prettier/Coverage | ✅ alle Gates in CI |
| Deploy-Gate | ⚠️ Deploy **unabhängig** von CI | ✅ Deploy erst nach grüner CI |
| Branch Protection | ✅ Ruleset aktiv, Direktpush getestet abgelehnt | ✅ `main` nur via PR + grüne Checks |

## Einführungsstrategie: Big-Bang, sofort streng

Entschieden am 2026-07-04 (siehe [ADR 0007](../adr/0007-qualitaets-tooling-bigbang.md)):
Regeln werden **sofort als Fehler** aktiviert und der gesamte Bestandscode in einem
Rutsch angepasst – kein „ratchet"/Warnungsmodus. Begründung: Der Code ist noch
jung und überschaubar (39 Backend-, 16 Frontend-Quelldateien), ein Big-Bang ist
jetzt günstig und liefert sofort einen sauberen, streng geschützten Endzustand.

**Konsequenz für die Umsetzung:** Jede Tooling-Einführung ist ein eigenes Ticket
(siehe [tickets/quality-roadmap.md](../tickets/quality-roadmap.md)), das (a) das Tool
einbaut, (b) den Bestandscode konform macht und (c) das CI-Gate scharf schaltet –
alles im selben PR, damit `main` nie rot wird.

## Prinzipien

1. **Grün = Wahrheit.** Was in CI grün ist, gilt als korrekt gebaut. Lokale „läuft
   bei mir"-Aussagen zählen nicht.
2. **Deterministische Tests.** Keine flakes, keine `sleep`-Abhängigkeiten, feste
   Zeit/Zufallsquellen injizierbar.
3. **Regeln erzwingen, nicht empfehlen.** Eine Regel, die nicht den Build bricht,
   wird ignoriert. Alles Wichtige ist ein CI-Gate.
4. **Kein direkter `main`-Push.** Immer Branch → PR → grüne CI → Merge.
5. **Entscheidungen sind dokumentiert.** Jede nicht offensichtliche Wahl wird ein ADR.
