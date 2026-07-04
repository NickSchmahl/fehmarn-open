# Ticket-Historie (aus der Git-Historie rekonstruiert)

Die Issue-Nummern stammen aus Commit-Referenzen (`#NN`). Es gab **keinen** `gh`-Zugang
beim Erstellen dieses Dokuments, daher sind Titel aus Commits/Code abgeleitet, nicht
aus GitHub gezogen. Erkennbare Nummern: #1–#14, #19, #21–#28, #34–#37, #42.

> ⚠️ **Wichtig:** „Commit vorhanden" ≠ „Feature fertig". Einige Features gelten laut
> README als erledigt, sind im Code aber unvollständig – siehe Spalte „Realität" und
> [features/admin.md](../features/admin.md).

## Setup & Fundament

| # | Thema | Commit(s) | Realität |
|---|-------|-----------|----------|
| #1 | Project setup | `74e7d0c` | ✅ |
| #2 | Backend setup (Spring Boot) | `cc91aca` | ✅ |
| #3 | Frontend setup (Angular `ng new`) | `015ec4b`, `27914ab` | ✅ |
| #4 | DB-Schema + Admin-User via Env | `fbd15c4`, `1996782` | ✅ |
| #5, #6 | README-Pflege | `0f9be42`, `4f2907d` | ✅ |
| #37 | Spotless, mvn/mvnw, Frontend-CI | `07836a0`, `15561fe`, `0d5428a`, `0a1de11` | ✅ (Basis) |

## Auth & Security

| # | Thema | Commit(s) | Realität |
|---|-------|-----------|----------|
| #7 | Login-Endpunkt Backend | `9b16ebd` | ✅ |
| #8 | „more security" | `29a6a79` | ✅ |
| #9 | Frontend-Login | `35f8ea2` | ✅ |
| #10 | Logout + Navbar | `a34f4a7` | ✅ |
| #42 | Logout/Navbar (zus. mit #10) | `a34f4a7` | ✅ |
| #34 | GlobalExceptionHandler eingebaut | `4e9b598` | ✅ |
| #35 | Globales Error-Handling | `0bb14a0` | ✅ |

## Anmeldung / Teilnehmer

| # | Thema | Commit(s) | Realität |
|---|-------|-----------|----------|
| #11 | Anmeldung Repo + Service | `e32de44` | ✅ |
| #12 | Anmelde-Endpunkt | `c10655d` | ✅ |
| #14 | Anmeldemaske (Frontend) | `6013a89` | ✅ |
| #13, #22 | Bestätigungsmails An-/Abmeldung | `4293f5c` | ⚠️ Mail ja – **aber Abmelde-Endpunkt für den Link fehlt** (siehe [features/teilnehmer.md](../features/teilnehmer.md)) |
| #23, #26 | Teilnehmerseite mit Disziplin-Filter | `3df5ecb` | ✅ |

## Admin

| # | Thema | Commit(s) | Realität |
|---|-------|-----------|----------|
| #24, #27, #19, #21, #25, #28 | Admin-Teilnehmerverwaltung + Anwesenheit | `3689f36`, `cf99afb` | ⚠️ **teilweise** – Verwaltung/Abmeldung/Reaktivieren/Anwesenheit ✅; **Flyer-Upload, Excel-Export, QR-Code, Anmeldeschluss nicht implementiert** (siehe [features/admin.md](../features/admin.md)) |

## Build / Infrastruktur

| # | Thema | Commit(s) | Realität |
|---|-------|-----------|----------|
| #36 | Angular-Build in `mvn package`, statische Seiten ins Backend | `1389c93`, `e00aee4`, `fcb0b9c` | ✅ |
| (ohne #) | maven-wrapper reparieren, CI umstellen | `f53e32e` | ✅ |
| (ohne #) | SQLITE_BUSY-Fix (Pool=1) | `80022cf` | ✅ ([ADR 0001](../adr/0001-sqlite-pool-1.md)) |
| (ohne #) | body-margin reset | `73a78e6` | ✅ |
| (ohne #) | Prod-Deployment vorbereiten | `f267247` | ⚠️ Deploy nicht an grüne CI gekoppelt ([quality/ci-cd.md](../quality/ci-cd.md)) |

## Nicht eindeutig zugeordnet
`#19`, `#21`, `#25` erscheinen nur gebündelt im Admin-Commit `3689f36`; genaue
Einzeltitel sind ohne GitHub-Zugang nicht rekonstruierbar. Bei `gh`-Zugang nachtragen.
