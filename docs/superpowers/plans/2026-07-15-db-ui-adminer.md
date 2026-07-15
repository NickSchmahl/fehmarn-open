# DB-UI (Adminer via SSH-Tunnel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Adminer-Web-Frontend auf hetzner, nur per SSH-Tunnel erreichbar, das beide SQLite-DBs (test/prod) lesen und schreiben kann — dafür ziehen die DBs vorher in ein isoliertes `db/`-Unterverzeichnis.

**Architecture:** Die DB liegt künftig unter `/opt/fehmarnopen/<env>/db/fehmarnopen.db` (relativer JDBC-Pfad `db/fehmarnopen.db`), damit der Adminer-Container **nur** dieses Verzeichnis mountet — ohne `app.jar`, `config.env`, `secrets.env`. Adminer läuft als Docker-Compose-Dienst, gebunden an `127.0.0.1:8090`, Zugriff ausschließlich über `ssh -L`. Kein Caddy-Block, kein öffentliches DNS.

**Tech Stack:** Spring Boot 4 / SQLite (WAL-Modus, xerial sqlite-jdbc), GitHub Actions (Deploy + DB-Reset), Docker Compose, Adminer (PHP), Caddy (unangetastet).

**Spec:** [docs/superpowers/specs/2026-07-15-db-ui-adminer-design.md](../specs/2026-07-15-db-ui-adminer-design.md)

## Global Constraints

- **Sprache:** Kommentare, Commits, Doku auf **Deutsch**.
- **Backend-Format:** Vor jedem Commit an Backend-Dateien `./mvnw spotless:apply` (der Pre-Commit-Hook prüft `spotless:check`; YAML/gitignore/Doku sind davon nicht betroffen, aber `application.yaml` liegt unter `backend/`).
- **DBs nie committen:** `*.db` ist in `backend/.gitignore` gepflegt. Echte `.db`-Dateien landen nie im Repo.
- **Kein `--amend`/Force-Push** auf gepushten Branches — Korrekturen als neuer Commit.
- **Service-User auf dem Server:** `fehmarnopen` (Eigentümer aller Dateien unter `/opt/fehmarnopen/<env>/`).
- **WAL-Modus aktiv:** DB hat Sidecars `fehmarnopen.db-wal` / `fehmarnopen.db-shm`. Immer das **Verzeichnis** behandeln, nie eine Einzeldatei mounten.
- **Commit-Trailer:** Jeder Commit endet mit `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**Hinweis zur Testbarkeit:** Dies ist überwiegend Infra-/Config-Arbeit. Klassische Unit-Tests greifen hier nicht (die deployten Umgebungen nutzen das Default-Profil `application.yaml`, die Testsuite dagegen `application-test.yaml` mit `./target/test-auth.db`). Verifikation erfolgt deshalb über **konkrete Kommandos mit erwarteter Ausgabe** statt über neue Tests. Der reale Nachweis ist die Server-Migration + Healthcheck (Runbook am Ende).

---

## Task 1: DB-Pfad in isoliertes `db/`-Unterverzeichnis umstellen

Kernänderung: relativer JDBC-Pfad zeigt auf `db/fehmarnopen.db`. Damit lokale Entwicklung (und der spätere Server-Betrieb) weiter funktioniert, muss das `db/`-Verzeichnis existieren (der SQLite-JDBC-Treiber legt fehlende Parent-Dirs **nicht** an) — dafür ein getracktes `backend/db/.gitkeep`. Zusätzlich die WAL-Sidecars ignorieren.

**Files:**
- Modify: `backend/src/main/resources/application.yaml:16`
- Create: `backend/db/.gitkeep`
- Modify: `backend/.gitignore` (nach `*.sqlite3`, ~Zeile 41)

**Interfaces:**
- Produces: DB-Pfad-Konvention `db/fehmarnopen.db` (relativ zum Arbeitsverzeichnis des Prozesses). Tasks 2–4 verlassen sich auf genau dieses `db/`-Unterverzeichnis.

- [ ] **Step 1: JDBC-URL auf `db/`-Unterordner ändern**

In `backend/src/main/resources/application.yaml`, Zeile 16:

```yaml
    url: jdbc:sqlite:db/fehmarnopen.db
