# Frontend – Code-Qualität: Linting & Formatierung

Größte Lücke im Projekt: **Es gibt aktuell kein ESLint.** Prettier existiert, wird
aber **in CI nicht geprüft**. Zielbild: sofort strenges Linting + erzwungene
Formatierung. Nichts davon ist umgesetzt (außer als „Ist" markiert).

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

## Architekturregeln
Import-Grenzen (welche Schicht darf welche importieren) sind ein eigenes Thema:
[frontend-architektur-tests.md](frontend-architektur-tests.md).

## Coverage
Jest-Schwellen: [coverage.md](coverage.md).

Umsetzungstickets: **GitHub #44** (ESLint), **#45** (Prettier-Gate). Übersicht: [quality-roadmap.md](../tickets/quality-roadmap.md).
