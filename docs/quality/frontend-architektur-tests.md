# Frontend – Architekturtests (Import-Grenzen)

Das Angular-Frontend ist in Schichten geschnitten (`pages`, `auth`, `core`, `shared`, `ui`).
Ohne erzwungene Grenzen zerfasert diese Struktur schleichend (Seite importiert Seite,
UI-Komponente greift auf einen Service zu …). Die Grenzen werden deshalb **maschinell im
Lint-Gate** geprüft – das Frontend-Pendant zu ArchUnit im Backend.

> **Stand:** scharf seit #320 (Nachzug zu #46, das als erledigt geschlossen war, auf `main` aber
> nie existierte). Werkzeug: [`eslint-plugin-boundaries`](https://www.jsboundaries.dev/) in
> `frontend/eslint.config.js`, Regeln als `error` → `npm run lint` bricht, CI ebenso.

## Schichten (`frontend/src/app`)

```
app.ts, app.routes.ts, app.config.ts  – Wurzel: Shell, Routen, Provider
pages/<seite>/   – geroutete Seiten (anmeldung, teilnehmer, admin-teilnehmer, export, …)
                   inkl. seiteneigener Services/Logik/Komponenten in Unterordnern
auth/            – Login-Status, Guard, Interceptor
core/            – app-weite Querschnittslogik: API-Services (core/api), HTTP-Fehler,
                   Toast-/Download-Services
shared/          – Modelle/DTO-Typen und reine Funktionen (keine Angular-Abhängigkeit nötig)
ui/              – präsentationale Bausteine (Toast, Disziplin-Filter, Brand-Icon, …)
```

## Regeln (erzwungen)

| Von ↓ darf importieren → | app | pages | auth | core | shared | ui |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| **app** (Wurzel) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **pages** | – | nur die **eigene** Seite | ✅ | ✅ | ✅ | ✅ |
| **auth** | – | – | ✅ | ✅ | ✅ | – |
| **core** | – | – | – | ✅ | ✅ | – |
| **ui** | – | – | – | – | ✅ | ✅ |
| **shared** | – | – | – | – | ✅ | – |

- **Seiten importieren sich nicht gegenseitig.** Jede Seite unter `pages/` ist ein eigenes
  Element; was zwei Seiten brauchen, wandert nach `shared`/`core`/`ui` (Beispiel #317:
  `ui/disziplin-filter`, `core/api/AdminTeilnehmerApiService`).
- **`ui/` kennt keine Services.** Daten kommen per Input, Ereignisse gehen per Output. Der Toast
  bekommt seine Liste deshalb von der App-Wurzel (`<app-toast [toasts]="toasts()" />`).
- **`shared/` ist die unterste Schicht** und importiert keine andere.
- Fremdpakete (`@angular/…`, `rxjs`) und Importe innerhalb desselben Elements sind frei.

### Pfad-Aliase statt `../`-Ketten

Über Schichtgrenzen wird per Alias importiert (`tsconfig.json` → `paths`, für Jest gespiegelt in
`jest.config.ts` → `moduleNameMapper`):

```ts
import { AuthService } from '@auth/service/auth.service';
import { ToastService } from '@core/services/toast.service';
import { disziplinLabel } from '@shared/disziplin';
import { ToastComponent } from '@ui/toast/toast.component';
```

Relativpfade bleiben für Importe **innerhalb** einer Schicht bzw. Seite (`./`, `../model/…`).
Ein Relativpfad, der in eine Schicht hineinzeigt (`../../shared/…`), bricht den Lint
(`no-restricted-imports`). Für Seiten gibt es bewusst keinen Alias – nur die Routen importieren sie.

## Konfiguration (Auszug `eslint.config.js`)

```js
const SCHICHTEN = [
  { type: 'pages', pattern: 'src/app/pages/*', capture: ['seite'] },
  { type: 'auth', pattern: 'src/app/auth' },
  { type: 'core', pattern: 'src/app/core' },
  { type: 'shared', pattern: 'src/app/shared' },
  { type: 'ui', pattern: 'src/app/ui' },
  { type: 'app', pattern: 'src/app' }, // zuletzt: alles übrige = Wurzel
];
// 'boundaries/dependencies': default 'disallow' + je Schicht eine allow-Policy (Tabelle oben);
// 'import/resolver': typescript → löst die Aliase auf.
```

## Verifikation

Bei Einführung (#320) wurden absichtliche Verstöße angelegt und wieder entfernt: Seite → andere
Seite, `ui` → `core`, `shared` → `ui`/`auth`, `core` → `auth`/`pages` sowie ein `../../shared`-Import
– alle acht brachen den Lint, eine Datei mit erlaubten Importen aus allen Schichten blieb grün.
Wer die Regeln ändert, wiederholt diesen Gegentest.

## Offen

- **Zyklen im Modulgraphen** prüft noch nichts (`dependency-cruiser` mit `no-circular` wäre die
  Ergänzung). Die Schichtregeln verhindern Zyklen *zwischen* Schichten bereits; innerhalb einer
  Schicht sind sie theoretisch möglich.

Tickets: **#46** (Konzept), **#320** (scharf geschaltet). Übersicht:
[quality-roadmap.md](../tickets/quality-roadmap.md).
