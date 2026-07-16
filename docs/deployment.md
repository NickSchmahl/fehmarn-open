# Deployment: Server, Secrets & Hetzner-Zugang

Ergänzt [quality/ci-cd.md](quality/ci-cd.md) um die **Ops-Seite**: Wie kommt die in
der Pipeline gebaute JAR auf den Server, welche Secrets braucht GitHub, und wie
richtet man den Zielserver ein. Der Deploy-Job steckt in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (Stufe `deploy`).

## Überblick

- **Hoster:** Hetzner Cloud, Server erreichbar unter `fehmarn-open.de`.
- **Zwei Umgebungen auf demselben Server:**
  - `test` → Port **8081** (automatischer Deploy bei Push auf `main`)
  - `prod` → Port **8080** (nur via manuellem `workflow_dispatch`)
- **Transport:** GitHub Actions kopiert die JAR per SCP (`appleboy/scp-action`)
  nach `/tmp/`, dann per SSH (`appleboy/ssh-action`): `install` →
  `systemctl restart fehmarnopen-<env>` → Healthcheck auf `/api/teilnehmer`.

## GitHub Secrets

Anzulegen unter **Repo → Settings → Secrets and variables → Actions → Secrets**
(`https://github.com/NickSchmahl/fehmarn-open/settings/secrets/actions`):

| Secret | Inhalt |
|--------|--------|
| `SSH_HOST` | `fehmarn-open.de` |
| `SSH_USER` | `root` (aktuell gewählt, siehe unten) |
| `SSH_KEY`  | **privater** SSH-Key, komplett inkl. `-----BEGIN/END-----` und abschließender Leerzeile |

Die `SSH_*` sind **Repository Secrets** und gelten für `test` und `prod` gleichermaßen.
Die **App-Secrets** (`JWT_SECRET`, `ADMIN_*_PASSWORD`) liegen dagegen als
**Environment-Secrets** je Umgebung getrennt – siehe Abschnitt „HTTPS/TLS via Caddy",
Schritt 4.

## SSH-Zugang: nur Key, kein Passwort

GitHub Actions kann **kein Passwort interaktiv eingeben** – Passwort-Login
funktioniert für den Deploy grundsätzlich nicht. Es muss Key-Auth sein.

**Typischer Fehler bei fehlendem/falschem Key:**
```
ssh: handshake failed: ssh: unable to authenticate,
attempted methods [none publickey], no supported methods remain
```
→ Der private Key im Secret passt zu keinem Eintrag in `authorized_keys` auf dem
Server (oder das Secret enthält den `.pub`- statt Private-Key, oder kaputte
Zeilenumbrüche).

### Key-Pair erzeugen (lokal, macOS)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/hetzner_key_github -C "github-deploy" -N ""
```
- `-N ""` → **kein** Passphrase (für CI nötig; sonst bräuchte der Workflow
  zusätzlich `passphrase: ${{ secrets.SSH_PASSPHRASE }}`).
- `~/.ssh/hetzner_key_github` → privater Key (→ Secret `SSH_KEY`)
- `~/.ssh/hetzner_key_github.pub` → öffentlicher Key (→ auf den Server)

Public Key in die Zwischenablage: `pbcopy < ~/.ssh/hetzner_key_github.pub`
Privaten Key ins Secret kopieren: `pbcopy < ~/.ssh/hetzner_key_github`

### Auf dem Server hinterlegen (gewählte Variante: root)
```bash
install -d -m 700 /root/.ssh
echo '<PUBLIC_KEY>' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```
Root-Login per Key erlauben – in `/etc/ssh/sshd_config`:
```
PermitRootLogin prohibit-password
PubkeyAuthentication yes
```
Danach `systemctl restart ssh` (ggf. `sshd`). Testen vom Mac (muss ohne Passwort
durchgehen):
```bash
ssh -i ~/.ssh/hetzner_key_github root@fehmarn-open.de
```

## Server-Voraussetzungen für den Deploy

Der Deploy-Schritt setzt voraus, dass auf dem Server existieren:

- User `fehmarnopen` (Service-Runtime-User, `useradd -r -s /usr/sbin/nologin fehmarnopen`)
- Verzeichnisse `/opt/fehmarnopen/test/` und `/opt/fehmarnopen/prod/`
- systemd-Services `fehmarnopen-test` (Port 8081) und `fehmarnopen-prod` (Port 8080)

> Fehlen diese, scheitert der Lauf **nicht** am SSH-Handshake, sondern an
> `install -o fehmarnopen ...` bzw. `systemctl restart fehmarnopen-<env>`. Dann ist
> es ein Server-Setup-Problem, kein CI-Problem. Die systemd-Units sind noch **TODO**.

## HTTPS/TLS via Caddy (Reverse Proxy)

Öffentlich erreichbar ist die App **ausschließlich über HTTPS** (ADR 0010, #119). Ein
**Caddy** davor terminiert TLS und proxied auf die lokalen Spring-Boot-Ports. Caddy holt
und erneuert die Let's-Encrypt-Zertifikate selbst und leitet HTTP→HTTPS um.

```
Internet ──443/80──▶ Caddy ──▶ 127.0.0.1:8080  (prod  = fehmarn-open.de)
                          └──▶ 127.0.0.1:8081  (test  = test.fehmarn-open.de)