```

(vorher: `url: jdbc:sqlite:fehmarnopen.db`)

- [ ] **Step 2: `db/`-Verzeichnis für lokale Entwicklung anlegen (getrackt)**

```bash
mkdir -p backend/db
touch backend/db/.gitkeep
```

- [ ] **Step 3: WAL-Sidecars in `backend/.gitignore` ausnehmen**

In `backend/.gitignore` den SQLite-Block ergänzen (direkt nach `*.sqlite3`):

```
*.db
*.sqlite
*.sqlite3
*.db-wal
*.db-shm
*.db-journal
```

- [ ] **Step 4: Backend-Build verifizieren (Testsuite unberührt)**

Run:
```bash
cd backend && ./mvnw -q spotless:apply verify
```
Expected: `BUILD SUCCESS`. Die Testsuite nutzt `application-test.yaml` (`./target/test-auth.db`) und ist vom Pfad-Change **nicht** betroffen — grün beweist, dass nichts bricht.

- [ ] **Step 5: Lokaler Smoke-Test des neuen Pfads**

Run (Java 25 nötig):
```bash
cd backend
export ADMIN_1_PASSWORD=test ADMIN_2_PASSWORD=test \
  JWT_SECRET=0123456789012345678901234567890123456789
timeout 40 ./mvnw -q spring-boot:run || true
ls -la db/
```
Expected: In `backend/db/` liegt jetzt `fehmarnopen.db` (ggf. plus `-wal`/`-shm`). Das beweist: der Treiber findet das existierende `db/`-Verzeichnis und legt die DB dort an. `git status` zeigt diese Dateien **nicht** (ignoriert).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/resources/application.yaml backend/db/.gitkeep backend/.gitignore
git commit -m "db-ui: DB nach db/-Unterverzeichnis verlegen (JDBC-Pfad + lokale Dev-Unterstützung)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: CI-Workflows auf den `db/`-Pfad umstellen

Zwei Workflows kennen den DB-Pfad hart: `db-reset.yml` (löscht die DB) und `ci.yml` (deployt + startet). Beide müssen den neuen `db/`-Pfad kennen, und der Deploy muss das Verzeichnis vor dem Start anlegen (sonst startet die frisch deployte App gegen ein nicht existierendes Parent-Dir).

**Files:**
- Modify: `.github/workflows/db-reset.yml:68,71`
- Modify: `.github/workflows/ci.yml` (vor `systemctl restart fehmarnopen-$ENV`, ~Zeile 219)

**Interfaces:**
- Consumes: `db/`-Konvention aus Task 1.
- Produces: Server-seitige Garantie, dass `/opt/fehmarnopen/<env>/db` existiert und `fehmarnopen:fehmarnopen` gehört, bevor die App startet — Voraussetzung für Task 4 (Mount).

- [ ] **Step 1: `db-reset.yml` — Anzeige- und Löschpfade auf `db/` umstellen**

In `.github/workflows/db-reset.yml`, den `ls`-Befehl (Zeile 68):

```bash
            ls -la "$APP_DIR"/db/fehmarnopen.db* 2>/dev/null || echo "(keine DB-Datei gefunden)"
```

und den `rm`-Block (Zeile 71) ersetzen durch:

```bash
            # SQLite-Hauptdatei plus WAL/SHM-Begleitdateien entfernen.
            rm -f "$APP_DIR"/db/fehmarnopen.db "$APP_DIR"/db/fehmarnopen.db-wal "$APP_DIR"/db/fehmarnopen.db-shm
            # Verzeichnis muss existieren, bevor der Service die DB neu aufbaut.
            mkdir -p "$APP_DIR/db"
            chown fehmarnopen:fehmarnopen "$APP_DIR/db"
```

- [ ] **Step 2: `ci.yml` — `db/`-Verzeichnis vor dem Restart sicherstellen**

In `.github/workflows/ci.yml`, unmittelbar **vor** der Zeile `systemctl restart fehmarnopen-$ENV` einfügen:

```bash
            # DB liegt in einem eigenen Unterverzeichnis (db/), damit die DB-UI nur dieses
            # mounten kann - ohne app.jar/config.env/secrets.env. Das Verzeichnis muss vor
            # dem Start existieren; der SQLite-JDBC-Treiber legt fehlende Parent-Dirs nicht an.
            mkdir -p /opt/fehmarnopen/$ENV/db
            chown fehmarnopen:fehmarnopen /opt/fehmarnopen/$ENV/db

            systemctl restart fehmarnopen-$ENV
