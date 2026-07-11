# Admin-Übersicht: Abgemeldete Teams ans Ende sortieren — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In der Admin-Teilnehmerübersicht rutschen abgemeldete Teams innerhalb jeder Disziplin-Gruppe stabil ans Ende der Liste, ohne die Reihenfolge aktiver Teams zu ändern.

**Architecture:** Eine reine, exportierte Helper-Funktion `sortiereAbgemeldeteAnsEnde` sortiert eine Meldungsliste stabil nach dem `abgemeldet`-Flag. Sie wird in der bestehenden `sichtbareAdminGruppen`-Computed **nach** dem Such-Filter angewandt. Da es eine `computed` ist, greift die Sortierung automatisch live: `abmelden`/`reaktivieren` rufen `ladeAdmin()`, setzen das Signal neu und die Computed re-sortiert. Keine Backend- oder DB-Änderung.

Als Guardrail gegen versehentliche In-place-Mutation werden die betroffenen Signal-Payloads und der Helper-Parameter als `readonly`-Arrays typisiert. Damit ist `signal().sort()`/`.push()`/… ein **Compile-Fehler** (`tsc`/`ng build`, läuft in der CI) — der Spread `[...meldungen]` in der Helper-Funktion bleibt erlaubt und erzwingt genau die Kopie. Die Konvention wird in **ADR 0014** festgehalten (Task 3), damit spätere Tickets sie übernehmen.

**Tech Stack:** Angular (Standalone Component, Signals/`computed`), TypeScript, Jest.

## Global Constraints

- Frontend (`frontend/src/app/pages/teilnehmer/teilnehmer.ts` + Spec) und ein neues ADR-Dokument.
- Öffentliche Sicht (`sichtbareGruppen`) bleibt unverändert.
- Signal-Arrays niemals in-place mutieren — immer Kopie sortieren (`[...meldungen]`). Erzwungen über `readonly`-Typisierung der Signal-Payloads und des Helper-Parameters (Compile-Fehler statt Laufzeitbug).
- Stabile Sortierung: `Array.prototype.sort` ist ab ES2019 garantiert stabil; als einziges Kriterium das `abgemeldet`-Flag verwenden, damit die bisherige Backend-Reihenfolge aktiver Teams erhalten bleibt.
- Echte Umlaute (ä/ö/ü/ß) auch in Kommentaren.
- Volle CI-Gate lokal vor dem Commit: `npm run lint` + `npm test` + `npm run format:check` (alle im Ordner `frontend/`).
- Ein PR für dieses Ticket; PR-Body mit englischem `Closes #175`.

---

### Task 1: Reine Sortier-Helper-Funktion `sortiereAbgemeldeteAnsEnde`

**Files:**
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.ts` (neue exportierte Funktion nach `meldungPasstZurSuche`, ca. Zeile 107)
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` (neuer `describe`-Block + Import erweitern)

**Interfaces:**
- Consumes: bestehender Typ `AdminMeldungEintrag` (Feld `abgemeldet: boolean`, `id: number`) aus `teilnehmer.ts`.
- Produces: `export function sortiereAbgemeldeteAnsEnde(meldungen: readonly AdminMeldungEintrag[]): AdminMeldungEintrag[]` — nimmt eine `readonly`-Liste (kann nicht in-place sortiert werden), gibt eine **neue** Liste zurück, abgemeldete Meldungen ans Ende, aktive und abgemeldete jeweils untereinander in Eingabereihenfolge; mutiert die Eingabe nicht.

- [ ] **Step 1: Failing Tests schreiben**

Import in `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` erweitern (Zeile 5):

```ts
import {
  Teilnehmer,
  meldungPasstZurSuche,
  sortiereAbgemeldeteAnsEnde,
  AdminMeldungEintrag,
} from './teilnehmer';
```

Neuen `describe`-Block direkt nach dem `describe('meldungPasstZurSuche', …)`-Block (nach Zeile 49) einfügen. Nutzt die bereits vorhandene `adminMeldung`-Fixture (Zeile 8):

