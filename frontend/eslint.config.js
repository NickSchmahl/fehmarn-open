// @ts-check
// Strenge ESLint-Flat-Config (Issue #44).
// - TypeScript: typescript-eslint strict-type-checked + stylistic-type-checked (typ-basiert)
// - Angular: angular-eslint (TS + Template inkl. Accessibility)
// - eslint-config-prettier zuletzt: deaktiviert Formatregeln (Formatierung macht Prettier, #45)
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

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
