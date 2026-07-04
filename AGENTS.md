# AGENTS.md – Projektkontext für KI-Assistenten

> Diese Datei ist der zentrale Einstiegspunkt für KI-Assistenten (Claude & Co.),
> die an **Fehmarn Open** arbeiten. Sie beschreibt Architektur, Konventionen und
> Arbeitsweise. Details liegen im Ordner `docs/` – thematisch gegliedert:
> `docs/features/` (was die Software kann, Ist-Zustand), `docs/adr/` (Entscheidungen),
> **`docs/quality/`** (Teststrategie, Linting, statische Analyse, Architekturtests,
> CI/CD), `docs/tickets/` (Historie + Qualitäts-Roadmap). Start: `docs/README.md`.

## Was ist das Projekt?

Webanwendung zur Verwaltung von Anmeldungen für das jährliche **Fehmarn Open**
Dart-Turnier (Radical-Geräte). Ersetzt die bisherige manuelle Verwaltung per
Excel und WhatsApp/E-Mail. Erste echte Testabnahme steht an; das Turnier findet
im kommenden Jahr statt.

## Tech-Stack

| Bereich    | Technologie |
|------------|-------------|
| Backend    | Java 25, Spring Boot 4 |
| Frontend   | Angular 21 (Standalone Components) |
| Datenbank  | SQLite via Spring Data JPA / Hibernate (community dialect) |
| Auth       | Spring Security + JWT (jjwt) |
| Mail       | Spring Mail; lokal über Mailpit (Docker) |
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
│       ├── event/ + mail/       # Event-basierter Mailversand (async)
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
├── compose.yaml                 # Mailpit für lokale Entwicklung
└── AGENTS.md                    # DIESE DATEI
```

## Fachliche Kernpunkte

- **Disziplinen:** Herreneinzel, Dameneinzel, Herrendoppel, Mixed-Doppel,
  Triple Mix, Teamwettbewerb – je 10 €/Person. Bezahlung nur vor Ort.
- **Teilnehmer-Flow:** Online-Anmeldung → Bestätigungsmail mit persönlichem
  Abmeldelink → optionale Selbst-Abmeldung → öffentliche Teilnehmerliste.
- **Admin-Flow (Ist):** Login → Teilnehmerverwaltung + manuelle Abmeldung/Reaktivieren
  → Anwesenheitskontrolle. Das ist implementiert.
- **Scope-Stand 2026-07-04** (siehe `docs/adr/0008-scope-reduktion-testabnahme.md`):
  - **Flyer-Upload** → umsetzen (vor Testabnahme), **QR-Code** → gewünscht.
  - **Excel-Export** → verschoben. **Anmeldeschluss/`TurnierConfig`** → soll raus (toter Code).
  - **Selbst-Abmeldung** → gestrichen (Teil-Code bleibt liegen). **E-Mail-Versand** →
    ruht: Bestätigungsmail-Trigger wird gekappt, Mail-Code bleibt erhalten.
  Verifizierter Feature-Stand: `docs/features/`. Offene Punkte: `docs/tickets/quality-roadmap.md`.

## Wichtige technische Entscheidungen (Kurzform, Details in docs/decisions.md)

- **SQLite mit Connection-Pool = 1** + `busy_timeout`: SQLite erlaubt nur einen
  Schreiber. Der Pool serialisiert gleichzeitige Writes, um `SQLITE_BUSY` zu
  vermeiden. **Nicht** blind hochsetzen ohne über Nebenläufigkeit nachzudenken.
- **JWT stateless**, keine Server-Sessions. `JWT_SECRET` ist Pflicht-Env-Var.
- **Mailversand async** über Application Events (`AnmeldungBestaetigtEvent` etc.).
- **`ddl-auto: update`** – Schema wird von Hibernate gepflegt (keine Migrations-
  Tooling wie Flyway). Bei Entity-Änderungen daran denken.

## Konfiguration (Env-Variablen)

Pflicht zum Start des Backends: `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD`, `JWT_SECRET`.
Optional u.a.: `ADMIN_*_USERNAME`, `MAIL_HOST/PORT/USERNAME/PASSWORD`, `MAIL_FROM`,
`MAIL_ENABLED`, `CORS_ALLOWED_ORIGINS`, `JWT_EXPIRATION_MS`. Siehe `application.yaml`.

## Lokale Entwicklung

```bash
docker compose up -d          # Mailpit (SMTP :1025, Web-UI :8025)

# Backend (Java 25 nötig!)
cd backend
export ADMIN_1_PASSWORD=... ADMIN_2_PASSWORD=... JWT_SECRET=...
./mvnw spring-boot:run        # http://localhost:8080

# Frontend
cd frontend
npm install && ng serve       # http://localhost:4200, /api proxied
```

## CI/CD

- **`backend-ci.yml`** (Push/PR auf `main`): Spotless-Formatcheck → `mvnw verify`
  (Backend-Tests) → Frontend `npm ci` + Tests + Build. **Das ist die Build-Wahrheit.**
- **`deploy.yml`**: Push auf `main` → Deploy Test-Umgebung (Port 8081).
  Manuell (`workflow_dispatch`) → test **oder** prod (Port 8080). SSH/SCP auf
  Server, `systemctl restart fehmarnopen-<env>`, Healthcheck auf `/api/teilnehmer`.

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
