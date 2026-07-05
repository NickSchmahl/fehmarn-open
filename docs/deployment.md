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

Es sind **Repository Secrets** – der Workflow nutzt keinen `environment:`-Scope,
d.h. dieselben Secrets gelten für `test` und `prod`.

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
