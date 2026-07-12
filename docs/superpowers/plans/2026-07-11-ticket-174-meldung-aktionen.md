# Ticket #174 — Meldung-Aktionen als Icon-Cluster — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In der Admin-Teilnehmerübersicht werden Anwesend- und Abmelden/Reaktivieren-Aktion als kompaktes Icon-Cluster dargestellt; Einzelmeldungen verlieren die redundante Kopfzeile, und der anwesend-Status wird an der Zeile farblich sichtbar.

**Architecture:** Eine neue, präsentationale Standalone-Komponente `app-meldung-aktionen` (`ui/meldung-aktionen/`) kapselt die zwei Icon-Buttons. Sie nimmt Primitive (`anwesend`, `abgemeldet`) als Inputs und meldet `toggleAnwesenheit`/`abmelden`/`reaktivieren` als Outputs — kennt weder `id` noch HTTP. Die Seite `teilnehmer` bindet sie an zwei Stellen ein: in der Team-Kopfzeile (Team-Meldung) und direkt in der Spielerzeile (Einzelmeldung, ohne Kopfzeile).

**Tech Stack:** Angular 22 (Standalone-Components, Signal-`input()`/`output()`, `@if`/`@for` control flow), Jest + jest-preset-angular, ESLint, Prettier.

## Global Constraints

- Angular 22, Standalone-Components; neue Inputs/Outputs mit Signal-API `input.required<T>()` / `output<T>()` (nicht `@Input`/`@Output`).
- Alle npm-Befehle laufen im Verzeichnis `frontend/`.
- Quality-Gate vor **jedem** Commit (aus `frontend/`): `npm run lint` **und** `npm test` **und** `npm run format:check` müssen grün sein. Bei Formatabweichung vorher `npm run format` laufen lassen.
- Echte Umlaute (ä/ö/ü/ß) auch in Kommentaren, nicht ae/oe/ue.
- Component-Tests über echte DOM-Klicks, nicht über direkte Methodenaufrufe.
- Design-Tokens verwenden (`--success`, `--danger`, `--accent`, `--surface`, `--border`, `--text-muted`, `--radius`, `--success-dim`, `--danger-dim`) — keine Hex-Literale außer den bereits im Repo etablierten rgba-Akzenten.
- Kein Force-Push/Amend auf gepushten Branches; jede Korrektur als neuer Commit.
- Backend/API und der öffentliche (nicht-Admin) Modus bleiben unverändert.

---

## File Structure

- `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.ts` — Komponentenklasse, Inputs/Outputs.
- `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.html` — Template mit den zwei Icon-Buttons (Inline-SVG).
- `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.scss` — gekapseltes Icon-Button-Styling.
- `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.spec.ts` — Unit-Tests der Komponente.
- `frontend/src/app/pages/teilnehmer/teilnehmer.ts` — Import + `imports`-Array der Komponente (modifizieren).
- `frontend/src/app/pages/teilnehmer/teilnehmer.html` — Team-Kopfzeile nur noch bei Teamname; Einzelmeldung mit Aktionen in der Zeile (modifizieren).
- `frontend/src/app/pages/teilnehmer/teilnehmer.scss` — `--anwesend`-Highlight-Klassen (modifizieren).
- `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` — bestehende Aktions-Tests auf neue Selektoren umstellen + neue Tests (modifizieren).

---

## Task 1: Komponente `app-meldung-aktionen`

**Files:**
- Create: `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.ts`
- Create: `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.html`
- Create: `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.scss`
- Test: `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.spec.ts`

**Interfaces:**
- Consumes: nichts (erste Task).
- Produces:
  - Klasse `MeldungAktionenComponent`, Selektor `app-meldung-aktionen`.
  - Inputs: `anwesend: boolean` (required), `abgemeldet: boolean` (required).
  - Outputs: `toggleAnwesenheit: OutputEmitterRef<boolean>`, `abmelden: OutputEmitterRef<void>`, `reaktivieren: OutputEmitterRef<void>`.
  - Stabile CSS-Selektoren für Tests/Einbindung: `.ma-btn--anwesend`, `.ma-btn--anwesend-aktiv`, `.ma-btn--abmelden`, `.ma-btn--reaktivieren`.