```

Die versionierte Proxy-Config liegt im Repo unter
[`deploy/Caddyfile`](../deploy/Caddyfile).

### 1. DNS (Voraussetzung fürs Zertifikat)

A-Records (ggf. AAAA) auf die Server-IP setzen – **beide** müssen auflösen, bevor Caddy
Zertifikate holen kann:

```
fehmarn-open.de        A  <SERVER_IP>
test.fehmarn-open.de   A  <SERVER_IP>
```

### 2. Caddy installieren

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 3. Caddyfile ausbringen

> **Nur beim Erst-Setup nötig.** Danach rollt jeder Deploy die `deploy/Caddyfile`
> automatisch aus (siehe [ci.yml](../.github/workflows/ci.yml), #139): Der Deploy-Job
> kopiert sie auf den Server, prüft `caddy fmt` + `caddy validate` und lädt Caddy neu.
> Schlägt Format oder Validierung fehl, bricht der Deploy ab, **bevor** die neue JAR
> installiert wird.

Repo-`deploy/Caddyfile` nach `/etc/caddy/Caddyfile` kopieren (die `email`-Zeile vorher auf
eine echte Adresse setzen), dann laden:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

> **Vor jedem Commit an `deploy/Caddyfile`:** einmal `caddy fmt --overwrite deploy/Caddyfile`
> laufen lassen. Sonst schlägt der automatische Format-Check im Deploy fehl (`caddy validate`
> warnt sonst „Caddyfile input is not formatted").

> **Stolperstein – Port 80 schon belegt:** Läuft auf dem Server bereits ein anderer
> Webserver (z. B. ein vorinstalliertes **nginx**), hält der Port 80. Caddy bindet 80
> und 443 gemeinsam und startet dann gar nicht:
> `systemctl status caddy` zeigt `failed`, im Log steht
> `listening on :80: listen tcp :80: bind: address already in use` – und auf 443
> lauscht nichts (curl → „connection refused"). Prüfen und den Blockierer deaktivieren:
> ```bash
> sudo ss -tlnp | grep -E ':80 |:443 '   # zeigt, welcher Dienst Port 80 hält
> sudo systemctl disable --now nginx      # nginx dauerhaft stoppen (reversibel, deinstalliert nichts)
> sudo systemctl restart caddy            # jetzt bekommt Caddy 80/443 und holt die Zertifikate
> ```

### 4. Umgebungsvariablen: config.env (versioniert) + secrets.env (injiziert)

Spring darf nicht mehr öffentlich lauschen, nur Caddy erreicht es. Die Laufzeit-Config ist
in **zwei Dateien pro Umgebung** getrennt (#143), die beide systemd-Units laden:

| Datei | Herkunft | Inhalt | Deploy |
|-------|----------|--------|--------|
| `config.env` | Repo: [`deploy/env/test.env`](../deploy/env/test.env) / [`prod.env`](../deploy/env/prod.env) | `SERVER_ADDRESS`, `SERVER_PORT`, `CORS_ALLOWED_ORIGINS`, `ADMIN_*_USERNAME` | automatisch ausgerollt |
| `secrets.env` | GitHub Secrets (pro Umgebung) | `JWT_SECRET`, `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD` | beim Deploy geschrieben, `chmod 600` |

**Beide `EnvironmentFile` in jede Unit** eintragen – einmalig beim Setup. Die Pfade je Unit
ausschreiben (das Verzeichnis ist `test` bzw. `prod`, passend zum Deploy-Ziel):

```ini
# in fehmarnopen-test.service
[Service]
EnvironmentFile=/opt/fehmarnopen/test/config.env
EnvironmentFile=/opt/fehmarnopen/test/secrets.env