```ts
describe('sortiereAbgemeldeteAnsEnde', () => {
  it('schiebt abgemeldete Meldungen ans Ende', () => {
    const eingabe = [
      adminMeldung({ id: 1, abgemeldet: false }),
      adminMeldung({ id: 2, abgemeldet: true }),
      adminMeldung({ id: 3, abgemeldet: false }),
    ];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([1, 3, 2]);
  });

  it('hält die Reihenfolge aktiver Meldungen stabil', () => {
    const eingabe = [
      adminMeldung({ id: 10, abgemeldet: false }),
      adminMeldung({ id: 20, abgemeldet: false }),
      adminMeldung({ id: 30, abgemeldet: false }),
    ];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([10, 20, 30]);
  });

  it('hält die Reihenfolge abgemeldeter Meldungen untereinander stabil', () => {
    const eingabe = [
      adminMeldung({ id: 1, abgemeldet: true }),
      adminMeldung({ id: 2, abgemeldet: false }),
      adminMeldung({ id: 3, abgemeldet: true }),
    ];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([2, 1, 3]);
  });

  it('lässt eine Gruppe ganz ohne Abgemeldete unverändert', () => {
    const eingabe = [adminMeldung({ id: 1 }), adminMeldung({ id: 2 })];
    expect(sortiereAbgemeldeteAnsEnde(eingabe).map((m) => m.id)).toEqual([1, 2]);
  });

  it('mutiert die Eingabeliste nicht', () => {
    const eingabe = [
      adminMeldung({ id: 1, abgemeldet: true }),
      adminMeldung({ id: 2, abgemeldet: false }),
    ];
    sortiereAbgemeldeteAnsEnde(eingabe);
    expect(eingabe.map((m) => m.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npx jest teilnehmer.spec`
Expected: FAIL — `sortiereAbgemeldeteAnsEnde is not a function` bzw. TypeScript-Fehler „has no exported member 'sortiereAbgemeldeteAnsEnde'".

- [ ] **Step 3: Minimale Implementierung**

