# Frontend – Architekturtests (Import-Grenzen)

Das Angular-Frontend hat eine klare Schichtung (`pages`, `core`, `auth`, `shared`,
`ui`). Ohne erzwungene Grenzen zerfasert diese Struktur schleichend (Seite importiert
Seite, UI-Komponente greift auf Service zu …). Architekturregeln halten die Grenzen
maschinell – das Frontend-Pendant zu ArchUnit im Backend.

Zwei sich ergänzende Werkzeuge:

## Option A – `eslint-plugin-boundaries` (import-level, in ESLint)
Integriert sich in die bestehende ESLint-Konfiguration. Definiert „Element-Typen"
und erlaubte Abhängigkeiten. Vorteil: läuft im selben `npm run lint`-Gate.

## Option B – `dependency-cruiser` (modul-graph, separat)
Analysiert den kompletten Abhängigkeitsgraphen, findet Zyklen, kann Graph
visualisieren. Vorteil: mächtigere Graph-/Zyklus-Regeln, eigener Report.

**Empfehlung:** `eslint-plugin-boundaries` als Pflicht-Gate (einfach, im Lint-Lauf) +
`dependency-cruiser` optional für Zyklenprüfung und Visualisierung.

## Ist-Schichtung (aus `frontend/src/app`)

```
pages/      (anmeldung, teilnehmer, login, flyer)  – Feature-Seiten, geroutet
  │  darf nutzen ↓
core/       (interceptors, services: toast, error)  – app-weite Querschnittslogik
auth/       (guard, interceptor, service)            – Authentifizierung
shared/     (disziplin-modell)                       – geteilte Modelle/Utilities
ui/         (toast-component)                        – präsentationale Bausteine
```

## Regeln, die erzwungen werden sollen

- **`pages/*` importieren sich nicht gegenseitig.** Jede Seite ist unabhängig;
  Gemeinsames wandert nach `shared`/`core`/`ui`.
- **`ui/` importiert keine Services** aus `core`/`auth` (präsentational, „dumm";
  Daten kommen per `@Input`).
- **`shared/` importiert nichts aus `pages`/`core`/`auth`** (unterste, abhängigkeitsarme Schicht).
- **`core/` und `auth/` importieren keine `pages`** (Querschnitt hängt nicht an Features).
- **Keine tiefen Relativpfad-Importe** über Schichtgrenzen (`../../../pages/...`) –
  Pfad-Aliase statt zerbrechlicher `../`-Ketten.
- **Keine Zyklen** im Modulgraphen (dependency-cruiser).

## Skizze `eslint-plugin-boundaries`

```js
settings: {
  'boundaries/elements': [
    { type: 'pages',  pattern: 'src/app/pages/*' },
    { type: 'core',   pattern: 'src/app/core/*' },
    { type: 'auth',   pattern: 'src/app/auth/*' },
    { type: 'shared', pattern: 'src/app/shared/*' },
    { type: 'ui',     pattern: 'src/app/ui/*' },
  ],
},
rules: {
  'boundaries/element-types': ['error', {
    default: 'disallow',
    rules: [
      { from: 'pages',  allow: ['core', 'auth', 'shared', 'ui'] },
      { from: 'core',   allow: ['shared'] },
      { from: 'auth',   allow: ['core', 'shared'] },
      { from: 'ui',     allow: ['shared'] },
      { from: 'shared', allow: [] },
    ],
  }],
  'boundaries/no-private': 'error',
}
```

## Skizze `dependency-cruiser` (Zyklen + Orphans)

```js
forbidden: [
  { name: 'no-circular', severity: 'error',
    from: {}, to: { circular: true } },
  { name: 'no-orphans', severity: 'warn',
    from: { orphan: true, pathNot: '\\.spec\\.ts$' }, to: {} },
],
```

## Einführung (Big-Bang)
Setzt ESLint voraus ([frontend-code-qualitaet.md](frontend-code-qualitaet.md)).
Regeln sofort als `error`, evtl. nötige Umstrukturierungen (z.B. geteilter Code aus
`pages` nach `shared`) im selben PR. Danach CI-Gate scharf.

Ticket: **GitHub #46** (Übersicht: [quality-roadmap.md](../tickets/quality-roadmap.md)).