# in fehmarnopen-prod.service
[Service]
EnvironmentFile=/opt/fehmarnopen/prod/config.env
EnvironmentFile=/opt/fehmarnopen/prod/secrets.env
```

**Secrets als GitHub-Environment-Secrets anlegen** (nicht als Repository-Secrets) unter
`Settings → Environments`. Zwei Environments anlegen: **`test`** und **`prod`** – in
**jedem** dieselben drei Secrets (gleiche Namen, kein Präfix):

| Environment | Secrets |
|-------------|---------|
| `test` | `JWT_SECRET`, `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD` |
| `prod` | `JWT_SECRET`, `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD` |

Der Deploy-Job wählt per `environment:` das Ziel (`test`/`prod`); `secrets.JWT_SECRET`
usw. lösen dann automatisch die Werte **dieses** Environments auf. Vorteil gegenüber
Repository-Secrets: Ein test-Deploy sieht die prod-Secrets gar nicht (echte
Zugriffs-Isolation), und für `prod` lassen sich optional Schutzregeln setzen.

> **`test` ohne Required-Reviewer lassen**, sonst blockiert die Protection-Rule den
> automatischen Deploy bei jedem Push auf `main`. Für `prod` (nur manueller
> `workflow_dispatch`) kann ein Reviewer/Branch-Filter sinnvoll sein.

`config.env` und `secrets.env` werden bei jedem Deploy neu geschrieben – also **keine**
manuellen Werte dort pflegen, sondern im Repo bzw. in den Environment-Secrets.

`forward-headers-strategy: framework` steht bereits in `application.yaml`, damit Spring
Scheme/Host aus den `X-Forwarded-*`-Headern von Caddy übernimmt (korrekte `https://`-URLs).
Nach dem Eintragen der `EnvironmentFile`-Zeilen einmal
`systemctl daemon-reload && systemctl restart fehmarnopen-test fehmarnopen-prod`.

### 5. Firewall

Nur 80/443 nach außen; die App-Ports bleiben lokal (durch `SERVER_ADDRESS` ohnehin nicht
mehr öffentlich gebunden):

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow OpenSSH
ufw enable
```

### 6. Prüfen

```bash
curl -I http://fehmarn-open.de            # -> 301/308 Redirect auf https
curl -sS https://fehmarn-open.de/api/teilnehmer | head   # gültiges Zert, App antwortet
curl -sS https://test.fehmarn-open.de/api/teilnehmer | head
```

Kein Mixed Content, Admin-Login + Anmeldung laufen komplett über HTTPS. Der **interne
CI-Healthcheck** (`http://127.0.0.1:<port>/api/teilnehmer` in `ci.yml`) läuft am Proxy vorbei
direkt auf den lokalen Port und pollt nach dem Restart, bis die App den Port gebunden hat.

### 7. HSTS aktivieren (erst nach erfolgreichem Test)

Im `Caddyfile` die auskommentierte `Strict-Transport-Security`-Zeile beim
`fehmarn-open.de`-Block einkommentieren, dann `systemctl reload caddy`. Bewusst zuletzt: der
Header ist „klebrig" – bei kaputtem HTTPS sperrt er Nutzer für `max-age` aus.

### Zertifikats-Renewal

Automatisch durch Caddy (kein Cronjob nötig). Läuft die Erneuerung, muss Port 80 erreichbar
bleiben (HTTP-01-Challenge) – deshalb 80 in der Firewall offen lassen.

## root vs. dedizierter deploy-User

Aktuell **root** – bewusst gewählt für den schnellen ersten grünen Lauf (kein
zusätzlicher User, keine sudoers, keine Workflow-Änderung). Nachteil: ein
geleaktes `SSH_KEY`-Secret = kompletter Root-Zugriff auf den Server.

**Härtungsoption (später):** eigener `deploy`-User, dem `/opt/fehmarnopen/*`
gehört, mit passwortlosem `sudo` **nur** für `systemctl restart fehmarnopen-test`
und `-prod` (via `/etc/sudoers.d/deploy`). Dann `install` ohne `-o` und `restart`
mit `sudo` im Workflow. Grenzt CI-Rechte auf „JAR ablegen + diese zwei Services
neustarten" ein.

## Hetzner Cloud Console – Stolpersteine