```

- [ ] **Step 3: YAML-Syntax beider Workflows verifizieren**

Run:
```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/db-reset.yml')); yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK')"
```
Expected: `YAML OK` (kein Traceback).

- [ ] **Step 4: Prüfen, dass keine alten Pfade übrig sind**

Run:
```bash
grep -nE '"\$APP_DIR"/fehmarnopen\.db|/opt/fehmarnopen/\$ENV/fehmarnopen\.db' .github/workflows/db-reset.yml .github/workflows/ci.yml || echo "keine alten DB-Pfade mehr"
```
Expected: `keine alten DB-Pfade mehr`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/db-reset.yml .github/workflows/ci.yml
git commit -m "db-ui: CI-Workflows auf db/-Pfad umstellen (Reset + Deploy legt db/ an)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Adminer-Container (Docker Compose)

Der eigentliche Dienst: Adminer, gebunden an `127.0.0.1:8090`, mit **nur** den beiden `db/`-Verzeichnissen als rw-Mount, laufend als Service-User `fehmarnopen`.

**Files:**
- Create: `deploy/db-ui/docker-compose.yml`

**Interfaces:**
- Consumes: `db/`-Verzeichnisse aus Task 1/2 (`/opt/fehmarnopen/<env>/db`).
- Produces: Erreichbarer Adminer auf `127.0.0.1:8090` (Server), Login-Pfade `…/db/fehmarnopen.db`.

- [ ] **Step 1: Compose-Datei anlegen**

`deploy/db-ui/docker-compose.yml`:

```yaml
# Adminer als DB-UI für die SQLite-Datenbanken (test/prod).
# NUR über SSH-Tunnel erreichbar (Bind an 127.0.0.1) — kein öffentliches DNS, kein Caddy-Block.
# Zugriff:  ssh -L 8090:127.0.0.1:8090 root@hetzner  →  http://localhost:8090
# Start:    docker compose -f deploy/db-ui/docker-compose.yml up -d
# Setup + Betriebsregeln: docs/deployment.md → Abschnitt „DB-UI (Adminer via SSH-Tunnel)".
services:
  adminer:
    image: adminer:5          # feste Major-Version gepinnt; für Updates bewusst anheben
    container_name: fehmarnopen-db-ui
    restart: unless-stopped
    ports:
      - "127.0.0.1:8090:8080" # NUR localhost — von außen unerreichbar
    # Als Service-User laufen, dem die DB-Dateien gehören (sonst keine Schreibrechte).
    # UID:GID von 'fehmarnopen' auf dem Server ermitteln:  id fehmarnopen
    # und hier eintragen, z.B. "998:998".
    user: "<uid>:<gid>"
    volumes:
      # NUR die db/-Verzeichnisse mounten — keine Secrets/JAR im Container.
      # Verzeichnis (nicht Einzeldatei!), damit SQLite seine WAL-Sidecars
      # (-wal/-shm) daneben anlegt und die App dieselben Dateien sieht.
      - /opt/fehmarnopen/test/db:/opt/fehmarnopen/test/db
      - /opt/fehmarnopen/prod/db:/opt/fehmarnopen/prod/db
```

- [ ] **Step 2: Compose-Syntax verifizieren**

Run (falls Docker lokal vorhanden):
```bash
docker compose -f deploy/db-ui/docker-compose.yml config >/dev/null && echo "compose OK"
```
Falls kein Docker lokal, ersatzweise YAML-Parse:
```bash
python3 -c "import yaml; yaml.safe_load(open('deploy/db-ui/docker-compose.yml')); print('YAML OK')"
```
Expected: `compose OK` bzw. `YAML OK`. (Der Platzhalter `<uid>:<gid>` ist für `docker compose config` unkritisch — er wird erst beim Start aufgelöst; auf dem Server vor `up -d` durch echte Werte ersetzen, siehe Runbook.)

- [ ] **Step 3: Commit**

```bash
git add deploy/db-ui/docker-compose.yml
git commit -m "db-ui: Adminer-Container (docker-compose, 127.0.0.1:8090, nur db/-Mount)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Doku in `docs/deployment.md`