- [ ] **Step 1: Failing Test schreiben**

Datei `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeldungAktionenComponent } from './meldung-aktionen.component';

function createFixture(
  anwesend: boolean,
  abgemeldet: boolean,
): ComponentFixture<MeldungAktionenComponent> {
  const fixture = TestBed.createComponent(MeldungAktionenComponent);
  fixture.componentRef.setInput('anwesend', anwesend);
  fixture.componentRef.setInput('abgemeldet', abgemeldet);
  fixture.detectChanges();
  return fixture;
}

describe('MeldungAktionenComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeldungAktionenComponent],
    }).compileComponents();
  });

  it('zeigt den Anwesend-Toggle mit aria-pressed=false, wenn nicht anwesend', () => {
    const fixture = createFixture(false, false);
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.ma-btn--anwesend');
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
    expect(btn?.getAttribute('aria-label')).toBe('Als anwesend markieren');
  });

  it('markiert den Anwesend-Toggle als aktiv (aria-pressed=true), wenn anwesend', () => {
    const fixture = createFixture(true, false);
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.ma-btn--anwesend');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
    expect(btn?.classList.contains('ma-btn--anwesend-aktiv')).toBe(true);
    expect(btn?.getAttribute('aria-label')).toBe('Als abwesend markieren');
  });

  it('emittiert beim Klick den umgeschalteten Anwesend-Wert', () => {
    const fixture = createFixture(false, false);
    let emitted: boolean | undefined;
    fixture.componentInstance.toggleAnwesenheit.subscribe((wert) => (emitted = wert));
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.ma-btn--anwesend')
      ?.click();
    expect(emitted).toBe(true);
  });

  it('zeigt den Abmelden-Button, wenn nicht abgemeldet, und emittiert beim Klick', () => {
    const fixture = createFixture(false, false);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.ma-btn--reaktivieren')).toBeNull();
    const abmelden = root.querySelector<HTMLButtonElement>('.ma-btn--abmelden');
    expect(abmelden?.getAttribute('aria-label')).toBe('Abmelden');
    let gefeuert = false;
    fixture.componentInstance.abmelden.subscribe(() => (gefeuert = true));
    abmelden?.click();
    expect(gefeuert).toBe(true);
  });

  it('zeigt den Reaktivieren-Button, wenn abgemeldet, und emittiert beim Klick', () => {
    const fixture = createFixture(false, true);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.ma-btn--abmelden')).toBeNull();
    const reaktivieren = root.querySelector<HTMLButtonElement>('.ma-btn--reaktivieren');
    expect(reaktivieren?.getAttribute('aria-label')).toBe('Reaktivieren');
    let gefeuert = false;
    fixture.componentInstance.reaktivieren.subscribe(() => (gefeuert = true));
    reaktivieren?.click();
    expect(gefeuert).toBe(true);
  });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run (aus `frontend/`): `npx jest src/app/ui/meldung-aktionen`
Expected: FAIL — `Cannot find module './meldung-aktionen.component'`.

- [ ] **Step 3: Template anlegen**

Datei `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.html`:

```html
<div class="meldung-aktionen">
  <button
    type="button"
    class="ma-btn ma-btn--anwesend"
    [class.ma-btn--anwesend-aktiv]="anwesend()"
    [attr.aria-pressed]="anwesend()"
    [attr.aria-label]="anwesend() ? 'Als abwesend markieren' : 'Als anwesend markieren'"
    [title]="anwesend() ? 'Als abwesend markieren' : 'Als anwesend markieren'"
    (click)="toggleAnwesenheit.emit(!anwesend())"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>

  @if (abgemeldet()) {
    <button
      type="button"
      class="ma-btn ma-btn--reaktivieren"
      aria-label="Reaktivieren"
      title="Reaktivieren"
      (click)="reaktivieren.emit()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4 12a8 8 0 1 1 2.3 5.6M4 12V6m0 6h6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  } @else {
    <button
      type="button"
      class="ma-btn ma-btn--abmelden"
      aria-label="Abmelden"
      title="Abmelden"
      (click)="abmelden.emit()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M6 6l12 12M18 6L6 18"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  }
