# Admin-Übersicht: Abgemeldete Teams ans Ende sortieren — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In der Admin-Teilnehmerübersicht rutschen abgemeldete Teams innerhalb jeder Disziplin-Gruppe stabil ans Ende der Liste, ohne die Reihenfolge aktiver Teams zu ändern.

**Architecture:** Eine reine, exportierte Helper-Funktion `sortiereAbgemeldeteAnsEnde` sortiert eine Meldungsliste stabil nach dem `abgemeldet`-Flag. Sie wird in der bestehenden `sichtbareAdminGruppen`-Computed **nach** dem Such-Filter angewandt. Da es eine `computed` ist, greift die Sortierung automatisch live: `abmelden`/`reaktivieren` rufen `ladeAdmin()`, setzen das Signal neu und die Computed re-sortiert. Keine Backend- oder DB-Änderung.

**Tech Stack:** Angular (Standalone Component, Signals/`computed`), TypeScript, Jest.

## Global Constraints

- Nur Frontend; Datei `frontend/src/app/pages/teilnehmer/teilnehmer.ts` und deren Spec.
- Öffentliche Sicht (`sichtbareGruppen`) bleibt unverändert.
- Signal-Arrays niemals in-place mutieren — immer Kopie sortieren (`[...meldungen]`).
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
- Produces: `export function sortiereAbgemeldeteAnsEnde(meldungen: AdminMeldungEintrag[]): AdminMeldungEintrag[]` — gibt eine **neue** Liste zurück, abgemeldete Meldungen ans Ende, aktive und abgemeldete jeweils untereinander in Eingabereihenfolge; mutiert die Eingabe nicht.

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
 * Arbeitet auf einer Kopie, damit Signal-Arrays nicht in-place verändert werden.
 */
export function sortiereAbgemeldeteAnsEnde(
  meldungen: AdminMeldungEintrag[],
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

- [ ] **Step 5: Volle CI-Gate lokal + Commit**

```bash
cd frontend && npm run lint && npm test && npm run format:check
git add frontend/src/app/pages/teilnehmer/teilnehmer.ts frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#175 Admin-Übersicht sortiert abgemeldete Teams je Disziplin ans Ende"
```

---

## Self-Review

**Spec-Abdeckung (Akzeptanzkriterien Ticket #175):**
- Abgemeldete ans Ende je Disziplin-Gruppe → Task 2, Test „sortiert abgemeldete Teams ans Ende" + Helper-Test „schiebt abgemeldete Meldungen ans Ende".
- Aktive behalten stabile Reihenfolge → Task 1, Test „hält die Reihenfolge aktiver Meldungen stabil".
- Live bei Abmelden/Reaktivieren → Task 2, Tests „rutscht … nach dem Abmelden ans Ende" und „… nach der Reaktivierung zurück".
- Nur Admin-Ansicht, öffentliche Sicht unverändert → nur `sichtbareAdminGruppen` geändert; `sichtbareGruppen` unangetastet; bestehende öffentliche Regressionstests bleiben grün.
- Testfall „Gruppe ganz ohne Abgemeldete unverändert" → Task 1, entsprechender Helper-Test.

**Platzhalter-Scan:** Keine TODO/TBD; jeder Code-Step enthält vollständigen Code und exakte Kommandos.

**Typ-Konsistenz:** `sortiereAbgemeldeteAnsEnde(meldungen: AdminMeldungEintrag[]): AdminMeldungEintrag[]` in Task 1 definiert und in Task 2 identisch aufgerufen. `abmelden`/`reaktivieren`/`sichtbareAdminGruppen` entsprechen den vorhandenen Signaturen in `teilnehmer.ts`.
