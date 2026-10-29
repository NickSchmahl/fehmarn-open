# Frontend – Code-Qualität: Linting & Formatierung

> **Ist-Stand (umgesetzt):** Strenges **ESLint** (#44, Flat-Config,
> `strict-type-checked` + angular-eslint) und **Prettier als CI-Gate** (#45) sind
> aktiv; beide laufen im `frontend`-Job (`npm run lint`, `format:check`). Stack per
> 2026-07-05: **Angular 22, TypeScript 6, ESLint 10, jest-preset-angular 17**
> (siehe [changelog.md](../changelog.md)). Der Rest dieses Dokuments ist das
> ursprüngliche Zielbild und bleibt als Referenz/Begründung stehen.

## 1. Formatierung – Prettier

**Ist** (`frontend/.prettierrc`): `printWidth: 100`, `singleQuote: true`,
HTML-Parser für Templates. Läuft **nicht** in CI.

**Zielbild:**
- `prettier --check` wird **CI-Gate** (bricht bei Formatabweichung).
- `.prettierignore` für generierte Artefakte (`dist/`, `coverage/`, `.angular/`).
- Konfig leicht ergänzen für Determinismus:

```jsonc
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

- Scripts:
```json
"format": "prettier --write \"src/**/*.{ts,html,scss,json}\"",
"format:check": "prettier --check \"src/**/*.{ts,html,scss,json}\""
```

## 2. Linting – angular-eslint + typescript-eslint (sofort streng)

Moderner Flat-Config-Ansatz (`eslint.config.js`), Setup per
`ng add @angular-eslint/schematics`.

**Regelsätze (streng):**
- `typescript-eslint` **`strict-type-checked`** + **`stylistic-type-checked`**
  (nutzt den Typechecker → findet echte Bugs, nicht nur Stil).
- `@angular-eslint` `recommended` + Template-Regeln (`recommended` + `accessibility`).
- `eslint-config-prettier` zuletzt, damit ESLint keine Formatregeln erzwingt
  (das macht Prettier).

**Zielbild `eslint.config.js` (Skizze):**
```js
export default tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: { parserOptions: { projectService: true } },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector':
        [{ type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector':
        [{ type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
  eslintConfigPrettier,
);
```

- Scripts: `"lint": "ng lint"` bzw. `"lint": "eslint ."`.
- CI-Gate: `npm run lint` muss grün sein (siehe [ci-cd.md](ci-cd.md)).

## 3. TypeScript-Strenge (Ist: bereits gut)

`tsconfig.json` ist schon streng: `strict`, `noImplicitOverride`,
`noPropertyAccessFromIndexSignature`, `noImplicitReturns`,
`noFallthroughCasesInSwitch`, plus `strictTemplates`, `strictInjectionParameters`,
`strictInputAccessModifiers`. **Beibehalten.** Ergänzen (Zielbild):
`noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`.

## 4. Aufräumen
- Leerer/Alter Ordner `frontend/src/app/tmp/` entfernen (steht im Backlog).
- Ungenutzte Dev-Dependency prüfen: `vitest` ist installiert, Tests laufen aber über
  **Jest** – klären, ob `vitest` raus kann (verwirrt sonst über die Testinfrastruktur).

## 5. Styles – globale Bausteine, Komponenten-Budget (#126)

**Wo liegt was?**

| Ort | Inhalt |
|-----|--------|
| `src/styles/_tokens.scss` | **Einzige** Quelle der Design-Tokens (`--bg`, `--surface`, `--text-muted`, `--accent`, `--danger`, `--radius` …) auf `:root`. Komponenten definieren **keine** eigenen Tokens. |
| `src/styles/_seite.scss` | `.seite` (Rasterhintergrund, füllt den Platz zwischen Header und Footer), `.seiten-karte`, `.section-title` |
| `src/styles/_feedback.scss` | `.hinweis`, `.alert-error` (+ `--formular`), `.state-row`, `.spinner` |
| `src/styles/_formular.scss` | `.field-*`-Primitives, `.submit-btn` |
| `src/styles/_rechtstext.scss`, `_export-druck.scss` | Impressum/Datenschutz-Layout, Druckregeln der Export-PDFs |
| `src/app/shared/druck/_druck.scss` | Mixins für die Druckansichten (per `@use`, erzeugt selbst kein CSS) |
| Komponenten-Stylesheet | alles Seitenspezifische: Layout, Abstände, `max-width`, eigene Elemente |

**Regeln**

- **Global nur echte Bausteine**, die auf den Tokens aufbauen und von mindestens zwei Seiten
  genutzt werden. Die Komponente kombiniert sie mit einer eigenen Klasse für ihre Abweichungen
  (`class="seiten-karte login-card"`); die lokale Regel gewinnt automatisch, weil Angular sie
  um ein Attribut ergänzt (höhere Spezifität).
- **Teilen per globaler Klasse, nicht per Mixin.** Ein `@include` erzeugt das CSS in jeder
  Komponente neu – das Budget wird davon nicht kleiner. `@use` nur für Mixins/Variablen ohne
  eigene Ausgabe (wie `_druck.scss`).
- **Keine globale Klasse auf den Host einer Kind-Komponente** (z. B. `<app-brand-icon class="…">`):
  dort gewinnt das `:host`-Styling der Kind-Komponente gegen die gleich spezifische globale
  Klasse. Solche Klassen bleiben lokal (Beispiel: `.brand-logo`).
- **Globale Namen kollisionsfrei wählen.** Vor dem Anlegen einer globalen Klasse prüfen, dass
  keine Komponente den Namen schon lokal nutzt – sonst greift die globale Regel dort mit
  (passiert beim Umbau mit `.karte` in der Export-Karte, deshalb `.seiten-karte`).
- **Kein `min-height: 100vh` in Seiten.** `app-main` ist bereits eine Flex-Spalte über die
  volle Höhe; `.seite` füllt den Rest. Ein eigenes `100vh` macht die Seite um Header + Footer
  zu hoch.

**Budget** (`angular.json`, `anyComponentStyle`): Warnung **4 kB**, Fehler **8 kB**. Wird es
knapp, ist die Antwort ein Komponentenschnitt oder ein globaler Baustein – nicht ein höheres
Budget. Stand nach #126: Teilnehmer (~4,9 kB, Schnitt in #317), Flyer (~6,6 kB, reines
Seitendesign) und Turniertag-Druck (~5,2 kB, Drucklayout) liegen über der Warnschwelle.

**Regressionscheck bei Style-Umbauten:** Screenshots vorher/nachher (Playwright, gemockte
`/api`, Desktop + Mobil) und Pixel-Diff. Unterschiede von 1–2 Farbstufen sind Render-Rauschen,
alles darüber erklären oder beheben.

## Architekturregeln
Import-Grenzen (welche Schicht darf welche importieren) sind ein eigenes Thema:
[frontend-architektur-tests.md](frontend-architektur-tests.md).

## Coverage
Jest-Schwellen: [coverage.md](coverage.md).

Umsetzungstickets: **GitHub #44** (ESLint), **#45** (Prettier-Gate). Übersicht: [quality-roadmap.md](../tickets/quality-roadmap.md).