</div>
```

- [ ] **Step 4: Styles anlegen**

Datei `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.scss`:

```scss
/* Icon-Aktionen einer Admin-Meldung. Design-Tokens werden vom Einbettungskontext
   (teilnehmer :host) vererbt. */
:host {
  display: inline-flex;
}

.meldung-aktionen {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.ma-btn {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.ma-btn svg {
  display: block;
  width: 18px;
  height: 18px;
}

.ma-btn:hover {
  border-color: rgba(232, 197, 71, 0.28);
  color: var(--text);
}

/* Anwesend aktiv: grüner Akzent. */
.ma-btn--anwesend-aktiv {
  border-color: rgba(76, 175, 130, 0.5);
  background: var(--success-dim);
  color: var(--success);
}

/* Abmelden: Gefahren-Akzent beim Hover. */
.ma-btn--abmelden:hover {
  border-color: rgba(224, 92, 92, 0.4);
  background: var(--danger-dim);
  color: var(--danger);
}
```

- [ ] **Step 5: Komponentenklasse anlegen**

Datei `frontend/src/app/ui/meldung-aktionen/meldung-aktionen.component.ts`:

```ts
import { Component, input, output } from '@angular/core';

// Kompaktes Aktions-Cluster für eine Admin-Meldung: Anwesend-Toggle plus
// Abmelden/Reaktivieren als Icon-Buttons. Präsentational – kennt weder die
// Meldungs-id noch HTTP; die Seite verdrahtet die Events mit den Service-Calls.
@Component({
  selector: 'app-meldung-aktionen',
  standalone: true,
  templateUrl: './meldung-aktionen.component.html',
  styleUrl: './meldung-aktionen.component.scss',
})
export class MeldungAktionenComponent {
  readonly anwesend = input.required<boolean>();
  readonly abgemeldet = input.required<boolean>();

  readonly toggleAnwesenheit = output<boolean>();
  readonly abmelden = output<void>();
  readonly reaktivieren = output<void>();
}
```

- [ ] **Step 6: Tests laufen lassen, Erfolg prüfen**

Run (aus `frontend/`): `npx jest src/app/ui/meldung-aktionen`
Expected: PASS (5 Tests grün).

- [ ] **Step 7: Quality-Gate + Commit**

Run (aus `frontend/`):
```bash
npm run format
npm run lint
npm test
npm run format:check
```
Expected: alle grün.

```bash
git add frontend/src/app/ui/meldung-aktionen
git commit -m "#174 Icon-Cluster app-meldung-aktionen (Anwesend/Abmelden)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Einbindung in die Teilnehmer-Seite

**Files:**
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.ts:1-4` (Import) und `:111-117` (`imports`-Array)
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.html:61-121` (Team-Block-Struktur)
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.scss` (Highlight-Klassen ergänzen)
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` (Selektoren + neue Tests)

**Interfaces:**
- Consumes (aus Task 1): `MeldungAktionenComponent`, Selektor `app-meldung-aktionen`, Inputs `[anwesend]`/`[abgemeldet]`, Outputs `(toggleAnwesenheit)` (liefert `boolean`), `(abmelden)`, `(reaktivieren)`; CSS-Selektoren `.ma-btn--anwesend`, `.ma-btn--abmelden`, `.ma-btn--reaktivieren`.
- Bestehende Seiten-Methoden: `toggleAnwesenheit(id: number, anwesend: boolean)`, `abmelden(id: number)`, `reaktivieren(id: number)`.
- Produces: neue CSS-Klassen `.team-head--anwesend`, `.admin-row--anwesend`.

- [ ] **Step 1: Bestehende Aktions-Tests auf neue Selektoren umstellen (failing)**

In `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` den Test „Anwesend-Schalter feuert genau einen Request pro Meldung (Team-Klick)" (aktuell Zeilen 317–334) ersetzen durch:

```ts
  it('Anwesend-Schalter feuert genau einen Request pro Meldung (Team-Klick)', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const toggles = root.querySelectorAll('.ma-btn--anwesend');
    expect(toggles).toHaveLength(1); // genau ein Schalter je Meldung, nicht je Spieler

    (toggles[0] as HTMLButtonElement).click();

    const action = httpTesting.expectOne('/api/admin/anmeldung/5/anwesenheit');
    expect(action.request.method).toBe('PUT');
    expect(action.request.body).toEqual({ anwesend: true });
    action.flush(null);

    httpTesting.expectOne('/api/admin/teilnehmer').flush(adminResponse); // ein Reload
  });
```

Im Test „Abmelden-Button feuert einen POST pro Meldung" (aktuell Zeilen 336–349) die Selektor-Zeile

```ts
    root.querySelector<HTMLButtonElement>('.btn-danger')?.click();
```

ersetzen durch:

```ts
    root.querySelector<HTMLButtonElement>('.ma-btn--abmelden')?.click();
```

- [ ] **Step 2: Neue Tests für Einzelmeldung + Highlight ergänzen (failing)**

In `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` im `describe('Teilnehmer (admin)', …)` vor dessen schließender `});` (aktuell Zeile 391) einfügen:

```ts
  it('Einzelmeldung: keine Team-Kopfzeile, Aktionen sitzen in der Spielerzeile', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENEINZEL',
          anzahl: 1,
          meldungen: [
            {
              id: 7,
              teamName: null,
              anwesend: false,
              abgemeldet: false,
              spieler: [
                {
                  vorname: 'Anna',
                  nachname: 'Schmidt',
                  radikalId: 'AS-1',
                  initialen: null,
                  geburtsdatum: null,
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.team-head')).toBeNull(); // keine redundante Kopfzeile

    const row = root.querySelector('.admin-row') as HTMLElement;
    const toggle = row.querySelector<HTMLButtonElement>('.ma-btn--anwesend');
    expect(toggle).not.toBeNull();

    toggle?.click();
    const action = httpTesting.expectOne('/api/admin/anmeldung/7/anwesenheit');
    expect(action.request.method).toBe('PUT');
    expect(action.request.body).toEqual({ anwesend: true });
    action.flush(null);
    httpTesting.expectOne('/api/admin/teilnehmer').flush({ disziplinen: [] }); // Reload
  });

  it('anwesend hebt die Zeile farblich hervor (Team-Kopfzeile und Einzelzeile)', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/admin/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENDOPPEL',
          anzahl: 1,
          meldungen: [
            {
              id: 5,
              teamName: 'Team A',
              anwesend: true,
              abgemeldet: false,
              spieler: [
                {
                  vorname: 'Anna',
                  nachname: 'Schmidt',
                  radikalId: 'AS-1',
                  initialen: null,
                  geburtsdatum: null,
                },
              ],
            },
          ],
        },
        {
          disziplin: 'HERRENEINZEL',
          anzahl: 1,
          meldungen: [
            {
              id: 7,
              teamName: null,
              anwesend: true,
              abgemeldet: false,
              spieler: [
                {
                  vorname: 'Bert',
                  nachname: 'Adam',
                  radikalId: 'BA-2',
                  initialen: null,
                  geburtsdatum: null,
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.team-head')?.classList.contains('team-head--anwesend')).toBe(true);
    const einzelRow = Array.from(root.querySelectorAll('.admin-row')).find((z) =>
      z.textContent.includes('Bert Adam'),
    ) as HTMLElement;
    expect(einzelRow.classList.contains('admin-row--anwesend')).toBe(true);
  });
```

- [ ] **Step 3: Tests laufen lassen, Fehlschlag prüfen**

Run (aus `frontend/`): `npx jest src/app/pages/teilnehmer`
Expected: FAIL — u. a. `.ma-btn--anwesend` nicht gefunden / `.team-head` bei Einzelmeldung noch vorhanden.

- [ ] **Step 4: Komponente in `teilnehmer.ts` importieren**

In `frontend/src/app/pages/teilnehmer/teilnehmer.ts` nach den bestehenden Imports (nach Zeile 5) ergänzen:

```ts
import { MeldungAktionenComponent } from '../../ui/meldung-aktionen/meldung-aktionen.component';
```

Und das `imports`-Array (aktuell `imports: [],`, Zeile 114) ersetzen durch:

```ts
  imports: [MeldungAktionenComponent],
```

- [ ] **Step 5: Team-Block in `teilnehmer.html` umbauen**

In `frontend/src/app/pages/teilnehmer/teilnehmer.html` den Block von `<div class="team-block" …>` bis zum zugehörigen `</div>` (aktuell Zeilen 62–120) ersetzen durch:

```html
              <div
                class="team-block"
                [class.team-block--named]="meldung.teamName"
                [class.admin-row--abgemeldet]="meldung.abgemeldet"
              >
                @if (meldung.teamName) {
                  <div
                    class="team-head"
                    [class.team-head--abgemeldet]="meldung.abgemeldet"
                    [class.team-head--anwesend]="meldung.anwesend"
                  >
                    <span class="team-head-name">
                      {{ meldung.teamName }}
                      @if (meldung.abgemeldet) {
                        <span class="status-badge">abgemeldet</span>
                      }
                    </span>
                    <div class="team-head-actions">
                      <app-meldung-aktionen
                        [anwesend]="meldung.anwesend"
                        [abgemeldet]="meldung.abgemeldet"
                        (toggleAnwesenheit)="toggleAnwesenheit(meldung.id, $event)"
                        (abmelden)="abmelden(meldung.id)"
                        (reaktivieren)="reaktivieren(meldung.id)"
                      />
                    </div>
                  </div>
                }

                <ul class="admin-list">
                  @for (spieler of meldung.spieler; track $index) {
                    <li
                      class="admin-row"
                      [class.admin-row--anwesend]="!meldung.teamName && meldung.anwesend"
                    >
                      <span class="admin-name">
                        {{ spieler.vorname }} {{ spieler.nachname }}
                        @if (!spieler.radikalId) {
                          <span class="neu-anlegen-badge">ID neu anlegen</span>
                        }
                      </span>
                      <span class="admin-radikal-id">
                        @if (spieler.radikalId) {
                          {{ spieler.radikalId }}
                        } @else {
                          {{ anlageGrundlage(spieler) }}
                        }
                      </span>
                      @if (!meldung.teamName) {
                        <app-meldung-aktionen
                          [anwesend]="meldung.anwesend"
                          [abgemeldet]="meldung.abgemeldet"
                          (toggleAnwesenheit)="toggleAnwesenheit(meldung.id, $event)"
                          (abmelden)="abmelden(meldung.id)"
                          (reaktivieren)="reaktivieren(meldung.id)"
                        />
                      }
                    </li>
                  }
                </ul>
              </div>
```

Hinweis: Eine Einzelmeldung (kein Teamname) hat genau einen Spieler, also entsteht genau ein Aktions-Cluster in genau einer Zeile.

- [ ] **Step 6: Highlight-Klassen in `teilnehmer.scss` ergänzen**

In `frontend/src/app/pages/teilnehmer/teilnehmer.scss` direkt nach dem Block `.team-head--abgemeldet { … }` (aktuell Zeilen 335–337) einfügen:

```scss
/* Anwesend: dezenter grüner Akzent an der Kopfzeile – analog zur abgemeldet-Kennzeichnung,
   stapelbar mit dieser (grüner Grund + gedimmt bleibt unterscheidbar). */
.team-head--anwesend {
  border-radius: var(--radius);
  background: var(--success-dim);
  box-shadow: inset 2px 0 0 var(--success);
}
```

Und direkt nach dem Block `.admin-row--abgemeldet .admin-name { … }` (aktuell Zeilen 377–379) einfügen:

```scss
/* Anwesend: gleiche grüne Kennzeichnung für die Einzelmeldungs-Zeile. */
.admin-row--anwesend {
  border-color: rgba(76, 175, 130, 0.4);
  background: var(--success-dim);
  box-shadow: inset 2px 0 0 var(--success);
}
```

- [ ] **Step 7: Tests laufen lassen, Erfolg prüfen**

Run (aus `frontend/`): `npx jest src/app/pages/teilnehmer`
Expected: PASS (bestehende + zwei neue Admin-Tests grün).

- [ ] **Step 8: Voller Testlauf + Quality-Gate**

Run (aus `frontend/`):
```bash
npm run format
npm run lint
npm test
npm run format:check
```
Expected: alle grün (gesamte Suite, inkl. Task-1-Komponente).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/app/pages/teilnehmer
git commit -m "#174 Icon-Aktionen in Team-Kopfzeile + Einzelzeile, Anwesend-Highlight

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Manuelle Sichtprüfung + Doku

**Files:**
- Modify (optional): `frontend/src/app/pages/teilnehmer/teilnehmer.scss` — nur falls die Sichtprüfung Layout-Overlaps auf schmalen Viewports zeigt.

**Interfaces:**
- Consumes: das fertige UI aus Task 1 + 2.
- Produces: bestätigtes Verhalten laut Akzeptanzkriterien.

- [ ] **Step 1: App starten und als Admin einloggen**

Run (aus `frontend/`): `npm start`
Danach im Browser als Admin anmelden und `/teilnehmer` öffnen.

- [ ] **Step 2: Akzeptanzkriterien visuell prüfen**

Prüfen und abhaken:
- Team-Kopfzeile: Anwesend- und Abmelden-Icon kompakt neben dem Teamnamen, kein Umbruch bei langem Teamnamen.
- Einzelmeldung: keine separate Kopfzeile; Icons rechts in der Spielerzeile.
- Klick auf Anwesend-Icon togglet den Status; Zeile/Kopfzeile wird grün hervorgehoben; erneuter Klick hebt es auf.
- Abgemeldetes Team: Reaktivieren-Icon sichtbar; Klick reaktiviert.
- Icons zeigen Tooltip (`title`) und haben `aria-label` (per DevTools prüfen).
- Viewport auf ~360px verkleinern: keine Overlaps, Aktionen bleiben bedienbar.

- [ ] **Step 3: Bei Overlap nachbessern (nur falls nötig)**

Falls auf schmalem Viewport Overlaps auftreten, im `@media (max-width: 720px)`-Block von `teilnehmer.scss` die `.admin-row`-Regel prüfen (sie stellt bereits auf `flex-direction: column; align-items: stretch` um). Anpassung als eigener Commit `#174 …`.

- [ ] **Step 4: Abschluss**

Server stoppen. Sicherstellen, dass `npm run lint`, `npm test`, `npm run format:check` (aus `frontend/`) grün sind. Danach ist der Branch bereit für den PR (Body mit `Closes #174`).

---

## Self-Review

**Spec coverage:**
- Icons statt Text + aria-label/Tooltip → Task 1 (Template, Tests) ✓
- Kompakt in einer Zeile → Task 1 (Styling), Task 2 (Einbindung), Task 3 (Sichtprüfung) ✓
- Anwesend-Zeile farblich hervorgehoben → Task 2 Step 6 (Highlight-Klassen), Tests Step 2 ✓
- Anwesend/Abgemeldet unterscheidbar + stapelbar → Task 2 Step 6 (Kommentar + separate Klassen), Task 3 Sichtprüfung ✓
- Funktionalität unverändert (Toggle/Abmelden/Reaktivieren) → Task 2 Verdrahtung + angepasste Bestandstests ✓
- Einzelmeldung ohne Kopfzeile → Task 2 Step 5 (`@if (meldung.teamName)`) + Test Step 2 ✓
- Mobil nutzbar, keine Overlaps → Task 3 Step 2/3 ✓

**Placeholder scan:** Kein TBD/TODO; alle Code-Schritte enthalten vollständigen Code. ✓

**Type consistency:** Inputs `anwesend`/`abgemeldet` (boolean), Output `toggleAnwesenheit` liefert `boolean` → Seite ruft `toggleAnwesenheit(meldung.id, $event)`; Outputs `abmelden`/`reaktivieren` (void) → `abmelden(meldung.id)`/`reaktivieren(meldung.id)`. Selektoren `.ma-btn--anwesend`/`.ma-btn--abmelden`/`.ma-btn--reaktivieren` in Template, Komponenten-Spec und Seiten-Spec identisch. ✓