In `frontend/src/app/pages/teilnehmer/teilnehmer.ts` direkt nach der Funktion `meldungPasstZurSuche` (nach Zeile 107, noch im Abschnitt „Hilfsfunktionen") einfügen:

```ts
/**
 * Sortiert abgemeldete Meldungen stabil ans Ende; aktive behalten ihre bisherige Reihenfolge.
 * Nimmt eine `readonly`-Liste und arbeitet auf einer Kopie, damit Signal-Arrays nie in-place
 * verändert werden (siehe ADR 0014).
 */
export function sortiereAbgemeldeteAnsEnde(
  meldungen: readonly AdminMeldungEintrag[],
): AdminMeldungEintrag[] {
  return [...meldungen].sort((a, b) => Number(a.abgemeldet) - Number(b.abgemeldet));
}
```

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

Run: `cd frontend && npx jest teilnehmer.spec`
Expected: PASS — alle fünf neuen `sortiereAbgemeldeteAnsEnde`-Tests grün, bestehende Tests weiterhin grün.

- [ ] **Step 5: Commit**

```bash
cd frontend && npm run lint && npm run format:check
git add frontend/src/app/pages/teilnehmer/teilnehmer.ts frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#175 Reine Helper-Funktion: abgemeldete Meldungen stabil ans Ende sortieren"
```

---

### Task 2: Helper in `sichtbareAdminGruppen` einbinden (Live-Sortierung)

**Files:**
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.ts` (Computed `sichtbareAdminGruppen`, Zeile 168–181)
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` (drei neue Tests im `describe('Teilnehmer (admin)')`-Block)

**Interfaces:**
- Consumes: `sortiereAbgemeldeteAnsEnde` aus Task 1; bestehende `meldungPasstZurSuche`, `disziplinLabel`, Signal `adminGruppen`, Methoden `abmelden(id)`, `reaktivieren(id)`.
- Produces: keine neuen Exporte; `sichtbareAdminGruppen()` liefert je Gruppe die Meldungen abgemeldet-ans-Ende sortiert.

- [ ] **Step 1: Failing Tests schreiben**

Drei Tests am Ende des `describe('Teilnehmer (admin)', …)`-Blocks einfügen (vor der schließenden `});` bei Zeile 391). Sie lesen die `computed` direkt aus — kein `detectChanges` nach dem Flush nötig:

```ts
it('sortiert abgemeldete Teams ans Ende der Disziplin-Gruppe', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/admin/teilnehmer').flush({
    disziplinen: [
      {
        disziplin: 'HERRENDOPPEL',
        anzahl: 3,
        meldungen: [
          { id: 1, teamName: 'Aktiv 1', anwesend: false, abgemeldet: false, spieler: [] },
          { id: 2, teamName: 'Abgemeldet', anwesend: false, abgemeldet: true, spieler: [] },
          { id: 3, teamName: 'Aktiv 2', anwesend: false, abgemeldet: false, spieler: [] },
        ],
      },
    ],
  });

  const reihenfolge = component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id);
  expect(reihenfolge).toEqual([1, 3, 2]);
});

it('rutscht ein Team nach dem Abmelden ans Ende (Live-Update über Reload)', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/admin/teilnehmer').flush({
    disziplinen: [
      {
        disziplin: 'HERRENDOPPEL',
        anzahl: 2,
        meldungen: [
          { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: false, spieler: [] },
          { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: false, spieler: [] },
        ],
      },
    ],
  });

  component.abmelden(1);
  httpTesting.expectOne('/api/admin/anmeldung/1/abmelden').flush(null);
  // Reload liefert Team 1 nun als abgemeldet zurück.
  httpTesting.expectOne('/api/admin/teilnehmer').flush({
    disziplinen: [
      {
        disziplin: 'HERRENDOPPEL',
        anzahl: 2,
        meldungen: [
          { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: true, spieler: [] },
          { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: false, spieler: [] },
        ],
      },
    ],
  });

  expect(component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id)).toEqual([2, 1]);
});

it('rutscht ein Team nach der Reaktivierung zurück in den aktiven Bereich', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/admin/teilnehmer').flush({
    disziplinen: [
      {
        disziplin: 'HERRENDOPPEL',
        anzahl: 2,
        meldungen: [
          { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: false, spieler: [] },
          { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: true, spieler: [] },
        ],
      },
    ],
  });
  // Ausgangslage: abgemeldetes Team 2 steht hinten.
  expect(component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id)).toEqual([1, 2]);

  component.reaktivieren(2);
  httpTesting.expectOne('/api/admin/anmeldung/2/reaktivieren').flush(null);
  httpTesting.expectOne('/api/admin/teilnehmer').flush({
    disziplinen: [
      {
        disziplin: 'HERRENDOPPEL',
        anzahl: 2,
        meldungen: [
          { id: 1, teamName: 'Team 1', anwesend: false, abgemeldet: false, spieler: [] },
          { id: 2, teamName: 'Team 2', anwesend: false, abgemeldet: false, spieler: [] },
        ],
      },
    ],
  });

  expect(component.sichtbareAdminGruppen()[0].meldungen.map((m) => m.id)).toEqual([1, 2]);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd frontend && npx jest teilnehmer.spec`
Expected: FAIL — der Test „sortiert abgemeldete Teams ans Ende" erwartet `[1, 3, 2]`, erhält aber die ungeänderte Backend-Reihenfolge `[1, 2, 3]`; der Abmelden-Test erwartet `[2, 1]`, erhält `[1, 2]`.

- [ ] **Step 3: Minimale Implementierung**

In `frontend/src/app/pages/teilnehmer/teilnehmer.ts`, Computed `sichtbareAdminGruppen`, die `meldungen`-Zuweisung (Zeile 178) durch die sortierte Variante ersetzen:

```ts
        meldungen: sortiereAbgemeldeteAnsEnde(
          gruppe.meldungen.filter((meldung) => meldungPasstZurSuche(meldung, suche)),
        ),
```

Der umgebende Block sieht danach so aus:

```ts
      .map((gruppe) => ({
        disziplin: gruppe.disziplin,
        label: disziplinLabel(gruppe.disziplin),
        anzahl: gruppe.anzahl,
        meldungen: sortiereAbgemeldeteAnsEnde(
          gruppe.meldungen.filter((meldung) => meldungPasstZurSuche(meldung, suche)),
        ),
      }))
      .filter((gruppe) => gruppe.meldungen.length > 0);
```

- [ ] **Step 4: Tests laufen lassen, Erfolg prüfen**

Run: `cd frontend && npx jest teilnehmer.spec`
Expected: PASS — alle drei neuen Admin-Tests grün, bestehende Admin-/Öffentlich-Tests weiterhin grün.

- [ ] **Step 5: Signal-Payloads `readonly` typisieren (Guardrail)**

In `frontend/src/app/pages/teilnehmer/teilnehmer.ts` die beiden Signal-Deklarationen (Zeile 131 und 134) auf `readonly`-Element-Typen umstellen:

```ts
  // Öffentlicher Modus
  readonly gruppen = signal<readonly DisziplinGruppe[]>([]);

  // Admin-Modus
  readonly adminGruppen = signal<readonly AdminGruppe[]>([]);
```

Die vorhandenen Zuweisungen `this.gruppen.set(data.disziplinen)` / `this.adminGruppen.set(data.disziplinen)` bleiben gültig (mutable ist auf `readonly` zuweisbar). Die Computeds `chips`, `sichtbareGruppen`, `sichtbareAdminGruppen` nutzen nur `reduce`/`filter`/`map` — alle auf `ReadonlyArray` vorhanden, daher keine weiteren Anpassungen.

- [ ] **Step 6: Guardrail beweisen (Rot-Check, dann zurücknehmen)**

Temporär eine In-place-Mutation ins Produktivfile schreiben, um zu belegen, dass der Typ-Check sie fängt. In `sichtbareAdminGruppen` testweise `this.adminGruppen().sort();` als erste Zeile des Computed-Callbacks einfügen und den App-Typecheck laufen lassen:

Run: `cd frontend && npx tsc -p tsconfig.app.json --noEmit`
Expected: FAIL — `Property 'sort' does not exist on type 'readonly AdminGruppe[]'`.

Danach die Zeile wieder entfernen und erneut prüfen:

Run: `cd frontend && npx tsc -p tsconfig.app.json --noEmit`
Expected: PASS (keine Ausgabe).

- [ ] **Step 7: Volle CI-Gate lokal + Commit**

```bash
cd frontend && npm run lint && npm test && npm run format:check
git add frontend/src/app/pages/teilnehmer/teilnehmer.ts frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#175 Admin-Übersicht sortiert abgemeldete Teams je Disziplin ans Ende (readonly-Guardrail)"
```

---

### Task 3: ADR 0014 – Signals halten unveränderliche Daten

**Files:**
- Create: `docs/adr/0014-signals-immutable-daten.md`
- Modify: `docs/adr/README.md` (Tabellenzeile ergänzen)

**Interfaces:**
- Consumes: das in Task 1/2 umgesetzte `readonly`-Muster als Referenzimplementierung.
- Produces: keine Code-Artefakte; dokumentierte Konvention für künftige Tickets.

- [ ] **Step 1: ADR-Datei anlegen**

`docs/adr/0014-signals-immutable-daten.md` mit exakt diesem Inhalt (Format wie ADR 0012: Kontext → Entscheidung → Konsequenzen → Alternativen):

```markdown
# ADR 0014 – Signals halten unveränderliche Daten (kein In-place-Mutieren)

**Status:** Akzeptiert · **Datum:** 2026-07-11

## Kontext

Der State im Frontend liegt in Angular-Signals (`signal<T[]>`), abgeleitete Sichten in
`computed`. Signals erkennen Änderungen über Referenzgleichheit: Wird der Inhalt eines
Signal-Arrays in-place mutiert (`.sort()`, `.push()`, `.splice()`, `.reverse()`), ändert sich
die Referenz nicht — Change Detection und `computed` können die Änderung verpassen oder
inkonsistent rendern. Das ist eine leise, schwer zu findende Fehlerklasse. Aufgefallen bei der
Sortierung abgemeldeter Teams (Issue #175), wo eine Liste je Disziplin sortiert werden musste.

## Entscheidung

Signal-gehaltene Daten werden als **unveränderlich** behandelt: nie in-place mutieren, sondern
immer eine **neue** Struktur ableiten und per `set`/`update` setzen.

- Sortieren/Umordnen über eine Kopie: `[...liste].sort(...)` statt `liste.sort(...)`.
- Reine Transformationsfunktionen bekommen ihre Eingabe als `readonly`-Array und geben eine
  neue Liste zurück.
- Signal-Payloads mit Listen werden mit `readonly`-Element-Typ deklariert:
  `signal<readonly Foo[]>([])`. Dadurch sind mutierende Array-Methoden ein **Compile-Fehler**
  (`Property 'sort' does not exist on type 'readonly Foo[]'`), der im bestehenden
  `tsc`/`ng build`-Gate der CI greift — kein zusätzliches ESLint-Plugin nötig.

Referenzimplementierung: `sortiereAbgemeldeteAnsEnde` + `gruppen`/`adminGruppen` in
`frontend/src/app/pages/teilnehmer/teilnehmer.ts` (Issue #175).

**Geltungsbereich:** verbindlich für neue/umgebaute Signal-basierte Zustände. Bestehende
Signale werden **nicht** pauschal umgestellt — nur wenn eine Komponente ohnehin angefasst wird.

## Konsequenzen

- In-place-Mutation von Signal-Listen wird zur Compile-Zeit verhindert statt erst im Betrieb
  aufzufallen.
- Klarere Datenflüsse: Computeds leiten sichtbar aus Quell-Signalen ab, statt sie zu verändern.
- Minimaler Zusatzaufwand: eine `readonly`-Annotation je Signal-Payload; Kopie beim Sortieren.
- Kein neues Tooling/keine neue Dependency.

## Alternativen

- **ESLint-Regel** (`eslint-plugin-functional`, `immutable-data`): fängt mutierende Methoden
  ebenfalls, aber heuristisch, mit false positives, neuer Dependency und Konfig-Pflege.
  Verworfen zugunsten der präziseren Typ-Lösung.
- **Nur Doku/Konvention ohne Typen:** verlässt sich auf Disziplin, kein Guardrail. Verworfen.
- **Tief-`readonly` aller verschachtelten Typen:** stärkere Garantie, aber invasiv und über den
  Anlass hinaus. Vorerst nur Signal-Payload + reine Helfer.
```

- [ ] **Step 2: README-Tabelle ergänzen**

In `docs/adr/README.md` endet die Tabelle aktuell bei `0012` — die Zeile für das bereits existierende ADR `0013` fehlt. Beide Zeilen nach der `0012`-Zeile (Zeile 23) ergänzen, damit die Tabelle den Dateibestand widerspiegelt:

```markdown
| [0013](0013-anmeldeschluss-config-statt-db.md) | Anmeldeschluss als Server-Config statt DB | Akzeptiert |
| [0014](0014-signals-immutable-daten.md) | Signals halten unveränderliche Daten (kein In-place-Mutieren) | Akzeptiert |
```

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0014-signals-immutable-daten.md docs/adr/README.md
git commit -m "#175 ADR 0014: Signals halten unveränderliche Daten (readonly, kein In-place-Mutieren)"
```

---

## Self-Review

**Spec-Abdeckung (Akzeptanzkriterien Ticket #175):**
- Abgemeldete ans Ende je Disziplin-Gruppe → Task 2, Test „sortiert abgemeldete Teams ans Ende" + Helper-Test „schiebt abgemeldete Meldungen ans Ende".
- Aktive behalten stabile Reihenfolge → Task 1, Test „hält die Reihenfolge aktiver Meldungen stabil".
- Live bei Abmelden/Reaktivieren → Task 2, Tests „rutscht … nach dem Abmelden ans Ende" und „… nach der Reaktivierung zurück".
- Nur Admin-Ansicht, öffentliche Sicht unverändert → nur `sichtbareAdminGruppen` geändert; `sichtbareGruppen` unangetastet; bestehende öffentliche Regressionstests bleiben grün.
- Testfall „Gruppe ganz ohne Abgemeldete unverändert" → Task 1, entsprechender Helper-Test.
- Guardrail „Signal-Arrays nie in-place mutieren" → Task 1 (`readonly`-Helper-Param) + Task 2 Step 5/6 (`readonly`-Signale, Rot-Check via `tsc`) + Task 3 (ADR 0014 als Konvention).

**Platzhalter-Scan:** Keine TODO/TBD; jeder Code-Step enthält vollständigen Code und exakte Kommandos.

**Typ-Konsistenz:** `sortiereAbgemeldeteAnsEnde(meldungen: readonly AdminMeldungEintrag[]): AdminMeldungEintrag[]` in Task 1 definiert und in Task 2 identisch aufgerufen (Eingabe `.filter(...)` liefert mutable, ist auf `readonly` zuweisbar). Signale `gruppen`/`adminGruppen` in Task 2 auf `readonly`-Element-Typ umgestellt; `set(...)` mit mutable Daten bleibt gültig. `abmelden`/`reaktivieren`/`sichtbareAdminGruppen` entsprechen den vorhandenen Signaturen in `teilnehmer.ts`. ADR 0014 folgt dem Format von ADR 0012 (Kontext→Entscheidung→Konsequenzen→Alternativen, Status/Datum, README-Zeile).
