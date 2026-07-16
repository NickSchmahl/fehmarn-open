# Design: DB-UI (Adminer via SSH-Tunnel, Docker)

- **Datum:** 2026-07-15
- **Baut auf:** #119 (Server-Layout `/opt/fehmarnopen/{test,prod}/`), bestehendem systemd-/Caddy-Setup

## Problem

Es gibt keine bequeme Oberfläche, um in die SQLite-Datenbanken zu schauen oder
gezielt Daten zu ändern (z.B. **DSGVO-Löschanträge** — echter Hard-Delete, den die
App-UI nicht bietet; sie kann nur „Abmelden/Reaktivieren"). Direkter Zugriff per
DataGrip **scheitert prinzipiell**: SQLite ist eine Datei ohne Server/Port, ein
SSH-Tunnel leitet nur TCP weiter — der JDBC-Treiber öffnet den Pfad lokal auf dem
Mac, wo die Datei nicht liegt. Es braucht ein Frontend, das **auf dem Server neben
der Datei** läuft.

## Ziel

Ein Web-DB-Frontend (Adminer) auf hetzner, das **beide** DBs (`test`/`prod`) lesen
und schreiben kann, ausschließlich über SSH-Tunnel erreichbar (`http://localhost:8090`),
**nicht** öffentlich. Reproduzierbar via Docker Compose, gut dokumentiert in
`docs/deployment.md`.

## Getroffene Entscheidungen

| Frage | Entscheidung |
|-------|--------------|
| Zugriffsart | **Lese- + Schreibzugriff** (nötig für DSGVO-Hard-Deletes). |
| Tool | **Adminer** — winziges PHP-Tool, wenige MB RAM, passt zur kleinen Box. sqlite-web (1 DB/Instanz) und CloudBeaver (Java, ~500 MB) verworfen. |
| Exposition | **Nur SSH-Tunnel**, Bind an `127.0.0.1:8090`. Kein Caddy-Block, kein TLS, keine basic_auth — SSH ist die Auth. Niemand aus dem öffentlichen Netz kommt dran. |
| Betrieb | **Docker Compose** (`restart: unless-stopped`). Docker wird dafür einmalig auf hetzner installiert (bisher rein systemd). |
| Ablageort Compose | `deploy/db-ui/` (eigener Reiter, dort kommen künftig ggf. weitere Ops-Tools dazu). |
| **DB-Ablage** | Umzug in ein eigenes `db/`-Unterverzeichnis (`jdbc:sqlite:db/fehmarnopen.db`), damit **nur** die DB gemountet wird — nicht JAR + `config.env` (Secrets). Absoluter Pfad (`/var/lib/...`) verworfen: relativer Ein-Zeilen-Change ist minimaler. |
| SQLite-Sicherheit | Einzelner manueller Write ist mit `busy_timeout` unkritisch. Keine *dauerhaft* zweite schreibende App. Vor destruktiven Aktionen: Backup. WAL-Modus ist aktiv (`db-reset.yml` löscht `-wal`/`-shm`) → **Verzeichnis** mounten, nie einzelne Datei. |

## Architektur / Ablauf

```
Laptop ──ssh -L 8090:127.0.0.1:8090 root@hetzner──▶ hetzner 127.0.0.1:8090
                                                        │
                                                   Adminer-Container (rw)
                                                        │ (nur db/ gemountet)
                                /opt/fehmarnopen/test/db/fehmarnopen.db
                                /opt/fehmarnopen/prod/db/fehmarnopen.db
```

JAR (`app.jar`), `config.env` und `secrets.env` liegen weiterhin im Elternverzeichnis
`/opt/fehmarnopen/<env>/` und werden **nicht** in den Container gemountet.

### `deploy/db-ui/docker-compose.yml`

```yaml
services:
  adminer:
    image: adminer:5          # feste Version pinnen; für Updates bewusst anheben
    restart: unless-stopped
    ports:
      - "127.0.0.1:8090:8080" # NUR localhost — von außen unerreichbar
    user: "<uid>:<gid>"        # = Service-User 'fehmarnopen' (id fehmarnopen); sonst keine Schreibrechte
    volumes:
      # NUR das db/-Verzeichnis mounten (nicht das ganze env-Verzeichnis → keine
      # Secrets/JAR im Container). Verzeichnis, nicht Einzeldatei: SQLite legt seine
      # WAL-Sidecars (-wal/-shm) NEBEN der DB an; ein Single-File-Mount würde sie in
      # den Container umleiten → Korruptionsrisiko.
      - /opt/fehmarnopen/test/db:/opt/fehmarnopen/test/db
      - /opt/fehmarnopen/prod/db:/opt/fehmarnopen/prod/db
```

### Zugriffs-Flow

1. `ssh -L 8090:127.0.0.1:8090 root@hetzner`
2. Browser lokal: `http://localhost:8090`
3. Adminer-Login: System **SQLite**, Datei-Pfad eintragen:
   - Test: `/opt/fehmarnopen/test/db/fehmarnopen.db`
   - Prod: `/opt/fehmarnopen/prod/db/fehmarnopen.db`

## Stolpersteine / Betriebsregeln (→ Doku)

- **Datei-Rechte:** Der Container-User braucht `rw` auf DB-**Datei und `db/`-Verzeichnis**
  (für Sidecar-Dateien). Vor dem Start `stat /opt/fehmarnopen/prod/db/fehmarnopen.db`
  → dessen UID/GID in `user:` eintragen.
- **Keine Secrets im Mount:** Durch die `db/`-Isolierung landen `config.env`
  (JWT_SECRET, Admin-Passwörter) und die JAR **nicht** im Container.
- **Backup vor destruktiven Writes:** vor manuellen Löschungen auf **prod**
  `cp fehmarnopen.db fehmarnopen.db.bak` (im `db/`-Verzeichnis).
- **Adminer-Hygiene:** Image-Version pinnen; gelegentlich
  `docker compose pull && docker compose up -d` für Sicherheitsupdates.
- **Reboot:** `restart: unless-stopped` startet den Container automatisch wieder.

## DB-Umzug nach `db/` (Voraussetzung, einmalig)

Damit nur die DB gemountet wird, zieht sie pro Umgebung in ein `db/`-Unterverzeichnis.
Betrifft **beide deployten Umgebungen** (test + prod), die beide das relative
`application.yaml` nutzen — `application-test.yaml` (`./target/test-auth.db`) ist das
Test-Profil für lokale Tests/CI und bleibt **unangetastet**.

### Code-Änderungen (im PR)

1. `backend/src/main/resources/application.yaml`: `url: jdbc:sqlite:fehmarnopen.db`
   → `url: jdbc:sqlite:db/fehmarnopen.db`.
2. `.github/workflows/db-reset.yml`: Pfade `$APP_DIR/fehmarnopen.db*` →
   `$APP_DIR/db/fehmarnopen.db*` (inkl. `-wal`/`-shm`). `mkdir -p "$APP_DIR/db"` vor
   dem Service-Start ergänzen, falls Reset das Verzeichnis mitentfernt.
3. Sicherstellen, dass das `db/`-Verzeichnis beim App-Start existiert (der
   SQLite-JDBC-Treiber legt fehlende Elternverzeichnisse **nicht** an) — im
   `ci.yml`-Deploy-Skript vor `systemctl restart fehmarnopen-$ENV`:
   `mkdir -p /opt/fehmarnopen/$ENV/db && chown fehmarnopen:fehmarnopen /opt/fehmarnopen/$ENV/db`.

### Server-Migration (pro Umgebung, prod mit echten Daten)

Reihenfolge ist kritisch, damit die neue App-Version keine leere DB anlegt:

```bash
ENV=prod            # danach für test wiederholen
APP_DIR=/opt/fehmarnopen/$ENV
systemctl stop fehmarnopen-$ENV
cp "$APP_DIR"/fehmarnopen.db "$APP_DIR"/fehmarnopen.db.bak   # Backup!
mkdir -p "$APP_DIR/db"
mv "$APP_DIR"/fehmarnopen.db "$APP_DIR"/fehmarnopen.db-wal \
   "$APP_DIR"/fehmarnopen.db-shm "$APP_DIR/db"/ 2>/dev/null
# -wal/-shm existieren nur, wenn beim Stop offen — fehlend ist ok
chown -R fehmarnopen:fehmarnopen "$APP_DIR/db"
# neue App-Version (mit db/-Pfad) deployen, dann:
systemctl start fehmarnopen-$ENV
```

Deploy der neuen JAR/Config und der Umzug müssen zusammen passieren: Entweder Umzug
direkt vor dem ersten Deploy mit dem neuen Pfad, oder Service gestoppt lassen bis die
neue Version liegt.

## Doku (`docs/deployment.md`)

Neuer Abschnitt **„DB-UI (Adminer via SSH-Tunnel)"** mit:

1. **DB-Umzug nach `db/`** (siehe Abschnitt oben) — Voraussetzung, einmalig pro Umgebung.
2. **Docker einmalig installieren** (Debian/Ubuntu): `docker.io` + Compose-Plugin,
   `systemctl enable --now docker`.
3. **UID/GID ermitteln** (`stat` auf die prod-DB unter `db/`) und in die Compose-Datei
   eintragen.
4. **Container starten:** `docker compose -f deploy/db-ui/docker-compose.yml up -d`
   (Compose-Datei vorher auf den Server bringen oder Repo dort auschecken).
5. **Tunnel + Login:** `ssh -L …`, `http://localhost:8090`, die zwei DB-Pfade.
6. **Betriebsregeln:** Backup vor Löschen, Update-Kommando, Sicherheitshinweis
   (nie öffentlich exponieren).

## Testing / Verifikation

Reine Infra, kein Unit-Test. Verifikation manuell nach dem Setup:

1. **Nach dem DB-Umzug:** App startet grün, Healthcheck `/api/teilnehmer` liefert die
   bestehenden Daten (DB wurde gefunden, nicht leer neu angelegt). Der `SchemaMigrationTest`
   / `./mvnw verify` läuft weiterhin grün (Pfad-Change bricht keine Tests).
2. `docker compose config` prüft die Compose-Datei syntaktisch (lokal möglich).
3. Auf dem Server: Container läuft (`docker compose ps`), lauscht nur auf
   `127.0.0.1:8090` (`ss -tlnp | grep 8090` zeigt keine `0.0.0.0`-Bindung).
4. Tunnel auf, `http://localhost:8090`, **test-DB** unter `db/` öffnen, ein `SELECT`
   auf `teilnehmer` liefert Zeilen (Lesepfad ok).
5. In der **test**-DB testweise eine Zeile einfügen/löschen (Schreibpfad + Rechte ok),
   danach prüfen, dass die laufende App weiterhin normal antwortet (kein Lock-Problem).
6. Von außen (ohne Tunnel) ist Port 8090 **nicht** erreichbar (Bind nur an
   `127.0.0.1`; es gibt bewusst keinen Caddy-Block/keine Domain dafür).

## Sequencing / Branch

- Eigener Branch `db-ui-adminer` gegen `main`, eigener PR.
- **Deliverables im Repo:**
  1. `backend/src/main/resources/application.yaml` — DB-Pfad → `db/fehmarnopen.db`.
  2. `.github/workflows/db-reset.yml` — Pfade auf `db/` umstellen + `mkdir -p`.
  3. Deploy-Skript (`ci.yml`) — `mkdir -p "$APP_DIR/db"` vor `systemctl start`.
  4. `deploy/db-ui/docker-compose.yml` — Adminer-Container.
  5. `docs/deployment.md` — neuer Abschnitt (inkl. DB-Umzug + DB-UI).
- **Einmalige manuelle Server-Schritte** (per Doku reproduzierbar): DB-Migration nach
  `db/`, Docker installieren, Container starten.

## Bewusst NICHT im Scope (YAGNI)

- **Kein** öffentliches `db.fehmarn-open.de`, kein Caddy-Block, kein TLS, keine
  basic_auth — SSH-Tunnel ist bewusst die einzige Zugangssperre.
- **Keine** CI-Integration — der Container ist langlebig, kein Deploy-Artefakt.
- **Kein** Config-Management (Ansible o. ä.) für die einmalige Docker-Installation.
- **Kein** read-only-Modus / getrennte prod-Absicherung — voller rw-Zugriff ist
  für die Löschanträge gewollt, Disziplin (Backup) statt technischer Sperre.
