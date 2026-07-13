# Seiten-Titel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jede Seite im Frontend bekommt einen sprechenden Browser-Tab-Titel statt des generischen Angular-CLI-Defaults `FehmarnopenFrontend`.

**Architecture:** Statisches `title`-Property an jedem Route-Eintrag in `app.routes.ts` (Angular-Router-Boardmittel, setzt `document.title` automatisch bei Navigation). Statischer Basis-`<title>` in `index.html` für den initialen Ladezustand. Entfernen des ungenutzten `title`-Signals in `app.ts`.

**Tech Stack:** Angular (Standalone Components, Router `title`-Property), Jest.

## Global Constraints

- Titel-Schema: `12. Fehmarn Open 2027 – <Seitenname>`, Flyer-/Startseite ohne Suffix nur `12. Fehmarn Open 2027`.
- Vor dem Commit die volle Quality-Gate lokal laufen lassen: im Verzeichnis `frontend` `npm run lint`, `npm run test`, `npm run format:check`.
- Echte Umlaute (ä/ö/ü/ß) in Kommentaren und Bezeichnern verwenden, nicht ae/oe/ue.
- Kein `git add -A`, nur die konkret geänderten Dateien stagen.
- PR-Body später mit englischem `Closes #187`.

---

### Task 1: Route-Titel setzen + Basis-Titel in index.html

**Files:**
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/index.html:5`
- Test: `frontend/src/app/app.routes.spec.ts` (neu)

**Interfaces:**
- Produces: `routes` (weiterhin `Routes`-Array aus `app.routes.ts`, jetzt mit `title`-Property pro Objekt-Route außer den beiden `redirectTo`-Einträgen).

- [ ] **Step 1: Test schreiben, der die erwarteten Titel pro Route prüft**

Datei `frontend/src/app/app.routes.spec.ts` neu anlegen:

```ts
import { routes } from './app.routes';

describe('routes', () => {
  const erwarteteTitelProPfad: Record<string, string> = {
    anmeldung: '12. Fehmarn Open 2027 – Anmeldung',
    teilnehmer: '12. Fehmarn Open 2027 – Teilnehmer',
    flyer: '12. Fehmarn Open 2027',
    impressum: '12. Fehmarn Open 2027 – Impressum',
    datenschutz: '12. Fehmarn Open 2027 – Datenschutz',
    'admin/login': '12. Fehmarn Open 2027 – Admin-Login',
  };

  it.each(Object.entries(erwarteteTitelProPfad))(
    'setzt für Route "%s" den Titel "%s"',
    (pfad, erwarteterTitel) => {
      const route = routes.find((eintrag) => eintrag.path === pfad);
      expect(route?.title).toBe(erwarteterTitel);
    },
  );
});
```

- [ ] **Step 2: Test ausführen und Fehlschlag verifizieren**

Run: `cd frontend && npx jest app.routes.spec.ts`
Expected: FAIL — alle sechs Fälle schlagen fehl, da `route?.title` aktuell `undefined` ist.

- [ ] **Step 3: `title`-Property pro Route in `app.routes.ts` ergänzen**

`frontend/src/app/app.routes.ts` komplett ersetzen durch:

```ts
import { Routes } from '@angular/router';
import { AdminLoginComponent } from './pages/login/login.component';

const BASISTITEL = '12. Fehmarn Open 2027';

export const routes: Routes = [
  { path: '', redirectTo: 'flyer', pathMatch: 'full' },
  {
    path: 'anmeldung',
    title: `${BASISTITEL} – Anmeldung`,
    loadComponent: () =>
      import('./pages/anmeldung/anmeldung.component').then((m) => m.AnmeldungComponent),
  },
  {
    path: 'teilnehmer',
    title: `${BASISTITEL} – Teilnehmer`,
    loadComponent: () => import('./pages/teilnehmer/teilnehmer').then((m) => m.Teilnehmer),
  },
  {
    path: 'flyer',
    title: BASISTITEL,
    loadComponent: () => import('./pages/flyer/flyer').then((m) => m.Flyer),
  },
  {
    path: 'impressum',
    title: `${BASISTITEL} – Impressum`,
    loadComponent: () => import('./pages/impressum/impressum').then((m) => m.Impressum),
  },
  {
    path: 'datenschutz',
    title: `${BASISTITEL} – Datenschutz`,
    loadComponent: () => import('./pages/datenschutz/datenschutz').then((m) => m.Datenschutz),
  },
  {
    path: 'admin/login',
    title: `${BASISTITEL} – Admin-Login`,
    component: AdminLoginComponent,
  },
  { path: '**', redirectTo: 'flyer' },
];
```

- [ ] **Step 4: Basis-Titel in `index.html` setzen**

In `frontend/src/index.html:5` ändern:

```html
    <title>12. Fehmarn Open 2027</title>
```

(ersetzt `<title>FehmarnopenFrontend</title>`)

- [ ] **Step 5: Test ausführen und Erfolg verifizieren**

Run: `cd frontend && npx jest app.routes.spec.ts`
Expected: PASS — alle sechs Fälle grün.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/app.routes.ts frontend/src/app/app.routes.spec.ts frontend/src/index.html
git commit -m "#187 Sprechende Seiten-Titel statt generischem Angular-Default"
```

---

### Task 2: Ungenutztes title-Signal aus app.ts entfernen

**Files:**
- Modify: `frontend/src/app/app.ts:1-21`

**Interfaces:**
- Consumes: keine (Signal war bereits ungenutzt, kein Consumer in `app.html` oder Tests).

- [ ] **Step 1: Signal und ungenutzten Import entfernen**

`frontend/src/app/app.ts` — Zeile 1 und Zeile 15 anpassen, sodass die Datei so aussieht:

```ts
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ToastComponent } from './ui/toast/toast.component';
import { BrandIconComponent } from './ui/brand-icon/brand-icon.component';
import { AuthService } from './auth/service/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, BrandIconComponent],
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
```

- [ ] **Step 2: Bestehende Tests ausführen und Erfolg verifizieren**

Run: `cd frontend && npx jest app.spec.ts`
Expected: PASS — alle drei bestehenden Fälle weiterhin grün (kein Test referenziert `title`).

- [ ] **Step 3: Volle Quality-Gate lokal laufen lassen**

Run:
```bash
cd frontend && npm run lint && npm run test && npm run format:check
```
Expected: alle drei Befehle laufen fehlerfrei durch (kein `no-unused-vars` mehr für `signal`, keine Formatierungsabweichungen).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/app.ts
git commit -m "#187 Ungenutztes title-Signal aus App-Komponente entfernen"
```
