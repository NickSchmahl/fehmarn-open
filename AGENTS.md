# AGENTS.md – Projektkontext für KI-Assistenten

> Diese Datei ist der zentrale Einstiegspunkt für KI-Assistenten (Claude & Co.),
> die an **Fehmarn Open** arbeiten. Sie beschreibt Architektur, Konventionen und
> Arbeitsweise. Details liegen im Ordner `docs/` – thematisch gegliedert:
> `docs/features/` (was die Software kann, Ist-Zustand), `docs/adr/` (Entscheidungen),
> **`docs/quality/`** (Teststrategie, Linting, statische Analyse, Architekturtests,
> CI/CD), `docs/tickets/` (Historie + Qualitäts-Roadmap). Start: `docs/README.md`.

## Was ist das Projekt?

Webanwendung zur Verwaltung von Anmeldungen für das jährliche **Fehmarn Open**
Dart-Turnier (Radikal-Geräte). Ersetzt die bisherige manuelle Verwaltung per
Excel und WhatsApp/E-Mail. Erste echte Testabnahme steht an; das Turnier findet
im kommenden Jahr statt.

## Tech-Stack

| Bereich    | Technologie |
|------------|-------------|
| Backend    | Java 25, Spring Boot 4 |
| Frontend   | Angular 21 (Standalone Components) |
| Datenbank  | SQLite via Spring Data JPA / Hibernate (community dialect) |
| Auth       | Spring Security + JWT (jjwt) |
| Build      | Maven (backend, mit frontend-maven-plugin), npm/Angular CLI (frontend) |
| CI/CD      | GitHub Actions (`.github/workflows/`) |

## Projektstruktur

```
/
├── backend/                     # Spring Boot 4 (Java 25)
│   └── src/main/java/de/dart/fehmarnopen/
│       ├── auth/                # JWT: Controller, Filter, Service, DTOs
│       ├── config/              # Security, CORS, DataInitializer, Async, Properties
│       ├── controller/          # REST: Anmeldung, Teilnehmer, AdminTeilnehmer
│       ├── dto/                 # Request/Response-DTOs
│       ├── entity/              # Teilnehmer, Anmeldung, Disziplin, AdminUser, TurnierConfig
│       ├── exception/           # GlobalExceptionHandler + fachliche Exceptions
│       ├── repository/          # Spring Data JPA Repositories
│       └── service/             # AnmeldungService (Kernlogik)
├── frontend/                    # Angular 21
│   └── src/app/
│       ├── auth/                # Guard, Interceptor, Service
│       ├── core/                # HTTP-Error-Interceptor, Toast-/Error-Services
│       ├── pages/               # anmeldung, teilnehmer, flyer, login
│       ├── shared/ + ui/        # Disziplin-Modell, Toast-Komponente
├── docs/                        # Backlog, Entscheidungen, Requirements, Notizen
└── AGENTS.md                    # DIESE DATEI
```

## Fachliche Kernpunkte

- **Disziplinen:** Herreneinzel, Dameneinzel, Herrendoppel, Damendoppel,
  Triple Mix, Teamwettbewerb – je 10 €/Person. Bezahlung nur vor Ort.
- **Teilnehmer-Flow:** Online-Anmeldung (ohne E-Mail) → öffentliche Teilnehmerliste.
  Bezahlung ausschließlich vor Ort.
- **Admin-Flow (Ist):** Login → Teilnehmerverwaltung + manuelle Abmeldung/Reaktivieren
  → Anwesenheitskontrolle. Das ist implementiert.
