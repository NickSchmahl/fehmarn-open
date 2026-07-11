# Admin-Sicht: Spieler ohne Radikal ID erkennbar machen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In der Admin-Teilnehmerübersicht sind Spieler ohne Radikal ID klar als „neu anlegen" markiert und zeigen Initialen + Geburtsdatum als Anlage-Grundlage.

**Architecture:** Die Admin-DTO `AdminUebersichtResponse.SpielerEintrag` wird um `initialen` + `geburtsdatum` erweitert; der `UebersichtMapper` reicht sie direkt aus der `Spieler`-Entity durch (kein `if` — die Felder sind je nach Spieler ohnehin `null`). Das Frontend zeigt für Spieler ohne `radikalId` die Rohdaten + ein Badge; ein wiederverwendbarer Datums-Helfer unter `shared/` formatiert ISO → `dd.MM.yyyy`. Die öffentliche Sicht bleibt unangetastet.

**Tech Stack:** Backend Spring Boot / Java (JUnit5 + AssertJ), Frontend Angular (Standalone Components, Signals, Jasmine/Karma).

**Spec:** [docs/superpowers/specs/2026-07-11-admin-spieler-ohne-radikal-id-design.md](../specs/2026-07-11-admin-spieler-ohne-radikal-id-design.md)

## Global Constraints

- Echte Umlaute (ä/ö/ü/ß) auch in Kommentaren und UI-Texten — nie ae/oe/ue.
- Sprechende Namen, keine Ein-Buchstaben-Variablen.
- Vor jedem Commit lokales Quality-Gate: Backend `./mvnw spotless:check` (läuft als Pre-Commit-Hook), Frontend `npm run lint && npm test && npm run format:check`.
- Angular-Tests: `fixture.nativeElement` immer `as HTMLElement` casten.
- Keine `git add -A`; nur die konkret geänderten Dateien stagen. Kein amend/force-push.
- Commit-Messages beginnen mit `#154 `.
- Geburtsdatum ist **nur** in der Admin-Sicht sichtbar — nie in der öffentlichen Übersicht.

---

## Task 1: Backend — SpielerEintrag um Initialen + Geburtsdatum erweitern

**Files:**
- Modify: `backend/src/main/java/de/dart/fehmarnopen/dto/AdminUebersichtResponse.java:23`
- Modify: `backend/src/main/java/de/dart/fehmarnopen/mapper/UebersichtMapper.java:59-67`
- Test: `backend/src/test/java/de/dart/fehmarnopen/mapper/UebersichtMapperTest.java`

**Interfaces:**
- Consumes: `Spieler` (Entity mit `getRadikalId()`, `getInitialen()`, `getGeburtsdatum(): LocalDate`).
- Produces: `AdminUebersichtResponse.SpielerEintrag(String vorname, String nachname, String radikalId, String initialen, LocalDate geburtsdatum)` — konsumiert von Frontend via JSON (Jackson serialisiert `LocalDate` als ISO-String `yyyy-MM-dd`).

- [ ] **Step 1: Failing test — Spieler ohne ID liefert Initialen + Geburtsdatum, mit ID liefert null**

In `UebersichtMapperTest.java` neuen Test ergänzen (nach `admin_liefertVolleFelderJeMeldung`, ca. Zeile 136). Import oben ergänzen: `import java.time.LocalDate;`

```java
    @Test
    void admin_spielerOhneId_liefertInitialenUndGeburtsdatum() {
        Spieler mitId = spielerEntity("Anna", "Schmidt");
        mitId.setRadikalId("AS-1");
        Spieler ohneId = new Spieler();
        ohneId.setVorname("Bert");
        ohneId.setNachname("Adam");
        ohneId.setRadikalId(null);
        ohneId.setInitialen("BA");
        ohneId.setGeburtsdatum(LocalDate.of(1990, 3, 14));
        Anmeldung anmeldung = anmeldung(Disziplin.HERRENDOPPEL, "Team A", mitId, ohneId);

        List<AdminUebersichtResponse.SpielerEintrag> spieler = uebersichtMapper
                .zuAdminUebersicht(List.of(anmeldung))
                .disziplinen()
                .get(0)
                .meldungen()
                .get(0)
                .spieler();

        // Sortiert nach Nachname: Adam (ohne ID) zuerst, dann Schmidt (mit ID).
        AdminUebersichtResponse.SpielerEintrag ohne = spieler.get(0);
        assertThat(ohne.radikalId()).isNull();
        assertThat(ohne.initialen()).isEqualTo("BA");
        assertThat(ohne.geburtsdatum()).isEqualTo(LocalDate.of(1990, 3, 14));

        AdminUebersichtResponse.SpielerEintrag mit = spieler.get(1);
        assertThat(mit.radikalId()).isEqualTo("AS-1");
        assertThat(mit.initialen()).isNull();
        assertThat(mit.geburtsdatum()).isNull();
    }
```

