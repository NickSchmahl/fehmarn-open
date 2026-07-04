import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['zone.js', '<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/main.ts'],
  coverageReporters: ['text-summary', 'lcov'],
  // Baseline-first (gemessen 2026-07-04): knapp unter Ist-Wert, danach schrittweise anheben.
  // Ist: Stmts 75.7 / Branch 52.4 / Funcs 64.8 / Lines 76.7
  coverageThreshold: {
    global: {
      statements: 73,
      branches: 50,
      functions: 62,
      lines: 74,
    },
  },
};

export default config;
