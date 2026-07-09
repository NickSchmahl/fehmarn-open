# Design: env-Config versioniert ausrollen + Secrets injizieren

- **Issue:** #143
- **Baut auf:** #139 (teilt sich den Deploy-Job in `ci.yml`)
- **Datum:** 2026-07-09

## Problem

Die systemd-Units brauchen Laufzeit-Config (`SERVER_ADDRESS`, `CORS_ALLOWED_ORIGINS`)
**und** Secrets (`JWT_SECRET`, `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD` – alle ohne Default
in `application.yaml`, also Pflicht). Nicht-geheime Config soll versioniert und automatisch
ausgerollt werden; Secrets dürfen **nicht** ins Git.

## Entscheidungen (mit Nick abgestimmt)

| Frage | Entscheidung |
|-------|--------------|
| Config vs. Secrets | Zwei `EnvironmentFile` je Unit: `config.env` (versioniert) + `secrets.env` (injiziert). |
| Secrets-Quelle | Aus **GitHub-Environment-Secrets** (`test`/`prod`), beim Deploy nach `secrets.env` geschrieben. |
| Secrets-Trennung | **Pro Umgebung getrennt via GitHub Environments** – gleiche Namen je Environment, echte Zugriffs-Isolation (kein `TEST_/PROD_`-Präfix). |
| Scope | Eigenes Ticket (#143), stapelt auf #139. |
| config.env-Inhalt | Nur `SERVER_ADDRESS` + `CORS_ALLOWED_ORIGINS` (Usernames/`JWT_EXPIRATION_MS` haben Defaults → YAGNI). |

## Umsetzung

### Repo
- `deploy/env/prod.env`, `deploy/env/test.env` – nur nicht-geheime Werte.

### Deploy-Job (`ci.yml`)
1. Job bekommt `environment: ${{ github.event.inputs.environment || 'test' }}` (github-Kontext,
   weil `environment` beim Job-Start ausgewertet wird – nicht der `target`-Step).
2. scp `deploy/env/<env>.env` → `/tmp/<env>.env` (`strip_components: 2`).
3. Step-`env:` liest die Secrets aus dem Environment (`secrets.JWT_SECRET` etc., ohne Präfix),
   `envs:` gibt sie ins Remote-Skript.
4. Im Skript vor `systemctl restart`:
   - `install -m 640 … config.env`.
   - Leere-Secret-Guard (fehlendes Secret bricht ab, statt die App still zu killen).
   - `umask 077`, Werte per `printf` (literal, kein `echo` ins Log) nach `secrets.env`,
     dann `chown fehmarnopen` + `chmod 600`.

### systemd-Units (Bootstrap, manuell)
Beide Units laden `config.env` + `secrets.env` via zwei `EnvironmentFile=`-Zeilen.
Vollständige Unit-Dateien werden **nicht** versioniert (Bootstrap-TODO), nur dokumentiert.

### Doku
`docs/deployment.md` Schritt 4 auf das config/secrets-Modell umgestellt: Tabelle,
die zwei `EnvironmentFile`-Zeilen, die zwei Environments `test`/`prod` mit je drei Secrets.

## Sicherheit
- Keine Secrets im Repo (`secrets.env` wird nur auf dem Server erzeugt).
- Keine Secrets im Log (GitHub maskiert; `printf` statt `echo`; kein `set -x`).
- `secrets.env` `chmod 600`, `fehmarnopen`-eigen.
- test/prod-Secrets über GitHub Environments getrennt → ein test-Deploy hat gar keinen
  Zugriff auf die prod-Secrets (nicht nur andere Werte).

## Manuelle Voraussetzungen (nach Merge)
1. Zwei GitHub Environments `test` + `prod` anlegen, in jedem die drei Secrets
   `JWT_SECRET`, `ADMIN_1_PASSWORD`, `ADMIN_2_PASSWORD` (gleiche Namen). `test` ohne
   Required-Reviewer (sonst blockiert es den Auto-Deploy).
2. In beiden Units die zwei `EnvironmentFile=`-Zeilen ergänzen, `daemon-reload`.

## Bewusst NICHT im Scope (YAGNI)
- Vollständige systemd-Unit-Dateien versionieren.
- Usernames/`JWT_EXPIRATION_MS` in `config.env` (Defaults reichen).
