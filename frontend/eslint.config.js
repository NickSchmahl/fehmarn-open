// @ts-check
// Strenge ESLint-Flat-Config (Issue #44).
// - TypeScript: typescript-eslint strict-type-checked + stylistic-type-checked (typ-basiert)
// - Angular: angular-eslint (TS + Template inkl. Accessibility)
// - eslint-config-prettier zuletzt: deaktiviert Formatregeln (Formatierung macht Prettier, #45)
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');
const boundaries = require('eslint-plugin-boundaries');

// Architekturgrenzen (#46, scharf geschaltet in #320). Schichten unter src/app, Begründung und
// Regeln: docs/quality/frontend-architektur-tests.md. Jede Seite unter pages/ ist ein eigenes
// Element – Importe zwischen zwei Seiten sind damit verboten, innerhalb einer Seite erlaubt.
const SCHICHTEN = [
  { type: 'pages', pattern: 'src/app/pages/*', capture: ['seite'] },
  { type: 'auth', pattern: 'src/app/auth' },
  { type: 'core', pattern: 'src/app/core' },
  { type: 'shared', pattern: 'src/app/shared' },
  { type: 'ui', pattern: 'src/app/ui' },
  // Zuletzt: was keiner Schicht angehört, ist die App-Wurzel (app.ts, app.routes.ts, app.config.ts).
  { type: 'app', pattern: 'src/app' },
];

/** Wer darf wen importieren (alles andere ist verboten). */
const ERLAUBT = {
  app: ['app', 'pages', 'auth', 'core', 'shared', 'ui'], // Wurzel: Routen, Config, Shell
  pages: ['auth', 'core', 'shared', 'ui'],
  auth: ['core', 'shared'],
  core: ['shared'],
  ui: ['shared'],
  shared: [],
};

module.exports = tseslint.config(
  {
    // Generiertes/nicht-lintbares ausschließen
    ignores: ['dist/', 'coverage/', '.angular/', 'jest.config.ts'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      // Angular-typische, bewusst zugelassene Muster (streng, aber praxisgerecht):
      // - statische Validatoren (Validators.required) werden absichtlich unbound übergeben
      '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
      // - Zahlen in Template-Literalen (z.B. IDs in URLs) sind erlaubt
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // - leere, mit @Component/@Directive dekorierte Klassen sind gültig
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': SCHICHTEN,
      'boundaries/include': ['src/app/**/*.ts'],
      // Löst die Pfad-Aliase (@core/…, @shared/… aus tsconfig.json) zu Dateien auf.
      'import/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // Fremdpakete (@angular/…, rxjs) und Importe innerhalb desselben Elements sind frei.
            { allow: { to: { module: { origin: 'external' } } } },
            { allow: { dependency: { relationship: { to: 'internal' } } } },
            ...Object.entries(ERLAUBT).map(([von, ziele]) => ({
              from: { element: { type: von } },
              allow: { to: { element: { types: { anyOf: ziele } } } },
            })),
          ],
        },
      ],
      // Keine Relativpfade über Schichtgrenzen – dafür gibt es die Pfad-Aliase.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(\\.\\./)+(auth|core|shared|ui|pages)(/|$)',
              message:
                'Über Schichtgrenzen per Pfad-Alias importieren (@auth/, @core/, @shared/, @ui/), nicht per ../-Kette.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
      eslintConfigPrettier,
    ],
    rules: {},
  },
  {
    // Testdateien: idiomatische Muster (leere Mock-Handler, ungebundene Methoden-
    // Referenzen in Matchern, bewusst „unsichere" Zugriffe auf gemockte Fehlerobjekte)
    // würden strenge typbasierte Regeln fluten. Produktivcode bleibt voll streng.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