Vollständiger Runbook-Abschnitt: DB-Umzug (einmalig), Docker-Install, Container-Start, Tunnel-Zugriff, Betriebsregeln.

**Files:**
- Modify: `docs/deployment.md` (neuer Abschnitt am Ende, oder thematisch passend einsortiert)

**Interfaces:**
- Consumes: alles aus Tasks 1–3.

- [ ] **Step 1: Struktur der bestehenden Datei prüfen**

Run:
```bash
grep -nE '^#{1,3} ' docs/deployment.md
```
Expected: Liste der vorhandenen Überschriften — damit der neue Abschnitt konsistent (gleiche Ebene/Stil) und an sinnvoller Stelle eingefügt wird.

- [ ] **Step 2: Abschnitt „DB-UI (Adminer via SSH-Tunnel)" einfügen**

Folgenden Abschnitt einfügen (Überschriften-Ebene an die Datei anpassen):

````markdown
## DB-UI (Adminer via SSH-Tunnel)

Web-Oberfläche für die SQLite-DBs (test/prod), z.B. für DSGVO-Löschanträge (echter
Hard-Delete, den die App-UI nicht bietet). **Nicht öffentlich** — nur über SSH-Tunnel.

### Voraussetzung: DB liegt unter `db/`

Die App nutzt `jdbc:sqlite:db/fehmarnopen.db` → die DB liegt unter
`/opt/fehmarnopen/<env>/db/`. So mountet die DB-UI nur dieses Verzeichnis, nicht
`app.jar`/`config.env`/`secrets.env`. Der Deploy (`ci.yml`) legt `db/` automatisch an.

**Einmalige Migration bestehender Server-DBs** (pro Umgebung, prod mit echten Daten):

```bash
ENV=prod                      # danach für test wiederholen
APP_DIR=/opt/fehmarnopen/$ENV
systemctl stop fehmarnopen-$ENV
cp "$APP_DIR"/fehmarnopen.db "$APP_DIR"/fehmarnopen.db.bak   # Backup!
mkdir -p "$APP_DIR/db"
mv "$APP_DIR"/fehmarnopen.db "$APP_DIR"/fehmarnopen.db-wal \
   "$APP_DIR"/fehmarnopen.db-shm "$APP_DIR/db"/ 2>/dev/null   # -wal/-shm ggf. nicht vorhanden = ok
chown -R fehmarnopen:fehmarnopen "$APP_DIR/db"
systemctl start fehmarnopen-$ENV
curl -fsS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:$([ "$ENV" = prod ] && echo 8080 || echo 8081)/api/teilnehmer
```

Die neue App-Version (mit `db/`-Pfad) muss vor dem Start liegen. Am einfachsten:
erst den PR mergen → Deploy läuft (legt `db/` an, startet aber gegen leere DB, falls
noch nicht migriert) — daher **Migration direkt nach dem Merge, vor/statt** dem
automatischen Start durchführen, oder Service bis zur Migration gestoppt lassen.

### Docker installieren (einmalig, Debian/Ubuntu)

```bash
apt-get update && apt-get install -y docker.io docker-compose-v2
systemctl enable --now docker
```

### Container starten

```bash
id fehmarnopen                # UID:GID merken, in docker-compose.yml user: eintragen
# Repo auf den Server bringen/auschecken, dann:
docker compose -f deploy/db-ui/docker-compose.yml up -d
docker compose -f deploy/db-ui/docker-compose.yml ps
ss -tlnp | grep 8090         # muss 127.0.0.1:8090 zeigen, NICHT 0.0.0.0
```

### Zugriff

```bash
ssh -L 8090:127.0.0.1:8090 root@hetzner
```
Danach lokal `http://localhost:8090` öffnen → System **SQLite** → Datei-Pfad:

- Test: `/opt/fehmarnopen/test/db/fehmarnopen.db`
- Prod: `/opt/fehmarnopen/prod/db/fehmarnopen.db`

### Betriebsregeln

