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
| Ablageort | `deploy/db-ui/` (eigener Reiter, dort kommen künftig ggf. weitere Ops-Tools dazu). |
| SQLite-Sicherheit | Einzelner manueller Write ist mit `busy_timeout` unkritisch. Keine *dauerhaft* zweite schreibende App. Vor destruktiven Aktionen: Backup. |

## Architektur / Ablauf

```
Laptop ──ssh -L 8090:127.0.0.1:8090 root@hetzner──▶ hetzner 127.0.0.1:8090
                                                        │
                                                   Adminer-Container (rw)
                                                        │
                                /opt/fehmarnopen/test/fehmarnopen.db
                                /opt/fehmarnopen/prod/fehmarnopen.db
```

### `deploy/db-ui/docker-compose.yml`

```yaml
services:
  adminer:
    image: adminer:5          # feste Version pinnen; für Updates bewusst anheben
    restart: unless-stopped
    ports:
      - "127.0.0.1:8090:8080" # NUR localhost — von außen unerreichbar
    user: "<uid>:<gid>"        # Eigentümer der DB-Dateien; sonst keine Schreibrechte
    volumes:
      # Verzeichnisse mounten (nicht nur die Dateien!), damit SQLite seine
      # Sidecars (-wal/-shm/-journal) NEBEN der DB anlegt und die App dieselben
      # Dateien sieht. Ein Single-File-Mount würde die Sidecars in den Container
      # umleiten → bei WAL Korruptionsrisiko.
      - /opt/fehmarnopen/test:/opt/fehmarnopen/test
      - /opt/fehmarnopen/prod:/opt/fehmarnopen/prod
```

### Zugriffs-Flow

1. `ssh -L 8090:127.0.0.1:8090 root@hetzner`
2. Browser lokal: `http://localhost:8090`
3. Adminer-Login: System **SQLite**, Datei-Pfad eintragen:
   - Test: `/opt/fehmarnopen/test/fehmarnopen.db`
   - Prod: `/opt/fehmarnopen/prod/fehmarnopen.db`

## Stolpersteine / Betriebsregeln (→ Doku)

- **Datei-Rechte:** Der Container-User braucht `rw` auf DB-**Datei und Verzeichnis**
  (für Sidecar-Dateien). Vor dem Start `stat /opt/fehmarnopen/prod/fehmarnopen.db`
  → dessen UID/GID in `user:` eintragen.
- **Secrets im Mount:** `/opt/fehmarnopen/{test,prod}/` enthalten auch `config.env`
  (JWT_SECRET, Admin-Passwörter). Die sind im Container mit sichtbar. Bewusst
  akzeptierter Trade-off: localhost-only + SSH-gated (root sieht die ohnehin).
- **Backup vor destruktiven Writes:** vor manuellen Löschungen auf **prod**
  `cp fehmarnopen.db fehmarnopen.db.bak` (im jeweiligen Verzeichnis).
- **Adminer-Hygiene:** Image-Version pinnen; gelegentlich
  `docker compose pull && docker compose up -d` für Sicherheitsupdates.
- **Reboot:** `restart: unless-stopped` startet den Container automatisch wieder.

## Doku (`docs/deployment.md`)

Neuer Abschnitt **„DB-UI (Adminer via SSH-Tunnel)"** mit:

1. **Docker einmalig installieren** (Debian/Ubuntu): `docker.io` + Compose-Plugin,
   `systemctl enable --now docker`.
2. **UID/GID ermitteln** (`stat` auf die prod-DB) und in die Compose-Datei eintragen.
3. **Container starten:** `docker compose -f deploy/db-ui/docker-compose.yml up -d`
   (Compose-Datei vorher auf den Server bringen oder Repo dort auschecken).
4. **Tunnel + Login:** `ssh -L …`, `http://localhost:8090`, die zwei DB-Pfade.
5. **Betriebsregeln:** Backup vor Löschen, Update-Kommando, Sicherheitshinweis
   (nie öffentlich exponieren).

## Testing / Verifikation

Reine Infra, kein Unit-Test. Verifikation manuell nach dem Setup:

1. `docker compose config` prüft die Compose-Datei syntaktisch (lokal möglich).
2. Auf dem Server: Container läuft (`docker compose ps`), lauscht nur auf
   `127.0.0.1:8090` (`ss -tlnp | grep 8090` zeigt keine `0.0.0.0`-Bindung).
3. Tunnel auf, `http://localhost:8090`, **test-DB** öffnen, ein `SELECT` auf
   `teilnehmer` liefert Zeilen (Lesepfad ok).
4. In der **test**-DB testweise eine Zeile einfügen/löschen (Schreibpfad + Rechte ok),
   danach prüfen, dass die laufende App weiterhin normal antwortet (kein Lock-Problem).
5. Von außen (ohne Tunnel) ist Port 8090 **nicht** erreichbar (Bind nur an
   `127.0.0.1`; es gibt bewusst keinen Caddy-Block/keine Domain dafür).

## Sequencing / Branch

- Eigener Branch `db-ui-adminer` gegen `main`, eigener PR.
- Zwei Deliverables: `deploy/db-ui/docker-compose.yml` + Abschnitt in
  `docs/deployment.md`. Server-Setup (Docker installieren, Container starten) ist
  ein **einmaliger manueller Schritt**, per Doku reproduzierbar.

## Bewusst NICHT im Scope (YAGNI)

- **Kein** öffentliches `db.fehmarn-open.de`, kein Caddy-Block, kein TLS, keine
  basic_auth — SSH-Tunnel ist bewusst die einzige Zugangssperre.
- **Keine** CI-Integration — der Container ist langlebig, kein Deploy-Artefakt.
- **Kein** Config-Management (Ansible o. ä.) für die einmalige Docker-Installation.
- **Kein** read-only-Modus / getrennte prod-Absicherung — voller rw-Zugriff ist
  für die Löschanträge gewollt, Disziplin (Backup) statt technischer Sperre.
