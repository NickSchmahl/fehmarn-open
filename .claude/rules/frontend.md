---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.html"
  - "frontend/src/**/*.scss"
  - "frontend/*.js"
---

# Frontend-Regeln (Angular 22, Standalone Components)

## Vor dem Commit

`npm run format:check` **und** `npm run lint` **und** `npm test` **und** `npm run build`.
ESLint ist ein eigenständiges CI-Gate – nur Jest und Prettier zu prüfen reicht **nicht**
(`docs/workflow.md`). Vollständiges Gate: `/quality-gate`.

## Dateien mit Edit/Write ändern

Code unter `frontend/` mit den Tools **Edit/Write** schreiben, nicht per `sed`, Heredoc oder
Python-Skript. Nur dann formatiert der PostToolUse-Hook (`.claude/hooks/format-file.sh`) die
Datei sofort mit Prettier – sonst fällt die Abweichung erst im Gate auf und kostet einen
kompletten zweiten Lauf.

## Signals halten unveränderliche Daten

[ADR 0014](../../docs/adr/0014-signals-immutable-daten.md), verbindlich für neue und
umgebaute Signal-Zustände:

- Signal-Inhalte **nie in-place mutieren** (`.sort()`, `.push()`, `.splice()`, `.reverse()`).
  Signals erkennen Änderungen über Referenzgleichheit – eine In-place-Mutation verpasst die
  Change Detection.
- Stattdessen eine neue Struktur ableiten und per `set`/`update` setzen:
  `[...liste].sort(...)` statt `liste.sort(...)`.
- Signal-Payloads mit Listen als `readonly` deklarieren: `signal<readonly Foo[]>([])`.
  Mutierende Methoden werden damit zum Compile-Fehler und fallen in `npm run build` auf.
- Reine Transformationsfunktionen nehmen `readonly`-Arrays und geben neue Listen zurück.

Bestehende Signale werden **nicht** pauschal umgestellt – nur beim Anfassen der Komponente.

## Styles

Details und Begründung: `docs/quality/frontend-code-qualitaet.md`, Abschnitt 5 (#126).

- Design-Tokens stehen **nur** in `src/styles/_tokens.scss` (`:root`). Kein `:host { --bg: … }`
  in Komponenten.
- Was mehrere Seiten teilen, wird eine **globale Klasse** unter `src/styles/` – kein Mixin, kein
  Kopieren. Seitenspezifisches bleibt im Komponenten-Stylesheet.
- Globale Klassen nicht auf den Host einer Kind-Komponente setzen (deren `:host` gewinnt) und
  Namen vorher auf lokale Kollisionen prüfen.
- Kein `min-height: 100vh` in Seiten – `.seite` füllt den Platz zwischen Header und Footer.
- Budget `anyComponentStyle` 4 kB / 8 kB **nicht** anheben; stattdessen schneiden oder teilen.

## Architekturgrenzen

Im Lint-Gate erzwungen (`eslint-plugin-boundaries`, #320), Details:
`docs/quality/frontend-architektur-tests.md`.

- `pages` → `auth`/`core`/`shared`/`ui`, **nie** eine andere Seite. Gemeinsames gehört nach
  `shared` (Typen, reine Funktionen), `core` (Services, z. B. `core/api`) oder `ui` (Bausteine).
- `ui` → nur `shared` (Daten per Input, keine Services). `core` → `shared`. `auth` → `core`/`shared`.
- Über Schichtgrenzen per Alias importieren: `@auth/…`, `@core/…`, `@shared/…`, `@ui/…` – keine
  `../../shared`-Ketten. Neue HTTP-Zugriffe nur in einem Service, nie per `HttpClient` in der Seite.

## Linting

`eslint.config.js` fährt `typescript-eslint` **strict-type-checked** plus
`stylistic-type-checked` und `angular-eslint` (inkl. Template-Accessibility).
`eslint-config-prettier` steht zuletzt: Formatierung macht Prettier, nicht ESLint.

- Kein `any`, keine unnötigen Casts. Wenn ein Typ nicht passt, ist meist das Modell falsch.
- `@typescript-eslint`-Regeln nicht per `eslint-disable` stillstellen, ohne den Grund als
  Kommentar danebenzuschreiben.
- Selektoren: Komponenten `app-` (kebab-case), Direktiven `app` (camelCase).

## Sprache

UI-Texte, Kommentare und Testnamen auf **Deutsch** – wie im restlichen Projekt.
