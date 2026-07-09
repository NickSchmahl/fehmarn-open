# Design: Caddyfile automatisch beim Deploy ausbringen

- **Issue:** #139
- **Baut auf:** #119 (braucht `deploy/Caddyfile` auf `main`)
- **Datum:** 2026-07-09

## Problem

Die Reverse-Proxy-Config liegt versioniert unter `deploy/Caddyfile` (#119), landet
auf dem Server aber nur durch **manuelles** `scp` + `systemctl reload caddy`. Jede
künftige Änderung (neue Subdomain, HSTS, Header) driftet zwischen Repo und Server
auseinander und ist leicht zu vergessen. Zusätzlich meckert `caddy validate`, wenn
die Datei nicht `caddy fmt`-formatiert ist — diese Warnung soll früh und
automatisch auffallen.

## Ziel

`deploy/Caddyfile` bei **jedem** Deploy automatisch nach `/etc/caddy/Caddyfile`
bringen, vorher formatieren + validieren, dann Caddy neu laden — analog zum
JAR-Deploy, im bestehenden `deploy`-Job von `.github/workflows/ci.yml`. Kein neuer
Workflow, keine neuen Secrets.

## Getroffene Entscheidungen

| Frage | Entscheidung |
|-------|--------------|
| Wann syncen? | Bei **jedem** Deploy (test-Push und prod-Dispatch). Idempotent, Server konvergiert immer auf die Repo-Version. |
| `caddy fmt` | Als **Check, der fehlschlägt** — kein Auto-Overwrite (sonst driftet die Server-Datei von der Repo-Version ab). |
| `caddy validate` | Fehlschlag bricht den Deploy ab; die alte Live-Config bleibt unangetastet. |
| Check-Ort | Nur im **Deploy-Schritt** (Server hat Caddy schon). Kein zusätzlicher PR-Runner-Check. |
| Caddy fehlt auf dem Server | **Hart abbrechen** mit klarer Meldung (erzwingt die Bootstrap-Reihenfolge aus `docs/deployment.md`). |

## Architektur / Ablauf

Der `deploy`-Job bleibt wie er ist (JAR bauen → scp → ssh: install + restart +
Healthcheck). Zwei Ergänzungen:

### 1. Eigener scp-Schritt für die Caddyfile

Der bestehende JAR-scp nutzt `strip_components: 2` (passend für
`backend/target/…jar`). `deploy/Caddyfile` hat nur zwei Pfad-Komponenten — mit
`strip_components: 2` würde die Datei weggestrippt. Deshalb ein **separater
`appleboy/scp-action`-Schritt**:

```yaml
- name: Caddyfile auf den Server kopieren
  uses: appleboy/scp-action@v1.0.0
  with:
    host: ${{ secrets.SSH_HOST }}
    username: ${{ secrets.SSH_USER }}
    key: ${{ secrets.SSH_KEY }}
    source: deploy/Caddyfile
    target: /tmp/
    strip_components: 1        # deploy/Caddyfile -> /tmp/Caddyfile
```

### 2. Caddy-Block im ssh-Schritt, VOR dem App-Restart

Reihenfolge bewusst: erst formatieren-prüfen + validieren, dann erst die Live-Datei
überschreiben und reloaden — und all das **vor** `install`/`restart` der JAR, damit
ein kaputtes Caddyfile den Deploy abbricht, bevor die neue App ausgerollt wird
(fail fast, kein halber Deploy). `set -e` ist im Skript bereits aktiv.

```bash
# --- Caddy-Reverse-Proxy-Config ausbringen ---
if ! command -v caddy >/dev/null; then
  echo "FEHLER: Caddy ist auf dem Server nicht installiert (Bootstrap fehlt, siehe docs/deployment.md)." >&2
  exit 1
fi

# Format-Check: formatierte Ausgabe muss der Datei entsprechen (deterministischer Exit-Code)
if ! caddy fmt /tmp/Caddyfile | diff -q - /tmp/Caddyfile >/dev/null; then
  echo "FEHLER: deploy/Caddyfile ist nicht formatiert. Lokal 'caddy fmt --overwrite deploy/Caddyfile' laufen lassen und committen." >&2
  exit 1
fi

# Syntax-/Config-Check gegen die frisch gestagte Datei (ersetzt die Live-Config NICHT bei Fehler)
caddy validate --config /tmp/Caddyfile --adapter caddyfile

# Erst jetzt die Live-Config ersetzen und neu laden
install -m 644 /tmp/Caddyfile /etc/caddy/Caddyfile
systemctl reload caddy
echo "Caddy-Config validiert & neu geladen."
```

## Fehlerverhalten

- **Caddy nicht installiert** → sofortiger `exit 1` mit klarer Meldung.
- **Nicht formatiert** → `exit 1`, Hinweis auf `caddy fmt --overwrite`.
- **Ungültige Syntax** → `caddy validate` liefert non-zero, `set -e` bricht ab;
  `/etc/caddy/Caddyfile` und der laufende Caddy bleiben unverändert.
- In allen drei Fällen bricht der Deploy ab, **bevor** die neue JAR installiert wird.

## Doku

`docs/deployment.md`, Abschnitt „HTTPS/TLS via Caddy":

- Schritt „Caddyfile ausbringen" umschreiben: manuelles Kopieren ist **nur beim
  Erst-Setup** nötig; danach bringt jeder Deploy die Datei automatisch aus.
- Neue Regel festhalten (gut sichtbar, damit sie auch beim Editieren durch Tools
  auffällt): **Vor jedem Commit an `deploy/Caddyfile` einmal
  `caddy fmt --overwrite deploy/Caddyfile` laufen lassen** — sonst schlägt der
  Deploy am Format-Check fehl.

## Testing / Verifikation

GitHub-Workflows lassen sich nicht sinnvoll unit-testen. Verifikation:

1. `deploy/Caddyfile` lokal mit `caddy fmt --overwrite` formatieren und
   `caddy validate` prüfen (dafür lokal `brew install caddy`), damit die
   committete Datei den neuen Check garantiert besteht.
2. YAML-Syntax der geänderten `ci.yml` prüfen.
3. Realer Nachweis = nächster Deploy-Lauf; dessen Log zeigt „Caddy-Config validiert
   & neu geladen." Ein absichtlich kaputtes Caddyfile in einem Wegwerf-Branch würde
   den Deploy erwartungsgemäß rot färben (optionaler Härtetest).

## Sequencing / Branch

- Eigenes Ticket (#139), eigener PR gegen `main`.
- Stapelt auf #119 (Branch `feat/139-caddyfile-auto-deploy` zweigt von der
  #119-Branch ab), weil `deploy/Caddyfile` erst mit #119 auf `main` kommt. Der PR
  wird erst nach dem Merge von #119 gemergt (oder danach auf `main` rebased).

## Bewusst NICHT im Scope (YAGNI)

- Kein zusätzlicher PR-Runner-Check (Caddy-Install auf ubuntu-latest) — Deploy-Check
  reicht für dieses Projekt.
- Kein Config-Management (Ansible o. ä.) für die einmaligen Bootstrap-Schritte
  (DNS, Caddy-Install, systemd-Units, Firewall) — für einen Server over-engineered.
- Kein Auto-`fmt --overwrite` im Deploy (würde Drift verstecken statt erzwingen).
