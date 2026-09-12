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