- [ ] **Step 2: Run test — verify compile-fail / red**

Run: `cd backend && ./mvnw -q test -Dtest=UebersichtMapperTest`
Expected: FAIL — `SpielerEintrag` hat (noch) keine `initialen()`/`geburtsdatum()`-Komponente (Compile-Fehler).

- [ ] **Step 3: Record um zwei Felder erweitern**

In `AdminUebersichtResponse.java` den Record-Eintrag ersetzen. Import ergänzen: `import java.time.LocalDate;`

```java
    public record SpielerEintrag(
            String vorname, String nachname, String radikalId, String initialen, LocalDate geburtsdatum) {}
```

- [ ] **Step 4: Mapper reicht die Felder durch**

In `UebersichtMapper.java`, Methode `toAdminMeldung` (Zeile 59-67), das `SpielerEintrag`-Mapping ersetzen:

```java
    private AdminUebersichtResponse.MeldungEintrag toAdminMeldung(Anmeldung anmeldung) {
        List<AdminUebersichtResponse.SpielerEintrag> spieler = anmeldung.getSpieler().stream()
                .sorted(spielerReihenfolge())
                .map(einzelspieler -> new AdminUebersichtResponse.SpielerEintrag(
                        einzelspieler.getVorname(),
                        einzelspieler.getNachname(),
                        einzelspieler.getRadikalId(),
                        einzelspieler.getInitialen(),
                        einzelspieler.getGeburtsdatum()))
                .toList();
        return new AdminUebersichtResponse.MeldungEintrag(
                anmeldung.getId(), anmeldung.getTeamName(), anmeldung.isAnwesend(), anmeldung.isAbgemeldet(), spieler);
    }
```

- [ ] **Step 5: Bestehenden Test `admin_liefertVolleFelderJeMeldung` prüfen**

Der Test in Zeile 114-136 konstruiert Spieler via `spielerEntity(...)`, das `radikalId = "RAD-1"` setzt; `initialen`/`geburtsdatum` bleiben `null`. Die bestehenden Assertions bleiben gültig (nur `radikalId` wird geprüft). Keine Änderung nötig — nur verifizieren, dass er weiter kompiliert/grün ist.

- [ ] **Step 6: Run tests — verify green**

Run: `cd backend && ./mvnw -q test -Dtest=UebersichtMapperTest`
Expected: PASS (alle Tests inkl. neuem).

- [ ] **Step 7: Full backend build (Spotless + alle Tests)**

Run: `cd backend && ./mvnw -q verify`
Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/de/dart/fehmarnopen/dto/AdminUebersichtResponse.java \
        backend/src/main/java/de/dart/fehmarnopen/mapper/UebersichtMapper.java \
        backend/src/test/java/de/dart/fehmarnopen/mapper/UebersichtMapperTest.java
git commit -m "#154 Admin-DTO um Initialen + Geburtsdatum je Spieler erweitern"
```

---

## Task 2: Frontend — wiederverwendbarer Datums-Helfer unter `shared/`

**Files:**
- Create: `frontend/src/app/shared/datum.ts`
- Test: `frontend/src/app/shared/datum.spec.ts`

**Interfaces:**
- Produces: `formatiereIsoDatum(iso: string | null | undefined): string` — wandelt ISO `yyyy-MM-dd` in `dd.MM.yyyy`; bei leerem/ungültigem Wert leerer String `''`. Konsumiert von `teilnehmer.ts` (Task 3).

Bewusst als eigenes Modul (analog `shared/disziplin.ts`) für lose Kopplung und Wiederverwendbarkeit — **nicht** in `teilnehmer.ts`.

- [ ] **Step 1: Failing test schreiben**

Create `frontend/src/app/shared/datum.spec.ts`:

```typescript
import { formatiereIsoDatum } from './datum';