- **Vor destruktiven Writes auf prod:** Backup —
  `cp /opt/fehmarnopen/prod/db/fehmarnopen.db{,.bak}`.
- **Nie öffentlich exponieren:** kein Caddy-Block, kein Port-Freigeben in der Firewall.
- **Sicherheitsupdates:** `docker compose -f deploy/db-ui/docker-compose.yml pull && \
  docker compose -f deploy/db-ui/docker-compose.yml up -d`.
- Ein einzelner manueller `DELETE` ist mit `busy_timeout` unkritisch; **keine**
  dauerhaft zweite schreibende Anwendung parallel betreiben.
````

- [ ] **Step 3: Verifizieren, dass der Abschnitt vorhanden und verlinkbar ist**

Run:
```bash
grep -n "DB-UI (Adminer via SSH-Tunnel)" docs/deployment.md
```
Expected: eine Trefferzeile (die neue Überschrift).

- [ ] **Step 4: Commit**

```bash
git add docs/deployment.md
git commit -m "db-ui: Runbook (Migration, Docker, Tunnel, Betrieb) in deployment.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Abschluss: PR

- [ ] **Push + PR gegen `main`**

```bash
git push -u origin db-ui-adminer
gh pr create --base main --title "DB-UI: Adminer via SSH-Tunnel + DB nach db/ isolieren" \
  --body "$(cat <<'EOF'
## Was
Adminer-Web-UI für die SQLite-DBs (test/prod), nur per SSH-Tunnel erreichbar
(`127.0.0.1:8090`, kein öffentliches DNS). Für DSGVO-Löschanträge (Hard-Delete)
und bequemes Draufschauen.

## Wie
- DB zieht in `db/`-Unterverzeichnis (`jdbc:sqlite:db/fehmarnopen.db`), damit die
  UI nur die DB mountet — ohne `config.env`/`secrets.env`/`app.jar`.
- CI-Workflows (`db-reset.yml`, `ci.yml`) kennen den neuen Pfad; Deploy legt `db/` an.
- `deploy/db-ui/docker-compose.yml` (Adminer, `restart: unless-stopped`).
- Runbook in `docs/deployment.md` (inkl. einmaliger Server-Migration + Docker-Install).

## Manuell auf dem Server (nach Merge, siehe deployment.md)
DB-Migration nach `db/` (mit Backup), Docker installieren, `user:` in der
Compose-Datei setzen, Container starten.

Spec: docs/superpowers/specs/2026-07-15-db-ui-adminer-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Runbook: Manuelle Server-Ausführung (nach Merge — NICHT Teil der Repo-Commits)

Diese Schritte laufen **auf hetzner**, nicht im Repo. Reihenfolge einhalten:

1. **DB-Migration nach `db/`** (pro Umgebung, prod zuerst mit Backup) — Skript siehe
   `docs/deployment.md` → „Voraussetzung: DB liegt unter `db/`".
2. **Docker installieren** (`apt-get install docker.io docker-compose-v2`).
3. **`id fehmarnopen`** → UID:GID in `deploy/db-ui/docker-compose.yml` (`user:`) eintragen.
4. **Container starten** (`docker compose … up -d`) und Binding prüfen
   (`ss -tlnp | grep 8090` → nur `127.0.0.1`).
5. **Verifikation:**
   - App nach Migration grün: `curl -fsS http://127.0.0.1:8080/api/teilnehmer` (prod)
     bzw. `:8081` (test) liefert die bestehenden Daten (DB gefunden, nicht leer).
   - Tunnel auf, `http://localhost:8090`, System **SQLite** wählbar, test-DB unter `db/`
     öffnen, `SELECT * FROM teilnehmer LIMIT 5` liefert Zeilen.
   - Testweise in der **test**-DB eine Zeile ändern/löschen (Schreibpfad + Rechte ok),
     App antwortet weiterhin (kein Lock-Problem).
   - Von außen ist Port 8090 **nicht** erreichbar.

Falls in Adminer „SQLite" **nicht** als System erscheint (Image ohne sqlite-Treiber):
`docker compose logs` prüfen und ggf. auf ein Adminer-Image mit sqlite-Unterstützung
wechseln — vor dem produktiven Einsatz einmal am test-DB verifizieren.