Der zuverlässige Weg auf den Server, wenn SSH (noch) nicht geht: **Hetzner Cloud
→ Projekt → Server → `>_ Console`** (Web-VNC). Login als `root` mit dem in Hetzner
gesetzten Passwort. Das läuft über PAM, **unabhängig** von der SSH-Config – geht
also auch, wenn `PasswordAuthentication no` gesetzt ist.

**Warum SSH-Passwort-Login scheitern kann:** Wird beim Erstellen des Servers ein
SSH-Key hinterlegt, deaktiviert Hetzner per cloud-init oft die Passwort-Auth. Ein
in der Hetzner-Oberfläche gesetztes Root-Passwort gilt dann nur für die **Console**,
nicht für SSH → `Permission denied` beim `ssh`-Passwort-Prompt ist dann normal.

### Tastatur-Layout in der Console (US ↔ DE)

Die Web-Console nutzt oft **US-Layout**, während die physische Tastatur **deutsch**
(QWERTZ) ist. Dadurch landen Sonderzeichen falsch. Merkhilfe (deutsche Taste
drücken → US-Zeichen, das erscheint):

| Ich will … | … drücke auf der dt. Tastatur |
|------------|-------------------------------|
| `-` (Minus) | `ß`-Taste (rechts neben `0`) |
| `_` (Unterstrich) | `Shift` + `ß` |
| `'` (Apostroph) | `Ä`-Taste |
| `"` | `Shift` + `Ä` |
| `y` / `z` | vertauscht (QWERTZ ↔ QWERTY) |

Der bei einem Minus-Tastendruck erscheinende `/` kommt daher, dass die deutsche
`-`-Taste im US-Layout die `/`-Taste ist.

**Dauerhaft umstellen:** in der Console `loadkeys de` eingeben – danach passt das
Layout zur physischen Tastatur. Beim Tippen von `loadkeys de` ist nur das `y`
tückisch (QWERTZ): dafür die Taste drücken, auf der `z` steht.

## Nützliche macOS-Befehle (aus dem Setup)

- Dateiinhalt in die Zwischenablage: `pbcopy < datei` (bzw. `cat datei | pbcopy`)
- Zwischenablage ausgeben: `pbpaste`
- Datei seitenweise lesen statt `cat`: `less datei` (Leertaste = weiter, `q` = raus)

## Releases & Rollback

### Release erstellen
1. **Actions → „Release (Bump-PR)" → Run workflow**, Version eingeben (z. B. `1.0.0`).
   Es entsteht ein PR `Release v1.0.0` mit gebumpter Version in `pom.xml` + `package.json`.
2. **Einmal manuell anstoßen:** Der PR wird vom automatischen `GITHUB_TOKEN` erstellt –
   GitHub löst dadurch bewusst **keine** neuen Workflow-Läufe aus (Anti-Rekursions-Schutz),
   die Pflicht-Checks `backend`/`frontend` starten also nicht von selbst. Einmal den PR
   **schließen und sofort wieder öffnen** (oder einen leeren Commit pushen) – das reicht,
   weil die Aktion dann von dir als echtem Nutzer kommt statt vom Bot-Token.
3. PR reviewen und **mergen** (die CI-Checks `backend`/`frontend` müssen grün sein).
4. Nach dem Merge läuft `release-publish.yml` automatisch: Tag `v1.0.0` + GitHub Release
   mit angehängtem `fehmarnopen.jar` entstehen. `main` bleibt auf `1.0.0`, bis das
   nächste Release eine neue Nummer setzt.

### Welcher Stand läuft?
`GET /api/version` (öffentlich) liefert die laufende Version, z. B.
`{"version":"1.0.0","buildTime":"..."}`. Für prod: `https://<prod-host>/api/version`.

### Rollback auf eine ältere Version
1. **Actions → „CI/CD" → Run workflow**.
2. Bei **„Use workflow from"** den Tag `vX.Y.Z` wählen, **Zielumgebung** = `prod`.
3. Die CI baut exakt den getaggten Quellstand und deployed ihn. Danach
   `GET /api/version` gegen prod prüfen.

> **Achtung Datenbank:** Liquibase-Schema-Änderungen rollen **nicht** automatisch
> zurück. Wenn sich das Schema zwischen den Versionen geändert hat, vorher
> [docs/datenbank-schema-aendern.md](datenbank-schema-aendern.md) lesen und ggf.
> manuell migrieren/Backup einspielen.