describe('formatiereIsoDatum', () => {
  it('formatiert ISO yyyy-MM-dd zu dd.MM.yyyy', () => {
    expect(formatiereIsoDatum('1990-03-14')).toBe('14.03.1990');
  });

  it('behält führende Nullen bei Tag und Monat', () => {
    expect(formatiereIsoDatum('2001-01-05')).toBe('05.01.2001');
  });

  it('liefert leeren String bei null', () => {
    expect(formatiereIsoDatum(null)).toBe('');
  });

  it('liefert leeren String bei leerem oder unpassendem Wert', () => {
    expect(formatiereIsoDatum('')).toBe('');
    expect(formatiereIsoDatum('14.03.1990')).toBe('');
  });
});
```

- [ ] **Step 2: Run test — verify red**

Run: `cd frontend && npm test -- --include='**/shared/datum.spec.ts' --watch=false`
Expected: FAIL — Modul `./datum` existiert nicht.

- [ ] **Step 3: Helfer implementieren**

Create `frontend/src/app/shared/datum.ts`:

```typescript
// Formatiert ein ISO-Datum (yyyy-MM-dd, wie vom Backend geliefert) für die deutsche Anzeige.
// Bewusst eigenständig gehalten, damit es unabhängig von einzelnen Seiten wiederverwendbar bleibt.

const ISO_DATUM = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Wandelt `yyyy-MM-dd` in `dd.MM.yyyy`; leerer/ungültiger Wert ergibt einen leeren String. */
export function formatiereIsoDatum(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const treffer = ISO_DATUM.exec(iso);
  if (!treffer) {
    return '';
  }
  const [, jahr, monat, tag] = treffer;
  return `${tag}.${monat}.${jahr}`;
}
```

- [ ] **Step 4: Run test — verify green**

Run: `cd frontend && npm test -- --include='**/shared/datum.spec.ts' --watch=false`
Expected: PASS (4 Specs grün).

- [ ] **Step 5: Lint + Format**

Run: `cd frontend && npm run lint && npm run format:check`
Expected: keine Fehler.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/shared/datum.ts frontend/src/app/shared/datum.spec.ts
git commit -m "#154 Wiederverwendbaren Datums-Helfer (ISO -> dd.MM.yyyy) ergaenzen"
```

---

## Task 3: Frontend — Admin-Liste zeigt Initialen + Geburtsdatum + Badge „neu anlegen"