- **Scope-Stand 2026-07-04** (siehe `docs/adr/0008-scope-reduktion-testabnahme.md`):
  - **Flyer-Upload** → umsetzen (vor Testabnahme), **QR-Code** → gewünscht.
  - **Excel-Export** → verschoben. **Anmeldeschluss** → als Server-Config umgesetzt (#153, ADR 0013);
    die tote `TurnierConfig`-Tabelle wurde entfernt.
  - **Selbst-Abmeldung** → gestrichen (Teil-Code bleibt liegen). **E-Mail/Mailversand** →
    per #113 vollständig entfernt (kein Mail-Layer, kein `email`-Feld mehr).
  Verifizierter Feature-Stand: `docs/features/`. Offene Punkte: `docs/tickets/quality-roadmap.md`.

## Wichtige technische Entscheidungen (Kurzform, Details in docs/decisions.md)

- **SQLite mit Connection-Pool = 1** + `busy_timeout`: SQLite erlaubt nur einen
  Schreiber. Der Pool serialisiert gleichzeitige Writes, um `SQLITE_BUSY` zu
  vermeiden. **Nicht** blind hochsetzen ohne über Nebenläufigkeit nachzudenken.
- **JWT stateless**, keine Server-Sessions. `JWT_SECRET` ist Pflicht-Env-Var.
- **Schema via Liquibase, `ddl-auto: none`** (ADR 0009, löst ADR 0004 ab): Das DB-Schema
  wird ausschließlich über **Liquibase-Migrationen** gepflegt, Hibernate fasst es nicht mehr an.
  **Jede Schema-Änderung (Entity-Feld/-Tabelle/Constraint) braucht ein neues Changelog** unter
  `backend/src/main/resources/db/changelog/changes/<n>-<beschreibung>.sql` (bzw. `.yaml`),
  im `db.changelog-master.yaml` eingebunden. Eine Entity-Änderung **ohne** zugehörige Migration
  ist unvollständig und **muss getestet** werden (Round-Trip-Test, siehe `SchemaMigrationTest`) —
  `validate` ist auf SQLite nicht nutzbar (INTEGER-PK vs. BIGINT-Erwartung), Tests sind das
  Sicherheitsnetz. **SQLite-Spezifika:** kein `ALTER TABLE … DROP COLUMN/CONSTRAINT`; strukturelle
  Änderungen als deklaratives YAML/XML-Changeset (Liquibase baut sicher um) oder als SQL-Rebuild
  (neue Tabelle + `INSERT … SELECT` + `DROP` + `RENAME`).

## Konfiguration (Env-Variablen)

Pflicht zum Start des Backends: `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD`, `JWT_SECRET`.
Optional u.a.: `ADMIN_*_USERNAME`, `CORS_ALLOWED_ORIGINS`, `JWT_EXPIRATION_MS`.
Siehe `application.yaml`.

## Lokale Entwicklung

```bash
# Backend (Java 25 nötig!)
cd backend
export ADMIN_1_PASSWORD=... ADMIN_2_PASSWORD=... JWT_SECRET=...
./mvnw spring-boot:run        # http://localhost:8080

# Frontend
cd frontend
npm install && ng serve       # http://localhost:4200, /api proxied
```

## CI/CD

- **`ci.yml`** — **eine Pipeline** (Push/PR/`workflow_dispatch` auf `main`):
  - **Test-Stufe** (parallel): `backend` (Spotless → `mvnw verify`) und `frontend`
    (`npm ci` → Prettier → ESLint → Tests → Build). **Das ist die Build-Wahrheit.**
  - **Deploy-Stufe** `deploy` mit `needs: [backend, frontend]` → läuft nur nach
    grünen Tests. Push auf `main` → Test (Port 8081), `workflow_dispatch` →
    test/prod (Port 8080, Tests laufen zuerst), PR → nur Tests. SSH/SCP auf Server,
    `systemctl restart fehmarnopen-<env>`, Healthcheck auf `/api/teilnehmer`.
- **Releases:** Version wird per „Release (Bump-PR)"-Workflow gebumpt (SemVer, pom + package.json),
  nach dem Merge entsteht automatisch Tag + GitHub Release. Rollback + Details: `docs/deployment.md`.

## Konventionen

- **Sprache:** Code-Kommentare, Commits, Doku und UI auf **Deutsch**.
- **Formatierung Backend:** Spotless (CI bricht sonst). Vor Commit `./mvnw spotless:apply`.
- **Commits:** Kurz, deutsch, mit Issue-Referenz wenn vorhanden (z.B. `#27 admin-teilnehmerliste ...`).
- **Tests:** Vorhandene Testabdeckung nicht verschlechtern; neue Logik testen.
- **DB (`*.db`) und `target/`, `node_modules/` niemals committen** (in .gitignore).

## Arbeitsweise mit KI-Assistenten

Siehe `docs/workflow.md` für den vollständigen Workflow (Branches, PRs via gh CLI,
Ticket-Format). Kurz: Feature-Branch pro Ticket → committen mit Issue-Referenz →
PR → CI grün → Merge → Auto-Deploy Test.

Wichtig: **Kein `--amend`/Force-Push auf gepushten PR-Branches** – Korrekturen als
neuen Commit obendrauf; Konflikte per `git merge origin/main` lösen. Vor jedem Commit
die **volle** lokale Quality-Gate (Frontend: `npm run lint` + `npm test` +
`npm run format:check`; Backend: `spotless:apply` + `verify`).