**Files:**
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.ts:43-47` (Interface `AdminSpielerEintrag`)
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.html:101-108` (admin-list)
- Modify: `frontend/src/app/pages/teilnehmer/teilnehmer.scss` (neues Badge, nach `.status-badge` ~Zeile 424)
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts`

**Interfaces:**
- Consumes: `formatiereIsoDatum` aus `../../shared/datum` (Task 2); Backend-JSON mit `initialen: string | null`, `geburtsdatum: string | null` (ISO) je Admin-Spieler (Task 1).
- Produces: keine (Blattknoten der Feature-Kette).

- [ ] **Step 1: Failing tests im Admin-Describe ergänzen**

In `teilnehmer.spec.ts`, innerhalb `describe('Teilnehmer (admin)', ...)` (ab Zeile 174) zwei neue Specs ergänzen (z. B. nach dem Test `zeigt je Spieler die Radikal-ID`, ~Zeile 231). Neue Response-Konstante mit gemischten Spielern lokal im Test:

```typescript
  it('zeigt für Spieler ohne Radikal ID Initialen + Geburtsdatum und ein "neu anlegen"-Badge', () => {
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
              anwesend: false,
              abgemeldet: false,
              spieler: [
                { vorname: 'Bert', nachname: 'Adam', radikalId: null, initialen: 'BA', geburtsdatum: '1990-03-14' },
                { vorname: 'Anna', nachname: 'Schmidt', radikalId: 'AS-1', initialen: null, geburtsdatum: null },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const zeilen = Array.from(root.querySelectorAll('.admin-row'));

    // Spieler ohne ID: Initialen + Geburtsdatum + Badge sichtbar.
    const ohneId = zeilen.find((z) => z.textContent.includes('Bert Adam')) as HTMLElement;
    expect(ohneId.querySelector('.neu-anlegen-badge')).not.toBeNull();
    expect(ohneId.querySelector('.admin-radikal-id')?.textContent).toContain('BA');
    expect(ohneId.querySelector('.admin-radikal-id')?.textContent).toContain('14.03.1990');

    // Spieler mit ID: ID sichtbar, kein Badge.
    const mitId = zeilen.find((z) => z.textContent.includes('Anna Schmidt')) as HTMLElement;
    expect(mitId.querySelector('.neu-anlegen-badge')).toBeNull();
    expect(mitId.querySelector('.admin-radikal-id')?.textContent).toContain('AS-1');
  });
```

Zusätzlich die vorhandene `adminMeldung`-Hilfsfunktion (Zeile 8-17) um die neuen Felder ergänzen, damit sie typkonform bleibt:

```typescript
    spieler: [{ vorname: 'V', nachname: 'N', radikalId: null, initialen: null, geburtsdatum: null }],
```

- [ ] **Step 2: Run tests — verify red**

Run: `cd frontend && npm test -- --include='**/teilnehmer/teilnehmer.spec.ts' --watch=false`
Expected: FAIL — `.neu-anlegen-badge` existiert nicht; Interface `AdminSpielerEintrag` kennt `initialen`/`geburtsdatum` noch nicht (Typfehler in der Hilfsfunktion).

- [ ] **Step 3: Interface erweitern + Helfer importieren**

In `teilnehmer.ts` das Interface (Zeile 43-47) ersetzen:

```typescript
export interface AdminSpielerEintrag {
  vorname: string;
  nachname: string;
  radikalId: string | null;
  initialen: string | null;
  geburtsdatum: string | null; // ISO yyyy-MM-dd, nur Admin-Sicht
}
```

Import oben ergänzen (nach dem `disziplin`-Import, Zeile 3):

```typescript
import { formatiereIsoDatum } from '../../shared/datum';
```

Eine kleine Anzeige-Hilfsmethode in der Klasse `Teilnehmer` ergänzen (z. B. nach `setSuche`, ~Zeile 194), damit das Template nicht formatiert:

```typescript
  /** Anlage-Grundlage für Spieler ohne Radikal ID: "Initialen, dd.MM.yyyy". */
  anlageGrundlage(spieler: AdminSpielerEintrag): string {
    const datum = formatiereIsoDatum(spieler.geburtsdatum);
    return [spieler.initialen, datum].filter((teil) => teil).join(', ');
  }
```

- [ ] **Step 4: Template — Badge + Rohdaten für Spieler ohne ID**

In `teilnehmer.html` den `admin-list`-Block (Zeile 101-108) ersetzen:

```html
                <ul class="admin-list">
                  @for (spieler of meldung.spieler; track $index) {
                    <li class="admin-row">
                      <span class="admin-name">
                        {{ spieler.vorname }} {{ spieler.nachname }}
                        @if (!spieler.radikalId) {
                          <span class="neu-anlegen-badge">neu anlegen</span>
                        }
                      </span>
                      <span class="admin-radikal-id">
                        @if (spieler.radikalId) {
                          {{ spieler.radikalId }}
                        } @else {
                          {{ anlageGrundlage(spieler) }}
                        }
                      </span>
                    </li>
                  }
                </ul>
```

- [ ] **Step 5: SCSS — Badge-Stil**

In `teilnehmer.scss` nach dem `.status-badge`-Block (~Zeile 424) ergänzen. Farblich an `.status-badge` angelehnt, aber als Handlungsbedarf hervorgehoben (Accent):

```scss
.neu-anlegen-badge {
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

- [ ] **Step 6: Run tests — verify green**

Run: `cd frontend && npm test -- --include='**/teilnehmer/teilnehmer.spec.ts' --watch=false`
Expected: PASS (neue + bestehende Admin-Specs grün).

- [ ] **Step 7: Volles Frontend-Quality-Gate**

Run: `cd frontend && npm run lint && npm test -- --watch=false && npm run format:check`
Expected: alle grün, keine Lint-/Format-Fehler.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/pages/teilnehmer/teilnehmer.ts \
        frontend/src/app/pages/teilnehmer/teilnehmer.html \
        frontend/src/app/pages/teilnehmer/teilnehmer.scss \
        frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#154 Admin-Liste markiert Spieler ohne Radikal ID (Badge + Initialen/Geburtsdatum)"
```

---

## Task 4: Öffentliche Sicht absichern + manuelle Verifikation

**Files:**
- Test: `frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts` (öffentliches Describe)

**Interfaces:**
- Consumes: nichts Neues.
- Produces: nichts.

- [ ] **Step 1: Regressionstest — öffentliche Sicht zeigt kein Geburtsdatum/Badge**

In `teilnehmer.spec.ts`, im `describe('Teilnehmer (öffentlich)', ...)` einen Test ergänzen:

```typescript
  it('zeigt in der öffentlichen Sicht weder Badge noch Geburtsdatum', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/teilnehmer').flush({
      disziplinen: [
        {
          disziplin: 'HERRENEINZEL',
          anzahl: 1,
          meldungen: [{ teamName: null, spieler: [{ vorname: 'Anna', nachname: 'Schmidt' }] }],
        },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.neu-anlegen-badge')).toBeNull();
    expect(root.querySelector('.admin-radikal-id')).toBeNull();
    expect(root.textContent).not.toContain('1990');
  });
```

- [ ] **Step 2: Run test — verify green**

Run: `cd frontend && npm test -- --include='**/teilnehmer/teilnehmer.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 3: Manuelle Verifikation (verify-Skill)**

App lokal starten (Backend + Frontend), als Admin einloggen, Teilnehmerübersicht öffnen. Prüfen:
- Spieler mit Radikal ID → ID sichtbar, kein Badge.
- Spieler ohne Radikal ID → Badge „neu anlegen" + `Initialen, dd.MM.yyyy`.
- Ausgeloggt (öffentliche Sicht) → weder Badge noch Geburtsdatum sichtbar.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/pages/teilnehmer/teilnehmer.spec.ts
git commit -m "#154 Regressionstest: oeffentliche Sicht ohne Badge/Geburtsdatum"
```

---

## Task 5: Doku + PR

**Files:**
- ggf. Modify: relevante Doku unter `docs/` (falls Admin-Sicht dort beschrieben ist)

- [ ] **Step 1: Doku prüfen**

Run: `grep -rl "Radikal\|Admin-Übersicht\|AdminUebersicht" docs/`
Falls eine Stelle die Admin-Spieleranzeige beschreibt: um die „neu anlegen"-Markierung + Initialen/Geburtsdatum ergänzen. Falls nichts Passendes existiert: kein Eintrag nötig (Feedback-Regel: Doku nur bei betroffener Doku pflegen).

- [ ] **Step 2: Falls Doku geändert — Commit**

```bash
git add docs/<geänderte-datei>
git commit -m "#154 Doku: Admin-Markierung fuer Spieler ohne Radikal ID"
```

- [ ] **Step 3: Branch pushen + PR öffnen**

```bash
git push -u origin claude/issue-154-plan-5ebf39
gh pr create --title "#154 Admin-Sicht: Spieler ohne Radikal ID erkennbar machen" \
  --body "$(cat <<'EOF'
## Was
Admin-Teilnehmerübersicht markiert Spieler ohne Radikal ID mit einem Badge „neu anlegen" und zeigt ihre Initialen + Geburtsdatum als Anlage-Grundlage. Spieler mit ID unverändert. Öffentliche Sicht unverändert (kein Geburtsdatum öffentlich).

## Wie
- Backend: `AdminUebersichtResponse.SpielerEintrag` um `initialen` + `geburtsdatum` erweitert, `UebersichtMapper` reicht sie durch.
- Frontend: wiederverwendbarer Datums-Helfer `shared/datum.ts`; Admin-Liste zeigt Badge + Rohdaten für Spieler ohne ID.

Closes #154
EOF
)"
```

Hinweis: Der Agent merged **nicht** selbst — PR bleibt für Review offen.

---

## Self-Review

**Spec coverage:**
- `SpielerEintrag` um Initialen + Geburtsdatum (nur Admin) → Task 1 ✓
- Mapper füllt Felder für Spieler ohne ID → Task 1 (Durchreichen, Test deckt beide Fälle) ✓
- Admin zeigt Initialen + Geburtsdatum + Markierung → Task 3 ✓
- Spieler mit ID unverändert, keine Markierung → Task 3 (Test) ✓
- Öffentliche Sicht unverändert, kein Geburtsdatum → Task 4 (Regressionstest) ✓
- Datums-Helfer ausgelagert nach `shared/` → Task 2 ✓

**Placeholder scan:** Keine TBD/TODO; alle Code-Schritte enthalten vollständigen Code und konkrete Befehle mit erwarteter Ausgabe.

**Type consistency:** `formatiereIsoDatum(iso: string | null | undefined): string` (Task 2) wird in Task 3 mit `spieler.geburtsdatum: string | null` aufgerufen — passt. `SpielerEintrag(..., String initialen, LocalDate geburtsdatum)` (Task 1) korrespondiert mit Frontend `initialen: string | null`, `geburtsdatum: string | null` (ISO) — Jackson serialisiert `LocalDate` als ISO-String. `.neu-anlegen-badge` konsistent in HTML (Task 3), SCSS (Task 3) und Tests (Task 3/4).
